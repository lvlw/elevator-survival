#!/usr/bin/env python3
"""Package-only integrity/format checks; no repo modification or gameplay proof."""
from pathlib import Path
import hashlib,json,sys
root=Path(__file__).resolve().parent
base=json.loads((root/'BASELINE-AND-INPUTS.json').read_text(encoding='utf-8'))
expected=set(base['input_files']);actual={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
errors=[]
if expected!=actual:errors.append({'file_set':{'missing':sorted(expected-actual),'extra':sorted(actual-expected)}})
for line in (root/'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
    sha,name=line.split(maxsplit=1);name=name.strip().lstrip('*');p=root/name
    if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=sha:errors.append({'digest':name})
for name in expected:
    p=root/name
    if not p.is_file():continue
    data=p.read_bytes()
    try:text=data.decode('utf-8')
    except UnicodeDecodeError:errors.append({'utf8':name});continue
    if not data.endswith(b'\n') or data.endswith(b'\n\n'):errors.append({'eof':name})
    if any(line.endswith((' ','\t')) for line in text.splitlines()):errors.append({'trailing_whitespace':name})
paths=base['allowed_paths']
if len(paths)!=len(set(paths)) or any(p.startswith('/') or '..' in Path(p).parts for p in paths):errors.append({'unsafe_or_duplicate_paths':True})
print(json.dumps({'kind':'task-package-only-not-repo-audit','files':len(expected),'allowed_paths':len(paths),'errors':errors,'pass':not errors},ensure_ascii=False,indent=2))
sys.exit(1 if errors else 0)
