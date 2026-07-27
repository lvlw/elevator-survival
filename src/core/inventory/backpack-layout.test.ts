import { describe, expect, it } from 'vitest'
import {
  createBackpackSnapshot,
  createEmptyBackpack,
  getOccupiedCellCount,
  getOccupiedCells,
  getOccupyingInstanceId,
  getRemainingCellCount,
  previewBackpackPlacement,
} from './backpack-layout'
import { createItemCatalog } from './item-catalog'
import { InventoryError, type InventoryErrorCode } from './inventory-errors'
import type { BackpackSnapshot } from './backpack-types'

const catalog = createItemCatalog([
  {
    id: 'block',
    name: '方块',
    width: 2,
    height: 2,
    unitWeight: 2,
    canRotate: true,
    stacking: { kind: 'none' },
  },
  {
    id: 'long',
    name: '长条',
    width: 1,
    height: 2,
    unitWeight: 1,
    canRotate: true,
    stacking: { kind: 'none' },
  },
  {
    id: 'fixed',
    name: '固定',
    width: 1,
    height: 2,
    unitWeight: 1,
    canRotate: false,
    stacking: { kind: 'none' },
  },
  {
    id: 'stack',
    name: '堆叠',
    width: 1,
    height: 1,
    unitWeight: 1,
    canRotate: false,
    stacking: { kind: 'stackable', maxQuantity: 5 },
  },
])

const validInput = (): BackpackSnapshot => ({
  width: 6,
  height: 4,
  items: [
    { instanceId: 'block-1', definitionId: 'block', quantity: 1 },
    { instanceId: 'long-1', definitionId: 'long', quantity: 1 },
  ],
  placements: [
    { instanceId: 'block-1', x: 0, y: 0, rotated: false },
    { instanceId: 'long-1', x: 4, y: 0, rotated: false },
  ],
})

function expectCode(action: () => unknown, code: InventoryErrorCode): void {
  expect(action).toThrowError(InventoryError)
  try {
    action()
  } catch (error) {
    expect((error as InventoryError).code).toBe(code)
  }
}

describe('backpack layout', () => {
  it('creates a deeply frozen normalized snapshot without modifying input', () => {
    const input = validInput()
    const reversed = {
      ...input,
      items: [...input.items].reverse(),
      placements: [...input.placements].reverse(),
    }
    const snapshot = createBackpackSnapshot(reversed, catalog)
    expect(snapshot.items.map((item) => item.instanceId)).toEqual([
      'block-1',
      'long-1',
    ])
    expect(snapshot.placements.map((placement) => placement.instanceId)).toEqual([
      'block-1',
      'long-1',
    ])
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.items)).toBe(true)
    expect(Object.isFrozen(snapshot.items[0])).toBe(true)
    expect(Object.isFrozen(snapshot.placements)).toBe(true)
    expect(Object.isFrozen(snapshot.placements[0])).toBe(true)
    expect(Object.isFrozen(input)).toBe(false)
    expect(input.items[0].instanceId).toBe('block-1')
  })

  it('normalizes logically identical input order to equal snapshots', () => {
    const input = validInput()
    expect(createBackpackSnapshot(input, catalog)).toEqual(
      createBackpackSnapshot(
        {
          ...input,
          items: [...input.items].reverse(),
          placements: [...input.placements].reverse(),
        },
        catalog,
      ),
    )
  })

  it.each([
    ['zero width', { ...validInput(), width: 0 }, 'INVALID_BACKPACK_SIZE'],
    ['fractional height', { ...validInput(), height: 1.5 }, 'INVALID_BACKPACK_SIZE'],
    ['negative coordinate', { ...validInput(), placements: [{ instanceId: 'block-1', x: -1, y: 0, rotated: false }, validInput().placements[1]] }, 'INVALID_PLACEMENT'],
    ['fractional coordinate', { ...validInput(), placements: [{ instanceId: 'block-1', x: 0.5, y: 0, rotated: false }, validInput().placements[1]] }, 'INVALID_PLACEMENT'],
  ] as const)('rejects %s', (_label, input, code) => {
    expectCode(() => createBackpackSnapshot(input, catalog), code)
  })

  it('rejects duplicate instances', () => {
    const input = validInput()
    expectCode(
      () =>
        createBackpackSnapshot(
          { ...input, items: [...input.items, input.items[0]] },
          catalog,
        ),
      'DUPLICATE_INSTANCE_ID',
    )
  })

  it('rejects missing, duplicate and unknown placements', () => {
    const input = validInput()
    expectCode(
      () => createBackpackSnapshot({ ...input, placements: [input.placements[0]] }, catalog),
      'MISSING_PLACEMENT',
    )
    expectCode(
      () =>
        createBackpackSnapshot(
          { ...input, placements: [...input.placements, input.placements[0]] },
          catalog,
        ),
      'DUPLICATE_PLACEMENT',
    )
    expectCode(
      () =>
        createBackpackSnapshot(
          {
            ...input,
            placements: [
              ...input.placements,
              { instanceId: 'missing', x: 3, y: 3, rotated: false },
            ],
          },
          catalog,
        ),
      'UNKNOWN_PLACEMENT_INSTANCE',
    )
  })

  it('rejects right and bottom boundary overflow', () => {
    const input = validInput()
    expectCode(
      () =>
        createBackpackSnapshot(
          {
            ...input,
            placements: [
              { instanceId: 'block-1', x: 5, y: 0, rotated: false },
              input.placements[1],
            ],
          },
          catalog,
        ),
      'OUT_OF_BOUNDS',
    )
    expectCode(
      () =>
        createBackpackSnapshot(
          {
            ...input,
            placements: [
              { instanceId: 'block-1', x: 0, y: 3, rotated: false },
              input.placements[1],
            ],
          },
          catalog,
        ),
      'OUT_OF_BOUNDS',
    )
  })

  it('rejects overlapping cells and illegal rotation', () => {
    const input = validInput()
    expectCode(
      () =>
        createBackpackSnapshot(
          {
            ...input,
            placements: [
              input.placements[0],
              { instanceId: 'long-1', x: 1, y: 1, rotated: false },
            ],
          },
          catalog,
        ),
      'OVERLAP',
    )
    expectCode(
      () =>
        createBackpackSnapshot(
          {
            width: 6,
            height: 4,
            items: [{ instanceId: 'fixed-1', definitionId: 'fixed', quantity: 1 }],
            placements: [{ instanceId: 'fixed-1', x: 0, y: 0, rotated: true }],
          },
          catalog,
        ),
      'ILLEGAL_ROTATION',
    )
  })
})

describe('occupied cells and placement preview', () => {
  it('returns 2×2 cells in stable y-x-instance order', () => {
    const snapshot = createBackpackSnapshot(validInput(), catalog)
    expect(getOccupiedCells(snapshot, catalog)).toEqual([
      { x: 0, y: 0, instanceId: 'block-1' },
      { x: 1, y: 0, instanceId: 'block-1' },
      { x: 4, y: 0, instanceId: 'long-1' },
      { x: 0, y: 1, instanceId: 'block-1' },
      { x: 1, y: 1, instanceId: 'block-1' },
      { x: 4, y: 1, instanceId: 'long-1' },
    ])
    expect(Object.isFrozen(getOccupiedCells(snapshot, catalog))).toBe(true)
  })

  it('calculates occupied, remaining and occupant queries', () => {
    const snapshot = createBackpackSnapshot(validInput(), catalog)
    expect(getOccupiedCellCount(snapshot, catalog)).toBe(6)
    expect(getRemainingCellCount(snapshot, catalog)).toBe(18)
    expect(getOccupyingInstanceId(snapshot, 1, 1, catalog)).toBe('block-1')
    expect(getOccupyingInstanceId(snapshot, 5, 3, catalog)).toBeNull()
  })

  it('rotates a 1×2 item into a frozen 2×1 preview', () => {
    const snapshot = createEmptyBackpack(6, 4, catalog)
    const preview = previewBackpackPlacement(
      snapshot,
      { instanceId: 'long-1', definitionId: 'long', quantity: 1 },
      { instanceId: 'long-1', x: 0, y: 0, rotated: true },
      catalog,
    )
    expect(preview).toMatchObject({ canPlace: true, width: 2, height: 1 })
    expect(preview.cells).toHaveLength(2)
    expect(Object.isFrozen(preview)).toBe(true)
  })

  it('reports preview failures without modifying the snapshot', () => {
    const snapshot = createBackpackSnapshot(validInput(), catalog)
    const before = structuredClone(snapshot)
    const item = { instanceId: 'next', definitionId: 'long', quantity: 1 }
    expect(
      previewBackpackPlacement(
        snapshot,
        item,
        { instanceId: 'next', x: 0, y: 0, rotated: false },
        catalog,
      ),
    ).toMatchObject({ canPlace: false, reason: 'OVERLAP' })
    expect(
      previewBackpackPlacement(
        snapshot,
        item,
        { instanceId: 'next', x: 5, y: 3, rotated: false },
        catalog,
      ),
    ).toMatchObject({ canPlace: false, reason: 'OUT_OF_BOUNDS' })
    expect(snapshot).toEqual(before)
  })

  it('reports an unknown definition in placement preview', () => {
    expect(
      previewBackpackPlacement(
        createEmptyBackpack(6, 4, catalog),
        { instanceId: 'unknown', definitionId: 'missing', quantity: 1 },
        { instanceId: 'unknown', x: 0, y: 0, rotated: false },
        catalog,
      ),
    ).toMatchObject({ canPlace: false, reason: 'UNKNOWN_DEFINITION' })
  })

  it('reports illegal rotation in placement preview', () => {
    expect(
      previewBackpackPlacement(
        createEmptyBackpack(6, 4, catalog),
        { instanceId: 'fixed-1', definitionId: 'fixed', quantity: 1 },
        { instanceId: 'fixed-1', x: 0, y: 0, rotated: true },
        catalog,
      ),
    ).toMatchObject({ canPlace: false, reason: 'ILLEGAL_ROTATION' })
  })

  it('reports fractional coordinates in placement preview', () => {
    expect(
      previewBackpackPlacement(
        createEmptyBackpack(6, 4, catalog),
        { instanceId: 'long-1', definitionId: 'long', quantity: 1 },
        { instanceId: 'long-1', x: 0.5, y: 0, rotated: false },
        catalog,
      ),
    ).toMatchObject({ canPlace: false, reason: 'INVALID_PLACEMENT' })
  })

  it('keeps a stack in one cell regardless of quantity', () => {
    const snapshot = createBackpackSnapshot(
      {
        width: 6,
        height: 4,
        items: [{ instanceId: 's', definitionId: 'stack', quantity: 5 }],
        placements: [{ instanceId: 's', x: 2, y: 2, rotated: false }],
      },
      catalog,
    )
    expect(getOccupiedCellCount(snapshot, catalog)).toBe(1)
  })
})
