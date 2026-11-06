from pathlib import Path
import subprocess,json,hashlib
root=Path(__file__).parent;repo=Path('E:/projects/elevator-survival-worktrees/world-mission-map-ux-001');copy=root/'baseline-snapshot'
names=subprocess.check_output(['git','diff','--name-only','95cab5ad79e31d63aae93d97ab901c716cf75f89'],cwd=repo).decode().splitlines()
for n in names:
 if n.startswith('src/'):
  p=copy/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((repo/n).read_bytes())
cases=[('cross-region-leak','src/ui/infected-world/map/projection.ts','nodes:place===null?[]:map.nodes.filter(n=>n.place===place)','nodes:map.nodes','src/ui/infected-world/map/projection.test.ts','layers filter'),('carried-is-delivered','src/ui/infected-world/guidance/model.ts',"carried:'已携带，待交付'","carried:'已交付'",'src/ui/infected-world/mission-map-ux.test.tsx','formal sample-first')]
result=[]
for name,n,a,b,test,title in cases:
 p=copy/n;original=p.read_bytes();text=original.decode();assert a in text
 try:
  p.write_text(text.replace(a,b),encoding='utf-8')
  r=subprocess.run(['npm.cmd','run','test:run','--',test,'-t',title,'--maxWorkers=2'],cwd=copy,capture_output=True)
  log=r.stdout+r.stderr;(root/('negative-'+name+'.log')).write_bytes(log)
  assert r.returncode==1 and b'AssertionError' in log and b'FAIL' in log,log.decode(errors='replace')
 finally:p.write_bytes(original)
 assert p.read_bytes()==original
 result.append({'case':name,'exit':r.returncode,'businessAssertionFailure':True,'restored':True,'restoredSha256':hashlib.sha256(original).hexdigest(),'location':'isolated external final-source copy; actual worktree untouched'})
(root/'negative-results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result,indent=2))
