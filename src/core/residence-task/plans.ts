import { consumeCommittedResource } from '../item-state'
import { carriedItems } from '../residence-location/validation'
import { addItemToBackpack } from '../inventory'
import { ensure } from '../residence-supply/validation'
import { tableValue, numberValue } from '../residence-supply/config'
import { consumeSupplyUnits, carriedSupplyItem, issueSupplyOrigin } from '../residence-supply/allocations'
import { originalInstanceId } from '../residence-supply/provenance'
import { selectWeightedSupply } from './random'
import type { SupplyDependencies, SupplyProduction } from '../residence-supply/types'
import type { SupplyDomain } from '../residence-supply/shared-types'

export function taskFact(v: SupplyDomain, id: string) { return v.site?.facts.some(f => f.id === id && f.value) ?? false }
export function assertTaskPrerequisites(v: SupplyDomain, ids: readonly string[]) {
  ensure(ids.every(id => taskFact(v, id)), 'Missing actual task prerequisite', 'NOT_AVAILABLE')
}
export function taskAlreadyProduced(v: SupplyDomain, id: string) {
  return v.site && v.productions.some(p => p.producerId === id && p.binding.execution.runId === v.site!.binding.execution.runId)
}
export function markSupplyProduction<V extends SupplyDomain>(v: V, id: string, method: string, originIds: readonly string[], factId: string | null, drawIndex: number): V {
  ensure(v.site && !taskAlreadyProduced(v, id), 'Already produced', 'NOT_AVAILABLE')
  const production: SupplyProduction = { binding: v.site.binding, producerId: id, method, originIds, factId, drawIndex, revision: v.character.revision }
  return { ...v, productions: [...v.productions, production], site: { ...v.site,
    facts: v.site.facts.map(f => f.id === factId ? { ...f, value: true } : f) } }
}
export function spendEquippedSupplyTool<V extends SupplyDomain>(v: V, id: string | undefined, definitionId: string, costKey: string, deps: SupplyDependencies): V {
  const tool = v.carried.equipment.utility
  ensure(id && tool?.instanceId === id && tool.definitionId === definitionId, 'Explicit equipped tool required', 'NOT_AVAILABLE')
  const state = v.itemStates.states.find(s => s.instanceId === id)!
  const result = consumeCommittedResource(state, numberValue(deps.configuration, costKey))
  return { ...v, itemStates: { states: v.itemStates.states.map(s => s.instanceId === id ? result.state : s) } }
}
export function consumeSupplyRecipe<V extends SupplyDomain>(v: V, inputs: readonly { instanceId: string; quantity: number }[], recipeKey: string | Readonly<Record<string, number>>,
  deps: SupplyDependencies, installed = false) {
  ensure(new Set(inputs.map(i => i.instanceId)).size === inputs.length, 'Repeated consumption target')
  const recipe = typeof recipeKey === 'string' ? tableValue(deps.configuration, recipeKey) : recipeKey, actual = new Map<string, number>()
  for (const selected of inputs) {
    const item = carriedSupplyItem(v, selected.instanceId)
    const alias = deps.tasks.data.items.find(i => i.id === item.definitionId)?.alias
    ensure(alias && alias in recipe && selected.quantity <= item.quantity, 'Wrong material recipe', 'NOT_AVAILABLE')
    actual.set(alias, (actual.get(alias) ?? 0) + selected.quantity)
    if (!deps.catalog.data.items.find(i => i.physical.id === item.definitionId)!.ordinary && alias !== 'card') {
      const a = v.allocations.find(a => a.instanceId === item.instanceId)!
      const o = v.origins.find(o => o.id === a.ranges[0].originId)!
      ensure(o.kind === 'task' && o.binding.execution.runId === v.site?.binding.execution.runId &&
        item.instanceId === originalInstanceId(o) && item.quantity === 1, 'Task substitute', 'INVALID_PROVENANCE')
    }
  }
  ensure(Object.keys(recipe).every(a => actual.get(a) === recipe[a]) && actual.size === Object.keys(recipe).length, 'Incomplete exact recipe', 'NOT_AVAILABLE')
  let next = v
  for (const selected of inputs) next = consumeSupplyUnits(next, selected.instanceId, selected.quantity, deps, installed ? 'installed' : 'consumed')
  return next
}
export function grantSupplyTask<V extends SupplyDomain>(v: V, id: string, alias: string, quantity: number,
  placement: { x: number; y: number; rotated: boolean }, drawIndex: number, deps: SupplyDependencies) {
  ensure(v.site, 'No site')
  const definitionId = deps.tasks.data.items.find(i => i.alias === alias)!.id
  const produced = issueSupplyOrigin(v, v.site.binding, deps.catalog.data.nodes.find(n => n.id === v.site!.nodeId)!.placeId,
    v.site.nodeId, id, 0, definitionId, quantity, 'task', drawIndex, deps)
  ensure(produced.items.length === 1, 'Task output must be one original instance')
  return { value: { ...produced.value, carried: { ...produced.value.carried, backpack: addItemToBackpack(
    produced.value.carried.backpack, produced.items[0], { instanceId: produced.items[0].instanceId, ...placement }, deps.catalog.physical) } },
    originId: produced.value.origins.at(-1)!.id }
}
export function requireSupplyCard(v: SupplyDomain, deps: SupplyDependencies, id: string | undefined) {
  const definition = deps.tasks.data.items.find(i => i.alias === 'card')!.id
  ensure(id && carriedItems(v.carried).some(i => i.instanceId === id && i.definitionId === definition), 'Real held permission required', 'NOT_AVAILABLE')
}
export function materializeSupplySource<V extends SupplyDomain>(v: V, sourceId: string, method: string, deps: SupplyDependencies) {
  const s = deps.tasks.data.sources.find(s => s.id === sourceId)!
  ensure(s && v.site && v.site.nodeId === s.node && !taskAlreadyProduced(v, s.id), 'Source already issued or not here', 'NOT_AVAILABLE')
  assertTaskPrerequisites(v, s.requires)
  const entries = s.choices ? [[selectWeightedSupply(v, s.id, s.weights!, s.choices, deps), numberValue(deps.configuration, 'unit')] as const] :
    Object.entries(tableValue(deps.configuration, s.grants!))
  const before = v.origins.length
  let next = v
  for (const [ordinal, [alias, quantity]] of entries.entries()) {
    const produced = issueSupplyOrigin(next, v.site.binding, deps.catalog.data.nodes.find(n => n.id === s.node)!.placeId,
      s.node, s.id, s.choices ? s.choices.indexOf(alias) : ordinal, deps.tasks.data.items.find(i => i.alias === alias)!.id,
      quantity, 'ordinary', s.choices ? 1 : 0, deps)
    next = { ...produced.value, site: { ...next.site!, ground: next.site!.ground.map(g => g.nodeId === s.node ? { ...g, items: [...g.items, ...produced.items] } : g) } }
  }
  return markSupplyProduction(next, s.id, method, next.origins.slice(before).map(o => o.id), null, s.choices ? 1 : 0)
}
