import { describe, expect, it } from 'vitest'
import { appHarness, appChoose, appReady, commit } from './test-fixtures'

describe('F05 real read-null and one controlled first creation', () => {
  it('explicit bootstrap/create/depart; repeat mount-style starts do not reissue stock', () => {
    const h = appHarness({ tool: 'lamp', specialty: 'survival' })
    expect(h.app.bootstrap().snapshot.view?.status).toBe('no-current')
    expect(h.app.bootstrap().kind).toBe('rejected'); expect(h.storage.read).toHaveBeenCalledTimes(1)
    h.app.createFirst(); expect(h.app.createFirst().kind).toBe('rejected')
    expect(h.factory).toHaveBeenCalledTimes(1); expect(h.storage.write).toHaveBeenCalledTimes(1)
    expect(h.app.getSnapshot().feed).toEqual([])
    expect(appReady(h.app).first).toEqual({ toolChoices: ['lamp'], specialtyChoices: ['survival'], locked: true })
    commit(h.app, { action: appChoose(h.app, 'depart', '进入封锁区') })
    expect(appReady(h.app).point).toBe('stable-active'); expect(h.factory).toHaveBeenCalledTimes(1)
  })
  it.each(['bad-save', 'read-error'] as const)('%s is blocked without initial regrant', mode => {
    const h = appHarness(mode === 'bad-save' ? { text: '{bad}' } : {})
    if (mode === 'read-error') h.faults.read = true
    h.app.bootstrap(); expect(h.app.createFirst().kind).toBe('rejected')
    expect(h.factory).not.toHaveBeenCalled(); expect(h.storage.write).not.toHaveBeenCalled()
    expect(h.app.getSnapshot().view).not.toHaveProperty('body')
    if (mode === 'read-error') { h.faults.read = false; expect(h.app.retryRead().snapshot.view?.status).toBe('no-current') }
  })
})
