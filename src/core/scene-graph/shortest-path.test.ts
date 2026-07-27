import { describe, expect, it } from 'vitest'
import { SceneGraphError, type SceneGraphErrorCode } from './graph-errors'
import { createSceneGraph } from './scene-graph'
import { findShortestPath } from './shortest-path'

const graph = createSceneGraph({
  nodes: [
    { id: 'a', name: 'A', isReturnSafetyNode: true },
    { id: 'b', name: 'B', isReturnSafetyNode: false },
    { id: 'c', name: 'C', isReturnSafetyNode: false },
    { id: 'd', name: 'D', isReturnSafetyNode: false },
  ],
  edges: [
    { id: 'z-direct', from: 'a', to: 'd', baseTravelTime: 6, bidirectional: false },
    { id: 'b-step', from: 'a', to: 'b', baseTravelTime: 3, bidirectional: true },
    { id: 'b-finish', from: 'b', to: 'd', baseTravelTime: 3, bidirectional: true },
    { id: 'a-step', from: 'a', to: 'c', baseTravelTime: 3, bidirectional: true },
    { id: 'a-finish', from: 'c', to: 'd', baseTravelTime: 3, bidirectional: true },
  ],
})

const allEdges = graph.edges.map((edge) => edge.id)

describe('deterministic shortest path', () => {
  it('uses only enabled edges and selects lower total time', () => {
    const result = findShortestPath({
      graph,
      startNodeId: 'a',
      targetNodeIds: ['d'],
      availability: { enabledEdgeIds: ['b-step', 'b-finish'] },
      edgeCost: ({ edge }) => edge.id === 'b-step' ? 1 : 3,
    })
    expect(result?.edgeIds).toEqual(['b-step', 'b-finish'])
    expect(result?.totalTime).toBe(4)
  })

  it('prefers fewer edges when total time ties', () => {
    const result = findShortestPath({
      graph,
      startNodeId: 'a',
      targetNodeIds: ['d'],
      availability: { enabledEdgeIds: allEdges },
    })
    expect(result?.edgeIds).toEqual(['z-direct'])
  })

  it('uses full edge-id sequence then node-id sequence for stable ties', () => {
    const withoutDirect = allEdges.filter((id) => id !== 'z-direct')
    const result = findShortestPath({
      graph,
      startNodeId: 'a',
      targetNodeIds: ['d'],
      availability: { enabledEdgeIds: withoutDirect },
    })
    expect(result?.edgeIds).toEqual(['a-step', 'a-finish'])
  })

  it('is independent from enabled-edge and graph insertion order', () => {
    const reversedGraph = createSceneGraph({
      nodes: [...graph.nodes].reverse(),
      edges: [...graph.edges].reverse(),
    })
    const first = findShortestPath({
      graph,
      startNodeId: 'a',
      targetNodeIds: ['d'],
      availability: { enabledEdgeIds: [...allEdges].reverse() },
    })
    const second = findShortestPath({
      graph: reversedGraph,
      startNodeId: 'a',
      targetNodeIds: ['d'],
      availability: { enabledEdgeIds: allEdges },
    })
    expect(first).toEqual(second)
  })

  it('returns the same frozen result for repeated calls', () => {
    const input = {
      graph,
      startNodeId: 'a',
      targetNodeIds: ['d'],
      availability: { enabledEdgeIds: allEdges },
    }
    const first = findShortestPath(input)
    const second = findShortestPath(input)
    expect(first).toEqual(second)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first?.nodeIds)).toBe(true)
  })

  it('returns null when no route exists', () => {
    expect(
      findShortestPath({
        graph,
        startNodeId: 'a',
        targetNodeIds: ['d'],
        availability: { enabledEdgeIds: [] },
      }),
    ).toBeNull()
  })

  it('returns a zero-time empty-edge path when start equals target', () => {
    expect(
      findShortestPath({
        graph,
        startNodeId: 'a',
        targetNodeIds: ['a'],
        availability: { enabledEdgeIds: [] },
      }),
    ).toMatchObject({ nodeIds: ['a'], edgeIds: [], totalTime: 0, edgeCount: 0 })
  })

  it('supports reverse traversal only for bidirectional edges', () => {
    expect(
      findShortestPath({
        graph,
        startNodeId: 'b',
        targetNodeIds: ['a'],
        availability: { enabledEdgeIds: ['b-step'] },
      })?.edgeIds,
    ).toEqual(['b-step'])
    expect(
      findShortestPath({
        graph,
        startNodeId: 'd',
        targetNodeIds: ['a'],
        availability: { enabledEdgeIds: ['z-direct'] },
      }),
    ).toBeNull()
  })

  it.each([
    ['unknown start', 'missing', ['a'], 'UNKNOWN_NODE'],
    ['unknown target', 'a', ['missing'], 'UNKNOWN_NODE'],
  ])('rejects %s', (_label, startNodeId, targetNodeIds, code) => {
    expect(() =>
      findShortestPath({
        graph,
        startNodeId,
        targetNodeIds,
        availability: { enabledEdgeIds: allEdges },
      }),
    ).toThrowError(
      expect.objectContaining<Partial<SceneGraphError>>({
        code: code as SceneGraphErrorCode,
      }),
    )
  })

  it('rejects invalid custom costs and path overflow', () => {
    expect(() =>
      findShortestPath({
        graph,
        startNodeId: 'a',
        targetNodeIds: ['d'],
        availability: { enabledEdgeIds: ['z-direct'] },
        edgeCost: () => 0,
      }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_EDGE_COST' }))

    expect(() =>
      findShortestPath({
        graph,
        startNodeId: 'a',
        targetNodeIds: ['d'],
        availability: { enabledEdgeIds: ['b-step', 'b-finish'] },
        edgeCost: () => Number.MAX_SAFE_INTEGER,
      }),
    ).toThrowError(expect.objectContaining({ code: 'PATH_TIME_OVERFLOW' }))
  })
})
