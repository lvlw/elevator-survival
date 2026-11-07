import { expect, it } from 'vitest'
import { fullBagFixture } from './boundary-fixture'
import { planSupplyInventory } from '../../../core/residence-supply/inventory'
import { readSupplyValue } from '../../../core/residence-supply/validation'
import { ordinaryPickupCapacity } from '../../../core/residence-supply/inventory-qualification'
import { getOccupiedCells, calculateBackpackWeightSubtotal } from '../../../core/inventory'

it('full real 6x4 bag partially receives ground food and strictly restores exact source units', () => {
  const { f, value, food } = fullBagFixture()
  expect(getOccupiedCells(value.carried.backpack, f.dependencies.catalog.physical)).toHaveLength(24)
  const before = structuredClone(value)
  const capacity = ordinaryPickupCapacity(value, food.instanceId, 2, undefined, f.dependencies)
  expect(capacity.public).toMatchObject({ picked: 1, merged: 1, created: 0, remaining: 1, limitedBy: ['space'] })
  expect(capacity.public.placements).toEqual([])
  expect(value).toEqual(before)
  const after = planSupplyInventory(value, { kind: 'pickup', expectedRevision: value.character.revision,
    instanceId: food.instanceId, quantity: 2 }, f.authorize(value)).snapshot
  expect(after.origins).toEqual(value.origins)
  expect(after.itemStates).toEqual(value.itemStates)
  expect(after.site!.ground.find(row => row.nodeId === 'H7')!.items.find(item => item.instanceId === food.instanceId)?.quantity).toBe(1)
  expect(calculateBackpackWeightSubtotal(after.carried.backpack, f.dependencies.catalog.physical))
    .toBe(calculateBackpackWeightSubtotal(value.carried.backpack, f.dependencies.catalog.physical) + 1)
  expect(readSupplyValue(JSON.parse(JSON.stringify(after)), f.dependencies)).toEqual(after)
  expect(() => planSupplyInventory(after, { kind: 'pickup', expectedRevision: after.character.revision,
    instanceId: food.instanceId, quantity: 1 }, f.authorize(after))).toThrow()
  expect(after.unitTransfers.at(-1)).toMatchObject({ from: food.instanceId, kind: 'merge' })
  expect(() => readSupplyValue({ ...after, unitTransfers: value.unitTransfers }, f.dependencies)).toThrow()
})

it('full bag accepts a requested single unit entirely into its compatible stack without any placement', () => {
  const { f, value, food } = fullBagFixture()
  const capacity = ordinaryPickupCapacity(value, food.instanceId, 1, undefined, f.dependencies)
  expect(capacity.public).toMatchObject({ requested: 1, picked: 1, merged: 1, created: 0, remaining: 1, limitedBy: [] })
  expect(capacity.position).toBeNull()
})

it('invalid quantities and task instances are rejected without changing the full boundary', () => {
  const { f, value, food } = fullBagFixture()
  const before = structuredClone(value)
  for (const quantity of [-1, 0, 0.5, true, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 3]) {
    expect(() => planSupplyInventory(value, { kind: 'pickup', expectedRevision: value.character.revision,
      instanceId: food.instanceId, quantity }, f.authorize(value))).toThrow()
  }
  for (const item of value.carried.backpack.items.filter(item => !f.dependencies.catalog.data.items.find(d => d.physical.id === item.definitionId)!.ordinary)) {
    expect(() => ordinaryPickupCapacity(value, item.instanceId, 1, undefined, f.dependencies)).toThrow()
  }
  expect(value).toEqual(before)
})
