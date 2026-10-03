import { deepFreeze } from '../config'
import { edgePassable, readLocationContext } from './validation'
import type { LocationAuthority, LocationDependencies, ResidenceLocationSnapshot } from './types'

/** Internal arrival effect, never called by a query. */
export function observeLocationArrival(snapshot: ResidenceLocationSnapshot, deps: LocationDependencies): ResidenceLocationSnapshot {
  const data = deps.catalog.data
  const node = data.nodes.find((n) => n.id === snapshot.site.nodeId)!
  const old = snapshot.site.knowledge
  const knownEdgeIds = [...new Set([...old.knownEdgeIds, ...node.surfaceEdgeIds])].sort()
  const visitedNodeIds = [...new Set([...old.visitedNodeIds, node.id])].sort()
  const knownNodeIds = [...new Set([...old.knownNodeIds, node.id,
    ...data.edges.filter((e) => knownEdgeIds.includes(e.id)).flatMap((e) => [e.from, e.to])])].sort()
  const routes = old.routes.filter((r) => !node.surfaceEdgeIds.includes(r.edgeId)).concat(
    node.surfaceEdgeIds.map((edgeId) => ({ edgeId, observedFromNodeId: node.id,
      passable: edgePassable(snapshot, data.edges.find((e) => e.id === edgeId)!) })),
  ).sort((a, b) => a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0)
  return { ...snapshot, site: { ...snapshot.site, knowledge: { knownNodeIds, knownEdgeIds, visitedNodeIds, routes } } }
}

export function queryActiveResidencePosition(input: unknown, authority: LocationAuthority, deps: LocationDependencies) {
  const { snapshot, authority: checked, catalog } = readLocationContext(input, authority, deps)
  if (checked.mission.status !== 'active') return null
  const node = catalog.data.nodes.find((n) => n.id === snapshot.site.nodeId)!
  return deepFreeze({ nodeId: node.id, placeId: node.placeId })
}

/** Explicit allow-list: no source outcomes, execution identity, hidden enemy HP or RNG. */
export function queryPlayerResidenceKnowledge(input: unknown, authority: LocationAuthority, deps: LocationDependencies) {
  const { snapshot, authority: checked, catalog } = readLocationContext(input, authority, deps)
  const k = snapshot.site.knowledge
  const active = checked.mission.status === 'active'
  const here = active ? snapshot.site.nodeId : null
  return deepFreeze({
    currentNodeId: here,
    nodes: [...k.knownNodeIds].sort().map((id) => {
      const n = catalog.data.nodes.find((v) => v.id === id)!
      return { id, name: n.name, placeId: n.placeId, visited: k.visitedNodeIds.includes(id) }
    }),
    routes: [...k.knownEdgeIds].sort().map((id) => {
      const e = catalog.data.edges.find((v) => v.id === id)!
      const current = here === e.from
      return { id, from: e.from, to: e.to, observation: current ? 'current' as const : 'last-observed' as const,
        passable: current ? edgePassable(snapshot, e) : k.routes.find((r) => r.edgeId === id)!.passable }
    }),
    sources: here === null ? [] : catalog.data.nodes.find((n) => n.id === here)!.surfaceSourceIds.map((id) => ({
      id, claimed: snapshot.site.sources.find((s) => s.id === id)!.claimed,
    })),
    ground: here === null ? [] : snapshot.site.ground.find((g) => g.nodeId === here)!.items.map((i) => ({
      name: catalog.physical.get(i.definitionId).name, quantity: i.quantity,
    })),
  })
}
