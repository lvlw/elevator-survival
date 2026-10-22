import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import type { BrowserControls, BrowserOwner } from '../../app/infected-browser/types'
import { CHECKPOINT_KEY, checkpointSchema } from '../../app/infected-browser/schema'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'

afterEach(() => vi.restoreAllMocks())

describe('React persistence and lease feedback', () => {
  it('a strict outer checkpoint with corrupt v4 payload offers read retry, not projection rebuild', async () => {
    const source = await mountUi(); let disk: Map<string, string>
    try { await source.d.setup(); disk = new Map(source.disk) } finally { await source.unmount() }
    const original = checkpointSchema.parse(JSON.parse(disk!.get(CHECKPOINT_KEY)!)), expected = JSON.stringify(original.expected)
    const corrupt = { ...original, v4Text: '{TEST-invalid-domain-json' }
    expect(checkpointSchema.safeParse(corrupt).success).toBe(true)
    expect(JSON.stringify(corrupt.expected)).toBe(expected)
    disk!.set(CHECKPOINT_KEY, JSON.stringify(corrupt))
    const h = await mountUi('unused-cold-seed', false, fixture => { for (const [key, value] of disk!) fixture.disk.set(key, value) })
    try {
      const snapshot = h.owner().getSnapshot()
      expect(snapshot.status).toBe('blocked')
      expect(snapshot.preplay?.view).toMatchObject({ status: 'blocked', reason: 'load-blocked' })
      expect(h.host.textContent).toContain('重试读取')
      expect(h.host.textContent).not.toContain('重建安全展示')
      expect(h.disk).toEqual(disk!); expect(h.setItem).not.toHaveBeenCalled(); expect(h.entropy).not.toHaveBeenCalled()
      const reads = h.getItem.mock.calls.length
      await h.d.button('重试读取')
      expect(h.getItem).toHaveBeenCalledTimes(reads + 2)
      expect(h.owner().getSnapshot().status).toBe('blocked')
      expect(h.disk).toEqual(disk!); expect(h.setItem).not.toHaveBeenCalled(); expect(h.entropy).not.toHaveBeenCalled()
    } finally { await h.unmount() }
  })
  it('an existing current invalidated by an external formal command offers projection rebuild without rereading', async () => {
    const o = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const session = o.owners.at(-1)!, before = session.getState().current!
      const deps = createInfectedCombatDependencies(before.character.identity.characterId)
      const edge = deps.supply.catalog.data.edges.find(e => e.from === before.site!.nodeId && e.to === 'H1')!
      await h.flush(() => session.dispatch({ kind: 'move', command: { kind: 'move', expectedRevision: before.character.revision, edgeId: edge.id } }))
      expect(h.owner().getSnapshot()).toMatchObject({ status: 'ready', preplay: { status: 'projection-error', view: null } })
      expect(h.host.textContent).toContain('重建安全展示'); expect(h.host.textContent).not.toContain('重试读取')
      const current = session.getState().current, writes = h.setItem.mock.calls.length, reads = h.getItem.mock.calls.length
      o.clear(); await h.d.button('重建安全展示')
      expect(h.view().location!.name).toBe('大厅'); expect(session.getState().current).toBe(current)
      expect(h.setItem).toHaveBeenCalledTimes(writes); expect(h.getItem).toHaveBeenCalledTimes(reads)
      expect(o.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, encode: 0, draw: 0 })
    } finally { await h.unmount() }
  })
  it('a real storage read failure offers retryRead and can return to setup without issuing identity or stock', async () => {
    const h = await mountUi('read-failure', false, fixture => { fixture.faults.read = true })
    try {
      expect(h.owner().getSnapshot()).toMatchObject({ status: 'read-error', preplay: null })
      expect(h.host.textContent).toContain('重试读取'); expect(h.host.textContent).not.toContain('重建安全展示')
      h.faults.read = false; await h.d.button('重试读取')
      expect(h.owner().getSnapshot().status).toBe('setup')
      expect(h.host.textContent).toContain('确认创建'); expect(h.setItem).not.toHaveBeenCalled(); expect(h.entropy).not.toHaveBeenCalled()
    } finally { await h.unmount() }
  })
  it('failed save retains the new public current and retry saves once without replaying the action', async () => {
    const o = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const disk = new Map(h.disk), writes = h.setItem.mock.calls.length, energy = h.view().body.energy.current
      o.clear()
      h.faults.checkpoint = true; await h.d.move('大厅')
      expect(h.setItem).toHaveBeenCalledTimes(writes + 1); expect(h.disk).toEqual(disk)
      expect(h.view().location!.name).toBe('大厅'); expect(h.view().body.energy.current).toBeLessThan(energy)
      expect(h.host.textContent).toContain('操作已生效，尚未保存')
      expect(o.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1, g2: 1, draw: 0 })
      const current = h.view(), newEnergy = current.body.energy.current, feed = h.owner().getSnapshot().preplay!.feed
      h.faults.checkpoint = false; o.clear(); await h.d.button('重试保存')
      expect(h.setItem).toHaveBeenCalledTimes(writes + 2)
      expect(h.view().location!.name).toBe(current.location!.name); expect(h.view().body.energy.current).toBe(newEnergy)
      expect(h.owner().getSnapshot().preplay!.feed).toBe(feed); expect(h.host.textContent).toContain('当前进度已保存')
      expect(o.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, g2: 0, g1Action: 0, g1Cycle: 0, draw: 0, encode: 1 })
    } finally { await h.unmount() }
  })
  it('loss of lease removes an open draft and never submits its old form', async () => {
    const h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅'); await h.d.button('隔离防火门 · 使用撬棍')
      await h.d.select('物品', '撬棍')
      const submit = [...h.host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === '执行行动')!, writes = h.setItem.mock.calls.length
      await h.flush(() => h.owner().suspend())
      expect(h.host.querySelector('[aria-label="行动参数"]')).toBeNull(); expect(h.host.textContent).toContain('重新获取独占')
      await h.flush(() => submit.click()); expect(h.setItem).toHaveBeenCalledTimes(writes)
    } finally { await h.unmount() }
  })
  it('retrySave on the same current keeps the already selected tool draft meaningful', async () => {
    const o = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); h.faults.checkpoint = true; await h.d.move('大厅')
      await h.d.button('隔离防火门 · 使用撬棍'); await h.d.select('物品', '撬棍')
      const tool = h.view().carried.find(i => i.container === 'utility')!.selector, writes = h.setItem.mock.calls.length
      const selected = h.host.querySelector<HTMLSelectElement>('[aria-label="物品"]')!.value
      h.faults.checkpoint = false; o.clear()
      await h.flush(() => { h.owner().controls()!.retrySave() })
      expect(h.setItem).toHaveBeenCalledTimes(writes + 1)
      expect(h.host.querySelector<HTMLSelectElement>('[aria-label="物品"]')!.value).toBe(selected)
      expect(h.view().carried.find(i => i.container === 'utility')!.selector).toBe(tool)
      expect(o.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, g1Action: 0, draw: 0, encode: 1 })
      o.clear(); await h.d.button('执行行动')
      expect(h.setItem).toHaveBeenCalledTimes(writes + 2)
      expect(o.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1, task: 1 })
    } finally { await h.unmount() }
  })
  it('an implementation AssertionError carrying a business-like code stays observable and stops old controls without submitting', async () => {
    const o = observeBrowser(), failure = (() => {
      try { expect.fail('TEST-private-implementation-fault') }
      catch (error) { if (!(error instanceof Error)) throw error; return Object.assign(error, { code: 'NOT_AVAILABLE' }) }
    })()
    let fail = false
    const errors: unknown[] = [], onError = (event: ErrorEvent) => { if (event.error === failure) { errors.push(event.error); event.preventDefault() } }
    window.addEventListener('error', onError)
    const h = await mountUi('E03-A-seed-01', false, fixture => {
      const make = fixture.make
      fixture.make = () => {
        const owner = make(); let prior: BrowserControls | null = null, wrapped: BrowserControls | null = null
        const out: BrowserOwner = Object.freeze({ ...owner, controls: () => {
          const controls = owner.controls()
          if (controls !== prior) { prior = controls; wrapped = controls ? Object.freeze({ ...controls,
            execute: input => { if (fail) throw failure; return controls.execute(input) } }) : null }
          return wrapped
        } })
        return out
      }
    })
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const writes = h.setItem.mock.calls.length, before = h.view(); fail = true; o.clear()
      await h.d.move('大厅')
      expect(errors).toEqual([failure]); expect(h.host.textContent).toContain('界面遇到程序异常')
      expect(h.host.textContent).not.toContain('TEST-private-implementation-fault'); expect(h.host.textContent).not.toContain('NOT_AVAILABLE')
      expect(h.setItem).toHaveBeenCalledTimes(writes); expect(h.view()).toBe(before)
      expect(o.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, g1Action: 0, draw: 0 })
    } finally { await h.unmount(); window.removeEventListener('error', onError) }
  })
})
