import type { PlayerReadyView } from '../../../state/residence-session/player-types'

export type KnownMap = PlayerReadyView['map']
export type MapTarget = Readonly<{ place: string; name?: string }>
type KnownNode = KnownMap['nodes'][number]

export const fullName = (node: KnownNode) => `${node.place} / ${node.name}`
export const areaRoomName = (node: Required<MapTarget>) => `${node.place}·${node.name}`
export const passage = (value: boolean | 'unknown') => value === 'unknown' ? '通行未知' : value ? '已知可通行' : '已知受阻'
export const observation = (value: string) => value === 'current' ? '当前观察' : '上次观察'

export function knownGraph(map: KnownMap) {
  const byName = new Map<string, KnownNode | null>()
  for (const node of map.nodes) {
    const key = fullName(node)
    byName.set(key, byName.has(key) ? null : node)
  }
  const resolved = map.routes.flatMap((route, index) => {
    const from = byName.get(route.from), to = byName.get(route.to)
    return from && to ? [{ ...route, fromNode: from, toNode: to, index }] : []
  })
  return {
    byName, resolved, places: [...new Set(map.nodes.map(node => node.place))].sort(),
    unresolved: map.routes.length !== resolved.length || [...byName.values()].includes(null),
  }
}

export function mapLayer(map: KnownMap, place: string | null) {
  const graph = knownGraph(map)
  const cross = graph.resolved.filter(route => route.fromNode.place !== route.toNode.place)
  return {
    ...graph, cross,
    nodes: place === null ? [] : map.nodes.filter(node => node.place === place),
    internal: graph.resolved.filter(route => route.fromNode.place === place && route.toNode.place === place),
    exits: cross.filter(route => route.fromNode.place === place),
    boundary: cross.filter(route => route.fromNode.place === place || route.toNode.place === place),
  }
}

export function uniqueTarget(map: KnownMap, target: MapTarget) {
  const graph = knownGraph(map)
  return target.name ? !!graph.byName.get(`${target.place} / ${target.name}`) : graph.places.includes(target.place)
}

/** A label is qualified only by a unique current public route. It never resolves the command. */
export function travelDestination(map: KnownMap, label: string) {
  const current = map.nodes.filter(node => node.current)
  if (current.length !== 1) return null
  const from = fullName(current[0])
  const { byName } = knownGraph(map)
  if (byName.get(from) !== current[0]) return null
  const matches = map.routes.filter(route => route.from === from && route.observation === 'current' &&
    route.passable === true && route.to.endsWith(` / ${label}`))
  if (matches.length !== 1) return null
  const destination = byName.get(matches[0].to)
  return destination?.name === label ? destination : null
}
