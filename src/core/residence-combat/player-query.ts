import { deepFreeze } from '../config'
import { selectEnemyHealthPhase, getAvailableCombatPlayerCommandsFromValidatedSnapshot } from '../combat/combat-selectors'
import { projectCombat } from './projection'
import type { CombatValue, CombatDependencies } from './types'
import { previewCommittedResourceAction } from '../item-state'

/** Internal target references are replaced by the facade. No resolver/evaluator calls. */
export function playerCombatFacts(value: CombatValue, deps: CombatDependencies) {
  if (!value.battle) return null
  const { snapshot, engine } = projectCombat(value, deps)
  const enemy = engine.enemyCatalog.get(snapshot.enemy.definitionId)
  const intent = enemy.actions.find(a => a.id === snapshot.enemy.currentIntentActionId)!
  const profile = deps.profiles.find(p => p.definitionId === snapshot.enemy.definitionId)!
  const actions = getAvailableCombatPlayerCommandsFromValidatedSnapshot(snapshot, engine).map(command => {
    const request = command.kind === 'metal-pipe-basic-attack' ? profile.rules.metalPipe.basicAttack.durabilityCost :
      command.kind === 'metal-pipe-charged-strike' ? profile.rules.metalPipe.chargedStrike.durabilityCost : null
    const state = request === null ? null : snapshot.itemStates.states.find(s => s.instanceId === snapshot.equipment.weapon!.instanceId)!
    const payment = state && request !== null ? previewCommittedResourceAction(state, request) : null
    return { command, resourceCost: payment?.allowed ? { kind: payment.kind, currentBefore: payment.currentBefore,
      requested: payment.requestedCost, consumed: payment.consumed, after: payment.currentAfter } : null,
    quickConsumption: command.kind === 'use-quick-slot-item' ? { slot: command.quickSlotIndex, quantity: 1 as const } : null,
    signatureUsesRemaining: command.kind === 'metal-pipe-charged-strike' ? value.character.body.quotasRemaining.pipe_signature : null }
  })
  return deepFreeze({ intent: { ...intent.playerVisible },
    enemyStage: selectEnemyHealthPhase(snapshot.enemy.currentHealth, enemy.maxHealth),
    relativeTimeline: { current: 'player' as const,
      nextRelation: snapshot.playerNextActionCtb < snapshot.enemyNextActionCtb ? 'player-before-enemy' as const :
        snapshot.playerNextActionCtb === snapshot.enemyNextActionCtb ? 'same-point' as const : 'enemy-before-player' as const },
    energySettlement: 'once-on-victory-or-retreat' as const, actions })
}
