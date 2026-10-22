import { describe, expect, it, vi } from 'vitest'
import { harness, request, current } from './combat-test-fixtures'
import { buildCombatSession } from './combat-session'
import { createResidenceSessionDomain } from './controlled'
import type { CombatPreparedWrite } from './combat-types'
describe('controlled synchronous prepared persistence', () => {
  it('hands checked frozen expected and exact text to one writer after complete current, then one notice', () => {
    const h = harness(), packets: CombatPreparedWrite[] = [], order: string[] = []
    const writer = vi.fn((packet: CombatPreparedWrite) => {
      expect(current({ owner })).toEqual(JSON.parse(packet.text).state)
      expect(Object.isFrozen(packet)).toBe(true); expect(Object.isFrozen(packet.expected.initial.execution)).toBe(true)
      packets.push(packet); order.push('write')
    })
    const owner = buildCombatSession(createResidenceSessionDomain(), { policy: h.policy, startup: 'first',
      provideInitialMaterials: () => h.materials, storage: { mode: 'prepared', read: () => null, writePrepared: writer } })
    owner.subscribe(() => { order.push('notice') })
    expect(owner.bootstrap().status).toBe('no-save'); owner.createFirst()
    expect(writer).toHaveBeenCalledTimes(1); expect(order).toEqual(['write','notice'])
    expect(packets[0].expected.phase).toBe('first-hub')
    owner.dispatch(request({ owner }, 'depart', { commissionId: h.deps.supply.catalog.data.mission.commissionId }))
    expect(writer).toHaveBeenCalledTimes(2); expect(packets[1].expected.phase).toBe('active-world')
    const value = current({ owner }); owner.retrySave()
    expect(current({ owner })).toBe(value); expect(writer).toHaveBeenCalledTimes(3)
    expect(order).toEqual(['write','notice','write','notice','write'])
    expect(packets[2]).toEqual(packets[1])
  })
  it.each(['throw','value','thenable'] as const)('%s is one failed attempt with newest memory, no fallback or gameplay retry', mode => {
    const h = harness(); let fail = true
    const writer = vi.fn((_p: CombatPreparedWrite): unknown => { if (fail) { if(mode === 'throw')throw new Error('TEST'); return mode === 'value' ? 1 : { then(){} } } })
    const owner = buildCombatSession(createResidenceSessionDomain(), { policy: h.policy, startup: 'first',
      provideInitialMaterials: () => h.materials, storage: { mode: 'prepared', read: () => null, writePrepared: writer as (p: CombatPreparedWrite)=>void } })
    const notices = vi.fn(); owner.subscribe(notices); owner.bootstrap()
    expect(owner.createFirst().persistence).toBe('save-failed'); const v = current({owner})
    expect(notices).toHaveBeenCalledTimes(1); fail = false
    expect(owner.retrySave().persistence).toBe('saved'); expect(current({owner})).toBe(v)
    expect(notices).toHaveBeenCalledTimes(1); expect(writer).toHaveBeenCalledTimes(2)
  })
})
