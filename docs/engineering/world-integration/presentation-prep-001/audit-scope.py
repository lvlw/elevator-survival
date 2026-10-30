"""Read-only repository/path/old-source audit; writes only requested evidence JSON/logs."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

root = Path(__file__).resolve().parents[4]
docs = Path(__file__).resolve().parent
evidence = Path(sys.argv[1]).resolve()
evidence.mkdir(parents=True, exist_ok=True)
scope = json.loads((docs / 'inputs/BASELINE-AND-SCOPE.json').read_text('utf-8'))
base = scope['baseSHA']
allowed = set(scope['existingProductionMayModify'] + scope['newProductionMayAdd'] + scope['newTestsAndTestOnlyHelpersMayAdd'])

def git(*args):
    return subprocess.check_output(['git', '-c', 'core.quotepath=false', *args], cwd=root)

branch = git('branch', '--show-current').decode().strip()
assert branch == scope['newBranch']
changed = set(git('diff', '--name-only', base).decode().splitlines())
untracked = set(git('ls-files', '--others', '--exclude-standard').decode().splitlines())
paths = sorted(changed | untracked)
violations = [p for p in paths if p not in allowed and not p.startswith(scope['newDocumentationSubtree'])]
assert not violations, violations
tree = git('ls-tree', '-r', '-z', base).split(b'\0')
source_rows = []
for entry in tree:
    if not entry:
        continue
    metadata, path_bytes = entry.split(b'\t', 1)
    path = path_bytes.decode('utf-8')
    if path.startswith('src/') and path not in scope['existingProductionMayModify']:
        source_rows.append((path, metadata.decode().split()[2]))
# Batch only text source objects; no images, historical screenshots or real saves.
batch = subprocess.check_output(['git', 'cat-file', '--batch'], cwd=root,
                                input=('\n'.join(blob for _, blob in source_rows) + '\n').encode())
offset, audited = 0, []
for path, blob in source_rows:
    end = batch.index(b'\n', offset)
    header = batch[offset:end].decode().split()
    size = int(header[2]); old = batch[end + 1:end + 1 + size]; offset = end + 2 + size
    current = (root / path).read_bytes()
    same = current == old
    checkout_eol_only = not same and current.replace(b'\r\n', b'\n') == old.replace(b'\r\n', b'\n')
    assert same or checkout_eol_only, path
    audited.append({'path': path, 'gitBlobAtBase': blob, 'worktreeSha256': hashlib.sha256(current).hexdigest(),
                    'comparison': 'BYTE_IDENTICAL' if same else 'CHECKOUT_EOL_ONLY'})
checks = []
for label, args in [
    ('ordinary', ['diff', '--check']), ('cached', ['diff', '--cached', '--check']),
    ('base-to-working', ['diff', base, '--check']),
    ('historical-W02', ['diff', 'ff2b79f332c5ea2bec493eb5e166dcee6ba667eb', '--check']),
    ('historical-W01-W02', ['diff', '8c19ca0d28058cf743b41c8547cc2629c8eac767', '--check']),
]:
    result = subprocess.run(['git', *args], cwd=root, capture_output=True)
    (evidence / ('diff-check-' + label + '.log')).write_bytes(result.stdout + result.stderr)
    checks.append({'label': label, 'command': ['git', *args], 'exit': result.returncode,
                   'warningLocations': [line for line in result.stdout.decode('utf-8', errors='replace').splitlines()
                                        if 'trailing whitespace.' in line or 'blank line at EOF.' in line]})
assert all(r['exit'] == 0 for r in checks[:3])
assert len(checks[3]['warningLocations']) == 1 and len(checks[4]['warningLocations']) == 8
# Existing tracked files outside the four allowed modifications must have no Git diff.
protected_diff = git('diff', '--name-only', base, '--', '.', *[':(exclude)' + p for p in allowed],
                     ':(exclude)' + scope['newDocumentationSubtree']).decode().splitlines()
assert not protected_diff, protected_diff
result = {'status': 'PASS', 'branch': branch, 'baseSHA': base, 'changedPaths': paths,
          'outOfScope': violations, 'oldSourceCount': len(audited), 'oldSources': audited,
          'existingNonSourceProtectedGitDiff': protected_diff, 'checks': checks,
          'note': 'Initial tracked tree/index were clean. No protected file was edited; checkout EOL conversions are classified explicitly.'}
(evidence / 'scope-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': 'PASS', 'changedPaths': len(paths), 'oldSourceCount': len(audited), 'checks': checks}, ensure_ascii=False))
