import { describe, expect, it } from 'vitest'
import { createSceneGraph } from '../scene-graph'
import {
  applyPlayerNavigationArrival,
  createInitialPlayerNavigationKnowledge,
  createPlayerNavigationKnowledgeSnapshot,
  createSceneSurfaceObservationCatalog,
  SceneNavigationError,
} from '.'

const graph = createSceneGraph({
  nodes: [
    { id: 'entry', name: '入口', isReturnSafetyNode: true },
    { id: 'hall', name: '大厅', isReturnSafetyNode: false },
    { id: 'side', name: '侧室', isReturnSafetyNode: false },
    { id: 'hidden', name: '隐藏区', isReturnSafetyNode: false },
  ],
  edges: [
    { id: 'entry-hall', from: 'entry', to: 'hall', baseTravelTime: 10, bidirectional: true },
    { id: 'hall-side', from: 'hall', to: 'side', baseTravelTime: 10, bidirectional: true },
    { id: 'side-hidden', from: 'side', to: 'hidden', baseTravelTime: 10, bidirectional: true },
  ],
})

const catalogInput = [
  { nodeId: 'entry', surfaceVisibleEdgeIds: ['entry-hall'] },
  { nodeId: 'hall', surfaceVisibleEdgeIds: ['hall-side'] },
  { nodeId: 'side', surfaceVisibleEdgeIds: [] },
  { nodeId: 'hidden', surfaceVisibleEdgeIds: [] },
] as const

describe('strict scene surface observation content', () => {
  it('normalizes one exact entry per graph node and deeply freezes it', () => {
    const catalog = createSceneSurfaceObservationCatalog([...catalogInput].reverse(), graph)
    expect(catalog.entries.map(({ nodeId }) => nodeId)).toEqual(['entry', 'hall', 'hidden', 'side'])
    expect(catalog.get('entry').surfaceVisibleEdgeIds).toEqual(['entry-hall'])
    expect(Object.isFrozen(catalog)).toBe(true)
    expect(Object.isFrozen(catalog.entries)).toBe(true)
  })

  it.each<readonly [unknown]>([
    catalogInput.slice(0, -1),
    [...catalogInput, catalogInput[0]],
    [...catalogInput.slice(0, -1), { nodeId: 'unknown', surfaceVisibleEdgeIds: [] }],
    catalogInput.map((entry) => entry.nodeId === 'entry'
      ? { ...entry, surfaceVisibleEdgeIds: ['entry-hall', 'entry-hall'] }
      : entry),
    catalogInput.map((entry) => entry.nodeId === 'entry'
      ? { ...entry, surfaceVisibleEdgeIds: ['missing-edge'] }
      : entry),
    catalogInput.map((entry) => entry.nodeId === 'entry'
      ? { ...entry, surfaceVisibleEdgeIds: ['hall-side'] }
      : entry),
    catalogInput.map((entry) => entry.nodeId === 'entry'
      ? { ...entry, extra: true }
      : entry),
  ].map((input) => [input] as const))('rejects malformed catalog %#', (input) => {
    expect(() => createSceneSurfaceObservationCatalog(input, graph))
      .toThrowError(SceneNavigationError)
  })
})

describe('canonical player navigation knowledge', () => {
  const catalog = createSceneSurfaceObservationCatalog(catalogInput, graph)

  it('derives only entry observation for a fresh scene', () => {
    expect(createInitialPlayerNavigationKnowledge('entry', graph, catalog)).toEqual({
      discoveredNodeIds: ['entry', 'hall'],
      visitedNodeIds: ['entry'],
      knownEdgeIds: ['entry-hall'],
    })
  })

  it('adds first-arrival knowledge once and keeps stable sorted serialization', () => {
    const initial = createInitialPlayerNavigationKnowledge('entry', graph, catalog)
    const arrived = applyPlayerNavigationArrival(initial, 'hall', graph, catalog)
    expect(arrived.delta).toEqual({
      arrivalNodeId: 'hall',
      addedDiscoveredNodeIds: ['side'],
      addedVisitedNodeIds: ['hall'],
      addedKnownEdgeIds: ['hall-side'],
    })
    expect(arrived.knowledge).toEqual({
      discoveredNodeIds: ['entry', 'hall', 'side'],
      visitedNodeIds: ['entry', 'hall'],
      knownEdgeIds: ['entry-hall', 'hall-side'],
    })
    const repeated = applyPlayerNavigationArrival(arrived.knowledge, 'hall', graph, catalog)
    expect(repeated.knowledge).toEqual(arrived.knowledge)
    expect(repeated.delta).toEqual({
      arrivalNodeId: 'hall',
      addedDiscoveredNodeIds: [],
      addedVisitedNodeIds: [],
      addedKnownEdgeIds: [],
    })
  })

  it('preserves extra formally known routes without inventing provenance', () => {
    expect(createPlayerNavigationKnowledgeSnapshot({
      discoveredNodeIds: ['hidden', 'side', 'hall', 'entry'],
      visitedNodeIds: ['hall', 'entry'],
      knownEdgeIds: ['side-hidden', 'hall-side', 'entry-hall'],
    }, 'hall', graph, catalog)).toEqual({
      discoveredNodeIds: ['entry', 'hall', 'hidden', 'side'],
      visitedNodeIds: ['entry', 'hall'],
      knownEdgeIds: ['entry-hall', 'hall-side', 'side-hidden'],
    })
  })

  it('rejects a discovered current node that has never been visited', () => {
    expect(() => createPlayerNavigationKnowledgeSnapshot({
      discoveredNodeIds: ['entry', 'hall'],
      visitedNodeIds: ['entry'],
      knownEdgeIds: ['entry-hall'],
    }, 'hall', graph, catalog)).toThrowError(SceneNavigationError)
  })

  it.each([
    null,
    { discoveredNodeIds: ['entry'], visitedNodeIds: ['entry'] },
    { discoveredNodeIds: ['entry'], visitedNodeIds: ['entry'], knownEdgeIds: [], extra: true },
    { discoveredNodeIds: ['entry', 'entry'], visitedNodeIds: ['entry'], knownEdgeIds: [] },
    { discoveredNodeIds: ['entry'], visitedNodeIds: ['entry', 'entry'], knownEdgeIds: [] },
    { discoveredNodeIds: ['entry', 'hall'], visitedNodeIds: ['entry'], knownEdgeIds: ['entry-hall', 'entry-hall'] },
    { discoveredNodeIds: ['unknown'], visitedNodeIds: ['unknown'], knownEdgeIds: [] },
    { discoveredNodeIds: ['entry'], visitedNodeIds: ['hidden'], knownEdgeIds: [] },
    { discoveredNodeIds: ['entry', 'hall'], visitedNodeIds: ['entry'], knownEdgeIds: ['missing'] },
    { discoveredNodeIds: ['entry'], visitedNodeIds: ['entry'], knownEdgeIds: ['entry-hall'] },
    { discoveredNodeIds: ['entry', 'hall'], visitedNodeIds: ['entry', 'hall'], knownEdgeIds: ['entry-hall'] },
  ])('rejects malformed or incomplete knowledge %#', (input) => {
    expect(() => createPlayerNavigationKnowledgeSnapshot(input, 'entry', graph, catalog))
      .toThrowError(SceneNavigationError)
  })
})
