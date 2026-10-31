#!/usr/bin/env python3
"""Verify this governance task directory or ZIP, without extracting or executing it.

Only package integrity is checked; this is not repository, gameplay or art approval.
Python 3.9+; standard library only.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import stat
import sys
import zipfile
from pathlib import Path
from typing import Any, Dict

MAX_BYTES = 32 * 1024 * 1024
META = {'PACKAGE-MANIFEST.json', 'SHA256SUMS.txt'}


def fail(message: str) -> None:
    raise ValueError(message)


def safe_name(name: str) -> str:
    if not name or '\\' in name or '\x00' in name or ':' in name or name.startswith('/'):
        fail('UNSAFE_PATH: ' + repr(name))
    parts = name.split('/')
    if any(x in ('', '.', '..') or x.rstrip(' .') != x for x in parts):
        fail('UNSAFE_PATH: ' + repr(name))
    return name


def distinct(names: list[str]) -> None:
    folded: set[str] = set()
    for name in names:
        key = safe_name(name).casefold()
        if key in folded:
            fail('DUPLICATE_PATH: ' + name)
        folded.add(key)


def strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            fail('DUPLICATE_JSON_KEY: ' + key)
        result[key] = value
    return result


def load_bytes(target: Path) -> Dict[str, bytes]:
    if target.is_symlink():
        fail('SYMLINK_TARGET')
    data: Dict[str, bytes] = {}
    total = 0
    if target.is_file():
        with zipfile.ZipFile(target) as z:
            entries = z.infolist()
            distinct([i.filename for i in entries])
            for i in entries:
                mode = i.external_attr >> 16
                if i.is_dir() or stat.S_ISLNK(mode) or (stat.S_IFMT(mode) not in (0, stat.S_IFREG)):
                    fail('NON_REGULAR_ZIP_ENTRY: ' + i.filename)
                if i.flag_bits & 1:
                    fail('ENCRYPTED_ZIP_ENTRY: ' + i.filename)
                total += i.file_size
                if total > MAX_BYTES:
                    fail('PACKAGE_SIZE_LIMIT')
                # Reading checks the ZIP CRC. No file is ever extracted.
                data[i.filename] = z.read(i)
    elif target.is_dir():
        root = target.resolve()
        paths = sorted(target.rglob('*'))
        for p in paths:
            if p.is_symlink():
                fail('SYMLINK_ENTRY: ' + str(p.relative_to(target)))
            if p.is_dir():
                continue
            if not p.is_file():
                fail('NON_REGULAR_ENTRY: ' + str(p))
            p.resolve().relative_to(root)
            name = safe_name(p.relative_to(target).as_posix())
            total += p.stat().st_size
            if total > MAX_BYTES:
                fail('PACKAGE_SIZE_LIMIT')
            data[name] = p.read_bytes()
        distinct(list(data))
    else:
        fail('TARGET_NOT_FOUND')
    return data


def verify(target: Path) -> dict[str, Any]:
    data = load_bytes(target)
    if not META.issubset(data):
        fail('MISSING_PACKAGE_METADATA')
    manifest = json.loads(data['PACKAGE-MANIFEST.json'].decode('utf-8'), object_pairs_hook=strict_object)
    if manifest.get('formatVersion') != 1 or manifest.get('taskId') != 'GOV-WORLD-BASELINE-001':
        fail('WRONG_MANIFEST_IDENTITY')
    members = manifest.get('payloads')
    if not isinstance(members, list):
        fail('INVALID_PAYLOAD_LIST')
    distinct([m['path'] for m in members])
    names = {m['path'] for m in members}
    if names & META:
        fail('CIRCULAR_MANIFEST_PAYLOAD')
    expected = names | META
    if set(data) != expected:
        fail('FILE_SET_MISMATCH: ' + json.dumps({'missing': sorted(expected-set(data)), 'extra': sorted(set(data)-expected)}, ensure_ascii=False))
    for member in members:
        name = member['path']
        content = data[name]
        if type(member['bytes']) is not int or member['bytes'] != len(content):
            fail('SIZE_MISMATCH: ' + name)
        if hashlib.sha256(content).hexdigest() != member['sha256']:
            fail('SHA256_MISMATCH: ' + name)
        blob = hashlib.sha1(b'blob ' + str(len(content)).encode('ascii') + b'\0' + content).hexdigest()
        if blob != member['gitBlobSha1']:
            fail('BLOB_MISMATCH: ' + name)
    sums: dict[str, str] = {}
    for line in data['SHA256SUMS.txt'].decode('utf-8').splitlines():
        match = re.fullmatch(r'([0-9a-f]{64})  (.+)', line)
        if not match:
            fail('INVALID_SHA256SUMS_LINE')
        digest, name = match.groups()
        safe_name(name)
        if name in sums:
            fail('DUPLICATE_SHA256SUMS_MEMBER: ' + name)
        sums[name] = digest
    if set(sums) != expected - {'SHA256SUMS.txt'}:
        fail('SHA256SUMS_FILE_SET_MISMATCH')
    for name, digest in sums.items():
        if hashlib.sha256(data[name]).hexdigest() != digest:
            fail('SHA256SUMS_MISMATCH: ' + name)
    return {'kind':'TASK_PACKAGE_INTEGRITY_ONLY', 'pass':True,
            'taskId':manifest['taskId'], 'payloadFiles':len(members), 'totalFiles':len(data),
            'uncompressedBytes':sum(map(len,data.values())),
            'repositoryTestsRun':False, 'artApproval':False}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('target', nargs='?', type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    try:
        result = verify(args.target)
    except (OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile, RuntimeError) as exc:
        print(json.dumps({'kind':'TASK_PACKAGE_INTEGRITY_ONLY', 'pass':False, 'error':str(exc)}, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
