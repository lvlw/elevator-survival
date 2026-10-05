import { createStreamId } from '../random'
import { ensure } from '../residence-supply/shared-validation'
import { verifySteps } from '../residence-terminal/plans'
import type { BodyStep } from '../character-cycle'
import type { CombatDependencies, CombatValue, EntryWitness } from './types'
export function captureCombatEntry(before: CombatValue, after: CombatValue, edgeId: string, steps: readonly BodyStep[], deps: CombatDependencies): EntryWitness | null {
  ensure(before.site && after.site, 'Move lost site')
  const edge = deps.supply.catalog.data.edges.find(e => e.id === edgeId)
  ensure(edge && edge.from === before.site.nodeId && edge.to === after.site.nodeId &&
    after.character.revision === before.character.revision + 1, 'Move/entry binding differs')
  verifySteps(before.character.body, after.character.body, steps, 'action', after.character.body.energy, deps.supply.residence)
  if (after.site.pending.kind !== 'combat-required') return null
  const id = after.site.pending.enemyId
  const original = before.site.enemies.find(e => e.id === id)!
  return { id: createStreamId('residence-battle-v1', before.site.binding.execution.runId, String(after.character.revision), original.state.enemyInstanceId),
    binding: before.site.binding, revision: after.character.revision, baseRevision: before.character.revision,
    edgeId, from: edge.from, to: edge.to, enemyId: id, enemyInstanceId: original.state.enemyInstanceId,
    definitionId: original.state.definitionId, previouslyEncountered: original.state.hasBeenEncountered,
    enemyHealth: original.state.currentHealth, intent: original.state.currentIntentActionId,
    nextCycleIndex: original.state.nextCycleIndex, actionCount: original.state.resolvedActionCount, riskIndex: original.riskDrawIndex,
    healthBefore: before.character.body.condition.currentHealth, healthAfter: after.character.body.condition.currentHealth, steps }
}
