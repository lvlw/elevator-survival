import type {
  MainSearchResolution,
  MoveThroughSceneEdgeCommand,
  NodeItemPickupResolution,
  PerformMainSearchCommand,
  PickUpRevealedNodeItemCommand,
  SceneInventoryCommand,
  SceneMoveResolution,
  WithdrawFromSceneCommand,
  resolveSceneInventoryCommand,
} from '../../core/scene-exploration'
import type { RunSceneWithdrawalResolution } from '../../core/scene-launch'
import type { StableRunCommandExecution } from '../command-execution'
import type {
  RunSaveRulesRegistry,
  RunSaveStorage,
  StableRunPhase,
} from '../run-save'

export type StableRunSceneCommand =
  | Readonly<{
      kind: 'scene-move'
      command: MoveThroughSceneEdgeCommand
    }>
  | Readonly<{
      kind: 'scene-main-search'
      command: PerformMainSearchCommand
    }>
  | Readonly<{
      kind: 'scene-node-item-pickup'
      command: PickUpRevealedNodeItemCommand
    }>
  | Readonly<{
      kind: 'scene-inventory'
      command: SceneInventoryCommand
    }>
  | Readonly<{
      kind: 'scene-withdraw'
      command: WithdrawFromSceneCommand
    }>

export type StableRunSceneResult =
  | SceneMoveResolution
  | MainSearchResolution
  | NodeItemPickupResolution
  | ReturnType<typeof resolveSceneInventoryCommand>
  | RunSceneWithdrawalResolution

export interface ExecuteStableRunSceneCommandInput {
  readonly currentPhase: StableRunPhase
  readonly command: unknown
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
}

export type StableRunSceneExecution =
  StableRunCommandExecution<StableRunSceneResult>
