"""Synthetic behavior tests; do not measure real-photo precision or recall."""
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from PIL import Image, ImageDraw, ImageFilter

spec = importlib.util.spec_from_file_location('photo_quality', Path(__file__).resolve().parents[1] / 'scripts/photo-quality.py')
quality = importlib.util.module_from_spec(spec)
spec.loader.exec_module(quality)


def detailed_image():
    image = Image.new('RGB', (800, 800), (180, 180, 180))
    draw = ImageDraw.Draw(image)
    for index in range(0, 800, 32):
        draw.rectangle((index, 0, index + 15, 799), fill=(60, 60, 60))
    draw.rectangle((120, 120, 660, 650), fill=(170, 170, 170), outline=(30, 30, 30), width=5)
    for index in range(160, 650, 40):
        draw.line((160, index, 620, index), fill=(40, 40, 40), width=4)
    return image


class PhotoQuality(unittest.TestCase):
    def test_detailed_normal_synthetic_needs_review_not_accuracy_pass(self):
        result = quality.analyze_image(detailed_image())
        self.assertEqual(result['status'], 'NEEDS_REVIEW')
        self.assertEqual(result['reasonCodes'], [])
        self.assertEqual(result['productionCameraIntegration'], 'NOT_CONNECTED')
        for name in quality.UNMEASURED:
            self.assertEqual(result['checks'][name]['status'], 'NOT_MEASURED')
            self.assertEqual(result['checks'][name]['decision'], 'NEEDS_REVIEW')
        for metric in result['metrics'].values():
            self.assertEqual(metric, {'status': 'NOT_MEASURED', 'value': None})

    def assert_retake(self, image, category):
        result = quality.analyze_image(image)
        self.assertEqual(result['status'], 'RETAKE_REQUIRED')
        self.assertEqual(result['checks'][category]['status'], 'FLAGGED')
        self.assertIsNotNone(result['checks'][category]['reasonCode'])
        return result

    def test_gaussian_blurred_detail_is_retake(self):
        self.assert_retake(detailed_image().filter(ImageFilter.GaussianBlur(8)), 'blur')

    def test_dark_exposure_is_retake(self):
        self.assert_retake(detailed_image().point(lambda x: int(x * 0.1)), 'dark')

    def test_bright_exposure_is_retake(self):
        self.assert_retake(detailed_image().point(lambda x: 230 + int(x * 0.05)), 'bright')

    def test_low_contrast_is_retake(self):
        self.assert_retake(detailed_image().point(lambda x: 120 + int(x * 0.04)), 'lowcontrast')

    def test_small_detailed_image_is_retake(self):
        self.assert_retake(detailed_image().resize((200, 200)), 'insufficientresolution')

    def test_empty_surface_does_not_claim_optical_blur_proven(self):
        result = self.assert_retake(Image.new('RGB', (800, 800), (128, 128, 128)), 'blur')
        self.assertEqual(result['checks']['blur']['method'], 'PIXEL_HEURISTIC')
        self.assertIn('Low edge detail can reflect smooth content rather than optical blur.', result['limitations'])

    def test_thresholds_and_measured_values_are_visible_and_finite(self):
        result = quality.analyze_image(detailed_image())
        json.dumps(result, allow_nan=False)
        for name in ('blur', 'dark', 'bright', 'lowcontrast', 'insufficientresolution'):
            self.assertIn('value', result['checks'][name])
            self.assertIn('threshold', result['checks'][name])
        self.assertEqual(result['checks']['insufficientresolution']['value']['pixelCount'], 640000)

    def test_exif_and_file_identity_are_never_serialized(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'private-address-photo.png'
            exif = Image.Exif()
            exif[270] = 'private-customer-note'
            exif[274] = 6
            detailed_image().resize((800, 900)).save(path, exif=exif)
            result = quality.analyze_path(path)
            serialized = json.dumps(result)
            self.assertNotIn('private-address', serialized)
            self.assertNotIn(directory, serialized)
            self.assertNotIn('private-customer-note', serialized)
            dimensions = result['checks']['insufficientresolution']['value']
            self.assertEqual((dimensions['widthPx'], dimensions['heightPx']), (900, 800))

    def test_cli_outputs_json_and_never_overwrites_existing_output(self):
        with tempfile.TemporaryDirectory() as directory:
            path, output = Path(directory) / 'image.png', Path(directory) / 'report.json'
            detailed_image().save(path)
            with redirect_stdout(io.StringIO()) as capture:
                self.assertEqual(quality.main([str(path)]), 0)
            self.assertEqual(json.loads(capture.getvalue())['status'], 'NEEDS_REVIEW')
            self.assertEqual(quality.main([str(path), '--output', str(output)]), 0)
            before = output.read_bytes()
            with redirect_stdout(io.StringIO()):
                self.assertEqual(quality.main([str(path), '--output', str(output)]), 2)
            self.assertEqual(output.read_bytes(), before)

    def test_cli_corrupt_file_is_blocked_without_path_leak(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'private-client.png'
            path.write_bytes(b'not-an-image')
            with redirect_stdout(io.StringIO()) as capture:
                self.assertEqual(quality.main([str(path)]), 2)
            result = json.loads(capture.getvalue())
            self.assertEqual(result['status'], 'BLOCKED')
            self.assertNotIn('private-client', capture.getvalue())
            self.assertNotIn(directory, capture.getvalue())

    def test_transparent_content_is_composited_without_semantic_claim(self):
        result = self.assert_retake(Image.new('RGBA', (800, 800), (0, 0, 0, 0)), 'bright')
        self.assertEqual(result['measurements']['meanLuma'], 255.0)
        self.assertEqual(result['checks']['occlusion']['status'], 'NOT_MEASURED')

    def test_multiframe_and_excessive_pixel_count_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'two-frames.gif'
            Image.new('RGB', (20, 20), 'red').save(path, save_all=True, append_images=[Image.new('RGB', (20, 20), 'blue')])
            with self.assertRaisesRegex(ValueError, 'MULTIFRAME_IMAGE_UNSUPPORTED'):
                quality.analyze_path(path)
        with patch.dict(quality.THRESHOLDS, {'maximumInputPixelCount': 100}):
            with self.assertRaisesRegex(ValueError, 'IMAGE_TOO_LARGE'):
                quality.analyze_image(Image.new('RGB', (11, 10)))


if __name__ == '__main__':
    unittest.main()
