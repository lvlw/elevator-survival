import type { CurrentDayHubDependencies } from '../current-day-hub'
import type { DailySettlementTerminalSnapshot } from '../daily-settlement'
import type { DailyThreatSuppressionSnapshot } from '../daily-state'
import type { RunReturnCarryForwardSnapshot } from '../run-return'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
} from '../scene-exploration'
import type { SatietySnapshot } from '../satiety'
import type { WorldThreatSnapshot } from '../world-threat'

export type RunFailureReason = 'health-depleted' | 'world-threat-terminal'

export interface RunSceneTerminationContextSnapshot {
  readonly runReturnCarryForward: RunReturnCarryForwardSnapshot
  readonly worldThreat: WorldThreatSnapshot
  readonly satiety: SatietySnapshot
  readonly threatSuppression: DailyThreatSuppressionSnapshot
  readonly maintenanceLaborRemaining: number
}

export interface SceneDefeatRunFailureSource {
  readonly kind: 'scene-defeat'
  readonly terminalScene: SceneExplorationSnapshot
  readonly context: RunSceneTerminationContextSnapshot
}

export interface DailySettlementRunFailureSource {
  readonly kind: 'daily-settlement-terminal'
  readonly terminalSnapshot: DailySettlementTerminalSnapshot
}

export type RunFailureSource =
  | SceneDefeatRunFailureSource
  | DailySettlementRunFailureSource

export interface RunFailureSnapshot {
  readonly kind: 'run-failure'
  readonly reason: RunFailureReason
  readonly source: RunFailureSource
}

export interface RunFailureSummary {
  readonly kind: 'run-failure-summary'
  readonly status: 'failed'
  readonly reason: RunFailureReason
  readonly sourceKind: RunFailureSource['kind']
  readonly runId: string
  readonly currentDay: number
}

export type RunFailureEffect =
  | Readonly<{
      kind: 'run-failure-source-accepted'
      sourceKind: RunFailureSource['kind']
      runId: string
      seed: string
      rulesVersion: string
      currentDay: number
      sceneInstanceId: string
    }>
  | Readonly<{
      kind: 'run-failure-reason-determined'
      reason: RunFailureReason
    }>
  | Readonly<{
      kind: 'run-failure-committed'
      snapshot: RunFailureSnapshot
      summary: RunFailureSummary
    }>

export interface RunFailureTransitionPlan {
  readonly effects: readonly RunFailureEffect[]
  readonly snapshot: RunFailureSnapshot
  readonly summary: RunFailureSummary
}

export interface RunFailureResult extends RunFailureTransitionPlan {}

export interface RunTerminationDependencies {
  readonly currentDayHub: CurrentDayHubDependencies
  readonly scene: SceneExplorationDependencies
}
