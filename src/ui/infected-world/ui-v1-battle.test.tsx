import { afterEach, expect, it, vi } from 'vitest'
import { mountPresentation } from './committed-presentation-test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })
it('battle size, known map and body retain current facts and scope/high-water without a second action or save', async () => {
  const observed = observeBrowser(), h = await mountPresentation({ id: 'defend' })
  try {
    await h.combat(); const first = h.direct()!, view = h.view(); observed.clear(); h.setItem.mockClear()
    await h.d.button('放大战斗'); expect(h.host.querySelector('.iw-battle--max')).not.toBeNull()
    await h.d.button('还原战斗'); await h.d.button('展开已知区域'); await h.d.button('关闭'); await h.d.button('身体'); await h.d.button('关闭')
    expect(h.view()).toBe(view); expect(h.setItem).not.toHaveBeenCalled()
    expect(observed.counts()).toMatchObject({ combat: 0, dispatch: 0, current: 0, notices: 0, draw: 0 })
    await h.combat('防御'); expect(h.direct()!.token.scope).toBe(first.token.scope); expect(h.direct()!.token.ordinal).toBe(first.token.ordinal + 1)
    expect(observed.counts()).toMatchObject({ combat: 1, dispatch: 1, current: 1, notices: 1 }); expect(h.setItem).toHaveBeenCalledTimes(1)
  } finally { await h.unmount() }
})
