#!/usr/bin/env python3
"""Verify this task package only; no repository, network or installed packages required."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import sys

def run() -> int:
    root = Path(__file__).resolve().parent
    try:
        manifest = json.loads((root / "PACKAGE-MANIFEST.json").read_text("utf-8"))
        rows = manifest["files"]
        names = [row["path"] for row in rows]
        if len(names) != len(set(names)):
            raise ValueError("duplicate manifest path")
        for row in rows:
            name = row["path"]
            rel = PurePosixPath(name)
            if (not name or rel.is_absolute() or "\\" in name or ":" in name
                    or any(part in ("", ".", "..") for part in name.split("/"))):
                raise ValueError("unsafe path: " + name)
            path = root / name
            if path.is_symlink() or not path.resolve().is_relative_to(root):
                raise ValueError("path escape: " + name)
            data = path.read_bytes()
            if len(data) != row["bytes"] or hashlib.sha256(data).hexdigest() != row["sha256"]:
                raise ValueError("size/hash mismatch: " + name)
            if data.startswith(b"\xef\xbb\xbf"):
                raise ValueError("unexpected BOM: " + name)
            text = data.decode("utf-8")
            if not text.endswith("\n") or text.endswith("\n\n"):
                raise ValueError("single final newline required: " + name)
            if any(line.rstrip(" \t") != line for line in text.splitlines()):
                raise ValueError("trailing whitespace: " + name)
        actual = {p.relative_to(root).as_posix() for p in root.rglob("*")
                  if p.is_file() and "__pycache__" not in p.parts}
        expected = set(names) | {"PACKAGE-MANIFEST.json", "SHA256SUMS.txt"}
        if actual != expected:
            raise ValueError("package member mismatch: " + repr(sorted(actual ^ expected)))
        sums = (root / "SHA256SUMS.txt").read_text("utf-8")
        expected_sums = "".join(r["sha256"] + "  " + r["path"] + "\n" for r in rows)
        if sums != expected_sums:
            raise ValueError("SHA256SUMS mismatch")
        scope = json.loads((root / "BASELINE-AND-SCOPE.json").read_text("utf-8"))
        assert scope["baseSHA"] == "723d547665298463ecd8a8d04c7ed508a1658dc1"
        assert scope["newBranch"] == "feature/world-presentation-prep-001"
        print(json.dumps({"status": "PASS", "payload_files": len(rows),
                          "task": manifest["task"], "baseSHA": scope["baseSHA"]},
                         ensure_ascii=False))
        return 0
    except (OSError, ValueError, KeyError, AssertionError) as error:
        print(json.dumps({"status": "FAIL", "error": str(error)}, ensure_ascii=False))
        return 1

if __name__ == "__main__":
    sys.exit(run())
