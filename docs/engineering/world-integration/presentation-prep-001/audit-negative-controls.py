"""TEST audit only. Requires an already prepared external copy with existing dependencies."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys

workspace = Path(sys.argv[1]).resolve()
evidence = Path(sys.argv[2]).resolve()
repository = Path(__file__).resolve().parents[4]
if workspace == repository or repository in workspace.parents or workspace in repository.parents:
    raise SystemExit('Negative controls require a separate external workspace')
evidence.mkdir(parents=True, exist_ok=True)
node = shutil.which('node')
tests = ['src/state/residence-session/player-opponent-routes.integration.test.ts',
         'src/state/residence-session/player-opponent.test.ts']
command = [node, str(workspace / 'node_modules/vitest/vitest.mjs'), 'run', *tests, '--reporter=verbose']

def run(label):
    result = subprocess.run(command, cwd=workspace, capture_output=True)
    output = result.stdout + result.stderr
    (evidence / (label + '.log')).write_bytes(output)
    return result.returncode, output.decode('utf-8', errors='replace')

rows = []
positive, _ = run('negative-positive-before')
assert positive == 0, 'Positive fixture failed before injections'
mutations = [
    ('location-guess', 'src/state/residence-session/player-opponent.ts',
     'const candidate = labels.opponent?.(value.battle.entry.definitionId)',
     "console.log('NEGATIVE_REACHED_LOCATION')\n  const candidate = labels.opponent?.(value.site?.nodeId === 'H4' ? 'infected-world-porter' : value.battle.entry.definitionId)",
     'NEGATIVE_REACHED_LOCATION'),
    ('private-identifier', 'src/state/residence-session/player-queries.ts',
     'opponent: playerOpponent(v, labels)!',
     "opponent: (console.log('NEGATIVE_REACHED_PRIVATE'), { ...playerOpponent(v, labels)!, definitionId: v.battle!.entry.definitionId })",
     'NEGATIVE_REACHED_PRIVATE'),
]
for label, relative, old, new, marker in mutations:
    path = workspace / relative
    original = path.read_bytes()
    source = original.decode('utf-8')
    assert source.count(old) == 1
    try:
        path.write_text(source.replace(old, new), encoding='utf-8', newline='\n')
        code, output = run('negative-' + label)
        reached = marker in output
        semantic = code != 0 and reached and 'AssertionError' in output
        assert semantic, 'Mutation did not reach a semantic assertion'
        rows.append({'mutation': label, 'path': relative, 'exit': code, 'markerReached': reached,
                     'semanticAssertionDetected': semantic, 'originalSha256': hashlib.sha256(original).hexdigest()})
    finally:
        path.write_bytes(original)
    code, _ = run('negative-' + label + '-restored')
    assert code == 0, 'Restored external copy failed'
    rows[-1]['restoredExit'] = code
result = {'status': 'PASS', 'externalWorkspace': str(workspace), 'positiveExit': positive,
          'command': command, 'mutations': rows, 'repositoryMutation': False}
(evidence / 'negative-controls.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
