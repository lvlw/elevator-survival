import { expect, it } from 'vitest'
import { fullBagFixture } from './boundary-fixture'
import { planSupplyInventory } from '../../../core/residence-supply/inventory'
import { readSupplyValue } from '../../../core/residence-supply/validation'
import { ordinaryPickupCapacity } from '../../../core/residence-supply/inventory-qualification'
import { planSupplyTaskTransfer } from '../../../core/residence-task/transfer'

it('fills compatible stack first, then places remainder using the genuine source identity', () => {
  const { f, value, food } = fullBagFixture()
  const target = value.carried.backpack.items.find(i => i.definitionId === food.definitionId)!
  const dropped = value.carried.backpack.items.find(i => i.definitionId !== food.definitionId && f.dependencies.catalog.physical.get(i.definitionId).stacking.kind === 'stackable')!
  const anchor = value.carried.backpack.placements.find(p => p.instanceId === dropped.instanceId)!
  const placement = { x: anchor.x, y: anchor.y, rotated: false }
  const free = planSupplyInventory(value, { expectedRevision: value.character.revision, kind: 'drop', instanceId: dropped.instanceId }, f.authorize(value)).snapshot
  const preview = ordinaryPickupCapacity(free, food.instanceId, 2, placement, f.dependencies)
  expect(preview.public).toMatchObject({ picked: 2, merged: 1, created: 1, remaining: 0, placements: [{ ...placement, quantity: 1 }] })
  const after = planSupplyInventory(free, { expectedRevision: free.character.revision, kind: 'pickup', instanceId: food.instanceId, quantity: 2, placement }, f.authorize(free)).snapshot
  expect(after.carried.backpack.items.find(i => i.instanceId === target.instanceId)?.quantity).toBe(2)
  expect(after.carried.backpack.items.find(i => i.instanceId === food.instanceId)?.quantity).toBe(1)
  expect(after.site!.ground.flatMap(r => r.items).some(i => i.instanceId === food.instanceId)).toBe(false)
  expect(after.itemStates).toEqual(free.itemStates)
  expect(readSupplyValue(JSON.parse(JSON.stringify(after)), f.dependencies)).toEqual(after)
})

it('task card, sample, component and module never enter ordinary pickup and still require placement', () => {
  const { f, value } = fullBagFixture()
  const tasks = value.carried.backpack.items.filter(i => !f.dependencies.catalog.data.items.find(d => d.physical.id === i.definitionId)!.ordinary)
  expect(tasks).toHaveLength(4)
  for (const item of tasks) {
    const dropped = planSupplyTaskTransfer(value, { kind: 'task-drop', expectedRevision: value.character.revision, instanceId: item.instanceId }, f.authorize(value)).snapshot
    expect(() => planSupplyInventory(dropped, { kind: 'pickup', expectedRevision: dropped.character.revision, instanceId: item.instanceId, quantity: 1 }, f.authorize(dropped))).toThrow()
    expect(() => planSupplyTaskTransfer(dropped, { kind: 'task-pickup', expectedRevision: dropped.character.revision, instanceId: item.instanceId }, f.authorize(dropped))).toThrow()
    const p = value.carried.backpack.placements.find(p => p.instanceId === item.instanceId)!
    const restored = planSupplyTaskTransfer(dropped, { kind: 'task-pickup', expectedRevision: dropped.character.revision,
      instanceId: item.instanceId, placement: { x: p.x, y: p.y, rotated: p.rotated } }, f.authorize(dropped)).snapshot
    expect(restored.carried).toEqual(value.carried)
  }
})
