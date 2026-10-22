import { describe, expect, it } from 'vitest'
import { fixture, bodyBoundary } from '../../state/residence-session/combat-test-fixtures'
import { normalize } from '../../state/residence-session/player-test-fixtures'
import { nativePlayer } from '../../state/residence-session/player-test-routes'
import { createPreplayController } from './controller'
import { appFromValue, appChoose, appReady, commit } from './test-fixtures'

describe('F08 full presentation, metadata, confirmation and Feed noninterference', () => {
  it('same-band hidden state remains equal without deleting actions, selectors, drafts or Feed', () => {
    const f = fixture({ hp: 1, bleeding: true })
    const rows = [61, 89].map((infectionProgress, n) => {
      const v = bodyBoundary(f.value, f.deps, { infectionProgress,
        condition: { ...f.value.character.body.condition, pendingInfectionExposures: n * 2 } })
      const h = appFromValue(v, f.deps), request = { action: appChoose(h.app, 'move', '大厅') }
      h.app.beginDraft(request)
      const before = normalize(h.app.getSnapshot()), preview = h.app.preview(request), asked = h.app.execute(request)
      expect(asked.kind).toBe('confirmation-required')
      h.app.cancel()
      const item = appReady(h.app).carried.find(i => i.name === '绷带')!
      commit(h.app, { action: appChoose(h.app, 'medical', '使用药食'), item: item.selector })
      return { before, preview, confirmation: asked.confirmation, after: normalize(h.app.getSnapshot()) }
    })
    expect(rows[0]).toEqual(rows[1])
    expect(JSON.stringify(rows)).not.toMatch(/infectionProgress|pendingInfection|suppression|streamId|drawIndex|riskPercent|runId|woundId|instanceId/)
  })
  it('opposite real default seeds have the same full pre-source presentation and metadata, then reveal different real items', () => {
    const pair = ['E03-A-seed-01', 'E03-A-seed-03'].map(seed => {
      const h = nativePlayer(seed), app = createPreplayController(h)
      app.bootstrap(); app.createFirst(); commit(app, { action: appChoose(app, 'depart', '进入封锁区') })
      commit(app, { action: appChoose(app, 'move', '大厅') })
      const request = { action: appChoose(app, 'source', '大厅搜索', 'dark') }
      const snapshot = normalize(app.getSnapshot()), metadata = app.preview(request)
      commit(app, request)
      return { snapshot, metadata, items: appReady(app).ground.map(i => i.name), app }
    })
    expect(pair[0].snapshot).toEqual(pair[1].snapshot); expect(pair[0].metadata).toEqual(pair[1].metadata)
    expect(pair[0].items).not.toEqual(pair[1].items)
    for (const p of pair) expect(JSON.stringify(p.app.getSnapshot().feed)).not.toMatch(/seed|roll|risk|exposure|感染暴露|runId|Effect/)
  })
})
