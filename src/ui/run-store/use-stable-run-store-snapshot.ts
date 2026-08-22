import { useSyncExternalStore } from 'react'
import type { StableRunStore, StableRunStoreSnapshot } from '../../state/run-store'

/**
 * React's read-only bridge to the public StableRunStore contract.
 * Rendering only observes the canonical phase; mutations remain explicit
 * application commands outside React render and subscription paths.
 */
export function useStableRunStoreSnapshot(
  store: StableRunStore,
): StableRunStoreSnapshot {
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.getState(),
    () => store.getInitialState(),
  )
}
