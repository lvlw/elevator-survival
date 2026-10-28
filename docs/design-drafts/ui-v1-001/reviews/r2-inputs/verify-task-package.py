#!/usr/bin/env python3
"""Read-only input bundle verification. Run from extracted task package root."""
from pathlib import Path, PurePosixPath
import hashlib
import sys
root = Path(__file__).resolve().parent
errors = []
count = 0
for line in (root / "SHA256SUMS.txt").read_text(encoding="utf-8").splitlines():
    digest, rel = line.split("  ", 1)
    path = PurePosixPath(rel)
    if path.is_absolute() or ".." in path.parts:
        errors.append("Unsafe manifest path: " + rel)
        continue
    file = root / rel
    count += 1
    if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != digest:
        errors.append("Mismatch: " + rel)
print(f"{count} input digests checked; failures={len(errors)}")
for error in errors:
    print(error)
sys.exit(1 if errors else 0)
