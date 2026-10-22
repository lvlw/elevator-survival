import { useEffect, useState, useSyncExternalStore } from 'react'
import { createInfectedBrowserOwner } from '../../app/infected-browser'
import type { BrowserOwner, BrowserSnapshot } from '../../app/infected-browser/types'

export type OwnerFactory = () => BrowserOwner
const idle: BrowserSnapshot = Object.freeze({ status: 'idle', setup: null, preplay: null, message: null })

/** A presentation subscription bridge. Every effect lifetime owns a fresh owner. */
export function useBrowserOwner(factory: OwnerFactory = createInfectedBrowserOwner) {
  const [bridge] = useState(() => {
    let owner: BrowserOwner | null = null, snapshot = idle
    const listeners = new Set<() => void>()
    const update = () => { snapshot = owner?.getSnapshot() ?? idle; for (const f of [...listeners]) f() }
    return {
      getSnapshot: () => snapshot,
      subscribe: (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } },
      owner: () => owner,
      attach(next: BrowserOwner) { owner = next; const unsubscribe = next.subscribe(update); update(); return () => {
        unsubscribe(); if (owner === next) { owner = null; update() }; next.dispose()
      } },
    }
  })
  useEffect(() => {
    const owner = factory(), detach = bridge.attach(owner)
    let cancelled = false
    // StrictMode's synchronous effect probe must retire before an acquisition starts.
    // This is not a retry/queue for an occupied external writer.
    void Promise.resolve().then(() => { if (!cancelled) return owner.acquire() })
    return () => { cancelled = true; detach() }
  }, [bridge, factory])
  const snapshot = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot, bridge.getSnapshot)
  return { snapshot, owner: bridge.owner() }
}
