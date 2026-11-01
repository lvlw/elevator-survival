// TEST ONLY: real producers and real React routes, then strict original cold decoding.
import { expect, it } from 'vitest'
import { createCombatTestFactory } from '../../../../src/core/residence-combat/test-fixtures'
import { createInfectedCombatDependencies } from '../../../../src/content/infected-world-v0.1/combat-initial'
import { quietDraw } from '../../../../src/state/residence-save/combat-test-fixtures'
import { caseRecords, strictRecords, mountPresentation } from '../../../../src/ui/infected-world/committed-presentation-test-fixtures'
import { mountUi } from '../../../../src/ui/infected-world/test-fixtures'
import { domRouteA } from '../../../../src/ui/infected-world/route-test-fixtures'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../../../src/app/infected-browser/schema'
const fsModule: string = 'node:fs', processModule: string = 'node:process'
const { writeFileSync } = await import(fsModule), { env } = await import(processModule)
it('exports genuine TEST checkpoints only; never edits HP, inventory or expected records to pose screenshots', async () => {
  const factory = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
  const cases: Record<string, { reservation: string; checkpoint: string }> = {}
  for (const enemy of ['orderly', 'porter', 'technician'] as const) {
    const f = factory.entered(enemy, { draw: quietDraw }); cases[enemy] = strictRecords(f.value, f.deps)
  }
  for (const id of ['defend', 'victory', 'retreat', 'death', 'two-responses'] as const) cases[id] = caseRecords(id)
  const h = await mountUi()
  try {
    await h.d.setup(); cases['first-hub'] = { reservation: h.disk.get(RESERVATION_KEY)!, checkpoint: h.disk.get(CHECKPOINT_KEY)! }
    for (let stage = 0; stage < 6; stage++) {
      await domRouteA(h.d, stage)
      const name = ['route-orderly', 'route-porter', 'route-technician', 'late-inventory', 'sample', 'success'][stage]!
      cases[name] = { reservation: h.disk.get(RESERVATION_KEY)!, checkpoint: h.disk.get(CHECKPOINT_KEY)! }
    }
    expect(h.view().point).toBe('living-hub'); await h.remount(); expect(h.view().point).toBe('living-hub')
  } finally { await h.unmount() }
  for (const kind of ['dead', 'living-failure'] as const) {
    const h = await mountPresentation({ id: kind === 'dead' ? 'death' : 'retreat' })
    try {
      await h.combat()
      if (kind === 'living-failure') { await h.d.move('电梯前室'); await h.d.send('失败止损返回') }
      cases[kind] = { reservation: h.disk.get(RESERVATION_KEY)!, checkpoint: h.disk.get(CHECKPOINT_KEY)! }
      await h.remount(); expect(h.view().point).toBe(kind === 'dead' ? 'dead' : 'living-hub')
    } finally { await h.unmount() }
  }
  expect(env.UI_V1_RECORDS_PATH).toBeTruthy()
  writeFileSync(env.UI_V1_RECORDS_PATH, JSON.stringify({ task: 'UI-V1-INTEGRATION-001', reservationKey: RESERVATION_KEY, checkpointKey: CHECKPOINT_KEY, cases }))
  console.log('UI-V1 genuine producer cases: '+Object.keys(cases).join(', '))
}, 120000)
