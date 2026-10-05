import type { ResidenceSite } from './types'
/** Additional investigated edges are separate witnesses; old surface knowledge stays strict. */
export function knownSupplyEdges(site: ResidenceSite, witnesses: readonly { edgeIds: readonly string[] }[]) {
  return [...new Set([...site.knowledge.knownEdgeIds, ...witnesses.flatMap(w => w.edgeIds)])].sort()
}
