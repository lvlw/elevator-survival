"""Read-only C16 supplement scope; every pre-existing object protected."""
from pathlib import Path
import ast,hashlib,json,re,subprocess,sys
from review_checks import ROOT,BASE,BRANCH,DOCS,assert_scope
evidence=Path(sys.argv[1]).resolve(strict=True)
def git(*args): return subprocess.check_output(['git','-c','core.quotepath=false',*args],cwd=ROOT)
assert git('branch','--show-current').decode().strip()==BRANCH
base={r.split(b'\t',1)[1].decode():r.split(b'\t',1)[0].decode() for r in git('ls-tree','-rz',BASE).split(b'\0') if r}
assert len(base)==3160 and not any(p.startswith(DOCS) for p in base)
index={}
for row in git('ls-files','--stage','-z').split(b'\0'):
    if row:
        meta,p=row.split(b'\t',1);mode,obj,stage=meta.decode().split();assert stage=='0';index[p.decode()]=mode+' blob '+obj
paths=sorted({p.decode() for p in git('diff','--name-only','-z',BASE).split(b'\0')+git('ls-files','--others','--exclude-standard','-z').split(b'\0') if p})
assert_scope(paths)
assert all(p not in base for p in paths)
protected=[{'path':p,'gitObject':obj,'sameIndexObject':index.get(p)==obj} for p,obj in base.items()]
assert all(row['sameIndexObject'] for row in protected)
for p in paths:
    f=ROOT/p;assert f.is_file() and not f.is_symlink()
    obj=subprocess.check_output(['git','hash-object','--path='+p,'--stdin'],cwd=ROOT,input=f.read_bytes()).decode().strip()
    assert index.get(p,'').endswith(' '+obj), 'Not staged exactly: '+p
full=subprocess.run(['git','diff','--check',BASE],cwd=ROOT,capture_output=True);assert full.returncode in (0,2)
(evidence/'diff-check-full.log').write_bytes(full.stdout+full.stderr)
warnings=[s for s in full.stdout.decode('utf-8').splitlines() if re.match(r'^.+:\d+: ',s)]
if full.returncode: assert warnings and all(s.startswith(DOCS+'inputs/') for s in warnings)
assert subprocess.run(['git','diff','--check',BASE,'--','.',':(exclude)'+DOCS+'inputs'],cwd=ROOT).returncode==0
for f in (ROOT/DOCS).glob('*.py'): ast.parse(f.read_text('utf-8'))
for f in (ROOT/DOCS).rglob('*.json'): json.loads(f.read_text('utf-8-sig'))
inputs=[]
for f in sorted((ROOT/DOCS/'inputs').rglob('*')):
    if f.is_file():
        p=f.relative_to(ROOT).as_posix();data=f.read_bytes();assert git('show',':'+p)==data
        inputs.append({'path':p,'bytes':len(data),'rawSHA256':hashlib.sha256(data).hexdigest(),'exactIndexBytes':True})
assert len(inputs)==10
p=subprocess.run([sys.executable,'-B','-X','utf8',str(ROOT/DOCS/'inputs/verify-package.py')],cwd=ROOT/DOCS/'inputs',capture_output=True);assert p.returncode==0
result={'status':'PASS','baseSHA':BASE,'allExistingObjectsProtected':len(protected),'protectedObjects':protected,'newPaths':paths,'noExistingEdits':True,'inputFiles':inputs,'inputVerify':p.stdout.decode('utf-8'),'diffCheckExit':full.returncode,'onlyOriginalInputWhitespaceWarnings':warnings,'newBodyWhitespaceExit':0}
(evidence/'scope-protected-objects.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k not in ['protectedObjects','newPaths','inputFiles','onlyOriginalInputWhitespaceWarnings']},ensure_ascii=False))
