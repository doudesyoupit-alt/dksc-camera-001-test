"""Run manifest in a fresh isolated copy; blocked resources can never produce PASS.
Raw archive harnesses remain unchanged. Only fixed executable paths in the *run copy*
are replaced by VDRAW_CHROMIUM; all assertions and UI selectors remain unchanged.
"""
from pathlib import Path
import argparse, json, os, subprocess, tempfile, shutil, signal, sys, time, re, math
p=argparse.ArgumentParser();p.add_argument('--profile', choices=['assets','limited','full'], default='assets');p.add_argument('--source-sha', required=True);p.add_argument('--output-root');p.add_argument('--include-native-assets',action='store_true');a=p.parse_args()
root=Path(__file__).resolve().parents[1];manifest=json.loads((root/'tests/regression-manifest-round1.json').read_text())
out=Path(a.output_root or tempfile.mkdtemp(prefix='vdraw007-regression-run-')).resolve();out.mkdir(parents=True,exist_ok=True)
work=out/'project';work.mkdir(exist_ok=False)
for name in ['web','server','native','android','tests','scripts','tools']:
 if (root/name).exists():shutil.copytree(root/name,work/name)
for name in ['serve.py','package.json','package-lock.json','capacitor.config.json']:
 if (root/name).exists():shutil.copy2(root/name,work/name)
(work/'evidence').mkdir();(out/'logs').mkdir()
rows=[];start=time.time();env=os.environ.copy()
for name in ['PWA_ONLY','SCREENS_ONLY','PRODUCT_PHASE','QA_TARGET_ROOT','VDRAW_BASELINE_ROOT','VDRAW_QA_PROJECT','VDRAW_QA_FIXTURE']:
 if env.get(name):raise SystemExit('PARTIAL_TEST_MODE_FORBIDDEN:'+name)
if env.get('VDRAW_PHASE','after')!='after':raise SystemExit('WRONG_RELEASE_TEST_PHASE:'+env['VDRAW_PHASE'])
(out/'verdicts').mkdir()
browser=env.get('VDRAW_CHROMIUM');browser_ok=bool(browser and Path(browser).is_file() and Path(browser).stat().st_size>1000 and os.access(browser,os.X_OK))
transformations=[]
if browser_ok:
 for file in (work/'tests').glob('*.mjs'):
  text=file.read_text();changed=text.replace("executablePath:'/tmp/chromium'",'executablePath:process.env.VDRAW_CHROMIUM')
  if changed!=text:
   file.write_text(changed);transformations.append({'path':str(file.relative_to(work)),'onlyChange':'fixed /tmp/chromium launch literal -> VDRAW_CHROMIUM environment'})
entries=manifest['entries']
if a.profile=='assets':entries=[{'id':'asset-integrity','kind':'python','command':['python3','scripts/check-regression-assets-round1.py'],'timeoutSeconds':30}]
elif a.profile=='limited':entries=[e for e in entries if e['kind'] in ['node-test','python-unit','python-static'] and e['applicability']=='current']
else:entries=[e for e in entries if e['applicability']=='current']
# New specialist regression files are always discovered, not dropped by a frozen manifest.
if a.profile in ['limited','full']:
 known={e['path'] for e in manifest['entries']}
 for file in sorted((work/'tests').glob('*.test.mjs')):
  rel=str(file.relative_to(work))
  if rel not in known:entries.append({'id':file.name,'kind':'node-test','path':rel,'command':['node','--test',rel],'timeoutSeconds':90})
if a.include_native_assets:entries.append({'id':'native-assets-007-parity','kind':'python-static','command':['python3','tests/native-assets-007.py','--check-assets'],'timeoutSeconds':30})
for e in entries:
 row={'id':e['id'],'command':e['command'],'sourceSha':a.source_sha,'profile':a.profile}
 dependencies=e.get('dependencies',[])
 if any(next((x['status'] for x in rows if x['id']==d),'NOT_RUN')!='PASS' for d in dependencies):
  row.update(status='BLOCKED',reason='PREREQUISITE_NOT_PASS:'+','.join(dependencies));rows.append(row);print(e['id']+' BLOCKED',flush=True);continue
 if e['kind']=='browser' and not browser_ok:
  row.update(status='BLOCKED',reason='BROWSER_EXECUTABLE_UNAVAILABLE');rows.append(row);print(e['id']+' BLOCKED',flush=True);continue
 before_json={str(q):q.stat().st_mtime_ns for q in (work/'evidence').rglob('*.json')}
 t=time.time();log=out/'logs'/(e['id']+'.log');code=None
 with log.open('w') as f:
  try:
   proc=subprocess.Popen(e['command'],cwd=work,env=env,stdout=f,stderr=subprocess.STDOUT,start_new_session=True)
   try:code=proc.wait(timeout=e.get('timeoutSeconds',180))
   except subprocess.TimeoutExpired:
    os.killpg(proc.pid,signal.SIGKILL);proc.wait();row['reason']='HARNESS_TIMEOUT'
  except (OSError,ValueError) as ex:row['reason']=str(ex)
 row.update(status='PASS' if code==0 else 'FAIL',exitCode=code,durationSeconds=round(time.time()-t,3),log=str(log))
 log_text=log.read_text()
 skip_counts=[int(n) for n in re.findall(r'^(?:# |ℹ )(?:skip|skipped) (\d+)\s*$',log_text,re.M)]+[int(n) for n in re.findall(r'\bskipped=(\d+)',log_text)]
 row['skip']=sum(skip_counts)
 if e['kind']=='node-test' or e['command'][:2]==['node','--test']:
  case_counts=[int(n) for n in re.findall(r'^(?:# |ℹ )tests (\d+)\s*$',log_text,re.M)]
  row['caseCount']=sum(case_counts)
  if not row['caseCount']:row.update(status='FAIL',reason='NO_NODE_TEST_CASES_EXECUTED')
  if e.get('expectedCaseCount') is not None and row['caseCount']!=e['expectedCaseCount']:row.update(status='FAIL',reason='EXPECTED_CASE_COUNT_MISMATCH')
 invalid_counts=[int(n) for n in re.findall(r'^(?:# |ℹ )(?:todo|cancelled) (\d+)\s*$',log_text,re.M)]
 if any(invalid_counts):row.update(status='FAIL',reason='TESTS_TODO_OR_CANCELLED')
 if row['skip']:row.update(status='FAIL',reason='TESTS_SKIPPED')
 if e['kind']=='python-unit':
  python_cases=[int(n) for n in re.findall(r'^Ran (\d+) tests?',log_text,re.M)]
  row['caseCount']=sum(python_cases)
  if not row['caseCount']:row.update(status='FAIL',reason='NO_PYTHON_TEST_CASES_EXECUTED')
 if e.get('expectedCaseCount') is not None and row.get('caseCount')!=e['expectedCaseCount']:row.update(status='FAIL',reason='EXPECTED_CASE_COUNT_MISMATCH')
 # Inspect every fresh browser diagnostic, including exit-zero FAIL reporters.
 if e['kind']=='browser':
  for q in (work/'evidence').rglob('*.json'):
   if before_json.get(str(q))==q.stat().st_mtime_ns:continue
   try:d=json.loads(q.read_text())
   except (ValueError,OSError):continue
   if not isinstance(d,dict):continue
   bad=bool(d.get('skip',0)) or bool(d.get('skipped',0)) or d.get('status') in ['BLOCKED','FAIL','FAILED','SKIP','SKIPPED'] or bool(d.get('failure')) or bool(d.get('errors')) or bool(d.get('consoleErrors')) or bool(d.get('externalRequests'))
   for field in ['results','rows','checks']:
    for item in d.get(field,[]) if isinstance(d.get(field),list) else []:
     if isinstance(item,dict) and (item.get('status') in ['BLOCKED','FAIL','FAILED','SKIP','SKIPPED'] or item.get('result') in ['BLOCKED','FAIL','FAILED','SKIP','SKIPPED']):bad=True
   if bad:row.update(status='FAIL',reason='NON_PASS_FRESH_EVIDENCE:'+str(q.relative_to(work)))
 # An inherited diagnostic may return exit 0 for BLOCKED: inspect its fresh output.
 for report in e.get('verdictFiles',[]):
  q=work/report
  if not q.exists():row.update(status='FAIL',reason='EXPECTED_EVIDENCE_NOT_GENERATED:'+report);continue
  try:d=json.loads(q.read_text())
  except (OSError,ValueError):row.update(status='FAIL',reason='EXPECTED_EVIDENCE_MALFORMED:'+report);continue
  if not isinstance(d,dict):row.update(status='FAIL',reason='EXPECTED_EVIDENCE_NOT_OBJECT:'+report);continue
  if isinstance(d.get('skip'),int):row['skip']+=d['skip']
  if isinstance(d.get('skipped'),int):row['skip']+=d['skipped']
  if row['skip']:row.update(status='FAIL',reason='TESTS_SKIPPED_IN_EVIDENCE')
  for field in ['results','rows','checks','measurements']:
   if field in d and isinstance(d[field],list) and not d[field]:row.update(status='FAIL',reason='EMPTY_MEASUREMENT_OR_CASES:'+report)
  measurement_contracts={'performance.mjs':('measurements',3),'performance-003.mjs':('measurements',18),'performance-004.mjs':('measurements',18),'performance-005.mjs':('measurements',18),'performance-final-006-reference.mjs':('rows',6),'ui-performance-007.mjs':('rows',2),'ui-performance-true006-release.mjs':('rows',2),'clone-profile-005.mjs':('results',6),'segment-probe-005.mjs':('rows',3)}
  if e['id'] in measurement_contracts:
   field,expected=measurement_contracts[e['id']];measurements=d.get(field,[])
   if len(measurements)!=expected:row.update(status='FAIL',reason='MEASUREMENT_COUNT_MISMATCH:'+report)
   def finite_timings(value):
    if isinstance(value,dict):
     for key,v in value.items():
      if key.endswith('Ms') or key in ['structured','serialize','parse']:
       if isinstance(v,list):
        if not v or not all(isinstance(t,(int,float)) and math.isfinite(t) for t in v):return False
       elif not isinstance(v,(int,float)) or not math.isfinite(v):return False
      elif not finite_timings(v):return False
    elif isinstance(value,list):return all(finite_timings(v) for v in value)
    return True
   if not finite_timings(measurements):row.update(status='FAIL',reason='INVALID_TIMING_MEASUREMENT:'+report)
  snapshot=out/'verdicts'/(e['id']+'--'+q.name);shutil.copy2(q,snapshot)
  row.setdefault('verdictSnapshots',[]).append(str(snapshot))
  if d.get('status') in ['BLOCKED','FAIL','FAILED','SKIP','SKIPPED'] or d.get('failure') or d.get('errors') or d.get('consoleErrors') or d.get('externalRequests'):row.update(status='FAIL',reason='NON_PASS_EVIDENCE:'+report)
  if before_json.get(str(q))==q.stat().st_mtime_ns:row.update(status='FAIL',reason='EXPECTED_EVIDENCE_NOT_FRESH:'+report)
 rows.append(row);print(e['id']+' '+row['status'],flush=True)
summary={'schema':'vdraw-regression-run/1','sourceSha':a.source_sha,'profile':a.profile,'suiteComplete':a.profile=='full' and all(r['status']=='PASS' for r in rows),'pass':sum(r['status']=='PASS' for r in rows),'fail':sum(r['status']=='FAIL' for r in rows),'blocked':sum(r['status']=='BLOCKED' for r in rows),'skip':sum(r.get('skip',0) for r in rows),'durationSeconds':round(time.time()-start,3),'rawEntryCount':manifest['archiveExecutableCount'],'mappedHistoricalEntries':manifest['historicalMappings'],'newEntryDiscovery':True,'runCopyTransforms':transformations,'rows':rows,'scope':'Software harnesses only; no Android device or signing proof. PASS is not full acceptance without separate QA/P0/P1/006/signing gates.'}
(out/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:summary[k] for k in ['sourceSha','profile','suiteComplete','pass','fail','blocked','skip']}));print(str(out/'summary.json'))
sys.exit(0 if all(r['status']=='PASS' for r in rows) else 1)
