import { describe, expect, it } from 'vitest'
import {
  createItemCatalog,
  createItemInstance,
  getItemDimensions,
} from '../../../core/inventory'
import { hospitalItemCatalog } from './hospital-item-catalog'
import { hospitalItemDefinitions } from './hospital-item-definitions'
import {
  HOSPITAL_ITEM_IDS,
  HOSPITAL_SLICE_ITEM_IDS,
} from './hospital-item-ids'

const expectedPhysicalDefinitions = {
  [HOSPITAL_ITEM_IDS.metalPipe]: ['金属管', 1, 3, 3, true, 'none', null],
  [HOSPITAL_ITEM_IDS.fireAxe]: ['消防斧', 2, 3, 5, true, 'none', null],
  [HOSPITAL_ITEM_IDS.heavyCoat]: ['厚实外套', 2, 2, 2, true, 'none', null],
  [HOSPITAL_ITEM_IDS.crowbar]: ['撬棍', 1, 3, 3, true, 'none', null],
  [HOSPITAL_ITEM_IDS.flashlight]: ['手电筒', 1, 2, 1, true, 'none', null],
  [HOSPITAL_ITEM_IDS.toolkit]: ['工具箱', 2, 2, 4, true, 'none', null],
  [HOSPITAL_ITEM_IDS.bandage]: ['绷带', 1, 1, 1, true, 'stackable', 3],
  [HOSPITAL_ITEM_IDS.disinfectant]: ['消毒剂', 1, 1, 1, true, 'stackable', 3],
  [HOSPITAL_ITEM_IDS.firstAidKit]: ['急救包', 1, 2, 2, true, 'none', null],
  [HOSPITAL_ITEM_IDS.painkiller]: ['止痛药', 1, 1, 1, true, 'stackable', 3],
  [HOSPITAL_ITEM_IDS.ration]: ['压缩口粮', 1, 1, 1, true, 'stackable', 2],
  [HOSPITAL_ITEM_IDS.infectionSuppressant]: [
    '感染抑制剂',
    1,
    1,
    1,
    true,
    'stackable',
    2,
  ],
  [HOSPITAL_ITEM_IDS.standardBattery]: [
    '通用电池',
    1,
    1,
    1,
    true,
    'stackable',
    4,
  ],
  [HOSPITAL_ITEM_IDS.metalParts]: ['金属零件', 1, 1, 1, true, 'stackable', 5],
  [HOSPITAL_ITEM_IDS.electronicComponents]: [
    '电子元件',
    1,
    1,
    1,
    true,
    'stackable',
    5,
  ],
  [HOSPITAL_ITEM_IDS.fabric]: ['织物材料', 1, 1, 1, true, 'stackable', 5],
  [HOSPITAL_ITEM_IDS.isolationWardAccessCard]: [
    '隔离区门禁卡',
    1,
    1,
    0,
    true,
    'none',
    null,
  ],
  [HOSPITAL_ITEM_IDS.sealedPathogenCase]: [
    '密封病原样本箱',
    2,
    2,
    4,
    true,
    'none',
    null,
  ],
} as const

describe('hospital physical item catalog', () => {
  it('creates the complete formal catalog with unique stable ids', () => {
    const values = Object.values(HOSPITAL_ITEM_IDS)
    expect(new Set(values).size).toBe(values.length)
    expect(hospitalItemCatalog.definitionIds).toHaveLength(values.length)
    expect(hospitalItemCatalog.definitionIds).toEqual([...values].sort())
  })

  it('covers every explicitly audited hospital slice item id', () => {
    expect(
      HOSPITAL_SLICE_ITEM_IDS.every((id) => hospitalItemCatalog.has(id)),
    ).toBe(true)
    expect(new Set(HOSPITAL_SLICE_ITEM_IDS).size).toBe(
      HOSPITAL_SLICE_ITEM_IDS.length,
    )
    expect([...HOSPITAL_SLICE_ITEM_IDS].sort()).toEqual(
      hospitalItemCatalog.definitionIds,
    )
  })

  it('keeps the catalog, id list and every definition deeply frozen', () => {
    expect(Object.isFrozen(hospitalItemCatalog)).toBe(true)
    expect(Object.isFrozen(hospitalItemCatalog.definitionIds)).toBe(true)
    expect(Object.isFrozen(hospitalItemDefinitions)).toBe(true)
    expect(
      hospitalItemDefinitions.every(
        (definition) =>
          Object.isFrozen(definition) && Object.isFrozen(definition.stacking),
      ),
    ).toBe(true)
    for (const id of hospitalItemCatalog.definitionIds) {
      const definition = hospitalItemCatalog.get(id)
      expect(Object.isFrozen(definition)).toBe(true)
      expect(Object.isFrozen(definition.stacking)).toBe(true)
    }
  })

  it('fails unknown lookups without a default item fallback', () => {
    expect(hospitalItemCatalog.has('unknown-item')).toBe(false)
    expect(() => hospitalItemCatalog.get('unknown-item')).toThrowError(
      expect.objectContaining({ code: 'UNKNOWN_DEFINITION' }),
    )
  })

  it('contains only the physical inventory contract fields', () => {
    const expectedKeys = [
      'canRotate',
      'height',
      'id',
      'name',
      'stacking',
      'unitWeight',
      'width',
    ]
    for (const id of hospitalItemCatalog.definitionIds) {
      expect(Object.keys(hospitalItemCatalog.get(id)).sort()).toEqual(
        expectedKeys,
      )
    }
  })

  it('returns the same frozen definition object for the same id', () => {
    const first = hospitalItemCatalog.get(HOSPITAL_ITEM_IDS.metalPipe)
    expect(hospitalItemCatalog.get(HOSPITAL_ITEM_IDS.metalPipe)).toBe(first)
  })

  it('does not modify the source definition array or its ordering', () => {
    const before = hospitalItemDefinitions.map((definition) => definition.id)
    createItemCatalog(hospitalItemDefinitions)
    expect(hospitalItemDefinitions.map((definition) => definition.id)).toEqual(
      before,
    )
  })

  it.each(Object.entries(expectedPhysicalDefinitions))(
    'matches formal physical values for %s',
    (id, expected) => {
      const definition = hospitalItemCatalog.get(id)
      const maxQuantity =
        definition.stacking.kind === 'stackable'
          ? definition.stacking.maxQuantity
          : null
      expect([
        definition.name,
        definition.width,
        definition.height,
        definition.unitWeight,
        definition.canRotate,
        definition.stacking.kind,
        maxQuantity,
      ]).toEqual(expected)
    },
  )

  it('keeps all names non-empty and numeric fields valid', () => {
    for (const id of hospitalItemCatalog.definitionIds) {
      const definition = hospitalItemCatalog.get(id)
      expect(definition.name.trim().length).toBeGreaterThan(0)
      expect(Number.isSafeInteger(definition.width)).toBe(true)
      expect(Number.isSafeInteger(definition.height)).toBe(true)
      expect(Number.isSafeInteger(definition.unitWeight)).toBe(true)
      expect(definition.width).toBeGreaterThan(0)
      expect(definition.height).toBeGreaterThan(0)
      expect(definition.unitWeight).toBeGreaterThanOrEqual(0)
    }
  })

  it('restricts stacking to 1×1 definitions with formal maxima', () => {
    for (const id of hospitalItemCatalog.definitionIds) {
      const definition = hospitalItemCatalog.get(id)
      if (definition.stacking.kind === 'stackable') {
        expect([definition.width, definition.height]).toEqual([1, 1])
        expect(definition.stacking.maxQuantity).toBeGreaterThanOrEqual(2)
      } else if (definition.width !== 1 || definition.height !== 1) {
        expect(definition.stacking).toEqual({ kind: 'none' })
      }
    }
  })

  it.each(
    Object.values(HOSPITAL_ITEM_IDS).filter(
      (id) => hospitalItemCatalog.get(id).stacking.kind === 'stackable',
    ),
  )('accepts the formal stack maximum and rejects one more for %s', (id) => {
    const definition = hospitalItemCatalog.get(id)
    if (definition.stacking.kind !== 'stackable') {
      throw new Error('测试目录筛选失败')
    }
    const maxQuantity = definition.stacking.maxQuantity
    expect(
      createItemInstance(
        {
          instanceId: `${id}-max`,
          definitionId: id,
          quantity: maxQuantity,
        },
        hospitalItemCatalog,
      ).quantity,
    ).toBe(maxQuantity)
    expect(() =>
      createItemInstance(
        {
          instanceId: `${id}-over`,
          definitionId: id,
          quantity: maxQuantity + 1,
        },
        hospitalItemCatalog,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_QUANTITY' }))
  })

  it('rotates formal rectangular definitions without changing other fields', () => {
    const definition = hospitalItemCatalog.get(HOSPITAL_ITEM_IDS.metalPipe)
    expect(getItemDimensions(definition, true)).toEqual({ width: 3, height: 1 })
    expect(hospitalItemCatalog.get(HOSPITAL_ITEM_IDS.metalPipe)).toEqual(
      definition,
    )
  })
})
