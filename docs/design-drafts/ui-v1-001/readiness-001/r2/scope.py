"""R2 exact scope, independent of the historical R1 text-only scope script."""
import hashlib,json,re,subprocess
from pathlib import Path
from urllib.parse import urlsplit,unquote
BASE='8bd50890be44d8ab0921e3bc4b1fabab1a8e1203'
P='docs/design-drafts/ui-v1-001/';N=P+'readiness-001/';R2=N+'r2/'
ALLOWED={P+'prototype/ui.js',N+'presentation.js',N+'README.md',N+'completion.md'}
SEAM="if(typeof Readiness!=='undefined')Readiness.assetPass($('.actor.enemy'));"
def git(*args):return subprocess.check_output(['git',*args])
def sha(data):return hashlib.sha256(data).hexdigest()
def changed():return sorted(set(filter(None,(git('diff','--name-only','-z',BASE)+git('ls-files','--others','--exclude-standard','-z')).decode().split('\0'))))
def check_scope():
 rows=[]
 def check(name,ok,detail=None):rows.append({'name':name,'pass':bool(ok),'detail':detail})
 paths=changed();check('exact-whitelist',all(p in ALLOWED or p.startswith(R2) for p in paths),paths)
 check('branch',git('branch','--show-current').decode().strip()=='feature/design-ui-readiness-001')
 old=git('show',BASE+':'+P+'prototype/ui.js');new=Path(P+'prototype/ui.js').read_bytes();seam=SEAM.encode()
 check('only-resource-delegation',new.count(seam)==1 and new.replace(seam,b'')==old)
 anchor="$('.actor.enemy').outerHTML=actorVisual(enemyFile(context.enemy,stage),'当前敌人 · '+STAGES[stage],'enemy');".encode()
 check('delegate-only-after-new-enemy-node',anchor+seam in new)
 check('presentation-module-reused-without-edit',Path(N+'presentation.js').read_bytes()==git('show',BASE+':'+N+'presentation.js'))
 for name in ['README.md','completion.md']:check('append-only:'+name,Path(N+name).read_bytes().startswith(git('show',BASE+':'+N+name)))
 check('R1-and-all-other-tracked-history-unchanged',all(p in ALLOWED or p.startswith(R2) for p in git('diff','--name-only','-z',BASE).decode().split('\0') if p))
 errors=[];links=[]
 for name in paths:
  p=Path(name)
  if not p.is_file():continue
  if p.suffix in ['.md','.json','.py','.js','.cjs','.html','.txt']:
   try:text=p.read_text('utf-8')
   except UnicodeError:errors.append(name);continue
   if p.suffix=='.md':
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
     u=urlsplit(target.strip('<>'))
     if u.scheme or not u.path:continue
     dest=(p.parent/unquote(u.path)).resolve();ok=dest.is_file()
     if ok and u.fragment:
      headings=re.findall(r'^#+\s+(.+)$',dest.read_text('utf-8'),re.M)
      ok=unquote(u.fragment) in [re.sub(r'[^\w\-\s]','',h.lower()).replace(' ','-') for h in headings]
     links.append({'source':name,'target':target,'pass':ok})
 check('utf8',not errors,errors);check('relative-links-and-anchors',all(x['pass'] for x in links),links)
 check('no-art-or-old-fixtures-added',all(not Path(p).suffix in ['.svg','.png','.jpg','.webp'] or p.startswith(R2+'before/') or p.startswith(R2+'after/') for p in paths))
 return {'kind':'R2_SCOPE_AND_EXACT_SEMANTICS','base':BASE,'checks':rows,'pass':all(x['pass'] for x in rows)}
if __name__=='__main__':
 result=check_scope();print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(0 if result['pass'] else 1)
