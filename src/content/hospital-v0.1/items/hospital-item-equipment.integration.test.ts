import { describe, expect, it } from 'vitest'
import {
  createBackpackEquipmentSnapshot,
  createEmptyEquipment,
  createEquipmentSnapshot,
  equipItemFromBackpack,
  EquipmentError,
  swapBackpackItemWithEquippedItem,
  unequipItemToBackpack,
  type EquipmentSlotKind,
} from '../../../core/equipment'
import {
  calculateBackpackWeightSubtotal,
  createBackpackSnapshot,
  getRemainingCellCount,
  InventoryError,
  type BackpackPlacement,
  type ItemInstance,
} from '../../../core/inventory'
import { createItemState } from '../../../core/item-state'
import { classifyLoad } from '../../../core/load'
import { hospitalSliceV01RuleConfig } from '../rule-config'
import { hospitalItemCatalog } from './hospital-item-catalog'
import { hospitalItemEquipmentCatalog } from './hospital-item-equipment-catalog'
import { hospitalItemEquipmentProfiles } from './hospital-item-equipment-profiles'
import { HOSPITAL_ITEM_IDS, HOSPITAL_SLICE_ITEM_IDS } from './hospital-item-ids'
import { hospitalItemResourceCatalog } from './hospital-item-resource-catalog'

const dependencies = {
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
}
const item = (instanceId: string, definitionId: string, quantity = 1) => ({
  instanceId,
  definitionId,
  quantity,
})
const at = (
  instanceId: string,
  x: number,
  y: number,
  rotated = false,
): BackpackPlacement => ({ instanceId, x, y, rotated })
const backpack = (
  items: readonly ItemInstance[],
  placements: readonly BackpackPlacement[],
) =>
  createBackpackSnapshot(
    { width: 6, height: 4, items, placements },
    hospitalItemCatalog,
  )
const empty = () =>
  createEmptyEquipment(hospitalItemCatalog, hospitalItemEquipmentCatalog)
const combined = (
  items: readonly ItemInstance[],
  placements: readonly BackpackPlacement[],
) =>
  createBackpackEquipmentSnapshot(
    backpack(items, placements),
    empty(),
    hospitalItemCatalog,
    hospitalItemEquipmentCatalog,
  )

describe('hospital equipment eligibility', () => {
  it('covers exactly the 18 physical definitions', () => {
    expect(hospitalItemEquipmentProfiles).toHaveLength(18)
    expect(hospitalItemEquipmentCatalog.definitionIds).toEqual(
      hospitalItemCatalog.definitionIds,
    )
    expect(hospitalItemEquipmentCatalog.definitionIds).toEqual(
      [...HOSPITAL_SLICE_ITEM_IDS].sort(),
    )
  })

  it.each([
    [HOSPITAL_ITEM_IDS.metalPipe, 'weapon'],
    [HOSPITAL_ITEM_IDS.fireAxe, 'weapon'],
    [HOSPITAL_ITEM_IDS.heavyCoat, 'armor'],
    [HOSPITAL_ITEM_IDS.crowbar, 'utility'],
    [HOSPITAL_ITEM_IDS.flashlight, 'utility'],
    [HOSPITAL_ITEM_IDS.toolkit, 'utility'],
  ] as const)('%s is eligible only for %s', (definitionId, slot) => {
    expect(hospitalItemEquipmentCatalog.get(definitionId)).toEqual({
      definitionId,
      kind: 'equippable',
      eligibleSlots: [slot],
    })
  })

  it.each([
    HOSPITAL_ITEM_IDS.bandage,
    HOSPITAL_ITEM_IDS.sealedPathogenCase,
    HOSPITAL_ITEM_IDS.isolationWardAccessCard,
  ])('%s is not equippable', (definitionId) => {
    expect(hospitalItemEquipmentCatalog.get(definitionId)).toEqual({
      definitionId,
      kind: 'not-equippable',
    })
  })

  it('has 2 weapon, 1 armor, 3 utility and 12 non-equippable profiles', () => {
    const counts = { weapon: 0, armor: 0, utility: 0, none: 0 }
    for (const id of hospitalItemEquipmentCatalog.definitionIds) {
      const profile = hospitalItemEquipmentCatalog.get(id)
      if (profile.kind === 'not-equippable') counts.none += 1
      else counts[profile.eligibleSlots[0]] += 1
    }
    expect(counts).toEqual({ weapon: 2, armor: 1, utility: 3, none: 12 })
  })

  it('freezes every hospital profile and slot list', () => {
    expect(Object.isFrozen(hospitalItemEquipmentProfiles)).toBe(true)
    for (const profile of hospitalItemEquipmentProfiles) {
      expect(Object.isFrozen(profile)).toBe(true)
      if (profile.kind === 'equippable') {
        expect(Object.isFrozen(profile.eligibleSlots)).toBe(true)
      }
    }
  })
})

describe('hospital equipment transfer geometry', () => {
  const threeItems = () =>
    combined(
      [
        item('pipe', HOSPITAL_ITEM_IDS.metalPipe),
        item('coat', HOSPITAL_ITEM_IDS.heavyCoat),
        item('light', HOSPITAL_ITEM_IDS.flashlight),
      ],
      [at('pipe', 0, 0), at('coat', 1, 0), at('light', 3, 0)],
    )

  it.each([
    ['pipe', 'weapon', 3],
    ['coat', 'armor', 4],
    ['light', 'utility', 2],
  ] as const)('equipping %s releases %s cells', (instanceId, slot, cells) => {
    const before = threeItems()
    const after = equipItemFromBackpack(
      before,
      instanceId,
      slot,
      dependencies,
    )
    expect(
      getRemainingCellCount(after.backpack, hospitalItemCatalog) -
        getRemainingCellCount(before.backpack, hospitalItemCatalog),
    ).toBe(cells)
  })

  it('three equipped items reduce backpack weight by 6', () => {
    const before = threeItems()
    let after = equipItemFromBackpack(before, 'pipe', 'weapon', dependencies)
    after = equipItemFromBackpack(after, 'coat', 'armor', dependencies)
    after = equipItemFromBackpack(after, 'light', 'utility', dependencies)
    expect(calculateBackpackWeightSubtotal(before.backpack, hospitalItemCatalog)).toBe(6)
    expect(calculateBackpackWeightSubtotal(after.backpack, hospitalItemCatalog)).toBe(0)
  })

  it('unloading restores physical cells and weight', () => {
    const equipped = equipItemFromBackpack(
      threeItems(),
      'pipe',
      'weapon',
      dependencies,
    )
    const after = unequipItemToBackpack(
      equipped,
      'weapon',
      at('pipe', 0, 3, true),
      dependencies,
    )
    expect(
      calculateBackpackWeightSubtotal(after.backpack, hospitalItemCatalog),
    ).toBe(
      calculateBackpackWeightSubtotal(equipped.backpack, hospitalItemCatalog) +
        3,
    )
    expect(
      getRemainingCellCount(equipped.backpack, hospitalItemCatalog) -
        getRemainingCellCount(after.backpack, hospitalItemCatalog),
    ).toBe(3)
  })

  it('fails explicitly when unloading into occupied space', () => {
    const snapshot = createBackpackEquipmentSnapshot(
      backpack(
        [item('coat', HOSPITAL_ITEM_IDS.heavyCoat)],
        [at('coat', 0, 0)],
      ),
      createEquipmentSnapshot(
        {
          weapon: item('pipe', HOSPITAL_ITEM_IDS.metalPipe),
          armor: null,
          utility: null,
        },
        hospitalItemCatalog,
        hospitalItemEquipmentCatalog,
      ),
      hospitalItemCatalog,
      hospitalItemEquipmentCatalog,
    )
    expect(() =>
      unequipItemToBackpack(
        snapshot,
        'weapon',
        at('pipe', 0, 0),
        dependencies,
      ),
    ).toThrowError(InventoryError)
  })

  it('swaps weapon instances and evaluates only the final backpack', () => {
    const snapshot = createBackpackEquipmentSnapshot(
      backpack(
        [item('axe', HOSPITAL_ITEM_IDS.fireAxe)],
        [at('axe', 0, 0)],
      ),
      createEquipmentSnapshot(
        {
          weapon: item('pipe', HOSPITAL_ITEM_IDS.metalPipe),
          armor: null,
          utility: null,
        },
        hospitalItemCatalog,
        hospitalItemEquipmentCatalog,
      ),
      hospitalItemCatalog,
      hospitalItemEquipmentCatalog,
    )
    const result = swapBackpackItemWithEquippedItem(
      snapshot,
      'axe',
      'weapon',
      at('pipe', 0, 0),
      dependencies,
    )
    expect(result.equipment.weapon?.instanceId).toBe('axe')
    expect(result.backpack.items.map((entry) => entry.instanceId)).toEqual([
      'pipe',
    ])
    expect(
      calculateBackpackWeightSubtotal(result.backpack, hospitalItemCatalog),
    ).toBe(3)
  })
})

function boundarySupplies(): {
  items: readonly ItemInstance[]
  placements: readonly BackpackPlacement[]
} {
  return {
    items: [
      item('metal', HOSPITAL_ITEM_IDS.metalParts, 5),
      item('electronic', HOSPITAL_ITEM_IDS.electronicComponents, 5),
      item('fabric', HOSPITAL_ITEM_IDS.fabric, 5),
      item('bandage', HOSPITAL_ITEM_IDS.bandage, 1),
    ],
    placements: [
      at('metal', 0, 0),
      at('electronic', 1, 0),
      at('fabric', 2, 0),
      at('bandage', 3, 0),
    ],
  }
}

describe('DEC-016 backpack load boundary', () => {
  it('equipping changes backpack weight 17 loaded to 16 normal', () => {
    const supplies = boundarySupplies()
    const before = combined(
      [...supplies.items, item('light', HOSPITAL_ITEM_IDS.flashlight)],
      [...supplies.placements, at('light', 4, 0)],
    )
    const beforeWeight = calculateBackpackWeightSubtotal(
      before.backpack,
      hospitalItemCatalog,
    )
    const after = equipItemFromBackpack(
      before,
      'light',
      'utility',
      dependencies,
    )
    const afterWeight = calculateBackpackWeightSubtotal(
      after.backpack,
      hospitalItemCatalog,
    )
    expect([beforeWeight, classifyLoad(beforeWeight, hospitalSliceV01RuleConfig.backpack).tier]).toEqual([17, 'loaded'])
    expect([afterWeight, classifyLoad(afterWeight, hospitalSliceV01RuleConfig.backpack).tier]).toEqual([16, 'normal'])
  })

  it('unloading changes backpack weight 16 normal to 17 loaded', () => {
    const supplies = boundarySupplies()
    const before = createBackpackEquipmentSnapshot(
      backpack(supplies.items, supplies.placements),
      createEquipmentSnapshot(
        {
          weapon: null,
          armor: null,
          utility: item('light', HOSPITAL_ITEM_IDS.flashlight),
        },
        hospitalItemCatalog,
        hospitalItemEquipmentCatalog,
      ),
      hospitalItemCatalog,
      hospitalItemEquipmentCatalog,
    )
    const beforeWeight = calculateBackpackWeightSubtotal(
      before.backpack,
      hospitalItemCatalog,
    )
    const after = unequipItemToBackpack(
      before,
      'utility',
      at('light', 4, 0),
      dependencies,
    )
    const afterWeight = calculateBackpackWeightSubtotal(
      after.backpack,
      hospitalItemCatalog,
    )
    expect([beforeWeight, classifyLoad(beforeWeight, hospitalSliceV01RuleConfig.backpack).tier]).toEqual([16, 'normal'])
    expect([afterWeight, classifyLoad(afterWeight, hospitalSliceV01RuleConfig.backpack).tier]).toEqual([17, 'loaded'])
  })

  it.each([
    ['weapon', 'pipe', HOSPITAL_ITEM_IDS.metalPipe, 'durability'],
    ['armor', 'coat', HOSPITAL_ITEM_IDS.heavyCoat, 'integrity'],
    ['utility', 'light', HOSPITAL_ITEM_IDS.flashlight, 'charge'],
  ] as const)('resource-zero %s remains equipped without backpack weight', (slot, instanceId, definitionId, kind) => {
    const physicalInstance = item(instanceId, definitionId)
    const equipment = createEquipmentSnapshot(
      {
        weapon: slot === 'weapon' ? physicalInstance : null,
        armor: slot === 'armor' ? physicalInstance : null,
        utility: slot === 'utility' ? physicalInstance : null,
      },
      hospitalItemCatalog,
      hospitalItemEquipmentCatalog,
    )
    const resource = createItemState(
      {
        instanceId,
        definitionId,
        resource: { kind, current: 0 },
      },
      hospitalItemResourceCatalog,
    )
    const snapshot = createBackpackEquipmentSnapshot(
      backpack([], []),
      equipment,
      hospitalItemCatalog,
      hospitalItemEquipmentCatalog,
    )
    expect(snapshot.equipment[slot as EquipmentSlotKind]?.instanceId).toBe(
      resource.instanceId,
    )
    expect(
      calculateBackpackWeightSubtotal(snapshot.backpack, hospitalItemCatalog),
    ).toBe(0)
  })

  it('broken pipe adds its unchanged weight 3 only after explicit unload', () => {
    const before = createBackpackEquipmentSnapshot(
      backpack([], []),
      createEquipmentSnapshot(
        {
          weapon: item('pipe', HOSPITAL_ITEM_IDS.metalPipe),
          armor: null,
          utility: null,
        },
        hospitalItemCatalog,
        hospitalItemEquipmentCatalog,
      ),
      hospitalItemCatalog,
      hospitalItemEquipmentCatalog,
    )
    const broken = createItemState(
      {
        instanceId: 'pipe',
        definitionId: HOSPITAL_ITEM_IDS.metalPipe,
        resource: { kind: 'durability', current: 0 },
      },
      hospitalItemResourceCatalog,
    )
    expect(broken.resource).toEqual({ kind: 'durability', current: 0 })
    const after = unequipItemToBackpack(
      before,
      'weapon',
      at('pipe', 0, 0),
      dependencies,
    )
    expect(
      calculateBackpackWeightSubtotal(after.backpack, hospitalItemCatalog),
    ).toBe(3)
  })

  it('rejects equipping a bandage', () => {
    const snapshot = combined(
      [item('bandage', HOSPITAL_ITEM_IDS.bandage)],
      [at('bandage', 0, 0)],
    )
    expect(() =>
      equipItemFromBackpack(snapshot, 'bandage', 'utility', dependencies),
    ).toThrowError(EquipmentError)
  })
})
