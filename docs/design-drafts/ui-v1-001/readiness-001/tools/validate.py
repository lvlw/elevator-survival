"""Scope, original bytes, UTF-8, new links, resource decode and document-only checks."""
import argparse, hashlib, json, re, subprocess, sys
from pathlib import Path
from urllib.parse import unquote, urlsplit
import theme_check
N=Path(__file__).resolve().parents[1];D=N.parent;R=D.parents[2]
BASE='956da8065030ccea15256e49bd927a4e6a71942f';P='docs/design-drafts/ui-v1-001/'
ALLOWED={P+x for x in ['prototype/index.html','prototype/ui.js','prototype/ui.css','00-owner-review.md','06-implementation-handoff-draft.md']}
def git(*args):return subprocess.check_output(['git',*args],cwd=R)
def run():
    checks=[]
    def check(name,ok,detail=None):checks.append({'name':name,'pass':bool(ok),'detail':detail})
    tracked=git('diff','--name-only','-z',BASE).decode().strip('\0').split('\0');untracked=git('ls-files','--others','--exclude-standard','-z').decode().strip('\0').split('\0');changed=sorted(set(p for p in tracked+untracked if p))
    check('scope',all(p in ALLOWED or p.startswith(P+'readiness-001/') for p in changed),changed)
    check('old-branch',git('rev-parse','feature/design-ui-v1-001').decode().strip()==BASE)
    check('new-branch',git('branch','--show-current').decode().strip()=='feature/design-ui-readiness-001')
    for f in ['00-owner-review.md','06-implementation-handoff-draft.md']:check('append-only:'+f,(D/f).read_bytes().startswith(git('show',BASE+':'+P+f)))
    inputs=N/'inputs';lines=(inputs/'SHA256SUMS.txt').read_text('utf-8').splitlines();hashes=[]
    for line in lines:
        if not line.strip():continue
        h,name=line.split(maxsplit=1);name=name.strip().lstrip('*');ok=hashlib.sha256((inputs/name).read_bytes()).hexdigest()==h;hashes.append({'path':name,'pass':ok})
    check('input-original-digests',all(x['pass'] for x in hashes),hashes)
    new=[p for p in changed if p.startswith(P+'readiness-001/') and (R/p).is_file()];sizes=[(R/p).stat().st_size for p in new]
    check('new-tracked-size',sum(sizes)<=64*1024**2 and max(sizes,default=0)<20*1024**2,{'bytes':sum(sizes),'max':max(sizes,default=0)})
    errors=[];links=[]
    for f in new:
        p=R/f
        if p.suffix in ['.md','.json','.js','.cjs','.py','.html','.css','.txt','.svg']:
            try:text=p.read_text('utf-8')
            except UnicodeError:errors.append(f);continue
            if p.suffix=='.md' and '/inputs/' not in f:
                for link in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
                    link=link.strip('<>');u=urlsplit(link)
                    if u.scheme or not u.path:continue
                    dest=(p.parent/unquote(u.path)).resolve();links.append({'source':f,'target':link,'pass':dest.exists()})
    check('utf8',not errors,errors);check('new-relative-links',all(x['pass'] for x in links),links)
    cat=json.loads((N/'theme/catalog.json').read_text('utf-8'));resources=[]
    from PIL import Image
    for x in cat['resources']:
        p=D/x['path'];im=Image.open(p);im.load();resources.append({'key':x['key'],'pass':hashlib.sha256(p.read_bytes()).hexdigest()==x['sha256'] and list(im.size)==x['pixels'] and ('A' in im.getbands())==x['alpha']})
    check('all-64-baseline-decodes',len(resources)==64 and all(x['pass'] for x in resources))
    check('three-test-groups',all(theme_check.validate(json.loads((N/f'theme/{g}-test.json').read_text('utf-8')))['status']=='VALID_TEST_ONLY' for g in ['bandage','porter','frame']))
    check('old-source-and-geometry-unmodified',not any(p in tracked for p in [P+'prototype/'+x for x in ['flow-context.js','screens.js','registered-art.js','nine-slice.js','export.js','ui.css']]))
    result={'kind':'READINESS_SCOPE_BYTES_LINKS_DECODE','checks':checks,'pass':all(x['pass'] for x in checks)};return result
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path);a=p.parse_args();r=run()
    if a.output:a.output.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'pass':r['pass'],'checks':[{'name':c['name'],'pass':c['pass']} for c in r['checks']]},ensure_ascii=False));sys.exit(0 if r['pass'] else 1)
