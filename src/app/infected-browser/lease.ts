import { LOCK_NAME } from './schema'
export type BrowserLease = Readonly<{ active(): boolean; release(): void }>
/** Hold the platform callback for the entire writable lifetime; no queue or steal. */
export function requestBrowserLease(locks: Pick<LockManager, 'request'>, lost: () => void): Promise<BrowserLease | null> {
  return new Promise((resolve, reject) => {
    let acquired = false, valid = false, unlock: (() => void) | null = null
    try {
      const finished = locks.request(LOCK_NAME, { mode: 'exclusive', ifAvailable: true }, async lock => {
        if (!lock) { resolve(null); return }
        acquired = valid = true
        const held = new Promise<void>(done => { unlock = done })
        resolve(Object.freeze({ active: () => valid, release: () => { if (!valid) return; valid = false; lost(); unlock?.() } }))
        await held
        if (valid) { valid = false; lost() }
      })
      Promise.resolve(finished).catch(error => { if (acquired) { valid = false; lost() } else reject(error) })
    } catch (error) { reject(error) }
  })
}
