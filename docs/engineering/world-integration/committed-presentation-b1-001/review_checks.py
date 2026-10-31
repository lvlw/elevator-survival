"""B1 delivery integrity/scope only; not a gameplay or approval authority."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import stat

BASE = '12186083a8791e26b4e87f21ab1767d3ae4e4a58'
BRANCH = 'feature/world-committed-presentation-b1-001'
DOCS = 'docs/engineering/world-integration/committed-presentation-b1-001/'
ROOT = Path(__file__).resolve().parents[4]
SCOPE = json.loads((Path(__file__).parent / 'inputs/BASELINE-AND-SCOPE.json').read_text('utf-8'))
class ReviewError(ValueError): pass
def safe_path(name):
    if not isinstance(name, str) or not name or '\\' in name or ':' in name or '\0' in name:
        raise ReviewError('UNSAFE_PATH')
    if PurePosixPath(name).is_absolute() or any(p in ('', '.', '..') or p.rstrip(' .') != p for p in name.split('/')):
        raise ReviewError('UNSAFE_PATH')
    return name
def distinct(names):
    seen = set()
    for name in names:
        key = safe_path(name).casefold()
        if key in seen: raise ReviewError('DUPLICATE_PATH')
        seen.add(key)
def assert_scope(paths):
    allowed = set(SCOPE['allowed_existing_production_edits'] + SCOPE['allowed_new_production_files'] + SCOPE['allowed_new_test_files'])
    allowed.update(r['path'] for key in ['allowed_existing_test_edits','allowed_existing_document_edits'] for r in SCOPE[key])
    for p in paths:
        safe_path(p)
        if p not in allowed and not p.startswith(DOCS): raise ReviewError('OUT_OF_SCOPE: '+p)
def blob(data): return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def verify_payloads(data, rows):
    distinct([r['path'] for r in rows])
    if set(data) != {r['path'] for r in rows}: raise ReviewError('MANIFEST_FILE_SET')
    for row in rows:
        value = data[row['path']]
        if len(value) != row['bytes'] or hashlib.sha256(value).hexdigest() != row['sha256']: raise ReviewError('MANIFEST_DIGEST')
def regular_zip(info):
    mode = info.external_attr >> 16
    if info.is_dir() or stat.S_ISLNK(mode) or stat.S_IFMT(mode) not in (0, stat.S_IFREG) or info.flag_bits & 1:
        raise ReviewError('NON_REGULAR_ZIP_ENTRY')
    safe_path(info.filename)
