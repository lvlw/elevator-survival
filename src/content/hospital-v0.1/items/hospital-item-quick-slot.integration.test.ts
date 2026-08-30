import { describe, expect, it } from 'vitest'
import {
  calculateBackpackWeightSubtotal,
  createBackpackSnapshot,
  getOccupiedCellCount,
  type BackpackPlacement,
  type ItemInstance,
} from '../../../core/inventory'
import { createEmptyEquipment } from '../../../core/equipment'
import { classifyLoad } from '../../../core/load'
import {
  createCarriedItemContainersSnapshot,
  createEmptyQuickSlots,
  moveOneBackpackItemToQuickSlot,
  moveQuickSlotItemToBackpack,
  removeQuickSlotItem,
} from '../../../core/quick-slot'
import { hospitalSliceV01RuleConfig as config } from '../rule-config'
import { hospitalItemCatalog } from './hospital-item-catalog'
import { hospitalItemEquipmentCatalog } from './hospital-item-equipment-catalog'
import { HOSPITAL_ITEM_IDS, HOSPITAL_SLICE_ITEM_IDS } from './hospital-item-ids'
import { hospitalItemQuickSlotCatalog } from './hospital-item-quick-slot-catalog'
import { hospitalItemQuickSlotProfiles } from './hospital-item-quick-slot-profiles'
import { hospitalItemResourceCatalog } from './hospital-item-resource-catalog'

const dependencies = {
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
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
const carried = (
  items: readonly ItemInstance[],
  placements: readonly BackpackPlacement[],
) =>
  createCarriedItemContainersSnapshot(
    createBackpackSnapshot(
      {
        width: config.backpack.width,
        height: config.backpack.height,
        items,
        placements,
      },
      hospitalItemCatalog,
    ),
    createEmptyEquipment(hospitalItemCatalog, hospitalItemEquipmentCatalog),
    createEmptyQuickSlots(
      config.backpack.quickSlotCount,
      hospitalItemCatalog,
      hospitalItemQuickSlotCatalog,
    ),
    dependencies,
  )

describe('hospital quick-slot eligibility', () => {
  it('uses exactly two slots and covers all 18 items as 3 eligible plus 15 ineligible', () => {
    expect(config.backpack.quickSlotCount).toBe(2)
    expect(hospitalItemQuickSlotProfiles).toHaveLength(18)
    expect(hospitalItemQuickSlotCatalog.definitionIds).toEqual(
      [...HOSPITAL_SLICE_ITEM_IDS].sort(),
    )
    expect(
      hospitalItemQuickSlotCatalog.definitionIds.filter(
        (id) => hospitalItemQuickSlotCatalog.get(id).kind === 'eligible',
      ),
    ).toHaveLength(3)
    expect(
      hospitalItemQuickSlotCatalog.definitionIds.filter(
        (id) => hospitalItemQuickSlotCatalog.get(id).kind === 'not-eligible',
      ),
    ).toHaveLength(15)
  })

  it.each([
    HOSPITAL_ITEM_IDS.bandage,
    HOSPITAL_ITEM_IDS.disinfectant,
    HOSPITAL_ITEM_IDS.painkiller,
  ])('allows %s', (definitionId) => {
    expect(hospitalItemQuickSlotCatalog.get(definitionId).kind).toBe('eligible')
  })

  it.each([
    HOSPITAL_ITEM_IDS.metalPipe,
    HOSPITAL_ITEM_IDS.flashlight,
    HOSPITAL_ITEM_IDS.metalParts,
    HOSPITAL_ITEM_IDS.firstAidKit,
    HOSPITAL_ITEM_IDS.ration,
    HOSPITAL_ITEM_IDS.infectionSuppressant,
    HOSPITAL_ITEM_IDS.standardBattery,
    HOSPITAL_ITEM_IDS.isolationWardAccessCard,
    HOSPITAL_ITEM_IDS.sealedPathogenCase,
  ])('rejects %s', (definitionId) => {
    expect(hospitalItemQuickSlotCatalog.get(definitionId).kind).toBe(
      'not-eligible',
    )
  })

  it('keeps every eligible item resource profile at none', () => {
    for (const definitionId of hospitalItemQuickSlotCatalog.definitionIds) {
      if (hospitalItemQuickSlotCatalog.get(definitionId).kind === 'eligible') {
        expect(hospitalItemResourceCatalog.get(definitionId).kind).toBe('none')
      }
    }
  })
})

describe('hospital quick-slot container integration', () => {
  it.each([
    HOSPITAL_ITEM_IDS.firstAidKit,
    HOSPITAL_ITEM_IDS.ration,
    HOSPITAL_ITEM_IDS.infectionSuppressant,
    HOSPITAL_ITEM_IDS.standardBattery,
  ])('strict restore rejects %s in a quick slot', (definitionId) => {
    expect(() => createCarriedItemContainersSnapshot(
      createBackpackSnapshot({
        width: config.backpack.width,
        height: config.backpack.height,
        items: [],
        placements: [],
      }, hospitalItemCatalog),
      createEmptyEquipment(hospitalItemCatalog, hospitalItemEquipmentCatalog),
      { slots: [item('forged-quick-item', definitionId), null] },
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'NOT_ELIGIBLE' }))
  })

  it('extracts one bandage from three and lowers backpack weight by one', () => {
    const input = carried(
      [item('bandages', HOSPITAL_ITEM_IDS.bandage, 3)],
      [at('bandages', 0, 0)],
    )
    const result = moveOneBackpackItemToQuickSlot(
      input,
      {
        backpackInstanceId: 'bandages',
        targetSlotIndex: 0,
        extractedInstanceId: 'bandage-ready',
      },
      dependencies,
    )
    expect(result.backpack.items[0].quantity).toBe(2)
    expect(result.backpack.placements[0]).toEqual(at('bandages', 0, 0))
    expect(result.quickSlots.slots[0]).toEqual(
      item('bandage-ready', HOSPITAL_ITEM_IDS.bandage),
    )
    expect(getOccupiedCellCount(result.backpack, hospitalItemCatalog)).toBe(1)
    expect(calculateBackpackWeightSubtotal(input.backpack, hospitalItemCatalog)).toBe(3)
    expect(calculateBackpackWeightSubtotal(result.backpack, hospitalItemCatalog)).toBe(2)
  })

  it('rejects moving a first-aid kit into a quick slot', () => {
    const input = carried(
      [item('kit', HOSPITAL_ITEM_IDS.firstAidKit)],
      [at('kit', 0, 0)],
    )
    expect(() => moveOneBackpackItemToQuickSlot(
      input,
      { backpackInstanceId: 'kit', targetSlotIndex: 1 },
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'NOT_ELIGIBLE' }))
    expect(getOccupiedCellCount(input.backpack, hospitalItemCatalog)).toBe(2)
    expect(calculateBackpackWeightSubtotal(input.backpack, hospitalItemCatalog)).toBe(2)
  })

  it('changes loaded 17 to normal 16 when one bandage enters a quick slot', () => {
    const input = carried(
      [
        item('metal', HOSPITAL_ITEM_IDS.metalParts, 5),
        item('electronics', HOSPITAL_ITEM_IDS.electronicComponents, 5),
        item('fabric', HOSPITAL_ITEM_IDS.fabric, 5),
        item('bandages', HOSPITAL_ITEM_IDS.bandage, 2),
      ],
      [
        at('metal', 0, 0),
        at('electronics', 1, 0),
        at('fabric', 2, 0),
        at('bandages', 3, 0),
      ],
    )
    expect(classifyLoad(calculateBackpackWeightSubtotal(input.backpack, hospitalItemCatalog), config.backpack).tier).toBe('loaded')
    const result = moveOneBackpackItemToQuickSlot(
      input,
      {
        backpackInstanceId: 'bandages',
        targetSlotIndex: 0,
        extractedInstanceId: 'ready',
      },
      dependencies,
    )
    expect(calculateBackpackWeightSubtotal(result.backpack, hospitalItemCatalog)).toBe(16)
    expect(classifyLoad(16, config.backpack).tier).toBe('normal')
  })

  it('changes normal 16 back to loaded 17 when the item returns to the backpack', () => {
    const base = carried(
      [
        item('metal', HOSPITAL_ITEM_IDS.metalParts, 5),
        item('electronics', HOSPITAL_ITEM_IDS.electronicComponents, 5),
        item('fabric', HOSPITAL_ITEM_IDS.fabric, 5),
        item('bandages', HOSPITAL_ITEM_IDS.bandage, 2),
      ],
      [at('metal', 0, 0), at('electronics', 1, 0), at('fabric', 2, 0), at('bandages', 3, 0)],
    )
    const withQuickSlot = moveOneBackpackItemToQuickSlot(
      base,
      { backpackInstanceId: 'bandages', targetSlotIndex: 0, extractedInstanceId: 'ready' },
      dependencies,
    )
    const returned = moveQuickSlotItemToBackpack(
      withQuickSlot,
      { sourceSlotIndex: 0, placement: at('ready', 4, 0) },
      dependencies,
    )
    expect(calculateBackpackWeightSubtotal(returned.backpack, hospitalItemCatalog)).toBe(17)
    expect(classifyLoad(17, config.backpack).tier).toBe('loaded')
  })

  it('does not refill from a reserve stack after explicit removal', () => {
    const base = carried(
      [item('reserve', HOSPITAL_ITEM_IDS.bandage, 3)],
      [at('reserve', 0, 0)],
    )
    const ready = moveOneBackpackItemToQuickSlot(
      base,
      { backpackInstanceId: 'reserve', targetSlotIndex: 0, extractedInstanceId: 'active' },
      dependencies,
    )
    const removed = removeQuickSlotItem(ready, 0, dependencies)
    expect(removed.snapshot.quickSlots.slots).toEqual([null, null])
    expect(removed.snapshot.backpack.items[0]).toEqual(
      item('reserve', HOSPITAL_ITEM_IDS.bandage, 2),
    )
  })
})
