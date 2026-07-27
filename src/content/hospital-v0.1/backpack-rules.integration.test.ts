import { describe, expect, it } from 'vitest'
import {
  calculateBackpackWeightSubtotal,
  createBackpackSnapshot,
  createEmptyBackpack,
  createItemCatalog,
  getOccupiedCellCount,
  getOccupiedCells,
  getRemainingCellCount,
  previewBackpackPlacement,
} from '../../core/inventory'
import { classifyLoad } from '../../core/load'
import { getRuleConfig } from '../rule-config-registry'
import { HOSPITAL_SLICE_RULES_VERSION } from './rule-config'

const config = getRuleConfig(HOSPITAL_SLICE_RULES_VERSION)
const testCatalog = createItemCatalog([
  {
    id: 'test_block',
    name: '测试方块',
    width: 2,
    height: 2,
    unitWeight: 4,
    canRotate: true,
    stacking: { kind: 'none' },
  },
  {
    id: 'test_long',
    name: '测试长条',
    width: 1,
    height: 2,
    unitWeight: 2,
    canRotate: true,
    stacking: { kind: 'none' },
  },
  {
    id: 'test_stack',
    name: '测试堆叠',
    width: 1,
    height: 1,
    unitWeight: 1,
    canRotate: false,
    stacking: { kind: 'stackable', maxQuantity: 5 },
  },
  ...[16, 17, 25, 29].map((weight) => ({
    id: `test_weight_${weight}`,
    name: `测试重量${weight}`,
    width: 1,
    height: 1,
    unitWeight: weight,
    canRotate: false,
    stacking: { kind: 'none' as const },
  })),
])

const empty = () =>
  createEmptyBackpack(
    config.backpack.width,
    config.backpack.height,
    testCatalog,
  )

describe('hospital backpack configuration integration', () => {
  it('creates an empty backpack using registered 6×4 dimensions', () => {
    expect(empty()).toMatchObject({
      width: config.backpack.width,
      height: config.backpack.height,
      items: [],
      placements: [],
    })
    expect(config.backpack.width).toBe(6)
    expect(config.backpack.height).toBe(4)
  })

  it('reports zero occupied and the registered total remaining cells', () => {
    const snapshot = empty()
    expect(getOccupiedCellCount(snapshot, testCatalog)).toBe(0)
    expect(getRemainingCellCount(snapshot, testCatalog)).toBe(
      config.backpack.totalCells,
    )
  })

  it('places a 2×2 test item in the upper-left corner', () => {
    const snapshot = createBackpackSnapshot(
      {
        width: config.backpack.width,
        height: config.backpack.height,
        items: [
          { instanceId: 'block', definitionId: 'test_block', quantity: 1 },
        ],
        placements: [
          { instanceId: 'block', x: 0, y: 0, rotated: false },
        ],
      },
      testCatalog,
    )
    expect(getOccupiedCellCount(snapshot, testCatalog)).toBe(4)
  })

  it('rejects a 2×2 placement starting at x=5', () => {
    expect(
      previewBackpackPlacement(
        empty(),
        { instanceId: 'block', definitionId: 'test_block', quantity: 1 },
        { instanceId: 'block', x: config.backpack.width - 1, y: 0, rotated: false },
        testCatalog,
      ),
    ).toMatchObject({ canPlace: false, reason: 'OUT_OF_BOUNDS' })
  })

  it('rotates a 1×2 test item into 2×1', () => {
    expect(
      previewBackpackPlacement(
        empty(),
        { instanceId: 'long', definitionId: 'test_long', quantity: 1 },
        { instanceId: 'long', x: 0, y: 0, rotated: true },
        testCatalog,
      ),
    ).toMatchObject({ canPlace: true, width: 2, height: 1 })
  })

  it('rejects overlapping test items', () => {
    expect(() =>
      createBackpackSnapshot(
        {
          width: config.backpack.width,
          height: config.backpack.height,
          items: [
            { instanceId: 'a', definitionId: 'test_block', quantity: 1 },
            { instanceId: 'b', definitionId: 'test_long', quantity: 1 },
          ],
          placements: [
            { instanceId: 'a', x: 0, y: 0, rotated: false },
            { instanceId: 'b', x: 1, y: 0, rotated: false },
          ],
        },
        testCatalog,
      ),
    ).toThrowError(expect.objectContaining({ code: 'OVERLAP' }))
  })

  it('keeps a stack in one cell as quantity increases', () => {
    const createStack = (quantity: number) =>
      createBackpackSnapshot(
        {
          width: config.backpack.width,
          height: config.backpack.height,
          items: [
            { instanceId: 'stack', definitionId: 'test_stack', quantity },
          ],
          placements: [
            { instanceId: 'stack', x: 0, y: 0, rotated: false },
          ],
        },
        testCatalog,
      )
    expect(getOccupiedCellCount(createStack(1), testCatalog)).toBe(1)
    expect(getOccupiedCellCount(createStack(5), testCatalog)).toBe(1)
  })

  it('normalizes test item and placement input order', () => {
    const items = [
      { instanceId: 'b', definitionId: 'test_long', quantity: 1 },
      { instanceId: 'a', definitionId: 'test_stack', quantity: 1 },
    ]
    const placements = [
      { instanceId: 'b', x: 2, y: 0, rotated: false },
      { instanceId: 'a', x: 0, y: 0, rotated: false },
    ]
    const forward = createBackpackSnapshot(
      {
        width: config.backpack.width,
        height: config.backpack.height,
        items,
        placements,
      },
      testCatalog,
    )
    const reversed = createBackpackSnapshot(
      {
        width: config.backpack.width,
        height: config.backpack.height,
        items: [...items].reverse(),
        placements: [...placements].reverse(),
      },
      testCatalog,
    )
    expect(reversed).toEqual(forward)
    expect(getOccupiedCells(reversed, testCatalog)).toEqual(
      getOccupiedCells(forward, testCatalog),
    )
  })

  it.each([
    [16, 'normal'],
    [17, 'loaded'],
    [25, 'overloaded'],
    [29, 'cannot-carry'],
  ] as const)(
    'passes backpack weight subtotal %i to the registered load rules',
    (weight, tier) => {
      const snapshot = createBackpackSnapshot(
        {
          width: config.backpack.width,
          height: config.backpack.height,
          items: [
            {
              instanceId: `weight-${weight}`,
              definitionId: `test_weight_${weight}`,
              quantity: 1,
            },
          ],
          placements: [
            {
              instanceId: `weight-${weight}`,
              x: 0,
              y: 0,
              rotated: false,
            },
          ],
        },
        testCatalog,
      )
      const subtotal = calculateBackpackWeightSubtotal(snapshot, testCatalog)
      expect(subtotal).toBe(weight)
      expect(classifyLoad(subtotal, config.backpack).tier).toBe(tier)
    },
  )

  it('uses only explicit test definitions and creates no hospital item catalog', () => {
    expect(testCatalog.definitionIds.every((id) => id.startsWith('test_'))).toBe(
      true,
    )
  })
})
