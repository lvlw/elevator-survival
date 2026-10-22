from pathlib import Path
import hashlib, json, sys
root = Path(__file__).resolve().parent
manifest = json.loads((root / 'BASELINE-AND-INPUTS.json').read_text(encoding='utf-8'))
errors = []
for line in (root / 'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
    digest, name = line.split(None, 1)
    p = root / name.strip()
    if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest() != digest:
        errors.append('digest mismatch: ' + name)
paths = manifest['allowed_paths']
if len(paths) != len(set(paths)):
    errors.append('duplicate paths')
for name in manifest['input_files']:
    if not (root / name).is_file():
        errors.append('missing input: ' + name)
    if manifest['archive_directory'] + '/' + name not in paths:
        errors.append('input outside allowed paths: ' + name)
for p in root.rglob('*'):
    if p.is_file():
        text = p.read_text(encoding='utf-8')
        if text.endswith('\n\n') or any(line.endswith((' ', '\t')) for line in text.splitlines()):
            errors.append('new package whitespace: ' + str(p.relative_to(root)))
print(json.dumps({'kind': 'task-package-only-not-repo-audit', 'files': len(manifest['input_files']),
                  'allowed_paths': len(paths), 'pass': not errors, 'errors': errors}, ensure_ascii=False, indent=2))
sys.exit(bool(errors))
