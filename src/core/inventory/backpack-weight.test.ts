import { describe, expect, it } from 'vitest'
import { createBackpackSnapshot, createEmptyBackpack } from './backpack-layout'
import { calculateBackpackWeightSubtotal } from './backpack-weight'
import { createItemCatalog } from './item-catalog'

const catalog = createItemCatalog([
  {
    id: 'large',
    name: '大型物品',
    width: 2,
    height: 2,
    unitWeight: 5,
    canRotate: true,
    stacking: { kind: 'none' },
  },
  {
    id: 'small',
    name: '小型物品',
    width: 1,
    height: 1,
    unitWeight: 2,
    canRotate: false,
    stacking: { kind: 'stackable', maxQuantity: 5 },
  },
])

describe('backpack weight subtotal', () => {
  it('returns zero for an empty backpack', () => {
    expect(
      calculateBackpackWeightSubtotal(
        createEmptyBackpack(6, 4, catalog),
        catalog,
      ),
    ).toBe(0)
  })

  it('calculates non-stackable and stacked quantities independently of size', () => {
    const snapshot = createBackpackSnapshot(
      {
        width: 6,
        height: 4,
        items: [
          { instanceId: 'large-1', definitionId: 'large', quantity: 1 },
          { instanceId: 'small-1', definitionId: 'small', quantity: 4 },
        ],
        placements: [
          { instanceId: 'large-1', x: 0, y: 0, rotated: true },
          { instanceId: 'small-1', x: 3, y: 0, rotated: false },
        ],
      },
      catalog,
    )
    expect(calculateBackpackWeightSubtotal(snapshot, catalog)).toBe(13)
  })

  it('does not change weight when an item rotates', () => {
    const base = {
      width: 6,
      height: 4,
      items: [{ instanceId: 'large-1', definitionId: 'large', quantity: 1 }],
    }
    const regular = createBackpackSnapshot(
      {
        ...base,
        placements: [
          { instanceId: 'large-1', x: 0, y: 0, rotated: false },
        ],
      },
      catalog,
    )
    const rotated = createBackpackSnapshot(
      {
        ...base,
        placements: [
          { instanceId: 'large-1', x: 0, y: 0, rotated: true },
        ],
      },
      catalog,
    )
    expect(calculateBackpackWeightSubtotal(regular, catalog)).toBe(
      calculateBackpackWeightSubtotal(rotated, catalog),
    )
  })

  it('rejects multiplication and subtotal overflow', () => {
    const multiplicationCatalog = createItemCatalog([
      {
        id: 'heavy-stack',
        name: '重堆叠',
        width: 1,
        height: 1,
        unitWeight: Number.MAX_SAFE_INTEGER,
        canRotate: false,
        stacking: { kind: 'stackable', maxQuantity: 2 },
      },
    ])
    const multiplication = createBackpackSnapshot(
      {
        width: 1,
        height: 1,
        items: [
          { instanceId: 'heavy', definitionId: 'heavy-stack', quantity: 2 },
        ],
        placements: [
          { instanceId: 'heavy', x: 0, y: 0, rotated: false },
        ],
      },
      multiplicationCatalog,
    )
    expect(() =>
      calculateBackpackWeightSubtotal(multiplication, multiplicationCatalog),
    ).toThrowError(expect.objectContaining({ code: 'WEIGHT_OVERFLOW' }))

    const sumCatalog = createItemCatalog([
      {
        id: 'heavy',
        name: '重物',
        width: 1,
        height: 1,
        unitWeight: Number.MAX_SAFE_INTEGER,
        canRotate: false,
        stacking: { kind: 'none' },
      },
    ])
    const sum = createBackpackSnapshot(
      {
        width: 2,
        height: 1,
        items: [
          { instanceId: 'a', definitionId: 'heavy', quantity: 1 },
          { instanceId: 'b', definitionId: 'heavy', quantity: 1 },
        ],
        placements: [
          { instanceId: 'a', x: 0, y: 0, rotated: false },
          { instanceId: 'b', x: 1, y: 0, rotated: false },
        ],
      },
      sumCatalog,
    )
    expect(() =>
      calculateBackpackWeightSubtotal(sum, sumCatalog),
    ).toThrowError(expect.objectContaining({ code: 'WEIGHT_OVERFLOW' }))
  })
})
