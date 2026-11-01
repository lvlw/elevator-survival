"""Read-only R1 scope/ref proof. Output must be explicitly supplied."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[5]
HERE = Path(__file__).resolve().parent
BASE = 'ba865ea05cedac84d661969992683349cca7a519'
BRANCH = 'feature/world-ui-v1-integration-001'
def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8').strip()
def refs(text):
    return {line.split('|')[0]:line.split('|')[1] for line in text.splitlines() if '|' in line}
def remote(text):
    return {line.split()[1]:line.split()[0] for line in text.splitlines() if len(line.split()) == 2}
parser = argparse.ArgumentParser()
parser.add_argument('--evidence',type=Path,required=True)
parser.add_argument('--remote-after',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args = parser.parse_args()
scope = json.loads((HERE/'inputs/SCOPE.json').read_text(encoding='utf-8'))
assert git('branch','--show-current') == BRANCH
assert git('merge-base',BASE,'HEAD') == BASE
changed = [(row.split('\t')[0],row.split('\t')[-1]) for row in git('diff','--name-status',BASE).splitlines() if row]
changed += [('?',path) for path in git('ls-files','--others','--exclude-standard').splitlines()]
allowed = set(scope['modifyRuntimeExact']+scope['appendOrNarrowTestExact']+scope['optionalAddTests'])
for status,path in changed:
    assert path in allowed or (status in ('A','?') and path.startswith(scope['documentPrefix'])), (status,path)
    assert status not in ('D','R'), (status,path)
protected = ['src/ui/infected-world/ui-v1.css','src/ui/infected-world/styles.css','src/ui/infected-world/app.tsx',
             'src/ui/infected-world/components/content-layer.tsx','src/ui/infected-world/use-browser-owner.ts',
             'src/ui/infected-world/interaction.ts','src/ui/infected-world/presentation/use-committed-presentation.ts',
             'src/ui/infected-world/presentation/committed-consumer.ts','src/ui/infected-world/presentation/approved-enemy-art.ts',
             'src/ui/infected-world/presentation/enemy-art-loader.ts','src/ui/infected-world/presentation/use-enemy-art.ts',
             'package.json','package-lock.json','vite.config.ts','AGENTS.md']
blobs = []
for path in protected:
    expected = git('rev-parse',BASE+':'+path); actual = git('hash-object','--path='+path,path)
    assert expected == actual,path
    blobs.append({'path':path,'baseBlob':expected,'currentBlob':actual})
before = refs((args.evidence/'initial-refs.log').read_text(encoding='utf-8-sig'))
after = refs(git('for-each-ref','--format=%(refname)|%(objectname)|%(symref)|%(upstream)'))
project = {k:v for k,v in before.items() if k.startswith(('refs/heads/','refs/tags/','refs/remotes/')) and k not in ('refs/heads/'+BRANCH,'refs/remotes/origin/'+BRANCH)}
local_changes = {k:{'before':v,'after':after.get(k)} for k,v in project.items() if v != after.get(k)}
remote_before = remote((args.evidence/'remote-before.log').read_text(encoding='utf-8-sig'))
remote_after = remote(args.remote_after.read_text(encoding='utf-8-sig'))
remote_changes = {k:{'before':v,'after':remote_after.get(k)} for k,v in remote_before.items() if k not in ('HEAD','refs/heads/'+BRANCH) and v != remote_after.get(k)}
assert not local_changes,local_changes
assert not remote_changes,remote_changes
manifest = json.loads((HERE/'VISUAL-MANIFEST.json').read_text(encoding='utf-8'))
visual = HERE/'VISUAL-ONLY.zip'; assert hashlib.sha256(visual.read_bytes()).hexdigest() == manifest['zipSHA256']
out = {'base':BASE,'evaluatedHead':git('rev-parse','HEAD'),'parent':git('rev-parse','HEAD^'),'tree':git('rev-parse','HEAD^{tree}'),
       'branch':BRANCH,'scope':'PASS','changedPaths':changed,'protectedExplicitBlobs':blobs,
       'allOtherTrackedFiles':'No changes outside the exact scope; existing assets, core/state/app/saves/expected/CI and prior reports/tests preserved',
       'oldProjectRefs':{'count':len(project),'changed':local_changes},'oldRemoteRefsChanged':remote_changes,
       'hostRefsObservedOnly':{'before':{k:v for k,v in before.items() if k.startswith('refs/codex/')},'after':{k:v for k,v in after.items() if k.startswith('refs/codex/')}},
       'visual':manifest}
args.output.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:out[k] for k in ['base','evaluatedHead','scope','oldProjectRefs','oldRemoteRefsChanged']},ensure_ascii=False))
