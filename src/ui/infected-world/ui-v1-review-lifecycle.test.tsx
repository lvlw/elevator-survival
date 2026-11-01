import { act, Profiler } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../app/infected-browser/schema'
import type { PlayerReadyView } from '../../state/residence-session/player-types'
import { GameShell } from './components/game-shell'
import { fillMechanical, mountReview } from './ui-v1-review-test-fixtures'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })
const utility = () => document.querySelector('[role="dialog"][aria-label="药食与维护"]')

describe('R1-01 real React / original producer / controls lifecycle', () => {
  it.each([false, true])('necessary confirmation commits maintenance death once, saveFail=%s; no stale layer even before passive effects', async saveFail => {
    const observed = observeBrowser(), h = await mountReview(true)
    try {
      const session = observed.owners.at(-1)!, before = session.getState().current!, diskBefore = h.disk.get(CHECKPOINT_KEY)
      const opener = [...h.host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === '药食与维护')!
      opener.focus(); observed.clear(); h.setItem.mockClear()
      await h.d.button('药食与维护'); await fillMechanical(h); await h.d.button('执行行动')
      expect(document.querySelector('[aria-label="保护确认"]')?.textContent).toContain('本命令将导致死亡')
      expect(session.getState().current).toBe(before)
      expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, maintenance: 0, notices: 0 })
      expect(h.setItem).not.toHaveBeenCalled()
      h.faults.checkpoint = saveFail; h.commits.length = 0
      await h.d.button('确认执行')
      const dead = session.getState().current!
      expect(dead.phase).toBe('dead'); expect(dead.character.body.condition.currentHealth).toBe(0)
      expect(dead.receipts).toHaveLength(1); expect(dead.receipts[0].source).toBe('supply-death')
      expect(dead.character.revision).toBe(before.character.revision + 1)
      expect(h.host.querySelector('[aria-label="终局摘要"]')?.textContent).toContain('玩家死亡')
      expect(h.commits.filter(c => c.terminal === '玩家死亡').length).toBeGreaterThan(0)
      expect(h.commits.filter(c => c.terminal === '玩家死亡').every(c => c.utilityLayers === 0)).toBe(true)
      expect(utility()).toBeNull(); expect(document.querySelector('[aria-label="行动参数"],[aria-label="保护确认"]')).toBeNull()
      expect(opener.isConnected).toBe(false); expect(document.activeElement).not.toBe(opener)
      expect(observed.counts()).toMatchObject({ maintenance: 1, dispatch: 1, current: 1, notices: 1, g1Action: 1, draw: 0 })
      expect(h.setItem).toHaveBeenCalledTimes(1); expect(h.factory).toHaveBeenCalledTimes(1)
      expect(observed.owners).toHaveLength(1)
      if (saveFail) {
        expect(h.disk.get(CHECKPOINT_KEY)).toBe(diskBefore)
        expect(h.host.textContent).toContain('操作已生效，尚未保存')
        observed.clear(); h.setItem.mockClear(); h.faults.checkpoint = false
        await h.d.button('重试保存')
        expect(session.getState().current).toBe(dead); expect(h.setItem).toHaveBeenCalledTimes(1)
        expect(observed.counts()).toMatchObject({ maintenance: 0, dispatch: 0, current: 0, notices: 0, draw: 0, encode: 1 })
        expect(utility()).toBeNull(); expect(h.host.textContent).toContain('当前进度已保存')
      }
      h.setItem.mockClear(); observed.clear(); const saved = h.disk.get(CHECKPOINT_KEY)
      await h.remount()
      expect(h.view().point).toBe('dead'); expect(utility()).toBeNull()
      expect(h.disk.get(CHECKPOINT_KEY)).toBe(saved); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ maintenance: 0, dispatch: 0, draw: 0 })
    } finally { await h.unmount() }
  })

  it('L2/L3 cancellation and a normal live maintenance retain the valid menu and selected draft', async () => {
    const observed = observeBrowser(), lethal = await mountReview(true)
    try {
      const before = lethal.view(); observed.clear(); lethal.setItem.mockClear()
      await lethal.d.button('药食与维护'); await fillMechanical(lethal); await lethal.d.button('执行行动'); await lethal.d.button('取消')
      expect(lethal.view()).toBe(before); expect(utility()).not.toBeNull()
      expect(document.querySelector('[aria-label="保护确认"]')).toBeNull()
      expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, maintenance: 0, notices: 0 })
      expect(lethal.setItem).not.toHaveBeenCalled()
    } finally { await lethal.unmount() }
    const h = await mountReview()
    try {
      const before = h.view(); observed.clear(); h.setItem.mockClear()
      await h.d.button('药食与维护'); await fillMechanical(h); await h.render()
      expect(document.querySelector<HTMLInputElement>('[aria-label="金属零件来源1用量"]')!.value).toBe('1')
      expect(document.querySelector<HTMLInputElement>('[aria-label="金属管分配"]')!.value).toBe('15')
      await h.d.button('取消'); expect(h.view()).toBe(before); expect(utility()).not.toBeNull()
      expect(h.setItem).not.toHaveBeenCalled(); expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0 })
      await fillMechanical(h); observed.clear(); await h.d.button('执行行动')
      expect(document.querySelector('[aria-label="保护确认"]')).toBeNull()
      expect(h.view().point).toBe('stable-active'); expect(utility()).not.toBeNull()
      expect(observed.counts()).toMatchObject({ maintenance: 1, dispatch: 1, current: 1, notices: 1 })
      expect(h.setItem).toHaveBeenCalledTimes(1); expect(h.factory).toHaveBeenCalledTimes(1)
    } finally { await h.unmount() }
  })

  it.each(['suspend', 'dispose'] as const)('%s unmounts old utility/draft; detached controls cannot revive them', async method => {
    const observed = observeBrowser(), h = await mountReview()
    try {
      await h.d.button('药食与维护'); await fillMechanical(h)
      const old = document.querySelector<HTMLButtonElement>('[aria-label="药食与维护"] button')!
      observed.clear(); h.setItem.mockClear(); await h.flush(() => h.owner()[method]())
      expect(utility()).toBeNull(); expect(document.querySelector('[aria-label="行动参数"]')).toBeNull()
      expect(old.isConnected).toBe(false); await h.flush(() => old.click())
      expect(utility()).toBeNull(); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ dispatch: 0, maintenance: 0, notices: 0 })
      if (method === 'suspend') {
        await h.d.button('重新取得独占')
        expect(h.view().point).toBe('stable-active'); expect(utility()).toBeNull()
        expect(h.host.querySelector('.iw-utility-button')?.getAttribute('aria-expanded')).toBe('false')
        expect(h.factory).toHaveBeenCalledTimes(1); expect(h.setItem).not.toHaveBeenCalled()
      }
    } finally { await h.unmount() }
  })

  it.each(['no-actions', 'living-hub', 'dead', 'battle-decision'] as const)('projection-only boundary %s immediately hides and clears old open state without executing', async boundary => {
    const h = await mountReview(), host = document.createElement('div'), root = createRoot(host)
    document.body.append(host)
    const controls = h.owner().controls()!, live = h.view(), onAction = vi.fn(), onRetrySave = vi.fn(), frames: number[] = []
    const render = async (view: PlayerReadyView) => { await act(async () => root.render(<Profiler id="R1-shell-render-boundary" onRender={() => frames.push(host.ownerDocument.querySelectorAll('[aria-label="药食与维护"]').length)}><GameShell view={view} feed={[]} onAction={onAction} onRetrySave={onRetrySave} describeAction={controls.describeAction} /></Profiler>)) }
    try {
      await render(live)
      await h.flush(() => host.querySelector<HTMLButtonElement>('.iw-utility-button')!.click())
      expect(utility()).not.toBeNull(); frames.length = 0
      const changed: PlayerReadyView = boundary === 'no-actions' ? { ...live, actions: [] } : {
        ...live, point: boundary, phase: boundary === 'battle-decision' ? 'active-world' : boundary,
        // Deliberately retain stale public actions to test the independent point/phase guard.
      }
      await render(changed); expect(utility()).toBeNull(); expect(frames.every(n => n === 0)).toBe(true)
      await render(live); expect(utility()).toBeNull()
      expect(host.querySelector('.iw-utility-button')?.getAttribute('aria-expanded')).toBe('false')
      expect(onAction).not.toHaveBeenCalled(); expect(onRetrySave).not.toHaveBeenCalled()
    } finally { await act(async () => root.unmount()); host.remove(); await h.unmount() }
  })
})
