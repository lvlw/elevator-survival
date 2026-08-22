import type { DailySettlementResult, EndDayCommand } from '../../core/daily-settlement'
import type { RunFailureResult } from '../../core/run-termination'
import type {
  LaunchMainSceneCommand,
  RunSceneReturnResolution,
  SceneLaunchTransitionPlan,
} from '../../core/scene-launch'
import type { StableRunCommandExecution } from '../command-execution'
import type {
  RunSaveRulesRegistry,
  RunSaveStorage,
  StableRunPhase,
} from '../run-save'

export type SettleTerminalSceneCommand = Readonly<{
  kind: 'settle-terminal-scene'
}>

export type StableRunLifecycleCommand =
  | LaunchMainSceneCommand
  | EndDayCommand
  | SettleTerminalSceneCommand

/**
 * A transient formal resolver result for presentation and audit. The only
 * owner of the next lifecycle state is StableRunCommandExecution.phase.
 */
export type StableRunLifecycleResult =
  | SceneLaunchTransitionPlan
  | RunSceneReturnResolution
  | DailySettlementResult
  | RunFailureResult

export interface ExecuteStableRunLifecycleCommandInput {
  readonly currentPhase: StableRunPhase
  readonly command: unknown
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
}

export type StableRunLifecycleExecution =
  StableRunCommandExecution<StableRunLifecycleResult>
