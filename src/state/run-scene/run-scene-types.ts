import type {
  CombatPlayerActionCommand,
} from '../../core/combat'
import type {
  MainSearchResolution,
  MoveThroughSceneEdgeCommand,
  NodeItemPickupResolution,
  PerformSceneObstacleOptionCommand,
  PerformSceneTaskEventCommand,
  PerformMainSearchCommand,
  PickUpRevealedNodeItemCommand,
  SceneBatteryResolution,
  SceneCombatPlayerActionResolution,
  SceneInventoryCommand,
  SceneMedicalResolution,
  SceneMoveResolution,
  SceneObstacleResolution,
  SceneTaskEventResolution,
  UseSceneBatteryCommand,
  UseSceneMedicalItemCommand,
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
  | Readonly<{
      kind: 'scene-obstacle'
      command: PerformSceneObstacleOptionCommand
    }>
  | Readonly<{
      kind: 'scene-task-event'
      command: PerformSceneTaskEventCommand
    }>
  | Readonly<{
      kind: 'scene-medical'
      command: UseSceneMedicalItemCommand
    }>
  | Readonly<{
      kind: 'scene-battery'
      command: UseSceneBatteryCommand
    }>
  | Readonly<{
      kind: 'scene-combat-action'
      command: CombatPlayerActionCommand
    }>

export type StableRunSceneResult =
  | SceneMoveResolution
  | MainSearchResolution
  | NodeItemPickupResolution
  | ReturnType<typeof resolveSceneInventoryCommand>
  | RunSceneWithdrawalResolution
  | SceneObstacleResolution
  | SceneTaskEventResolution
  | SceneMedicalResolution
  | SceneBatteryResolution
  | SceneCombatPlayerActionResolution

export interface ExecuteStableRunSceneCommandInput {
  readonly currentPhase: StableRunPhase
  readonly command: unknown
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
}

export type StableRunSceneExecution =
  StableRunCommandExecution<StableRunSceneResult>
