import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlayerReadyView } from '../../state/residence-session/player-types'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { mountUi } from './test-fixtures'
import { KnowledgeMap } from './components/knowledge-map'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })
type MapView = PlayerReadyView['map']
const a = { place: '测试甲区', name: '同名', current: true, visited: true }
const b = { place: '测试乙区', name: '同名', current: false, visited: false }
const c = { place: '测试乙区', name: '出口', current: false, visited: true }
const route = (from: string, to: string, passable: MapView['routes'][number]['passable'] = true, observation: MapView['routes'][number]['observation'] = 'current') => ({ from, to, passable, observation })
const ab = route('测试甲区 / 同名', '测试乙区 / 同名')
async function renderer(compact: boolean) {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
  return { host, render: async (map: MapView) => { await act(async () => root.render(<KnowledgeMap map={map} compact={compact} />)) },
    click: async (index: number, key?: string) => { await act(async () => host.querySelectorAll('.iw-map-node')[index]!.dispatchEvent(key ? new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }) : new MouseEvent('click', { bubbles: true }))) },
    close: async () => { await act(async () => root.unmount()); host.remove() } }
}

describe.each([true, false])('R1-02 synthetic safe projection, compact=%s (not a viewport/native-world claim)', compact => {
  it('ambiguous full names and missing endpoints emit no guessed edge, keeping every original route text/state', async () => {
    const r = await renderer(compact)
    const map: MapView = { nodes: [a, { ...a, current: false, visited: false }, b, c], routes: [ab,
      route(ab.to, ab.from, false, 'last-observed'), route('不存在 / 入口', ab.to, 'unknown', 'last-observed'),
      route(ab.to, '不存在 / 出口'), route(ab.to, '测试乙区 / 出口'), route('测试乙区 / 出口', ab.to, false, 'last-observed')] }
    try {
      await r.render(map)
      expect([...r.host.querySelectorAll('[data-map-route]')].map(e => Number(e.getAttribute('data-map-route')))).toEqual([4, 5])
      expect(r.host.querySelectorAll('.iw-map-node')).toHaveLength(4)
      const text = [...r.host.querySelectorAll('.iw-map-routes li')].map(e => e.textContent)
      expect(text).toEqual(map.routes.map(e => `${e.from} → ${e.to}${e.passable === 'unknown' ? '通行未知' : e.passable ? '已知可通行' : '已知受阻'} · ${e.observation === 'current' ? '当前观察' : '上次观察'}`))
      await r.click(1); expect(r.host.querySelector('.iw-map-selection')).toBeNull()
      await r.click(0, 'Enter'); expect(r.host.querySelector('.iw-map-selection')).toBeNull()
    } finally { await r.close() }
  })

  it('same short name in different places remains unique; directed cycle/reverse/unknown/old observation and exact node facts survive', async () => {
    const r = await renderer(compact), map: MapView = { nodes: [a, b, c], routes: [ab,
      route(ab.to, '测试乙区 / 出口', 'unknown', 'last-observed'), route('测试乙区 / 出口', ab.from), route(ab.to, ab.from, false, 'last-observed')] }
    try {
      await r.render(map); const edges = [...r.host.querySelectorAll('[data-map-route]')]
      expect(edges).toHaveLength(4)
      expect(edges.map(e => [e.getAttribute('data-passage'), e.getAttribute('data-observation')])).toEqual(map.routes.map(e => [String(e.passable), e.observation]))
      expect(edges[0]!.getAttribute('d')).not.toBe(edges[3]!.getAttribute('d'))
      await r.click(1, ' ')
      expect(r.host.querySelector('.iw-map-selection')?.textContent).toContain('测试乙区 / 同名 · 已知未到达')
      expect(r.host.querySelector('.iw-map-selection')?.textContent).not.toContain('测试甲区 / 同名 · 当前位置')
    } finally { await r.close() }
  })

  it('unique selection becomes ambiguous or absent immediately; later surviving names never reopen stale detail', async () => {
    const r = await renderer(compact)
    try {
      await r.render({ nodes: [a, b], routes: [ab] }); await r.click(0)
      expect(r.host.querySelector('.iw-map-selection')?.textContent).toContain('测试甲区 / 同名 · 当前位置')
      await r.render({ nodes: [a, { ...a, visited: false, current: false }, b], routes: [ab] })
      expect(r.host.querySelector('.iw-map-selection')).toBeNull()
      await r.render({ nodes: [{ ...a, visited: false, current: false }, b], routes: [ab] })
      expect(r.host.querySelector('.iw-map-selection')).toBeNull()
      await r.click(0); expect(r.host.querySelector('.iw-map-selection')?.textContent).toContain('已知未到达')
      await r.render({ nodes: [b], routes: [ab] }); expect(r.host.querySelector('.iw-map-selection')).toBeNull()
      await r.render({ nodes: [a, b], routes: [ab] }); expect(r.host.querySelector('.iw-map-selection')).toBeNull()
    } finally { await r.close() }
  })

  it('reading synthetic boundaries beside an actual owner never dispatches, saves or changes its real public view', async () => {
    const observed = observeBrowser(), h = await mountUi(), r = await renderer(compact)
    try {
      await h.d.setup(); await h.d.send('进入封锁区'); const before = h.view(); observed.clear(); h.setItem.mockClear()
      await r.render({ nodes: [a, { ...a, current: false }, b], routes: [ab, route('缺失 / 入口', ab.from)] })
      await r.click(1); await r.click(2, 'Enter')
      await act(async () => r.host.querySelector('summary')!.click())
      expect(r.host.querySelectorAll('.iw-map-routes li')).toHaveLength(2)
      expect(h.view()).toBe(before); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
    } finally { await r.close(); await h.unmount() }
  })
})
