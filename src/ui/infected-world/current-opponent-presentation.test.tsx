import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { boundaryRecords } from '../../../docs/engineering/world-integration/preplay/browser-owner/validation/browser-cases'
import { mountPresentation } from './committed-presentation-test-fixtures'
import { BattleStage } from './components/battle-stage'

import { installEnemyArtImages } from './enemy-art-test-fixtures'
let images: ReturnType<typeof installEnemyArtImages>
beforeEach(() => { images = installEnemyArtImages() })
afterEach(() => { images.restore(); vi.restoreAllMocks(); document.body.replaceChildren() })

describe('C1 opponent comes exclusively from current formal A', () => {
  it.each([['orderly', '感染护工'], ['porter', '感染装卸工'], ['technician', '感染技术员']] as const)('%s has its exact safe name in title, neutral pending and approved ready image aria', async (enemy, name) => {
    const h = await mountPresentation({ records: boundaryRecords(enemy) })
    try {
      expect(h.view().combat!.opponent.name).toBe(name); expect(h.host.querySelector('.iw-enemy-info h2')?.textContent).toBe(name)
      expect(h.host.querySelector(`[aria-label="${name}中性占位"]`)?.textContent).toContain(name)
      expect(h.host.querySelector('.iw-battle img.iw-enemy-art-raster')).toBeNull(); await images.finish()
      expect(h.host.querySelector(`[aria-label="${name} · 完好"]`)).not.toBeNull()
      expect(h.host.querySelector('.iw-battle img.iw-enemy-art-raster')).not.toBeNull(); expect(h.cue().textContent).toBe('')
    } finally { await h.unmount() }
  })
  it('unknown and five stages are explicit schema/renderer branches, never location guesses or death inference', async () => {
    const h = await mountPresentation({ records: boundaryRecords('porter') }), host = document.createElement('div'), root = createRoot(host)
    document.body.append(host)
    try {
      const view = h.view()
      for (const stage of ['healthy', 'wounded', 'severely-wounded', 'critical', 'incapacitated'] as const) {
        const altered = { ...view, location: { ...view.location!, name: '隔离走廊' }, combat: { ...view.combat!, enemyStage: stage,
          opponent: { kind: 'unknown' as const, visualKey: null, name: '当前对手' as const } } }
        await act(async () => root.render(<BattleStage view={altered} onAction={() => { throw new Error('read-only test') }} />))
        expect(host.querySelector('h2')?.textContent).toBe('当前对手'); expect(host.querySelector('[aria-label="当前对手中性占位"]')).not.toBeNull()
        expect(host.textContent).not.toContain('感染护工'); expect(host.textContent).not.toContain('玩家死亡')
        expect(host.querySelector('[aria-label="战斗行动"]')).not.toBeNull()
        if (stage === 'incapacitated') expect(host.textContent).toContain('失去能力')
      }
    } finally { await act(async () => root.unmount()); host.remove(); await h.unmount() }
  })
})
