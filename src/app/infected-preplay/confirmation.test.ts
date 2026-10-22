import { describe, expect, it } from 'vitest'
import { fixture } from '../../state/residence-session/combat-test-fixtures'
import { counts, choose } from '../../state/residence-session/player-test-fixtures'
import { appFromValue, appChoose, appReady } from './test-fixtures'

describe('F03 F07 bound one-use protection', () => {
  it('guaranteed complete paid death with a real free alternative waits for explicit confirmation exactly once', () => {
    const f = fixture({ hp: 1, bleeding: true }), h = appFromValue(f.value, f.deps)
    const r = { action: appChoose(h.app, 'move', '大厅') }, n = counts(h), count = h.dispatch.mock.calls.length
    const asked = h.app.execute(r)
    expect(asked.kind).toBe('confirmation-required'); expect(counts(h)).toEqual(n)
    expect(h.app.confirm({ confirmation: 'preplay' }).kind).toBe('rejected')
    expect(h.app.confirm(asked.confirmation!).kind).toBe('committed')
    expect(appReady(h.app).point).toBe('dead')
    expect(h.dispatch).toHaveBeenCalledTimes(count + 1)
    expect(counts(h)).toEqual({ ...n, writes: n.writes + 1, notices: n.notices + 1 })
    expect(h.app.confirm(asked.confirmation!).kind).toBe('rejected'); expect(h.dispatch).toHaveBeenCalledTimes(count + 1)
  })
  it('cancel protects zero gameplay; unknown or ordinary parameter selection is not universally confirmed', () => {
    const f = fixture({ hp: 1, bleeding: true }), h = appFromValue(f.value, f.deps), n = counts(h)
    const asked = h.app.execute({ action: appChoose(h.app, 'move', '大厅') })
    h.app.cancel(); expect(h.app.confirm(asked.confirmation!).kind).toBe('rejected'); expect(counts(h)).toEqual(n)
    const item = appReady(h.app).carried.find(i => i.name === '绷带')!
    expect(h.app.execute({ action: appChoose(h.app, 'medical', '使用药食'), item: item.selector }).kind).toBe('committed')
  })
  it('still-legal static action ID cannot reuse old confirmation after an external formal free command', () => {
    const f = fixture({ hp: 11 }), h = appFromValue(f.value, f.deps)
    const asked = h.app.execute({ action: appChoose(h.app, 'terminal', '失败止损返回') })
    expect(asked.kind).toBe('confirmation-required')
    const bandage = appReady(h.app).carried.find(i => i.name === '绷带')!
    h.player.execute({ action: choose(h.player, 'medical', '使用药食'), item: bandage.selector })
    h.app.synchronize(); const n = counts(h), d = h.dispatch.mock.calls.length
    expect(appReady(h.app).terminal.eligibility.withdraw).toBe(true)
    expect(h.app.confirm(asked.confirmation!).kind).toBe('rejected')
    expect(counts(h)).toEqual(n); expect(h.dispatch).toHaveBeenCalledTimes(d)
  })
  it('same-current save retry retains confirmation while a copied or cross-controller token does not bind', () => {
    const f = fixture(), h = appFromValue(f.value, f.deps), other = appFromValue(f.value, f.deps)
    const asked = h.app.execute({ action: appChoose(h.app, 'terminal', '失败止损返回') })
    h.app.retrySave()
    expect(other.app.confirm(asked.confirmation!).kind).toBe('rejected')
    expect(h.app.confirm(JSON.parse(JSON.stringify(asked.confirmation))).kind).toBe('rejected')
    expect(h.app.confirm(asked.confirmation!).kind).toBe('committed')
  })
})
