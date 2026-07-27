import { describe, expect, it } from 'vitest'
import {
  addItemToBackpack,
  moveBackpackItem,
  removeItemFromBackpack,
} from './backpack-operations'
import {
  createBackpackSnapshot,
  createEmptyBackpack,
  getOccupiedCells,
  previewBackpackPlacement,
} from './backpack-layout'
import { createItemCatalog } from './item-catalog'

const catalog = createItemCatalog([
  {
    id: 'long',
    name: '长条',
    width: 1,
    height: 2,
    unitWeight: 2,
    canRotate: true,
    stacking: { kind: 'none' },
  },
  {
    id: 'block',
    name: '方块',
    width: 2,
    height: 2,
    unitWeight: 4,
    canRotate: true,
    stacking: { kind: 'none' },
  },
])

const longItem = { instanceId: 'long-1', definitionId: 'long', quantity: 1 }
const longPlacement = { instanceId: 'long-1', x: 0, y: 0, rotated: false }

describe('immutable backpack operations', () => {
  it('adds an item to a new frozen snapshot and preserves the original', () => {
    const original = createEmptyBackpack(6, 4, catalog)
    const next = addItemToBackpack(original, longItem, longPlacement, catalog)
    expect(original.items).toHaveLength(0)
    expect(next.items).toEqual([longItem])
    expect(Object.isFrozen(next)).toBe(true)
  })

  it('rejects duplicate instances and overlapping additions', () => {
    const snapshot = addItemToBackpack(
      createEmptyBackpack(6, 4, catalog),
      longItem,
      longPlacement,
      catalog,
    )
    expect(() =>
      addItemToBackpack(snapshot, longItem, longPlacement, catalog),
    ).toThrowError(expect.objectContaining({ code: 'DUPLICATE_INSTANCE_ID' }))
    expect(() =>
      addItemToBackpack(
        snapshot,
        { instanceId: 'block-1', definitionId: 'block', quantity: 1 },
        { instanceId: 'block-1', x: 0, y: 1, rotated: false },
        catalog,
      ),
    ).toThrowError(expect.objectContaining({ code: 'OVERLAP' }))
  })

  it('moves and rotates an item while ignoring its former cells', () => {
    const snapshot = addItemToBackpack(
      createEmptyBackpack(6, 4, catalog),
      longItem,
      longPlacement,
      catalog,
    )
    const next = moveBackpackItem(
      snapshot,
      'long-1',
      { instanceId: 'long-1', x: 0, y: 0, rotated: true },
      catalog,
    )
    expect(next.placements[0]).toEqual({
      instanceId: 'long-1',
      x: 0,
      y: 0,
      rotated: true,
    })
    expect(getOccupiedCells(next, catalog)).toEqual([
      { x: 0, y: 0, instanceId: 'long-1' },
      { x: 1, y: 0, instanceId: 'long-1' },
    ])
    expect(snapshot.placements[0]).toEqual(longPlacement)
  })

  it('rejects unknown, mismatched, out-of-bounds and overlapping moves', () => {
    const snapshot = createBackpackSnapshot(
      {
        width: 6,
        height: 4,
        items: [
          longItem,
          { instanceId: 'block-1', definitionId: 'block', quantity: 1 },
        ],
        placements: [
          longPlacement,
          { instanceId: 'block-1', x: 2, y: 0, rotated: false },
        ],
      },
      catalog,
    )
    expect(() =>
      moveBackpackItem(
        snapshot,
        'missing',
        { instanceId: 'missing', x: 0, y: 0, rotated: false },
        catalog,
      ),
    ).toThrowError(expect.objectContaining({ code: 'UNKNOWN_INSTANCE' }))
    expect(() =>
      moveBackpackItem(
        snapshot,
        'long-1',
        { instanceId: 'other', x: 0, y: 0, rotated: false },
        catalog,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_PLACEMENT' }))
    expect(() =>
      moveBackpackItem(
        snapshot,
        'long-1',
        { instanceId: 'long-1', x: 5, y: 3, rotated: false },
        catalog,
      ),
    ).toThrowError(expect.objectContaining({ code: 'OUT_OF_BOUNDS' }))
    expect(() =>
      moveBackpackItem(
        snapshot,
        'long-1',
        { instanceId: 'long-1', x: 2, y: 0, rotated: false },
        catalog,
      ),
    ).toThrowError(expect.objectContaining({ code: 'OVERLAP' }))
  })

  it('removes the item and placement without changing quantity', () => {
    const snapshot = addItemToBackpack(
      createEmptyBackpack(6, 4, catalog),
      longItem,
      longPlacement,
      catalog,
    )
    const result = removeItemFromBackpack(snapshot, 'long-1', catalog)
    expect(result.snapshot.items).toEqual([])
    expect(result.snapshot.placements).toEqual([])
    expect(result.removedItem).toEqual(longItem)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.removedItem)).toBe(true)
    expect(snapshot.items).toHaveLength(1)
  })

  it('rejects removing an unknown instance', () => {
    expect(() =>
      removeItemFromBackpack(
        createEmptyBackpack(6, 4, catalog),
        'missing',
        catalog,
      ),
    ).toThrowError(expect.objectContaining({ code: 'UNKNOWN_INSTANCE' }))
  })

  it('uses the same placement judgment for preview and add', () => {
    const snapshot = addItemToBackpack(
      createEmptyBackpack(6, 4, catalog),
      longItem,
      longPlacement,
      catalog,
    )
    const item = { instanceId: 'block-1', definitionId: 'block', quantity: 1 }
    const placement = { instanceId: 'block-1', x: 0, y: 1, rotated: false }
    expect(
      previewBackpackPlacement(snapshot, item, placement, catalog),
    ).toMatchObject({ canPlace: false, reason: 'OVERLAP' })
    expect(() =>
      addItemToBackpack(snapshot, item, placement, catalog),
    ).toThrowError(expect.objectContaining({ code: 'OVERLAP' }))
  })
})
