import { createStore } from 'zustand/vanilla'
import { executeStableRunApplicationCommand } from '../run-application'
import {
  canonicalizeStableRunPhase,
  loadRunPhase,
} from '../run-save'
import type {
  CreateStableRunStoreFromStorageInput,
  CreateStableRunStoreInput,
  StableRunStore,
  StableRunStoreSnapshot,
} from './run-store-types'

/**
 * Creates the sole long-lived owner of the current foreground Run phase.
 * Gameplay mutation and persistence remain behind the unified application
 * dispatcher; the raw Zustand setState API is deliberately kept private.
 */
export function createStableRunStore(
  input: CreateStableRunStoreInput,
): StableRunStore {
  const initialPhase = canonicalizeStableRunPhase(
    input.initialPhase,
    input.rulesRegistry,
  )
  const initialSnapshot = Object.freeze({ phase: initialPhase })
  const internal = createStore<StableRunStoreSnapshot>(() => initialSnapshot)

  return Object.freeze({
    getState: internal.getState,
    getInitialState: internal.getInitialState,
    subscribe: internal.subscribe,
    dispatch: (command: unknown) => {
      const execution = executeStableRunApplicationCommand({
        currentPhase: internal.getState().phase,
        command,
        storage: input.storage,
        rulesRegistry: input.rulesRegistry,
      })
      internal.setState(Object.freeze({ phase: execution.phase }), true)
      return execution
    },
  })
}

export function createStableRunStoreFromStorage(
  input: CreateStableRunStoreFromStorageInput,
): StableRunStore | null {
  const phase = loadRunPhase(input.storage, input.rulesRegistry)
  return phase === null
    ? null
    : createStableRunStore({
        initialPhase: phase,
        storage: input.storage,
        rulesRegistry: input.rulesRegistry,
      })
}
