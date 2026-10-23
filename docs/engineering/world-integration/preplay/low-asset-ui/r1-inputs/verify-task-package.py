#!/usr/bin/env python3
"""Verify the received R1 package only; never edits a repository or installs code."""
from pathlib import Path
import hashlib, json, sys, zipfile
root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent
scope = json.loads((root / "BASELINE-AND-SCOPE.json").read_text(encoding="utf-8"))
expected = set(scope["input_files"])
actual = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
if actual != expected:
    raise SystemExit(f"Package members differ: missing={expected-actual}, extra={actual-expected}")
checks = 0
for line in (root / "SHA256SUMS.txt").read_text(encoding="utf-8").splitlines():
    digest, name = line.split("  ", 1)
    if name not in expected or name == "SHA256SUMS.txt":
        raise SystemExit(f"Unsafe or unexpected manifest member: {name}")
    b = (root / name).read_bytes()
    if hashlib.sha256(b).hexdigest() != digest:
        raise SystemExit(f"Hash mismatch: {name}")
    checks += 1
if checks != len(expected)-1:
    raise SystemExit("Incomplete SHA manifest")
if len(scope["allowed_paths"]) != len(set(scope["allowed_paths"])):
    raise SystemExit("Duplicate scope path")
for name in expected:
    if name.endswith(".zip"):
        with zipfile.ZipFile(root / name) as archive:
            if archive.testzip() is not None:
                raise SystemExit(f"CRC failure: {name}")
            for member in archive.namelist():
                p = Path(member)
                if p.is_absolute() or ".." in p.parts:
                    raise SystemExit(f"Unsafe archive member: {name}/{member}")
print(json.dumps({"status":"PASS","files":len(expected),"sha256":checks,"allowed_paths":len(scope["allowed_paths"]),"start_sha":scope["start_sha"]},ensure_ascii=False))
