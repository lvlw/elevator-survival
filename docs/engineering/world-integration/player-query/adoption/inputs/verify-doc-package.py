#!/usr/bin/env python3
"""Read-only package/repository byte verifier. Does not replace semantic/link/Git review."""
from pathlib import Path
import argparse, hashlib, json, subprocess, sys

def digest(b): return hashlib.sha256(b).hexdigest()
def git(repo, *args):
    return subprocess.check_output(['git','-C',str(repo),*args], stderr=subprocess.STDOUT)
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--repo', type=Path); args=ap.parse_args()
    here=Path(__file__).resolve().parent
    base=json.loads((here/'BASELINE-AND-INPUTS.json').read_text('utf8'))
    records=[]
    def check(name, condition):
        records.append({'check':name,'pass':bool(condition)})
        if not condition: raise ValueError(name)
    checksums=(here/'SHA256SUMS.txt').read_text('utf8').splitlines()
    check('manifest_count',len(checksums)==len(base['input_files'])-1)
    for line in checksums:
        sha,name=line.split('  ',1)
        check('manifest path '+name,name in base['input_files'] and name!='SHA256SUMS.txt')
        check('digest '+name,digest((here/name).read_bytes())==sha)
    fields=json.loads((here/'approved-documents/player-query-field-contract-v1.0.json').read_text('utf8'))
    ids=[x['field'] for x in fields['fields']]
    check('24_unique_fields',len(ids)==24 and len(set(ids))==24)
    counts={s:sum(x['baseline_support']==s for x in fields['fields']) for s in ('supported','partial','not-supported')}
    check('3_12_9_baseline_only', counts==fields['baseline_support_counts'])
    check('4_phases_5_points',len(fields['domain_phases'])==4 and len(fields['complete_points'])==5)
    for p in base['payloads']:
        check('payload digest '+p['source'],digest((here/p['source']).read_bytes())==p['sha256'])
    if args.repo:
        repo=args.repo.resolve(); start=base['start_sha']
        git(repo,'merge-base','--is-ancestor',start,'HEAD')
        check('branch',git(repo,'branch','--show-current').decode().strip()==base['branch'])
        for src in base['source_candidates']:
            check('baseline candidate '+src['path'],git(repo,'rev-parse',start+':'+src['path']).decode().strip()==src['git_blob'])
        for name in base['input_files']:
            check('archived bytes '+name,(repo/base['archive_prefix']/name).read_bytes()==(here/name).read_bytes())
        for p in base['payloads']:
            check('installed bytes '+p['target'],(repo/p['target']).read_bytes()==(here/p['source']).read_bytes())
        for name in base['append_only_paths']:
            old=git(repo,'show',start+':'+name)
            now=(repo/name).read_bytes()
            check('old prefix '+name,now.startswith(old) and len(now)>len(old))
        changed=set(git(repo,'diff','--name-only',start,'--').decode().splitlines())
        untracked=set(git(repo,'ls-files','--others','--exclude-standard').decode().splitlines())
        check('allowed changed/untracked paths',changed|untracked<=set(base['allowed_paths']))
        check('no whitespace warnings in incremental diff',subprocess.run(['git','-C',str(repo),'diff','--check',start,'--'],capture_output=True).returncode==0)
    print(json.dumps({'status':'PASS','scope':'byte/package checks only','count':len(records),'checks':records},ensure_ascii=False,indent=2))
if __name__=='__main__':
    try: main()
    except Exception as error:
        print(json.dumps({'status':'FAIL','error':str(error)},ensure_ascii=False)); sys.exit(1)
