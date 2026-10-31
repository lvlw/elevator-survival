"""Governance-only validation. Never imported by the game or used as approval authority."""
from pathlib import PurePosixPath
import hashlib
import stat

BASE = 'a7f0f153ef1de7ad88377b1ff903d7e5404d3ea0'
BRANCH = 'chore/world-baseline-governance-001'
CHECKPOINT = 'baseline/world-pre-b1-20261031'
DOCS = 'docs/governance/world-baseline-001/'
APPEND_ONLY = {'README.md', 'docs/08-rule-implementation-traceability.md',
               'docs/design-drafts/world-infected-001/10-decision-queue.md'}

class GovernanceError(ValueError):
    pass

def safe_path(name):
    if not isinstance(name, str) or not name or '\\' in name or ':' in name or '\0' in name:
        raise GovernanceError('UNSAFE_PATH')
    p = PurePosixPath(name)
    if p.is_absolute() or any(x in ('', '.', '..') or x.rstrip(' .') != x for x in name.split('/')):
        raise GovernanceError('UNSAFE_PATH')
    return name

def distinct(names):
    seen = set()
    for name in names:
        folded = safe_path(name).casefold()
        if folded in seen:
            raise GovernanceError('DUPLICATE_PATH')
        seen.add(folded)

def assert_preserved_refs(before, after):
    for name, sha in before.items():
        if after.get(name) != sha:
            raise GovernanceError('OLD_REF_CHANGED: ' + name)

def assert_append(original, current):
    if not current.startswith(original):
        raise GovernanceError('HISTORY_PREFIX_CHANGED')

def assert_scope(paths, governance_readme_existed=False):
    for name in paths:
        safe_path(name)
        if name.startswith(DOCS) or name in APPEND_ONLY:
            continue
        if name == 'docs/governance/README.md' and not governance_readme_existed:
            continue
        raise GovernanceError('OUT_OF_SCOPE: ' + name)

def blob(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode('ascii') + b'\0' + data).hexdigest()

def verify_payloads(data, rows):
    distinct([r['path'] for r in rows])
    if set(data) != {r['path'] for r in rows}:
        raise GovernanceError('MANIFEST_FILE_SET')
    for row in rows:
        value = data[row['path']]
        if len(value) != row['bytes'] or hashlib.sha256(value).hexdigest() != row['sha256']:
            raise GovernanceError('MANIFEST_DIGEST')

def assert_regular_zip(info):
    mode = info.external_attr >> 16
    if info.is_dir() or stat.S_ISLNK(mode) or stat.S_IFMT(mode) not in (0, stat.S_IFREG) or info.flag_bits & 1:
        raise GovernanceError('NON_REGULAR_ZIP_ENTRY')
    safe_path(info.filename)
