"""Read-only Git census from actual objects and saved fresh ls-remote output."""
from pathlib import Path
import json
import subprocess
import sys
from governance_checks import BASE, BRANCH, CHECKPOINT

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
evidence = Path(sys.argv[1]).resolve()

def git(*args):
    return subprocess.check_output(['git', '-c', 'core.quotepath=false', *args], cwd=root).decode('utf-8').strip()

expected = json.loads((out / 'inputs/BRANCH-REGISTER.json').read_text('utf-8'))
remote = dict((row.split()[1].removeprefix('refs/heads/'), row.split()[0])
              for row in (evidence / 'remote-heads-before.log').read_text('utf-8-sig').splitlines() if row.strip())
supplied = {r['name']: r['sha'] for r in expected['branches']}
changes = [{'name': name, 'inputSHA': sha, 'liveSHA': remote.get(name)}
           for name, sha in supplied.items() if remote.get(name) != sha]
extra = {name: sha for name, sha in remote.items() if name not in supplied}
if remote.get(CHECKPOINT) != BASE:
    raise ValueError('Fixed baseline mismatch; do not change it')
rows = []
for name, sha in sorted(remote.items()):
    subprocess.check_call(['git', 'cat-file', '-e', sha + '^{commit}'], cwd=root)
    result = subprocess.run(['git', 'merge-base', '--is-ancestor', sha, BASE], cwd=root)
    if result.returncode not in (0, 1):
        raise RuntimeError('merge-base program failure, not a nonancestor')
    behind = int(git('rev-list', '--count', sha + '..' + BASE))
    outside = int(git('rev-list', '--count', BASE + '..' + sha))
    classification = ('legacy-default-retain' if name == 'main' else 'fixed-checkpoint-readonly' if name == CHECKPOINT else
                      'audited-A-stop' if name == 'feature/world-presentation-prep-001' else 'historical-checkpoint-retain')
    rows.append({'name': name, 'sha': sha, 'classification': classification,
                 'ancestorOfBase': result.returncode == 0, 'ancestorExit': result.returncode,
                 'commitsBehindBase': behind, 'uniqueCommitsOutsideBase': outside,
                 'inputSnapshotMatches': supplied.get(name) == sha, 'serverEnforcedFreeze': 'NOT_VERIFIED_THIS_EXECUTION'})
locals_ = []
for line in git('for-each-ref', '--format=%(refname:short)|%(objectname)|%(upstream)', 'refs/heads').splitlines():
    name, sha, upstream = line.split('|')
    known_remote = remote.get(name)
    item = {'name': name, 'sha': sha, 'upstream': upstream or None,
            'withoutUpstream': not bool(upstream), 'sameNameRemoteSHA': known_remote}
    if upstream:
        item['aheadOfConfiguredUpstream'] = int(git('rev-list', '--count', upstream + '..' + sha))
        item['behindConfiguredUpstream'] = int(git('rev-list', '--count', sha + '..' + upstream))
    if known_remote:
        item['unpublishedVsLiveSameName'] = int(git('rev-list', '--count', known_remote + '..' + sha))
        item['behindLiveSameName'] = int(git('rev-list', '--count', sha + '..' + known_remote))
    else:
        item['unpublishedVsLiveSameName'] = 'NO_SAME_NAME_REMOTE; retain, never infer safe deletion'
    locals_.append(item)
tags = (evidence / 'remote-tags.log').read_text('utf-8-sig').splitlines()
result = {'task': 'GOV-WORLD-BASELINE-001', 'baseSHA': BASE, 'baseTree': git('rev-parse', BASE + '^{tree}'),
          'branch': BRANCH, 'remoteQuery': 'git ls-remote --heads origin; exit 0',
          'remoteCount': len(rows), 'inputSnapshotDifferences': changes, 'extraRemoteHeads': extra,
          'branches': rows, 'localBranches': locals_, 'remoteTags': {'queryExit': 0, 'rows': tags,
          'statement': 'No tags returned at this query time' if not tags else 'Tags listed read-only'},
          'worktrees': (evidence / 'initial-worktrees.log').read_text('utf-8-sig'),
          'logicalArchiveOnly': True, 'baselineRefCreatedOrMovedByThisTask': False}
(out / 'branch-register.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'remoteHeads': len(rows), 'differences': changes, 'extraHeads': extra,
                  'allAncestors': all(r['ancestorOfBase'] for r in rows),
                  'localBranches': len(locals_), 'withoutUpstream': sum(r['withoutUpstream'] for r in locals_),
                  'localUnpublished': [r['name'] for r in locals_ if isinstance(r.get('unpublishedVsLiveSameName'), int) and r['unpublishedVsLiveSameName'] > 0],
                  'remoteTags': len(tags)}, ensure_ascii=False))
