import { describe, expect, it } from 'vitest'
import type { PlayerVisibleSceneNavigation } from '../../core/scene-exploration'
import { createPlayerKnownMapViewModel } from './player-known-map-view-model'

const hallNavigation = Object.freeze({
  currentNodeName: '急诊大厅',
  nodes: Object.freeze([
    Object.freeze({ name: '电梯前室', state: 'visited', searchState: 'not-available' }),
    Object.freeze({ name: '急诊大厅', state: 'current', searchState: 'available' }),
    Object.freeze({ name: '药房', state: 'known-unvisited', searchState: null }),
    Object.freeze({ name: '保安值班室', state: 'known-unvisited', searchState: null }),
    Object.freeze({ name: '隔离走廊', state: 'known-unvisited', searchState: null }),
  ]),
  routes: Object.freeze([
    Object.freeze({ endpointNames: Object.freeze(['电梯前室', '急诊大厅']), traversal: 'traversable', movementTime: 10 }),
    Object.freeze({ endpointNames: Object.freeze(['急诊大厅', '药房']), traversal: 'traversable', movementTime: 10 }),
    Object.freeze({ endpointNames: Object.freeze(['急诊大厅', '保安值班室']), traversal: 'traversable', movementTime: 10 }),
    Object.freeze({ endpointNames: Object.freeze(['急诊大厅', '隔离走廊']), traversal: 'blocked', movementTime: 10 }),
  ]),
  return: Object.freeze({
    availability: 'available',
    estimatedReturnTime: 10,
    estimatedRemainingTimeAfterReturn: 170,
    risk: 'safe-returned',
    routeNodeNames: Object.freeze(['急诊大厅', '电梯前室']),
  }),
} satisfies PlayerVisibleSceneNavigation)

describe('player-known map presentation model', () => {
  it('builds deterministic presentation-only topology with valid route references', () => {
    const first = createPlayerKnownMapViewModel(hallNavigation, 'active')
    const second = createPlayerKnownMapViewModel(hallNavigation, 'active')

    expect(first).toEqual(second)
    expect(first).not.toBe(second)
    expect(first.nodes.map(({ key }) => key)).toEqual([
      'map-node-1', 'map-node-2', 'map-node-3', 'map-node-4', 'map-node-5',
    ])
    expect(new Set(first.nodes.map(({ key }) => key)).size).toBe(first.nodes.length)
    expect(new Set(first.routes.map(({ key }) => key)).size).toBe(first.routes.length)
    const nodeKeys = new Set(first.nodes.map(({ key }) => key))
    for (const route of first.routes) {
      expect(nodeKeys.has(route.fromNodeKey)).toBe(true)
      expect(nodeKeys.has(route.toNodeKey)).toBe(true)
    }
    for (const node of first.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(100)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(100)
    }
    expect(first.nodes.find(({ name }) => name === '隔离走廊')).toMatchObject({
      state: 'known-unvisited',
      search: 'not-reached',
    })
    expect(first.routes.at(-1)).toMatchObject({ traversal: 'blocked', movementTime: 10 })
  })

  it('keeps layout coordinates stable when only the current-node presentation changes', () => {
    const revisited = Object.freeze({
      ...hallNavigation,
      currentNodeName: '药房',
      nodes: Object.freeze(hallNavigation.nodes.map((node) => Object.freeze({
        ...node,
        state: node.name === '药房'
          ? 'current' as const
          : node.name === '急诊大厅'
            ? 'visited' as const
            : node.state,
        searchState: node.name === '药房' ? 'available' as const : node.searchState,
      }))),
    }) satisfies PlayerVisibleSceneNavigation

    const before = createPlayerKnownMapViewModel(hallNavigation, 'active')
    const after = createPlayerKnownMapViewModel(revisited, 'active')
    expect(after.nodes.map(({ name, x, y }) => ({ name, x, y })))
      .toEqual(before.nodes.map(({ name, x, y }) => ({ name, x, y })))
    expect(after.routes.map(({ endpointNames, from, to }) => ({ endpointNames, from, to })))
      .toEqual(before.routes.map(({ endpointNames, from, to }) => ({ endpointNames, from, to })))
    expect(after.nodes.find(({ name }) => name === '药房')?.state).toBe('current')
    expect(after.nodes.find(({ name }) => name === '急诊大厅')?.state).toBe('visited')
  })

  it('keeps return facts player-safe and uses Scene status only for unavailable presentation', () => {
    expect(createPlayerKnownMapViewModel(hallNavigation, 'active').return).toEqual({
      status: 'available',
      estimatedReturnTime: 10,
      estimatedRemainingTimeAfterReturn: 170,
      risk: 'safe-returned',
      routeNodeNames: ['急诊大厅', '电梯前室'],
    })
    const unavailable = { ...hallNavigation, return: {
      availability: 'unavailable' as const,
      estimatedReturnTime: null,
      estimatedRemainingTimeAfterReturn: null,
      risk: 'unavailable' as const,
      routeNodeNames: [],
    } }
    expect(createPlayerKnownMapViewModel(unavailable, 'combat').return.status).toBe('combat-recalculate')
    expect(createPlayerKnownMapViewModel(unavailable, 'dead').return.status).toBe('terminal')
  })

  it('contains no canonical identity or hidden-space placeholders', () => {
    const serialized = JSON.stringify(createPlayerKnownMapViewModel(hallNavigation, 'active'))
    for (const hidden of [
      'hospital_emergency_hall',
      'emergency-hall-to-isolation-corridor',
      'sceneInstanceId',
      'runId',
      'seed',
      'rulesVersion',
      'preparedOutcome',
      'randomTrace',
      'riskPercent',
      '???',
      '未知房间',
    ]) expect(serialized).not.toContain(hidden)
  })
})
