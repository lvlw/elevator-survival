import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { boundaryRecords } from '../../../docs/engineering/world-integration/preplay/browser-owner/validation/browser-cases'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../app/infected-browser/schema'
import { domRouteA } from './route-test-fixtures'
import { mountPresentation } from './committed-presentation-test-fixtures'
import { installEnemyArtImages } from './enemy-art-test-fixtures'

let images: ReturnType<typeof installEnemyArtImages>
beforeEach(() => { images = installEnemyArtImages() })
afterEach(() => { images.restore(); vi.restoreAllMocks(); document.body.replaceChildren() })
describe('C2 real React/BrowserOwner/P/R/S integration with controlled resource outcomes', () => {
  it.each(['pending', 'failed', 'ready'] as const)('%s images never gate an original combat commit, write or B1/C1 feedback', async mode => {
    const observed = observeBrowser(), h = await mountPresentation({ records: boundaryRecords('orderly') })
    try {
      expect(images.requests).toHaveLength(5)
      if (mode === 'ready') await images.finish()
      if (mode === 'failed') await h.flush(() => images.requests[0].onerror!())
      expect(!!h.host.querySelector('.iw-battle img')).toBe(mode === 'ready')
      const before = observed.owners.at(-1)!.getState().current!.character.revision
      observed.clear(); await h.combat('金属管攻击')
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1, notices: 1 })
      expect(h.setItem).toHaveBeenCalledTimes(1); expect(observed.owners.at(-1)!.getState().current!.character.revision).toBe(before + 1)
      expect(h.direct()!.sequence).toHaveLength(1); expect(h.direct()!.stop).toBe(h.view().point)
      expect(h.cue().textContent).toBe('攻击已执行'); expect(images.requests).toHaveLength(5)
      expect(!!h.host.querySelector('.iw-battle img')).toBe(mode === 'ready')
    } finally { await h.unmount() }
  })
  it('read-null setup and original visible entry route prepare only the actual current opponent, without extra commit or synthetic cue', async () => {
    const h = await mountPresentation()
    try {
      expect(h.disk.size).toBe(0); await h.d.setup(); await domRouteA(h.d, 0)
      expect(h.view().combat!.opponent.visualKey).toBe('infected-orderly'); expect(images.requests).toHaveLength(5)
      expect(h.cue().textContent).toBe(''); expect(h.originals.every(r => !r.presentation)).toBe(true)
      const writes = h.setItem.mock.calls.length; await images.finish(); expect(h.setItem).toHaveBeenCalledTimes(writes)
      expect(h.host.querySelector('img.iw-enemy-art-raster')).not.toBeNull(); await h.combat('防御')
      expect(h.direct()!.sequence).toHaveLength(1); expect(h.setItem).toHaveBeenCalledTimes(writes + 1)
    } finally { await h.unmount() }
  })
  it.each(['victory', 'retreat', 'death', 'both-zero'] as const)('%s immediately removes the enemy layer; captured old events cannot revive it', async id => {
    const observed = observeBrowser(), h = await mountPresentation({ id })
    try {
      const stale = images.requests.map(i => i.onload); await images.finish()
      const oldImage = h.host.querySelector<HTMLImageElement>('img.iw-enemy-art-raster')!, oldError = oldImage.onerror!
      observed.clear(); await h.combat()
      expect(h.view().point).toBe(id === 'death' || id === 'both-zero' ? 'dead' : 'stable-active')
      expect(h.host.querySelector('.iw-enemy-art-frame,.iw-battle')).toBeNull()
      await h.flush(() => { for (const f of stale) f?.(); oldError.call(oldImage, new Event('error')) })
      expect(h.host.querySelector('.iw-enemy-art-frame,.iw-battle')).toBeNull()
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1, notices: 1 }); expect(h.setItem).toHaveBeenCalledTimes(1)
    } finally { await h.unmount() }
  })
  it('save-failed action stays effective; retry and C1 skip/reduce do not reload art or emit another token; cold restore does not replay', async () => {
    const observed = observeBrowser(), h = await mountPresentation({ id: 'defend' })
    try {
      await images.finish(); const img = h.host.querySelector('img.iw-enemy-art-raster')
      h.faults.checkpoint = true; observed.clear(); await h.combat()
      expect(h.direct()!.persistence).toBe('save-failed'); expect(h.setItem).toHaveBeenCalledTimes(1)
      expect(h.host.textContent).toContain('操作已生效，尚未保存'); expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1 })
      expect(h.host.querySelector('img.iw-enemy-art-raster')).toBe(img)
      await h.d.button('跳过反馈'); const checkbox = h.host.querySelector<HTMLInputElement>('.iw-committed-options input')!
      await h.flush(() => checkbox.click()); expect(images.requests).toHaveLength(5)
      h.faults.checkpoint = false; observed.clear(); await h.d.button('重试保存')
      expect(h.results.filter(r => r.presentation)).toHaveLength(1); expect(h.cue().textContent).toBe('')
      expect(images.requests).toHaveLength(5); expect(observed.counts()).toMatchObject({ combat: 0, dispatch: 0, current: 0, draw: 0, encode: 1 })
      const disk = h.disk.get(CHECKPOINT_KEY); h.setItem.mockClear(); h.results.length = 0; observed.clear()
      await h.remount(); expect(h.cue().textContent).toBe(''); expect(h.direct()).toBeUndefined(); expect(h.disk.get(CHECKPOINT_KEY)).toBe(disk)
      expect(h.setItem).not.toHaveBeenCalled(); expect(h.host.querySelector('img.iw-enemy-art-raster')).toBeNull()
      expect(images.requests).toHaveLength(10); await images.finish(); expect(h.host.querySelector('img.iw-enemy-art-raster')).not.toBeNull()
    } finally { await h.unmount() }
  })
  it.each(['suspend', 'dispose'] as const)('actual post-commit %s removes art and late callbacks without undoing the one commit', async method => {
    let armed = false; const observed = observeBrowser()
    const h = await mountPresentation({ id: 'defend', beforeOwner: owner => owner.subscribe(() => {
      if (armed && owner.getSnapshot().preplay?.status === 'stable') { armed = false; owner[method]() }
    }) })
    try {
      const stale = images.requests.map(i => i.onload); await images.finish(); observed.clear(); armed = true; await h.combat()
      await h.flush(() => { for (const f of stale) f?.() })
      expect(h.host.querySelector('.iw-battle,.iw-enemy-art-frame')).toBeNull()
      expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1, notices: 1 }); expect(h.setItem).toHaveBeenCalledTimes(1)
    } finally { await h.unmount() }
  })
})
