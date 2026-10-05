import { describe, expect, it } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { fixture as makeFixture, searchAt, pickAlias, atNode, resolvedDanger, forcedDraw } from '../residence-task/test-fixtures'
import { planSupplyRest } from './controlled'
import { planSupplyTaskTransfer } from '../residence-task/transfer'
import { planSupplyTaskAction } from '../residence-task/actions'
import { planSupplyInventory } from './inventory'
import { planSupplyMedical } from './medical'
import { readSupplyValue } from './validation'
import { calculateBackpackWeightSubtotal } from '../inventory'
const inv = (f: ReturnType<typeof fixture>, v: typeof f.value, request: object) =>
  planSupplyInventory(v, { expectedRevision: v.character.revision, ...request }, f.authorize(v)).snapshot
describe('P06 real stack organization and exact source units', () => {
  it('real producer assets at 27 allow same quick item to 28, next item to 29 rejects unchanged', () => {
    const f = forcedDraw(fixture(), 41)
    let v = resolvedDanger(f)
    const room = (node: string) => { v = atNode(f, v, node) }
    const rest = () => { v = planSupplyRest(v, { kind: 'rest', expectedRevision: v.character.revision }, f.authorize(v)).snapshot }
    const act = (id: string, extra = {}) => {
      if (v.character.body.energy === 0) rest()
      v = planSupplyTaskAction(v, { kind: 'task', expectedRevision: v.character.revision, actionId: id, ...extra }, f.authorize(v)).snapshot
    }
    const search = (id: string) => { if (v.character.body.energy === 0) rest(); v = searchAt(f, v, id) }
    const pick = (alias: string, x: number, y: number) => { v = pickAlias(f, v, alias, x, y) }
    const addMaterial = (alias: string, x: number) => {
      const definition = f.dependencies.tasks.data.items.find(i => i.alias === alias)!.id
      const target = v.carried.backpack.items.find(i => i.definitionId === definition)
      pick(alias, target ? 0 : x, target ? 3 : 2)
      if (target) {
        const source = v.carried.backpack.items.find(i => i.definitionId === definition && i.instanceId !== target.instanceId)!
        v = inv(f, v, { kind: 'merge', instanceId: source.instanceId, targetId: target.instanceId, quantity: source.quantity })
      }
    }
    room('L2'); act('verify', { method: 'full' }); act('fix', { method: 'manual' }); act('component', { placement: { x: 0, y: 0, rotated: false } })
    room('C1'); act('match', { method: 'fast' }); room('C3'); act('module', { placement: { x: 4, y: 0, rotated: false } })
    room('H5'); act('sample', { method: 'cautious', placement: { x: 2, y: 0, rotated: false } })
    room('H1'); act('fire-door', { method: 'toolbox', toolInstanceId: v.carried.equipment.utility!.instanceId })
    addMaterial('electronic', 1); search('H1-search'); addMaterial('metal', 0); addMaterial('cloth', 3)
    search('H2-search'); pick('painkiller', 5, 0); pick('bandage', 5, 3)
    const bandage = v.carried.backpack.items.find(i => i.definitionId === f.dependencies.tasks.data.items.find(i => i.alias === 'bandage')!.id)!
    v = inv(f, v, { kind: 'to-quick', instanceId: bandage.instanceId, slot: 1 })
    search('H3-search'); addMaterial('battery', 2)
    room('L1'); act('l1-open', { method: 'manual' }); search('L1-cabinet'); pick('food', 4, 2)
    search('L2-search'); addMaterial('metal', 0); addMaterial('cloth', 3); pick('food', 5, 2)
    room('L3'); act('l3-open', { method: 'manual' }); search('L3-rack'); addMaterial('metal', 0); addMaterial('electronic', 1); addMaterial('battery', 2)
    search('C4-cabinet'); addMaterial('metal', 0); addMaterial('electronic', 1); addMaterial('battery', 2)
    expect(calculateBackpackWeightSubtotal(v.carried.backpack, f.dependencies.catalog.physical)).toBe(27)
    const quick = v.carried.quickSlots.slots[1]!, state = v.itemStates.states.find(s => s.instanceId === quick.instanceId)
    v = inv(f, v, { kind: 'to-backpack', slot: 1, placement: { x: 4, y: 3, rotated: false } })
    expect(calculateBackpackWeightSubtotal(v.carried.backpack, f.dependencies.catalog.physical)).toBe(28)
    expect(v.itemStates.states.find(s => s.instanceId === quick.instanceId)).toEqual(state)
    const before = structuredClone(v)
    expect(() => inv(f, v, { kind: 'to-backpack', slot: 0, placement: { x: 5, y: 3, rotated: false } })).toThrowError(expect.objectContaining({ code: 'CANNOT_CARRY' }))
    expect(v).toEqual(before)
    // Task pickup also uses real placement/weight, never an ordinary bypass.
    const task = v.carried.backpack.items.find(i => i.definitionId === 'quest_sealed_pathogen_case')!
    const dropped = planSupplyTaskTransfer(v, { kind: 'task-drop', expectedRevision: v.character.revision, instanceId: task.instanceId }, f.authorize(v)).snapshot
    expect(() => planSupplyTaskTransfer(dropped, { kind: 'task-pickup', expectedRevision: dropped.character.revision, instanceId: task.instanceId,
      placement: { x: 5, y: 3, rotated: false } }, f.authorize(dropped))).toThrow()
  })
  it('split, partial merge, quick transfer, free medical consume preserve source shares and total weight', () => {
    const f = fixture({ hp: 8, bleeding: true })
    const here = atNode(f, f.value, 'L1')
    const opened = planSupplyTaskAction(here, { kind: 'task', expectedRevision: here.character.revision, actionId: 'l1-open', method: 'manual' }, f.authorize(here)).snapshot
    let v = pickAlias(f, searchAt(f, opened, 'L1-cabinet'), 'food', 0)
    const original = v.carried.backpack.items[0], weight = calculateBackpackWeightSubtotal(v.carried.backpack, f.dependencies.catalog.physical)
    const hp = v.character.body.condition.currentHealth, energy = v.character.body.energy
    v = inv(f, v, { kind: 'split', instanceId: original.instanceId, quantity: 1, placement: { x: 1, y: 0, rotated: false } })
    const child = v.carried.backpack.items.find(i => i.instanceId !== original.instanceId)!
    expect(v.unitTransfers).toHaveLength(1)
    expect(v.character.body.condition.currentHealth).toBe(hp)
    expect(v.character.body.energy).toBe(energy)
    expect(calculateBackpackWeightSubtotal(v.carried.backpack, f.dependencies.catalog.physical)).toBe(weight)
    v = inv(f, v, { kind: 'merge', instanceId: child.instanceId, targetId: original.instanceId, quantity: 1 })
    expect(v.carried.backpack.items).toEqual([original])
    expect(() => inv(f, v, { kind: 'to-quick', instanceId: original.instanceId, slot: 1 })).toThrow()
    v = pickAlias(f, v, 'bandage', 3)
    const bandage = v.carried.backpack.items.find(i => i.instanceId !== original.instanceId)!
    v = inv(f, v, { kind: 'to-quick', instanceId: bandage.instanceId, slot: 1 })
    expect(v.carried.quickSlots.slots[1]!.quantity).toBe(1)
    const quick = v.carried.quickSlots.slots[1]!, state = v.itemStates.states.find(s => s.instanceId === quick.instanceId)
    v = inv(f, v, { kind: 'to-backpack', slot: 1, placement: { x: 2, y: 0, rotated: false } })
    expect(v.carried.backpack.items.find(i => i.instanceId === quick.instanceId)).toEqual(quick)
    expect(v.itemStates.states.find(s => s.instanceId === quick.instanceId)).toEqual(state)
    expect(v.carried.quickSlots.slots[1]).toBeNull()
    v = readSupplyValue({ ...v, character: { ...v.character, body: { ...v.character.body, satiety: 2, energy: 0 } } }, f.dependencies)
    v = planSupplyMedical(v, { kind: 'medical', expectedRevision: v.character.revision, instanceId: quick.instanceId }, f.authorize(v)).snapshot
    expect(v.dispositions.at(-1)!.ranges).toHaveLength(1)
    expect(v.character.body.condition.currentHealth).toBe(hp + 1)
    expect(readSupplyValue(structuredClone(v), f.dependencies)).toEqual(v)
    expect(v.character.body.condition.bleeding).toBe(false)
    expect(() => inv(f, v, { kind: 'split', instanceId: original.instanceId, quantity: 1, placement: { x: 5, y: 4, rotated: false } })).toThrow()
  })
  it('same-total cross-origin substitution, overlapping shares and unrecorded deletion reject', () => {
    const f = fixture()
    let v = pickAlias(f, searchAt(f, f.value, 'H1-search'), 'metal', 0)
    v = pickAlias(f, searchAt(f, v, 'C4-cabinet'), 'metal', 1)
    const [a, b] = v.carried.backpack.items, aa = v.allocations.find(x => x.instanceId === a.instanceId)!, bb = v.allocations.find(x => x.instanceId === b.instanceId)!
    expect(() => readSupplyValue({ ...v, allocations: v.allocations.map(x => x === aa ? { ...x, ranges: bb.ranges } : x === bb ? { ...x, ranges: aa.ranges } : x) }, f.dependencies)).toThrow()
    const merged = inv(f, v, { kind: 'merge', instanceId: b.instanceId, targetId: a.instanceId, quantity: 1 })
    expect(merged.carried.backpack.items[0].quantity).toBe(2)
    expect(merged.allocations.find(x => x.instanceId === a.instanceId)!.ranges).toHaveLength(2)
    expect(() => readSupplyValue({ ...merged, unitTransfers: [] }, f.dependencies)).toThrow()
    expect(() => readSupplyValue({ ...v, allocations: v.allocations.map(x => x === bb ? { ...x, ranges: aa.ranges } : x) }, f.dependencies)).toThrow()
    expect(() => readSupplyValue({ ...v, carried: { ...v.carried, backpack: { ...v.carried.backpack, items: [a],
      placements: v.carried.backpack.placements.filter(p => p.instanceId === a.instanceId) } }, itemStates: { states: v.itemStates.states.filter(s => s.instanceId !== b.instanceId) } }, f.dependencies)).toThrow()
  })
})
