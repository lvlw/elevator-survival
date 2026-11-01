"""TEST ONLY: three semantic negative controls; byte-exact restoration in finally.
No core, protocol, save, expected, original art or protected ref is written.
"""
import hashlib
import json
import pathlib
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parents[4]
evidence = pathlib.Path(sys.argv[1]).resolve()
if not evidence.is_dir():
    raise RuntimeError('Existing task evidence directory required')
cases = [
    ('wrong-public-scene', 'src/ui/infected-world/assets.ts',
     "'医院/药房': { key: '医院/药房', src: art4,", "'医院/药房': { key: '医院/药房', src: art3,",
     'src/ui/infected-world/ui-v1-assets.test.ts'),
    ('stale-item-substitution', 'src/ui/infected-world/components/item-inspection.tsx',
     'const item = selection ? [...view.carried, ...view.ground].find(candidate => candidate.selector === selection.selector) : null',
     'const item = selection ? ([...view.carried, ...view.ground].find(candidate => candidate.selector === selection.selector) ?? view.carried[0]) : null',
     'src/ui/infected-world/ui-v1-items.test.tsx'),
    ('readonly-map-dispatch', 'src/ui/infected-world/components/game-shell.tsx',
     '<KnowledgeMap map={view.map} />',
     '<div onClick={() => { if (view.move.options[0]) onAction(view.move.options[0]) }}><KnowledgeMap map={view.map} /></div>',
     'src/ui/infected-world/ui-v1-map.test.tsx'),
]
results = []
for name, relative, old, new, test in cases:
    path = root / relative
    original = path.read_bytes()
    text = original.decode('utf-8')
    if text.count(old) != 1:
        raise RuntimeError('Negative control anchor must be unique: ' + name)
    digest = hashlib.sha256(original).hexdigest()
    backup = evidence / (name + '.source-backup')
    backup.write_bytes(original)
    log = evidence / (name + '.log')
    try:
        path.write_bytes(text.replace(old, new).encode('utf-8'))
        with log.open('wb') as stream:
            result = subprocess.run(['cmd.exe', '/d', '/c', 'npm run test:run -- --maxWorkers=1 ' + test], cwd=root, stdout=stream, stderr=subprocess.STDOUT, timeout=120)
        output = log.read_text(encoding='utf-8', errors='replace')
        semantic = result.returncode != 0 and 'AssertionError' in output and 'Test Files' in output
        results.append({'case': name, 'path': relative, 'test': test, 'exitCode': result.returncode, 'semanticAssertionFailed': semantic, 'originalSHA256': digest})
        if not semantic:
            raise RuntimeError('Expected a real assertion failure, not a compiler/tool failure: ' + name)
    finally:
        path.write_bytes(original)
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise RuntimeError('Restoration failed: ' + name)
        if results and results[-1]['case'] == name:
            results[-1]['byteExactRestored'] = True
    print(name + ': semantic FAIL observed; original bytes restored')
(evidence / 'negative-controls.json').write_text(json.dumps({'cases': results}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
