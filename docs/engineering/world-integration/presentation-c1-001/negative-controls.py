"""C1 semantic mutants, external copied sources only. Never edits repository code."""
from pathlib import Path
import subprocess, hashlib, json, difflib, sys
ROOT = Path(__file__).resolve().parents[4]
candidate, evidence = (Path(p).resolve(strict=True) for p in sys.argv[1:3])
assert not candidate.is_relative_to(ROOT) and not evidence.is_relative_to(ROOT)
hook = 'src/ui/infected-world/presentation/use-committed-presentation.ts'
app = 'src/ui/infected-world/app.tsx'
cue = 'src/ui/infected-world/components/committed-action-cue.tsx'
paths = [hook, app, cue]
originals = {p: (ROOT/p).read_bytes() for p in paths}
assert all((candidate/p).read_bytes() == data for p, data in originals.items())
def run(label, args):
    p = subprocess.run(['npm.cmd', 'run', 'test:run', '--', *args], cwd=candidate, capture_output=True)
    log = p.stdout + p.stderr
    (evidence/(label+'.log')).write_bytes(log)
    return p.returncode, log.decode('utf-8', 'replace')
files = ['src/ui/infected-world/'+p for p in ['committed-presentation.test.tsx', 'committed-presentation-lifecycle.test.tsx', 'committed-presentation-native.integration.test.tsx']]
code, _ = run('negative-positive-control', files)
assert code == 0, 'Positive control failed; no mutant evidence claimed'
mutants = [
 ('N01-duplicate-notification-replay', hook,
  '        const current = owner.getSnapshot()',
  "        const current = owner.getSnapshot()\n        const cached = s.consumer.state().cue\n        if (cached) setCue({ ...cached, phase: 'active', epoch: cached.epoch + 1 })",
  files[0], 'duplicate notifications and React rerenders',
  'Reactivates a cached consumed cue from a subscription; actual duplicate native notifications must leave settled span identity and phase unchanged.'),
 ('N02-stale-feedback-on-loss', app,
  'if (!view || !controls) return <SystemScreen snapshot={snapshot}',
  'if (!view || !controls) return <><div className="iw-committed-cue">防御已执行</div><SystemScreen snapshot={snapshot}',
  files[1], 'real post-commit listener',
  'Equivalent minimal stale-UI sentinel in the true loss branch after actual suspend/dispose; does not pretend the correct consumer has a hidden replay port.'),
 ('N03-timer-dispatches-again', hook,
  '          current.timer = null',
  "          current.timer = null\n          const next = current.owner.getSnapshot().preplay?.view\n          if (next?.status === 'ready' && next.combat) {\n            const action = next.combat.actions.find(a => a.label === '防御')\n            if (action) current.controls.execute({ action: action.selector })\n          }",
  files[1], 'a timer callback has no gameplay path',
  'Actual second legal original controls.execute in the animation callback; real combat/dispatch/current/write counters must remain zero after initial action.'),
 ('N04-two-response-shaped-expansion', cue,
  "<span key={cue?.epoch ?? 'empty'}>{cue ? publicActionCopy[cue.action] : ''}</span>",
  "<span key={cue?.epoch ?? 'empty'}>{cue ? publicActionCopy[cue.action] : ''}</span>{cue && <span>{publicActionCopy[cue.action]}</span>}",
  files[2], 'two genuine native enemy responses',
  'Equivalent minimal two-record expansion, exercised on a genuine decision with exactly two private enemy responses. The correct UI has no private response port; mutation models the forbidden shape, not a newly authorized disclosure.'),
]
results=[]
try:
    for name, path, old, new, test, pattern, meaning in mutants:
        source=originals[path].decode('utf-8'); assert source.count(old)==1, name
        mutated=source.replace(old,new,1)
        if name.startswith('N02'):
            old_end='onSynchronize={() => guarded(() => { owner?.controls()?.synchronize() })} />'
            assert mutated.count(old_end)==1
            mutated=mutated.replace(old_end,old_end+'</>',1)
        patch=''.join(difflib.unified_diff(source.splitlines(True),mutated.splitlines(True),fromfile='a/'+path,tofile='b/'+path))
        (evidence/(name+'.patch')).write_text(patch,encoding='utf-8')
        (candidate/path).write_text(mutated,encoding='utf-8',newline='\n')
        code, log=run(name,[test,'-t',pattern])
        detected=code==1 and 'AssertionError' in log and not any(bad in log for bad in ['SyntaxError','TypeError:','Transform failed','Failed to resolve import','No test files found'])
        results.append({'id':name,'mutatedPath':path,'selector':pattern,'meaning':meaning,'exit':code,'businessAssertionDetected':detected,'patchSHA256':hashlib.sha256(patch.encode()).hexdigest()})
        (candidate/path).write_bytes(originals[path])
        assert detected, name+' did not fail a business assertion'
        print(name, 'BUSINESS_ASSERTION_DETECTED',flush=True)
finally:
    for path,data in originals.items(): (candidate/path).write_bytes(data)
    assert all((ROOT/path).read_bytes()==data for path,data in originals.items()), 'Repository changed'
    (evidence/'negative-controls.json').write_text(json.dumps({'positiveControlExit':code if not results else 0,'mutants':results,'externalCandidateRestored':True,'repositorySourceUnchanged':True,'CLIUnselectedIsNotSourceSkip':True},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert len(results)==4
print('Four independent C1 semantic mutants detected; external sources restored')
