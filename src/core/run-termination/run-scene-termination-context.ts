import { deepFreeze } from '../config'
import {
  createCurrentDayHubSnapshot,
  projectRunReturnCarryForwardFromCurrentDayHub,
  type CurrentDayHubSnapshot,
} from '../current-day-hub'
import { createDailyThreatSuppressionSnapshot } from '../daily-state'
import {
  bindRunReturnCarryForwardToScene,
  restoreRunReturnCarryForwardSnapshot,
} from '../run-return'
import { createSatietySnapshot } from '../satiety'
import {
  createWorldThreatSnapshot,
  getWorldThreatStage,
} from '../world-threat'
import { RunTerminationError } from './run-termination-errors'
import type {
  RunSceneTerminationContextSnapshot,
  RunTerminationDependencies,
} from './run-termination-types'

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!plain(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

function invalid(message: string): never {
  throw new RunTerminationError('INVALID_INPUT', message)
}

function configOf(dependencies: RunTerminationDependencies) {
  return dependencies.currentDayHub.returnDependencies.scene.config
}

function validateSceneRuleBinding(dependencies: RunTerminationDependencies): void {
  if (
    dependencies.scene.config.metadata.rulesVersion !==
    configOf(dependencies).metadata.rulesVersion
  ) {
    invalid('终止协调器的场景依赖与Run规则版本不一致')
  }
}

export function restoreRunSceneTerminationContext(
  input: unknown,
  dependencies: RunTerminationDependencies,
): RunSceneTerminationContextSnapshot {
  validateSceneRuleBinding(dependencies)
  if (!exact(input, [
    'maintenanceLaborRemaining',
    'runReturnCarryForward',
    'satiety',
    'threatSuppression',
    'worldThreat',
  ])) {
    invalid('场景终止Run上下文结构无效')
  }
  const config = configOf(dependencies)
  try {
    const runReturnCarryForward = restoreRunReturnCarryForwardSnapshot(
      input.runReturnCarryForward,
      dependencies.currentDayHub.returnDependencies,
    )
    const worldThreat = createWorldThreatSnapshot(
      input.worldThreat,
      dependencies.currentDayHub.worldThreatCatalog,
    )
    if (
      worldThreat.definitionId !== config.worldThreat.definitionId ||
      getWorldThreatStage(
        worldThreat,
        dependencies.currentDayHub.worldThreatCatalog,
      ).terminal
    ) {
      invalid('场景终止上下文必须来自非终末威胁的活动Run')
    }
    const threatSuppression = createDailyThreatSuppressionSnapshot(
      input.threatSuppression,
      config,
    )
    if (
      !Number.isSafeInteger(input.maintenanceLaborRemaining) ||
      (input.maintenanceLaborRemaining as number) < 0 ||
      (input.maintenanceLaborRemaining as number) >
        config.maintenance.dailyBaseLabor.points
    ) {
      invalid('场景终止上下文的维护工时无效')
    }
    return deepFreeze({
      runReturnCarryForward,
      worldThreat,
      satiety: createSatietySnapshot(input.satiety, config),
      threatSuppression,
      maintenanceLaborRemaining: input.maintenanceLaborRemaining as number,
    })
  } catch (error) {
    if (error instanceof RunTerminationError) throw error
    invalid(error instanceof Error ? error.message : '场景终止Run上下文无效')
  }
}

export function projectRunSceneTerminationContextFromCurrentDayHub(
  snapshotInput: CurrentDayHubSnapshot,
  dependencies: RunTerminationDependencies,
): RunSceneTerminationContextSnapshot {
  const snapshot = createCurrentDayHubSnapshot(
    snapshotInput,
    dependencies.currentDayHub,
  )
  return restoreRunSceneTerminationContext({
    runReturnCarryForward: projectRunReturnCarryForwardFromCurrentDayHub(
      snapshot,
      dependencies.currentDayHub,
    ),
    worldThreat: snapshot.worldThreat,
    satiety: snapshot.satiety,
    threatSuppression: snapshot.dailyState.threatSuppression,
    maintenanceLaborRemaining: snapshot.dailyState.maintenanceLaborRemaining,
  }, dependencies)
}

export function bindRunSceneTerminationContextToScene(
  input: RunSceneTerminationContextSnapshot,
  sceneInstanceId: unknown,
  dependencies: RunTerminationDependencies,
): RunSceneTerminationContextSnapshot {
  const context = restoreRunSceneTerminationContext(input, dependencies)
  return restoreRunSceneTerminationContext({
    ...context,
    runReturnCarryForward: bindRunReturnCarryForwardToScene(
      context.runReturnCarryForward,
      sceneInstanceId,
      dependencies.currentDayHub.returnDependencies,
    ),
  }, dependencies)
}
