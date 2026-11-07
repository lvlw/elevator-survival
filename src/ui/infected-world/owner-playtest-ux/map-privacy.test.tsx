import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'
import { KnowledgeMap } from '../components/knowledge-map'
import { MissionGuide } from '../components/mission-guide'
import { travelDestination } from '../map/projection'
import { mountUi } from '../test-fixtures'

it('an unresolved route row never manufactures a destination, map marker or task locator', async () => {
  const h = await mountUi()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await h.d.setup()
    await h.d.send('进入封锁区')
    const view = h.view()
    // TEST-only malformed public projection. The original row can be read as text.
    const map = { ...view.map, routes: [...view.map.routes, {
      from: '医院 / 电梯前室', to: '供电所 / 转运支路柜', passable: true as const, observation: 'current' as const,
    }] }
    await act(async () => root.render(<><KnowledgeMap map={map} />
      <MissionGuide view={{ ...view, map }} detail onLocate={() => { throw new Error('Unexpected locator') }} /></>))
    expect(host.querySelector('.iw-map-canvas')?.textContent).not.toMatch(/供电所|转运支路柜/)
    expect(host.querySelector('.iw-mission-cards')?.textContent).not.toMatch(/供电所|转运支路柜/)
    expect(host.querySelector('.iw-map-routes')?.textContent).toContain('供电所 / 转运支路柜')
    expect(travelDestination(map, '转运支路柜')).toBeNull()
  } finally {
    await act(async () => root.unmount())
    host.remove()
    await h.unmount()
  }
})
