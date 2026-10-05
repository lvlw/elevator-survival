import { deepFreeze } from '../config'
import { edgePassable } from '../residence-location/validation'
import { knownSupplyEdges } from '../residence-location/supply-knowledge'
import { readSupplyValue } from './validation'
import { taskAlreadyProduced, taskFact } from '../residence-task/plans'
import { SupplyError, type SupplyDependencies } from './types'
/** Minimal safe objects/qualification query, not full E03 ViewModel or a plan capability. */
export function querySupplyKnownObjects(input: unknown, deps: SupplyDependencies) {
  const v = readSupplyValue(input, deps), site = v.site
  const stable = v.phase === 'active-world' && site?.pending.kind === 'none' && v.character.body.condition.currentHealth > 0
  return deepFreeze({ phase: v.phase, energy: v.character.body.energy,
    position: site ? deps.tasks.data.nodes.find(n => n.id === site.nodeId)!.name : null,
    routes: site ? knownSupplyEdges(site, v.witnesses).map(id => {
      const edge = deps.catalog.data.edges.find(e => e.id === id)!
      return { id, from: edge.from, to: edge.to, current: edge.from === site.nodeId,
        passable: edge.from === site.nodeId ? !!stable && edgePassable({ character: v.character, carried: v.carried, itemStates: v.itemStates, site }, edge) : null }
    }) : [],
    sources: site ? deps.tasks.data.sources.filter(s => s.node === site.nodeId && !s.mode.startsWith('paired-') &&
      s.mode !== 'only-with-first-toolbox-door').map(s => ({ id: s.id, claimed: !!taskAlreadyProduced(v, s.id) })) : [],
    actions: site ? deps.tasks.data.actions.filter(a => a.node === site.nodeId && stable && v.character.body.energy > 0 &&
      !taskAlreadyProduced(v, a.id) && a.requires.every(id => taskFact(v, id))).map(a => ({ id: a.id })) : [],
    ground: site ? site.ground.find(g => g.nodeId === site.nodeId)!.items.map(i => ({
      name: deps.catalog.physical.get(i.definitionId).name, quantity: i.quantity })) : [],
  })
}
export function rejectSupplyV2(): never {
  throw new SupplyError('NOT_SUPPORTED_BY_V2', 'Pure supply protocol requires E01-R/S; no old v2 codec/current installation')
}
