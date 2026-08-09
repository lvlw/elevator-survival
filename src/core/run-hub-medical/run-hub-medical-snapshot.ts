import { deepFreeze } from '../config'
import { createPlayerCondition } from '../condition'
import { createDailyMedicalUsageSnapshot } from '../daily-state'
import {
  MedicalContentError,
  validateMedicalContentBindings,
} from '../medical'
import { createRunLoadoutSnapshot } from '../run-loadout'
import { RunHubMedicalError } from './run-hub-medical-errors'
import type {
  RunHubMedicalDependencies,
  RunHubMedicalSnapshot,
} from './run-hub-medical-types'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

export function validateRunHubMedicalDependencies(
  dependencies: RunHubMedicalDependencies,
): void {
  try {
    validateMedicalContentBindings(dependencies.medicalBindings, {
      physicalCatalog: dependencies.runLoadout.physicalCatalog,
      itemResourceCatalog: dependencies.runLoadout.itemResourceCatalog,
      lifecycleCatalog: dependencies.runLoadout.lifecycleCatalog,
    })
  } catch (error) {
    if (error instanceof MedicalContentError) {
      throw new RunHubMedicalError('INVALID_INPUT', error.message)
    }
    throw error
  }
  const hubTimes = [
    dependencies.config.medical.bandage.hubSceneTime,
    dependencies.config.medical.painkiller.hubSceneTime,
    dependencies.config.medical.disinfectant.hubSceneTime,
    dependencies.config.medical.firstAidKit.hubSceneTime,
  ]
  if (hubTimes.some((value) => value !== 0)) {
    throw new RunHubMedicalError('INVALID_INPUT', '当前版本规则不允许中枢医疗消耗场景时间')
  }
}

export function createRunHubMedicalSnapshot(
  input: RunHubMedicalSnapshot,
  dependencies: RunHubMedicalDependencies,
): RunHubMedicalSnapshot {
  validateRunHubMedicalDependencies(dependencies)
  if (!exact(input, ['dailyMedicalUsage', 'playerCondition', 'runLoadout'])) {
    throw new RunHubMedicalError('INVALID_INPUT', '中枢医疗快照结构无效')
  }
  try {
    return deepFreeze({
      runLoadout: createRunLoadoutSnapshot(input.runLoadout, dependencies.runLoadout),
      playerCondition: createPlayerCondition(
        input.playerCondition,
        dependencies.config.combat.player,
      ),
      dailyMedicalUsage: createDailyMedicalUsageSnapshot(
        input.dailyMedicalUsage,
        dependencies.config,
      ),
    })
  } catch (error) {
    throw new RunHubMedicalError(
      'INVALID_INPUT',
      error instanceof Error ? error.message : '中枢医疗快照无效',
    )
  }
}
