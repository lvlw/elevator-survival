"""R1 exact scope; historical inputs, assets and receipts are not update targets."""
import json, re, subprocess
from pathlib import Path
from urllib.parse import urlsplit,unquote
BASE='8ffe22616c68d806d7bda48d55e0adf6383765c4'
P='docs/design-drafts/ui-v1-001/';N=P+'readiness-001/'
allowed={P+'prototype/ui.js'}|{N+x for x in ['presentation.js','theme-lab.js','tools/theme_check.py','tools/delivery.py','tools/presentation-check.cjs','copy-table.md','theme/GUIDE.md','contracts/C-staged-ui.md','README.md','completion.md']}
def git(*args):return subprocess.check_output(['git',*args])
changed=sorted(set(filter(None,(git('diff','--name-only','-z',BASE)+git('ls-files','--others','--exclude-standard','-z')).decode().split('\0'))))
checks=[]
def check(name,ok,detail=None):checks.append({'name':name,'pass':bool(ok),'detail':detail})
check('branch',git('branch','--show-current').decode().strip()=='feature/design-ui-readiness-001')
check('old-R2-reference',git('rev-parse','feature/design-ui-v1-001').decode().strip()=='956da8065030ccea15256e49bd927a4e6a71942f')
check('exact-whitelist',all(p in allowed or p.startswith(N+'r1/') for p in changed),changed)
for name in ['README.md','completion.md']:
 check('append-only:'+name,Path(N+name).read_bytes().startswith(git('show',BASE+':'+N+name)))
check('historical-objects-protected',all(p in allowed or p.startswith(N+'r1/') for p in git('diff','--name-only','-z',BASE).decode().split('\0') if p))
utf8=[];links=[]
for f in changed:
 p=Path(f)
 if not p.is_file():continue
 if p.suffix in ['.py','.js','.cjs','.json','.md','.html','.svg','.txt']:
  try:text=p.read_text('utf-8')
  except UnicodeError:utf8.append(f);continue
  if p.suffix=='.md':
   for link in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
    u=urlsplit(link.strip('<>'))
    if u.scheme or not u.path:continue
    dest=(p.parent/unquote(u.path)).resolve();ok=dest.is_file()
    if ok and u.fragment:
     headings=re.findall(r'^#+\s+(.+)$',dest.read_text('utf-8'),re.M)
     anchors=[re.sub(r'[^\w\-\s]','',h.lower()).replace(' ','-') for h in headings]
     ok=unquote(u.fragment) in anchors or ('id="'+u.fragment+'"') in dest.read_text('utf-8')
    links.append({'source':f,'target':link,'pass':ok})
check('utf8',not utf8,utf8);check('relative-links-and-anchors',all(x['pass'] for x in links),links)
check('no-new-art',not any(Path(f).suffix in ['.png','.jpg','.webp'] and not f.startswith(N+'r1/before/') and not f.startswith(N+'r1/after/') for f in changed))
print(json.dumps({'kind':'R1_SCOPE_AND_HISTORY','checks':checks,'pass':all(c['pass'] for c in checks)},ensure_ascii=False,indent=2))
raise SystemExit(0 if all(c['pass'] for c in checks) else 1)
