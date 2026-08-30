import type { FrozenRuleConfig } from '../config'
import type { PlayerConditionSnapshot } from '../condition'
import type { DailyMedicalUsageSnapshot } from '../daily-state'
import type { HubItemSource } from '../hub-inventory'
import type {
  MedicalContentBindings,
  MedicalItemKind,
  MedicalPrimaryEffect,
  MedicalTarget,
} from '../medical'
import type {
  RunLoadoutDependencies,
  RunLoadoutSnapshot,
} from '../run-loadout'
import type { RunHubMedicalErrorCode } from './run-hub-medical-errors'

export interface RunHubMedicalDependencies {
  readonly runLoadout: RunLoadoutDependencies
  readonly config: Pick<FrozenRuleConfig, 'combat' | 'medical'>
  readonly medicalBindings: MedicalContentBindings
}

export interface RunHubMedicalSnapshot {
  readonly runLoadout: RunLoadoutSnapshot
  readonly playerCondition: PlayerConditionSnapshot
  readonly dailyMedicalUsage: DailyMedicalUsageSnapshot
}

export type RunHubMedicalItemSource = HubItemSource

export interface UseRunHubMedicalItemCommand {
  readonly kind: 'use-run-hub-medical-item'
  readonly source: RunHubMedicalItemSource
  readonly target?: MedicalTarget
}

export interface ResolvedRunHubMedicalSource {
  readonly source: RunHubMedicalItemSource
  readonly sourceContainer: RunHubMedicalItemSource['container']
  readonly sourceSlotIndex: number | null
  readonly item: Readonly<{
    instanceId: string
    definitionId: string
    quantity: number
  }>
  readonly medicalItem: MedicalItemKind
}

export type RunHubMedicalEffect =
  | Readonly<{
      kind: 'run-hub-medical-item-consumed'
      source: RunHubMedicalItemSource
      sourceContainer: RunHubMedicalItemSource['container']
      sourceSlotIndex: number | null
      medicalItem: MedicalItemKind
      instanceId: string
      definitionId: string
      quantityBefore: number
      quantityConsumed: 1
      quantityAfter: number
    }>
  | Readonly<{
      kind: 'run-hub-medical-primary-effect-applied'
      effect: MedicalPrimaryEffect
    }>
  | Readonly<{
      kind: 'run-hub-medical-zero-time-confirmed'
      medicalItem: MedicalItemKind
      hubSceneTime: 0
    }>
  | Readonly<{
      kind: 'run-hub-medical-state-committed'
      snapshot: RunHubMedicalSnapshot
    }>

export interface RunHubMedicalTransitionPlan {
  readonly command: UseRunHubMedicalItemCommand
  readonly metadata: Readonly<{
    medicalItem: MedicalItemKind
    sourceContainer: RunHubMedicalItemSource['container']
    sourceInstanceId: string
    hubSceneTime: 0
  }>
  readonly effects: readonly RunHubMedicalEffect[]
  readonly snapshot: RunHubMedicalSnapshot
}

export interface RunHubMedicalResolution {
  readonly effects: readonly RunHubMedicalEffect[]
  readonly snapshot: RunHubMedicalSnapshot
}

export type RunHubMedicalEvaluation =
  | Readonly<{
      canExecute: true
      result: RunHubMedicalTransitionPlan
    }>
  | Readonly<{
      canExecute: false
      rejectionCode: RunHubMedicalErrorCode
      rejectionMessage: string
    }>
