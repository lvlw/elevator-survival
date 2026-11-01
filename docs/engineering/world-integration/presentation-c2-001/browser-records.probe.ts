// TEST ONLY. Genuine producers + independently constructed strict codec records.
import { it, expect } from 'vitest'
import { createCombatTestFactory } from '../../../../src/core/residence-combat/test-fixtures'
import { createInfectedCombatDependencies } from '../../../../src/content/infected-world-v0.1/combat-initial'
import { quietDraw } from '../../../../src/state/residence-save/combat-test-fixtures'
import { caseRecords, strictRecords } from '../../../../src/ui/infected-world/committed-presentation-test-fixtures'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../../../src/app/infected-browser/schema'
const fsModule: string = 'node:fs'
const { writeFileSync } = await import(fsModule)
it('exports only strict, genuine producer checkpoints for supplemental native browser cases', async () => {
  const factory = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
  const cases = Object.fromEntries((['orderly', 'porter', 'technician'] as const).map(enemy => {
    const f = factory.entered(enemy, { draw: quietDraw }); return [enemy, strictRecords(f.value, f.deps)]
  }))
  for (const enemy of ['porter', 'technician'] as const) {
    const f = factory.entered(enemy, { draw: quietDraw })
    const value = f.action(f.value, { kind: 'escape' }).snapshot
    expect(value.battle).toBeNull()
    cases[enemy+'-entry'] = strictRecords(value, f.deps)
  }
  for (const id of ['defend', 'victory', 'retreat', 'death'] as const) cases[id] = caseRecords(id)
  const processModule: string = 'node:process', { env } = await import(processModule)
  expect(env.C2_RECORDS_PATH).toBeTruthy()
  writeFileSync(env.C2_RECORDS_PATH, JSON.stringify({ task: 'C2-001', reservationKey: RESERVATION_KEY, checkpointKey: CHECKPOINT_KEY, cases }))
  console.log('C2 producer cases: '+Object.keys(cases).join(', ')+'; all strictRecords roundtripped')
})
