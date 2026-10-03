import { addItemToBackpack, calculateBackpackWeightSubtotal, removeItemFromBackpack } from '../inventory'
import { classifyLoad } from '../load'
import { planResidenceAction } from '../residence-energy'
import { LocationError, type LocationAuthority, type LocationDependencies, type LocationPlan, type ResidenceLocationSnapshot } from './types'
import { finishLocationPlan } from './movement'
import { requireActionContext } from './validation'

export function planResidenceItemTransfer(input: unknown, request: unknown, authority: LocationAuthority, deps: LocationDependencies): LocationPlan {
  const ctx = requireActionContext(input, request, authority, deps)
  const { command, snapshot, catalog } = ctx
  if (command.kind !== 'pickup' && command.kind !== 'drop') throw new LocationError('INVALID_INPUT', 'Whole-instance transfer command required')
  const nodeId = snapshot.site.nodeId
  const ground = snapshot.site.ground.find((g) => g.nodeId === nodeId)!
  const items = command.kind === 'pickup' ? ground.items : snapshot.carried.backpack.items
  const item = items.find((i) => i.instanceId === command.instanceId)
  if (!item || !catalog.data.items.find((i) => i.physical.id === item.definitionId)!.ordinary) {
    throw new LocationError('NOT_AVAILABLE', 'No ordinary real instance at this source')
  }
  const backpack = command.kind === 'pickup'
    ? addItemToBackpack(snapshot.carried.backpack, item, { instanceId: item.instanceId, ...command.placement }, catalog.physical)
    : removeItemFromBackpack(snapshot.carried.backpack, item.instanceId, catalog.physical).snapshot
  if (!classifyLoad(calculateBackpackWeightSubtotal(backpack, catalog.physical), catalog.data.backpack).canCarry) {
    throw new LocationError('CANNOT_CARRY', 'Resulting backpack cannot be carried')
  }
  const proposed: ResidenceLocationSnapshot = { ...snapshot, carried: { ...snapshot.carried, backpack },
    site: { ...snapshot.site, ground: snapshot.site.ground.map((g) => g.nodeId !== nodeId ? g : { ...g,
      items: command.kind === 'pickup' ? g.items.filter((i) => i.instanceId !== item.instanceId) : [...g.items, item] }) } }
  const body = planResidenceAction(snapshot.character, { identity: snapshot.character.identity, expectedRevision: snapshot.character.revision,
    action: command.kind === 'pickup' ? 'revealed-pickup' : 'organize', cost: { kind: 'free', amount: 0 } }, ctx.authority.cycle,
  deps.residence, (completion) => ({ completion, effects: { healthLoss: 0, exposuresAdded: 0 } }))
  return finishLocationPlan(snapshot, proposed, body, ctx.authority, deps)
}
