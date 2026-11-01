import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KnowledgeMap } from './components/knowledge-map'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import type { PlayerReadyView } from '../../state/residence-session/player-types'

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren() })
const projected: PlayerReadyView['map'] = {
  nodes: [{ place: '测试公开区域', name: '甲', visited: true, current: true }, { place: '测试公开区域', name: '乙', visited: true, current: false }, { place: '测试公开区域', name: '丙', visited: false, current: false }],
  routes: [
    { from: '测试公开区域 / 甲', to: '测试公开区域 / 乙', passable: true, observation: 'current' },
    { from: '测试公开区域 / 乙', to: '测试公开区域 / 甲', passable: false, observation: 'last-observed' },
    { from: '测试公开区域 / 乙', to: '测试公开区域 / 丙', passable: 'unknown', observation: 'last-observed' },
    { from: '测试公开区域 / 丙', to: '测试公开区域 / 甲', passable: true, observation: 'current' },
  ],
}
describe('shared safe SVG known-map projection (renderer tests, not native screenshots)', () => {
  it.each([true, false])('compact=%s retains the cycle, reverse direction and every observation instead of a tree', async compact => {
    const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
    try {
      await act(async () => root.render(<KnowledgeMap map={projected} compact={compact} />))
      const edges = [...host.querySelectorAll('[data-map-route]')]
      expect(edges).toHaveLength(4); expect(host.querySelectorAll('.iw-map-node')).toHaveLength(3)
      expect(edges.map(edge => edge.querySelector('title')!.textContent)).toEqual(projected.routes.map(route => `${route.from} → ${route.to} · ${route.passable === 'unknown' ? '通行未知' : route.passable ? '已知可通行' : '已知受阻'} · ${route.observation === 'current' ? '当前观察' : '上次观察'}`))
      expect(edges[0]!.getAttribute('d')).not.toBe(edges[1]!.getAttribute('d'))
      expect(edges.every(edge => edge.getAttribute('marker-end')?.startsWith('url(#iw-map-'))).toBe(true)
      expect(host.querySelector('[data-current="true"]')?.getAttribute('aria-label')).toContain('当前位置')
      expect(host.querySelector('[data-visited="false"]')?.getAttribute('aria-label')).toContain('已知未到达')
      expect(host.querySelectorAll('.iw-map-routes li')).toHaveLength(4)
      expect(host.innerHTML).not.toMatch(/冷藏室|检修间|H[0-9]|nodeId|instanceId/)
      expect(Number.parseFloat(host.querySelector<SVGElement>('.iw-map-canvas')!.style.width)).toBeGreaterThanOrEqual(320)
      expect(Number(host.querySelector('.iw-map-node rect')!.getAttribute('height'))).toBeGreaterThanOrEqual(44)
    } finally { await act(async () => root.unmount()); host.remove() }
  })
  it('real current and known-unvisited nodes only open facts; keyboard, scrolling and expanded map do not move or save', async () => {
    const observed = observeBrowser(), h = await mountUi()
    try {
      await h.d.setup(); await h.d.send('进入封锁区')
      const before = h.view(); observed.clear(); h.setItem.mockClear()
      const nodes = [...h.host.querySelectorAll<SVGGElement>('.iw-map-node')]
      expect(nodes).toHaveLength(before.map.nodes.length)
      await h.flush(() => nodes[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
      await h.flush(() => nodes.at(-1)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })))
      expect(h.host.querySelector('.iw-map-selection')).not.toBeNull()
      await h.d.button('展开已知区域')
      const expanded = document.querySelector('[role="dialog"][aria-label="已知地图"]')!
      expect(expanded.querySelectorAll('.iw-map-node')).toHaveLength(before.map.nodes.length)
      expect(expanded.querySelectorAll('[data-map-route]')).toHaveLength(before.map.routes.length)
      expect(expanded.textContent).not.toMatch(/冷藏室|检修间|周衡休息室/)
      await h.d.button('关闭')
      expect(h.view()).toBe(before); expect(h.setItem).not.toHaveBeenCalled()
      expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
    } finally { await h.unmount() }
  })
})
