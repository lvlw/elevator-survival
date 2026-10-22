import { describe, expect, it } from 'vitest'
import { mountUi } from './test-fixtures'
import { fixture, bodyBoundary, expectation, quietDraw } from '../../state/residence-save/combat-test-fixtures'
import { createCombatTestFactory } from '../../core/residence-combat/test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { createResidenceCombatDependencies } from '../../core/residence-combat/dependencies'
import { readCombatValue } from '../../core/residence-combat/validation'
import { planCombatMaintenance, planCombatRest, planCombatTask, createCombatAuthority } from '../../core/residence-combat/controlled'
import { cycleContext } from '../../core/residence-supply/shared-validation'
import { drawIntInclusive } from '../../core/random'
import { createReservation } from '../../app/infected-browser/reservation'
import { checkpointFor } from '../../app/infected-browser/checkpoint'
import { CHECKPOINT_KEY, RESERVATION_KEY } from '../../app/infected-browser/schema'
import { serializeCombatResidenceSave, deserializeCombatResidenceSave } from '../../state/residence-save/combat-codec'
import type { CombatDependencies, CombatValue } from '../../core/residence-combat/types'

/** Controlled TEST checkpoint from a producer record, with external initial material fixed before encoding. */
function strictCheckpoint(value: CombatValue, deps: CombatDependencies, seed = 'combat-seed') {
  const initial = { runId: 'combat-test-execution', seed, tool: 'crow', specialty: 'engineer' }
  const { reservation, composition } = createReservation({ characterId: deps.supply.residence.scope.characterId,
    runId: initial.runId, seed, generation: 'UI-privacy-TEST-generation' }, { tool: initial.tool, specialty: initial.specialty })
  const committed = readCombatValue(value, deps), expected = expectation(committed, deps, initial)
  const text = serializeCombatResidenceSave(committed, expected, composition.policy)
  expect(deserializeCombatResidenceSave(text, expected, composition.policy).value).toEqual(committed)
  const checkpoint = checkpointFor(reservation, { text, expected }, composition)
  return (f: Parameters<NonNullable<Parameters<typeof mountUi>[2]>>[0]) => {
    f.disk.set(RESERVATION_KEY, JSON.stringify(reservation)); f.disk.set(CHECKPOINT_KEY, JSON.stringify(checkpoint))
  }
}
function safeDom(host: HTMLElement) {
  return { html: host.innerHTML, attributes: [...host.querySelectorAll('*')].map(e => [...e.attributes].map(a => [a.name, a.value])),
    options: [...host.querySelectorAll('option')].map(o => [o.value, o.textContent]) }
}

describe('ordinary React DOM privacy', () => {
  it('same public facts with different hidden event seeds render identical markup including aria and title', async () => {
    const output: string[] = []
    for (const seed of ['E03-A-seed-01', 'E03-A-seed-02']) {
      const h = await mountUi(seed)
      try {
        await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅'); await h.d.button('隔离防火门 · 使用撬棍')
        await h.d.select('物品', '撬棍'); output.push(h.host.innerHTML)
      } finally { await h.unmount() }
    }
    expect(output[0]).toBe(output[1])
  })
  it('view markup and all attribute values do not carry runtime identities or exact hidden risk', async () => {
    const h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅')
      const html = h.host.innerHTML
      expect(html).not.toMatch(/instanceId|woundId|runId|runSeed|originId|effectiveRiskPercent|riskPercent|drawIndex|streamId|rulesVersion|RANDOM_ALGORITHM_VERSION/)
      for (const hidden of ['E03-A-character', 'E03-A-execution', 'E03-A-seed-01', 'TEST-generation']) expect(html).not.toContain(hidden)
      const attributes = [...h.host.querySelectorAll('*')].flatMap(e => [...e.attributes].map(a => a.value)).join('\n')
      expect(attributes).not.toMatch(/supply-origin|combat-entry|infected-transfer-local-001|20%|40%|60%/)
    } finally { await h.unmount() }
  })
  it('same approved current burden with different hidden progress and exposure preserves all DOM and medical option order', async () => {
    const f = fixture({ hp: 8 }), output: ReturnType<typeof safeDom>[] = []
    let v = f.move(f.value, 'H1').snapshot; v = f.move(v, 'H2').snapshot
    v = f.source(v, 'H2-search', { method: 'dark' }).snapshot
    const suppressed = v.site!.ground.find(g => g.nodeId === 'H2')!.items.find(i => i.definitionId === 'consumable_infection_suppressant')!
    expect(suppressed).toBeDefined()
    v = f.inventory(v, 'pickup', { instanceId: suppressed.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
    for (const [infectionProgress, pending] of [[61, 0], [89, 2]]) {
      const boundary = bodyBoundary(v, f.deps, { infectionProgress,
        condition: { ...v.character.body.condition, pendingInfectionExposures: pending } })
      const h = await mountUi('unused-cold-seed', false, strictCheckpoint(boundary, f.deps))
      try {
        await h.d.button('药食与维护'); await h.d.button('使用药食')
        await h.d.select('物品', '感染抑制剂')
        expect(h.host.textContent).toContain('目标资格未知'); output.push(safeDom(h.host))
        expect(h.setItem).not.toHaveBeenCalled(); expect(h.entropy).not.toHaveBeenCalled()
      } finally { await h.unmount() }
    }
    expect(output[0]).toEqual(output[1])
  })
  it('different actual enemy HP within one stage after native retreat repair rest and reentry has identical battle DOM', async () => {
    const rows: { hp: number; stage: unknown; dom: ReturnType<typeof safeDom> }[] = []
    for (const charged of [true, false]) {
      const f = fixture({ hp: charged ? 10 : 12 }); let v = f.move(f.value, 'H1').snapshot
      v = f.source(v, 'H1-search', { method: 'dark' }).snapshot
      const metal = v.site!.ground.find(g => g.nodeId === 'H1')!.items.find(i => i.definitionId === 'material_metal_parts')!
      v = f.inventory(v, 'pickup', { instanceId: metal.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
      for (const node of ['H7', 'L0', 'L1', 'L2']) v = f.move(v, node).snapshot
      for (const kind of charged ? ['metal-pipe-charged-strike', 'defend', 'defend'] as const : ['metal-pipe-basic-attack', 'metal-pipe-basic-attack'] as const)
        v = f.action(v, { kind }).snapshot
      v = f.action(v, { kind: 'escape' }).snapshot
      v = planCombatMaintenance(v, { kind: 'mechanical', expectedRevision: v.character.revision,
        inputs: [{ instanceId: metal.instanceId, quantity: 1 }], allocations: [{ instanceId: v.carried.equipment.weapon!.instanceId, amount: 15 }] }, f.authorize(v)).plan.snapshot
      v = planCombatRest(v, { kind: 'rest', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
      v = f.move(v, 'L2').snapshot
      const h = await mountUi('unused-cold-seed', false, strictCheckpoint(v, f.deps))
      try {
        expect(h.view().point).toBe('battle-decision')
        rows.push({ hp: v.site!.enemies.find(e => e.id === 'porter')!.state.currentHealth, stage: h.view().combat!.enemyStage, dom: safeDom(h.host) })
        expect(h.setItem).not.toHaveBeenCalled()
      } finally { await h.unmount() }
    }
    expect(rows[0].hp).not.toBe(rows[1].hp); expect(rows[0].stage).toBe(rows[1].stage); expect(rows[0].dom).toEqual(rows[1].dom)
  })
  it('opposite real default sample risk answers have identical pre-confirm DOM including placement and option order', async () => {
    const factory = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
    const witnesses: { seed: string; value: CombatValue; deps: CombatDependencies; exposure: number }[] = []
    // TEST witness discovery uses real P execution, not a player query or a substituted draw result.
    for (let n = 1; n <= 16 && new Set(witnesses.map(w => w.exposure)).size < 2; n++) {
      const seed = 'ui-sample-privacy-' + n, f = factory.entered('orderly', { seed, draw: quietDraw })
      const value = f.move(factory.win(f, f.value), 'H5').snapshot
      const deps = createResidenceCombatDependencies(Object.freeze({ ...f.deps.supply, draw: drawIntInclusive }), f.deps.profiles)
      const authority = createCombatAuthority(value, { cycle: cycleContext(value.character, deps.supply, value.site!.nodeId), missions: value.missions }, deps)
      const after = planCombatTask(value, { kind: 'task', actionId: 'sample', method: 'direct', expectedRevision: value.character.revision,
        placement: { x: 0, y: 0, rotated: false } }, authority).snapshot
      const exposure = after.character.body.condition.pendingInfectionExposures - value.character.body.condition.pendingInfectionExposures
      if (!witnesses.some(w => w.exposure === exposure)) witnesses.push({ seed, value, deps, exposure })
    }
    expect(witnesses.map(w => w.exposure).sort()).toEqual([0, 1])
    const output: ReturnType<typeof safeDom>[] = [], actual: number[] = []
    for (const witness of witnesses) {
      const h = await mountUi('unused-cold-seed', false, strictCheckpoint(witness.value, witness.deps, witness.seed))
      try {
        await h.d.button('提取样本 · 直接提取'); await h.d.anchor(0, 0); output.push(safeDom(h.host))
        expect(h.setItem).not.toHaveBeenCalled(); await h.d.button('执行行动')
        expect(h.setItem).toHaveBeenCalledTimes(1)
        const cp = JSON.parse(h.disk.get(CHECKPOINT_KEY)!), value = JSON.parse(cp.v4Text).state as CombatValue
        actual.push(value.character.body.condition.pendingInfectionExposures - witness.value.character.body.condition.pendingInfectionExposures)
        expect(h.view().tasks.sample).toBe('carried')
      } finally { await h.unmount() }
    }
    expect(output[0]).toEqual(output[1]); expect(actual).toEqual(witnesses.map(w => w.exposure))
  })
})
