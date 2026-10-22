import type { PlayerAction, PlayerReadyView, PlayerRequest } from '../../state/residence-session/player-types'

export function currentActions(view: PlayerReadyView): readonly PlayerAction[] {
  return [...view.actions, ...view.move.options, ...view.tasks.choices, ...view.sources.flatMap(s => s.choices), ...(view.combat?.actions ?? [])]
}
/** Identity equality only. Never rebind stale choices by label or refresh-and-resubmit. */
export function requestStillVisible(view: PlayerReadyView, request: PlayerRequest) {
  if (!currentActions(view).some(a => a.selector === request.action)) return false
  const items = [...view.carried, ...view.ground]
  if ([request.item, request.targetItem, ...(request.materials?.map(m => m.item) ?? []), ...(request.allocations?.map(a => a.item) ?? [])]
    .some(h => h && !items.some(i => i.selector === h))) return false
  return !request.wound || view.body.wounds.some(w => w.selector === request.wound)
}
