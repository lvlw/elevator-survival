import {afterEach,describe,expect,it,vi} from 'vitest'
import {harness,fixture,entered,coldRecord,current,installBoundary,request,mutable} from './combat-test-fixtures'
import {h0Return} from '../residence-save/combat-test-fixtures'
import {simultaneous,livingEnemyDeath} from '../residence-save/combat-review-simultaneous-fixtures'
import {observe,record} from './combat-test-observers'
afterEach(()=>vi.restoreAllMocks())
describe('S03 independent cold expected and five complete points',()=>{
  it.each([undefined,false,[],{},Promise.resolve({}),{then(){}}])('malformed cold provider result %# blocks before read',bad=>{
    const f=fixture(),h=coldRecord(f.initial,f.deps);h.coldProvider.mockReturnValue(bad)
    expect(h.owner.bootstrap().status).toBe('blocked');expect(h.storage.read).not.toHaveBeenCalled();expect(h.owner.createFirst).toThrow()
  })
  const rows=()=>{const f=fixture(),b=entered(),dead=simultaneous();return [
    {label:'first-hub',value:f.initial,deps:f.deps},{label:'stable-active',value:f.value,deps:f.deps},
    {label:'battle-decision',value:b.value,deps:b.deps},{label:'living-hub',value:h0Return(f),deps:f.deps},
    {label:'dead-killed-enemy',value:dead.end,deps:dead.h.deps}]}
  it.each([0,1,2,3,4])('complete point %i loads once without replay or save',i=>{
    const row=rows()[i],h=coldRecord(row.value,row.deps),o=observe(h);o.clear()
    expect(h.owner.bootstrap().current).toEqual(row.value)
    const counts=o.counts();record('cold:'+row.label,{...counts,coldInstall:1})
    for(const [key,n] of Object.entries(counts))expect(n,key).toBe(['read','coldExpected','decode','aggregate'].includes(key)?1:0)
    expect(h.owner.bootstrap).toThrow();expect(h.owner.retryRead).toThrow();expect(h.owner.createFirst).toThrow()
    expect(Object.isFrozen(current(h))).toBe(true)
  })
  it('living enemy death retains actual pending on cold load',()=>{
    const f=livingEnemyDeath(),h=coldRecord(f.end,f.h.deps);h.owner.bootstrap()
    expect(current(h).archives[0].site.pending).toEqual({kind:'combat-required',enemyId:'orderly'})
  })
  it('cold provider fixes facts before read and never receives candidate arguments',()=>{
    const f=entered(),h=coldRecord(f.value,f.deps)
    h.hooks.read=()=>{expect(h.coldProvider).toHaveBeenCalledTimes(1);expect(h.coldProvider.mock.calls[0]).toEqual([])}
    h.owner.bootstrap();expect(current(h)).toEqual(f.value)
  })
  it.each(['version','execution','battle','phase'])('invalid external %s is blocked without fallback',fault=>{
    const f=entered(),h=coldRecord(f.value,f.deps),e=mutable(h.coldProvider())
    if(!e||typeof e!=='object')throw new Error('TEST expected')
    const bad=e as ReturnType<typeof mutable<ReturnType<typeof import('../residence-save/combat-test-fixtures').expectation>>>
    if(fault==='version')bad.versions.rulesVersion='wrong'
    if(fault==='execution')bad.initial.execution.seed='wrong'
    if(fault==='battle')bad.battle!.battleId='wrong'
    if(fault==='phase')bad.phase='dead'
    h.coldProvider.mockReturnValue(bad)
    expect(h.owner.bootstrap().status).toBe('blocked');expect(h.owner.createFirst).toThrow()
    h.setDisk(null);expect(h.owner.retryRead().status).toBe('blocked');expect(h.factory).not.toHaveBeenCalled()
  })
  it('invalid expected shape and getters are rejected before reading bytes',()=>{
    const f=fixture(),h=coldRecord(f.initial,f.deps),getter=vi.fn(()=>0),bad={}
    Object.defineProperty(bad,'revision',{enumerable:true,get:getter});h.coldProvider.mockReturnValue(bad)
    expect(h.owner.bootstrap().status).toBe('blocked');expect(h.storage.read).not.toHaveBeenCalled();expect(getter).not.toHaveBeenCalled()
  })
  it('unrecognized implementation exception is not disguised as a business rejection',()=>{
    const f=fixture(),h=coldRecord(f.initial,f.deps),error=new TypeError('provider implementation bug')
    h.coldProvider.mockImplementationOnce(()=>{throw error});expect(h.owner.bootstrap).toThrow(error)
    expect(h.owner.getState().current).toBeNull();expect(h.storage.read).not.toHaveBeenCalled()
    expect(h.owner.retryRead().status).toBe('ready')
  })
  it.each(['first','stable','battle'])('%s cold continuation equals the uninterrupted P branch',point=>{
    const f=point==='battle'?entered():fixture(),v=point==='first'?f.initial:f.value
    const a=installBoundary(v,f.deps),b=installBoundary(v,f.deps)
    const fields=point==='first'?{commissionId:f.deps.supply.catalog.data.mission.commissionId}:point==='battle'?{command:{kind:'defend'}}:{edgeId:'H0-H1:forward'}
    const family=point==='first'?'depart':point==='battle'?'combat':'move'
    a.owner.dispatch(request(a,family,fields));b.owner.dispatch(request(b,family,fields));expect(current(a)).toEqual(current(b))
  })
})
