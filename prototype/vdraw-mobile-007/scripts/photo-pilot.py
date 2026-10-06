"""First internet-photo fault discovery; recognition/GT metrics remain unmeasured."""
import argparse, importlib.util, json, os, time
from pathlib import Path

STAGES=['Camera Quality','Scene','Detection','Segmentation','OCR','Geometry','Coordinate','Scale','Overlay','Export']
def module(name,file):
    s=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file)); m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m

def run(manifest, root, output):
    ev=module('ev','photo-eval.py');quality=module('quality','photo-quality.py')
    ev.validate_manifest(manifest)
    verified=ev.verified_internet_inventory(manifest,root)
    if len(verified)!=len(manifest['photos']) or len(verified)!=10:raise ValueError('PINNED_PUBLIC_PHOTO_INVENTORY_INCOMPLETE')
    output.mkdir(parents=True,exist_ok=True);rows=[]
    provider={v:bool(os.environ.get(v)) for v in ev.PROVIDER_VARS}
    for p in manifest['photos']:
        start=time.monotonic();q=quality.analyze_path(ev.safe_path(root,p['canonicalPath']))
        stages={stage:{'status':'BLOCKED','reason':'UPSTREAM_REAL_INFERENCE_NOT_AVAILABLE'} for stage in STAGES}
        stages['Camera Quality']={'status':q['status'],'method':'HEURISTIC','reasonCodes':q['reasonCodes'],'accuracy':'NOT_MEASURED'}
        stages['Scene']={'status':'BLOCKED','implementation':'PARTIAL_PRIVATE_ADAPTER','reason':'REAL_PROVIDER_NOT_CONNECTED'}
        stages['Detection']={'status':'BLOCKED','reason':'REAL_SCENE_INFERENCE_NOT_EXECUTED'}
        stages['Segmentation']={'status':'BLOCKED','implementation':'PARTIAL_PRIVATE_ADAPTER','reason':'REAL_SEGMENTATION_PROVIDER_NOT_CONNECTED'}
        stages['OCR']={'status':'NOT_IMPLEMENTED','reason':'NO_PRODUCT_OCR_PROVIDER'}
        stages['Geometry']={'status':'BLOCKED','implementation':'HEURISTIC_PARTIAL','reason':'NO_REAL_AI_CANDIDATE'}
        stages['Coordinate']={'status':'CONTRACT_REGRESSION_ONLY','photoCandidate':'NOT_MEASURED'}
        stages['Scale']={'status':'UNSCALED','provenance':None,'measurementRequired':True,'generatedPhysicalDimensions':False}
        stages['Overlay']={'status':'NOT_EXECUTED','reason':'NO_REAL_AI_GEOMETRY_TO_OVERLAY'}
        stages['Export']={'status':'PHOTO_PLACEMENT_ASSAY_ONLY','recognitionFidelity':'NOT_MEASURED','realAppAcceptance':'NOT_MEASURED'}
        row={'photoId':p['id'],'sourceSHA256':p['originalSHA256'],'split':p['split'],'difficulty':p['difficulty'],
             'status':'BLOCKED','failureStage':'Camera Quality' if q['status']=='RETAKE_REQUIRED' else 'Scene',
             'quality':q,'stages':stages,'metrics':{k:None for k in ev.METRICS},
             'missedCount':None,'falseDetectionCount':None,'misclassificationCount':None,'zeroCorrectionCompletion':None,
             'humanCorrectionCount':None,'humanCorrectionTimeSeconds':None,'aiProcessingTimeSeconds':None,
             'qualityProcessingTimeSeconds':round(time.monotonic()-start,6),'upstreamStatusPropagation':'NO_AUTO_CONFIRMATION',
             'humanCorrectionLedger':{'status':'NOT_AVAILABLE','externalTransfer':False,'autoLearning':False,'allowedTypes':['classification','contour','position','color','text','shape']},
             'groundTruthStatus':'NOT_ANNOTATED','formalMetricStatus':'NOT_MEASURED'}
        rows.append(row)
        (output/(p['id']+'-pilot.json')).write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
    r=ev.report(manifest,root,output,False)
    r.update(rows=rows,status='BLOCKED',trialStatus='TEN_REAL_PHOTOS_QUALITY_EXECUTED_RECOGNITION_BLOCKED',
             actualNetworkRequestsThisCommand=0,realAIPhotoCount=0,
             qualityGateCounts={status:sum(x['quality']['status']==status for x in rows) for status in ['RETAKE_REQUIRED','NEEDS_REVIEW','BLOCKED']},
             failureStageCounts={s:sum(x['failureStage']==s for x in rows) for s in STAGES},
             realProviderConfigPresence=provider,
             realAIBlocker='NO_EXECUTABLE_PRODUCT_AI_AND_SEGMENTATION_CONNECTION_IN_THIS_ENVIRONMENT',
             expansionDecision='HOLD_AT_10_UNTIL_REAL_AI_AND_GROUND_TRUTH',
             releaseBlockers=sorted(set(r['releaseBlockers']+['PRODUCT_CAMERA_QUALITY_GATE_NOT_CONNECTED','REAL_AI_TRIAL_NOT_EXECUTED','HUMAN_GROUND_TRUTH_MISSING','OVERLAY_RECOGNITION_NOT_EVALUATED','OCR_NOT_IMPLEMENTED','REAL_APP_EXPORT_AND_ROUND_TRIP_UNMEASURED'])))
    (output/'accuracy-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
    summary=(output/'accuracy-summary.md').read_text()
    summary+='\n10枚の実画素品質診断: '+json.dumps(r['qualityGateCounts'],ensure_ascii=False)+'。閾値は暫定、品質判定精度は未測定。\n'
    summary+='\n実AI 0枚。各写真の段階別故障、修正量、AI時間、認識指標は未測定を保持。10→100枚へ拡張はHOLD。追加実機操作は不要。\n'
    (output/'accuracy-summary.md').write_text(summary)
    return r

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,required=True);p.add_argument('--dataset-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    r=run(json.loads(a.manifest.read_text()),a.dataset_root,a.output)
    print(json.dumps({k:r[k] for k in ['realPhotoTotal','realAIPhotoCount','difficultyCounts','qualityGateCounts','failureStageCounts','expansionDecision']}))
