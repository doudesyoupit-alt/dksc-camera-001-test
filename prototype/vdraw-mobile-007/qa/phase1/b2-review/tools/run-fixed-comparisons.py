"""Compare saved fixed B2 results and new G witness; never rerun old producer suites."""
import json,os,hashlib
from pathlib import Path
from evaluate_candidate2_adapter import evaluate
R=Path(__file__).resolve().parents[1];B=Path(os.environ['VDRAW_B2_EVIDENCE_ROOT']);names=['native-vdraw-n01','generic-synthetic-g01','generic-synthetic-g02-nested','synthetic-g03-expanded','explicit-paint-width-alpha-witness','synthetic-g04-property-witness'];summary=[]
for n in names:
 tf=R/'fixtures'/(n+('.independent-source-property-truth.json' if n.startswith('explicit-') else '.property-unit-truth.json'));rf=(R/'evidence' if n.startswith('synthetic-g04') else B)/(n+'.adapter-result.json');t=json.loads(tf.read_text());a=json.loads(rf.read_text());out=evaluate(t,a);out['inputPins']={'truthSHA256':hashlib.sha256(tf.read_bytes()).hexdigest(),'resultSHA256':hashlib.sha256(rf.read_bytes()).hexdigest(),'fixedB2HEAD':'2ad1c0a2c3537914d2d3a460b5843b542a6dc098','originalTruthFixedBeforeB2':not n.startswith('explicit-')};(R/'evidence'/(n+'.independent-compare.json')).write_text(json.dumps(out,separators=(',',':'))+'\n');summary.append({'package':n,**{k:out[k] for k in ['pass','fail','sourceObjects','sourceComponents','geometryDenominator','textDenominator','representedGeometry','representedText','boundedGeometryReadiness']}})
print(json.dumps(summary,indent=2));(R/'evidence/independent-comparison-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
if any(v['fail'] for v in summary):raise SystemExit(1)
