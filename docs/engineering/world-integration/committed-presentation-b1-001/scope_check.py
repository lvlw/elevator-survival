"""Read-only exact whitelist, literal-only historical changes and protected-object proof."""
from pathlib import Path
import ast
import hashlib
import json
import re
import subprocess
import sys
from review_checks import ROOT, BASE, BRANCH, DOCS, SCOPE, assert_scope

evidence = Path(sys.argv[1]).resolve(strict=True)
def git(*args): return subprocess.check_output(['git','-c','core.quotepath=false',*args], cwd=ROOT)
assert git('branch','--show-current').decode().strip() == BRANCH
base = {r.split(b'\t',1)[1].decode(): r.split(b'\t',1)[0].decode()
        for r in git('ls-tree','-rz',BASE).split(b'\0') if r}
index = {}
for row in git('ls-files','--stage','-z').split(b'\0'):
    if row:
        meta,path = row.split(b'\t',1); mode,obj,stage = meta.decode().split(); assert stage == '0'
        index[path.decode()] = mode+' blob '+obj
paths = sorted(set(p.decode() for p in git('diff','--name-only','-z',BASE).split(b'\0') + git('ls-files','--others','--exclude-standard','-z').split(b'\0') if p))
assert_scope(paths)
for p in paths: assert (ROOT/p).is_file() and not (ROOT/p).is_symlink()
existing = set(SCOPE['allowed_existing_production_edits'])
existing.update(r['path'] for k in ['allowed_existing_test_edits','allowed_existing_document_edits'] for r in SCOPE[k])
for path in SCOPE['allowed_new_production_files'] + SCOPE['allowed_new_test_files']:
    assert path not in base, 'New path already at baseline: '+path
assert not any(p.startswith(DOCS) for p in base)
compat = json.loads((ROOT/DOCS/'inputs/SOURCE-COMPATIBILITY-BASELINES.json').read_text('utf-8'))
adaptations = []
for row in compat['existing_test_changes']:
    old = git('show',BASE+':'+row['path']); new = (ROOT/row['path']).read_bytes().replace(b'\r\n',b'\n')
    a,b = row['old_exact_assertion'].encode(),row['new_exact_assertion'].encode()
    if row['path'].endswith('presentation-preparation-probe.test.ts'): a,b = b'    '+a+b'\n',b'    '+b+b'\n'
    assert old.count(a) == 1 and new == old.replace(a,b,1), row['path']
    adaptations.append({'path':row['path'],'exactAllowedReplacements':1,'allOtherBytesPreserved':True})
row = compat['nonblocking_document_change']; old = git('show',BASE+':'+row['path']); expected = old
for a,b in row['replacements']: assert expected.count(a.encode()) == 1; expected = expected.replace(a.encode(),b.encode(),1)
assert (ROOT/row['path']).read_bytes().replace(b'\r\n',b'\n') == expected
adaptations.append({'path':row['path'],'exactAllowedReplacements':2,'allOtherBytesPreserved':True})
protected = [{'path':p,'gitObject':obj,'sameIndexObject':index.get(p)==obj} for p,obj in base.items() if p not in existing]
assert all(r['sameIndexObject'] for r in protected)
exclusions = [':(exclude)'+p for p in existing]+[':(exclude)'+DOCS]+[':(exclude)'+p for p in SCOPE['allowed_new_production_files']+SCOPE['allowed_new_test_files']]
assert subprocess.run(['git','diff','--quiet',BASE,'--','.',*exclusions],cwd=ROOT).returncode == 0
full = subprocess.run(['git','diff','--check',BASE],cwd=ROOT,capture_output=True)
(evidence/'diff-check-full.log').write_bytes(full.stdout+full.stderr)
assert full.returncode in (0,2)
warnings = [l for l in full.stdout.decode('utf-8').splitlines() if re.match(r'^.+:\d+: ',l)]
if full.returncode: assert warnings and all(l.startswith(DOCS+'inputs/') for l in warnings), warnings
assert subprocess.run(['git','diff','--check',BASE,'--','.',':(exclude)'+DOCS+'inputs'],cwd=ROOT).returncode == 0
for file in (ROOT/DOCS).glob('*.py'): ast.parse(file.read_text('utf-8'))
for file in (ROOT/DOCS).rglob('*.json'): json.loads(file.read_text('utf-8-sig'))
# New executable helpers are entirely type-import-only and never import test observers.
for name in SCOPE['allowed_new_production_files']:
    text = (ROOT/name).read_text('utf-8')
    assert all(line.startswith('import type ') for line in text.splitlines() if line.startswith('import '))
    assert not re.search(r'\b(?:Math\.random|Date\.now|setTimeout|JSON\.stringify)\s*\(',text)
result = {'status':'PASS','baseSHA':BASE,'phase':'index/worktree scope','paths':paths,'adaptations':adaptations,
          'protectedObjectCount':len(protected),'protectedObjects':protected,'diffCheckExit':full.returncode,
          'originalInputWhitespaceWarningsOnly':warnings,'newBodyWhitespaceExit':0,
          'newHelpersTypeImportsOnly':True,'notIndependentMainlineAcceptance':True}
(evidence/'scope-protected-objects.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k not in ['protectedObjects','paths','originalInputWhitespaceWarningsOnly']},ensure_ascii=False))
