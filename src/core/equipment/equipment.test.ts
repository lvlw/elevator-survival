import { describe, expect, it } from 'vitest'
import {
  calculateBackpackWeightSubtotal,
  createBackpackSnapshot,
  createItemCatalog,
  getRemainingCellCount,
  InventoryError,
  type BackpackPlacement,
  type ItemDefinition,
  type ItemInstance,
} from '../inventory'
import {
  createBackpackEquipmentSnapshot,
  createEmptyEquipment,
  createEquipmentProfileCatalog,
  createEquipmentSnapshot,
  equipItemFromBackpack,
  EquipmentError,
  swapBackpackItemWithEquippedItem,
  unequipItemToBackpack,
  type EquipmentSlotKind,
  type ItemEquipmentProfile,
} from '.'

const physicalCatalog = createItemCatalog(
  [
    ['sword', 1, 2, 3, true, { kind: 'none' }],
    ['axe', 2, 2, 5, true, { kind: 'none' }],
    ['coat', 2, 2, 2, true, { kind: 'none' }],
    ['lamp', 1, 2, 1, true, { kind: 'none' }],
    ['fixed', 1, 2, 2, false, { kind: 'none' }],
    ['bandage', 1, 1, 1, true, { kind: 'stackable', maxQuantity: 3 }],
  ].map(([id, width, height, unitWeight, canRotate, stacking]) => ({
    id,
    name: id,
    width,
    height,
    unitWeight,
    canRotate,
    stacking,
  })) as readonly ItemDefinition[],
)
const profiles = [
  { definitionId: 'sword', kind: 'equippable', eligibleSlots: ['weapon'] },
  { definitionId: 'axe', kind: 'equippable', eligibleSlots: ['weapon'] },
  { definitionId: 'coat', kind: 'equippable', eligibleSlots: ['armor'] },
  { definitionId: 'lamp', kind: 'equippable', eligibleSlots: ['utility'] },
  { definitionId: 'fixed', kind: 'equippable', eligibleSlots: ['utility'] },
  { definitionId: 'bandage', kind: 'not-equippable' },
] as const satisfies readonly ItemEquipmentProfile[]
const equipmentCatalog = createEquipmentProfileCatalog(
  profiles,
  physicalCatalog.definitionIds,
)
const dependencies = { physicalCatalog, equipmentCatalog }
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
    physicalCatalog,
  )
const empty = () => createEmptyEquipment(physicalCatalog, equipmentCatalog)
const combined = (
  items: readonly ItemInstance[],
  placements: readonly BackpackPlacement[],
) =>
  createBackpackEquipmentSnapshot(
    backpack(items, placements),
    empty(),
    physicalCatalog,
    equipmentCatalog,
  )

describe('equipment profile catalog', () => {
  it('creates a sorted complete catalog without modifying input', () => {
    const before = structuredClone(profiles)
    expect(equipmentCatalog.definitionIds).toEqual([
      'axe',
      'bandage',
      'coat',
      'fixed',
      'lamp',
      'sword',
    ])
    expect(profiles).toEqual(before)
  })

  it('sorts and freezes a multi-slot profile', () => {
    const catalog = createEquipmentProfileCatalog(
      [
        {
          definitionId: 'multi',
          kind: 'equippable',
          eligibleSlots: ['utility', 'weapon', 'armor'],
        },
      ],
      ['multi'],
    )
    const profile = catalog.get('multi')
    expect(profile).toMatchObject({
      eligibleSlots: ['weapon', 'armor', 'utility'],
    })
    expect(
      Object.isFrozen((profile as { eligibleSlots: unknown }).eligibleSlots),
    ).toBe(true)
  })

  it.each([
    ['duplicate profile', [profiles[0], profiles[0]], ['sword']],
    ['empty ID', [{ definitionId: '', kind: 'not-equippable' }], ['']],
    [
      'slots on non-equippable',
      [{ definitionId: 'x', kind: 'not-equippable', eligibleSlots: ['weapon'] }],
      ['x'],
    ],
    [
      'no slots',
      [{ definitionId: 'x', kind: 'equippable', eligibleSlots: [] }],
      ['x'],
    ],
    [
      'duplicate slots',
      [{ definitionId: 'x', kind: 'equippable', eligibleSlots: ['weapon', 'weapon'] }],
      ['x'],
    ],
    [
      'invalid slot',
      [{ definitionId: 'x', kind: 'equippable', eligibleSlots: ['invalid'] }],
      ['x'],
    ],
    ['unknown physical ID', [{ definitionId: 'x', kind: 'not-equippable' }], ['y']],
    ['missing profile', [], ['x']],
  ])('rejects %s', (_name, inputProfiles, ids) => {
    expect(() =>
      createEquipmentProfileCatalog(
        inputProfiles as readonly ItemEquipmentProfile[],
        ids as readonly string[],
      ),
    ).toThrowError(EquipmentError)
  })

  it('fails unknown lookup without a fallback', () => {
    expect(equipmentCatalog.has('missing')).toBe(false)
    expect(() => equipmentCatalog.get('missing')).toThrowError(EquipmentError)
  })

  it('deep-freezes the catalog and profiles', () => {
    expect(Object.isFrozen(equipmentCatalog)).toBe(true)
    expect(Object.isFrozen(equipmentCatalog.definitionIds)).toBe(true)
    expect(Object.isFrozen(equipmentCatalog.get('sword'))).toBe(true)
  })
})

describe('equipment snapshots', () => {
  it('creates three explicit empty slots', () => {
    expect(empty()).toEqual({ weapon: null, armor: null, utility: null })
  })

  it('stores no backpack, resource, weight or load cache in equipment state', () => {
    expect(Object.keys(empty()).sort()).toEqual(['armor', 'utility', 'weapon'])
  })

  it.each([
    ['weapon', 'sword'],
    ['armor', 'coat'],
    ['utility', 'lamp'],
  ] as const)('accepts a legal %s', (slot, definitionId) => {
    expect(
      createEquipmentSnapshot(
        {
          weapon: slot === 'weapon' ? item('i', definitionId) : null,
          armor: slot === 'armor' ? item('i', definitionId) : null,
          utility: slot === 'utility' ? item('i', definitionId) : null,
        },
        physicalCatalog,
        equipmentCatalog,
      )[slot]?.definitionId,
    ).toBe(definitionId)
  })

  it('rejects one instance in two slots', () => {
    expect(() =>
      createEquipmentSnapshot(
        {
          weapon: item('same', 'sword'),
          armor: item('same', 'coat'),
          utility: null,
        },
        physicalCatalog,
        equipmentCatalog,
      ),
    ).toThrowError(EquipmentError)
  })

  it.each([
    ['wrong slot', 'sword', 'armor', 1],
    ['not equippable', 'bandage', 'utility', 1],
    ['stack quantity', 'bandage', 'utility', 2],
  ])('rejects %s', (_name, definitionId, slot, quantity) => {
    const input: Record<EquipmentSlotKind, ItemInstance | null> = {
      weapon: null,
      armor: null,
      utility: null,
    }
    input[slot as EquipmentSlotKind] = item('i', definitionId, quantity)
    expect(() =>
      createEquipmentSnapshot(input, physicalCatalog, equipmentCatalog),
    ).toThrow()
  })

  it('freezes snapshots and nested items without mutating input', () => {
    const input = {
      weapon: item('w', 'sword'),
      armor: null,
      utility: null,
    }
    const before = structuredClone(input)
    const result = createEquipmentSnapshot(
      input,
      physicalCatalog,
      equipmentCatalog,
    )
    expect(input).toEqual(before)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.weapon)).toBe(true)
  })

  it('rejects a cross-container duplicate', () => {
    expect(() =>
      createBackpackEquipmentSnapshot(
        backpack([item('w', 'sword')], [at('w', 0, 0)]),
        createEquipmentSnapshot(
          { weapon: item('w', 'sword'), armor: null, utility: null },
          physicalCatalog,
          equipmentCatalog,
        ),
        physicalCatalog,
        equipmentCatalog,
      ),
    ).toThrowError(EquipmentError)
  })

  it('allows different instances sharing a definition and freezes the combination', () => {
    const result = createBackpackEquipmentSnapshot(
      backpack([item('w1', 'sword')], [at('w1', 0, 0)]),
      createEquipmentSnapshot(
        { weapon: item('w2', 'sword'), armor: null, utility: null },
        physicalCatalog,
        equipmentCatalog,
      ),
      physicalCatalog,
      equipmentCatalog,
    )
    expect(result.backpack.items[0].definitionId).toBe('sword')
    expect(result.equipment.weapon?.definitionId).toBe('sword')
    expect(Object.isFrozen(result)).toBe(true)
  })
})

describe('equipment operations', () => {
  const initial = () =>
    combined(
      [
        item('sword', 'sword'),
        item('coat', 'coat'),
        item('lamp', 'lamp'),
      ],
      [at('sword', 0, 0), at('coat', 1, 0), at('lamp', 3, 0)],
    )

  it('equips, removes item and placement, releases cells and preserves input', () => {
    const before = initial()
    const result = equipItemFromBackpack(
      before,
      'sword',
      'weapon',
      dependencies,
    )
    expect(result.equipment.weapon?.instanceId).toBe('sword')
    expect(result.backpack.items.some((value) => value.instanceId === 'sword')).toBe(false)
    expect(result.backpack.placements.some((value) => value.instanceId === 'sword')).toBe(false)
    expect(getRemainingCellCount(result.backpack, physicalCatalog)).toBe(
      getRemainingCellCount(before.backpack, physicalCatalog) + 2,
    )
    expect(before.equipment.weapon).toBeNull()
  })

  it.each([
    ['missing', 'missing', 'weapon'],
    ['wrong slot', 'sword', 'armor'],
  ] as const)('rejects %s atomically', (_name, instanceId, slot) => {
    const snapshot = initial()
    const before = structuredClone(snapshot)
    expect(() =>
      equipItemFromBackpack(snapshot, instanceId, slot, dependencies),
    ).toThrowError(EquipmentError)
    expect(snapshot).toEqual(before)
  })

  it('rejects occupied slot and non-equippable items', () => {
    const occupied = equipItemFromBackpack(initial(), 'sword', 'weapon', dependencies)
    expect(() =>
      equipItemFromBackpack(occupied, 'coat', 'weapon', dependencies),
    ).toThrowError(EquipmentError)
    const bandage = combined([item('b', 'bandage')], [at('b', 0, 0)])
    expect(() =>
      equipItemFromBackpack(bandage, 'b', 'utility', dependencies),
    ).toThrowError(EquipmentError)
  })

  it('rejects a stacked backpack instance before slot transfer', () => {
    const stacked = combined(
      [item('b', 'bandage', 2)],
      [at('b', 0, 0)],
    )
    expect(() =>
      equipItemFromBackpack(stacked, 'b', 'utility', dependencies),
    ).toThrowError(EquipmentError)
  })

  it('does not auto-replace an occupied slot', () => {
    const occupied = equipItemFromBackpack(initial(), 'sword', 'weapon', dependencies)
    expect(() =>
      equipItemFromBackpack(occupied, 'coat', 'weapon', dependencies),
    ).toThrowError(EquipmentError)
    expect(occupied.equipment.weapon?.instanceId).toBe('sword')
  })

  it('unequips to the exact requested rotated placement', () => {
    const equipped = equipItemFromBackpack(initial(), 'sword', 'weapon', dependencies)
    const result = unequipItemToBackpack(
      equipped,
      'weapon',
      at('sword', 4, 1, true),
      dependencies,
    )
    expect(result.equipment.weapon).toBeNull()
    expect(result.backpack.placements).toContainEqual(at('sword', 4, 1, true))
  })

  it.each([
    ['empty slot', 'armor', at('x', 0, 0)],
    ['wrong placement ID', 'weapon', at('wrong', 0, 0)],
    ['out of bounds', 'weapon', at('sword', 5, 3)],
    ['overlap', 'weapon', at('sword', 1, 0)],
  ] as const)('rejects unequip %s without partial changes', (_name, slot, destination) => {
    const equipped = equipItemFromBackpack(initial(), 'sword', 'weapon', dependencies)
    const before = structuredClone(equipped)
    expect(() =>
      unequipItemToBackpack(equipped, slot, destination, dependencies),
    ).toThrow()
    expect(equipped).toEqual(before)
  })

  it('rejects illegal rotation instead of auto-rotating', () => {
    const snapshot = createBackpackEquipmentSnapshot(
      backpack([], []),
      createEquipmentSnapshot(
        { weapon: null, armor: null, utility: item('fixed', 'fixed') },
        physicalCatalog,
        equipmentCatalog,
      ),
      physicalCatalog,
      equipmentCatalog,
    )
    expect(() =>
      unequipItemToBackpack(
        snapshot,
        'utility',
        at('fixed', 0, 0, true),
        dependencies,
      ),
    ).toThrowError(InventoryError)
  })

  it('rejects unloading an empty slot', () => {
    expect(() =>
      unequipItemToBackpack(
        initial(),
        'armor',
        at('missing', 0, 0),
        dependencies,
      ),
    ).toThrowError(EquipmentError)
  })

  it('swaps atomically and ignores incoming old cells', () => {
    const snapshot = createBackpackEquipmentSnapshot(
      backpack([item('axe', 'axe')], [at('axe', 0, 0)]),
      createEquipmentSnapshot(
        { weapon: item('sword', 'sword'), armor: null, utility: null },
        physicalCatalog,
        equipmentCatalog,
      ),
      physicalCatalog,
      equipmentCatalog,
    )
    const result = swapBackpackItemWithEquippedItem(
      snapshot,
      'axe',
      'weapon',
      at('sword', 0, 0),
      dependencies,
    )
    expect(result.equipment.weapon?.instanceId).toBe('axe')
    expect(result.backpack.items.map((value) => value.instanceId)).toEqual([
      'sword',
    ])
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('keeps input unchanged when swap placement fails', () => {
    const snapshot = createBackpackEquipmentSnapshot(
      backpack(
        [item('axe', 'axe'), item('coat', 'coat')],
        [at('axe', 0, 0), at('coat', 2, 0)],
      ),
      createEquipmentSnapshot(
        { weapon: item('sword', 'sword'), armor: null, utility: null },
        physicalCatalog,
        equipmentCatalog,
      ),
      physicalCatalog,
      equipmentCatalog,
    )
    const before = structuredClone(snapshot)
    expect(() =>
      swapBackpackItemWithEquippedItem(
        snapshot,
        'axe',
        'weapon',
        at('sword', 2, 0),
        dependencies,
      ),
    ).toThrowError(InventoryError)
    expect(snapshot).toEqual(before)
  })

  it.each([
    ['empty target', 'axe', 'weapon', at('missing', 0, 0)],
    ['missing incoming', 'missing', 'weapon', at('sword', 0, 0)],
    ['mismatched displaced ID', 'axe', 'weapon', at('wrong', 0, 0)],
  ] as const)('rejects swap with %s', (_name, incomingId, slot, destination) => {
    const snapshot = createBackpackEquipmentSnapshot(
      backpack([item('axe', 'axe')], [at('axe', 0, 0)]),
      _name === 'empty target'
        ? empty()
        : createEquipmentSnapshot(
            { weapon: item('sword', 'sword'), armor: null, utility: null },
            physicalCatalog,
            equipmentCatalog,
          ),
      physicalCatalog,
      equipmentCatalog,
    )
    expect(() =>
      swapBackpackItemWithEquippedItem(
        snapshot,
        incomingId,
        slot,
        destination,
        dependencies,
      ),
    ).toThrowError(EquipmentError)
  })

  it('rejects invalid runtime slot values', () => {
    expect(() =>
      equipItemFromBackpack(
        initial(),
        'sword',
        'invalid' as EquipmentSlotKind,
        dependencies,
      ),
    ).toThrowError(EquipmentError)
  })

  it('normalizes equivalent input ordering deterministically', () => {
    const first = combined(
      [item('sword', 'sword'), item('coat', 'coat')],
      [at('sword', 0, 0), at('coat', 1, 0)],
    )
    const second = combined(
      [item('coat', 'coat'), item('sword', 'sword')],
      [at('coat', 1, 0), at('sword', 0, 0)],
    )
    expect(first).toEqual(second)
  })

  it('uses only backpack contents for backpack weight after equip and unload', () => {
    const before = combined([item('sword', 'sword')], [at('sword', 0, 0)])
    const equipped = equipItemFromBackpack(
      before,
      'sword',
      'weapon',
      dependencies,
    )
    expect(calculateBackpackWeightSubtotal(before.backpack, physicalCatalog)).toBe(3)
    expect(calculateBackpackWeightSubtotal(equipped.backpack, physicalCatalog)).toBe(0)
    const unloaded = unequipItemToBackpack(
      equipped,
      'weapon',
      at('sword', 0, 0),
      dependencies,
    )
    expect(calculateBackpackWeightSubtotal(unloaded.backpack, physicalCatalog)).toBe(3)
  })
})
