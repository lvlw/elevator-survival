import { deepFreeze } from '../config'
import {
  getUntreatedOpenWoundCount,
  type OpenWoundKind,
} from '../condition'
import { getItemState } from '../item-state'
import { createCombatEncounterSnapshot } from './combat-snapshot'
import {
  getAvailableCombatPlayerCommandsFromValidatedSnapshot,
  selectEnemyHealthPhase,
} from './combat-selectors'
import type {
  CombatDependencies,
  CombatEncounterSnapshot,
  CombatPlayerActionCommand,
} from './combat-types'

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
      id: string
      kind: OpenWoundKind
      treatment: 'untreated' | 'treated'
    }>[]
    currentCtb: number
    nextActionCtb: number
  }>
  readonly enemy: Readonly<{
    healthPhase: ReturnType<typeof selectEnemyHealthPhase>
    nextActionCtb: number
    currentIntentId: string
  }>
  readonly legalCommands: readonly CombatPlayerActionCommand[]
  readonly legalActions: readonly CombatPlayerActionCommand['kind'][]
  readonly quickSlots: readonly Readonly<{
    slotIndex: number
    empty: boolean
    definitionId: string | null
    canUseInCombat: boolean
    legalCommands: readonly Extract<
      CombatPlayerActionCommand,
      { kind: 'use-quick-slot-item' }
    >[]
  }>[]
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
  const wounds = snapshot.playerCondition.openWounds
    .map(({ id, kind, treatment }) => ({ id, kind, treatment }))
    .sort((left, right) => left.id.localeCompare(right.id))
  const legalCommands = getAvailableCombatPlayerCommandsFromValidatedSnapshot(
    snapshot,
    dependencies,
  )
  const legalActions = [...new Set(legalCommands.map(({ kind }) => kind))].sort()
  const quickSlots = snapshot.quickSlots.slots.map((item, slotIndex) => {
    const slotCommands = legalCommands.filter(
      (command): command is Extract<
        CombatPlayerActionCommand,
        { kind: 'use-quick-slot-item' }
      > => command.kind === 'use-quick-slot-item' && command.quickSlotIndex === slotIndex,
    )
    return {
      slotIndex,
      empty: item === null,
      definitionId: item?.definitionId ?? null,
      canUseInCombat: slotCommands.length > 0,
      legalCommands: slotCommands,
    }
  })
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
    legalCommands,
    legalActions,
    quickSlots,
    equippedResources: {
      weapon: resource('weapon'),
      armor: resource('armor'),
      utility: resource('utility'),
    },
  })
}
