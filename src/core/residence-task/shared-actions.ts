import type { SupplyDomain, SupplyDomainContext } from '../residence-supply/shared-types'
import { requireSupplyDomainAction } from '../residence-supply/shared-validation'
import { consumeCommittedResource } from '../item-state'
import { ensure } from '../residence-supply/shared-validation'
import { numberValue, vectorValue } from '../residence-supply/config'
import { supplyBodyAction, supplyEnergyQuery, supplyPaidCost } from '../residence-supply/cycle-adapter'
import { createTaskCommand } from './validation'
import { assertTaskPrerequisites, taskFact, taskAlreadyProduced, markSupplyProduction, grantSupplyTask,
  spendEquippedSupplyTool, requireSupplyCard, consumeSupplyRecipe, materializeSupplySource } from './plans'
import { drawSupplyInteger } from './random'

export function planSharedTaskAction<V extends SupplyDomain, P>(value: V, request: unknown, context: SupplyDomainContext<V, P>) {
  const deps = context.dependencies
  const c = createTaskCommand(request, deps.tasks), a = deps.tasks.data.actions.find(a => a.id === c.actionId)!
  requireSupplyDomainAction(value, true)
  ensure(c.expectedRevision === value.character.revision && a.node === value.site.nodeId && !taskAlreadyProduced(value, a.id) &&
    (!a.fact || !taskFact(value, a.fact)), 'Task unavailable here', 'NOT_AVAILABLE')
  assertTaskPrerequisites(value, a.requires)
  let next: V = value, cost = numberValue(deps.configuration, a.cost), method = 'declared', risk = 0
  if (c.method !== undefined) {
    method = c.method
    if (['l1-open', 'l3-open', 'c-gate', 'fire-door', 'fix', 'bypass'].includes(a.id)) {
      const valid = a.id === 'fire-door' ? ['crow', 'toolbox', 'card'] : a.id === 'fix' ? ['manual', 'crow', 'method'] : ['manual', 'crow']
      ensure(valid.includes(method), 'Wrong method for target')
      if (method === 'crow') {
        next = spendEquippedSupplyTool(value, c.toolInstanceId, 'utility_crowbar', 'wear.tool', deps)
        cost = numberValue(deps.configuration, a.id === 'bypass' ? 'bypass.crow' : 'door.crow')
      } else if (method === 'toolbox') {
        next = spendEquippedSupplyTool(value, c.toolInstanceId, 'utility_toolkit', 'wear.tool', deps)
        cost = numberValue(deps.configuration, 'door.toolbox')
      } else if (method === 'card') {
        requireSupplyCard(value, deps, c.toolInstanceId)
        cost = numberValue(deps.configuration, 'door.card')
      } else {
        ensure(c.toolInstanceId === undefined, 'Unused tool selection')
        if (method === 'method') ensure(taskFact(value, 'method'), 'Method not acquired', 'NOT_AVAILABLE')
        cost = numberValue(deps.configuration, a.id === 'fix' && (method === 'method' || value.choices.specialty === 'engineer')
          ? 'fix.method' : 'door.manual')
      }
    } else if (a.id === 'verify' || a.id === 'match') {
      if (method === 'fast') ensure(taskFact(value, a.id === 'verify' ? 'matched' : 'verified'), 'No actual fast comparison', 'NOT_AVAILABLE')
      cost = numberValue(deps.configuration, a.id === 'match' && value.choices.specialty === 'scout' ?
        'verify.scout.' + method : 'verify.' + method)
    } else if (a.id === 'sample') {
      cost = numberValue(deps.configuration, 'extract.sample.' + method)
      const index = method === 'cautious' ? 0 : 1
      risk = vectorValue(deps.configuration, 'sample.risks', 2)[index]
      const coat = value.carried.equipment.armor, state = coat && value.itemStates.states.find(s => s.instanceId === coat.instanceId)
      const protectedRisk = vectorValue(deps.configuration, 'sample.coat_risks', 2)[index]
      if (coat?.definitionId === 'armor_heavy_coat' && state?.resource.kind === 'integrity' && state.resource.current > 0 && protectedRisk < risk) {
        const worn = consumeCommittedResource(state, numberValue(deps.configuration, 'wear.tool'))
        next = { ...next, itemStates: { states: next.itemStates.states.map(s => s.instanceId === state.instanceId ? worn.state : s) } }
        risk = protectedRisk
      }
    }
  }
  if (c.inputs !== undefined) next = consumeSupplyRecipe(next, c.inputs, a.consume!, deps, true)
  const energy = supplyPaidCost(value, cost, deps)
  ensure(supplyEnergyQuery(value, deps, 'extraction', energy).canStart, 'Energy unavailable', 'NOT_AVAILABLE')
  let originIds: readonly string[] = []
  if (a.grant) {
    ensure(c.placement, 'Explicit task placement required')
    const granted = grantSupplyTask(next, a.id, a.grant, numberValue(deps.configuration, a.outputQuantity!), c.placement,
      risk > 0 ? 1 : 0, deps)
    next = granted.value; originIds = [granted.originId]
  }
  next = markSupplyProduction(next, a.id, method, originIds, a.fact, risk > 0 ? 1 : 0)
  if (a.fact && deps.tasks.data.edges.some(e => e.revealBy === a.fact)) next = { ...next, witnesses: [...next.witnesses,
    { nodeId: a.node, factId: a.fact, edgeIds: deps.tasks.data.edges.filter(e => e.revealBy === a.fact).flatMap(e => [e.id + ':forward', e.id + ':reverse']).sort() }] }
  if (a.id === 'fire-door' && method === 'toolbox') next = materializeSupplySource(next, 'H1-toolbox', method, deps)
  // Validate complete physical/provenance proposal before any possible pollution draw.
  const checked = context.read(next)
  const exposures = risk > 0 && drawSupplyInteger(value, a.id, 100, deps) <= risk ? numberValue(deps.configuration, 'sample.exposure') : 0
  const body = supplyBodyAction(value, deps, a.id === 'install' ? 'install' : 'extraction', energy, exposures)
  return context.issue(value, { ...checked, character: body.snapshot }, 'task', body.steps, body.cost)
}
