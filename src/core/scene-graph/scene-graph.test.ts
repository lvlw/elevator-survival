import { describe, expect, it } from 'vitest'
import { SceneGraphError } from './graph-errors'
import {
  createSceneGraph,
  getSceneEdgeTraversal,
  validateTraversalAvailability,
} from './scene-graph'
import type { SceneGraphDefinition } from './graph-types'

const validDefinition = (): SceneGraphDefinition => ({
  nodes: [
    { id: 'safe', name: '安全点', isReturnSafetyNode: true },
    { id: 'room', name: '房间', isReturnSafetyNode: false },
  ],
  edges: [
    {
      id: 'safe-room',
      from: 'safe',
      to: 'room',
      baseTravelTime: 10,
      bidirectional: true,
    },
  ],
})

function expectCode(action: () => unknown, code: string): void {
  expect(action).toThrowError(SceneGraphError)
  try {
    action()
  } catch (error) {
    expect((error as SceneGraphError).code).toBe(code)
  }
}

describe('scene graph validation', () => {
  it('creates and deeply freezes a valid graph without freezing its input', () => {
    const input = validDefinition()
    const graph = createSceneGraph(input)

    expect(graph.nodes).toHaveLength(2)
    expect(Object.isFrozen(graph)).toBe(true)
    expect(Object.isFrozen(graph.nodes)).toBe(true)
    expect(Object.isFrozen(graph.nodes[0])).toBe(true)
    expect(Object.isFrozen(graph.edges)).toBe(true)
    expect(Object.isFrozen(graph.edges[0])).toBe(true)
    expect(Object.isFrozen(input)).toBe(false)
    expect(Object.isFrozen(input.nodes[0])).toBe(false)
  })

  it('rejects an empty graph', () => {
    expectCode(
      () => createSceneGraph({ nodes: [], edges: [] }),
      'EMPTY_GRAPH',
    )
  })

  it.each([
    ['empty node id', { id: '', name: 'x', isReturnSafetyNode: true }, 'INVALID_NODE'],
    ['empty node name', { id: 'x', name: ' ', isReturnSafetyNode: true }, 'INVALID_NODE'],
  ])('rejects %s', (_label, node, code) => {
    expectCode(() => createSceneGraph({ nodes: [node], edges: [] }), code)
  })

  it('rejects duplicate node ids', () => {
    const input = validDefinition()
    expectCode(
      () => createSceneGraph({ ...input, nodes: [...input.nodes, input.nodes[0]] }),
      'DUPLICATE_NODE_ID',
    )
  })

  it('rejects a graph without a return safety node', () => {
    expectCode(
      () =>
        createSceneGraph({
          nodes: [{ id: 'x', name: 'x', isReturnSafetyNode: false }],
          edges: [],
        }),
      'NO_RETURN_SAFETY_NODE',
    )
  })

  it.each([
    ['empty edge id', { id: '', from: 'safe', to: 'room', baseTravelTime: 10, bidirectional: true }, 'INVALID_EDGE'],
    ['unknown start', { id: 'x', from: 'missing', to: 'room', baseTravelTime: 10, bidirectional: true }, 'UNKNOWN_EDGE_NODE'],
    ['unknown end', { id: 'x', from: 'safe', to: 'missing', baseTravelTime: 10, bidirectional: true }, 'UNKNOWN_EDGE_NODE'],
    ['self loop', { id: 'x', from: 'safe', to: 'safe', baseTravelTime: 10, bidirectional: true }, 'SELF_LOOP'],
    ['zero time', { id: 'x', from: 'safe', to: 'room', baseTravelTime: 0, bidirectional: true }, 'INVALID_EDGE'],
    ['negative time', { id: 'x', from: 'safe', to: 'room', baseTravelTime: -1, bidirectional: true }, 'INVALID_EDGE'],
    ['unsafe time', { id: 'x', from: 'safe', to: 'room', baseTravelTime: Number.MAX_SAFE_INTEGER + 1, bidirectional: true }, 'INVALID_EDGE'],
  ])('rejects %s', (_label, edge, code) => {
    expectCode(
      () => createSceneGraph({ ...validDefinition(), edges: [edge] }),
      code,
    )
  })

  it('rejects duplicate edge ids and equivalent edges', () => {
    const input = validDefinition()
    expectCode(
      () => createSceneGraph({ ...input, edges: [...input.edges, input.edges[0]] }),
      'DUPLICATE_EDGE_ID',
    )
    expectCode(
      () =>
        createSceneGraph({
          ...input,
          edges: [
            ...input.edges,
            { ...input.edges[0], id: 'other', from: 'room', to: 'safe' },
          ],
        }),
      'DUPLICATE_EDGE',
    )
  })
})

describe('traversal availability', () => {
  it('accepts known edges without modifying the input', () => {
    const graph = createSceneGraph(validDefinition())
    const enabled = new Set(['safe-room'])
    const validated = validateTraversalAvailability(graph, {
      enabledEdgeIds: enabled,
    })

    expect([...validated]).toEqual(['safe-room'])
    expect([...enabled]).toEqual(['safe-room'])
  })

  it('rejects an unknown enabled edge', () => {
    const graph = createSceneGraph(validDefinition())
    expectCode(
      () =>
        validateTraversalAvailability(graph, {
          enabledEdgeIds: ['missing'],
        }),
      'UNKNOWN_ENABLED_EDGE',
    )
  })

  it('rejects duplicate ids in array-form availability', () => {
    const graph = createSceneGraph(validDefinition())
    expectCode(
      () =>
        validateTraversalAvailability(graph, {
          enabledEdgeIds: ['safe-room', 'safe-room'],
        }),
      'DUPLICATE_ENABLED_EDGE',
    )
  })
})

describe('edge traversal query', () => {
  it('resolves both directions of a bidirectional edge', () => {
    const graph = createSceneGraph(validDefinition())
    const availability = { enabledEdgeIds: ['safe-room'] }
    expect(
      getSceneEdgeTraversal(graph, 'safe-room', 'safe', availability),
    ).toMatchObject({ fromNodeId: 'safe', toNodeId: 'room' })
    expect(
      getSceneEdgeTraversal(graph, 'safe-room', 'room', availability),
    ).toMatchObject({ fromNodeId: 'room', toNodeId: 'safe' })
  })

  it.each([
    ['missing', 'safe', ['safe-room'], 'UNKNOWN_EDGE'],
    ['safe-room', 'safe', [], 'EDGE_NOT_ENABLED'],
  ])('rejects edge=%s from=%s as %s', (edgeId, fromNodeId, enabledEdgeIds, code) => {
    const graph = createSceneGraph(validDefinition())
    expectCode(
      () =>
        getSceneEdgeTraversal(graph, edgeId, fromNodeId, { enabledEdgeIds }),
      code,
    )
  })

  it('rejects the reverse direction of a one-way edge', () => {
    const definition = validDefinition()
    const graph = createSceneGraph({
      ...definition,
      edges: [{ ...definition.edges[0], bidirectional: false }],
    })
    expectCode(
      () =>
        getSceneEdgeTraversal(graph, 'safe-room', 'room', {
          enabledEdgeIds: ['safe-room'],
        }),
      'EDGE_NOT_CONNECTED',
    )
  })
})
