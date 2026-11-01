#!/usr/bin/env python3
"""Validate this task packet only; no execution authority or gameplay test."""
from pathlib import Path, PurePosixPath
import argparse, hashlib, json, stat, zipfile

def safe(n):
    if not isinstance(n,str) or not n or any(c in n for c in ('\\',':','\0')) or PurePosixPath(n).is_absolute() or any(x in ('','.','..') or x.rstrip(' .')!=x for x in n.split('/')): raise ValueError('unsafe path')
    return n

def verify(path):
    if path.is_dir():
        entries={}
        for p in path.rglob('*'):
            if p.is_symlink(): raise ValueError('symlink')
            if p.is_file(): entries[safe(p.relative_to(path).as_posix())]=p.read_bytes()
    else:
        entries={}
        with zipfile.ZipFile(path) as z:
            for i in z.infolist():
                mode=i.external_attr>>16
                if i.is_dir() or i.flag_bits&1 or stat.S_IFMT(mode) not in (0,stat.S_IFREG):raise ValueError('nonregular or encrypted')
                n=safe(i.filename)
                if n in entries:raise ValueError('duplicate')
                entries[n]=z.read(i)
    if len(entries)!=len({n.casefold() for n in entries}):raise ValueError('case collision')
    m=json.loads(entries['PACKAGE-MANIFEST.json'])
    wanted=m['files']; expected={safe(r['path']) for r in wanted}
    if len(expected)!=len(wanted) or set(entries)!=expected|{'PACKAGE-MANIFEST.json'}:raise ValueError('membership')
    for r in wanted:
        b=entries[r['path']]
        if len(b)!=r['bytes'] or hashlib.sha256(b).hexdigest()!=r['sha256']:raise ValueError('digest')
    return {'status':'PASS','files':len(entries),'payloadBytes':sum(map(len,entries.values())),'scope':'task-packet integrity only'}
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('path',nargs='?',type=Path,default=Path(__file__).resolve().parent)
    print(json.dumps(verify(ap.parse_args().path),ensure_ascii=False))
