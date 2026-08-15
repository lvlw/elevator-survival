import { restoreRunSceneLifecycleContext } from '../scene-launch'
import type {
  RunSceneTerminationContextSnapshot,
  RunTerminationDependencies,
} from './run-termination-types'

/**
 * Compatibility name for restoring the shared Run-owned Scene lifecycle
 * context. Context projection and scene binding are owned exclusively by
 * Scene Launch; termination cannot reconstruct provenance from an old Hub.
 */
export function restoreRunSceneTerminationContext(
  input: unknown,
  dependencies: RunTerminationDependencies,
): RunSceneTerminationContextSnapshot {
  return restoreRunSceneLifecycleContext(input, dependencies.sceneLaunch)
}
