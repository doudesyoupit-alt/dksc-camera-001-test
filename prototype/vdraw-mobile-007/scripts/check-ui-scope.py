from pathlib import Path
import hashlib,json,re
R=Path(__file__).resolve().parents[1];B=R/'tests/baseline006-ui';old=(B/'app.js').read_text();new=(R/'web/src/app.js').read_text()
def body(source,name):
 start=re.search(r'^(?:async )?function '+re.escape(name)+r'\(',source,re.M);assert start,name
 after=source[start.start():];end=re.search(r'\n(?:async )?function \w+\(|\nconst number=|\ndocument.addEventListener|\nwindow.addEventListener',after)
 return after[:end.start()] if end else after
names=['geometry','draw','patchShape','restoreDrawing','scheduleSave','markDirty','change','save','open','begin','measuredExport','pagesSheet','attachGestures','resize']
checks={n:body(old,n)==body(new,n) for n in names};assert all(checks.values()),checks
manifest=json.loads((R/'BASELINE-LOGIC-MANIFEST.json').read_text());hashes={n:hashlib.sha256((R/n).read_bytes()).hexdigest()==h for n,h in manifest.items()};assert all(hashes.values()),hashes
def normalized_output(s):return body(s,'output').replace('exportBusy(true);','').replace('exportBusy(false);','').replace('safeNotice(e.message)','e.message')
assert normalized_output(old)==normalized_output(new),'export workflow modified'
result={'status':'PASS','protectedLogicFiles':len(hashes),'protectedLogicHashes':hashes,'unchangedAppLogicFunctions':checks,'exportWorkflowUnchangedApartFromBusyAndErrorPresentation':True,'storageNameSchemaUnchanged':True,'coordinatesDimensionsTracingInputsOutputsUnchanged':True}
(R/'evidence/ui-007').mkdir(parents=True,exist_ok=True);(R/'evidence/ui-007/UI-scope-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
