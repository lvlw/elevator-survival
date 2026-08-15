import type { CurrentDayHubDependencies } from '../current-day-hub'
import type { DailySettlementTerminalSnapshot } from '../daily-settlement'
import type {
  RunSceneLifecycleContextSnapshot,
  RunSceneSessionSnapshot,
  SceneLaunchDependencies,
} from '../scene-launch'

export type RunFailureReason = 'health-depleted' | 'world-threat-terminal'

export type RunSceneTerminationContextSnapshot = RunSceneLifecycleContextSnapshot

export interface SceneDefeatRunFailureSource {
  readonly kind: 'scene-defeat'
  readonly terminalScene: RunSceneSessionSnapshot['scene']
  readonly context: RunSceneSessionSnapshot['context']
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
  readonly sceneLaunch: SceneLaunchDependencies
}
