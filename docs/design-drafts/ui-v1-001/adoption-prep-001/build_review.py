"""Assemble only new task source and bounded evidence; never packages the source-art corpus/profile."""
import argparse, json, zipfile
from pathlib import Path
import asset_review as a
from scope_guard import tree
from verify_delivery import verify, object_hash

def build(repo,work,output):
    evidence=work/'evidence';head=a.git(repo,'rev-parse','HEAD').decode().strip();parent=a.git(repo,'rev-parse','HEAD^').decode().strip();root=a.git(repo,'rev-parse','HEAD^{tree}').decode().strip();src=a.git(repo,'rev-parse','HEAD:src').decode().strip()
    if a.git(repo,'branch','--show-current').decode().strip()!='chore/world-asset-adoption-prep-001' or head==a.BASE:raise ValueError('wrong final branch/head')
    before=tree(repo,a.BASE);after=tree(repo,head)
    if any(after.get(k)!=v for k,v in before.items()) or src!=a.SRC_TREE:raise ValueError('protected objects changed')
    added={p:v for p,v in after.items() if p not in before}
    if not added or any(not p.startswith(a.PREFIX) for p in added):raise ValueError('scope')
    ci=json.loads((evidence/'ci-summary.json').read_text('utf-8'))
    if ci.get('head_sha')!=head:raise ValueError('CI does not bind final head')
    identity={'base':a.BASE,'baseTree':a.BASE_TREE,'final':head,'parent':parent,'tree':root,'srcTree':src,'branch':'chore/world-asset-adoption-prep-001'}
    data={};source=[]
    for path,row in sorted(added.items()):
        raw=a.git(repo,'cat-file','blob',head+':'+path);data['source/'+path]=raw
        source.append({'path':path,'mode':row['mode'],'gitBlob':row['gitObject'],'bytes':len(raw),'sha256':a.sha(raw)})
    def js(value):return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
    data['git/identity.json']=js(identity);data['git/source-files.json']=js(source)
    data['git/changes.patch']=a.git(repo,'diff','--binary','--full-index',a.BASE,head)
    data['git/commit.txt']=a.git(repo,'show','-s','--format=fuller',head)
    data['git/status-after-push.txt']=a.git(repo,'status','--porcelain=v1','--untracked-files=all')
    if data['git/status-after-push.txt']:raise ValueError('worktree not clean at packaging')
    data['git/refs-after.txt']=a.git(repo,'for-each-ref','--format=%(refname)|%(objectname)|%(symref)|%(upstream)')
    data['git/all-base-objects.json']=(evidence/'all-base-objects.json').read_bytes()
    for path in sorted(evidence.rglob('*')):
        if path.is_file():data['evidence/'+path.relative_to(evidence).as_posix()]=path.read_bytes()
    report=(a.HERE/'REPORT.md').read_text('utf-8')
    report+='\n## 交付准确对象（提交后生成，避免自指）\n\n'
    report+='\n'.join(f'- {k}: `{v}`' for k,v in identity.items())+'\n\n'
    report+='准确 CI：'+json.dumps(ci,ensure_ascii=False)+'\n\n'
    report+=f'本提交新增 {len(source)} 文件，全部位于唯一任务前缀。3185 个原对象保持，src tree 保持。唯一 ZIP 的实际大小/SHA-256 在最终回复与仓库外 ZIP 回执中给出；不能把包含自身摘要写入自身文件。\n'
    data['REPORT.md']=report.encode('utf-8')
    data['START-HERE.txt']='先读 REPORT.md 和 source/docs/design-drafts/ui-v1-001/adoption-prep-001/OWNER-REVIEW.md。派生图可直接看；原图页面按该目录README运行，源仓库固定sourceCommit，不复制64原图。\n'.encode('utf-8')
    data['DELIVERY-MANIFEST.json']=js({'task':'ART-WORLD-ASSET-ADOPTION-PREP-001','selfExcluded':True,'identity':identity,'files':[{'path':k,'bytes':len(v),'sha256':a.sha(v)} for k,v in sorted(data.items())]})
    output.parent.mkdir(parents=True,exist_ok=True)
    if output.exists():raise ValueError('do not overwrite an existing final delivery')
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name,raw in sorted(data.items()):
            info=zipfile.ZipInfo(name,(2026,11,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,raw)
    result=verify(output,work/'re-extracted-final-review');a.save(work/'ZIP-RECEIPT.json',{'path':str(output.resolve()),**result});print(json.dumps({'path':str(output.resolve()),**result},ensure_ascii=False,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--work',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--repo',type=Path,default=a.REPO);args=p.parse_args();build(args.repo,args.work,args.output)
