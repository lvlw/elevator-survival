import { SceneExplorationError } from './scene-exploration-errors'
import type {
  SceneMedicalCommandDependencies,
  SceneMedicalContentBindings,
} from './scene-exploration-types'

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

export function validateSceneMedicalDependencies(
  dependencies: SceneMedicalCommandDependencies,
): void {
  const bindings: SceneMedicalContentBindings | undefined = dependencies.medicalBindings
  const keys = [
    'bandageDefinitionId',
    'disinfectantDefinitionId',
    'firstAidKitDefinitionId',
    'painkillerDefinitionId',
  ] as const
  if (!hasExactKeys(bindings, keys)) {
    throw new SceneExplorationError('INVALID_SCENE_MEDICAL_BINDINGS', '探索医疗内容绑定结构无效')
  }
  const ids = keys.map((key) => bindings[key])
  if (
    ids.some((id) => typeof id !== 'string' || id.trim().length === 0) ||
    new Set(ids).size !== ids.length
  ) {
    throw new SceneExplorationError('INVALID_SCENE_MEDICAL_BINDINGS', '探索医疗内容绑定无效或重复')
  }
  for (const definitionId of ids) {
    if (!dependencies.physicalCatalog.has(definitionId) || !dependencies.itemResourceCatalog.has(definitionId)) {
      throw new SceneExplorationError('INVALID_SCENE_MEDICAL_BINDINGS', `探索医疗绑定物品不存在：${definitionId}`)
    }
    if (dependencies.itemResourceCatalog.get(definitionId).kind !== 'none') {
      throw new SceneExplorationError('INVALID_SCENE_MEDICAL_BINDINGS', `探索医疗绑定物品必须使用单位资源：${definitionId}`)
    }
  }
}
