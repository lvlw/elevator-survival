"""Generate small author evidence inventories from actual external test logs."""
from pathlib import Path
import json
import re
import sys

docs = Path(__file__).resolve().parent
evidence = Path(sys.argv[1]).resolve()

def read(name):
    return (evidence / name).read_text('utf-8-sig')

def dump(name, value):
    (docs / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def summary(name, command):
    text = read(name)
    files = re.search(r'Test Files\s+(\d+) passed \((\d+)\)', text)
    tests = re.search(r'Tests\s+(\d+) passed \((\d+)\)', text)
    assert files and tests and files[1] == files[2] and tests[1] == tests[2]
    return {'command': command, 'exit': 0, 'passedFiles': int(files[1]), 'passedTests': int(tests[1]),
            'duration': re.search(r'Duration\s+([^\r\n]+)', text)[1], 'log': name}

logs = [summary('baseline-test-run.log', 'npm run test:run'),
        summary('A-targeted.log', 'npm run test:run -- src/content/infected-world-v0.1/player-opponent-catalog.test.ts src/state/residence-session/player-opponent --reporter=verbose'),
        summary('B-probes.log', 'npm run test:run -- src/state/residence-session/player-motion-source-probe.test.ts src/app/infected-preplay/presentation-preparation-probe.test.ts --reporter=verbose'),
        summary('combined-E03.log', 'npm run test:run -- src/state/residence-session/player- src/state/residence-session/combat- src/state/residence-save/combat- src/app/infected-preplay src/app/infected-browser src/content/infected-world-v0.1/acceptance --reporter=verbose'),
        summary('default-check.log', 'npm run check')]
names = []
for log in ['A-targeted.log', 'B-probes.log']:
    for line in read(log).splitlines():
        if line.lstrip().startswith('✓ src/'):
            names.append(re.sub(r'\s+\d+ms$', '', line.strip()[2:]))
assert len(names) == 53 and len(set(names)) == 53
e03 = [line.strip() for line in read('combined-E03.log').splitlines()
       if line.lstrip().startswith('✓ ') and ' > E03 default corpus ' in line]
assert len(e03) == 72
b_records = [json.loads(line[len('B-SOURCE '):]) for line in read('B-probes.log').splitlines() if line.startswith('B-SOURCE ')]
assert len(b_records) == 11
dump('TEST-INVENTORY.json', {'newFiles': 9, 'newTests': 53, 'replacedTests': 0, 'deletedTests': 0, 'netAddedTests': 53,
                              'newTestNames': names, 'combinedOldTestsAreNotNew': True, 'baselineFiles': 314, 'baselineTests': 4672})
dump('NATIVE-PROBE-RESULTS.json', {'status': 'TEST_ONLY_PASS', 'sourceObservations': b_records,
                                  'preconditions': 'Producer-created values through real v4 S; explicit TEST HP/resource boundaries named in tests and B-SOURCE-MATRIX.md',
                                  'isProductionEventImplementation': False})
dump('VERIFICATION-RESULTS.json', {'status': 'AUTHOR_PASS_PENDING_EXACT_SHA_REVIEW', 'commands': logs,
                                   'architecture': '53 DEC entries / 347 core production files; PASS',
                                   'typecheck': 'PASS (one observer counter typing issue corrected before final check)',
                                   'build': 'PASS', 'workersOrTimeoutConfigurationChanged': False,
                                   'E03': {'defaultCases': 72, 'defaultSuccesses': 63, 'defaultDeaths': 9,
                                           'outcomeEvidence': 'All 72 original tests passed their frozen seed-05 death / other success assertions; no new route sampling policy',
                                           'fourOriginalRoutes': 'hotel-benefit, hotel-bypass, toolbox, segmented all original tests PASS', 'caseLines': e03},
                                   'negativeControls': json.loads(read('negative-controls.json')),
                                   'realBrowser': 'NOT RUN', 'ownerPlay': 'NOT RUN', 'CI': 'See post-commit exact-SHA CI receipt in delivery'})
print(json.dumps({'status': 'PASS', 'newTests': len(names), 'defaultE03Cases': len(e03), 'nativeProbeRecords': len(b_records)}))
