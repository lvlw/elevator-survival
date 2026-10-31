"""Verify this task payload/ZIP; integrity only, never gameplay/authorization acceptance."""
from __future__ import annotations
from pathlib import Path, PurePosixPath
import hashlib, json, stat, sys, zipfile

def parse_json(raw: bytes):
    def pairs(items):
        out = {}
        for k, v in items:
            if k in out: raise ValueError('duplicate JSON key: ' + k)
            out[k] = v
        return out
    return json.loads(raw.decode('utf-8'), object_pairs_hook=pairs)

def safe(name: str) -> str:
    if not name or '\\' in name or '\x00' in name or ':' in name:
        raise ValueError('unsafe path')
    p = PurePosixPath(name)
    if p.is_absolute() or any(x in ('', '.', '..') for x in name.split('/')):
        raise ValueError('unsafe path')
    return name

def validate(files: dict[str, bytes]) -> dict:
    if len(files) != len({safe(k).casefold() for k in files}):
        raise ValueError('duplicate case-insensitive path')
    m = parse_json(files['PACKAGE-MANIFEST.json'])
    if m['task_id'] != 'ENG-WORLD-COMMITTED-PRESENTATION-B1-001': raise ValueError('task id')
    if m['start_sha'] != '12186083a8791e26b4e87f21ab1767d3ae4e4a58': raise ValueError('base')
    rows = m['files']; names = [safe(r['path']) for r in rows]
    if len(names) != len(set(x.casefold() for x in names)): raise ValueError('duplicate manifest path')
    if set(files) != set(names) | {'PACKAGE-MANIFEST.json'}: raise ValueError('payload closure')
    for r in rows:
        b = files[r['path']]
        if len(b) != r['bytes'] or hashlib.sha256(b).hexdigest() != r['sha256']:
            raise ValueError('payload digest: ' + r['path'])
    sums = []
    for line in files['SHA256SUMS.txt'].decode('ascii').splitlines():
        h, n = line.split('  ', 1); safe(n)
        if n in ('PACKAGE-MANIFEST.json', 'SHA256SUMS.txt'): raise ValueError('recursive checksum')
        if len(h) != 64 or hashlib.sha256(files[n]).hexdigest() != h: raise ValueError('checksum: ' + n)
        sums.append(n)
    if len(sums) != len(set(sums)) or set(sums) != set(files) - {'PACKAGE-MANIFEST.json', 'SHA256SUMS.txt'}:
        raise ValueError('checksum closure')
    for n, b in files.items():
        b.decode('utf-8')
        if n.endswith('.json'): parse_json(b)
    return {'kind':'TASK_INPUT_INTEGRITY_ONLY','pass':True,'files':len(files),'bytes':sum(map(len,files.values()))}

def load(path: Path) -> dict[str, bytes]:
    if path.is_file():
        with zipfile.ZipFile(path) as z:
            seen = set(); files = {}; total = 0
            for i in z.infolist():
                safe(i.filename); key=i.filename.casefold()
                if key in seen: raise ValueError('duplicate ZIP entry')
                seen.add(key); mode=i.external_attr >> 16
                if i.is_dir() or i.flag_bits & 1 or stat.S_ISLNK(mode) or (stat.S_IFMT(mode) not in (0, stat.S_IFREG)):
                    raise ValueError('unsupported ZIP entry')
                total += i.file_size
                if total > 5*1024*1024: raise ValueError('task size limit')
                files[i.filename] = z.read(i)
            if z.testzip() is not None: raise ValueError('CRC')
            return files
    files = {}
    for p in path.rglob('*'):
        if p.is_symlink(): raise ValueError('symlink')
        if p.is_file():
            n=p.relative_to(path).as_posix();safe(n);files[n]=p.read_bytes()
    return files

if __name__ == '__main__':
    try:
        target = Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
        print(json.dumps(validate(load(target)),ensure_ascii=False,indent=2))
    except Exception as e:
        print(json.dumps({'kind':'TASK_INPUT_INTEGRITY_ONLY','pass':False,'error':str(e)},ensure_ascii=False))
        sys.exit(1)
