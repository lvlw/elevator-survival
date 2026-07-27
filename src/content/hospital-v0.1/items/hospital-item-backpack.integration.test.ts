import { describe, expect, it } from 'vitest'
import {
  calculateBackpackWeightSubtotal,
  createBackpackSnapshot,
  createItemInstance,
  getOccupiedCellCount,
  getOccupiedCells,
  getRemainingCellCount,
} from '../../../core/inventory'
import { classifyLoad } from '../../../core/load'
import { getRuleConfig } from '../../rule-config-registry'
import { HOSPITAL_SLICE_RULES_VERSION } from '../rule-config'
import { hospitalItemCatalog } from './hospital-item-catalog'
import { HOSPITAL_ITEM_IDS } from './hospital-item-ids'

const config = getRuleConfig(HOSPITAL_SLICE_RULES_VERSION)

describe('hospital physical items with backpack core', () => {
  it('places a formal physical combination in the registered 6×4 backpack', () => {
    const input = {
      width: config.backpack.width,
      height: config.backpack.height,
      items: [
        { instanceId: 'pipe', definitionId: HOSPITAL_ITEM_IDS.metalPipe, quantity: 1 },
        { instanceId: 'coat', definitionId: HOSPITAL_ITEM_IDS.heavyCoat, quantity: 1 },
        { instanceId: 'crowbar', definitionId: HOSPITAL_ITEM_IDS.crowbar, quantity: 1 },
        { instanceId: 'bandage', definitionId: HOSPITAL_ITEM_IDS.bandage, quantity: 1 },
        { instanceId: 'sample', definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase, quantity: 1 },
      ],
      placements: [
        { instanceId: 'pipe', x: 0, y: 0, rotated: false },
        { instanceId: 'coat', x: 1, y: 0, rotated: false },
        { instanceId: 'crowbar', x: 3, y: 0, rotated: true },
        { instanceId: 'bandage', x: 3, y: 1, rotated: false },
        { instanceId: 'sample', x: 4, y: 2, rotated: false },
      ],
    }
    const snapshot = createBackpackSnapshot(input, hospitalItemCatalog)
    expect(getOccupiedCellCount(snapshot, hospitalItemCatalog)).toBe(15)
    expect(getRemainingCellCount(snapshot, hospitalItemCatalog)).toBe(9)
    expect(calculateBackpackWeightSubtotal(snapshot, hospitalItemCatalog)).toBe(
      13,
    )

    const reversed = createBackpackSnapshot(
      {
        ...input,
        items: [...input.items].reverse(),
        placements: [...input.placements].reverse(),
      },
      hospitalItemCatalog,
    )
    expect(reversed).toEqual(snapshot)
  })

  it.each([
    HOSPITAL_ITEM_IDS.bandage,
    HOSPITAL_ITEM_IDS.standardBattery,
    HOSPITAL_ITEM_IDS.metalParts,
  ])('keeps formal stack %s in one cell and weights every unit', (id) => {
    const definition = hospitalItemCatalog.get(id)
    if (definition.stacking.kind !== 'stackable') {
      throw new Error('测试物品必须可堆叠')
    }
    const instance = createItemInstance(
      {
        instanceId: `${id}-stack`,
        definitionId: id,
        quantity: definition.stacking.maxQuantity,
      },
      hospitalItemCatalog,
    )
    const snapshot = createBackpackSnapshot(
      {
        width: config.backpack.width,
        height: config.backpack.height,
        items: [instance],
        placements: [
          { instanceId: instance.instanceId, x: 0, y: 0, rotated: false },
        ],
      },
      hospitalItemCatalog,
    )
    expect(getOccupiedCellCount(snapshot, hospitalItemCatalog)).toBe(1)
    expect(calculateBackpackWeightSubtotal(snapshot, hospitalItemCatalog)).toBe(
      definition.unitWeight * definition.stacking.maxQuantity,
    )
  })

  it('requires the formal sample case to occupy four cells and contribute weight four', () => {
    const snapshot = createBackpackSnapshot(
      {
        width: config.backpack.width,
        height: config.backpack.height,
        items: [
          {
            instanceId: 'sample',
            definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
            quantity: 1,
          },
        ],
        placements: [
          { instanceId: 'sample', x: 0, y: 0, rotated: false },
        ],
      },
      hospitalItemCatalog,
    )
    expect(getOccupiedCells(snapshot, hospitalItemCatalog)).toHaveLength(4)
    expect(calculateBackpackWeightSubtotal(snapshot, hospitalItemCatalog)).toBe(
      4,
    )
  })

  it('passes a formal item subtotal into registered load classification', () => {
    const definition = hospitalItemCatalog.get(HOSPITAL_ITEM_IDS.metalParts)
    if (definition.stacking.kind !== 'stackable') {
      throw new Error('金属零件必须可堆叠')
    }
    const snapshot = createBackpackSnapshot(
      {
        width: config.backpack.width,
        height: config.backpack.height,
        items: [
          {
            instanceId: 'metal',
            definitionId: HOSPITAL_ITEM_IDS.metalParts,
            quantity: definition.stacking.maxQuantity,
          },
          {
            instanceId: 'axe',
            definitionId: HOSPITAL_ITEM_IDS.fireAxe,
            quantity: 1,
          },
          {
            instanceId: 'toolkit',
            definitionId: HOSPITAL_ITEM_IDS.toolkit,
            quantity: 1,
          },
          {
            instanceId: 'sample',
            definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
            quantity: 1,
          },
        ],
        placements: [
          { instanceId: 'metal', x: 0, y: 0, rotated: false },
          { instanceId: 'axe', x: 1, y: 0, rotated: false },
          { instanceId: 'toolkit', x: 3, y: 0, rotated: false },
          { instanceId: 'sample', x: 4, y: 2, rotated: false },
        ],
      },
      hospitalItemCatalog,
    )
    const subtotal = calculateBackpackWeightSubtotal(
      snapshot,
      hospitalItemCatalog,
    )
    expect(subtotal).toBe(18)
    expect(classifyLoad(subtotal, config.backpack).tier).toBe('loaded')
  })
})
