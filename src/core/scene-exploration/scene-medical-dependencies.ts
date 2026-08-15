import {
  MedicalContentError,
  validateMedicalContentBindings,
} from '../medical'
import { SceneExplorationError } from './scene-exploration-errors'
import type {
  SceneMedicalCommandDependencies,
  SceneMedicalContentBindings,
} from './scene-exploration-types'

export function validateSceneMedicalDependencies(
  dependencies: SceneMedicalCommandDependencies,
): void {
  const bindings: SceneMedicalContentBindings | undefined = dependencies.medicalBindings
  try {
    validateMedicalContentBindings(bindings, {
      physicalCatalog: dependencies.physicalCatalog,
      itemResourceCatalog: dependencies.itemResourceCatalog,
      lifecycleCatalog: dependencies.lifecycleCatalog,
    })
  } catch (error) {
    if (error instanceof MedicalContentError) {
      throw new SceneExplorationError('INVALID_SCENE_MEDICAL_BINDINGS', error.message)
    }
    throw error
  }
}
