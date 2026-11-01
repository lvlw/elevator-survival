"""Read-only checkout/ref admission. Writes only the requested task evidence output."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
BASE = 'c5abeda4861710325a123e8321a314423525f8df'
BRANCH = 'feature/world-ui-v1-integration-001'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8').strip()

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def local_refs(text):
    return {line.split('|')[0]: line.split('|')[1] for line in text.splitlines() if '|' in line}

def remote_refs(text):
    return {line.split()[1]: line.split()[0] for line in text.splitlines() if len(line.split()) == 2}

parser = argparse.ArgumentParser()
parser.add_argument('--external-evidence', type=Path, required=True)
parser.add_argument('--remote-after', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
scope = json.loads((HERE/'inputs/SCOPE.json').read_text(encoding='utf-8'))
assert git('branch', '--show-current') == BRANCH
assert git('merge-base', BASE, 'HEAD') == BASE
changed = git('diff', '--name-status', BASE).splitlines()
tracked = [(line.split('\t')[0], line.split('\t')[-1]) for line in changed if line]
untracked = git('ls-files', '--others', '--exclude-standard').splitlines()
paths = tracked + [('?', path) for path in untracked]
allowed_assets = set(scope['allowedAssetDestinations']) if 'allowedAssetDestinations' in scope else set()
if not allowed_assets:
    for key, value in scope.items():
        if isinstance(value, list) and value and all(isinstance(x, str) for x in value):
            if all(x.startswith('src/assets/') for x in value):
                allowed_assets.update(value)
assert allowed_assets, 'Asset whitelist must be found in the actual input'
violations = []
for status, path in paths:
    is_new = status in ('A', '?')
    valid = path.startswith('src/ui/infected-world/') or (
        is_new and (path.startswith(scope['addDocumentPrefix']) or path in allowed_assets))
    if not valid or path in scope['frozenRuntimeExact'] or status in ('D', 'R'):
        violations.append([status, path])
assert not violations, violations
frozen = []
for path in scope['frozenRuntimeExact']:
    exists_at_base = subprocess.run(['git','cat-file','-e',BASE+':'+path],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode == 0
    if not exists_at_base:
        assert not (ROOT/path).exists(), path
        frozen.append({'path':path,'status':'ABSENT_AT_BASE_AND_CURRENT'})
        continue
    expected = git('rev-parse', BASE+':'+path)
    actual = git('hash-object', '--path='+path, path)
    assert expected == actual, path
    frozen.append({'path': path, 'baseBlob': expected, 'currentBlob': actual})
assets = json.loads((HERE/'adopted-assets.json').read_text(encoding='utf-8'))['assets']
assert len(assets) == 46
for asset in assets:
    source, runtime = ROOT/asset['repositoryPath'], ROOT/asset['runtimePath']
    assert digest(source) == digest(runtime) == asset['sha256'], asset['key']
    assert git('hash-object', str(source)) == asset['gitBlob'], asset['key']
before = local_refs((args.external_evidence/'initial-refs.log').read_text(encoding='utf-8-sig'))
after_text = git('for-each-ref', '--format=%(refname)|%(objectname)|%(symref)|%(upstream)')
after = local_refs(after_text)
old_project = {k:v for k,v in before.items() if k.startswith(('refs/heads/', 'refs/tags/', 'refs/remotes/'))
               and k not in ('refs/heads/'+BRANCH, 'refs/remotes/origin/'+BRANCH)}
local_changes = {k: {'before':v, 'after':after.get(k)} for k,v in old_project.items() if after.get(k) != v}
assert not local_changes, local_changes
remote_before = remote_refs((args.external_evidence/'remote-before.log').read_text(encoding='utf-8-sig'))
remote_after = remote_refs(args.remote_after.read_text(encoding='utf-8-sig'))
remote_changes = {k:{'before':v, 'after':remote_after.get(k)} for k,v in remote_before.items()
                  if k != 'refs/heads/'+BRANCH and remote_after.get(k) != v}
assert not remote_changes, remote_changes
out = {
    'base': BASE, 'baseTree': git('rev-parse', BASE+'^{tree}'),
    'evaluatedHead': git('rev-parse', 'HEAD'), 'parent': git('rev-parse', 'HEAD^'),
    'tree': git('rev-parse', 'HEAD^{tree}'), 'branch': BRANCH,
    'scope': 'PASS', 'checkedChangedPaths': paths, 'frozenRuntime': frozen,
    'assets': {'count':46, 'exactSourceAndRuntimeSha256':'PASS',
               'copied':sum(not x['reusedIdenticalRuntimeBlob'] for x in assets),
               'reused':sum(x['reusedIdenticalRuntimeBlob'] for x in assets)},
    'oldProjectRefsCount':len(old_project), 'oldProjectRefsChanged':local_changes,
    'oldRemoteRefsCount':len(remote_before), 'oldRemoteRefsChanged':remote_changes,
    'hostInternalRefs': {'policy':'OBSERVE_ONLY', 'before':{k:v for k,v in before.items() if k.startswith('refs/codex/')},
                        'after':{k:v for k,v in after.items() if k.startswith('refs/codex/')}},
    'note':'Git filtered blobs account for checkout CRLF; original PNG hashes compare exact bytes. No fetch/ref write is performed.'
}
args.output.write_text(json.dumps(out, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({k:out[k] for k in ['evaluatedHead','scope','assets','oldProjectRefsCount','oldProjectRefsChanged','oldRemoteRefsChanged']},ensure_ascii=False))
