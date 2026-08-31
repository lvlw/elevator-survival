import {
  clearRunSave,
  RunSaveError,
  type RunSaveRulesRegistry,
  type RunSaveStorage,
} from '../state/run-save'
import {
  createStableRunStoreFromStorage,
  type StableRunStore,
} from '../state/run-store'

export type ProductionLoadError =
  | Readonly<{
      kind: 'load-error'
      category: 'corrupt-save'
      canClear: true
    }>
  | Readonly<{
      kind: 'load-error'
      category: 'incompatible-save'
      canClear: true
    }>
  | Readonly<{
      kind: 'load-error'
      category: 'storage-read-failed'
      canClear: false
    }>

export type ProductionRunBootstrapResult =
  | Readonly<{ kind: 'ready'; store: StableRunStore }>
  | Readonly<{ kind: 'no-run' }>
  | ProductionLoadError

export interface BootstrapProductionRunInput {
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
}

const noRunResult = Object.freeze({ kind: 'no-run' } as const)

function classifyLoadError(error: RunSaveError): ProductionLoadError {
  if (
    error.code === 'INVALID_JSON' ||
    error.code === 'INVALID_ENVELOPE' ||
    error.code === 'INVALID_STABLE_PHASE'
  ) {
    return Object.freeze({
      kind: 'load-error',
      category: 'corrupt-save',
      canClear: true,
    })
  }
  if (
    error.code === 'UNKNOWN_SAVE_FORMAT' ||
    error.code === 'UNKNOWN_RULES_VERSION'
  ) {
    return Object.freeze({
      kind: 'load-error',
      category: 'incompatible-save',
      canClear: true,
    })
  }
  if (error.code === 'STORAGE_READ_FAILED') {
    return Object.freeze({
      kind: 'load-error',
      category: 'storage-read-failed',
      canClear: false,
    })
  }
  throw error
}

/** Performs the one formal strict load used by the production composition root. */
export function bootstrapProductionRun(
  input: BootstrapProductionRunInput,
): ProductionRunBootstrapResult {
  try {
    const store = createStableRunStoreFromStorage(input)
    return store === null
      ? noRunResult
      : Object.freeze({ kind: 'ready', store })
  } catch (error) {
    if (error instanceof RunSaveError) return classifyLoadError(error)
    throw error
  }
}

export type ClearUnrecoverableRunSaveResult =
  | Readonly<{ kind: 'cleared' }>
  | Readonly<{ kind: 'clear-failed' }>

/** Application recovery operation; this is not a gameplay command. */
export function clearUnrecoverableRunSave(
  storage: RunSaveStorage,
): ClearUnrecoverableRunSaveResult {
  try {
    clearRunSave(storage)
    return Object.freeze({ kind: 'cleared' })
  } catch (error) {
    if (error instanceof RunSaveError && error.code === 'STORAGE_CLEAR_FAILED') {
      return Object.freeze({ kind: 'clear-failed' })
    }
    throw error
  }
}
