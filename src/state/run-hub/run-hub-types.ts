import type {
  HubSurvivalCommand,
  resolveCurrentDayHubLoadoutCommand,
  resolveCurrentDayHubMedicalCommand,
  resolveHubSurvivalCommand,
} from '../../core/current-day-hub'
import type {
  HubMaintenanceCommand,
  resolveHubMaintenanceCommand,
} from '../../core/hub-maintenance'
import type { UseRunHubMedicalItemCommand } from '../../core/run-hub-medical'
import type { RunLoadoutCommand } from '../../core/run-loadout'
import type { StableRunCommandExecution } from '../command-execution'
import type {
  RunSaveRulesRegistry,
  RunSaveStorage,
  StableRunPhase,
} from '../run-save'

export type StableRunHubCommand =
  | Readonly<{ kind: 'hub-loadout'; command: RunLoadoutCommand }>
  | Readonly<{ kind: 'hub-medical'; command: UseRunHubMedicalItemCommand }>
  | Readonly<{ kind: 'hub-survival'; command: HubSurvivalCommand }>
  | Readonly<{ kind: 'hub-maintenance'; command: HubMaintenanceCommand }>

export type StableRunHubResult =
  | ReturnType<typeof resolveCurrentDayHubLoadoutCommand>
  | ReturnType<typeof resolveCurrentDayHubMedicalCommand>
  | ReturnType<typeof resolveHubSurvivalCommand>
  | ReturnType<typeof resolveHubMaintenanceCommand>

export interface ExecuteStableRunHubCommandInput {
  readonly currentPhase: StableRunPhase
  readonly command: unknown
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
}

export type StableRunHubExecution =
  StableRunCommandExecution<StableRunHubResult>
