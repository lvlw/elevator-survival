import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { drawIntInclusive } from '../random'
import { readCombatValue } from './validation'
import { queryResidenceCombat, queryCombatTerminalEligibility } from './queries'
import { planCombatMaintenance, assertCombatPlanCurrent } from './controlled'
import * as resources from '../item-state'
import * as recipes from '../residence-task/plans'
import * as units from '../residence-supply/allocations'
import * as energy from '../residence-energy'
import * as cycles from '../character-cycle'
import * as engine from '../combat/combat-profiled-resolution'
import * as planner from '../combat/combat-transition-plan'
import * as reducer from '../combat/combat-effect-reducer'
import * as plans from './plans'
import * as lifecycle from '../mission-lifecycle/controlled'

const { fixture } = createCombatTestFactory(() => createInfectedCombatDependencies('maintenance-count-character'))
afterEach(() => vi.restoreAllMocks())
function closed() {
  const draw = vi.fn<typeof drawIntInclusive>((c, min, max) => ({ ...drawIntInclusive(c, min, max), value: max }))
  const h = fixture({ draw })
  let v = h.move(h.value, 'H1').snapshot
  v = h.source(v, 'H1-search', { method: 'dark' }).snapshot
  const metal = v.site!.ground.find(g => g.nodeId === 'H1')!.items.find(i => i.definitionId === 'material_metal_parts')!
  v = h.inventory(v, 'pickup', { instanceId: metal.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
  v = h.task(v, 'fire-door', { method: 'crow', toolInstanceId: v.carried.equipment.utility!.instanceId }).snapshot
  v = h.move(v, 'H4').snapshot
  v = h.action(v, { kind: 'metal-pipe-basic-attack' }).snapshot
  v = h.action(v, { kind: 'escape' }).snapshot
  const command = { kind: 'mechanical', expectedRevision: v.character.revision,
    inputs: [{ instanceId: metal.instanceId, quantity: 1 }], allocations: [{ instanceId: v.carried.equipment.weapon!.instanceId, amount: 15 }] }
  return { h, value: v, command, metal, draw }
}
function counters() {
  return [vi.spyOn(resources, 'restoreItemResource'), vi.spyOn(recipes, 'consumeSupplyRecipe'),
    vi.spyOn(units, 'consumeSupplyUnits'), vi.spyOn(energy, 'planResidenceAction'), vi.spyOn(cycles, 'planCharacterCycle'),
    vi.spyOn(engine, 'resolveProfiledCombatAction'), vi.spyOn(planner, 'buildCombatTransitionPlan'),
    vi.spyOn(reducer, 'reduceCombatEffects'), vi.spyOn(plans, 'issueCombatPlan'), vi.spyOn(lifecycle, 'terminateMission')]
}
describe('R2 maintenance independent production and validation counts', () => {
  it.each([false, true])('one immediate maintenance, bleeding death=%s', dead => {
    const p = closed()
    const before = dead ? readCombatValue({ ...p.value, character: { ...p.value.character,
      body: { ...p.value.character.body, energy: 1, condition: { ...p.value.character.body.condition,
        currentHealth: 1, bleeding: true } } } }, p.h.deps) : p.value
    const authority = p.h.authorize(before), saved = structuredClone(before), spies = counters()
    p.draw.mockClear()
    const result = planCombatMaintenance(before, p.command, authority), after = result.plan.snapshot
    expect(spies.map(s => s.mock.calls.length)).toEqual([1, 1, 1, 1, 0, 0, 0, 0, 1, dead ? 1 : 0])
    expect(p.draw).not.toHaveBeenCalled()
    expect(after.character.revision).toBe(before.character.revision + 1)
    expect(after.phase).toBe(dead ? 'dead' : 'active-world')
    expect(after.battle).toBeNull()
    expect(after.battles).toEqual(before.battles)
    expect(result.resourceResult[0].restored).toBe(1)
    expect(after.dispositions.filter(d => d.item.instanceId === p.metal.instanceId && d.reason === 'recipe')).toHaveLength(1)
    if (dead) {
      expect(result.plan.producer).toBe('terminal')
      expect(result.plan.steps.map(s => s.kind)).toEqual(['primary', 'action-bleeding'])
      expect(after.receipts.at(-1)).toMatchObject({ source: 'supply-death', outcome: 'death' })
      expect(after.dispositions.find(d => d.item.instanceId === p.command.allocations[0].instanceId && d.reason === 'terminal')!.state.resource)
        .toEqual({ kind: 'durability', current: 30 })
      expect(after.character.body.energy).toBe(0)
    }
    readCombatValue(after, p.h.deps); queryCombatTerminalEligibility(after, p.h.deps)
    assertCombatPlanCurrent(before, result.plan, authority)
    expect(spies.map(s => s.mock.calls.length)).toEqual([1, 1, 1, 1, 0, 0, 0, 0, 1, dead ? 1 : 0])
    expect(before).toEqual(saved)
  })
  it('original forged checkpoint rejects before any maintenance producer', () => {
    const p = closed(), authority = p.h.authorize(p.value), spies = counters()
    const forged = { ...p.value, itemStates: { states: p.value.itemStates.states.map(s =>
      s.instanceId === p.command.allocations[0].instanceId && s.resource.kind === 'durability'
        ? { ...s, resource: { ...s.resource, current: s.resource.current + 1 } } : s) } }
    expect(() => planCombatMaintenance(forged, p.command, authority)).toThrow('Latest real resource differs from decision evidence')
    expect(spies.map(s => s.mock.calls.length)).toEqual(Array(10).fill(0))
  })
  it('wrong recipe after resource evaluation reports partial pure work, without G1 or plan', () => {
    const p = closed(), authority = p.h.authorize(p.value), spies = counters(), saved = structuredClone(p.value)
    expect(() => planCombatMaintenance(p.value, { ...p.command, inputs: [{ instanceId: 'missing', quantity: 1 }] }, authority)).toThrow()
    expect(spies.map(s => s.mock.calls.length)).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(p.value).toEqual(saved)
  })
  it('invalid private resource result reaches final validation but never returns an issued plan', () => {
    const p = closed(), authority = p.h.authorize(p.value), original = resources.restoreItemResource, spies = counters()
    // Inject an invalid producer output only; keep original request, recipe and G1 real.
    spies[0].mockRestore()
    const restore = vi.spyOn(resources, 'restoreItemResource').mockImplementationOnce((...args) => {
      const r = original(...args)
      if (r.state.resource.kind === 'none') throw new Error('Expected actual resource')
      return { ...r, state: { ...r.state, resource: { ...r.state.resource, current: 999 } } }
    })
    const saved = structuredClone(p.value)
    expect(() => planCombatMaintenance(p.value, p.command, authority)).toThrow()
    expect(restore).toHaveBeenCalledTimes(1)
    expect(spies.slice(1).map(s => s.mock.calls.length)).toEqual([1, 1, 1, 0, 0, 0, 0, 1, 0])
    expect(spies[8].mock.results[0].type).toBe('throw')
    expect(p.value).toEqual(saved)
  })
  it('valid and invalid complete read/query perform no gameplay production', () => {
    const p = closed(), saved = structuredClone(p.value), spies = counters()
    const forged = { ...p.value, itemStates: { states: p.value.itemStates.states.map(s =>
      s.instanceId === p.command.allocations[0].instanceId && s.resource.kind === 'durability'
        ? { ...s, resource: { ...s.resource, current: s.resource.current + 1 } } : s) } }
    p.draw.mockClear()
    for (let i = 0; i < 3; i++) {
      readCombatValue(p.value, p.h.deps); queryResidenceCombat(p.value, p.h.deps); queryCombatTerminalEligibility(p.value, p.h.deps)
      expect(() => readCombatValue(forged, p.h.deps)).toThrow()
      expect(() => queryResidenceCombat(forged, p.h.deps)).toThrow()
      expect(() => queryCombatTerminalEligibility(forged, p.h.deps)).toThrow()
    }
    expect(spies.map(s => s.mock.calls.length)).toEqual(Array(10).fill(0))
    expect(p.draw).not.toHaveBeenCalled(); expect(p.value).toEqual(saved)
  })
})
