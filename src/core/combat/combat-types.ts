import type { FrozenRuleConfig } from '../config'
import type { OpenWoundSnapshot, PlayerConditionSnapshot } from '../condition'
import type { EquipmentProfileCatalog, EquipmentSnapshot } from '../equipment'
import type { BackpackSnapshot, ItemCatalog } from '../inventory'
import type { ItemResourceCatalog, ItemResourceKind, ItemStateCollectionSnapshot } from '../item-state'
import type { QuickSlotProfileCatalog, QuickSlotSnapshot } from '../quick-slot'
import type { ItemReturnLifecycleCatalog } from '../run-return'

export type CombatRiskTier = 'none' | 'low' | 'medium' | 'high' | 'very-high'
export type EnemyActionKind = 'scratch' | 'lunge-bite'

export interface PlayerVisibleEnemyIntentMetadata {
  readonly category: 'basic-attack' | 'special-attack'
  readonly relativeSpeed: 'normal' | 'slow'
  readonly directDamageSeverity: 'medium' | 'high'
  readonly mayCauseInjury: boolean
  readonly mayCauseInfectionExposure: boolean
  readonly mayCauseControl: boolean
}

export interface EnemyActionDefinition {
  readonly id: string
  readonly kind: EnemyActionKind
  readonly playerVisible: PlayerVisibleEnemyIntentMetadata
}

export interface EnemyDefinition {
  readonly id: string
  readonly maxHealth: number
  readonly tags: readonly string[]
  readonly weaknessTags: readonly string[]
  readonly actions: readonly EnemyActionDefinition[]
  readonly actionCycle: readonly string[]
  readonly initialIntentActionId: string
}

export interface EnemyDefinitionCatalog {
  readonly definitionIds: readonly string[]
  has(definitionId: string): boolean
  get(definitionId: string): EnemyDefinition
}

export interface EnemyPersistentCombatState {
  readonly enemyInstanceId: string
  readonly definitionId: string
  readonly currentHealth: number
  readonly currentIntentActionId: string
  readonly nextCycleIndex: number
  readonly resolvedActionCount: number
  readonly hasBeenEncountered: boolean
  readonly defeated: boolean
}

export interface ExplorationCombatUsageSnapshot {
  readonly metalPipeChargedStrikeUses: number
}

export interface TemporaryDefenseSnapshot {
  readonly activatedAtCtb: number
  readonly expiresAtPlayerActionCtb: number
  readonly availableDirectAttackUses: 1
}

export type CombatStatus = 'awaiting-player' | 'victory' | 'escaped' | 'defeat'

export interface CombatEncounterSnapshot {
  readonly status: CombatStatus
  readonly currentCtb: number
  readonly playerNextActionCtb: number
  readonly enemyNextActionCtb: number
  readonly playerCondition: PlayerConditionSnapshot
  readonly backpack: BackpackSnapshot
  readonly equipment: EquipmentSnapshot
  readonly quickSlots: QuickSlotSnapshot
  readonly itemStates: ItemStateCollectionSnapshot
  readonly enemy: EnemyPersistentCombatState
  readonly usage: ExplorationCombatUsageSnapshot
  readonly temporaryDefense: TemporaryDefenseSnapshot | null
}

export type CombatPlayerActionCommand =
  | Readonly<{ kind: 'metal-pipe-basic-attack' }>
  | Readonly<{ kind: 'metal-pipe-charged-strike' }>
  | Readonly<{ kind: 'defend' }>
  | Readonly<{ kind: 'temporary-attack' }>
  | Readonly<{ kind: 'escape' }>
  | Readonly<{
      kind: 'use-quick-slot-item'
      quickSlotIndex: number
      targetOpenWoundId?: string
    }>

export interface CombatContentBindings {
  readonly enemyDefinitionId: string
  readonly metalPipeDefinitionId: string
  readonly heavyCoatDefinitionId: string
  readonly bandageDefinitionId: string
  readonly painkillerDefinitionId: string
}

export interface CombatDependencies {
  readonly runSeed: string
  readonly sceneInstanceId: string
  readonly config: FrozenRuleConfig
  readonly physicalCatalog: ItemCatalog
  readonly equipmentCatalog: EquipmentProfileCatalog
  readonly quickSlotCatalog: QuickSlotProfileCatalog
  readonly itemResourceCatalog: ItemResourceCatalog
  readonly lifecycleCatalog: ItemReturnLifecycleCatalog
  readonly enemyCatalog: EnemyDefinitionCatalog
  readonly bindings: CombatContentBindings
}

export interface CombatRiskTrace {
  readonly algorithmVersion: string
  readonly streamId: string
  readonly drawIndex: number
  readonly roll: number
  readonly originalTier: CombatRiskTier
  readonly finalTier: CombatRiskTier
  readonly riskPercent: number
  readonly succeeded: boolean
  readonly usedHeavyCoat: boolean
  readonly usedDefense: boolean
}

export type CombatEffect =
  | Readonly<{
      kind: 'combat-quick-slot-item-consumed'
      source: 'combat-bandage' | 'combat-painkiller'
      quickSlotIndex: number
      instanceId: string
      definitionId: string
      quantityBefore: 1
      quantityConsumed: 1
      quantityAfter: 0
    }>
  | Readonly<{
      kind: 'player-health-restored'
      source: 'combat-bandage'
      healthBefore: number
      requestedRecovery: number
      actualRecovery: number
      healthAfter: number
      unusedRecovery: number
    }>
  | Readonly<{
      kind: 'open-wound-treated'
      source: 'combat-bandage'
      woundId: string
      woundKind: OpenWoundSnapshot['kind']
      treatmentBefore: 'untreated'
      treatmentAfter: 'treated'
    }>
  | Readonly<{
      kind: 'painkiller-changed'
      source: 'combat-painkiller'
      before: false
      after: true
    }>
  | Readonly<{
      kind: 'combat-escape-preparation-locked'
      startedAtCtb: number
      loadTier: 'normal' | 'loaded' | 'overloaded'
      backpackWeight: number
      baseCtb: number
      untreatedOpenWoundCount: number
      rawWoundCtb: number
      painkillerReductionApplied: number
      finalWoundCtb: number
      preparationCtb: number
      completesAtCtb: number
    }>
  | Readonly<{
      kind: 'combat-escape-completed'
      startedAtCtb: number
      completesAtCtb: number
      preparationCtb: number
    }>
  | Readonly<{
      kind: 'item-resource-consumed'
      source: string
      slot: 'weapon' | 'armor'
      instanceId: string
      definitionId: string
      resourceKind: ItemResourceKind
      currentBefore: number
      requestedCost: number
      consumed: number
      currentAfter: number
      depleted: boolean
    }>
  | Readonly<{
      kind: 'enemy-health-lost'
      source: CombatPlayerActionCommand['kind']
      healthBefore: number
      requestedLoss: number
      actualLoss: number
      healthAfter: number
    }>
  | Readonly<{
      kind: 'enemy-action-delayed'
      enemyNextActionCtbBefore: number
      delay: number
      enemyNextActionCtbAfter: number
    }>
  | Readonly<{
      kind: 'combat-usage-changed'
      usage: 'metal-pipe-charged-strike'
      before: number
      after: number
    }>
  | Readonly<{
      kind: 'temporary-defense-activated'
      before: TemporaryDefenseSnapshot | null
      after: TemporaryDefenseSnapshot
    }>
  | Readonly<{
      kind: 'temporary-defense-consumed'
      before: TemporaryDefenseSnapshot
      after: null
      enemyActionId: string
    }>
  | Readonly<{
      kind: 'temporary-defense-expired'
      before: TemporaryDefenseSnapshot
      after: null
    }>
  | Readonly<{
      kind: 'player-health-lost'
      source: 'post-player-action-bleeding' | string
      healthBefore: number
      requestedLoss: number
      actualLoss: number
      healthAfter: number
    }>
  | Readonly<{
      kind: 'combat-risk-resolved'
      purpose: 'injury' | 'infection-exposure'
    } & CombatRiskTrace>
  | Readonly<{ kind: 'open-wound-added'; wound: OpenWoundSnapshot }>
  | Readonly<{
      kind: 'bleeding-changed'
      before: boolean
      after: boolean
      source: string
    }>
  | Readonly<{
      kind: 'infection-exposure-added'
      before: number
      added: 1
      after: number
    }>
  | Readonly<{
      kind: 'enemy-intent-changed'
      intentBefore: string
      intentAfter: string
      nextCycleIndexBefore: number
      nextCycleIndexAfter: number
      resolvedActionCountBefore: number
      resolvedActionCountAfter: number
    }>
  | Readonly<{
      kind: 'combat-ctb-position-changed'
      reason:
        | 'player-action-scheduled'
        | 'enemy-action-resolved'
        | 'enemy-action-terminal'
        | 'player-decision-point'
        | 'escape-preparation-scheduled'
        | 'escape-completed'
      currentCtbBefore: number
      currentCtbAfter: number
      playerNextActionCtbBefore: number
      playerNextActionCtbAfter: number
      enemyNextActionCtbBefore: number
      enemyNextActionCtbAfter: number
    }>
  | Readonly<{
      kind: 'combat-status-changed'
      from: CombatStatus
      to: 'victory' | 'escaped' | 'defeat'
      reason: 'enemy-defeated' | 'escape-completed' | 'player-death'
    }>

export interface CombatTransitionPlan {
  readonly command: CombatPlayerActionCommand
  readonly effects: readonly CombatEffect[]
}

export type CombatPreview =
  | Readonly<{ canExecute: true; plan: CombatTransitionPlan; snapshot: CombatEncounterSnapshot }>
  | Readonly<{ canExecute: false; errorCode: CombatErrorCode }>

export interface CombatResolution {
  readonly plan: CombatTransitionPlan
  readonly snapshot: CombatEncounterSnapshot
}

export type CombatPlayerActionPrimaryPlan =
  | Readonly<{
      kind: 'attack'
      actionCtb: number
      requestedDamage: number
      weaponDurabilityBefore: number | null
      weaponDurabilityAfter: number | null
      weaponDurabilityRequestedCost: number
      weaponDurabilityConsumed: number
      weaponDurabilityDepleted: boolean
      enemyActionDelay: number
    }>
  | Readonly<{
      kind: 'defend'
      actionCtb: number
      availableDirectAttackUses: 1
      expiresAtPlayerActionCtb: number
      doesNotPreventInfectionExposure: true
    }>
  | Readonly<{
      kind: 'quick-slot-item'
      actionCtb: number
      quickSlotIndex: number
      itemKind: 'bandage' | 'painkiller'
      healthBeforeRecovery: number
      requestedHealthRecovery: number
      actualHealthRecovery: number
      healthAfterRecovery: number
      unusedHealthRecovery: number
      stopsBleeding: boolean
      treatsOpenWound: boolean
      targetWound: Readonly<{
        kind: OpenWoundSnapshot['kind']
        ordinal: number
      }> | null
      activatesPainkiller: boolean
    }>
  | Readonly<{
      kind: 'escape'
      actionCtb: number
      loadTier: 'normal' | 'loaded' | 'overloaded'
      backpackWeight: number
      baseCtb: number
      untreatedOpenWoundCount: number
      rawWoundCtb: number
      painkillerReductionApplied: number
      finalWoundCtb: number
      completesAtCtb: number
    }>

export type PlayerVisibleCombatActionPrimaryMetadata = CombatPlayerActionPrimaryPlan

export interface PlayerVisibleCombatActionPreview {
  readonly primary: PlayerVisibleCombatActionPrimaryMetadata
  readonly currentIntent: Readonly<{
    readonly metadata: PlayerVisibleEnemyIntentMetadata
    readonly actsBeforeNextPlayerDecision: boolean
  }>
  readonly postPlayerActionBleedingDamage: number
  readonly playerHealthAfterOwnAction: number
  readonly escapeConsequences: Readonly<{
    enemyActionsBeforeCompletion: number
    postPlayerActionBleedingDamageMin: number
    postPlayerActionBleedingDamageMax: number
    playerHealthAfterCompletionMin: number
    playerHealthAfterCompletionMax: number
    bleedingAtCompletionPossible: boolean
    bleedingAtCompletionGuaranteed: boolean
    playerHealthBeforeCompletionBleeding: number
    nonBleedingCompletionHealth: number | null
    bleedingCompletionHealth: number | null
    deathBeforeCompletion: boolean
    survivalAtCompletionPossible: boolean
    deathPossibleBeforeForcedReturn: boolean
  }> | null
}

export interface PlayerVisibleCombatActionOption {
  /** Internal formal command; presentation projections must not serialize it. */
  readonly command: CombatPlayerActionCommand
  readonly preview: PlayerVisibleCombatActionPreview
}

export type CombatErrorCode =
  | 'INVALID_ENEMY_DEFINITION'
  | 'DUPLICATE_ENEMY_DEFINITION'
  | 'UNKNOWN_ENEMY_DEFINITION'
  | 'INVALID_ENEMY_STATE'
  | 'INVALID_COMBAT_SNAPSHOT'
  | 'INVALID_COMBAT_DEPENDENCIES'
  | 'COMBAT_CONTENT_BINDING_MISMATCH'
  | 'INVALID_COMBAT_COMMAND'
  | 'COMBAT_NOT_ACTIVE'
  | 'ACTION_NOT_AVAILABLE'
  | 'CANNOT_ESCAPE_WHILE_UNCARRYABLE'
  | 'INVALID_COMBAT_EFFECTS'
