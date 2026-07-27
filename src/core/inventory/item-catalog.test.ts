import { describe, expect, it } from 'vitest'
import {
  createItemCatalog,
  createItemInstance,
  getItemDimensions,
} from './item-catalog'
import { InventoryError, type InventoryErrorCode } from './inventory-errors'
import type { ItemDefinition } from './item-types'

const item = (
  overrides: Partial<ItemDefinition> = {},
): ItemDefinition => ({
  id: 'tool',
  name: '测试工具',
  width: 1,
  height: 2,
  unitWeight: 3,
  canRotate: true,
  stacking: { kind: 'none' },
  ...overrides,
})

function expectCode(action: () => unknown, code: InventoryErrorCode): void {
  expect(action).toThrowError(InventoryError)
  try {
    action()
  } catch (error) {
    expect((error as InventoryError).code).toBe(code)
  }
}

describe('item catalog', () => {
  it('creates frozen fixed definitions without modifying input', () => {
    const input = item()
    const catalog = createItemCatalog([input])
    expect(catalog.get('tool')).toEqual(input)
    expect(Object.isFrozen(catalog)).toBe(true)
    expect(Object.isFrozen(catalog.definitionIds)).toBe(true)
    expect(Object.isFrozen(catalog.get('tool'))).toBe(true)
    expect(Object.isFrozen(input)).toBe(false)
  })

  it('sorts definition ids by stable code-unit order', () => {
    const catalog = createItemCatalog([
      item({ id: 'z' }),
      item({ id: 'a' }),
      item({ id: 'm' }),
    ])
    expect(catalog.definitionIds).toEqual(['a', 'm', 'z'])
    expect(catalog.has('m')).toBe(true)
    expect(catalog.has('missing')).toBe(false)
  })

  it('rejects duplicate and unknown definition ids', () => {
    expectCode(
      () => createItemCatalog([item(), item()]),
      'DUPLICATE_DEFINITION_ID',
    )
    const catalog = createItemCatalog([item()])
    expectCode(() => catalog.get('missing'), 'UNKNOWN_DEFINITION')
  })

  it.each([
    ['empty id', item({ id: ' ' }), 'INVALID_DEFINITION_ID'],
    ['empty name', item({ name: '' }), 'INVALID_DEFINITION_NAME'],
    ['zero width', item({ width: 0 }), 'INVALID_ITEM_SIZE'],
    ['fractional height', item({ height: 1.5 }), 'INVALID_ITEM_SIZE'],
    ['negative weight', item({ unitWeight: -1 }), 'INVALID_UNIT_WEIGHT'],
    ['unsafe weight', item({ unitWeight: Number.MAX_SAFE_INTEGER + 1 }), 'INVALID_UNIT_WEIGHT'],
  ] as const)('rejects %s', (_label, definition, code) => {
    expectCode(() => createItemCatalog([definition]), code)
  })

  it('allows stacking only for 1×1 definitions with max at least two', () => {
    expectCode(
      () =>
        createItemCatalog([
          item({
            width: 2,
            height: 1,
            stacking: { kind: 'stackable', maxQuantity: 3 },
          }),
        ]),
      'INVALID_STACKING',
    )
    expectCode(
      () =>
        createItemCatalog([
          item({
            width: 1,
            height: 1,
            stacking: { kind: 'stackable', maxQuantity: 1 },
          }),
        ]),
      'INVALID_STACKING',
    )
    expect(
      createItemCatalog([
        item({
          width: 1,
          height: 1,
          stacking: { kind: 'stackable', maxQuantity: 3 },
        }),
      ]).get('tool').stacking,
    ).toEqual({ kind: 'stackable', maxQuantity: 3 })
  })
})

describe('item instances and dimensions', () => {
  const catalog = createItemCatalog([
    item(),
    item({
      id: 'stack',
      width: 1,
      height: 1,
      stacking: { kind: 'stackable', maxQuantity: 4 },
    }),
    item({ id: 'fixed', canRotate: false }),
    item({ id: 'square', width: 2, height: 2 }),
  ])

  it('creates a frozen non-stackable quantity-one instance', () => {
    const instance = createItemInstance(
      { instanceId: 'i1', definitionId: 'tool', quantity: 1 },
      catalog,
    )
    expect(instance.quantity).toBe(1)
    expect(Object.isFrozen(instance)).toBe(true)
  })

  it('accepts stack quantities one and max', () => {
    expect(
      createItemInstance(
        { instanceId: 's1', definitionId: 'stack', quantity: 1 },
        catalog,
      ).quantity,
    ).toBe(1)
    expect(
      createItemInstance(
        { instanceId: 's2', definitionId: 'stack', quantity: 4 },
        catalog,
      ).quantity,
    ).toBe(4)
  })

  it.each([
    ['empty id', { instanceId: '', definitionId: 'tool', quantity: 1 }, 'INVALID_INSTANCE_ID'],
    ['unknown definition', { instanceId: 'x', definitionId: 'missing', quantity: 1 }, 'UNKNOWN_DEFINITION'],
    ['zero quantity', { instanceId: 'x', definitionId: 'tool', quantity: 0 }, 'INVALID_QUANTITY'],
    ['non-stack quantity two', { instanceId: 'x', definitionId: 'tool', quantity: 2 }, 'INVALID_QUANTITY'],
    ['over max', { instanceId: 'x', definitionId: 'stack', quantity: 5 }, 'INVALID_QUANTITY'],
  ] as const)('rejects %s', (_label, instance, code) => {
    expectCode(() => createItemInstance(instance, catalog), code)
  })

  it('swaps dimensions only when rotation is allowed', () => {
    expect(getItemDimensions(catalog.get('tool'), false)).toEqual({
      width: 1,
      height: 2,
    })
    expect(getItemDimensions(catalog.get('tool'), true)).toEqual({
      width: 2,
      height: 1,
    })
    expectCode(
      () => getItemDimensions(catalog.get('fixed'), true),
      'ILLEGAL_ROTATION',
    )
  })

  it('accepts square rotation without changing dimensions', () => {
    expect(getItemDimensions(catalog.get('square'), true)).toEqual({
      width: 2,
      height: 2,
    })
  })
})
