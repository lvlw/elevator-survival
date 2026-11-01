import { StrictMode, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { approvedEnemyArt, type EnemyArtGroup } from './approved-enemy-art'
import { useEnemyArt } from './use-enemy-art'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
// An explicitly adversarial resource producer can deliver captured callbacks after cancel.
// This isolates the consumer's own generation guards from the loader's independent guards.
const preparations = vi.hoisted(() => [] as { group: EnemyArtGroup; ready(): void; failed(): void; cancel: ReturnType<typeof vi.fn> }[])
vi.mock('./enemy-art-loader', () => ({ prepareEnemyArt: (group: EnemyArtGroup, ready: () => void, failed: () => void) => {
  const p = { group, ready, failed, cancel: vi.fn() }; preparations.push(p); return p
} }))
const orderly = approvedEnemyArt['infected-orderly'], porter = approvedEnemyArt['infected-porter']
let root: Root | null = null, host: HTMLDivElement
let failDisplayed: () => void
const renders: { requested: string | null; shown: string | null }[] = []
function Harness({ group, stage = 'healthy' }: { group: EnemyArtGroup | null; stage?: string }) {
  const { prepared, failDisplay } = useEnemyArt(group); failDisplayed = failDisplay
  renders.push({ requested: group?.key ?? null, shown: prepared?.group.key ?? null })
  return <span>{prepared?.group.key ?? 'neutral'}:{stage}</span>
}
async function render(group: EnemyArtGroup | null, stage?: string, strict = false) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host) }
  await act(async () => root!.render(strict ? <StrictMode><Harness group={group} stage={stage} /></StrictMode> : <Harness group={group} stage={stage} />))
}
async function deliver(fn: () => void) { await act(async () => fn()) }
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = null; host?.remove(); preparations.length = 0; renders.length = 0 })
describe('C2 current-group, generation and mount consumer', () => {
  it('does not prepare unknown; current legal group starts once, stays neutral until ready', async () => {
    await render(null); expect(preparations).toHaveLength(0)
    await render(orderly); expect(preparations).toHaveLength(1); expect(host.textContent).toBe('neutral:healthy')
    await deliver(preparations[0].ready); expect(host.textContent).toBe('infected-orderly:healthy')
  })
  it('same-group stage, ordinary rerender and failed state never reprepare or retry', async () => {
    await render(orderly); await render(orderly, 'wounded'); await render(orderly, 'critical')
    expect(preparations).toHaveLength(1)
    await deliver(preparations[0].failed); await render(orderly, 'incapacitated'); await render(orderly)
    expect(preparations).toHaveLength(1); expect(host.textContent).toBe('neutral:healthy')
  })
  it('T07 renders a new group neutral synchronously before layout effects retire the old ready group', async () => {
    await render(orderly); await deliver(preparations[0].ready); renders.length = 0
    await render(porter)
    expect(renders.filter(r => r.requested === porter.key)).not.toContainEqual({ requested: porter.key, shown: orderly.key })
    expect(host.textContent).toBe('neutral:healthy'); expect(preparations[0].cancel).toHaveBeenCalledOnce()
    await deliver(preparations[1].ready); expect(host.textContent).toBe('infected-porter:healthy')
  })
  it('T08 captured old success/failure/display callbacks cannot clear or revive another current ready group', async () => {
    await render(orderly); const old = preparations[0]
    await deliver(old.ready); const oldDisplayError = failDisplayed
    await render(porter); await deliver(preparations[1].ready)
    for (const callback of [old.ready, old.failed, oldDisplayError]) {
      await deliver(callback); expect(host.textContent).toBe('infected-porter:healthy')
    }
  })
  it('current displayed failure stays neutral through same-group stage/rerender and drops retained resources', async () => {
    await render(orderly); await deliver(preparations[0].ready); await deliver(failDisplayed)
    expect(preparations[0].cancel).toHaveBeenCalledOnce()
    await render(orderly, 'wounded'); expect(host.textContent).toBe('neutral:wounded'); expect(preparations).toHaveLength(1)
  })
  it('null/current combat exit clears synchronously; reentry is a genuine new generation', async () => {
    await render(orderly); await deliver(preparations[0].ready); renders.length = 0
    await render(null); expect(renders.filter(r => r.requested === null).every(r => r.shown === null)).toBe(true)
    await deliver(preparations[0].ready); expect(host.textContent).toBe('neutral:healthy')
    await render(orderly); expect(preparations).toHaveLength(2); expect(host.textContent).toBe('neutral:healthy')
  })
  it('StrictMode retires its first generation and ignores both late callbacks after true unmount', async () => {
    await render(orderly, 'healthy', true); expect(preparations).toHaveLength(2)
    expect(preparations[0].cancel).toHaveBeenCalledOnce()
    await deliver(preparations[0].ready); expect(host.textContent).toBe('neutral:healthy')
    await deliver(preparations[1].ready); expect(host.textContent).toBe('infected-orderly:healthy')
    await act(async () => root!.unmount()); root = null; const count = renders.length
    await deliver(preparations[1].ready); await deliver(preparations[1].failed)
    expect(renders).toHaveLength(count); expect(preparations[1].cancel).toHaveBeenCalledOnce()
  })
})
