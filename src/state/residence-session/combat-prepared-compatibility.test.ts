import { expect, it, vi } from 'vitest'
import { harness, request } from './combat-test-fixtures'
import { buildCombatSession } from './combat-session'
import { createResidenceSessionDomain } from './controlled'
it('legacy and prepared return identical full states and exact encoded strings for initial and departure', () => {
  const old = harness(); old.owner.bootstrap(); old.owner.createFirst()
  const packets: string[] = [], prepared = buildCombatSession(createResidenceSessionDomain(), { policy: old.policy,
    startup: 'first', provideInitialMaterials: () => old.materials,
    storage: { mode: 'prepared', read: () => null, writePrepared: p => { packets.push(p.text) } } })
  prepared.bootstrap(); prepared.createFirst()
  expect(prepared.getState().current).toEqual(old.owner.getState().current); expect(packets[0]).toBe(old.disk())
  const command = request(old,'depart',{commissionId:old.deps.supply.catalog.data.mission.commissionId})
  old.owner.dispatch(command); prepared.dispatch(command)
  expect(prepared.getState().current).toEqual(old.owner.getState().current); expect(packets[1]).toBe(old.disk())
})
it.each(['both','async','extra','mode'] as const)('rejects invalid %s composition before domain claim or IO', kind => {
  const h = harness(), domain = createResidenceSessionDomain(), read = vi.fn(()=>null), write = vi.fn()
  const bad = kind === 'both' ? {mode:'prepared',read,write,writePrepared:write} : kind === 'async' ? {mode:'prepared',read,writePrepared:async()=>{}} :
    kind === 'extra' ? {mode:'prepared',read,writePrepared:write,extra:1} : {mode:'unknown',read,writePrepared:write}
  expect(()=>buildCombatSession(domain,{...h.composition,storage:bad} as never)).toThrowError(expect.objectContaining({code:'INVALID_COMPOSITION'}))
  expect(read).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled()
  expect(()=>buildCombatSession(domain,{...h.composition,storage:{read,write}})).not.toThrow()
})
