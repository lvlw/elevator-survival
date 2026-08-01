import { describe, expect, it } from 'vitest'
import { createBackpackSnapshot, createItemCatalog } from '../inventory'
import { createSceneGraph } from '../scene-graph'
import {
  createSceneEdgeAccessCatalog,
  getEffectiveEnabledEdgeIds,
  SceneAccessError,
} from './scene-access'

const graph = createSceneGraph({
  nodes: [
    { id: 'safe', name: 'Safe', isReturnSafetyNode: true },
    { id: 'hall', name: 'Hall', isReturnSafetyNode: false },
    { id: 'room', name: 'Room', isReturnSafetyNode: false },
  ],
  edges: [
    { id: 'a-edge', from: 'safe', to: 'hall', baseTravelTime: 10, bidirectional: true },
    { id: 'z-edge', from: 'hall', to: 'room', baseTravelTime: 10, bidirectional: true },
  ],
})
const itemCatalog = createItemCatalog([
  { id: 'card', name: 'Card', width: 1, height: 1, unitWeight: 0, canRotate: true, stacking: { kind: 'none' } },
  { id: 'other', name: 'Other', width: 1, height: 1, unitWeight: 1, canRotate: true, stacking: { kind: 'none' } },
])
const profile = {
  edgeId: 'z-edge',
  kind: 'backpack-item-permission',
  requiredDefinitionId: 'card',
} as const
const backpack = (withCard: boolean) => createBackpackSnapshot({
  width: 2,
  height: 2,
  items: withCard ? [{ instanceId: 'card-1', definitionId: 'card', quantity: 1 }] : [],
  placements: withCard ? [{ instanceId: 'card-1', x: 0, y: 0, rotated: false }] : [],
}, itemCatalog)

describe('scene edge access catalog', () => {
  it('creates a valid backpack permission profile', () => {
    const catalog = createSceneEdgeAccessCatalog([profile], graph, itemCatalog)
    expect(catalog.get('z-edge')).toEqual(profile)
  })

  it.each([
    ['unknown edge', { ...profile, edgeId: 'missing' }],
    ['unknown item', { ...profile, requiredDefinitionId: 'missing' }],
    ['unknown kind', { ...profile, kind: 'equipment-permission' }],
    ['extra field', { ...profile, extra: true }],
  ])('rejects %s', (_label, invalid) => {
    expect(() => createSceneEdgeAccessCatalog(
      [invalid as typeof profile],
      graph,
      itemCatalog,
    )).toThrow(SceneAccessError)
  })

  it('rejects duplicate edge profiles', () => {
    expect(() => createSceneEdgeAccessCatalog([profile, profile], graph, itemCatalog)).toThrowError(
      expect.objectContaining({ code: 'DUPLICATE_ACCESS_PROFILE' }),
    )
  })

  it('adds the permission edge while the backpack holds the item', () => {
    const catalog = createSceneEdgeAccessCatalog([profile], graph, itemCatalog)
    expect(getEffectiveEnabledEdgeIds({ enabledEdgeIds: ['a-edge'], backpack: backpack(true) }, catalog)).toEqual(['a-edge', 'z-edge'])
  })

  it.each([
    ['equipment', { equipment: { weapon: { instanceId: 'card-equipped', definitionId: 'card', quantity: 1 }, armor: null, utility: null } }],
    ['quick slot', { quickSlots: { slots: [{ instanceId: 'card-quick', definitionId: 'card', quantity: 1 }] } }],
    ['ground item', { sceneItems: { nodeStates: [{ nodeId: 'hall', items: [{ item: { instanceId: 'card-ground', definitionId: 'card', quantity: 1 } }] }] } }],
  ])('does not inspect %s containers', (_label, outsideContainer) => {
    const catalog = createSceneEdgeAccessCatalog([profile], graph, itemCatalog)
    const snapshot = {
      enabledEdgeIds: ['a-edge'],
      backpack: backpack(false),
      ...outsideContainer,
    }
    expect(getEffectiveEnabledEdgeIds(snapshot, catalog)).toEqual(['a-edge'])
  })

  it('returns stable sorting without mutating the original enabled edges', () => {
    const enabledEdgeIds = ['z-edge', 'a-edge']
    const result = getEffectiveEnabledEdgeIds({ enabledEdgeIds, backpack: backpack(false) })
    expect(result).toEqual(['a-edge', 'z-edge'])
    expect(enabledEdgeIds).toEqual(['z-edge', 'a-edge'])
  })

  it('revokes permission immediately after the backpack item is absent', () => {
    const catalog = createSceneEdgeAccessCatalog([profile], graph, itemCatalog)
    expect(getEffectiveEnabledEdgeIds({ enabledEdgeIds: [], backpack: backpack(true) }, catalog)).toEqual(['z-edge'])
    expect(getEffectiveEnabledEdgeIds({ enabledEdgeIds: [], backpack: backpack(false) }, catalog)).toEqual([])
  })

  it('deep-freezes the catalog, profiles, and effective result', () => {
    const catalog = createSceneEdgeAccessCatalog([profile], graph, itemCatalog)
    const result = getEffectiveEnabledEdgeIds({ enabledEdgeIds: [], backpack: backpack(true) }, catalog)
    expect(Object.isFrozen(catalog)).toBe(true)
    expect(Object.isFrozen(catalog.profiles)).toBe(true)
    expect(Object.isFrozen(catalog.profiles[0])).toBe(true)
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('reports an explicit code for an unknown catalog lookup', () => {
    const catalog = createSceneEdgeAccessCatalog([profile], graph, itemCatalog)
    expect(() => catalog.get('missing')).toThrowError(
      expect.objectContaining({ code: 'UNKNOWN_ACCESS_PROFILE' }),
    )
  })
})
