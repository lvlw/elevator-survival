import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KnowledgeMap, type MapScope } from './components/knowledge-map'
import type { KnownMap } from './map/projection'
import { mountUi } from './test-fixtures'
import { observeBrowser } from '../../app/infected-browser/test-observers'
import { CHECKPOINT_KEY } from '../../app/infected-browser/schema'

afterEach(() => vi.restoreAllMocks())
type Route = KnownMap['routes'][number]
const name = (room: string, place = '医院') => `${place} / ${room}`
const row = (from: string, to: string, passable: Route['passable'] = true, observation: Route['observation'] = 'current'): Route => ({ from, to, passable, observation })
const pair = (a: string, b: string) => [row(a, b), row(b, a, false, 'last-observed')]
function map(routes: readonly Route[], current = name('大厅')): KnownMap {
  return { nodes: [...new Set(routes.flatMap(r => [r.from, r.to]))].map(full => {
    const [place, name] = full.split(' / ')
    return { place, name, current: full === current, visited: full === current }
  }), routes: [...routes] }
}
const hall = name('大厅'), control = name('后勤控制间'), security = name('保安室'), rest = name('值班休息室')
const original = map([...pair(name('电梯前室'), hall), ...pair(hall, security), ...pair(hall, control)])
const extra = pair(security, rest)
const label = (a: string, b: string) => `查看联系 ${[a, b].sort().join(' 与 ')}`

async function renderer(controlled: boolean, compact: boolean) {
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  function Harness({ value }: { value: KnownMap }) {
    const [scope, setScope] = useState<MapScope>({ anchor: '医院', world: false, place: '医院', selected: null })
    return <KnowledgeMap map={value} compact={compact} {...(controlled ? { scope, onScope: setScope } : {})} target={{ place: '医院', name: '后勤控制间' }} />
  }
  const click = async (aria: string, key?: string) => {
    const element = [...host.querySelectorAll<HTMLElement | SVGGElement>('[role="button"]')].find(e => e.getAttribute('aria-label') === aria)
    expect(element, aria).toBeDefined()
    await act(async () => { element!.dispatchEvent(key ? new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }) : new MouseEvent('click', { bubbles: true })) })
  }
  return { host, click, details: () => host.querySelector('.iw-map-selection'),
    render: async (value: KnownMap) => { await act(async () => root.render(<Harness value={value} />)) },
    button: async (text: string) => {
      const button = [...host.querySelectorAll('button')].find(b => b.textContent === text)
      expect(button, text).toBeDefined(); await act(async () => button!.click())
    },
    close: async () => { await act(async () => root.unmount()); host.remove() },
  }
}

// Synthetic public DTO boundary cases use real React DOM and preserved hook state.
// They are separate from the formal player-query/producer chain below.
describe.each([{ controlled: false, compact: true }, { controlled: true, compact: false }])('R1 real React preserved selection $controlled/$compact', ({ controlled, compact }) => {
  it('insertion/reordering keeps the same endpoints and reads latest directional observations', async () => {
    const r = await renderer(controlled, compact)
    try {
      await r.render(original); await r.click(label(hall, control), 'Enter')
      expect(r.details()?.textContent).toContain(`${hall} → ${control}：已知可通行，当前观察`)
      const inserted = map([...extra, ...original.routes])
      await r.render(inserted)
      expect(r.details()?.textContent).toContain(control)
      expect(r.details()?.textContent).not.toContain(rest)
      const reordered = map([...inserted.routes].reverse().map(route => route.from === hall && route.to === control ? { ...route, passable: 'unknown', observation: 'last-observed' } : route.from === control && route.to === hall ? { ...route, passable: true, observation: 'current' } : route))
      await r.render(reordered)
      expect(r.details()?.textContent).toContain(`${hall} → ${control}：通行未知，上次观察`)
      expect(r.details()?.textContent).toContain(`${control} → ${hall}：已知可通行，当前观察`)
      expect(r.details()?.textContent).not.toContain(rest)
    } finally { await r.close() }
  })
  it('deletion with reused indices closes details and later reappearance does not revive them', async () => {
    const r = await renderer(controlled, compact)
    try {
      await r.render(original); await r.click(label(hall, control))
      await r.render(map([...original.routes.slice(0, 4), ...extra]))
      expect(r.details()).toBeNull()
      await r.render(original); expect(r.details()).toBeNull()
      await r.click(label(hall, control), ' '); expect(r.details()?.textContent).toContain(control)
    } finally { await r.close() }
  })
  it('ambiguous or missing full-name endpoints clear the selection without guessing or reviving', async () => {
    const r = await renderer(controlled, compact)
    try {
      for (const nodes of [[...original.nodes, { ...original.nodes.find(n => n.name === '后勤控制间')! }], original.nodes.filter(n => n.name !== '后勤控制间')]) {
        await r.render(original); await r.click(label(hall, control))
        await r.render({ ...original, nodes }); expect(r.details()).toBeNull()
        expect(r.host.querySelector('.iw-map-routes')?.textContent).toContain(control)
        await r.render(original); expect(r.details()).toBeNull()
      }
    } finally { await r.close() }
  })
  it('layer switches, inspected buildings and actual anchor changes cannot retain or revive old details', async () => {
    const r = await renderer(controlled, compact)
    const hotel = name('酒店入口', '酒店'), values = map([...original.routes, ...pair(name('电梯前室'), hotel), ...pair(hotel, name('安置点', '酒店'))])
    try {
      await r.render(values); await r.click(label(hall, control))
      await r.button('世界'); expect(r.details()).toBeNull()
      await r.click(label('医院', '酒店')); expect(r.details()?.textContent).toContain(hotel)
      await r.click('查看酒店内部'); expect(r.details()).toBeNull()
      await r.button('回当前位置'); expect(r.details()).toBeNull()
      await r.click(label(hall, control)); await r.render(map(values.routes, hotel))
      expect(r.details()).toBeNull(); expect(r.host.querySelector('.iw-known-map')?.getAttribute('data-map-place')).toBe('酒店')
      await r.render(values); expect(r.details()).toBeNull()
      expect(r.host.querySelector('[data-target="true"]')?.getAttribute('aria-label')).toContain(control)
      await r.click(`查看${hall} · 当前位置`); expect(r.details()?.textContent).toContain(`${hall} · 当前位置`)
    } finally { await r.close() }
  })
  it('world channels also bind building pairs through inserted/reordered cross-building routes', async () => {
    const r = await renderer(controlled, compact), hotel = name('入口', '酒店'), power = name('配线廊', '供电所')
    const values = map([...original.routes, ...pair(name('电梯前室'), hotel)])
    try {
      await r.render(values); await r.button('世界'); await r.click(label('医院', '酒店'))
      await r.render(map([...pair(hotel, power), ...values.routes].reverse()))
      expect(r.details()?.textContent).toContain(`${name('电梯前室')} → ${hotel}`)
      expect(r.details()?.textContent).not.toContain(power)
      await r.render(map([...original.routes, ...pair(hotel, power)])); expect(r.details()).toBeNull()
      await r.render(values); expect(r.details()).toBeNull()
    } finally { await r.close() }
  })
})

it('formal same-building knowledge expansion preserves the selected corridor through the original React move/query/save chain', async () => {
  const observed = observeBrowser(), h = await mountUi()
  try {
    await h.d.setup(); await h.d.send('进入封锁区'); await h.d.move('大厅')
    const before = h.view(), beforeIndex = before.map.routes.findIndex(r => r.from === hall && r.to === control)
    expect(beforeIndex).toBeGreaterThanOrEqual(0)
    const link = h.host.querySelector<SVGGElement>(`[aria-label="${label(hall, control)}"]`)!
    expect(link).not.toBeNull(); observed.clear(); h.setItem.mockClear(); h.entropy.mockClear()
    await h.flush(() => link.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(h.host.querySelector('.iw-map-selection')?.textContent).toContain(control)
    expect(h.view()).toBe(before); expect(h.setItem).not.toHaveBeenCalled(); expect(h.entropy).not.toHaveBeenCalled()
    expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
    await h.d.move('保安室')
    const after = h.view(), afterIndex = after.map.routes.findIndex(r => r.from === hall && r.to === control)
    expect(after.location).toEqual({ place: '医院', name: '保安室' })
    expect(after.map.routes.length).toBeGreaterThan(before.map.routes.length)
    expect(afterIndex).not.toBe(beforeIndex)
    expect(after.map.nodes.some(n => n.name === '值班休息室')).toBe(true)
    const text = h.host.querySelector('.iw-map-selection')?.textContent
    expect(text).toContain(`${hall} → ${control}`); expect(text).not.toContain(rest)
    expect(observed.counts()).toMatchObject({ dispatch: 1, current: 1, notices: 1 })
    expect(h.setItem.mock.calls.filter(([key]) => key === CHECKPOINT_KEY)).toHaveLength(1)
    // All subsequent map viewing is readonly beside the real owner.
    observed.clear(); h.setItem.mockClear(); h.entropy.mockClear()
    await h.d.button('世界'); await h.d.button('本地'); await h.d.button('回当前位置')
    expect(h.host.querySelector('.iw-map-selection')).toBeNull()
    expect(h.view()).toBe(after); expect(h.setItem).not.toHaveBeenCalled(); expect(h.entropy).not.toHaveBeenCalled()
    expect(observed.counts()).toMatchObject({ dispatch: 0, current: 0, notices: 0, draw: 0 })
  } finally { await h.unmount() }
})
