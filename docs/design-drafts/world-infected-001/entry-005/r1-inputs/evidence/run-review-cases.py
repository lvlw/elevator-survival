"""Run independently specified finite cases against a selected checker.
Not a CTB simulator, production codec, authenticity verifier or current owner.
REJECTED requires the checker's business Reject; crashes never count as rejection.
"""
import argparse
import copy
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
sys.dont_write_bytecode = True

def git_blob(data):
    return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--checker',type=Path,required=True)
    parser.add_argument('--spec',type=Path,required=True)
    parser.add_argument('--cases',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--require-blob')
    args=parser.parse_args()
    data=args.checker.read_bytes(); actual_blob=git_blob(data)
    if args.require_blob and actual_blob!=args.require_blob:
        parser.error('Source blob differs from required exact baseline')
    mspec=importlib.util.spec_from_file_location('selected_finite_checker',args.checker)
    model=importlib.util.module_from_spec(mspec);mspec.loader.exec_module(model)
    spec=json.loads(args.spec.read_text('utf-8'))
    cases=json.loads(args.cases.read_text('utf-8'))['cases']
    rows=[]
    for case in cases:
        original=copy.deepcopy(case)
        before=json.dumps(case,sort_keys=True,ensure_ascii=False)
        err=None
        try:
            result=model.validate(case,spec,None)
            kind='ACCEPTED'
        except model.Reject as exc:
            result='REJECT:'+str(exc);kind='REJECTED'
        except Exception as exc:
            result='EXCEPTION';kind='EXCEPTION';err=type(exc).__name__+': '+str(exc)
        unchanged=before==json.dumps(case,sort_keys=True,ensure_ascii=False)
        matched=(kind=='REJECTED' if original['expected']=='REJECTED' else result==original['expected'])
        rows.append(dict(id=original['id'],expected=original['expected'],actual=result,classification=kind,
            match=matched and unchanged,exception=err,inputUnchanged=unchanged))
    report=dict(mode='FINITE_REVIEW_CASE_RUN_NOT_NATIVE_GAME',sourceGitBlob=actual_blob,
        sourceSha256=hashlib.sha256(data).hexdigest(),specGitBlob=git_blob(args.spec.read_bytes()),
        caseSha256=hashlib.sha256(args.cases.read_bytes()).hexdigest(),total=len(rows),
        matched=sum(r['match'] for r in rows),mismatched=sum(not r['match'] for r in rows),
        exceptions=sum(r['exception'] is not None for r in rows),
        unsupported=sum(c['support']=='unsupported' for c in cases),rows=rows)
    args.output.write_text(json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['total','matched','mismatched','exceptions','unsupported']},ensure_ascii=False))
    return 1 if report['mismatched'] or report['exceptions'] else 0
if __name__=='__main__':raise SystemExit(main())
