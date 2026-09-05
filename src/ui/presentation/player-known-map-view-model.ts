import type { PlayerVisibleSceneNavigation } from '../../core/scene-exploration'

export type PlayerKnownMapSceneStatus =
  | 'active'
  | 'combat'
  | 'safe-returned'
  | 'forced-returned'
  | 'dead'

export interface PlayerKnownMapNodeViewModel {
  readonly key: string
  readonly name: string
  readonly state: 'current' | 'visited' | 'known-unvisited'
  readonly search: 'not-reached' | 'not-available' | 'available' | 'completed'
  readonly x: number
  readonly y: number
}

export interface PlayerKnownMapRouteViewModel {
  readonly key: string
  readonly fromNodeKey: string
  readonly toNodeKey: string
  readonly endpointNames: readonly [string, string]
  readonly traversal: 'traversable' | 'blocked'
  readonly movementTime: number
  readonly from: Readonly<{ x: number; y: number }>
  readonly to: Readonly<{ x: number; y: number }>
}

export interface PlayerKnownMapReturnViewModel {
  readonly status: 'available' | 'combat-recalculate' | 'terminal' | 'unavailable'
  readonly estimatedReturnTime: number | null
  readonly estimatedRemainingTimeAfterReturn: number | null
  readonly risk: 'safe-returned' | 'forced-returned' | 'dead' | null
  readonly routeNodeNames: readonly string[]
}

export interface PlayerKnownMapViewModel {
  readonly currentNodeName: string
  readonly nodes: readonly PlayerKnownMapNodeViewModel[]
  readonly routes: readonly PlayerKnownMapRouteViewModel[]
  readonly return: PlayerKnownMapReturnViewModel
}

function frozen<T>(value: T): Readonly<T> {
  return Object.freeze(value)
}

function searchPresentation(
  state: PlayerVisibleSceneNavigation['nodes'][number],
): PlayerKnownMapNodeViewModel['search'] {
  if (state.state === 'known-unvisited') return 'not-reached'
  if (state.searchState === null) {
    throw new Error('已到达的地图节点缺少玩家可见搜索状态')
  }
  return state.searchState
}

function layoutNodes(navigation: PlayerVisibleSceneNavigation) {
  const firstNodeByName = new Map<string, number>()
  navigation.nodes.forEach(({ name }, index) => {
    if (!firstNodeByName.has(name)) firstNodeByName.set(name, index)
  })
  const adjacency = navigation.nodes.map(() => [] as number[])
  for (const route of navigation.routes) {
    const from = firstNodeByName.get(route.endpointNames[0])
    const to = firstNodeByName.get(route.endpointNames[1])
    if (from === undefined || to === undefined) {
      throw new Error('玩家安全地图路线缺少对应的已知节点')
    }
    adjacency[from].push(to)
    adjacency[to].push(from)
  }

  const depths = navigation.nodes.map(() => -1)
  let componentStart = 0
  for (let root = 0; root < navigation.nodes.length; root += 1) {
    if (depths[root] !== -1) continue
    depths[root] = componentStart
    const queue = [root]
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor]
      for (const adjacent of adjacency[current]) {
        if (depths[adjacent] !== -1) continue
        depths[adjacent] = depths[current] + 1
        queue.push(adjacent)
      }
    }
    componentStart = Math.max(...depths) + 1
  }

  const maximumDepth = Math.max(0, ...depths)
  const indicesByDepth = new Map<number, number[]>()
  depths.forEach((depth, index) => {
    const level = indicesByDepth.get(depth) ?? []
    level.push(index)
    indicesByDepth.set(depth, level)
  })

  return navigation.nodes.map((node, index) => {
    const level = indicesByDepth.get(depths[index])!
    const positionInLevel = level.indexOf(index)
    const x = maximumDepth === 0 ? 50 : 12 + (76 * depths[index]) / maximumDepth
    const y = level.length === 1 ? 50 : 16 + (68 * positionInLevel) / (level.length - 1)
    return frozen<PlayerKnownMapNodeViewModel>({
      key: `map-node-${index + 1}`,
      name: node.name,
      state: node.state,
      search: searchPresentation(node),
      x,
      y,
    })
  })
}

function returnPresentation(
  navigation: PlayerVisibleSceneNavigation,
  sceneStatus: PlayerKnownMapSceneStatus,
): PlayerKnownMapReturnViewModel {
  if (navigation.return.availability === 'available') {
    if (navigation.return.risk === 'unavailable') {
      throw new Error('可用的玩家可见返程缺少正式风险结果')
    }
    return frozen({
      status: 'available',
      estimatedReturnTime: navigation.return.estimatedReturnTime,
      estimatedRemainingTimeAfterReturn: navigation.return.estimatedRemainingTimeAfterReturn,
      risk: navigation.return.risk,
      routeNodeNames: frozen([...navigation.return.routeNodeNames]),
    })
  }
  return frozen({
    status: sceneStatus === 'combat'
      ? 'combat-recalculate'
      : sceneStatus === 'active'
        ? 'unavailable'
        : 'terminal',
    estimatedReturnTime: null,
    estimatedRemainingTimeAfterReturn: null,
    risk: null,
    routeNodeNames: frozen([]),
  })
}

export function createPlayerKnownMapViewModel(
  navigation: PlayerVisibleSceneNavigation,
  sceneStatus: PlayerKnownMapSceneStatus,
): PlayerKnownMapViewModel {
  const nodes = layoutNodes(navigation)
  const byName = new Map(nodes.map((node) => [node.name, node]))
  const routes = navigation.routes.map<PlayerKnownMapRouteViewModel>((route, index) => {
    const from = byName.get(route.endpointNames[0])
    const to = byName.get(route.endpointNames[1])
    if (!from || !to) throw new Error('玩家安全地图路线无法连接已知节点')
    return frozen({
      key: `map-route-${index + 1}`,
      fromNodeKey: from.key,
      toNodeKey: to.key,
      endpointNames: frozen([route.endpointNames[0], route.endpointNames[1]]) as readonly [string, string],
      traversal: route.traversal,
      movementTime: route.movementTime,
      from: frozen({ x: from.x, y: from.y }),
      to: frozen({ x: to.x, y: to.y }),
    })
  })
  return frozen({
    currentNodeName: navigation.currentNodeName,
    nodes: frozen(nodes),
    routes: frozen(routes),
    return: returnPresentation(navigation, sceneStatus),
  })
}
