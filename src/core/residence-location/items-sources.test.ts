import { describe, expect, it, vi } from 'vitest'
import * as random from '../random'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { planResidenceLocationRest, restoreResidenceLocationCandidate } from './controlled'
import { planResidenceItemTransfer } from './index'
import { binding, catalogInput, fixture as createFixture, move, mutable, reveal } from './test-fixtures'
import { infectedResidenceConfig } from '../../content/infected-residence-core-v0.1/config'
const fixture = (options: Parameters<typeof createFixture>[1] = {}) => createFixture(infectedResidenceConfig, options)

describe('G2 one-time sources and real item migration (L05 L06)', () => {
  it('fixed source materializes once, draws nothing, and keeps claims after all ground items leave', () => {
    const f = fixture(); const draw = vi.spyOn(random, 'drawIntInclusive')
    let s = reveal(f, f.state, 'fixed').snapshot
    expect(draw).not.toHaveBeenCalled(); vi.restoreAllMocks()
    expect(s.site.sources.find((v) => v.id === 'fixed')).toEqual({ id: 'fixed', claimed: true, drawIndex: 0 })
    const ground = s.site.ground.find((g) => g.nodeId === 'a')!.items
    expect(ground.map((i) => i.definitionId)).toEqual(['pipe', 'lamp'])
    for (const [index, item] of ground.entries()) {
      s = planResidenceItemTransfer(s, { ...binding(s), kind: 'pickup', instanceId: item.instanceId,
        placement: { x: index, y: 0, rotated: false } }, f.authorityFor(s), f.dependencies).snapshot
    }
    expect(s.site.ground.find((g) => g.nodeId === 'a')!.items).toHaveLength(0)
    expect(() => reveal(f, s, 'fixed')).toThrow()
    const afterRest = planResidenceLocationRest(s, { ...binding(s), kind: 'rest' }, f.authorityFor(s), f.dependencies).snapshot
    expect(() => reveal(f, afterRest, 'fixed')).toThrow()
  })
  it('real durability and charge survive E0 pickup/drop, crossing a G1 rest and return pickup', () => {
    const f = fixture({ energy: 1, bleeding: true }); let s = reveal(f, f.state, 'fixed').snapshot
    const original = structuredClone(s.itemStates)
    const items = s.site.ground.find((g) => g.nodeId === 'a')!.items
    expect(s.character.body.energy).toBe(0)
    const hp = s.character.body.condition.currentHealth
    for (const [index, item] of items.entries()) {
      const p = planResidenceItemTransfer(s, { ...binding(s), kind: 'pickup', instanceId: item.instanceId,
        placement: { x: index, y: 0, rotated: false } }, f.authorityFor(s), f.dependencies)
      expect(p.energyCost).toBe(0); expect(p.steps.map((v) => v.kind)).toEqual(['primary'])
      s = p.snapshot
      expect(s.character.body.condition.currentHealth).toBe(hp)
      expect(s.carried.backpack.items).toContainEqual(item)
      s = planResidenceItemTransfer(s, { ...binding(s), kind: 'drop', instanceId: item.instanceId }, f.authorityFor(s), f.dependencies).snapshot
    }
    expect(s.itemStates).toEqual(original)
    s = planResidenceLocationRest(s, { ...binding(s), kind: 'rest' }, f.authorityFor(s), f.dependencies).snapshot
    expect(s.character.body.energy).toBe(100); expect(s.character.cycle).toBe(2)
    expect(s.character.body.condition.currentHealth).toBe(hp - 2)
    for (const [index, item] of items.entries()) {
      s = planResidenceItemTransfer(s, { ...binding(s), kind: 'pickup', instanceId: item.instanceId,
        placement: { x: index, y: 0, rotated: false } }, f.authorityFor(s), f.dependencies).snapshot
    }
    expect(s.itemStates).toEqual(original)
    expect(s.itemStates.states.map((v) => v.resource)).toEqual(expect.arrayContaining([{ kind: 'durability', current: 2 }, { kind: 'charge', current: 1 }]))
    expect(calculateBackpackWeightSubtotal(s.carried.backpack, f.dependencies.catalog.physical)).toBe(3)
  })
  it('a full backpack does not block reveal-to-ground, but does block overlapping pickup', () => {
    const f = fixture(); const s = mutable(f.state)
    s.carried.backpack.items.push({ instanceId: 'large', definitionId: 'bulky', quantity: 1 })
    s.carried.backpack.placements.push({ instanceId: 'large', x: 0, y: 0, rotated: false })
    s.itemStates.states.push({ instanceId: 'large', definitionId: 'bulky', resource: { kind: 'none' } })
    const r = reveal(f, s, 'fixed').snapshot
    expect(r.site.sources[0].claimed).toBe(true); expect(r.site.ground[0].items).toHaveLength(2)
    expect(() => planResidenceItemTransfer(r, { ...binding(r), kind: 'pickup', instanceId: r.site.ground[0].items[0].instanceId,
      placement: { x: 0, y: 0, rotated: false } }, f.authorityFor(r), f.dependencies)).toThrow()
    expect(r.carried.backpack.items).toHaveLength(1)
  })
  it.each(['out-of-bounds', 'carry-limit', 'partial', 'auto-placement', 'remote', 'task-item'])('rejects %s whole-instance transfer without state changes', (mode) => {
    const catalog = catalogInput()
    if (mode === 'carry-limit' || mode === 'task-item') catalog.sources[0].contents = { kind: 'fixed', grants: [
      { definitionId: mode === 'carry-limit' ? 'heavy' : 'quest', quantity: 1, resource: { kind: 'none' } },
    ] }
    const f = fixture({ catalog }); let s = reveal(f, f.state, 'fixed').snapshot
    const id = s.site.ground[0].items[0].instanceId
    if (mode === 'remote') s = move(f, s, 'ab').snapshot
    const before = structuredClone(s)
    const request = { ...binding(s), kind: 'pickup', instanceId: id,
      placement: { x: mode === 'out-of-bounds' ? 4 : 0, y: 0, rotated: false } }
    if (mode === 'partial') Reflect.set(request, 'quantity', 1)
    if (mode === 'auto-placement') Reflect.deleteProperty(request, 'placement')
    expect(() => planResidenceItemTransfer(s, request, f.authorityFor(s), f.dependencies)).toThrow()
    expect(s).toEqual(before)
  })
  it('whole stack quantity stays exact without implicit split or merge', () => {
    const catalog = catalogInput(); catalog.sources[0].contents = { kind: 'fixed', grants: [{ definitionId: 'supply', quantity: 3, resource: { kind: 'none' } }] }
    const f = fixture({ catalog }); const s = reveal(f, f.state, 'fixed').snapshot; const item = s.site.ground[0].items[0]
    const p = planResidenceItemTransfer(s, { ...binding(s), kind: 'pickup', instanceId: item.instanceId,
      placement: { x: 2, y: 2, rotated: false } }, f.authorityFor(s), f.dependencies)
    expect(p.snapshot.carried.backpack.items).toEqual([item]); expect(item.quantity).toBe(3)
    expect(p.snapshot.itemStates).toEqual(s.itemStates)
  })
  it.each(['ground-duplicate', 'backpack-duplicate', 'equipment-duplicate', 'quick-slot-duplicate', 'missing-state', 'extra-state',
    'state-duplicate', 'wrong-definition', 'bad-charge', 'bad-durability', 'bad-quantity', 'extra-resource-field'])('rejects %s at strict restore', (mode) => {
    const f = fixture(); const s = mutable(reveal(f, f.state, 'fixed').snapshot)
    const pipe = s.site.ground[0].items[0]; const lamp = s.site.ground[0].items[1]
    if (mode === 'ground-duplicate') s.site.ground[1].items.push(pipe)
    if (mode === 'backpack-duplicate') { s.carried.backpack.items.push(pipe); s.carried.backpack.placements.push({ instanceId: pipe.instanceId, x: 0, y: 0, rotated: false }) }
    if (mode === 'equipment-duplicate') s.carried.equipment.weapon = pipe
    if (mode === 'quick-slot-duplicate') {
      const item = { instanceId: 'quick', definitionId: 'supply', quantity: 1 }
      s.carried.quickSlots.slots = [item, item]
      s.itemStates.states.push({ instanceId: item.instanceId, definitionId: item.definitionId, resource: { kind: 'none' } })
    }
    if (mode === 'missing-state') s.itemStates.states.pop()
    if (mode === 'extra-state') s.itemStates.states.push({ instanceId: 'missing', definitionId: 'lamp', resource: { kind: 'charge', current: 1 } })
    if (mode === 'state-duplicate') s.itemStates.states.push(s.itemStates.states[0])
    if (mode === 'wrong-definition') s.itemStates.states[0].definitionId = 'supply'
    if (mode === 'bad-charge') s.itemStates.states.find((i) => i.instanceId === lamp.instanceId)!.resource = { kind: 'charge', current: 4 }
    if (mode === 'bad-durability') s.itemStates.states.find((i) => i.instanceId === pipe.instanceId)!.resource = { kind: 'durability', current: -1 }
    if (mode === 'bad-quantity') pipe.quantity = 2
    if (mode === 'extra-resource-field') Reflect.set(s.itemStates.states[0].resource, 'maximum', 10)
    const before = structuredClone(s)
    expect(() => restoreResidenceLocationCandidate(s, f.authorityFor(s), f.dependencies)).toThrow()
    expect(s).toEqual(before)
  })
  it('invalid/remote/claimed/zero-energy source requests never draw or consume state', () => {
    const f = fixture({ energy: 0 }); const draw = vi.spyOn(random, 'drawIntInclusive')
    const before = structuredClone(f.state)
    for (const id of ['lottery-a', 'lottery-b', 'unknown']) expect(() => reveal(f, f.state, id)).toThrow()
    expect(draw).not.toHaveBeenCalled(); expect(f.state).toEqual(before); vi.restoreAllMocks()
  })
  it('catalog weight bands allow their carryable overload and equipped/quick items stay real but outside backpack weight', () => {
    const catalog = catalogInput(); catalog.sources[0].contents = { kind: 'fixed', grants: [{ definitionId: 'supply', quantity: 5, resource: { kind: 'none' } }] }
    const f = fixture({ catalog }); const raw = mutable(f.state)
    raw.carried.equipment.weapon = { instanceId: 'equipped', definitionId: 'pipe', quantity: 1 }
    raw.carried.quickSlots.slots[0] = { instanceId: 'quick', definitionId: 'supply', quantity: 1 }
    raw.itemStates.states.push({ instanceId: 'equipped', definitionId: 'pipe', resource: { kind: 'durability', current: 1 } },
      { instanceId: 'quick', definitionId: 'supply', resource: { kind: 'none' } })
    const s = reveal(f, raw, 'fixed').snapshot
    const result = planResidenceItemTransfer(s, { ...binding(s), kind: 'pickup', instanceId: s.site.ground[0].items[0].instanceId,
      placement: { x: 0, y: 0, rotated: false } }, f.authorityFor(s), f.dependencies)
    expect(calculateBackpackWeightSubtotal(result.snapshot.carried.backpack, f.dependencies.catalog.physical)).toBe(10)
    expect(result.snapshot.carried.equipment).toEqual(raw.carried.equipment)
    expect(result.snapshot.carried.quickSlots).toEqual(raw.carried.quickSlots)
  })
  it('already claimed and pre-existing stable output identity reject before seeded sampling', () => {
    const f = fixture(); const claimed = reveal(f, f.state, 'lottery-a').snapshot
    const collision = mutable(claimed); collision.site.sources.find((s) => s.id === 'lottery-a')!.claimed = false
    collision.site.sources.find((s) => s.id === 'lottery-a')!.drawIndex = 0
    const draw = vi.spyOn(random, 'drawIntInclusive')
    try { expect(() => reveal(f, claimed, 'lottery-a')).toThrow(); expect(() => reveal(f, collision, 'lottery-a')).toThrow(); expect(draw).not.toHaveBeenCalled() }
    finally { vi.restoreAllMocks() }
  })
})
