"""Small R2 delta from exact Git objects. No old candidate assets or fixture copies."""
import argparse,json,re,sys,zipfile
from pathlib import Path
from scope import BASE,P,N,R2,ALLOWED,git,sha,changed
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import delivery
def encode(obj):return (json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode()
def report_links(text):return re.sub(r'(\[[^\]]*\]\()((?:before|after)/[^)]+|baseline-reuse.json)(\))',lambda m:m[1]+R2+m[2]+m[3],text)
def assert_links(report,names):
 for link in re.findall(r'\[[^\]]*\]\(([^)]+)\)',report):assert link in names,link
def plan():
 paths=changed();assert all(p in ALLOWED or p.startswith(R2) for p in paths)
 assert not any(p.startswith(N+'r1/') or p.startswith(P+'editable/') for p in paths)
 report=report_links(Path(R2+'report.md').read_text('utf-8'));assert_links(report,paths)
 return {'kind':'R2_PACKAGE_PLAN','sourceFiles':len(paths),'rootReportLinksExist':True,'oldAssetsAndFixturesExcluded':True,'pass':True}
def build(out,target,receipts):
 out=out.resolve();assert not out.is_relative_to(delivery.R.resolve());assert not git('status','--porcelain').strip()
 commit,parent,tree=git('show','-s','--format=%H%n%P%n%T',target).decode().strip().splitlines();assert commit==git('rev-parse','HEAD').decode().strip();git('merge-base','--is-ancestor',BASE,commit)
 paths=git('diff','--name-only','-z',BASE,commit).decode().rstrip('\0').split('\0');assert all(p in ALLOWED or p.startswith(R2) for p in paths)
 payload={p:git('show',commit+':'+p) for p in paths};source=[{'path':p,'blob':git('rev-parse',commit+':'+p).decode().strip(),'bytes':len(b),'sha256':sha(b)} for p,b in payload.items()]
 receipt=json.loads(receipts.read_text('utf-8'));assert receipt['finalSHA']==commit and receipt['parent']==parent and receipt['tree']==tree
 payload['DELIVERY-RECEIPTS.json']=encode(receipt);payload['SOURCE-INDEX.json']=encode({'base':BASE,'sourceCommit':commit,'parent':parent,'tree':tree,'files':source,'selfContained':False,'reusedResources':R2+'baseline-reuse.json','note':'Use with exact baseline repository; no old art, fixtures or CANDIDATE-ASSETS repacked.'})
 report=report_links(payload[R2+'report.md'].decode());assert_links(report,payload)
 report+='\n\n最终SHA：`'+commit+'`\n\n父SHA：`'+parent+'`\n\nTree：`'+tree+'`\n\n远端：'+receipt['remoteStatus']+'。命令原始输出与退出码见 DELIVERY-RECEIPTS.json。\n'
 payload['FINAL-REPORT.md']=report.encode();payload['changes.patch']=git('diff',BASE,commit,'--',P,':!*.jpg',':!*.png')
 rows=[{'path':p,'bytes':len(b),'sha256':sha(b)} for p,b in sorted(payload.items())];delivery.closure(rows,[],False)
 core={'sourceCommit':commit,'baseSHA':BASE,'tree':tree,'kind':'MAINLINE-REVIEW','files':rows};core['artifactId']=sha(json.dumps(core,sort_keys=True,separators=(',',':')).encode());payload['ARTIFACT-MANIFEST.json']=encode(core);payload['SHA256SUMS.txt']=''.join(x['sha256']+'  '+x['path']+'\n' for x in rows).encode()
 out.mkdir(parents=True,exist_ok=True);zp=out/'MAINLINE-REVIEW.zip';assert not zp.exists()
 with zipfile.ZipFile(zp,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for name,data in sorted(payload.items()):z.writestr(name,data)
 verified=delivery.verify_package(zp)
 with zipfile.ZipFile(zp) as z:
  assert_links(z.read('FINAL-REPORT.md').decode(),z.namelist())
  for row in source:assert z.read(row['path'])==git('show',commit+':'+row['path'])
  assert z.read('SHA256SUMS.txt')==payload['SHA256SUMS.txt']
 assert zp.stat().st_size<10*1024**2
 result={'task':'WORLD-UI-VISUAL-READINESS-001-R2','finalSHA':commit,'parent':parent,'tree':tree,'path':str(zp),'bytes':zp.stat().st_size,'sha256':sha(zp.read_bytes()),'artifactId':core['artifactId'],'verification':verified,'sourceBlobsExact':len(source),'rootLinksVerified':True,'oldAssetsRepacked':False};(out/'PACKAGE-INDEX.json').write_bytes(encode(result));print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--check-plan',action='store_true');p.add_argument('--out',type=Path);p.add_argument('--target');p.add_argument('--receipts',type=Path);a=p.parse_args()
 if a.check_plan:print(json.dumps(plan(),ensure_ascii=False))
 else:build(a.out,a.target,a.receipts)
