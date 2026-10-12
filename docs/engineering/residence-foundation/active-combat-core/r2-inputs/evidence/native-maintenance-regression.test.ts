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
