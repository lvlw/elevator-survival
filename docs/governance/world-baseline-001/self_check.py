"""Read-only scope, append, source, syntax, links and protected-index checks."""
from pathlib import Path
import ast
import hashlib
import json
import re
import subprocess
import sys
from governance_checks import BASE, BRANCH, DOCS, APPEND_ONLY, assert_scope, assert_append, distinct

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
evidence = Path(sys.argv[1]).resolve()
def git(*args):
    return subprocess.check_output(['git', '-c', 'core.quotepath=false', *args], cwd=root)
assert git('branch', '--show-current').decode().strip() == BRANCH
assert git('rev-parse', 'HEAD').decode().strip() == BASE, 'Precommit check requires exact base HEAD'
base_rows = {}
for row in git('ls-tree', '-rz', BASE).split(b'\0'):
    if not row:
        continue
    meta, name = row.split(b'\t')
    mode, kind, sha = meta.decode().split()
    base_rows[name.decode()] = {'mode': mode, 'object': sha, 'kind': kind}
index_rows = {}
for row in git('ls-files', '--stage', '-z').split(b'\0'):
    if not row:
        continue
    meta, name = row.split(b'\t')
    mode, sha, stage = meta.decode().split()
    assert stage == '0', 'Unmerged index'
    index_rows[name.decode()] = {'mode': mode, 'object': sha}
changed = git('diff', '--name-only', '-z', BASE).split(b'\0')
untracked = git('ls-files', '--others', '--exclude-standard', '-z').split(b'\0')
paths = sorted({x.decode() for x in changed + untracked if x})
assert_scope(paths, 'docs/governance/README.md' in base_rows)
assert all((root / p).is_file() and not (root / p).is_symlink() for p in paths)
prefixes = json.loads((evidence / 'append-prefix-before.json').read_text('utf-8-sig'))
prefix_receipts = []
for item in prefixes:
    data = (root / item['path']).read_bytes()
    original = data[:item['originalBytes']]
    assert hashlib.sha256(original).hexdigest() == item['originalSHA256']
    base_data = git('show', BASE + ':' + item['path'])
    assert_append(base_data.replace(b'\r\n', b'\n'), data.replace(b'\r\n', b'\n'))
    assert data.count(b'## '+ ('新世界开发检查点'.encode() if item['path'] == 'README.md' else '当前总账索引'.encode())) == 1
    prefix_receipts.append({**item, 'prefixPreserved': True, 'normalizedBasePrefixPreserved': True})
protected = []
for path, row in base_rows.items():
    if path in APPEND_ONLY:
        continue
    assert index_rows.get(path) == {'mode': row['mode'], 'object': row['object']}, path
    protected.append({'path': path, **row})
assert subprocess.run(['git', 'diff', '--quiet', BASE, '--', '.',
                       *[':(exclude)' + p for p in APPEND_ONLY],
                       ':(exclude)docs/governance/world-baseline-001',
                       ':(exclude)docs/governance/README.md'], cwd=root).returncode == 0
whole_whitespace = subprocess.run(['git', 'diff', '--check', BASE], cwd=root, capture_output=True)
(evidence / 'diff-check-full.log').write_bytes(whole_whitespace.stdout + whole_whitespace.stderr)
assert whole_whitespace.returncode in (0, 2), 'Unexpected git whitespace check failure'
if whole_whitespace.returncode:
    warnings = [line for line in whole_whitespace.stdout.decode('utf-8').splitlines()
                if re.match(r'^.+:\d+: ', line)]
    assert warnings and all(line.startswith(DOCS + 'inputs/') for line in warnings), warnings
assert subprocess.run(['git', 'diff', '--check', BASE, '--', '.',
                       ':(exclude)docs/governance/world-baseline-001/inputs'], cwd=root).returncode == 0
sources = json.loads((out / 'source-index.json').read_text('utf-8'))['sources']
for entry in sources:
    data = (root / entry['path']).read_bytes()
    assert len(data) == entry['bytes'] and hashlib.sha256(data).hexdigest() == entry['sha256'], entry['path']
    if entry['gitBlobAtBase']:
        assert git('rev-parse', BASE + ':' + entry['path']).decode().strip() == entry['gitBlobAtBase']
syntax = []
for path in sorted(out.glob('*.py')):
    ast.parse(path.read_text('utf-8'), filename=str(path))
    syntax.append(path.name)
json_files = []
for path in sorted(out.rglob('*.json')):
    json.loads(path.read_text('utf-8-sig'))
    json_files.append(path.relative_to(out).as_posix())
links = []
docs = [(p, p.read_text('utf-8')) for p in sorted(out.glob('*.md'))]
docs += [(root / 'docs/governance/README.md', (root / 'docs/governance/README.md').read_text('utf-8'))]
for item in prefixes:
    p = root / item['path']
    docs.append((p, p.read_bytes()[item['originalBytes']:].decode('utf-8')))
for path, text in docs:
    for link in re.findall(r'\[[^\]]*\]\(([^)]+)\)', text):
        if '://' in link or link.startswith('#'):
            continue
        target = (path.parent / link.split('#')[0]).resolve()
        assert target.is_relative_to(root) and target.exists(), (path, link)
        links.append({'from': path.relative_to(root).as_posix(), 'target': target.relative_to(root).as_posix()})
distinct(paths)
result = {'status': 'PASS', 'baseSHA': BASE, 'branch': BRANCH, 'scope': paths,
          'protectedUnchangedObjectCount': len(protected), 'protectedObjects': protected,
          'appendReceipts': prefix_receipts, 'sourceDigestsChecked': len(sources),
          'pythonASTChecked': syntax, 'jsonParsed': json_files, 'newBodyLocalLinks': links,
          'oldDocumentLinksNotReaudited': True,
          'diffCheckExit': whole_whitespace.returncode, 'newBodyWhitespaceExit': 0,
          'originalInputWhitespaceExceptionOnly': bool(whole_whitespace.returncode),
          'newBodyWhitespaceCheck': 'Final staged check additionally covers new untracked text',
          'notIndependentMainlineAcceptance': True}
(evidence / 'precommit-self-check.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: v for k, v in result.items() if k not in ['protectedObjects', 'newBodyLocalLinks', 'scope', 'jsonParsed']}, ensure_ascii=False))
