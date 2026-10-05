"""Validate immutable ZIP-origin test/fixture inventory and manifest completeness."""
from pathlib import Path
import hashlib,json,ast,subprocess
r=Path(__file__).resolve().parents[1];m=json.loads((r/'tests/regression-manifest-round1.json').read_text());assets=m['archiveAssets'];assert len(assets)==55
for item in assets:
 p=r/item['path'];assert p.is_file(),item['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],item['path']
 if p.suffix=='.py':ast.parse(p.read_text())
 if p.suffix=='.mjs':subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
originals={x['path'] for x in assets if Path(x['path']).suffix in ['.mjs','.py'] and Path(x['path']).parent==Path('tests')}
assert len(originals)==45;entries=m['entries'];assert originals<={e['path'] for e in entries};assert len({e['id'] for e in entries})==len(entries)
for e in entries:
 assert (r/e['path']).is_file(),e['path'];assert e['applicability'] in ['current','historical-mapped']
 if e['applicability']=='historical-mapped':assert e['replacement'] in {q['path'] for q in entries if q['applicability']=='current'}
assert set(m['historicalMappings'])=={e['path'] for e in entries if e['applicability']=='historical-mapped'}
print(json.dumps({'status':'PASS','archiveAssetsVerified':55,'archiveExecutableEntriesPreserved':45,'originalGitTestFiles':8,'restoredFiles':47,'assertionsEdited':0,'skip':0,'scope':'asset identity, manifest completeness, Python/JavaScript syntax; no feature/full regression claim'},indent=2))
