#!/usr/bin/env python3
"""Read-only input package verification. Does not execute gameplay or replace repo review."""
from pathlib import Path, PurePosixPath
import argparse, hashlib, json

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--package-root', type=Path, required=True)
    root=parser.parse_args().package_root.resolve()
    data=json.loads((root/'BASELINE-AND-INPUTS.json').read_text(encoding='utf-8'))
    checks=[]
    def check(name, value):
        checks.append({'name':name,'pass':bool(value)})
        if not value: raise ValueError(name)
    names=data['package_files']
    check('unique filenames',len(names)==len(set(names)))
    check('safe package names',all(not PurePosixPath(n).is_absolute() and '..' not in PurePosixPath(n).parts for n in names))
    actual=sorted(str(p.relative_to(root)).replace('\\','/') for p in root.rglob('*') if p.is_file())
    check('exact package set',actual==sorted(names))
    hashed=[]
    for line in (root/'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
        digest,name=line.split('  ',1)
        check('known checksum path '+name,name in names and name!='SHA256SUMS.txt')
        b=(root/name).read_bytes()
        check('sha256 '+name,hashlib.sha256(b).hexdigest()==digest)
        check('utf8 '+name,b.decode('utf-8').encode('utf-8')==b)
        hashed.append(name)
    check('manifest exact set',sorted(hashed)==sorted(set(names)-{'SHA256SUMS.txt'}))
    paths=data['allowed_paths']
    check('exact unique whitelist',len(paths)==data['allowed_path_count']==len(set(paths)))
    check('safe repository paths',all(not PurePosixPath(n).is_absolute() and '..' not in PurePosixPath(n).parts for n in paths))
    check('archive inputs whitelisted',all(data['archive_prefix']+n in paths for n in names))
    check('exact baseline',data['start_sha']=='ff2b79f332c5ea2bec493eb5e166dcee6ba667eb')
    print(json.dumps({'status':'PASS','kind':'package-only','checks':checks,'total':len(checks),'repository_or_test_verified':False},ensure_ascii=False,indent=2))
if __name__=='__main__':
    main()
