import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { mountUi } from './test-fixtures'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })

describe('infected-world explicit setup controls', () => {
  it('StrictMode mounting, rendering and remounting create no identity, stock or write', async () => {
    const observed = observeBrowser(), h = await mountUi('setup-strict', true)
    try {
      expect(h.owner().getSnapshot().status).toBe('setup')
      expect(h.entropy).not.toHaveBeenCalled(); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ initial: 0, dispatch: 0, current: 0, notices: 0, draw: 0 })
      expect([...h.host.querySelectorAll<HTMLInputElement>('input[type="radio"]')].every(input => !input.checked)).toBe(true)
      expect([...h.host.querySelectorAll('button')].find(button => button.textContent === '确认创建')?.disabled).toBe(true)
      await h.render(); await h.remount()
      expect(h.owner().getSnapshot().status).toBe('setup')
      expect(h.entropy).not.toHaveBeenCalled(); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ initial: 0, dispatch: 0, current: 0, notices: 0, draw: 0 })
      expect(h.owners.filter(owner => owner.getSnapshot().status !== 'disposed')).toHaveLength(1)
    } finally { await h.unmount() }
  })

  it.each(['crow', 'lamp', 'toolbox'].flatMap(tool => ['scout', 'engineer', 'survival'].map(specialty => [tool, specialty])))
  ('requires actual choices and creates exactly one locked %s / %s initial Hub without launch', async (tool, specialty) => {
    const observed = observeBrowser(), h = await mountUi(`setup-${tool}-${specialty}`)
    try {
      const create = [...h.host.querySelectorAll('button')].find(button => button.textContent === '确认创建')!
      expect(create.disabled).toBe(true)
      const toolInput = h.host.querySelector<HTMLInputElement>(`input[name="tool"][value="${tool}"]`)!
      await h.flush(() => toolInput.click()); expect(create.disabled).toBe(true)
      await h.d.setup(tool, specialty)
      expect(h.view()).toMatchObject({ phase: 'first-hub', point: 'first-hub', first: { toolChoices: [tool], specialtyChoices: [specialty], locked: true } })
      expect(h.entropy).toHaveBeenCalledTimes(1)
      expect(h.setItem).toHaveBeenCalledTimes(2)
      expect(observed.counts()).toMatchObject({ initial: 1, dispatch: 0, current: 1, notices: 1 })
      expect(h.host.querySelector('input[name="tool"]')).toBeNull()
      expect(h.host.textContent).toContain('已锁定')
      expect(h.host.textContent).toContain('进入封锁区')
    } finally { await h.unmount() }
  })
})
