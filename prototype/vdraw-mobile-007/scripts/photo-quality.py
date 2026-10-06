"""Offline pixel-quality heuristic; neither a product camera gate nor an accuracy claim.

No EXIF, paths, filenames, detected objects or physical dimensions enter the result.
Thresholds are provisional and need real-photo human ground-truth calibration.
"""
import argparse
import json
import math
from pathlib import Path
import warnings

from PIL import Image, ImageOps

THRESHOLDS = {
    'darkMeanLumaBelow': 45.0,
    'brightMeanLumaAbove': 220.0,
    'lowContrastP95MinusP05Below': 40.0,
    'blurLaplacianVarianceBelow': 60.0,
    'minimumShortEdgePx': 480,
    'minimumPixelCount': 500000,
    'analysisMaximumEdgePx': 1024,
    'maximumInputPixelCount': 20000000,
}
UNMEASURED = ('glare', 'far', 'occlusion', 'motion')


def percentile(histogram, proportion):
    target = max(1, math.ceil(sum(histogram) * proportion))
    count = 0
    for value, frequency in enumerate(histogram):
        count += frequency
        if count >= target:
            return value
    return 255


def laplacian_variance(gray):
    """Population variance of 4-neighbour Laplacian on interior luminance pixels."""
    width, height = gray.size
    data = gray.tobytes()
    total = squared = count = 0
    for y in range(1, height - 1):
        offset = y * width
        for x in range(1, width - 1):
            index = offset + x
            value = (data[index - 1] + data[index + 1] +
                     data[index - width] + data[index + width] - 4 * data[index])
            total += value
            squared += value * value
            count += 1
    return max(0.0, squared / count - (total / count) ** 2) if count else 0.0


def analyze_image(image):
    """Measure image pixels; NOT_FLAGGED does not imply absence of a defect."""
    if image.width <= 0 or image.height <= 0:
        raise ValueError('IMAGE_DIMENSIONS_INVALID')
    if image.width * image.height > THRESHOLDS['maximumInputPixelCount']:
        raise ValueError('IMAGE_TOO_LARGE')
    if getattr(image, 'n_frames', 1) != 1:
        raise ValueError('MULTIFRAME_IMAGE_UNSUPPORTED')
    oriented = ImageOps.exif_transpose(image)
    rgba = oriented.convert('RGBA')
    rgb = Image.new('RGBA', rgba.size, (255, 255, 255, 255))
    rgb.alpha_composite(rgba)
    gray = rgb.convert('RGB').convert('L')
    width, height = gray.size
    gray.thumbnail((THRESHOLDS['analysisMaximumEdgePx'],) * 2, Image.Resampling.LANCZOS)
    histogram = gray.histogram()
    samples = sum(histogram)
    mean = sum(value * frequency for value, frequency in enumerate(histogram)) / samples
    deviation = math.sqrt(sum((value - mean) ** 2 * frequency
                              for value, frequency in enumerate(histogram)) / samples)
    p05, p95 = percentile(histogram, 0.05), percentile(histogram, 0.95)
    laplacian = laplacian_variance(gray)
    checks = {}
    reasons = []

    def check(name, flagged, metric, value, comparison, threshold, code):
        checks[name] = {'status': 'FLAGGED' if flagged else 'NOT_FLAGGED',
                        'method': 'PIXEL_HEURISTIC', 'metric': metric,
                        'value': value, 'comparison': comparison,
                        'threshold': threshold, 'reasonCode': code if flagged else None}
        if flagged:
            reasons.append(code)

    check('blur', laplacian < THRESHOLDS['blurLaplacianVarianceBelow'],
          'laplacianVariance', laplacian, 'below', THRESHOLDS['blurLaplacianVarianceBelow'], 'LOW_EDGE_DETAIL_HEURISTIC')
    check('dark', mean < THRESHOLDS['darkMeanLumaBelow'],
          'meanLuma', mean, 'below', THRESHOLDS['darkMeanLumaBelow'], 'DARK_PIXELS_HEURISTIC')
    check('bright', mean > THRESHOLDS['brightMeanLumaAbove'],
          'meanLuma', mean, 'above', THRESHOLDS['brightMeanLumaAbove'], 'BRIGHT_PIXELS_HEURISTIC')
    check('lowcontrast', p95 - p05 < THRESHOLDS['lowContrastP95MinusP05Below'],
          'p95MinusP05Luma', p95 - p05, 'below', THRESHOLDS['lowContrastP95MinusP05Below'], 'LOW_CONTRAST_HEURISTIC')
    too_small = min(width, height) < THRESHOLDS['minimumShortEdgePx'] or width * height < THRESHOLDS['minimumPixelCount']
    check('insufficientresolution', too_small, 'orientedPixelDimensions',
          {'widthPx': width, 'heightPx': height, 'shortEdgePx': min(width, height), 'pixelCount': width * height},
          'shortEdgeBelow OR pixelCountBelow',
          {'shortEdgePx': THRESHOLDS['minimumShortEdgePx'], 'pixelCount': THRESHOLDS['minimumPixelCount']},
          'INSUFFICIENT_PIXEL_RESOLUTION')
    for name in UNMEASURED:
        checks[name] = {'status': 'NOT_MEASURED', 'decision': 'NEEDS_REVIEW',
                        'reasonCode': 'NO_VALIDATED_MEASUREMENT_METHOD'}
    return {'schema': 'vdraw-photo-quality/1',
            'status': 'RETAKE_REQUIRED' if reasons else 'NEEDS_REVIEW',
            'heuristicGate': 'RETAKE_REQUIRED' if reasons else 'NO_HEURISTIC_RETAKE_TRIGGER',
            'executionKind': 'OFFLINE_PIXEL_HEURISTIC', 'productionCameraIntegration': 'NOT_CONNECTED',
            'thresholdCalibration': 'PROVISIONAL_NOT_CALIBRATED_ON_HUMAN_GROUND_TRUTH',
            'reasonCodes': reasons, 'checks': checks,
            'measurements': {'meanLuma': mean, 'lumaStdDev': deviation,
                             'p05Luma': p05, 'p95Luma': p95, 'laplacianVariance': laplacian,
                             'analysisWidthPx': gray.width, 'analysisHeightPx': gray.height},
            'thresholds': dict(THRESHOLDS),
            'processing': {'orientation': 'EXIF_TRANSPOSE', 'alphaBackground': 'WHITE',
                           'luminance': 'PIL_RGB_TO_L', 'resampling': 'LANCZOS_MAX_EDGE_1024',
                           'laplacian': 'FOUR_NEIGHBOUR_INTERIOR_POPULATION_VARIANCE'},
            'metrics': {'precision': {'status': 'NOT_MEASURED', 'value': None},
                        'recall': {'status': 'NOT_MEASURED', 'value': None}},
            'accuracyReasonCode': 'HUMAN_GROUND_TRUTH_NOT_PROVIDED',
            'limitations': ['Pixel heuristics do not establish semantic photo suitability.',
                            'Low edge detail can reflect smooth content rather than optical blur.',
                            'Distance, glare, occlusion and motion require independent review.']}


def analyze_path(path):
    with warnings.catch_warnings():
        warnings.simplefilter('error', Image.DecompressionBombWarning)
        with Image.open(path) as image:
            return analyze_image(image)


def main(argv=None):
    parser = argparse.ArgumentParser(description='Offline photo pixel-quality heuristic; JSON contains no image metadata.')
    parser.add_argument('image', type=Path)
    parser.add_argument('--output', type=Path, help='Optional new JSON file; existing files are never overwritten.')
    args = parser.parse_args(argv)
    try:
        result = analyze_path(args.image)
    except Exception:
        # Decoder exceptions can contain filenames or metadata. Never serialize them.
        result = {'schema': 'vdraw-photo-quality/1', 'status': 'BLOCKED',
                  'reasonCodes': ['IMAGE_READ_OR_MEASUREMENT_FAILED'],
                  'executionKind': 'OFFLINE_PIXEL_HEURISTIC', 'productionCameraIntegration': 'NOT_CONNECTED',
                  'metrics': {'precision': {'status': 'NOT_MEASURED', 'value': None},
                              'recall': {'status': 'NOT_MEASURED', 'value': None}}}
    serialized = json.dumps(result, indent=2, allow_nan=False) + '\n'
    if args.output:
        try:
            with args.output.open('x', encoding='utf-8') as handle:
                handle.write(serialized)
        except OSError:
            print(json.dumps({'status': 'BLOCKED', 'reasonCodes': ['OUTPUT_UNAVAILABLE_OR_ALREADY_EXISTS']}))
            return 2
    else:
        print(serialized, end='')
    return 2 if result['status'] == 'BLOCKED' else 1 if result['status'] == 'RETAKE_REQUIRED' else 0


if __name__ == '__main__':
    raise SystemExit(main())
