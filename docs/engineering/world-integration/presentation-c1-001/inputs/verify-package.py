#!/usr/bin/env python3
"""Verify task bytes only; does not authorize or execute repository work."""
from pathlib import Path, PurePosixPath
import sys, json, hashlib, zipfile, stat
class PackageError(ValueError): pass
def safe(name):
    if not isinstance(name,str) or not name or any(x in name for x in ['\\',':','\0']): raise PackageError('UNSAFE_PATH')
    if PurePosixPath(name).is_absolute() or any(p in ('','.','..') or p.rstrip(' .') != p for p in name.split('/')): raise PackageError('UNSAFE_PATH')
    return name
def unique(names):
    seen=set()
    for n in names:
        k=safe(n).casefold()
        if k in seen: raise PackageError('DUPLICATE_PATH')
        seen.add(k)
def verify(target):
    if target.is_dir():
        files={}
        for p in target.rglob('*'):
            if p.is_symlink(): raise PackageError('SYMLINK')
            if p.is_file(): files[safe(p.relative_to(target).as_posix())]=p.read_bytes()
    else:
        files={}
        with zipfile.ZipFile(target) as z:
            infos=z.infolist(); unique([i.filename for i in infos])
            if sum(i.file_size for i in infos)>20_000_000: raise PackageError('SIZE_LIMIT')
            for i in infos:
                mode=i.external_attr>>16
                if i.is_dir() or stat.S_ISLNK(mode) or stat.S_IFMT(mode) not in (0,stat.S_IFREG) or i.flag_bits&1: raise PackageError('NON_REGULAR_ENTRY')
                files[safe(i.filename)]=z.read(i)
    unique(files)
    manifest=json.loads(files['PACKAGE-MANIFEST.json'])
    if manifest['task']!='ENG-WORLD-PRESENTATION-C1-001' or manifest['base_sha']!='d31828a74fcb1b2e28c0f070ad7f8fd3b3e87cc4': raise PackageError('WRONG_TASK')
    rows=manifest['files']; unique([r['path'] for r in rows])
    if set(files)!={r['path'] for r in rows}|{'PACKAGE-MANIFEST.json'}: raise PackageError('FILE_SET')
    for r in rows:
        data=files[r['path']]
        if len(data)!=r['bytes'] or hashlib.sha256(data).hexdigest()!=r['sha256']: raise PackageError('DIGEST')
    return {'status':'PASS','task':manifest['task'],'files':len(files),'bytes':sum(map(len,files.values())),'scope':'package bytes only'}
if __name__=='__main__':
    try: print(json.dumps(verify(Path(sys.argv[1] if len(sys.argv)>1 else '.')),ensure_ascii=False,indent=2))
    except Exception as e: print(type(e).__name__+': '+str(e),file=sys.stderr);sys.exit(1)
