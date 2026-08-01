import { describe, expect, it } from 'vitest'
import { createItemCatalog } from '../inventory'
import { createItemResourceCatalog } from '../item-state'
import { createSceneGraph } from '../scene-graph'
import { createSceneItemSnapshot } from '../scene-search'
import {
  addSceneItems,
  createEmptySceneItemsSnapshot,
  createSceneItemsSnapshot,
  getSceneNodeItems,
  removeSceneItemQuantity,
} from '.'

const graph = createSceneGraph({
  nodes: [
    { id: 'b', name: 'B', isReturnSafetyNode: false },
    { id: 'a', name: 'A', isReturnSafetyNode: true },
  ],
  edges: [],
})
const itemCatalog = createItemCatalog([
  { id: 'part', name: '零件', width: 1, height: 1, unitWeight: 1, canRotate: true, stacking: { kind: 'stackable', maxQuantity: 5 } },
])
const itemResourceCatalog = createItemResourceCatalog(
  [{ definitionId: 'part', kind: 'none' }],
  itemCatalog.definitionIds,
)
const dependencies = { graph, itemCatalog, itemResourceCatalog }
const entity = (instanceId: string, quantity = 1) =>
  createSceneItemSnapshot(
    {
      item: { instanceId, definitionId: 'part', quantity },
      state: { instanceId, definitionId: 'part', resource: { kind: 'none' } },
    },
    itemCatalog,
    itemResourceCatalog,
  )

describe('scene node ground items', () => {
  it('creates complete sorted empty nodes and deeply freezes them', () => {
    const result = createEmptySceneItemsSnapshot(dependencies)
    expect(result.nodeStates).toEqual([
      { nodeId: 'a', items: [] },
      { nodeId: 'b', items: [] },
    ])
    expect(Object.isFrozen(result.nodeStates[0].items)).toBe(true)
  })

  it('normalizes copies without modifying or freezing input', () => {
    const input = {
      nodeStates: [
        { nodeId: 'b', items: [structuredClone(entity('one', 3))] },
        { nodeId: 'a', items: [] },
      ],
    }
    const before = structuredClone(input)
    const result = createSceneItemsSnapshot(input, dependencies)
    expect(result.nodeStates.map(({ nodeId }) => nodeId)).toEqual(['a', 'b'])
    expect(getSceneNodeItems(result, 'b')[0]).not.toBe(input.nodeStates[0].items[0])
    expect(input).toEqual(before)
    expect(Object.isFrozen(input)).toBe(false)
  })

  it('rejects missing, duplicate, and cross-node duplicate entries', () => {
    expect(() => createSceneItemsSnapshot({ nodeStates: [{ nodeId: 'a', items: [] }] }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_SCENE_ITEMS_STATE' }))
    expect(() => createSceneItemsSnapshot({ nodeStates: [
      { nodeId: 'a', items: [entity('same'), entity('same')] },
      { nodeId: 'b', items: [] },
    ] }, dependencies)).toThrowError(expect.objectContaining({ code: 'DUPLICATE_INSTANCE_ID' }))
    expect(() => createSceneItemsSnapshot({ nodeStates: [
      { nodeId: 'a', items: [entity('same')] },
      { nodeId: 'b', items: [entity('same')] },
    ] }, dependencies)).toThrowError(expect.objectContaining({ code: 'DUPLICATE_INSTANCE_ID' }))
  })

  it('adds items and removes full or partial quantities immutably', () => {
    const empty = createEmptySceneItemsSnapshot(dependencies)
    const added = addSceneItems(empty, 'a', [entity('stack', 3)], dependencies)
    const partial = removeSceneItemQuantity(added, 'a', 'stack', 1, dependencies)
    expect(getSceneNodeItems(partial, 'a')[0].item).toMatchObject({ instanceId: 'stack', quantity: 2 })
    expect(getSceneNodeItems(added, 'a')[0].item.quantity).toBe(3)
    const removed = removeSceneItemQuantity(partial, 'a', 'stack', 2, dependencies)
    expect(getSceneNodeItems(removed, 'a')).toEqual([])
  })
})
