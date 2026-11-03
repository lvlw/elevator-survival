// Four temporary semantic mutants. Always restore exact bytes; never commit a mutant.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const out = dirname(fileURLToPath(import.meta.url)), root = resolve(out, '../../../..')
const facade = 'src/state/residence-session/player-facade.ts', projection = 'src/state/residence-session/narrative-entry/projection.ts'
const controller = 'src/app/infected-preplay/controller.ts', owner = 'src/app/infected-browser/owner.ts'
const reading = 'src/app/infected-browser/narrative-entry/reading.ts'
const browserTest = 'src/app/infected-browser/narrative-entry.test.ts', uiTest = 'src/ui/infected-world/story-interaction.test.tsx'
const cases = [
  ['premature-workorder', [[projection, "if (fact('workorder')) known.push('H07')", "known.push('H07')"],
    [projection, "workorder: fact('workorder')", 'workorder: true']], browserTest, 'arriving at H7'],
  ['retry-reissues-receipt', [[controller,
    'retrySave: () => run(() => ({ view: ports.player.retrySave(), committed: false })),',
    "retrySave: () => Object.freeze({ ...run(() => ({ view: ports.player.retrySave(), committed: false })), exploration: issueExploration({ kind: 'search', method: 'lit', story: 'H03', revealed: 0, resource: null }) }),"]], browserTest, 'only actual commits emit'],
  ['unique-double-dispatch', [[facade, 'const commit = owner.dispatch(command)',
    "const commit = owner.dispatch(command); if (command.kind === 'source') owner.dispatch(command)"]], uiTest, 'one real lit-search click'],
  ['lost-owner-bookmark', [[owner,
    'acknowledgeReading: marks => guard(c, () => c.reading?.acknowledge(marks) ?? Object.freeze({ marks: Object.freeze([]), warning: null })),',
    'acknowledgeReading: marks => c.reading?.acknowledge(marks) ?? Object.freeze({ marks: Object.freeze([]), warning: null }),'],
    [reading, "if (!active()) throw new Error('Reading owner is no longer active');", '/* TEST mutant: old owner allowed */']], browserTest, 'lost-owner acknowledgement leaves'],
]
const results = []
for (const [name, edits, test, pattern] of cases) {
  const originals = new Map(edits.map(([path]) => [path, readFileSync(resolve(root, path))]))
  let status = null
  try {
    for (const [path, old, replacement] of edits) {
      const file = resolve(root, path), text = readFileSync(file, 'utf8')
      assert.equal(text.split(old).length, 2, `${name}: nonunique mutation anchor`)
      writeFileSync(file, text.replace(old, replacement))
    }
    const completed = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', test, '-t', pattern],
      { cwd: root, encoding: 'utf8', timeout: 120000 })
    const log = (completed.stdout ?? '') + (completed.stderr ?? '')
    writeFileSync(resolve(out, `negative-${name}.log`), log)
    status = completed.status
    assert(status !== null && status !== 0 && log.includes('AssertionError') && log.includes('Test Files'), `${name}: not a semantic assertion failure`)
  } finally {
    for (const [path, raw] of originals) writeFileSync(resolve(root, path), raw)
    const restored = [...originals].every(([path, raw]) => readFileSync(resolve(root, path)).equals(raw))
    results.push({ control: name, test, pattern, exit: status, restored_byte_identical: restored,
      restored_sha256: Object.fromEntries([...originals].map(([path, raw]) => [path, createHash('sha256').update(raw).digest('hex')])) })
    writeFileSync(resolve(out, 'negative-controls.json'), JSON.stringify(results, null, 2))
    assert(restored)
  }
  console.log(`${name}: semantic assertion failed as expected; exact bytes restored`)
}
