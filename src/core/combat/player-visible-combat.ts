import { deepFreeze } from '../config'
import { getUntreatedOpenWoundCount } from '../condition'
import { getItemState } from '../item-state'
import { createCombatEncounterSnapshot } from './combat-snapshot'
import {
  getAvailableCombatPlayerActionsFromValidatedSnapshot,
  selectEnemyHealthPhase,
} from './combat-selectors'
import type { CombatDependencies, CombatEncounterSnapshot } from './combat-types'

export interface PlayerVisibleCombatSnapshot {
  readonly encounterId: string
  readonly nodeId: string
  readonly engagement: 'first-entry' | 'reentry'
  readonly status: CombatEncounterSnapshot['status']
  readonly player: Readonly<{
    currentHealth: number
    bleeding: boolean
    untreatedOpenWoundCount: number
    wounds: readonly Readonly<{
      kind: string
      treatment: 'untreated' | 'treated'
      count: number
    }>[]
    currentCtb: number
    nextActionCtb: number
  }>
  readonly enemy: Readonly<{
    healthPhase: ReturnType<typeof selectEnemyHealthPhase>
    nextActionCtb: number
    currentIntentId: string
  }>
  readonly legalActions: readonly string[]
  readonly equippedResources: Readonly<{
    weapon: Readonly<{ kind: string; current: number }> | null
    armor: Readonly<{ kind: string; current: number }> | null
    utility: Readonly<{ kind: string; current: number }> | null
  }>
}

export function createPlayerVisibleCombatSnapshot(
  snapshotInput: CombatEncounterSnapshot,
  identity: Readonly<{
    encounterId: string
    nodeId: string
    engagement: 'first-entry' | 'reentry'
  }>,
  dependencies: CombatDependencies,
): PlayerVisibleCombatSnapshot {
  const snapshot = createCombatEncounterSnapshot(snapshotInput, dependencies)
  const definition = dependencies.enemyCatalog.get(snapshot.enemy.definitionId)
  const currentAction = definition.actions.find(
    ({ id }) => id === snapshot.enemy.currentIntentActionId,
  )!
  const resource = (slot: 'weapon' | 'armor' | 'utility') => {
    const item = snapshot.equipment[slot]
    if (!item) return null
    const state = getItemState(snapshot.itemStates, item.instanceId)
    return state.resource.kind === 'none'
      ? null
      : { kind: state.resource.kind, current: state.resource.current }
  }
  const woundCounts = new Map<string, number>()
  for (const wound of snapshot.playerCondition.openWounds) {
    const key = `${wound.kind}|${wound.treatment}`
    woundCounts.set(key, (woundCounts.get(key) ?? 0) + 1)
  }
  const wounds = [...woundCounts.entries()]
    .map(([key, count]) => {
      const [kind, treatment] = key.split('|')
      return { kind, treatment: treatment as 'untreated' | 'treated', count }
    })
    .sort((left, right) => `${left.kind}|${left.treatment}`.localeCompare(`${right.kind}|${right.treatment}`))
  return deepFreeze({
    ...identity,
    status: snapshot.status,
    player: {
      currentHealth: snapshot.playerCondition.currentHealth,
      bleeding: snapshot.playerCondition.bleeding,
      untreatedOpenWoundCount: getUntreatedOpenWoundCount(snapshot.playerCondition),
      wounds,
      currentCtb: snapshot.currentCtb,
      nextActionCtb: snapshot.playerNextActionCtb,
    },
    enemy: {
      healthPhase: selectEnemyHealthPhase(
        snapshot.enemy.currentHealth,
        definition.maxHealth,
      ),
      nextActionCtb: snapshot.enemyNextActionCtb,
      currentIntentId: currentAction.id,
    },
    legalActions: getAvailableCombatPlayerActionsFromValidatedSnapshot(
      snapshot,
      dependencies,
    ),
    equippedResources: {
      weapon: resource('weapon'),
      armor: resource('armor'),
      utility: resource('utility'),
    },
  })
}
