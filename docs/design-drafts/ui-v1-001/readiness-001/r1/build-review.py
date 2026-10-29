"""R1-only MAINLINE package, exact Git blobs. Never rebuild candidate art or old screenshots."""
import argparse,hashlib,json,re,subprocess,sys,zipfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'tools'))
import delivery
BASE='8ffe22616c68d806d7bda48d55e0adf6383765c4'
def git(*args):return subprocess.check_output(['git',*args],cwd=delivery.R)
def sha(data):return hashlib.sha256(data).hexdigest()
def encoded(obj):return (json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
def build(out,target,receipts,candidate):
 out=out.resolve();assert not out.is_relative_to(delivery.R.resolve())
 assert not git('status','--porcelain').strip(),'WORKTREE_NOT_CLEAN'
 assert git('branch','--show-current').decode().strip()=='feature/design-ui-readiness-001'
 commit,parent,tree=git('show','-s','--format=%H%n%P%n%T',target).decode().strip().splitlines()
 assert commit==git('rev-parse','HEAD').decode().strip()
 git('merge-base','--is-ancestor',BASE,commit)
 changed=git('diff','--name-only','-z',BASE,commit).decode().rstrip('\0').split('\0')
 prefix='docs/design-drafts/ui-v1-001/';n=prefix+'readiness-001/'
 allowed={prefix+'prototype/ui.js'}|{n+x for x in ['presentation.js','theme-lab.js','tools/theme_check.py','tools/delivery.py','tools/presentation-check.cjs','copy-table.md','theme/GUIDE.md','contracts/C-staged-ui.md','README.md','completion.md']}
 assert all(p in allowed or p.startswith(n+'r1/') for p in changed)
 payload={p:git('show',commit+':'+p) for p in changed}
 source_index=[{'path':p,'blob':git('rev-parse',commit+':'+p).decode().strip(),'bytes':len(data),'sha256':sha(data)} for p,data in payload.items()]
 cand=candidate.read_bytes();assert len(cand)==11968658 and sha(cand)=='e711af0efea9792efb937cdc570a0753cd7d55b7d19706e9aa6360f6e1dd185a'
 receipt=json.loads(receipts.read_text('utf-8'))
 assert receipt['finalSHA']==commit and receipt['parent']==parent and receipt['tree']==tree
 payload['DELIVERY-RECEIPTS.json']=encoded(receipt)
 payload['SOURCE-INDEX.json']=encoded({'base':BASE,'sourceCommit':commit,'parent':parent,'tree':tree,'files':source_index,'selfContained':False,'dependency':'Exact baseline repository; original art is not included','unchangedCandidate':{'name':'CANDIDATE-ASSETS.zip','bytes':len(cand),'sha256':sha(cand)}})
 payload['changes.patch']=git('diff','--binary',BASE,commit,'--',prefix,':!*.png',':!*.jpg')
 report=payload[n+'r1/report.md'].decode('utf-8')
 # The full report is moved to ZIP root; resolve its links to the bundled sources.
 report=re.sub(r'(\[[^\]]*\]\()((?:before|after|fixtures)/[^)]+)(\))',lambda m:m[1]+n+'r1/'+m[2]+m[3],report)
 report+='\n\n最终完整SHA：`'+commit+'`\n\n父SHA：`'+parent+'`\n\nTree：`'+tree+'`\n\nPush／独立远端核验：'+receipt['remoteStatus']+'；真实输出和退出码见 DELIVERY-RECEIPTS.json。\n'
 payload['FINAL-REPORT.md']=report.encode('utf-8')
 rows=[{'path':p,'bytes':len(data),'sha256':sha(data)} for p,data in sorted(payload.items())]
 delivery.closure(rows,[],False)
 core={'sourceCommit':commit,'baseSHA':BASE,'tree':tree,'kind':'MAINLINE-REVIEW','files':rows}
 core['artifactId']=sha(json.dumps(core,sort_keys=True,separators=(',',':')).encode())
 payload['ARTIFACT-MANIFEST.json']=encoded(core)
 payload['SHA256SUMS.txt']=''.join(x['sha256']+'  '+x['path']+'\n' for x in rows).encode()
 out.mkdir(parents=True,exist_ok=True);zp=out/'MAINLINE-REVIEW.zip';assert not zp.exists(),'DO_NOT_OVERWRITE_DELIVERED_PACKAGE'
 with zipfile.ZipFile(zp,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p,data in sorted(payload.items()):z.writestr(p,data)
 assert zp.stat().st_size<=60*1024**2
 checked=delivery.verify_package(zp)
 with zipfile.ZipFile(zp) as z:
  assert json.loads(z.read('ARTIFACT-MANIFEST.json'))['sourceCommit']==commit
  for item in source_index:assert z.read(item['path'])==git('show',commit+':'+item['path'])
  assert z.read('SHA256SUMS.txt')==payload['SHA256SUMS.txt']
  for target_link in re.findall(r'\[[^\]]*\]\(([^)]+)\)',report):
   assert target_link in z.namelist(),target_link
 result={'task':'WORLD-UI-VISUAL-READINESS-001-R1','sourceCommit':commit,'parent':parent,'tree':tree,'path':str(zp),'bytes':zp.stat().st_size,'sha256':sha(zp.read_bytes()),'artifactId':core['artifactId'],'verify':checked,'gitBlobFiles':len(source_index),'exactGitBytes':True,'candidateRepacked':False}
 (out/'PACKAGE-INDEX.json').write_bytes(encoded(result));print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--target',required=True);p.add_argument('--receipts',type=Path,required=True);p.add_argument('--candidate',type=Path,required=True);a=p.parse_args();build(a.out,a.target,a.receipts,a.candidate)
