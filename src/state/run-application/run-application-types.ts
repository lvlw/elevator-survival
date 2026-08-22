import type {
  StableRunHubCommand,
  StableRunHubExecution,
} from '../run-hub'
import type {
  StableRunLifecycleCommand,
  StableRunLifecycleExecution,
} from '../run-lifecycle'
import type {
  RunSaveRulesRegistry,
  RunSaveStorage,
  StableRunPhase,
} from '../run-save'
import type {
  StableRunSceneCommand,
  StableRunSceneExecution,
} from '../run-scene'

export type StableRunApplicationCommand =
  | Readonly<{
      kind: 'lifecycle'
      command: StableRunLifecycleCommand
    }>
  | Readonly<{
      kind: 'scene'
      command: StableRunSceneCommand
    }>
  | Readonly<{
      kind: 'hub'
      command: StableRunHubCommand
    }>

export interface ExecuteStableRunApplicationCommandInput {
  readonly currentPhase: StableRunPhase
  readonly command: unknown
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
}

export type StableRunApplicationExecution =
  | StableRunLifecycleExecution
  | StableRunSceneExecution
  | StableRunHubExecution
