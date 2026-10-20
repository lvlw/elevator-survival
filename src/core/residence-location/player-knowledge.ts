import { deepFreeze } from '../config'
import { knownSupplyEdges } from './supply-knowledge'
import { edgePassable } from './validation'
import type { SupplyDomain } from '../residence-supply/shared-types'
import type { SupplyDependencies } from '../residence-supply/types'
import { supplyPaidCost, supplyEnergyQuery } from '../residence-supply/cycle-adapter'
import { requireKnownResidenceEdge } from './player-qualification'

/** Internal selectors are projected to opaque handles by the controlled facade. */
export function playerResidenceKnowledge(v: SupplyDomain, deps: SupplyDependencies) {
  if (!v.site) return deepFreeze({ nodes: [], routes: [], moves: [] })
  const site = v.site, known = knownSupplyEdges(site, v.witnesses), catalog = deps.catalog
  const snapshot = { character: v.character, site, carried: v.carried, itemStates: v.itemStates }
  const ids = new Set([...site.knowledge.knownNodeIds,
    ...catalog.data.edges.filter(e => known.includes(e.id)).flatMap(e => [e.from, e.to])])
  const nodes = catalog.data.nodes.filter(n => ids.has(n.id)).map(n => ({ key: n.id, name: n.name,
    place: n.placeId, visited: site.knowledge.visitedNodeIds.includes(n.id), current: site.nodeId === n.id }))
  const routes = catalog.data.edges.filter(e => known.includes(e.id)).map(e => {
    const current = e.from === site.nodeId
    return { key: e.id, from: e.from, to: e.to, observation: current ? 'current' as const : 'last-observed' as const,
      passable: current ? edgePassable(snapshot, e) : site.knowledge.routes.find(r => r.edgeId === e.id)?.passable ?? 'unknown' as const }
  })
  const moves = v.phase !== 'active-world' || site.pending.kind !== 'none' || v.character.body.condition.currentHealth === 0 ? [] :
    catalog.data.edges.filter(e => e.from === site.nodeId && known.includes(e.id) && edgePassable(snapshot, e)).map(e => {
      const edge = requireKnownResidenceEdge(snapshot, catalog, e.id, known, e => edgePassable(snapshot, e))
      if (edge.cost.kind !== 'paid') throw new Error('Expected declared movement')
      const energy = supplyEnergyQuery(v, deps, 'move', supplyPaidCost(v, edge.cost.base, deps, true))
      return { key: e.id, destination: catalog.data.nodes.find(n => n.id === e.to)!.name, ...energy }
    })
  return deepFreeze({ nodes, routes, moves })
}
