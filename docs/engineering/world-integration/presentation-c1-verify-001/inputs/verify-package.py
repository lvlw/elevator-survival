"""Validate extracted package or ZIP without extracting it. Python standard library only."""
import hashlib,json,stat,sys,zipfile
from pathlib import Path,PurePosixPath
MANIFEST='PACKAGE-MANIFEST.json'
def safe(n):
    if not isinstance(n,str) or not n or '\\' in n or '\x00' in n or ':' in n or PurePosixPath(n).is_absolute() or any(x in ('','.','..') or x.rstrip(' .')!=x for x in n.split('/')):
        raise ValueError('UNSAFE_PATH '+repr(n))
    return n

def verify(data):
    keys=list(data); seen=set()
    for n in keys:
        safe(n)
        if n.casefold() in seen: raise ValueError('DUPLICATE_PATH')
        seen.add(n.casefold())
    m=json.loads(data[MANIFEST]); rows=m['files']; rn=[safe(r['path']) for r in rows]
    if len(rn)!=len(set(x.casefold() for x in rn)):raise ValueError('DUPLICATE_MANIFEST')
    if set(keys)!={MANIFEST,*rn}:raise ValueError('FILE_SET')
    for r in rows:
        b=data[r['path']]
        if len(b)!=r['bytes'] or hashlib.sha256(b).hexdigest()!=r['sha256']:raise ValueError('DIGEST '+r['path'])
    return {'status':'PASS','files':len(keys),'payloadBytes':sum(len(v) for v in data.values())}

def read(p):
    if p.is_dir():
        data={}
        for f in p.rglob('*'):
            if f.is_symlink():raise ValueError('SYMLINK')
            if f.is_file():data[f.relative_to(p).as_posix()]=f.read_bytes()
        return data
    with zipfile.ZipFile(p) as z:
        infos=z.infolist(); names=[x.filename for x in infos]
        if len(names)!=len(set(n.casefold() for n in names)):raise ValueError('DUPLICATE_ZIP')
        for i in infos:
            safe(i.filename); mode=i.external_attr>>16
            if i.is_dir() or i.flag_bits&1 or stat.S_IFMT(mode) not in (0,stat.S_IFREG):raise ValueError('NON_REGULAR')
        if z.testzip():raise ValueError('CRC')
        return {i.filename:z.read(i) for i in infos}
if __name__=='__main__':
    print(json.dumps(verify(read(Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parent)),ensure_ascii=False))
