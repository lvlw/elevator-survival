"""R1 semantic checks; errors are distinct from explicit validation rejections."""
import argparse, contextlib, copy, hashlib, io, json, sys, tempfile, warnings, zipfile
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'tools'))
import delivery, theme_check

def sha(data): return hashlib.sha256(data).hexdigest()

def theme_cases():
    rows = []
    for case in json.loads((HERE / 'fixtures/cases.json').read_text('utf-8')):
        candidate = json.loads((HERE / 'fixtures' / case['manifest']).read_text('utf-8'))
        root = theme_check.D if case['root'] == 'baseline' else HERE / 'fixtures' / case['root']
        actual, error = 'ACCEPT', None
        try: theme_check.validate(candidate, root_directory=root)
        except theme_check.Reject as e: actual = str(e)
        except Exception as e: actual, error = 'PROGRAM_ERROR', type(e).__name__ + ': ' + str(e)
        rows.append({**case, 'actual': actual, 'error': error, 'pass': actual == case['expected']})
    return rows

def make_zip(path, kind, variant):
    data = b'fixed exact-commit fixture\n'
    entries = [{'path':'record.txt','bytes':len(data),'sha256':sha(data)}]
    if variant == 'duplicate-manifest': entries.append(copy.deepcopy(entries[0]))
    commit = '8ffe22616c68d806d7bda48d55e0adf6383765c4'
    core = {'sourceCommit':commit,'baseSHA':delivery.BASE,'tree':'82aab1d5c1ec56c372102558a35ac0866d197d9f','kind':kind,'files':entries}
    core['artifactId'] = sha(json.dumps(core,sort_keys=True,separators=(',',':')).encode())
    if variant == 'commit-tamper': core['sourceCommit'] = '0'*40
    with warnings.catch_warnings(record=True) as warned:
        warnings.simplefilter('always')
        with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
            z.writestr('ARTIFACT-MANIFEST.json',json.dumps(core))
            z.writestr('SHA256SUMS.txt',''.join(e['sha256']+'  '+e['path']+'\n' for e in entries))
            if variant == 'duplicate-same': z.writestr('record.txt',data)
            if variant == 'duplicate-different': z.writestr('record.txt',b'earlier conflicting bytes\n')
            if variant != 'missing': z.writestr('record.txt',data if variant != 'hash-tamper' else b'changed payload\n')
            if variant == 'extra': z.writestr('extra.txt',b'extra\n')
    return [str(w.message) for w in warned]

def zip_cases(verify=delivery.verify):
    rows=[]
    with tempfile.TemporaryDirectory(prefix='ui-readiness-r1-zips-') as tmp:
        for name,expected in [('valid','ACCEPT'),('duplicate-same','ZIP_DUPLICATE_ENTRY'),('duplicate-different','ZIP_DUPLICATE_ENTRY'),('duplicate-manifest','DUPLICATE_PATH'),('missing','ZIP_MISSING'),('extra','ZIP_EXTRA'),('hash-tamper','ZIP_HASH'),('commit-tamper','ARTIFACT_ID')]:
            root=Path(tmp)/name;root.mkdir()
            warned=make_zip(root/'MAINLINE-REVIEW.zip','MAINLINE-REVIEW',name)
            make_zip(root/'CANDIDATE-ASSETS.zip','CANDIDATE-ASSETS','valid')
            site=root/'REVIEW-SITE';site.mkdir()
            (site/'SITE-MANIFEST.json').write_text(json.dumps({'files':[],'required':[],'selfContained':True}))
            actual,error='ACCEPT',None
            with contextlib.redirect_stdout(io.StringIO()) as stdout:
                try: verify(root)
                except theme_check.Reject as e:actual=str(e)
                except Exception as e:actual,error='PROGRAM_ERROR',type(e).__name__+': '+str(e)
            rows.append({'case':name,'expected':expected,'actual':actual,'error':error,'warnings':warned,'stdout':stdout.getvalue(),'pass':actual==expected})
    return rows

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--baseline',action='store_true');a=p.parse_args()
    result={'kind':'CLI_SEMANTIC_REPRODUCTION','baselineObservation':a.baseline,'theme':theme_cases(),'zip':zip_cases()}
    result['pass']=all(x['pass'] for x in result['theme']+result['zip'])
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    sys.exit(0 if result['pass'] else 1)
