// WebGPT native template. NOT RUN in the mainline container.
// First reproduction destination: src/core/residence-combat/review-maintenance-regression.test.ts
// Materials are acquired BEFORE battle. No cleared enemy or manufactured closed receipt.
import { describe, expect, it } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { drawIntInclusive } from '../random'
import { readCombatValue } from './validation'
import { planCombatMaintenance } from './controlled'
import type { CombatValue } from './types'

const { fixture, win } = createCombatTestFactory(() => createInfectedCombatDependencies('maintenance-review-character'))
const quiet: typeof drawIntInclusive = (cursor, min, max) => ({ ...drawIntInclusive(cursor, min, max), value: max })

function prepared(outcome: 'escaped' | 'victory') {
  const h = fixture({ draw: quiet })
  let v = h.move(h.value, 'H1').snapshot
  v = h.source(v, 'H1-search', { method: 'dark' }).snapshot
  const definitionId = h.deps.supply.tasks.data.items.find(i => i.alias === 'metal')!.id
  const metal = v.site!.ground.find(g => g.nodeId === 'H1')!.items.find(i => i.definitionId === definitionId)!
  expect(metal).toBeDefined()
  v = h.inventory(v, 'pickup', { instanceId: metal.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
  v = h.task(v, 'fire-door', { method: 'crow', toolInstanceId: v.carried.equipment.utility!.instanceId }).snapshot
  v = h.move(v, 'H4').snapshot
  const entry = v
  if (outcome === 'escaped') {
    v = h.action(v, { kind: 'metal-pipe-basic-attack' }).snapshot
    v = h.action(v, { kind: 'escape' }).snapshot
  } else v = win(h, v)
  expect(v.phase).toBe('active-world')
  expect(v.battle).toBeNull()
  expect(v.site!.pending.kind).toBe('none')
  expect(v.character.body.energy).toBeGreaterThan(0)
  expect(v.battles.at(-1)!.outcome).toBe(outcome)
  expect(v.battles.at(-1)!.decision.revision).toBe(v.character.revision)
  expect(v.carried.backpack.items.some(i => i.instanceId === metal.instanceId)).toBe(true)
  const pipeId = v.carried.equipment.weapon!.instanceId
  const state = v.itemStates.states.find(s => s.instanceId === pipeId)!
  if (state.resource.kind !== 'durability') throw new Error('Expected genuine pipe durability')
  expect(state.resource.current).toBeLessThan(h.deps.profiles[0].rules.metalPipe.maxDurability)
  expect(readCombatValue(v, h.deps)).toEqual(v)
  return { h, value: v, entry, pipeId, metalId: metal.instanceId }
}

function repair(p: ReturnType<typeof prepared>, before: CombatValue) {
  return planCombatMaintenance(before, {
    kind: 'mechanical', expectedRevision: before.character.revision,
    inputs: [{ instanceId: p.metalId, quantity: 1 }],
    allocations: [{ instanceId: p.pipeId, amount: 15 }],
  }, p.h.authorize(before))
}

function assertRepair(p: ReturnType<typeof prepared>, before: CombatValue) {
  const original = structuredClone(before)
  let result: ReturnType<typeof planCombatMaintenance> | undefined
  let error: unknown
  try { result = repair(p, before) } catch (caught) { error = caught }
  // A domain rejection of a valid repair is the regression. Import/fixture errors are NOT successful evidence.
  expect(error, 'Immediate valid maintenance must not be confused with raw current-state tampering').toBeUndefined()
  expect(result).toBeDefined()
  const after = result!.plan.snapshot
  expect(after.character.revision).toBe(before.character.revision + 1)
  expect(after.battles).toEqual(before.battles)
  expect(after.site!.enemies).toEqual(before.site!.enemies)
  expect(after.carried.backpack.items.some(i => i.instanceId === p.metalId)).toBe(false)
  expect(after.dispositions.filter(d => d.item.instanceId === p.metalId && d.reason === 'recipe')).toHaveLength(1)
  expect(result!.resourceResult[0].restored).toBeGreaterThan(0)
  expect(readCombatValue(after, p.h.deps)).toEqual(after)
  expect(before).toEqual(original)
}

describe('F03 immediate post-battle maintenance versus committed-checkpoint validation', () => {
  it.each(['escaped', 'victory'] as const)('%s -> immediate real mechanical repair is legal', outcome => {
    const p = prepared(outcome)
    assertRepair(p, p.value)
  })

  it.each(['escaped', 'victory'] as const)('%s -> actual free organize -> repair is only a diagnostic control', outcome => {
    const p = prepared(outcome)
    const organized = p.h.inventory(p.value, 'move', {
      instanceId: p.metalId, placement: { x: 1, y: 0, rotated: false },
    }).snapshot
    expect(organized.character.revision).toBe(p.value.character.revision + 1)
    expect(organized.battles).toEqual(p.value.battles)
    assertRepair(p, organized)
  })

  it.each(['escaped', 'victory'] as const)('%s raw forged resource at the committed checkpoint still rejects', outcome => {
    const p = prepared(outcome)
    const raw = structuredClone(p.value)
    const altered = { ...raw, itemStates: { states: raw.itemStates.states.map(s =>
      s.instanceId === p.pipeId && s.resource.kind === 'durability'
        ? { ...s, resource: { ...s.resource, current: s.resource.current + 1 } } : s) } }
    expect(() => readCombatValue(altered, p.h.deps)).toThrowError(expect.objectContaining({ code: expect.any(String) }))
    expect(p.value).toEqual(raw)
  })

  it('active decision raw forged resource remains rejected', () => {
    const p = prepared('escaped')
    const current = p.h.action(p.entry, { kind: 'metal-pipe-basic-attack' }).snapshot
    const altered = { ...current, itemStates: { states: current.itemStates.states.map(s =>
      s.instanceId === p.pipeId && s.resource.kind === 'durability'
        ? { ...s, resource: { ...s.resource, current: s.resource.current + 1 } } : s) } }
    expect(() => readCombatValue(altered, p.h.deps)).toThrowError(expect.objectContaining({ code: expect.any(String) }))
  })
})

// Real H1 weighted source supplies cloth; combat risk draws keep the legal upper endpoint.
const clothDraw: typeof drawIntInclusive = (cursor, min, max) => ({
  ...drawIntInclusive(cursor, min, max), value: cursor.streamId.includes('H1-random') ? 41 : max,
})
function stocked(outcome: 'escaped' | 'victory', tool: 'crow' | 'lamp' | 'toolbox' = 'crow') {
  const h = fixture({ draw: clothDraw, tool })
  let v = h.move(h.value, 'H1').snapshot
  v = h.source(v, 'H1-search', tool === 'lamp'
    ? { method: 'lit', toolInstanceId: v.carried.equipment.utility!.instanceId } : { method: 'dark' }).snapshot
  const ids: Record<string, string> = {}
  const pickup = (alias: string, x: number) => {
    const definition = h.deps.supply.tasks.data.items.find(i => i.alias === alias)!.id
    const item = v.site!.ground.find(g => g.nodeId === v.site!.nodeId)!.items.find(i => i.definitionId === definition)!
    expect(item, 'real pre-entry material ' + alias).toBeDefined()
    v = alias === 'card' ? planCombatTransfer(v, { kind: 'task-pickup', expectedRevision: v.character.revision,
      instanceId: item.instanceId, placement: { x, y: 0, rotated: false } }, h.authorize(v)).snapshot
      : h.inventory(v, 'pickup', { instanceId: item.instanceId, placement: { x, y: 0, rotated: false } }).snapshot
    ids[alias] = item.instanceId
  }
  pickup('metal', 0); pickup('cloth', 1)
  if (tool === 'lamp') {
    v = h.move(v, 'H3').snapshot; v = h.source(v, 'H3-search', { method: 'dark' }).snapshot
    pickup('battery', 2); pickup('card', 3); v = h.move(v, 'H1').snapshot
  }
  v = h.task(v, 'fire-door', tool === 'lamp' ? { method: 'card', toolInstanceId: ids.card }
    : { method: tool, toolInstanceId: v.carried.equipment.utility!.instanceId }).snapshot
  if (tool === 'toolbox') pickup('electronic', 2)
  v = h.move(v, 'H4').snapshot
  expect(Object.values(ids).every(id => v.carried.backpack.items.some(i => i.instanceId === id))).toBe(true)
  if (outcome === 'escaped') {
    v = h.action(v, { kind: 'metal-pipe-basic-attack' }).snapshot
    v = h.action(v, { kind: 'escape' }).snapshot
  } else v = win(h, v)
  expect(v.battles.at(-1)!.decision.revision).toBe(v.character.revision)
  return { h, value: v, ids }
}
describe('R2 adjacent maintenance uses genuine pre-entry supplies', () => {
  it.each(['escaped', 'victory'] as const)('%s -> immediate cloth repair preserves completed history', outcome => {
    const p = stocked(outcome), before = structuredClone(p.value)
    const armor = p.value.carried.equipment.armor!.instanceId
    const result = planCombatMaintenance(p.value, { kind: 'coat', expectedRevision: p.value.character.revision,
      instanceId: armor, inputs: [{ instanceId: p.ids.cloth, quantity: 1 }] }, p.h.authorize(p.value))
    expect(result.resourceResult[0].restored).toBeGreaterThan(0)
    expect(result.plan.snapshot.character.revision).toBe(p.value.character.revision + 1)
    expect(result.plan.snapshot.battles).toEqual(before.battles)
    expect(result.plan.snapshot.site!.enemies).toEqual(before.site!.enemies)
    expect(result.plan.snapshot.dispositions.filter(d => d.item.instanceId === p.ids.cloth && d.reason === 'recipe')).toHaveLength(1)
    expect(readCombatValue(result.plan.snapshot, p.h.deps)).toEqual(result.plan.snapshot)
    expect(p.value).toEqual(before)
  })
  it('one mechanical pool supports partial and explicit multiple-target restoration with cap waste', () => {
    const p = stocked('victory'), v = p.value, pipe = v.carried.equipment.weapon!.instanceId, crow = v.carried.equipment.utility!.instanceId
    const command = { kind: 'mechanical', expectedRevision: v.character.revision,
      inputs: [{ instanceId: p.ids.metal, quantity: 1 }], allocations: [{ instanceId: pipe, amount: 10 }, { instanceId: crow, amount: 5 }] }
    const result = planCombatMaintenance(v, command, p.h.authorize(v))
    expect(result.resourceResult.map(x => x.restored)).toEqual([5, 1])
    expect(result.unusedPool).toBe(9)
    expect(result.plan.snapshot.character.body.energy).toBe(v.character.body.energy - 6)
    expect(result.plan.snapshot.dispositions.filter(d => d.item.instanceId === p.ids.metal && d.reason === 'recipe')).toHaveLength(1)
    const partial = planCombatMaintenance(v, { ...command, allocations: [{ instanceId: pipe, amount: 1 }] }, p.h.authorize(v))
    expect(partial.resourceResult[0]).toMatchObject({ requested: 1, restored: 1 })
    expect(partial.unusedPool).toBe(14)
  })
  it.each(['toolbox', 'lamp'] as const)('immediate %s maintenance consumes the real recipe without altering closed evidence', tool => {
    const p = stocked('escaped', tool), v = p.value
    const result = planCombatMaintenance(v, { kind: tool === 'lamp' ? 'recharge' : 'toolbox', expectedRevision: v.character.revision,
      instanceId: v.carried.equipment.utility!.instanceId,
      inputs: (tool === 'lamp' ? ['battery'] : ['metal', 'electronic']).map(a => ({ instanceId: p.ids[a], quantity: 1 })) }, p.h.authorize(v))
    expect(result.resourceResult[0].restored).toBe(1)
    expect(result.plan.snapshot.battles).toEqual(v.battles)
    expect(result.plan.snapshot.character.revision).toBe(v.character.revision + 1)
    expect(result.plan.snapshot.dispositions.filter(d => d.reason === 'recipe')).toHaveLength(tool === 'lamp' ? 1 : 2)
  })
})

import { assertCombatPlanCurrent, planCombatRest, planCombatTerminal, planCombatTransfer } from './controlled'
describe('R2 maintenance rejection and stable continuation', () => {
  it.each(['extra', 'fake-material', 'wrong-target', 'wrong-recipe', 'insufficient', 'duplicate-material',
    'duplicate-target', 'over-pool', 'boolean-amount', 'negative-amount', 'fraction-amount', 'stale', 'E0', 'battle'] as const)
  ('rejects %s without changing the complete input', fault => {
    const p = prepared('escaped')
    let before = p.value
    if (fault === 'E0') before = readCombatValue({ ...before, character: { ...before.character,
      body: { ...before.character.body, energy: 0 } } }, p.h.deps)
    if (fault === 'battle') before = p.entry
    const request: Record<string, unknown> = { kind: 'mechanical', expectedRevision: before.character.revision,
      inputs: [{ instanceId: p.metalId, quantity: 1 }], allocations: [{ instanceId: p.pipeId, amount: 15 }] }
    if (fault === 'extra') request.skipValidation = true
    if (fault === 'fake-material') request.inputs = [{ instanceId: 'fake', quantity: 1 }]
    if (fault === 'wrong-target') request.allocations = [{ instanceId: p.metalId, amount: 15 }]
    if (fault === 'wrong-recipe') { request.kind = 'coat'; request.instanceId = before.carried.equipment.armor!.instanceId; delete request.allocations }
    if (fault === 'insufficient') request.inputs = [{ instanceId: p.metalId, quantity: 2 }]
    if (fault === 'duplicate-material') request.inputs = [{ instanceId: p.metalId, quantity: 1 }, { instanceId: p.metalId, quantity: 1 }]
    if (fault === 'duplicate-target') request.allocations = [{ instanceId: p.pipeId, amount: 7 }, { instanceId: p.pipeId, amount: 8 }]
    if (fault === 'over-pool') request.allocations = [{ instanceId: p.pipeId, amount: 16 }]
    if (fault === 'boolean-amount') request.allocations = [{ instanceId: p.pipeId, amount: true }]
    if (fault === 'negative-amount') request.allocations = [{ instanceId: p.pipeId, amount: -1 }]
    if (fault === 'fraction-amount') request.allocations = [{ instanceId: p.pipeId, amount: 1.5 }]
    if (fault === 'stale') request.expectedRevision = before.character.revision - 1
    const saved = structuredClone(before)
    expect(() => planCombatMaintenance(before, request, p.h.authorize(before))).toThrowError(expect.objectContaining({ code: expect.any(String) }))
    expect(before).toEqual(saved)
  })
  it('full resource and cloned/stale plans remain rejected by existing authority boundaries', () => {
    const p = prepared('escaped'), result = repair(p, p.value), after = result.plan.snapshot
    expect(() => planCombatMaintenance(after, { kind: 'mechanical', expectedRevision: after.character.revision,
      inputs: [{ instanceId: p.metalId, quantity: 1 }], allocations: [{ instanceId: p.pipeId, amount: 15 }] }, p.h.authorize(after)))
      .toThrow('Resource already full')
    expect(() => assertCombatPlanCurrent(p.value, result.plan, p.h.authorize(p.value))).not.toThrow()
    expect(() => assertCombatPlanCurrent(p.value, structuredClone(result.plan), p.h.authorize(p.value))).toThrow()
    expect(() => assertCombatPlanCurrent(after, result.plan, p.h.authorize(after))).toThrow()
  })
  it('immediate repair survives two real entries, another exit, then a real combat death', () => {
    const p = prepared('escaped'), first = p.value.battles[0]
    let v = repair(p, p.value).plan.snapshot
    v = p.h.move(v, 'H4').snapshot
    expect(v.battle!.entry.previouslyEncountered).toBe(true)
    v = p.h.action(v, { kind: 'escape' }).snapshot
    expect(v.battles).toHaveLength(2)
    expect(v.battles[0]).toEqual(first)
    v = planCombatRest(v, { kind: 'rest', expectedRevision: v.character.revision }, p.h.authorize(v)).snapshot
    // Explicit TEST HP boundary. Same real enemy/history, not a manufactured closed receipt.
    v = readCombatValue({ ...v, character: { ...v.character, body: { ...v.character.body,
      condition: { ...v.character.body.condition, currentHealth: 1 } } } }, p.h.deps)
    v = p.h.move(v, 'H4').snapshot
    v = p.h.action(v, { kind: 'defend' }).snapshot
    expect(v.phase).toBe('dead')
    expect(v.combatDeaths).toHaveLength(1)
    expect(v.battles[0]).toEqual(first)
    expect(readCombatValue(v, p.h.deps)).toEqual(v)
  })
  it('immediate victory repair then genuine H0 return retains empty steps', () => {
    const p = prepared('victory')
    let v = repair(p, p.value).plan.snapshot
    for (const node of ['H1', 'H0']) v = p.h.move(v, node).snapshot
    const end = planCombatTerminal(v, { kind: 'withdraw', expectedRevision: v.character.revision }, p.h.authorize(v))
    expect(end.steps).toEqual([])
    expect(end.snapshot.phase).toBe('living-hub')
    expect(end.snapshot.battles).toEqual(p.value.battles)
  })
})
