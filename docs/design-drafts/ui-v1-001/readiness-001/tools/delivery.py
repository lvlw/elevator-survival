"""Explicit delta and read-only site builder. Reads Git blobs, never copies a checkout wholesale."""
import argparse, copy, hashlib, json, subprocess, sys, zipfile, re, tempfile
from urllib.parse import urlsplit,unquote
from pathlib import Path
import theme_check
N=Path(__file__).resolve().parents[1];D=N.parent;R=D.parents[2]
PREFIX='docs/design-drafts/ui-v1-001/';BASE='956da8065030ccea15256e49bd927a4e6a71942f'
EXISTING=['prototype/index.html','prototype/ui.js','prototype/ui.css','00-owner-review.md','06-implementation-handoff-draft.md']
def git(*args):
    p=subprocess.run(['git',*args],cwd=R,capture_output=True)
    if p.returncode:raise RuntimeError({'args':args,'exit':p.returncode,'stderr':p.stderr.decode('utf-8','replace')})
    return p.stdout
def sha(b):return hashlib.sha256(b).hexdigest()
def write(p,b):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
def save(p,obj):write(p,(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode())
def valid_name(name):
    theme_check.path_check(Path.cwd(),name)
    if any(x in name.split('/') for x in ['.git','node_modules','.env','profile']):raise theme_check.Reject('FORBIDDEN_PAYLOAD')
def closure(entries,required,self_contained):
    names=[x['path'] for x in entries]
    for n in names:valid_name(n)
    if len(set(names))!=len(names):raise theme_check.Reject('DUPLICATE_PATH')
    if self_contained and not set(required)<=set(names):raise theme_check.Reject('MISSING_DEPENDENCY')
    return True
def site_references(root):
    found=[]
    for p in root.rglob('*'):
        if not p.is_file() or p.suffix not in ['.html','.svg','.css']:continue
        text=p.read_text('utf-8');refs=re.findall(r'(?:src|href)=[\"\x27]([^\"\x27]+)',text)
        if p.suffix=='.css':refs+=re.findall(r'url\([\"\x27]?([^\"\x27)]+)',text)
        for ref in refs:
            if ref.startswith(('data:','#')):continue
            u=urlsplit(ref);theme_check.need(not u.scheme and not u.netloc,'SITE_EXTERNAL')
            target=(p.parent/unquote(u.path)).resolve();theme_check.need(target.is_relative_to(root.resolve()),'SITE_ESCAPE')
            theme_check.need(target.is_file(),'SITE_MISSING_REFERENCE:'+str(target));found.append({'source':p.relative_to(root).as_posix(),'target':target.relative_to(root).as_posix()})
    return found
def get_files(sha_):return git('ls-tree','-r','--name-only','-z',sha_).decode().strip('\0').split('\0')
def blob(commit,path):return git('show',commit+':'+path)
def changed(target):
    parts=git('diff','--no-renames','--name-status','-z',BASE,target).decode().strip('\0').split('\0')
    return [parts[i]+'\t'+parts[i+1] for i in range(0,len(parts),2)] if parts!=[''] else []
def build(out,target,art):
    out=out.resolve();theme_check.need(not out.is_relative_to(R.resolve()),'OUTPUT_INSIDE_REPOSITORY')
    info=git('show','-s','--format=%H%n%P%n%T',target).decode().strip().splitlines();target=info[0]
    tree=get_files(target);diff=changed(target)
    for line in diff:
        parts=line.split('\t');theme_check.need(len(parts)==2 and parts[0] in ['A','M','D'],'UNSUPPORTED_CHANGE')
        p=parts[1];theme_check.need(p.startswith(PREFIX+'readiness-001/') or p in [PREFIX+x for x in EXISTING],'SCOPE')
    main=out/'MAINLINE-REVIEW';assets=out/'CANDIDATE-ASSETS';site=out/'REVIEW-SITE'
    for dest in [main,assets,site]:dest.mkdir(parents=True,exist_ok=True)
    catalogue=json.loads(blob(target,PREFIX+'readiness-001/theme/catalog.json'))
    runtime=[PREFIX+'prototype/'+f for f in ['index.html','ui.js','ui.css','screens.js','flow-context.js','registered-art.js','nine-slice.js']]
    runtime += [PREFIX+x['path'] for x in catalogue['resources']]
    runtime += [PREFIX+x['path'] for x in catalogue['vectors'] if x['path'].endswith('.svg')]
    runtime += [p for p in tree if p.startswith(PREFIX+'readiness-001/') and (p.endswith(('.js','.css')) or '/theme/' in p or '/review/' in p or '/validation/browser/' in p or p.endswith('.md') and '/inputs/' not in p or '/tools/' in p)]
    runtime=sorted(set(runtime));reuse=[]
    for p in runtime:
        data=blob(target,p);rel=p[len(PREFIX):];valid_name(rel);write(site/rel,data)
        if p in get_cached_base():reuse.append({'path':p,'sha256':sha(data),'bytes':len(data),'sourceCommit':BASE if blob(BASE,p)==data else target})
    site_entries=[{'path':p[len(PREFIX):],'sha256':sha(blob(target,p)),'bytes':len(blob(target,p))} for p in runtime]
    closure(site_entries,[p[len(PREFIX):] for p in runtime],True)
    for p in tree:
        if not p.startswith(PREFIX+'readiness-001/'):continue
        rel=p[len(PREFIX):];data=blob(target,p)
        if '/theme/test-assets/' in p:write(assets/rel,data)
        else:write(main/rel,data)
    for p in EXISTING:
        full=PREFIX+p
        if full in tree:write(main/full,blob(target,full))
    # Candidate origins remain outside Git; expected hashes come from the committed method receipt.
    audit=json.loads(blob(target,PREFIX+'readiness-001/validation/art-methods.json'))
    for field in ['background','playerCandidate']:
        entry=audit[field];p=art/entry['file'];data=p.read_bytes();theme_check.need(sha(data)==entry['sha256'],'EXTERNAL_ORIGINAL_HASH');write(assets/'method-proofs'/p.name,data)
    write(assets/'METHOD-STATUS.md',blob(target,PREFIX+'readiness-001/art-methods.md'))
    write(main/'changes.patch',git('diff',BASE,target,'--',PREFIX,' :!*.jpg'.strip(),':!*.png',':!*.svg'))
    receipt=out/'receipts.json'
    if receipt.exists():write(main/'receipts.json',receipt.read_bytes())
    identity={'task':'WORLD-UI-VISUAL-READINESS-001','sourceCommit':target,'baseSHA':BASE,'parent':info[1],'tree':info[2],'branch':'feature/design-ui-readiness-001','changes':diff,'baselineReuse':reuse,'mainlineSelfContained':False,'mainlineDependency':'R2 exact base plus CANDIDATE-ASSETS; full local REVIEW-SITE supplied separately','reviewSiteSelfContained':True,'siteRequired':[p[len(PREFIX):] for p in runtime],'status':'DELIVERED_WITH_FINDINGS / INCOMPLETE_ART','renderIdentity':'Native IAB screenshots; system font; JPEG full CSS viewport, no shell export. See browser observations for CSS dimensions/DPR; extension overlay disclosed.','productionTests':'NOT RUN; added 0'}
    report=blob(target,PREFIX+'readiness-001/completion.md').decode()
    report+='\n\n最终完整SHA：`'+target+'`\n\n父SHA：`'+info[1]+'`\n\nTree：`'+info[2]+'`\n\n最终Git与推送回执见本包 receipts.json。\n'
    write(main/'FINAL-REPORT.md',report.encode());save(main/'DELIVERY-INDEX.json',identity)
    save(site/'SITE-MANIFEST.json',{'sourceCommit':target,'baseSHA':BASE,'tree':info[2],'selfContained':True,'required':identity['siteRequired'],'files':site_entries})
    save(main/'SITE-REFERENCE-AUDIT.json',site_references(site))
    write(site/'START-REVIEW.txt',b'python readiness-001/tools/serve.py --root . --port 8768\nhttp://127.0.0.1:8768/readiness-001/review/index.html\nGET only. Local HTTP is not file/offline proof.\n')
    manifests={}
    for kind,folder in [('MAINLINE-REVIEW',main),('CANDIDATE-ASSETS',assets)]:
        rows=[{'path':p.relative_to(folder).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted(folder.rglob('*')) if p.is_file() and p.name not in ['ARTIFACT-MANIFEST.json','SHA256SUMS.txt']]
        closure(rows,[],False);core={'sourceCommit':target,'baseSHA':BASE,'tree':info[2],'kind':kind,'files':rows};artifactId=sha(json.dumps(core,sort_keys=True,separators=(',',':')).encode());core['artifactId']=artifactId
        save(folder/'ARTIFACT-MANIFEST.json',core);write(folder/'SHA256SUMS.txt',''.join(x['sha256']+'  '+x['path']+'\n' for x in rows).encode())
        zp=out/(kind+'.zip')
        with zipfile.ZipFile(zp,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
            for p in sorted(folder.rglob('*')):
                if p.is_file():z.write(p,p.relative_to(folder).as_posix())
        limit=(60 if kind=='MAINLINE-REVIEW' else 200)*1024**2;theme_check.need(zp.stat().st_size<=limit,'PACKAGE_SIZE')
        manifests[kind]={'path':str(zp),'bytes':zp.stat().st_size,'sha256':sha(zp.read_bytes()),'artifactId':artifactId}
    direct=out/'DIRECT-REVIEW';direct.mkdir(exist_ok=True)
    chosen=['01-player-inventory','03-bandage-test','04-porter-baseline','05-porter-test','06-frame-test','07-player-depart','08-player-sampling']
    lines=['# 直接审阅备用图','',f'准确SHA：{target}','原生IAB完整视口JPEG；像素和CSS视口分别见observations，未用文件名猜尺寸。直接上传图片和本MD，无需ZIP。','']
    for i,name in enumerate(chosen,1):
        p=main/f'readiness-001/validation/browser/{name}.jpg';theme_check.need(p.exists(),'DIRECT_IMAGE_MISSING');data=p.read_bytes();dest=direct/f'{i:02d}-{name}.jpg';write(dest,data)
        from PIL import Image
        im=Image.open(p);lines.append(f'- {dest.name}：{len(data)} bytes；SHA256 {sha(data)}；实际像素 {im.width}×{im.height}；原路径 readiness-001/validation/browser/{p.name}。')
    write(direct/'DIRECT-REVIEW-INDEX.md',('\n'.join(lines)+'\n').encode());save(out/'PACKAGE-INDEX.json',manifests)
    print(json.dumps(manifests,ensure_ascii=False));return manifests
_base=None
def get_cached_base():
    global _base
    if _base is None:_base=set(get_files(BASE))
    return _base
def verify(out):
    results=[]
    for name in ['MAINLINE-REVIEW','CANDIDATE-ASSETS']:
        p=out/(name+'.zip')
        with zipfile.ZipFile(p) as z:
            theme_check.need(z.testzip() is None,'ZIP_CRC');m=json.loads(z.read('ARTIFACT-MANIFEST.json'));seen=[]
            for e in m['files']:
                valid_name(e['path']);data=z.read(e['path']);theme_check.need(len(data)==e['bytes'] and sha(data)==e['sha256'],'ZIP_HASH');seen.append(e['path'])
            theme_check.need(set(z.namelist())==set(seen+['ARTIFACT-MANIFEST.json','SHA256SUMS.txt']),'ZIP_EXTRA')
            claimed=m.pop('artifactId');theme_check.need(sha(json.dumps(m,sort_keys=True,separators=(',',':')).encode())==claimed,'ARTIFACT_ID')
            results.append({'package':name,'files':len(seen),'pass':True})
    m=json.loads((out/'REVIEW-SITE/SITE-MANIFEST.json').read_text('utf-8'));closure(m['files'],m['required'],m['selfContained'])
    for e in m['files']:theme_check.need(sha((out/'REVIEW-SITE'/e['path']).read_bytes())==e['sha256'],'SITE_HASH')
    site_references(out/'REVIEW-SITE')
    print(json.dumps({'packages':results,'siteFiles':len(m['files']),'pass':True}));return True
def tests():
    rr=theme_check.tests();results=[{'case':'theme-suite','pass':rr['pass']}]
    fixture=Path(tempfile.mkdtemp(prefix='ui-readiness-svg-'))
    example=json.loads((N/'theme/bandage-test.json').read_text('utf-8'));original=(D/example['resources'][0]['path']).read_text('utf-8')
    variants=[('svg-script',original.replace('<title>','<script>void 0</script><title>'),'SVG_TAG'),('svg-event',original.replace('<image ','<image onload="void 0" '),'SVG_ATTRIBUTE'),('svg-external',re.sub(r'href="[^"]+"','href="https://example.invalid/a.png"',original),'SVG_EXTERNAL'),('svg-css',original.replace('<image ','<image style="opacity:0" '),'SVG_ATTRIBUTE'),('svg-font',original.replace('<title>','<font/><title>'),'SVG_TAG'),('svg-content-size',original.replace('<image width="512"','<image width="1"'),'SVG_CONTENT_GEOMETRY')]
    for name,text,expected in variants:
        sample=copy.deepcopy(example);p=fixture/(name+'.svg');p.write_text(text,encoding='utf-8');sample['resources'][0].update(path=p.name,sha256=sha(p.read_bytes()))
        try:theme_check.validate(sample,root_directory=fixture);passed=False;reason='ACCEPTED'
        except theme_check.Reject as e:reason=str(e);passed=reason==expected
        results.append({'case':name,'pass':passed,'reason':reason})
    bad=copy.deepcopy(json.loads((N/'theme/porter-test.json').read_text('utf-8')));bad['resources'].pop()
    try:theme_check.validate(bad);detected=False
    except theme_check.Reject as e:detected=str(e)=='INCOMPLETE_GROUP'
    # Real mutation: remove the complete-group check in a temporary in-memory module.
    src=Path(theme_check.__file__).read_text('utf-8').replace("need(set(keys)==set(cat['groups'][group]),'INCOMPLETE_GROUP')",'None')
    scope={'__file__':theme_check.__file__,'__name__':'mutant'};exec(compile(src,'theme_group_mutant','exec'),scope)
    mutant=scope['validate'](bad);results.append({'case':'semantic-control-accept-partial-group','pass':detected and mutant['members']==4,'mutant':'accepted partial 4/5; expected detector fails'})
    for name in ['', '../x','/abs','C:/abs','https://x/y','a//b','a/./b']:
        try:closure([{'path':name}],[],False);ok=False
        except theme_check.Reject:ok=True
        results.append({'case':'unsafe-path:'+name,'pass':ok})
    try:closure([{'path':'a'},{'path':'a'}],[],False);ok=False
    except theme_check.Reject:ok=True
    results.append({'case':'duplicate','pass':ok})
    try:closure([{'path':'index.html'}],['index.html','asset.png'],True);ok=False
    except theme_check.Reject as e:ok=str(e)=='MISSING_DEPENDENCY'
    # Mutation weakens the self-contained declaration; the independent required-set oracle detects it.
    def mutant_closure(entries,required,self_contained):return closure(entries,required,False)
    accepted=mutant_closure([{'path':'index.html'}],['index.html','asset.png'],True)
    results.append({'case':'semantic-control-missing-dependency-labelled-self-contained','pass':ok and accepted,'mutant':'accepted with weakened self-contained check; required-set mismatch detected'})
    result={'kind':'DESIGN_PACKAGING_AND_RESOURCE_TESTS','results':results,'pass':all(x['pass'] for x in results)};print(json.dumps(result,indent=2));return result['pass']
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('command',choices=['build','verify','test']);p.add_argument('--out',type=Path);p.add_argument('--target');p.add_argument('--art',type=Path);a=p.parse_args()
    if a.command=='build':build(a.out,a.target,a.art)
    elif a.command=='verify':verify(a.out)
    else:sys.exit(0 if tests() else 1)
