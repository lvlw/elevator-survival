import { describe, expect, it } from 'vitest'
import {
  createBackpackSnapshot,
  createItemCatalog,
  type BackpackPlacement,
} from '../inventory'
import {
  createEmptyEquipment,
  createEquipmentProfileCatalog,
} from '../equipment'
import {
  createCarriedItemContainersSnapshot,
  createEmptyQuickSlots,
  createQuickSlotProfileCatalog,
  createQuickSlotSnapshot,
  getQuickSlot,
  isQuickSlotEmpty,
  moveOneBackpackItemToQuickSlot,
  moveQuickSlotItem,
  moveQuickSlotItemToBackpack,
  QuickSlotError,
  removeQuickSlotItem,
  swapQuickSlotItems,
  type ItemQuickSlotProfile,
} from '.'

const physical = createItemCatalog([
  { id: 'med', name: '药', width: 1, height: 1, unitWeight: 1, canRotate: true, stacking: { kind: 'stackable', maxQuantity: 3 } },
  { id: 'kit', name: '包', width: 1, height: 2, unitWeight: 2, canRotate: true, stacking: { kind: 'none' } },
  { id: 'weapon', name: '武器', width: 1, height: 2, unitWeight: 2, canRotate: true, stacking: { kind: 'none' } },
])
const equipmentCatalog = createEquipmentProfileCatalog([
  { definitionId: 'med', kind: 'not-equippable' },
  { definitionId: 'kit', kind: 'not-equippable' },
  { definitionId: 'weapon', kind: 'equippable', eligibleSlots: ['weapon'] },
], physical.definitionIds)
const profiles = [
  { definitionId: 'med', kind: 'eligible' },
  { definitionId: 'kit', kind: 'eligible' },
  { definitionId: 'weapon', kind: 'not-eligible' },
] as const satisfies readonly ItemQuickSlotProfile[]
const quickSlotCatalog = createQuickSlotProfileCatalog(profiles, physical.definitionIds)
const dependencies = { physicalCatalog: physical, equipmentCatalog, quickSlotCatalog }
const item = (instanceId: string, definitionId: string, quantity = 1) => ({ instanceId, definitionId, quantity })
const at = (instanceId: string, x: number, y: number, rotated = false): BackpackPlacement => ({ instanceId, x, y, rotated })
const emptyEquipment = () => createEmptyEquipment(physical, equipmentCatalog)
const carried = (
  items = [item('med-stack', 'med', 3)],
  placements = [at('med-stack', 0, 0)],
  slots: readonly (ReturnType<typeof item> | null)[] = [null, null],
) => createCarriedItemContainersSnapshot(
  createBackpackSnapshot({ width: 4, height: 3, items, placements }, physical),
  emptyEquipment(),
  createQuickSlotSnapshot(slots, 2, physical, quickSlotCatalog),
  dependencies,
)

describe('quick-slot profile catalog', () => {
  it('creates a sorted deeply frozen complete catalog without mutating input', () => {
    const before = structuredClone(profiles)
    expect(quickSlotCatalog.definitionIds).toEqual(['kit', 'med', 'weapon'])
    expect(quickSlotCatalog.get('med').kind).toBe('eligible')
    expect(Object.isFrozen(quickSlotCatalog)).toBe(true)
    expect(Object.isFrozen(quickSlotCatalog.definitionIds)).toBe(true)
    expect(Object.isFrozen(quickSlotCatalog.get('med'))).toBe(true)
    expect(profiles).toEqual(before)
  })

  it.each([
    [[profiles[0], profiles[0]], physical.definitionIds],
    [[profiles[0]], physical.definitionIds],
    [[{ definitionId: '', kind: 'eligible' }], ['']],
    [[{ definitionId: 'unknown', kind: 'eligible' }], physical.definitionIds],
  ])('rejects invalid profile coverage', (inputProfiles, ids) => {
    expect(() => createQuickSlotProfileCatalog(inputProfiles as ItemQuickSlotProfile[], ids)).toThrowError(QuickSlotError)
  })

  it('rejects an invalid runtime profile kind', () => {
    expect(() =>
      createQuickSlotProfileCatalog(
        [
          { definitionId: 'med', kind: 'invalid' },
          profiles[1],
          profiles[2],
        ] as unknown as ItemQuickSlotProfile[],
        physical.definitionIds,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PROFILE' }))
  })

  it('fails unknown lookup without a default', () => {
    expect(quickSlotCatalog.has('missing')).toBe(false)
    expect(() => quickSlotCatalog.get('missing')).toThrowError(expect.objectContaining({ code: 'UNKNOWN_PROFILE' }))
  })
})

describe('quick-slot snapshots and container uniqueness', () => {
  it('creates two ordered empty slots and supports queries', () => {
    const slots = createEmptyQuickSlots(2, physical, quickSlotCatalog)
    expect(slots.slots).toEqual([null, null])
    expect(isQuickSlotEmpty(slots, 0)).toBe(true)
    expect(getQuickSlot(slots, 1)).toBeNull()
    expect(Object.isFrozen(slots.slots)).toBe(true)
  })

  it.each([0, -1, 1.5])('rejects invalid slot count %s', (count) => {
    expect(() => createEmptyQuickSlots(count, physical, quickSlotCatalog)).toThrowError(expect.objectContaining({ code: 'INVALID_SLOT_COUNT' }))
  })

  it('validates eligibility, unit quantity, indexes and duplicate instances', () => {
    expect(() => createQuickSlotSnapshot([item('w', 'weapon'), null], 2, physical, quickSlotCatalog)).toThrowError(expect.objectContaining({ code: 'NOT_ELIGIBLE' }))
    expect(() => createQuickSlotSnapshot([item('m', 'med', 2), null], 2, physical, quickSlotCatalog)).toThrowError(expect.objectContaining({ code: 'INVALID_QUANTITY' }))
    expect(() => createQuickSlotSnapshot([item('m', 'med'), item('m', 'med')], 2, physical, quickSlotCatalog)).toThrowError(expect.objectContaining({ code: 'DUPLICATE_INSTANCE' }))
    expect(() => getQuickSlot(createEmptyQuickSlots(2, physical, quickSlotCatalog), 2)).toThrowError(expect.objectContaining({ code: 'INVALID_SLOT_INDEX' }))
  })

  it('rejects instance identity shared across containers', () => {
    expect(() => carried([item('same', 'med')], [at('same', 0, 0)], [item('same', 'med'), null])).toThrowError(expect.objectContaining({ code: 'DUPLICATE_INSTANCE' }))
    const equipment = { ...emptyEquipment(), weapon: item('same', 'weapon') }
    expect(() => createCarriedItemContainersSnapshot(
      createBackpackSnapshot({ width: 4, height: 3, items: [], placements: [] }, physical),
      equipment,
      createQuickSlotSnapshot([item('same', 'med'), null], 2, physical, quickSlotCatalog),
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'DUPLICATE_INSTANCE' }))
  })
})

describe('immutable quick-slot operations', () => {
  it('extracts one real item from a stack and preserves source identity and placement', () => {
    const input = carried()
    const result = moveOneBackpackItemToQuickSlot(input, {
      backpackInstanceId: 'med-stack',
      targetSlotIndex: 0,
      extractedInstanceId: 'med-one',
    }, dependencies)
    expect(result.backpack.items[0]).toEqual(item('med-stack', 'med', 2))
    expect(result.backpack.placements[0]).toEqual(at('med-stack', 0, 0))
    expect(result.quickSlots.slots[0]).toEqual(item('med-one', 'med'))
    expect(input.backpack.items[0].quantity).toBe(3)
    expect(Object.isFrozen(result.quickSlots.slots[0])).toBe(true)
  })

  it('moves a non-stack item with the same id and releases its placement', () => {
    const input = carried([item('kit-1', 'kit')], [at('kit-1', 0, 0)])
    const result = moveOneBackpackItemToQuickSlot(input, {
      backpackInstanceId: 'kit-1',
      targetSlotIndex: 1,
    }, dependencies)
    expect(result.backpack.items).toEqual([])
    expect(result.backpack.placements).toEqual([])
    expect(result.quickSlots.slots[1]?.instanceId).toBe('kit-1')
  })

  it('rejects a surplus extracted id for a single item', () => {
    const input = carried([item('kit-1', 'kit')], [at('kit-1', 0, 0)])
    expect(() =>
      moveOneBackpackItemToQuickSlot(
        input,
        {
          backpackInstanceId: 'kit-1',
          targetSlotIndex: 0,
          extractedInstanceId: 'unused',
        },
        dependencies,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'UNEXPECTED_EXTRACTED_INSTANCE_ID' }),
    )
  })

  it.each([
    [{ backpackInstanceId: 'med-stack', targetSlotIndex: 0 }, 'EXTRACTED_INSTANCE_ID_REQUIRED'],
    [{ backpackInstanceId: 'med-stack', targetSlotIndex: 0, extractedInstanceId: '' }, 'INVALID_EXTRACTED_INSTANCE_ID'],
    [{ backpackInstanceId: 'med-stack', targetSlotIndex: 0, extractedInstanceId: 'med-stack' }, 'DUPLICATE_INSTANCE'],
    [{ backpackInstanceId: 'missing', targetSlotIndex: 0 }, 'BACKPACK_INSTANCE_NOT_FOUND'],
  ])('rejects invalid extraction %#', (input, code) => {
    expect(() => moveOneBackpackItemToQuickSlot(carried(), input, dependencies)).toThrowError(expect.objectContaining({ code }))
  })

  it('puts an item back at the explicit placement without auto-merging', () => {
    const input = carried([item('other', 'med', 2)], [at('other', 0, 0)], [item('one', 'med'), null])
    const result = moveQuickSlotItemToBackpack(input, {
      sourceSlotIndex: 0,
      placement: at('one', 1, 0),
    }, dependencies)
    expect(result.backpack.items).toHaveLength(2)
    expect(result.backpack.items.find((entry) => entry.instanceId === 'one')?.quantity).toBe(1)
    expect(result.quickSlots.slots[0]).toBeNull()
  })

  it('keeps all containers unchanged when backpack placement fails', () => {
    const input = carried([], [], [item('kit-1', 'kit'), null])
    expect(() => moveQuickSlotItemToBackpack(input, {
      sourceSlotIndex: 0,
      placement: at('kit-1', 3, 2),
    }, dependencies)).toThrow()
    expect(input.quickSlots.slots[0]?.instanceId).toBe('kit-1')
    expect(input.backpack.items).toEqual([])
  })

  it('moves, swaps, and explicitly removes without touching the backpack', () => {
    const initial = carried([], [], [item('a', 'med'), null])
    const moved = moveQuickSlotItem(initial, 0, 1, dependencies)
    expect(moved.quickSlots.slots.map((entry) => entry?.instanceId ?? null)).toEqual([null, 'a'])
    const two = carried([], [], [item('a', 'med'), item('b', 'kit')])
    const swapped = swapQuickSlotItems(two, 0, 1, dependencies)
    expect(swapped.quickSlots.slots.map((entry) => entry?.instanceId)).toEqual(['b', 'a'])
    const removed = removeQuickSlotItem(two, 0, dependencies)
    expect(removed.removedItem.instanceId).toBe('a')
    expect(removed.snapshot.quickSlots.slots[0]).toBeNull()
    expect(removed.snapshot.backpack).toEqual(two.backpack)
  })

  it('rejects occupied movement, empty removal, and same-slot operations', () => {
    const two = carried([], [], [item('a', 'med'), item('b', 'kit')])
    expect(() => moveQuickSlotItem(two, 0, 1, dependencies)).toThrowError(
      expect.objectContaining({ code: 'TARGET_SLOT_OCCUPIED' }),
    )
    expect(() => moveQuickSlotItem(two, 0, 0, dependencies)).toThrowError(
      expect.objectContaining({ code: 'SAME_SLOT' }),
    )
    const empty = carried([], [], [null, null])
    expect(() => removeQuickSlotItem(empty, 0, dependencies)).toThrowError(
      expect.objectContaining({ code: 'EMPTY_SLOT' }),
    )
  })

  it('does not refill after explicit removal', () => {
    const input = carried([item('reserve', 'med', 2)], [at('reserve', 0, 0)], [item('active', 'med'), null])
    const result = removeQuickSlotItem(input, 0, dependencies)
    expect(result.snapshot.quickSlots.slots).toEqual([null, null])
    expect(result.snapshot.backpack.items[0]).toEqual(item('reserve', 'med', 2))
  })
})
