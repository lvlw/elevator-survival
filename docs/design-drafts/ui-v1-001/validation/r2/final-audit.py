"""Design-only integrity/command receipts. Does not run production tests or historical models."""
from pathlib import Path
import subprocess,sys,json,hashlib,re,urllib.request,urllib.error

ROOT=Path(__file__).resolve().parents[2];REPO=ROOT.parents[2];OUT=ROOT/'validation/r2'
BASE='0e0c5cf50bce038f1e915529fe83c3278c30ab95'
PREFIX='docs/design-drafts/ui-v1-001/'
checks=[];receipts=[]
def check(name,ok,detail=None):checks.append({'name':name,'pass':bool(ok),'detail':detail})
def run(name,args,expected=0,cwd=REPO):
    r=subprocess.run(args,cwd=cwd,capture_output=True,text=True,encoding='utf-8',errors='replace')
    receipt={'name':name,'command':args,'exitCode':r.returncode,'expectedExitCode':expected,'stdout':r.stdout,'stderr':r.stderr}
    receipts.append(receipt);check(name,r.returncode==expected)
    return r
def git(*args):return subprocess.check_output(['git',*args],cwd=REPO)
run('input-integrity',[sys.executable,'-B','-X','utf8',str(ROOT/'inputs/verify-task-package.py')])
run('input-budget-arithmetic',[sys.executable,'-B','-X','utf8',str(ROOT/'inputs/verify-dimensions.py')])
run('r2-input-integrity',[sys.executable,'-B','-X','utf8',str(ROOT/'reviews/r2-inputs/verify-task-package.py')])
for name,mutation,code in [('source-regression','none',0),('negative-choice','reset-choice',1),('negative-split','allow-sample-split',1)]:
    run(name,['node',str(OUT/'semantic-check.cjs'),str(ROOT),str(OUT/(name+'.json')),mutation],code)
for p in sorted((ROOT/'prototype').glob('*.js')):run('syntax '+p.name,['node','--check',str(p)])
run('existing-design-audit',[sys.executable,'-B','-X','utf8',str(ROOT/'validation/verify-delivery.py')])
run('raster-readback',[sys.executable,'-B','-X','utf8',str(OUT/'geometry-check.py')])
geometry=json.loads((OUT/'geometry-readback.json').read_text('utf-8'))
check('seven representative raster comparisons',len(geometry['after'])==7 and all(x['status']=='RASTER_READBACK_COMPLETED' for x in geometry['after']))
check('all measured anchors within one CSS pixel',all(p['status']=='WITHIN_1_CSS_PX' for x in geometry['after'] for p in x.get('points',[])))
check('original 97px displacement reproduced',geometry['beforeGrid']['dx']==-97 and geometry['beforeGrid']['dy']==0)
changed=git('diff','--name-only','-z',BASE).decode('utf-8').split('\0')
untracked=git('ls-files','--others','--exclude-standard','-z').decode('utf-8').split('\0')
check('design scope only',all(not p or p.startswith(PREFIX) for p in changed+untracked))
protected_tree=(OUT/'protected-git-objects.txt').read_text('utf-8').splitlines()
actual_tree=[line for line in git('ls-tree','-r',BASE).decode('utf-8').splitlines() if not line.split('\t',1)[1].startswith(PREFIX)]
check('baseline protected Git object inventory',actual_tree==protected_tree,{'objects':len(actual_tree)})
visual=json.loads((OUT/'visual-review.json').read_text('utf-8'))
check('177 actually inspected current PNG hashes',len(visual['files'])==177 and all(hashlib.sha256((ROOT/f['path']).read_bytes()).hexdigest()==f['sha256'] for f in visual['files']))
protected=['inputs/','validation/r1/','validation/history-v1.0/','editable/assets/']
protected_files=[]
for rel in git('ls-tree','-r','--name-only',BASE,'--',PREFIX).decode('utf-8').splitlines():
    local=rel[len(PREFIX):]
    if any(local.startswith(p) for p in protected) or local=='reviews/OWNER-modal-size-followup.md':
        raw=(REPO/rel).read_bytes(); original=git('show',BASE+':'+rel)
        strict=local.startswith('inputs/') or Path(local).suffix.lower() not in ('.md','.json','.txt','.py','.js','.cjs','.html','.css','.svg')
        blob=git('hash-object','--path='+rel,rel).decode().strip()
        original_blob=git('rev-parse',BASE+':'+rel).decode().strip()
        ok=raw==original if strict else blob==original_blob
        protected_files.append({'path':rel,'same':ok,'policy':'EXACT_BYTES' if strict else 'GIT_CANONICAL_BLOB','rawSha256':hashlib.sha256(raw).hexdigest(),'originalRawSha256':hashlib.sha256(original).hexdigest(),'blob':blob,'originalBlob':original_blob})
check('original inputs historical QA and raster bytes preserved',all(x['same'] for x in protected_files),[x for x in protected_files if not x['same']])
for p in (OUT/'history-r1').rglob('*'):
    if p.is_file():
        rel=p.relative_to(OUT/'history-r1').as_posix()
        check('history snapshot '+rel,p.read_bytes()==git('show',BASE+':'+PREFIX+rel))
links=[]
for p in [*ROOT.glob('*.md'),OUT/'review-notes.md']:
    if not p.exists():continue
    for dest in re.findall(r'\]\(([^)]+)\)',p.read_text('utf-8')):
        dest=dest.strip('<>');path,sep,anchor=dest.partition('#')
        if re.match(r'^(https?:|[A-Z]:|data:)',path):continue
        target=(p.parent/path.split('?')[0]).resolve() if path else p
        ok=target.exists()
        if ok and sep and target.suffix=='.md':
            headings=re.findall(r'^#+\s+(.+)$',target.read_text('utf-8'),re.M)
            ids=[re.sub(r'[^\w\-\s\u4e00-\u9fff]','',h.lower()).replace(' ','-') for h in headings]
            ok=anchor in ids
        links.append({'from':str(p.relative_to(ROOT)),'target':dest,'pass':ok})
check('current document links and anchors',all(x['pass'] for x in links),[x for x in links if not x['pass']])
for p in ROOT.rglob('*'):
    if p.is_file() and p.suffix in ['.md','.json','.html','.css','.js','.py','.cjs','.svg','.txt']:
        try:p.read_text('utf-8-sig')
        except UnicodeDecodeError:check('UTF8 '+str(p),False)
run('ordinary-diff-check',['git','diff','--check',BASE])
# Static review-server metadata complements, but does not replace, actual Edge captures.
try:
    with urllib.request.urlopen('http://127.0.0.1:8767/offline-index.html') as response:
        csp=response.headers.get('Content-Security-Policy','');status=response.status
    check('loopback read-only response/CSP',status==200 and "connect-src 'self'" in csp,csp)
    try:urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8767/__design_export/test',data=b'x',method='POST'));post=200
    except urllib.error.HTTPError as e:post=e.code
    check('offline server refuses writes',post==405,post)
except OSError as e:check('offline server response',False,str(e))
result={'kind':'R2_DESIGN_CHECKS_NOT_PRODUCTION','baseline':BASE,'checks':checks,'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'receipts':receipts,'links':links,'protectedFiles':protected_files,'productionTests':'NOT RUN','typecheck':'NOT RUN','build':'NOT RUN','newProductionTests':0,'limits':['Counts do not certify final art, Owner acceptance, or production correctness.','Real zoom is user-operated and separately recorded. Physical WAN disconnection and file:// were not verified.']}
(OUT/'final-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n','utf-8')
print(json.dumps({'passed':result['passed'],'failed':result['failed'],'failedChecks':[x for x in checks if not x['pass']]},ensure_ascii=False))
sys.exit(1 if result['failed'] else 0)
