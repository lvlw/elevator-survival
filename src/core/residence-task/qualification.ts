import { ensure, requireSupplyDomainAction } from '../residence-supply/shared-validation'
import { numberValue } from '../residence-supply/config'
import type { SupplyDomain } from '../residence-supply/shared-types'
import type { SupplyDependencies } from '../residence-supply/types'
import { assertTaskPrerequisites, taskAlreadyProduced, taskFact } from './plans'
import type { TaskCommand } from './validation'
export function taskMethodChoices(id: string): readonly NonNullable<TaskCommand['method']>[] {
  if (id === 'fire-door') return ['crow', 'toolbox', 'card']
  if (id === 'fix') return ['manual', 'crow', 'method']
  if (['l1-open', 'l3-open', 'c-gate', 'bypass'].includes(id)) return ['manual', 'crow']
  if (id === 'verify' || id === 'match') return ['full', 'fast']
  if (id === 'sample') return ['cautious', 'direct']
  return []
}

/** Same initial selection check as the formal task/source producer. No result materialization. */
export function requireTaskOpportunity(v: SupplyDomain, id: string, node: string, requires: readonly string[], revision: number,
  fact: string | null = null) {
  ensure(revision === v.character.revision && node === v.site?.nodeId && !taskAlreadyProduced(v, id) &&
    (!fact || !taskFact(v, fact)), 'Task unavailable here', 'NOT_AVAILABLE')
  assertTaskPrerequisites(v, requires)
}
export function taskMethodCost(v: SupplyDomain, c: TaskCommand, deps: SupplyDependencies) {
  const a = deps.tasks.data.actions.find(a => a.id === c.actionId)!
  let cost = numberValue(deps.configuration, a.cost)
  const method = c.method
  if (method === undefined) return cost
  if (['l1-open', 'l3-open', 'c-gate', 'fire-door', 'fix', 'bypass'].includes(a.id)) {
    const valid = taskMethodChoices(a.id)
    ensure(valid.includes(method), 'Wrong method for target')
    if (method === 'crow') cost = numberValue(deps.configuration, a.id === 'bypass' ? 'bypass.crow' : 'door.crow')
    else if (method === 'toolbox') cost = numberValue(deps.configuration, 'door.toolbox')
    else if (method === 'card') cost = numberValue(deps.configuration, 'door.card')
    else {
      ensure(c.toolInstanceId === undefined, 'Unused tool selection')
      if (method === 'method') ensure(taskFact(v, 'method'), 'Method not acquired', 'NOT_AVAILABLE')
      cost = numberValue(deps.configuration, a.id === 'fix' && (method === 'method' || v.choices.specialty === 'engineer') ? 'fix.method' : 'door.manual')
    }
  } else if (a.id === 'verify' || a.id === 'match') {
    if (method === 'fast') ensure(taskFact(v, a.id === 'verify' ? 'matched' : 'verified'), 'No actual fast comparison', 'NOT_AVAILABLE')
    cost = numberValue(deps.configuration, a.id === 'match' && v.choices.specialty === 'scout' ? 'verify.scout.' + method : 'verify.' + method)
  } else if (a.id === 'sample') cost = numberValue(deps.configuration, 'extract.sample.' + method)
  return cost
}
export function requireTaskSelection(v: SupplyDomain, c: TaskCommand, deps: SupplyDependencies) {
  requireSupplyDomainAction(v, true)
  const a = deps.tasks.data.actions.find(a => a.id === c.actionId)!
  requireTaskOpportunity(v, a.id, a.node, a.requires, c.expectedRevision, a.fact)
  return a
}
