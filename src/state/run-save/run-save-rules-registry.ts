import type { CurrentDayHubDependencies } from '../../core/current-day-hub'
import type { RunTerminationDependencies } from '../../core/run-termination'
import type { SceneLaunchDependencies } from '../../core/scene-launch'
import type { RunSuccessDependencies } from '../../core/run-success'
import { RunSaveError } from './run-save-errors'

export interface RunSaveRuleDependencies {
  readonly currentDayHub: CurrentDayHubDependencies
  readonly sceneLaunch: SceneLaunchDependencies
  readonly runTermination: RunTerminationDependencies
  readonly runSuccess: RunSuccessDependencies
}

export interface RunSaveRulesRegistry {
  has(rulesVersion: string): boolean
  get(rulesVersion: string): RunSaveRuleDependencies
  versions(): readonly string[]
}

export function createRunSaveRulesRegistry(
  entries: readonly Readonly<{
    rulesVersion: string
    dependencies: RunSaveRuleDependencies
  }>[],
): RunSaveRulesRegistry {
  const byVersion = new Map<string, RunSaveRuleDependencies>()
  for (const entry of entries) {
    if (
      typeof entry.rulesVersion !== 'string' || !entry.rulesVersion.trim() ||
      byVersion.has(entry.rulesVersion)
    ) {
      throw new RunSaveError('UNKNOWN_RULES_VERSION', '存档规则版本注册表无效')
    }
    const configuredVersion =
      entry.dependencies.currentDayHub.returnDependencies.scene.config.metadata.rulesVersion
    if (
      configuredVersion !== entry.rulesVersion ||
      entry.dependencies.sceneLaunch.currentDayHub !== entry.dependencies.currentDayHub ||
      entry.dependencies.runTermination.currentDayHub !== entry.dependencies.currentDayHub ||
      entry.dependencies.runTermination.sceneLaunch !== entry.dependencies.sceneLaunch ||
      entry.dependencies.runSuccess.config.metadata.rulesVersion !== entry.rulesVersion
    ) {
      throw new RunSaveError('UNKNOWN_RULES_VERSION', '存档规则依赖与注册版本不一致')
    }
    byVersion.set(entry.rulesVersion, Object.freeze(entry.dependencies))
  }
  const versions = Object.freeze([...byVersion.keys()].sort())
  return Object.freeze({
    has(rulesVersion: string) {
      return byVersion.has(rulesVersion)
    },
    get(rulesVersion: string) {
      const dependencies = byVersion.get(rulesVersion)
      if (!dependencies) {
        throw new RunSaveError('UNKNOWN_RULES_VERSION', `未知的存档规则版本：${rulesVersion}`)
      }
      return dependencies
    },
    versions() {
      return versions
    },
  })
}
