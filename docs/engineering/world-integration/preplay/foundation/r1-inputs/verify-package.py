#!/usr/bin/env python3
"""Package byte/scope/whitespace preflight; no repository writes."""
import hashlib,json,sys
from pathlib import Path
p=Path(sys.argv[1] if len(sys.argv)>1 else __file__).resolve()
if p.is_file():p=p.parent
m=json.loads((p/'BASELINE-AND-SCOPE.json').read_text(encoding='utf-8'))
assert len(m['allowed_paths'])==m['allowed_path_count']==len(set(m['allowed_paths']))
assert sorted(m['package_files'])==sorted(str(f.relative_to(p)).replace('\\','/') for f in p.rglob('*') if f.is_file())
for line in (p/'SHA256SUMS.txt').read_text().splitlines():
 h,n=line.split('  ',1);assert hashlib.sha256((p/n).read_bytes()).hexdigest()==h,n
for n in m['package_files']:
 b=(p/n).read_bytes();s=b.decode('utf-8');assert not b.startswith(b'\xef\xbb\xbf'),n
 assert s.endswith('\n') and not s.endswith('\n\n'),n
 assert all(line==line.rstrip(' \t') for line in s.splitlines()),n
print('PASS: all supplied hashes, exact package file set, unique whitelist and clean new text')
