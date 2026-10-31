"""TEST ONLY. Mutate an external candidate copy, never this repository; reject tool failures as detections."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import difflib

root = Path(__file__).resolve().parents[4]
copy = Path(sys.argv[1]).resolve(strict=True)
evidence = Path(sys.argv[2]).resolve(strict=True)
assert not copy.is_relative_to(root) and not evidence.is_relative_to(root)
file = 'src/app/infected-preplay/controller.ts'
source = (root / file).read_text('utf-8')
assert (copy / file).read_text('utf-8') == source
finish = 'return presentation ? Object.freeze({ kind: completed.kind, snapshot: completed.snapshot, presentation }) : completed'
assert source.count(finish) == 1
retry = "retrySave: () => run(() => ({ view: ports.player.retrySave(), committed: false })),"
assert source.count(retry) == 1
life = 'src/app/infected-preplay/committed-presentation-lifecycle.test.ts'
native = 'src/app/infected-preplay/committed-presentation.test.ts'
mutants = {
 'N01-retry-signs-new-token': (source.replace('const issuePresentation = createCommittedPresentationIssuer()',
     "const issuePresentation = createCommittedPresentationIssuer(); let last: PreplayResult['presentation']" )
   .replace('const presentation = issuePresentation(before, executed)', 'const presentation = issuePresentation(before, executed); if (presentation) last = presentation')
   .replace(retry, "retrySave: () => { const r = run(() => ({ view: ports.player.retrySave(), committed: false })); return last ? Object.freeze({ kind: r.kind, snapshot: r.snapshot, presentation: Object.freeze({ ...last, token: Object.freeze({ scope: last.token.scope, ordinal: last.token.ordinal + 1 }) }) }) : r },"), life, 'save failure, continuation'),
 'N02-private-response-count-expands-sequence': (source.replace(finish,
   "return presentation ? Object.freeze({ kind: completed.kind, snapshot: completed.snapshot, presentation: Object.freeze({ ...presentation, sequence: Object.freeze(Array.from({ length: (ports as any).owner.getState().current.battle.decision.enemyResponses || 1 }, () => presentation.sequence[0])) }) }) : completed"), native, 'native eight-defend temporary attack'),
 'N03-reuses-selector-scope': (source.replace(finish,
   "return presentation ? Object.freeze({ kind: completed.kind, snapshot: completed.snapshot, presentation: Object.freeze({ ...presentation, token: Object.freeze({ scope: ports.preplay.scope(), ordinal: presentation.token.ordinal }) }) }) : completed"), life, 'save failure, continuation'),
 'N04-leaks-private-battle-id': (source.replace(finish,
   "return presentation ? Object.freeze({ kind: completed.kind, snapshot: completed.snapshot, presentation: Object.freeze({ ...presentation, privateBattleId: (ports as any).owner.getState().current.battle.entry.id }) }) : completed"), native, 'K01 K02 K04 native basic has exactly one returned record'),
}
cli = root / 'node_modules/vitest/vitest.mjs'
records = []
def run(name, files, pattern=None):
    args = ['node', str(cli), 'run', '--config', str(copy / 'vite.config.ts'), '--root', str(copy), *files]
    if pattern: args += ['-t', pattern]
    p = subprocess.run(args, cwd=copy, capture_output=True)
    raw = p.stdout + p.stderr
    (evidence / (name + '.log')).write_bytes(raw)
    return p, raw.decode('utf-8', errors='replace'), args

positive, output, args = run('negative-positive-control', [life, native])
assert positive.returncode == 0, output
records.append({'id': 'positive-control', 'exit': 0, 'command': args})
for name, (mutant, test, pattern) in mutants.items():
    assert mutant != source
    (copy / file).write_text(mutant, encoding='utf-8', newline='\n')
    diff = ''.join(difflib.unified_diff(source.splitlines(True), mutant.splitlines(True), fromfile='candidate/' + file, tofile=name + '/' + file))
    (evidence / (name + '.patch')).write_text(diff, encoding='utf-8', newline='\n')
    try:
        p, text, args = run(name, [test], pattern)
        forbidden = ['SyntaxError', 'TypeError:', 'ReferenceError', 'Failed to resolve', 'Cannot find module', 'No test files found', 'Unhandled Error']
        detected = p.returncode == 1 and 'AssertionError:' in text and not any(word in text for word in forbidden)
        records.append({'id': name, 'exit': p.returncode, 'businessAssertionDetected': detected,
                        'patchSHA256': hashlib.sha256(diff.encode()).hexdigest(), 'command': args,
                        'targetFile': test, 'targetNamePattern': pattern, 'notSyntaxOrLoadingFailure': not any(word in text for word in forbidden)})
        print(name, 'BUSINESS_ASSERTION_DETECTED' if detected else 'INVALID_DETECTION', flush=True)
        assert detected, text
    finally:
        (copy / file).write_text(source, encoding='utf-8', newline='\n')
        assert (copy / file).read_bytes() == source.encode('utf-8')
        assert (root / file).read_text('utf-8') == source
        (evidence / 'negative-controls.json').write_text(json.dumps({'kind': 'EXTERNAL_TEST_MUTANTS_ONLY', 'records': records,
            'repositorySourceUnchangedByDriver': True, 'externalControllerRestored': True}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('All four independent semantic mutants detected; external candidate restored', flush=True)
