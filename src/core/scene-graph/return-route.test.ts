import { describe, expect, it } from 'vitest'
import type { FrozenRuleConfig } from '../config'
import { LoadRuleError } from '../load'
import { createSceneGraph } from './scene-graph'
import { SceneGraphError } from './graph-errors'
import { findReturnRoute } from './return-route'

const config = {
  backpack: {
    weightBands: {
      normal: { min: 0, max: 16, timeIncreasePercent: 0 },
      loaded: { min: 17, max: 24, timeIncreasePercent: 10 },
      overloaded: { min: 25, max: 28, timeIncreasePercent: 25 },
      cannotCarryFrom: 29,
    },
  },
  scene: {
    travelTimeModifiers: {
      minorContusionTimeIncreasePercent: 10,
    },
  },
  medical: {
    painkiller: {
      suppressesMinorContusionMovementPenalty: true,
    },
  },
} as unknown as FrozenRuleConfig
const graph = createSceneGraph({
  nodes: [
    { id: 'safe-b', name: 'B', isReturnSafetyNode: true },
    { id: 'safe-a', name: 'A', isReturnSafetyNode: true },
    { id: 'middle', name: 'M', isReturnSafetyNode: false },
    { id: 'start', name: 'S', isReturnSafetyNode: false },
  ],
  edges: [
    { id: 'to-middle', from: 'start', to: 'middle', baseTravelTime: 10, bidirectional: true },
    { id: 'middle-to-b', from: 'middle', to: 'safe-b', baseTravelTime: 20, bidirectional: true },
    { id: 'middle-to-a', from: 'middle', to: 'safe-a', baseTravelTime: 20, bidirectional: true },
  ],
})
const enabledEdgeIds = graph.edges.map((edge) => edge.id)

function route(overrides: Partial<Parameters<typeof findReturnRoute>[0]> = {}) {
  return findReturnRoute(
    {
      graph,
      currentNodeId: 'start',
      availability: { enabledEdgeIds },
      totalWeight: 0,
      hasMinorContusion: false,
      analgesiaActive: false,
      ...overrides,
    },
    config,
  )
}

describe('return route', () => {
  it('selects the deterministically shortest reachable safety node', () => {
    const result = route()
    expect(result.safetyNodeId).toBe('safe-a')
    expect(result.baseReturnTime).toBe(30)
    expect(result.estimatedReturnTime).toBe(30)
  })

  it.each([
    ['normal', 0, false, false, 30],
    ['loaded', 17, false, false, 33],
    ['overloaded', 25, false, false, 38],
    ['contusion', 0, true, false, 33],
    ['loaded and contusion', 17, true, false, 37],
    ['overloaded and contusion', 25, true, false, 42],
    ['analgesia suppresses contusion', 25, true, true, 38],
  ])(
    'calculates %s after summing route base time',
    (_label, totalWeight, hasMinorContusion, analgesiaActive, expected) => {
      expect(
        route({ totalWeight, hasMinorContusion, analgesiaActive })
          .estimatedReturnTime,
      ).toBe(expected)
    },
  )

  it('rejects cannot-carry for a non-zero route', () => {
    expect(() => route({ totalWeight: 29 })).toThrowError(
      expect.objectContaining<Partial<LoadRuleError>>({ code: 'CANNOT_CARRY' }),
    )
  })

  it('allows zero-distance calculation while preserving cannot-carry tier', () => {
    const result = route({
      currentNodeId: 'safe-a',
      totalWeight: 29,
      availability: { enabledEdgeIds: [] },
    })
    expect(result).toMatchObject({
      loadTier: 'cannot-carry',
      baseReturnTime: 0,
      estimatedReturnTime: 0,
      nodeIds: ['safe-a'],
      edgeIds: [],
    })
    expect(result.travelTimeAdjustment).toBeNull()
  })

  it('allows a zero-distance route with a valid enabled edge set', () => {
    expect(
      route({
        currentNodeId: 'safe-a',
        availability: { enabledEdgeIds: ['to-middle'] },
      }),
    ).toMatchObject({
      baseReturnTime: 0,
      estimatedReturnTime: 0,
      nodeIds: ['safe-a'],
      edgeIds: [],
    })
  })

  it.each([
    ['unknown enabled edge', ['missing-edge'], 'UNKNOWN_ENABLED_EDGE'],
    [
      'duplicate enabled edge',
      ['to-middle', 'to-middle'],
      'DUPLICATE_ENABLED_EDGE',
    ],
  ] as const)(
    'validates %s before returning a zero-distance route',
    (_name, ids, code) => {
      expect(() =>
        route({
          currentNodeId: 'safe-a',
          availability: { enabledEdgeIds: ids },
        }),
      ).toThrowError(
        expect.objectContaining<Partial<SceneGraphError>>({ code }),
      )
    },
  )

  it('still rejects an unknown current node', () => {
    expect(() => route({ currentNodeId: 'missing-node' })).toThrowError(
      expect.objectContaining<Partial<SceneGraphError>>({
        code: 'UNKNOWN_NODE',
      }),
    )
  })

  it('throws a dedicated error when no safety node is reachable', () => {
    expect(() =>
      route({ availability: { enabledEdgeIds: [] } }),
    ).toThrowError(
      expect.objectContaining<Partial<SceneGraphError>>({
        code: 'NO_RETURN_ROUTE',
      }),
    )
  })

  it('returns a deeply frozen route without modifying availability input', () => {
    const enabled = [...enabledEdgeIds].reverse()
    const result = route({ availability: { enabledEdgeIds: enabled } })
    expect(enabled).toEqual([...enabledEdgeIds].reverse())
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.nodeIds)).toBe(true)
    expect(Object.isFrozen(result.edgeIds)).toBe(true)
  })
})
