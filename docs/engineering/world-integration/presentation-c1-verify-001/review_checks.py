"""C16 supplement integrity only; no product or acceptance authority."""
from pathlib import Path, PurePosixPath
import hashlib, json, stat
BASE='2de63f7da48d86bcfde280f7beaf08e4ffd42ee3'
BRANCH='test/world-presentation-c1-verify-001'
DOCS='docs/engineering/world-integration/presentation-c1-verify-001/'
ROOT=Path(__file__).resolve().parents[4]
SCOPE=json.loads((Path(__file__).parent/'inputs/BASELINE-AND-SCOPE.json').read_text('utf-8'))
class ReviewError(ValueError): pass
def safe_path(name):
    if not isinstance(name,str) or not name or '\\' in name or ':' in name or '\0' in name or PurePosixPath(name).is_absolute() or any(p in ('','.','..') or p.rstrip(' .')!=p for p in name.split('/')):
        raise ReviewError('UNSAFE_PATH')
    return name
def distinct(names):
    seen=set()
    for name in names:
        key=safe_path(name).casefold()
        if key in seen: raise ReviewError('DUPLICATE_PATH')
        seen.add(key)
def assert_scope(paths):
    for p in paths:
        safe_path(p)
        if not p.startswith(DOCS): raise ReviewError('OUT_OF_SCOPE: '+p)
def blob(data): return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def verify_payloads(data,rows):
    distinct([r['path'] for r in rows])
    if set(data)!={r['path'] for r in rows}: raise ReviewError('MANIFEST_FILE_SET')
    for r in rows:
        value=data[r['path']]
        if len(value)!=r['bytes'] or hashlib.sha256(value).hexdigest()!=r['sha256']: raise ReviewError('MANIFEST_DIGEST')
def regular_zip(info):
    mode=info.external_attr>>16
    if info.is_dir() or stat.S_ISLNK(mode) or stat.S_IFMT(mode) not in (0,stat.S_IFREG) or info.flag_bits&1: raise ReviewError('NON_REGULAR_ZIP_ENTRY')
    safe_path(info.filename)
