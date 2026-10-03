import { createItemInstance } from '../inventory'
import { createItemState } from '../item-state'
import { drawIntInclusive } from '../random'
import { planResidenceAction } from '../residence-energy'
import { LocationError, type LocationAuthority, type LocationDependencies, type LocationPlan, type ResidenceLocationSnapshot } from './types'
import { locationRandomCursor, sourceItemId } from './identity'
import { finishLocationPlan } from './movement'
import { carriedItems, requireActionContext } from './validation'

export function planResidenceSourceReveal(input: unknown, request: unknown, authority: LocationAuthority, deps: LocationDependencies): LocationPlan {
  const ctx = requireActionContext(input, request, authority, deps)
  const { command, snapshot, catalog } = ctx
  if (command.kind !== 'reveal') throw new LocationError('INVALID_INPUT', 'Reveal command required')
  const source = catalog.data.sources.find((s) => s.id === command.sourceId)
  const node = catalog.data.nodes.find((n) => n.id === snapshot.site.nodeId)!
  const state = snapshot.site.sources.find((s) => s.id === command.sourceId)
  if (!source || !state || source.nodeId !== node.id || !node.surfaceSourceIds.includes(source.id) || state.claimed ||
    !source.requiredFactIds.every((id) => snapshot.site.facts.some((f) => f.id === id && f.value))) {
    throw new LocationError('NOT_AVAILABLE', 'Source is hidden, remote, blocked or already claimed')
  }
  const existing = new Set([...carriedItems(snapshot.carried), ...snapshot.site.ground.flatMap((g) => g.items)].map((i) => i.instanceId))
  const choices = source.contents.kind === 'fixed' ? [source.contents.grants] : source.contents.choices
  for (const grants of choices) for (let i = 0; i < grants.length; i++) {
    if (existing.has(sourceItemId(snapshot.site.binding, node.placeId, node.id, source.id, i))) throw new LocationError('INVALID_INPUT', 'Source output identity already exists')
  }
  let proposed: ResidenceLocationSnapshot = snapshot
  const body = planResidenceAction(snapshot.character, { identity: snapshot.character.identity,
    expectedRevision: snapshot.character.revision, action: 'search', cost: source.cost }, ctx.authority.cycle, deps.residence, (completion) => {
    let grants = choices[0]
    let drawIndex = state.drawIndex
    if (source.contents.kind === 'choice') {
      const draw = drawIntInclusive(locationRandomCursor(snapshot.site.binding, node.placeId, node.id, 'source', source.id, 'contents', drawIndex),
        0, source.contents.choices.length - 1)
      grants = source.contents.choices[draw.value]; drawIndex = draw.nextCursor.drawIndex
    }
    const entities = grants.map((grant, ordinal) => {
      const item = createItemInstance({ instanceId: sourceItemId(snapshot.site.binding, node.placeId, node.id, source.id, ordinal),
        definitionId: grant.definitionId, quantity: grant.quantity }, catalog.physical)
      return { item, state: createItemState({ instanceId: item.instanceId, definitionId: item.definitionId, resource: grant.resource }, catalog.resources) }
    })
    proposed = { ...snapshot, itemStates: { states: [...snapshot.itemStates.states, ...entities.map((e) => e.state)] },
      site: { ...snapshot.site, sources: snapshot.site.sources.map((s) => s.id === source.id ? { ...s, claimed: true, drawIndex } : s),
        ground: snapshot.site.ground.map((g) => g.nodeId === node.id ? { ...g, items: [...g.items, ...entities.map((e) => e.item)] } : g) } }
    return { completion, effects: { healthLoss: 0, exposuresAdded: 0 } }
  })
  return finishLocationPlan(snapshot, proposed, body, ctx.authority, deps)
}
