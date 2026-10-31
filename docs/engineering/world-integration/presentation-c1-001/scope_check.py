"""C1 exact whitelist, one historical literal and protected index/Git-byte proof."""
from pathlib import Path
import ast, hashlib, json, re, subprocess, sys
from review_checks import ROOT, BASE, BRANCH, DOCS, SCOPE, assert_scope

evidence = Path(sys.argv[1]).resolve(strict=True)
def git(*args): return subprocess.check_output(['git','-c','core.quotepath=false',*args],cwd=ROOT)
assert git('branch','--show-current').decode().strip() == BRANCH
base = {r.split(b'\t',1)[1].decode(): r.split(b'\t',1)[0].decode() for r in git('ls-tree','-rz',BASE).split(b'\0') if r}
index = {}
for row in git('ls-files','--stage','-z').split(b'\0'):
    if row:
        meta,path = row.split(b'\t',1); mode,obj,stage = meta.decode().split(); assert stage == '0'
        index[path.decode()] = mode+' blob '+obj
paths = sorted({p.decode() for p in git('diff','--name-only','-z',BASE).split(b'\0')+git('ls-files','--others','--exclude-standard','-z').split(b'\0') if p})
assert_scope(paths)
for p in paths: assert (ROOT/p).is_file() and not (ROOT/p).is_symlink()
existing = set(SCOPE['allowed_existing_production_edits']) | {r['path'] for r in SCOPE['allowed_existing_test_edits']}
for p in SCOPE['allowed_new_production_files']+SCOPE['allowed_new_test_files']: assert p not in base
assert not any(p.startswith(DOCS) for p in base)
row = SCOPE['allowed_existing_test_edits'][0]
a = row['baseline_literal'].encode()
b = 'expect(h.host.querySelector(`[aria-label="${({ orderly: \'感染护工\', porter: \'感染装卸工\', technician: \'感染技术员\' })[enemy]}中性占位"]`)).not.toBeNull()'.encode()
old = git('show',BASE+':'+row['path']); new = (ROOT/row['path']).read_bytes().replace(b'\r\n',b'\n')
assert old.count(a)==1 and new == old.replace(a,b,1), 'Historical test must have exactly one permitted literal replacement'
protected = [{'path':p,'gitObject':obj,'sameIndexObject':index.get(p)==obj} for p,obj in base.items() if p not in existing]
assert all(r['sameIndexObject'] for r in protected)
for p in paths:
    data=(ROOT/p).read_bytes(); obj=subprocess.check_output(['git','hash-object','--path='+p,'--stdin'],input=data,cwd=ROOT)
    assert index.get(p,'').endswith(' '+obj.decode().strip()), 'Not staged exactly: '+p
full=subprocess.run(['git','diff','--check',BASE],cwd=ROOT,capture_output=True)
(evidence/'diff-check-full.log').write_bytes(full.stdout+full.stderr)
assert full.returncode in (0,2)
warnings=[l for l in full.stdout.decode('utf-8').splitlines() if re.match(r'^.+:\d+: ',l)]
if full.returncode: assert warnings and all(l.startswith(DOCS+'inputs/') for l in warnings)
assert subprocess.run(['git','diff','--check',BASE,'--','.',':(exclude)'+DOCS+'inputs'],cwd=ROOT).returncode==0
for f in (ROOT/DOCS).glob('*.py'): ast.parse(f.read_text('utf-8'))
for f in (ROOT/DOCS).rglob('*.json'): json.loads(f.read_text('utf-8-sig'))
original=json.loads((evidence/'input-extraction.json').read_text('utf-8-sig'))
# The input verifier validates its exact original manifest; compare indexed bytes too.
input_result=subprocess.run([sys.executable,'-B','-X','utf8',str(ROOT/DOCS/'inputs/verify-package.py')],cwd=ROOT/DOCS/'inputs',capture_output=True)
assert input_result.returncode==0, input_result.stdout+input_result.stderr
inputs=[]
for f in sorted((ROOT/DOCS/'inputs').rglob('*')):
    if f.is_file():
        p=f.relative_to(ROOT).as_posix(); data=f.read_bytes(); assert git('show',':'+p)==data, 'Input Git bytes changed: '+p
        inputs.append({'path':p,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'exactIndexBytes':True})
assert len(inputs)==14
for p in SCOPE['allowed_new_production_files']:
    source=(ROOT/p).read_text('utf-8')
    assert 'docs/' not in source and not re.search(r'\b(?:Math\.random|Date\.now|JSON\.stringify)\s*\(',source)
    assert not re.search(r'\.(?:execute|confirm|retrySave|dispatch|save|setItem)\s*\(',source)
result={'status':'PASS','baseSHA':BASE,'paths':paths,'protectedObjectCount':len(protected),'protectedObjects':protected,
        'historicalTest':{'path':row['path'],'exactPermittedReplacements':1,'allOtherBytesPreserved':True},
        'inputFiles':inputs,'inputVerifierOutput':input_result.stdout.decode('utf-8'),'diffCheckExit':full.returncode,
        'originalInputWhitespaceWarningsOnly':warnings,'newBodyWhitespaceExit':0,'indexEqualsWorktreeFilteredBytes':True,
        'notIndependentMainlineAcceptance':True}
(evidence/'scope-protected-objects.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k not in ['paths','protectedObjects','inputFiles','originalInputWhitespaceWarningsOnly']},ensure_ascii=False))
