import { safeAdd } from '../residence-config/validation'
import { consumeSupplyUnits } from '../residence-supply/allocations'
import { carriedItems } from '../residence-location/validation'
import { ensure } from '../residence-supply/shared-validation'
import { combatBodyTrace, verifyCombatBodyTrace } from './trace'
import type { CombatResolution } from '../combat/combat-types'
import type { CombatDependencies, CombatValue, DecisionWitness, CombatUseWitness } from './types'
/** Applies this call's real CTB output once to the unique domain owners. No second resolver. */
export function composeCombatResolution(before: CombatValue, result: CombatResolution, deps: CombatDependencies): CombatValue {
  const b = before.battle!, s = before.site!, snapshot = result.snapshot, effects = result.plan.effects
  const original = s.enemies.find(e => e.id === b.entry.enemyId)!
  let next = before
  const uses: CombatUseWitness[] = []
  for (const e of effects) if (e.kind === 'combat-quick-slot-item-consumed') {
    ensure(before.carried.quickSlots.slots[e.quickSlotIndex]?.instanceId === e.instanceId, 'Consumption slot differs')
    const prior = new Set(next.dispositions.map(d => d.id))
    next = consumeSupplyUnits(next, e.instanceId, e.quantityConsumed, deps.supply, 'consumed', 'medical')
    uses.push({ instanceId: e.instanceId, definitionId: e.definitionId, slot: e.quickSlotIndex, quantity: 1,
      kind: e.source === 'combat-bandage' ? 'bandage' : 'painkiller',
      dispositionIds: next.dispositions.filter(d => !prior.has(d.id)).map(d => d.id) })
  }
  const carriedIds = new Set(carriedItems(before.carried).map(i => i.instanceId))
  const risk = effects.filter(e => e.kind === 'combat-risk-resolved').length
  const quota = deps.supply.residence.configuration.config.quota.pipe_signature - snapshot.usage.metalPipeChargedStrikeUses
  const revision = safeAdd(before.character.revision, 1)
  const trace = combatBodyTrace(effects, before.character.body.condition.currentHealth, b.currentCtb)
  verifyCombatBodyTrace(trace, before.character.body.condition.currentHealth, snapshot.playerCondition.currentHealth,
    deps.supply.residence.configuration.config.limits.hp, snapshot.status === 'defeat')
  const decision: DecisionWitness = { battleId: b.entry.id, revision, baseRevision: before.character.revision,
    command: result.plan.command, ctbBefore: b.currentCtb, ctbAfter: snapshot.currentCtb,
    playerNext: snapshot.playerNextActionCtb, enemyNext: snapshot.enemyNextActionCtb,
    healthBefore: before.character.body.condition.currentHealth, healthAfter: snapshot.playerCondition.currentHealth,
    enemyHealthBefore: original.state.currentHealth, enemyHealthAfter: snapshot.enemy.currentHealth,
    actionCountBefore: original.state.resolvedActionCount, actionCountAfter: snapshot.enemy.resolvedActionCount,
    enemyResponses: effects.filter(e => e.kind === 'player-health-lost' && e.source !== 'post-player-action-bleeding').length,
    riskBefore: original.riskDrawIndex, riskAfter: safeAdd(original.riskDrawIndex, risk), trace, uses,
    resources: effects.flatMap(e => e.kind === 'item-resource-consumed' ? [{ instanceId: e.instanceId,
      before: e.currentBefore, requested: e.requestedCost, consumed: e.consumed, after: e.currentAfter }] : []),
    quotaBefore: before.character.body.quotasRemaining.pipe_signature, quotaAfter: quota,
    queue: effects.flatMap(e => e.kind === 'combat-ctb-position-changed' ? [{ reason:e.reason,
      currentBefore:e.currentCtbBefore,currentAfter:e.currentCtbAfter,playerBefore:e.playerNextActionCtbBefore,
      playerAfter:e.playerNextActionCtbAfter,enemyBefore:e.enemyNextActionCtbBefore,enemyAfter:e.enemyNextActionCtbAfter }] : []) }
  return { ...next, character: { ...before.character, revision, body: { ...before.character.body,
    condition: snapshot.playerCondition, quotasRemaining: { ...before.character.body.quotasRemaining, pipe_signature: quota } } },
    carried: { backpack: snapshot.backpack, equipment: snapshot.equipment, quickSlots: snapshot.quickSlots },
    itemStates: { states: [...before.itemStates.states.filter(i => !carriedIds.has(i.instanceId)), ...snapshot.itemStates.states] },
    choices: { ...before.choices, firstBandageUsed: before.choices.firstBandageUsed || uses.some(u => u.kind === 'bandage') },
    site: { ...s, pending: snapshot.enemy.defeated ? { kind: 'none' } : s.pending,
      enemies: s.enemies.map(e => e.id === original.id ? { ...e, state: snapshot.enemy, riskDrawIndex: decision.riskAfter } : e) },
    battle: { ...b, currentCtb: snapshot.currentCtb, playerNext: snapshot.playerNextActionCtb,
      enemyNext: snapshot.enemyNextActionCtb, temporaryDefense: null, decision } }
}
