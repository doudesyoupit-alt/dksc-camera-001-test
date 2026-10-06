"""Offline native-pixel evaluation. Synthetic tests are not photo accuracy evidence.

API: evaluate_objects(truth, pred, width, height), draw_overlay(imagePath,
truth, pred, outputPath). Object fields: id, category, kind, x, y, w, h;
optional points, text, angleDeg, uncertainty, critical. All coordinates refer to
one canonical-photo-pixels frame. No recognition, external transfer or adoption.
Angles denote clockwise image-plane orientation. Rect/ellipse angle rotates their
geometry about their centre; polygon/line angle is annotation, points are already
in the frame. Direction error is periodic modulo 180 degrees, not a facing KPI.
IoU 0.10 is a fault-discovery matching threshold, never a shape acceptance gate.
Maximum correspondence cardinality is primary, total IoU is secondary.
Text geometry evaluates the annotated bounding rectangle, NOT glyph recognition.
Line geometry evaluates a 1-pixel stroke, not an arbitrary bounding box proxy.
Contour distance uses <=256 sampled raster boundary pixels per object; it is an
approximate symmetric mean distance, not exact Hausdorff or physical millimetres.
Human review and independent ground truth remain necessary.
"""
import math
import unicodedata
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

UNCERTAINTY = frozenset(('KNOWN', 'UNCERTAIN', 'UNKNOWN', 'OCCLUDED', 'LOW_QUALITY',
                        'RETAKE_REQUIRED', 'NEEDS_REVIEW', 'MEASUREMENT_REQUIRED',
                        'HUMAN_CHECK_REQUIRED'))
KINDS = frozenset(('polygon', 'rect', 'ellipse', 'line', 'text'))
MATCH_IOU = 0.10
MAX_PIXELS = 16_000_000
METRICS = ('objectRecall', 'objectPrecision', 'missedObjects', 'falseDetections',
           'misclassifiedObjects', 'geometryKindMismatches', 'iou',
           'positionErrorPx', 'angleErrorDeg', 'contourErrorPx', 'shapeMatchRate',
           'ocrCER', 'ocrAccuracy', 'unknownAppropriatenessRate', 'unknownRate',
           'criticalMissedObjects', 'criticalMisclassifiedObjects', 'unknownAppropriateness',
           'criticalMisses', 'criticalMisrecognitions')


def _number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _orientation(a, b, c):
    return (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0])


def _on_segment(a, b, p):
    return (abs(_orientation(a, b, p)) < 1e-9 and
            min(a[0], b[0])-1e-9 <= p[0] <= max(a[0], b[0])+1e-9 and
            min(a[1], b[1])-1e-9 <= p[1] <= max(a[1], b[1])+1e-9)


def _intersects(a, b, c, d):
    ab1, ab2, cd1, cd2 = _orientation(a, b, c), _orientation(a, b, d), _orientation(c, d, a), _orientation(c, d, b)
    return ((ab1 * ab2 < 0 and cd1 * cd2 < 0) or _on_segment(a, b, c) or
            _on_segment(a, b, d) or _on_segment(c, d, a) or _on_segment(c, d, b))


def _rotate(points, x, y, angle):
    r = math.radians(angle); c, s = math.cos(r), math.sin(r)
    return [(x+(a-x)*c-(b-y)*s, y+(a-x)*s+(b-y)*c) for a, b in points]


def _outline(obj):
    x, y, w, h = (obj[k] for k in ('x', 'y', 'w', 'h'))
    if obj['kind'] in ('polygon', 'line'):
        points = obj.get('points') or [(x, y), (x+w, y+h)]
        return [tuple(p) for p in points]
    if obj['kind'] == 'ellipse':
        points = [(x+w/2+w/2*math.cos(i*math.tau/360), y+h/2+h/2*math.sin(i*math.tau/360)) for i in range(360)]
    else:
        points = [(x, y), (x+w, y), (x+w, y+h), (x, y+h)]
    return _rotate(points, x+w/2, y+h/2, obj.get('angleDeg', 0))


def _validate_objects(objects, width, height, side):
    errors = []
    if not isinstance(objects, list) or len(objects) > 100:
        return [{'side': side, 'code': 'OBJECT_LIST_INVALID'}]
    seen = set()
    for index, obj in enumerate(objects):
        def fail(code): errors.append({'side': side, 'index': index, 'code': code})
        if not isinstance(obj, dict): fail('OBJECT_INVALID'); continue
        if not isinstance(obj.get('id'), str) or not obj['id'] or len(obj['id']) > 120 or obj['id'] in seen:
            fail('OBJECT_ID_INVALID')
        else: seen.add(obj['id'])
        if not isinstance(obj.get('category'), str) or not obj['category'] or len(obj['category']) > 160:
            fail('CATEGORY_INVALID')
        if not isinstance(obj.get('kind'), str) or obj['kind'] not in KINDS: fail('GEOMETRY_KIND_INVALID'); continue
        if not all(_number(obj.get(k)) for k in ('x', 'y', 'w', 'h')):
            fail('GEOMETRY_NONFINITE'); continue
        x, y, w, h = (obj[k] for k in ('x', 'y', 'w', 'h'))
        if x < 0 or y < 0 or w < 0 or h < 0 or x+w > width or y+h > height:
            fail('GEOMETRY_OUT_OF_FRAME'); continue
        if obj['kind'] != 'line' and (w <= 0 or h <= 0): fail('GEOMETRY_DEGENERATE'); continue
        if 'angleDeg' in obj and (not _number(obj['angleDeg']) or abs(obj['angleDeg']) > 360_000_000):
            fail('ANGLE_INVALID'); continue
        if 'text' in obj and (not isinstance(obj['text'], str) or len(obj['text']) > 10_000): fail('TEXT_INVALID')
        if 'uncertainty' in obj and (not isinstance(obj['uncertainty'], str) or obj['uncertainty'] not in UNCERTAINTY): fail('UNCERTAINTY_INVALID')
        if 'critical' in obj and not isinstance(obj['critical'], bool): fail('CRITICAL_INVALID')
        points = obj.get('points')
        if points is not None:
            if (not isinstance(points, list) or len(points) > 2000 or
                    any(not isinstance(p, (list, tuple)) or len(p) != 2 or not all(_number(q) for q in p) for p in points)):
                fail('POINTS_INVALID'); continue
            if any(not (x <= p[0] <= x+w and y <= p[1] <= y+h) for p in points):
                fail('POINTS_OUT_OF_BOUNDS'); continue
        if obj['kind'] == 'polygon':
            if not points or len(points) < 3: fail('POLYGON_TOO_SHORT'); continue
            if len({tuple(p) for p in points}) != len(points): fail('POLYGON_DUPLICATE_VERTEX'); continue
            area = sum(a[0]*b[1]-b[0]*a[1] for a, b in zip(points, points[1:]+points[:1]))/2
            if abs(area) <= 1e-9: fail('POLYGON_DEGENERATE')
            n = len(points)
            if any(_intersects(points[i], points[(i+1) % n], points[j], points[(j+1) % n])
                   for i in range(n) for j in range(i+1, n) if j != i+1 and not (i == 0 and j == n-1)):
                fail('POLYGON_SELF_INTERSECTION')
        if obj['kind'] == 'line':
            if points is not None and len(points) != 2: fail('LINE_ENDPOINTS_INVALID'); continue
            endpoints = points or [(x, y), (x+w, y+h)]
            if math.dist(endpoints[0], endpoints[1]) <= 1e-9: fail('LINE_DEGENERATE')
        if any(a < -1e-7 or b < -1e-7 or a > width+1e-7 or b > height+1e-7 for a, b in _outline(obj)):
            fail('ROTATED_GEOMETRY_OUT_OF_FRAME')
    return errors


def _frame_errors(width, height):
    if (not isinstance(width, int) or isinstance(width, bool) or not isinstance(height, int) or isinstance(height, bool)
            or width < 1 or height < 1 or width > 8192 or height > 8192 or width*height > MAX_PIXELS):
        return [{'code': 'FRAME_INVALID'}]
    return []


def _mask(obj, width, height):
    mask = Image.new('1', (width, height), 0); draw = ImageDraw.Draw(mask)
    points = _outline(obj)
    if obj['kind'] == 'line': draw.line(points, fill=1, width=1)
    elif obj['kind'] == 'ellipse' and not obj.get('angleDeg', 0):
        # Pillow rasterization is a pixel approximation; no bbox IoU substitution.
        draw.ellipse((obj['x'], obj['y'], obj['x']+obj['w'], obj['y']+obj['h']), fill=1)
    else: draw.polygon(points, fill=1)
    return mask


def _area(mask): return sum(mask.histogram()[1:])


def _iou(a, b, area_a=None, area_b=None):
    aa, bb = a.getbbox(), b.getbbox()
    if not aa or not bb: return None
    overlap = (max(aa[0],bb[0]),max(aa[1],bb[1]),min(aa[2],bb[2]),min(aa[3],bb[3]))
    if overlap[0] >= overlap[2] or overlap[1] >= overlap[3]: return 0.0
    intersection = _area(ImageChops.logical_and(a.crop(overlap), b.crop(overlap)))
    union = (area_a if area_a is not None else _area(a))+(area_b if area_b is not None else _area(b))-intersection
    return intersection/union if union else None


def _assignment(scores):
    """Rectangular Hungarian max-weight assignment with dummy/unmatched columns."""
    n = len(scores)
    if not n: return []
    m = len(scores[0]); columns = m+n
    # A cardinality difference dominates every possible summed IoU difference.
    cardinality_weight = n+m+1
    costs = [[-(cardinality_weight+v) if v is not None and v >= MATCH_IOU else 0
              for v in row]+[0]*n for row in scores]
    u = [0.0]*(n+1); v = [0.0]*(columns+1); p = [0]*(columns+1); way = [0]*(columns+1)
    for i in range(1, n+1):
        p[0] = i; j0 = 0; minimum = [math.inf]*(columns+1); used = [False]*(columns+1)
        while True:
            used[j0] = True; i0 = p[j0]; delta = math.inf; j1 = 0
            for j in range(1, columns+1):
                if used[j]: continue
                current = costs[i0-1][j-1]-u[i0]-v[j]
                if current < minimum[j]: minimum[j] = current; way[j] = j0
                if minimum[j] < delta: delta = minimum[j]; j1 = j
            for j in range(columns+1):
                if used[j]: u[p[j]] += delta; v[j] -= delta
                else: minimum[j] -= delta
            j0 = j1
            if not p[j0]: break
        while j0:
            j1 = way[j0]; p[j0] = p[j1]; j0 = j1
    return [(p[j]-1, j-1) for j in range(1, m+1) if p[j] and scores[p[j]-1][j-1] is not None and scores[p[j]-1][j-1] >= MATCH_IOU]


def _centre(obj):
    if obj['kind'] == 'polygon':
        pts = obj['points']; cross = [a[0]*b[1]-b[0]*a[1] for a, b in zip(pts, pts[1:]+pts[:1])]
        a = sum(cross)
        return (sum((p[0]+q[0])*c for p, q, c in zip(pts, pts[1:]+pts[:1], cross))/(3*a),
                sum((p[1]+q[1])*c for p, q, c in zip(pts, pts[1:]+pts[:1], cross))/(3*a))
    if obj['kind'] == 'line':
        a, b = _outline(obj); return ((a[0]+b[0])/2, (a[1]+b[1])/2)
    return obj['x']+obj['w']/2, obj['y']+obj['h']/2


def _boundary(mask):
    grey = mask.convert('L'); padded = ImageOps.expand(grey, border=1, fill=0)
    eroded = padded.filter(ImageFilter.MinFilter(3)).crop((1, 1, mask.width+1, mask.height+1))
    boundary = ImageChops.subtract(grey, eroded)
    bbox = boundary.getbbox()
    if not bbox: return []
    cropped = boundary.crop(bbox); count = cropped.histogram()[255]; step = max(1, math.ceil(count/256)); points = []; ordinal = 0
    for index, value in enumerate(cropped.get_flattened_data()):
        if value:
            if ordinal % step == 0: points.append((index % cropped.width+bbox[0], index//cropped.width+bbox[1]))
            ordinal += 1
    return points


def _contour(a, b):
    aa, bb = _boundary(a), _boundary(b)
    if not aa or not bb: return None
    return (sum(min(math.dist(p, q) for q in bb) for p in aa)/len(aa)+
            sum(min(math.dist(p, q) for q in aa) for p in bb)/len(bb))/2


def _edit_distance(a, b):
    if len(a) < len(b): a, b = b, a
    previous = list(range(len(b)+1))
    for i, x in enumerate(a, 1):
        current = [i]
        for j, y in enumerate(b, 1): current.append(min(current[-1]+1, previous[j]+1, previous[j-1]+(x != y)))
        previous = current
    return previous[-1]


def _mean(values):
    measured = [v for v in values if v is not None]
    return sum(measured)/len(measured) if measured else None


def evaluate_objects(truth, pred, width, height):
    """Return evaluation/validation metadata; this API never grants product PASS."""
    result = {k: None for k in METRICS}
    result.update({'status': 'NEEDS_REVIEW', 'humanReviewRequired': True,
                   'accuracyEvidenceKind': 'OFFLINE_RASTER_MEASUREMENT',
                   'coordinateSpace': 'canonical-photo-pixels', 'matches': [],
                   'measurementMethod': {'nativePixelMaskIoU': True, 'bboxProxy': False,
                       'rasterApproximation': True, 'lineStrokeWidthPx': 1,
                       'textShape': 'annotated-rectangle-not-glyphs', 'ellipseMethod': 'Pillow ellipse or 360-vertex rotated outline',
                       'contourMethod': 'symmetric-mean-distance-sampled-raster-boundary-max256',
                       'anglePeriodDeg': 180, 'matchIouThreshold': MATCH_IOU,
                       'matchingObjective': 'maximum-cardinality-then-total-IoU',
                       'matchThresholdIsProductAcceptance': False,
                       'unknownMethod': 'UNKNOWN status/category decisions judged against explicit GT UNKNOWN status or 未知対象 category; known category alone does not attest image readability'}})
    errors = _frame_errors(width, height)
    if not errors: errors = _validate_objects(truth, width, height, 'truth')+_validate_objects(pred, width, height, 'prediction')
    result['validationErrors'] = errors
    result['validation_errors'] = errors
    result['evaluationMethod'] = result['measurementMethod']
    if errors: return result
    truth_masks = [_mask(o, width, height) for o in truth]; pred_masks = [_mask(o, width, height) for o in pred]
    truth_areas = [_area(m) for m in truth_masks]; pred_areas = [_area(m) for m in pred_masks]
    if any(a == 0 for a in truth_areas+pred_areas):
        result['validationErrors'] = [{'code': 'GEOMETRY_EMPTY_RASTER'}]; result['validation_errors'] = result['validationErrors']; return result
    scores = [[_iou(a, b, truth_areas[i], pred_areas[j]) for j, b in enumerate(pred_masks)] for i, a in enumerate(truth_masks)]
    pairs = _assignment(scores); matched_truth = {i for i, _ in pairs}; matched_pred = {j for _, j in pairs}
    result['status'] = 'EVALUATED_NEEDS_HUMAN_REVIEW'
    result.update({'truthObjectCount': len(truth), 'predictionObjectCount': len(pred),
                   'objectRecall': len(pairs)/len(truth) if truth else None,
                   'objectPrecision': len(pairs)/len(pred) if pred else None,
                   'missedObjects': len(truth)-len(pairs), 'falseDetections': len(pred)-len(pairs),
                   'misclassifiedObjects': sum(truth[i]['category'] != pred[j]['category'] for i, j in pairs),
                   'geometryKindMismatches': sum(truth[i]['kind'] != pred[j]['kind'] for i, j in pairs),
                   'criticalMissedObjects': sum(o.get('critical', False) for i, o in enumerate(truth) if i not in matched_truth) if truth and all('critical' in o for o in truth) else None,
                   'criticalMisclassifiedObjects': sum(truth[i].get('critical', False) and truth[i]['category'] != pred[j]['category'] for i, j in pairs) if truth and all('critical' in o for o in truth) else None,
                   'criticalAnnotationComplete': bool(truth) and all('critical' in o for o in truth),
                   'missedTruthIds': [o['id'] for i, o in enumerate(truth) if i not in matched_truth],
                   'falsePredictionIds': [o['id'] for j, o in enumerate(pred) if j not in matched_pred]})
    for i, j in pairs:
        a, b = truth[i], pred[j]
        angle = abs((a['angleDeg']-b['angleDeg']+90) % 180-90) if 'angleDeg' in a and 'angleDeg' in b else None
        result['matches'].append({'truthId': a['id'], 'predictionId': b['id'], 'iou': scores[i][j],
                                 'positionErrorPx': math.dist(_centre(a), _centre(b)), 'angleErrorDeg': angle,
                                 'contourErrorPx': _contour(truth_masks[i], pred_masks[j]),
                                 'categoryCorrect': a['category'] == b['category'], 'kindCorrect': a['kind'] == b['kind']})
    for metric in ('iou', 'positionErrorPx', 'angleErrorDeg', 'contourErrorPx'):
        result[metric] = _mean([row[metric] for row in result['matches']])
    # Per-GT shape score penalizes missed objects and geometry-kind changes.
    result['shapeMatchRate'] = sum(scores[i][j] for i, j in pairs if truth[i]['kind'] == pred[j]['kind'])/len(truth) if truth else None
    pairs_by_truth = dict(pairs); edits = characters = 0
    for i, obj in enumerate(truth):
        if 'text' not in obj: continue
        expected = unicodedata.normalize('NFC', obj['text']); observed = unicodedata.normalize('NFC', pred[pairs_by_truth[i]].get('text', '')) if i in pairs_by_truth else ''
        edits += _edit_distance(expected, observed); characters += len(expected)
    result['ocrCER'] = edits/characters if characters else None
    result['ocrAccuracy'] = max(0.0, 1-result['ocrCER']) if result['ocrCER'] is not None else None
    result['ocrGroundTruthCharacters'] = characters; result['ocrEditDistance'] = edits if characters else None
    def unknown(obj): return obj.get('uncertainty') == 'UNKNOWN' or obj['category'] == '未知対象'
    def unknown_annotated(obj): return 'uncertainty' in obj or obj['category'] == '未知対象'
    unknown_decisions = [(i, j) for i, j in pairs if unknown(pred[j]) and unknown_annotated(truth[i])]
    unknown_false = sum(unknown(p) for j, p in enumerate(pred) if j not in matched_pred) if any(unknown_annotated(t) for t in truth) else 0
    denominator = len(unknown_decisions)+unknown_false
    result['unknownAppropriatenessRate'] = sum(unknown(truth[i]) for i, _ in unknown_decisions)/denominator if denominator else None
    result['unknownAppropriateness'] = result['unknownAppropriatenessRate']
    result['unknownRate'] = sum(unknown(p) for p in pred)/len(pred) if pred and all('uncertainty' in p or p['category'] == '未知対象' for p in pred) else None
    result['unknownEvaluatedDecisions'] = denominator
    result['criticalMisses'] = result['criticalMissedObjects']
    result['criticalMisrecognitions'] = sum(truth[i].get('critical', False) and (truth[i]['category'] != pred[j]['category'] or truth[i]['kind'] != pred[j]['kind']) for i, j in pairs) if result['criticalAnnotationComplete'] else None
    return result


def draw_overlay(imagePath, truth, pred, outputPath):
    """Write an RGB PNG without EXIF/ICC/text metadata; green GT, red predictions."""
    with Image.open(imagePath) as original:
        width, height = original.size
        errors = _frame_errors(width, height)
        if not errors: errors = _validate_objects(truth, width, height, 'truth')+_validate_objects(pred, width, height, 'prediction')
        if errors: raise ValueError('OVERLAY_NEEDS_REVIEW: '+','.join(e['code'] for e in errors))
        original.load(); result = Image.new('RGB', original.size); result.paste(original.convert('RGB'))
    draw = ImageDraw.Draw(result); stroke = max(1, round(max(width, height)/500))
    for objects, color in ((truth, '#00b050'), (pred, '#ff3030')):
        for obj in objects:
            points = _outline(obj)
            if obj['kind'] == 'line': draw.line(points, fill=color, width=stroke)
            else: draw.line(points+[points[0]], fill=color, width=stroke)
    Path(outputPath).parent.mkdir(parents=True, exist_ok=True)
    result.save(outputPath, format='PNG')
    return {'status': 'OVERLAY_WRITTEN_NEEDS_HUMAN_REVIEW', 'width': width, 'height': height,
            'truthColor': '#00b050', 'predictionColor': '#ff3030', 'metadataRemoved': True,
            'coordinateSpace': 'canonical-photo-pixels', 'humanReviewRequired': True}
