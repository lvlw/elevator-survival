#!/usr/bin/env python3
"""Verify this task input package, not a future design delivery."""
from __future__ import annotations
import hashlib
import json
import struct
from pathlib import Path, PurePosixPath


def main() -> int:
    root=Path(__file__).resolve().parent
    failures=[]; count=0; listed=set()
    for row in (root/'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
        if not row.strip():
            continue
        digest, name=row.split('  ',1)
        pp=PurePosixPath(name)
        if pp.is_absolute() or '..' in pp.parts or name in listed:
            failures.append('invalid or repeated manifest path: '+name); continue
        listed.add(name); p=root/name
        if p.is_symlink() or not p.is_file():
            failures.append('missing/linked file: '+name); continue
        count+=1
        if hashlib.sha256(p.read_bytes()).hexdigest()!=digest:
            failures.append('sha256: '+name)
    actual={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='SHA256SUMS.txt'}
    if actual!=listed:
        failures.append('inventory difference: '+repr(sorted(actual^listed)))
    refs=json.loads((root/'references/manifest.json').read_text(encoding='utf-8'))
    for ref in refs:
        raw=(root/ref['file']).read_bytes(); count+=1
        if len(raw)!=ref['bytes'] or hashlib.sha256(raw).hexdigest()!=ref['sha256']:
            failures.append('reference bytes: '+ref['file'])
        if raw[:8]!=b'\x89PNG\r\n\x1a\n' or list(struct.unpack('>II',raw[16:24]))!=ref['pixels']:
            failures.append('reference dimensions: '+ref['file'])
    result={'kind':'TASK_PACKAGE_INPUT_INTEGRITY_ONLY','pass':not failures,'checks':count,'failures':failures}
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 0 if not failures else 1

if __name__=='__main__':
    raise SystemExit(main())
