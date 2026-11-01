"""TEST-only scope/objects/raw bytes/project refs guard; host refs are observation only."""
import argparse, hashlib, json, os
from pathlib import Path
import asset_review as a

def tree(repo,ref):
    result={}
    for row in a.git(repo,'ls-tree','-rz',ref).split(b'\0'):
        if not row:continue
        left,path=row.split(b'\t',1);mode,kind,obj=left.decode().split()
        result[path.decode('utf-8')]={'mode':mode,'kind':kind,'gitObject':obj}
    return result

def refs(repo):
    return dict(row.split('|',1) for row in a.git(repo,'for-each-ref','--format=%(refname)|%(objectname)').decode().splitlines())

def inspect(repo,receipt_dir):
    before=json.loads((receipt_dir/'all-base-objects.json').read_text('utf-8'));raw_before=json.loads((receipt_dir/'protected-worktree-before.json').read_text('utf-8'))['sha256']
    base=tree(repo,a.BASE);head=tree(repo,'HEAD');index={}
    if a.git(repo,'rev-parse',a.BASE+'^{tree}').decode().strip()!=a.BASE_TREE:raise ValueError('base root tree differs')
    for row in a.git(repo,'ls-files','--stage','-z').split(b'\0'):
        if not row:continue
        left,path=row.split(b'\t',1);mode,obj,stage=left.decode().split()
        if stage!='0':raise ValueError('unmerged index')
        index[path.decode()]={'mode':mode,'kind':'blob','gitObject':obj}
    expected={x['path']:{k:x[k] for k in ('mode','kind','gitObject')} for x in before['objects']}
    if base!=expected or len(base)!=3185:raise ValueError('baseline object index differs')
    changed_head=[p for p,v in base.items() if head.get(p)!=v];changed_index=[p for p,v in base.items() if index.get(p)!=v]
    changed_raw=[p for p in base if not (repo/p).is_file() or a.sha((repo/p).read_bytes())!=raw_before[p]]
    status=a.git(repo,'status','--porcelain=v1','-z','--untracked-files=all').split(b'\0');outside=[]
    for record in status:
        if record:
            text=record.decode('utf-8');path=text[3:]
            if not path.startswith(a.PREFIX):outside.append(text)
    new_head=[p for p in head if p not in base];new_index=[p for p in index if p not in base]
    if any(not p.startswith(a.PREFIX) for p in new_head+new_index):outside.append('new tracked file outside prefix')
    old_refs={line.split('|')[0]:line.split('|')[1] for line in (receipt_dir/'initial-refs.log').read_text('utf-8-sig').splitlines() if line}
    current_refs=refs(repo);own={'refs/heads/chore/world-asset-adoption-prep-001','refs/remotes/origin/chore/world-asset-adoption-prep-001'}
    project=lambda n:n.startswith(('refs/heads/','refs/remotes/','refs/tags/')) and n not in own
    deltas=[{'ref':n,'before':old_refs.get(n),'after':current_refs.get(n)} for n in sorted(set(old_refs)|set(current_refs)) if old_refs.get(n)!=current_refs.get(n)]
    project_deltas=[x for x in deltas if project(x['ref'])]
    src=a.git(repo,'rev-parse','HEAD:src').decode().strip()
    result={'base':a.BASE,'baseTree':a.BASE_TREE,'head':a.git(repo,'rev-parse','HEAD').decode().strip(),
            'srcTree':src,'protectedObjects':len(base),'changedHeadObjects':changed_head,'changedIndexObjects':changed_index,'changedRawWorktreeFiles':changed_raw,
            'outsideWhitelist':outside,'oldProjectRefs':sum(project(n) for n in old_refs),'projectRefDeltas':project_deltas,
            'hostRefObservationDeltas':[x for x in deltas if x['ref'].startswith('refs/codex/')],
            'hostRefPolicy':'OBSERVE_ONLY_NOT_MUTATED_OR_RESTORED; attribution not inferred',
            'ownTaskRefDeltas':[x for x in deltas if x['ref'] in own], 'newHeadFiles':len(new_head),'newIndexFiles':len(new_index)}
    result['result']='PASS' if not any((changed_head,changed_index,changed_raw,outside,project_deltas)) and src==a.SRC_TREE else 'FAIL'
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--receipts',type=Path,required=True);p.add_argument('--repo',type=Path,default=a.REPO);p.add_argument('--output',type=Path);args=p.parse_args();result=inspect(args.repo,args.receipts)
    if args.output:a.save(args.output,result)
    print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(0 if result['result']=='PASS' else 1)
