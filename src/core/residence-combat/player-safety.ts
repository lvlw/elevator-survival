import { deepFreeze } from '../config'
import { queryPublicActionCheckpoint, type CommandDeath } from '../character-cycle/safety-facts'
import type { CombatValue, CombatDependencies } from './types'
import type { PlayerCoreCommand, SafeCommandQualification } from './player-query-types'
import { projectCombat } from './projection'
import { createCombatEnginePlayerPrimaryPlan } from '../combat/combat-player-action-primary-plan'
import { evaluateCombatPostPlayerActionBleeding, enemyActsBeforePlayerCompletion } from '../combat/combat-action-checkpoints'
import { createCombatEngineEnemyPrimaryPlan } from '../combat/combat-enemy-action-primary-plan'
import { getCombatResourceState } from '../combat/combat-selectors'
import { createTemporaryDefenseSnapshot } from '../combat/combat-validation'
import { applyHealthLoss } from '../condition'

/** Conservative complete-intent proof. Never reads infection, enemy HP, seed or future rolls. */
export function queryPlayerCommandDeath(v: CombatValue, command: PlayerCoreCommand,
  qualified: SafeCommandQualification, deps: CombatDependencies): CommandDeath {
  const result = (kind: CommandDeath['kind'], basis: CommandDeath['basis']) => deepFreeze({ kind, basis })
  if (qualified.kind === 'unavailable' || qualified.kind === 'invalid-selection') return result('unknown', 'invalid-request')
  if (qualified.kind === 'unknown') return result('unknown', 'hidden-target')
  if (command.kind === 'combat') {
    const { snapshot, engine } = projectCombat(v, deps)
    // Formal deterministic primary metadata, not a signed plan or CTB resolution.
    const primary = createCombatEnginePlayerPrimaryPlan(snapshot, command.command.command, engine)
    const health = primary.kind === 'quick-slot-item' ? primary.healthAfterRecovery : snapshot.playerCondition.currentHealth
    const stops = primary.kind === 'quick-slot-item' && primary.stopsBleeding
    const checkpoint = evaluateCombatPostPlayerActionBleeding(health, snapshot.playerCondition.bleeding && !stops,
      engine.profile.rules.postPlayerActionBleedingDamage)
    if (primary.kind !== 'escape' && checkpoint.healthAfter === 0) return result('guaranteed', 'action-bleeding')
    const enemyNext = snapshot.enemyNextActionCtb + (primary.kind === 'attack' ? primary.enemyActionDelay : 0)
    const completes = snapshot.currentCtb + primary.actionCtb
    const responds = enemyActsBeforePlayerCompletion(enemyNext, completes)
    if (primary.kind === 'attack') {
      // Whether an attack cancels a response by killing is hidden enemy HP.
      return result(responds ? 'unknown' : 'not-guaranteed', responds ? 'combat-response' : 'combat-no-response')
    }
    let afterResponse = primary.kind === 'escape' ? health : checkpoint.healthAfter
    let bleedingGuaranteed = snapshot.playerCondition.bleeding && !stops, bleedingPossible = bleedingGuaranteed
    if (responds) {
      const definition = engine.enemyCatalog.get(snapshot.enemy.definitionId)
      const action = definition.actions.find(a => a.id === snapshot.enemy.currentIntentActionId)!
      const armor = getCombatResourceState(snapshot, 'armor')?.resource
      const defense = primary.kind === 'defend' ? createTemporaryDefenseSnapshot({ activatedAtCtb: snapshot.currentCtb,
        expiresAtPlayerActionCtb: primary.expiresAtPlayerActionCtb, availableDirectAttackUses: primary.availableDirectAttackUses }) : snapshot.temporaryDefense
      const response = createCombatEngineEnemyPrimaryPlan(snapshot, action, armor?.kind === 'integrity' ? armor.current : null, defense, engine)
      if (response.requestedDirectDamage > 0) afterResponse = applyHealthLoss({ ...snapshot.playerCondition, currentHealth: afterResponse },
        response.requestedDirectDamage, engine.profile.rules.player).healthAfter
      if (afterResponse === 0) return result('guaranteed', 'combat-public-response')
      // One current public intent only; do not inspect the hidden future action cycle.
      if (enemyActsBeforePlayerCompletion(enemyNext + response.actionCtb, completes)) return result('unknown', 'combat-response')
      const injury = engine.profile.rules.riskTiers[response.injuryFinalTier]
      if (response.injuryKind !== 'contusion' && injury > 0) bleedingPossible = true
      if (response.injuryKind !== 'contusion' && injury === 100) bleedingGuaranteed = true
    }
    if (primary.kind !== 'escape') return result('not-guaranteed', responds ? 'combat-public-response' : 'combat-no-response')
    const withBleeding = evaluateCombatPostPlayerActionBleeding(afterResponse, true, engine.profile.rules.postPlayerActionBleedingDamage).healthAfter
    const branches = [!bleedingGuaranteed ? afterResponse : null, bleedingPossible ? withBleeding : null].filter((n): n is number => n !== null)
    return result(branches.some(n => n > 0) ? 'not-guaranteed' : 'guaranteed', 'combat-public-response')
  }
  if (command.kind === 'depart') return result('not-guaranteed', 'first-departure')
  if (command.kind === 'terminal' && command.command.kind !== 'deadline') return result('not-guaranteed', 'normal-return-no-night')
  if (command.kind === 'rest' || command.kind === 'terminal') {
    // Cycle preflight itself involves hidden arithmetic. A current coarse band
    // cannot prove complete acceptance or the next cycle's outcome.
    return result('unknown', 'future-cycle')
  }
  const paid = ['move', 'task', 'source', 'maintenance'].includes(command.kind)
  const checkpoint = queryPublicActionCheckpoint(v.character.body, paid, deps.supply.residence)
  if (checkpoint.death.kind === 'guaranteed') return checkpoint.death
  // Entering a battle can resolve responses before another decision. No hidden-entry inspection.
  if (command.kind === 'move') return result('unknown', 'arrival-consequences')
  return checkpoint.death
}
