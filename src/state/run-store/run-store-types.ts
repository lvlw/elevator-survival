import type { StableRunApplicationExecution } from '../run-application'
import type {
  RunSaveRulesRegistry,
  RunSaveStorage,
  StableRunPhase,
} from '../run-save'

export interface StableRunStoreSnapshot {
  readonly phase: StableRunPhase
}

export type StableRunStoreListener = (
  state: StableRunStoreSnapshot,
  previousState: StableRunStoreSnapshot,
) => void

export interface StableRunStore {
  getState(): StableRunStoreSnapshot
  getInitialState(): StableRunStoreSnapshot
  subscribe(listener: StableRunStoreListener): () => void
  dispatch(command: unknown): StableRunApplicationExecution
}

export interface CreateStableRunStoreInput {
  readonly initialPhase: unknown
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
}

export interface CreateStableRunStoreFromStorageInput {
  readonly storage: RunSaveStorage
  readonly rulesRegistry: RunSaveRulesRegistry
}
