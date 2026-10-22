import { describe, expect, it } from 'vitest'
import { bodyBoundary, fixture } from './combat-test-fixtures'
import { fromValue, choose, normalize, ready, counts } from './player-test-fixtures'
describe('parameter description privacy', () => {
  it('same current public state and different hidden infection facts have identical descriptions', () => {
    const f = fixture(), pair = [0, 2].map(n => {
      const v = bodyBoundary(f.value, f.deps, { infectionProgress: n ? 20 : 1,
        condition: { ...f.value.character.body.condition, pendingInfectionExposures: n } })
      return fromValue(v, f.deps)
    })
    const descriptions = pair.map(h => h.preplay.describeAction(choose(h.player, 'medical', '使用药食')))
    expect(normalize(descriptions[0])).toEqual(normalize(descriptions[1]))
    expect(JSON.stringify(descriptions)).not.toMatch(/instanceId|woundId|runId|seed|origin|execution|pendingInfection|riskPercent|roll|drawIndex/)
  })
  it('description does not add invisible sources or real IDs to options', () => {
    const f = fixture(), h = fromValue(f.value, f.deps), before = counts(h)
    for (const a of ready(h.player).actions) {
      const d = h.preplay.describeAction(a.selector)
      expect(JSON.stringify(d)).not.toMatch(/instanceId|woundId|runId|seed|origin|execution|H1-search|T1-exchange|sample\.risks/)
    }
    expect(counts(h)).toEqual(before)
  })
})
