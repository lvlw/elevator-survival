import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { ActionButton, ActionInformationProvider } from './components/action-information'
import { actionName } from './labels'

afterEach(() => vi.restoreAllMocks())
const panel = () => document.querySelector<HTMLElement>('[aria-label="行动说明"]')
const zero = { dispatch: 0, current: 0, notices: 0, draw: 0, task: 0, source: 0, combat: 0, medical: 0,
  maintenance: 0, terminal: 0, g1Action: 0, g1Cycle: 0, origins: 0, consume: 0, encode: 0 }

describe('R01 L0 pure information boundaries', () => {
  it('actual focus, hover, switching and keyboard close are read-only; main click is not gated', async () => {
    const h = await mountUi(), o = observeBrowser()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅')
      const before = h.view(), disk = new Map(h.disk), writes = h.setItem.mock.calls.length, reads = h.getItem.mock.calls.length
      o.clear()
      const main = [...h.host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === '大厅搜索 · 无照明搜索')!
      await h.flush(() => main.focus())
      expect(panel()?.textContent).toContain('精力消耗：12')
      const info = h.host.querySelector<HTMLButtonElement>('[aria-label="查看隔离防火门 · 使用撬棍说明"]')!
      await h.flush(() => info.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
      expect(panel()?.textContent).toContain('本动作需要明确选择：实际物品')
      expect(panel()?.textContent).not.toContain('精力消耗：')
      await h.flush(() => info.click())
      expect(document.activeElement?.textContent).toBe('关闭说明')
      await h.flush(() => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
      expect(panel()).toBeNull(); expect(document.activeElement).toBe(info)
      expect(h.view()).toBe(before); expect(h.disk).toEqual(disk)
      expect(h.setItem).toHaveBeenCalledTimes(writes); expect(h.getItem).toHaveBeenCalledTimes(reads); expect(o.counts()).toMatchObject(zero)
      await h.flush(() => main.click())
      expect(o.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1, source: 1 })
      expect(h.setItem).toHaveBeenCalledTimes(writes + 1); expect(panel()).toBeNull()
      expect(h.host.querySelector('[aria-label="保护确认"]')).toBeNull()
    } finally { await h.unmount() }
  })

  it('incomplete L0 delegates describe only, never manufactures a tool or tries preview', async () => {
    const h = await mountUi(), extra = document.createElement('div'), root = createRoot(extra)
    document.body.append(extra)
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅')
      const controls = h.owner().controls()!, action = h.view().tasks.choices.find(a => a.method === 'crow')!
      const preview = vi.fn(controls.preview), describeAction = vi.fn(controls.describeAction), execute = vi.fn(controls.execute), onAction = vi.fn()
      const wrapped = { ...controls, preview, describeAction, execute }
      await act(async () => root.render(<ActionInformationProvider view={h.view()} controls={wrapped}><ActionButton action={action} onAction={onAction} /></ActionInformationProvider>))
      const entry = extra.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')!
      await h.flush(() => entry.click())
      expect(describeAction).toHaveBeenCalledWith(action.selector); expect(panel()?.textContent).toContain('使用撬棍')
      expect(preview).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled(); expect(onAction).not.toHaveBeenCalled()
      expect(h.view().carried.find(i => i.container === 'utility')!.name).toBe('撬棍')
    } finally { await act(async () => root.unmount()); extra.remove(); await h.unmount() }
  })

  it('unexpected query program errors propagate rather than becoming stale or safe facts', async () => {
    const h = await mountUi(), extra = document.createElement('div'), root = createRoot(extra)
    document.body.append(extra)
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const controls = h.owner().controls()!, action = h.view().move.options[0]!, boom = new Error('R01 intentional metadata program defect')
      const wrapped = { ...controls, preview: () => { throw boom } }
      await act(async () => root.render(<ActionInformationProvider view={h.view()} controls={wrapped}><ActionButton action={action} onAction={() => undefined} /></ActionInformationProvider>))
      await expect(h.flush(() => extra.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')!.click())).rejects.toBe(boom)
      expect(panel()?.textContent ?? '').not.toContain('已失效')
    } finally { await act(async () => root.unmount()); extra.remove(); await h.unmount() }
  })

  it.each(['movement', 'cold', 'lease'] as const)('%s invalidates open information without an extra action', async kind => {
    const h = await mountUi(), o = observeBrowser()
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const action = h.view().move.options.find(a => a.label === '大厅')!
      await h.d.button(`查看${actionName(action)}说明`)
      expect(panel()).not.toBeNull()
      if (kind === 'movement') await h.flush(() => { h.owner().controls()!.execute({ action: action.selector }) })
      else if (kind === 'cold') await h.remount()
      else await h.flush(() => h.owner().suspend())
      const writes = h.setItem.mock.calls.length; o.clear()
      expect(panel()).toBeNull(); expect(h.setItem).toHaveBeenCalledTimes(writes); expect(o.counts()).toMatchObject(zero)
    } finally { await h.unmount() }
  })

  it('a successful retrySave on unchanged current keeps open information and opaque target meaningful', async () => {
    const h = await mountUi(), o = observeBrowser()
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); h.faults.checkpoint = true; await h.d.move('大厅')
      const action = h.view().tasks.choices.find(a => a.method === 'crow')!, item = h.view().carried.find(i => i.container === 'utility')!
      await h.d.button(`查看${actionName(action)}说明`)
      const text = panel()!.textContent, writes = h.setItem.mock.calls.length
      h.faults.checkpoint = false; o.clear(); await h.flush(() => { h.owner().controls()!.retrySave() })
      expect(panel()!.textContent).toBe(text); expect(h.view().carried.find(i => i.container === 'utility')!.selector).toBe(item.selector)
      expect(h.setItem).toHaveBeenCalledTimes(writes + 1)
      expect(o.counts()).toMatchObject({ ...zero, encode: 1 })
      await h.d.button('关闭说明')
    } finally { await h.unmount() }
  })
})
