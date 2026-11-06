import type { PlayerReadyView } from '../../../state/residence-session/player-types'
export type KnownMap = PlayerReadyView['map']
export type MapTarget = Readonly<{ place: string; name?: string }>
export const fullName = (n: KnownMap['nodes'][number]) => `${n.place} / ${n.name}`
export const passage = (v: boolean | 'unknown') => v === 'unknown' ? '通行未知' : v ? '已知可通行' : '已知受阻'
export const observation = (v: string) => v === 'current' ? '当前观察' : '上次观察'
export function knownGraph(map: KnownMap) {
 const byName = new Map<string, KnownMap['nodes'][number] | null>()
 for (const n of map.nodes) { const key=fullName(n); byName.set(key,byName.has(key)?null:n) }
 const resolved=map.routes.flatMap((r,index)=>{const from=byName.get(r.from),to=byName.get(r.to);return from&&to?[{...r,fromNode:from,toNode:to,index}]:[]})
 return { byName, resolved, places:[...new Set(map.nodes.map(n=>n.place))].sort(), unresolved:map.routes.length!==resolved.length || [...byName.values()].includes(null) }
}
export function mapLayer(map: KnownMap, place: string | null) {
 const g=knownGraph(map)
 return { ...g, nodes:place===null?[]:map.nodes.filter(n=>n.place===place),
  internal:g.resolved.filter(r=>r.fromNode.place===place&&r.toNode.place===place),
  exits:g.resolved.filter(r=>r.fromNode.place===place&&r.toNode.place!==place),
  cross:g.resolved.filter(r=>r.fromNode.place!==r.toNode.place) }
}
export function uniqueTarget(map: KnownMap, target: MapTarget) {
 const g=knownGraph(map)
 return target.name ? !!g.byName.get(`${target.place} / ${target.name}`) : g.places.includes(target.place)
}
