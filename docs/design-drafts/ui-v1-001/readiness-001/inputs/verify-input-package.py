#!/usr/bin/env python3
"""Verify the supplied task package; does not touch any project repository."""
from pathlib import Path, PurePosixPath
import hashlib, json, sys

def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent
    sums = root / "SHA256SUMS.txt"
    errors = []
    expected = set()
    for line in sums.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        digest, sep, name = line.partition("  ")
        parts = PurePosixPath(name)
        if not sep or len(digest) != 64 or parts.is_absolute() or ".." in parts.parts or "\\" in name or ":" in name:
            errors.append({"file": name, "reason": "invalid manifest entry"}); continue
        if name in expected:
            errors.append({"file": name, "reason": "duplicate entry"}); continue
        expected.add(name)
        target = root / name
        if target.is_symlink() or not target.is_file() or root not in target.resolve().parents:
            errors.append({"file": name, "reason": "missing or unsafe file"}); continue
        actual = hashlib.sha256(target.read_bytes()).hexdigest()
        if actual != digest:
            errors.append({"file": name, "reason": "hash mismatch", "actual": actual})
    actual_files = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file() and "__pycache__" not in p.parts}
    unexpected = sorted(actual_files - expected - {"SHA256SUMS.txt"})
    if unexpected: errors.append({"reason": "unexpected files", "files": unexpected})
    scope = json.loads((root / "BASELINE-AND-SCOPE.json").read_text("utf-8"))
    if scope["startSha"] != "956da8065030ccea15256e49bd927a4e6a71942f" or scope["createBranch"] != "feature/design-ui-readiness-001":
        errors.append({"reason": "baseline or branch mismatch"})
    if scope["git"]["forcePush"] or scope["server"]["cloudLoginOrModification"]:
        errors.append({"reason": "unexpected expanded authority"})
    print(json.dumps({"task": scope["task"], "checkedFiles": len(expected), "pass": not errors, "errors": errors}, ensure_ascii=False, indent=2))
    return 1 if errors else 0

if __name__ == "__main__":
    raise SystemExit(main())
