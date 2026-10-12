import { describe, expect, it } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { fixture } from '../residence-supply/test-fixtures'
import { planSupplyMove } from '../residence-supply/controlled'
import { planSupplySourceReveal } from '../residence-task/sources'
import { planSupplyInventory } from '../residence-supply/inventory'
import { planSupplyMaintenance } from '../residence-supply/maintenance'
import { readSupplyValue } from '../residence-supply/validation'
import { consumeSupplyDeath } from '../residence-terminal/supply-terminal'
import { readCombatValue } from './validation'
import { createCombatTestFactory } from './test-fixtures'

describe('R2 shared maintenance retains legacy protocol and capabilities', () => {
  it.each([false, true])('legacy real recipe/body result, death=%s, retains original output contract', dead => {
    const f = fixture(createInfectedSupplyDependencies('legacy-maintenance-character'), { tool: 'crow' })
    let v = planSupplyMove(f.value, { kind: 'move', expectedRevision: f.value.character.revision, edgeId: 'H0-H1:forward' }, f.authorize(f.value)).snapshot
    v = planSupplySourceReveal(v, { kind: 'reveal', sourceId: 'H1-search', method: 'dark', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
    const metal = v.site!.ground.find(g => g.nodeId === 'H1')!.items.find(i => i.definitionId === 'material_metal_parts')!
    v = planSupplyInventory(v, { kind: 'pickup', expectedRevision: v.character.revision,
      instanceId: metal.instanceId, placement: { x: 0, y: 0, rotated: false } }, f.authorize(v)).snapshot
    const pipe = v.carried.equipment.weapon!.instanceId
    // Explicit TEST resource/HP boundary; real initial, route, source and recipe.
    v = readSupplyValue({ ...v, itemStates: { states: v.itemStates.states.map(s => s.instanceId === pipe
      ? { ...s, resource: { kind: 'durability', current: 29 } } : s) }, character: { ...v.character,
      body: { ...v.character.body, energy: dead ? 1 : v.character.body.energy,
        condition: { ...v.character.body.condition, currentHealth: dead ? 1 : 12, bleeding: dead } } } }, f.dependencies)
    const before = structuredClone(v), authority = f.authorize(v)
    const result = planSupplyMaintenance(v, { kind: 'mechanical', expectedRevision: v.character.revision,
      inputs: [{ instanceId: metal.instanceId, quantity: 1 }], allocations: [{ instanceId: pipe, amount: 15 }] }, authority)
    expect(result.plan.kind).toBe('residence-supply-plan')
    expect(result.plan.snapshot.protocol).toBe(v.protocol)
    expect(result.resourceResult).toEqual([{ instanceId: pipe, requested: 15, restored: 1, unused: 14 }])
    expect(result.plan.snapshot.character.revision).toBe(v.character.revision + 1)
    expect(result.plan.outcome).toBe(dead ? 'death' : 'alive')
    if (dead) {
      const end = consumeSupplyDeath(v, result.plan, authority)
      expect(end.snapshot.phase).toBe('dead')
      expect(end.snapshot.character.revision).toBe(v.character.revision + 1)
      expect(end.snapshot.dispositions.find(d => d.item.instanceId === pipe && d.reason === 'terminal')!.state.resource)
        .toEqual({ kind: 'durability', current: 30 })
      expect(() => consumeSupplyDeath(v, structuredClone(result.plan), authority)).toThrow()
    }
    expect(() => readCombatValue(result.plan.snapshot, createInfectedCombatDependencies('legacy-maintenance-character'))).toThrow()
    expect(v).toEqual(before)
  })
  it('legacy reader still rejects new combat protocol without deleting its fields', () => {
    const { entered } = createCombatTestFactory(() => createInfectedCombatDependencies('legacy-rejection-character'))
    const h = entered(), saved = structuredClone(h.value)
    expect(() => readSupplyValue(h.value, h.deps.supply)).toThrow()
    expect(h.value).toEqual(saved)
  })
})
