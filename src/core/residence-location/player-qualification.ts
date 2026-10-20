import { LocationError, type LocationDependencies, type ResidenceLocationSnapshot } from './types'

/** Formal edge selection, shared by the producer and the read-only query. */
export function requireKnownResidenceEdge(snapshot: ResidenceLocationSnapshot, catalog: LocationDependencies['catalog'],
  edgeId: string, known: readonly string[], passable: (edge: LocationDependencies['catalog']['data']['edges'][number]) => boolean) {
  const edge = catalog.data.edges.find(e => e.id === edgeId)
  if (!edge || edge.from !== snapshot.site.nodeId || !known.includes(edge.id) || !passable(edge)) {
    throw new LocationError('NOT_AVAILABLE', 'Not a known currently traversable outgoing edge')
  }
  return edge
}
