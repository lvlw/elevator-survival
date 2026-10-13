import {afterEach,describe,expect,it,vi} from 'vitest'
import {harness,current,start,coldSaved,request} from './combat-test-fixtures'
import {enter,move,action,repair,rest,maintenanceEntry,win} from './combat-test-routes'
import {observe,expectSaveOnly,record} from './combat-test-observers'
import {drawIntInclusive} from '../../core/random'
afterEach(()=>vi.restoreAllMocks())
describe('S09 independent four failure chains and durable limits',()=>{
  it('F-A true null initialization departure and entry each commit once despite failed writes',()=>{
    const h=harness(),o=observe(h);o.clear();h.faults.write=true;enter(h)
    const v=current(h);expect(v.battle).not.toBeNull()
    const counts=o.counts();record('F-A:initial-launch-entry',counts)
    expect(counts).toMatchObject({initial:1,depart:1,move:2,task:1,activate:1,materials:1,read:1,current:5,write:5,batches:5})
    expect(h.saved()).toBeNull();expect(h.owner.createFirst).toThrow()
    o.clear();h.faults.write=false;h.owner.retrySave();expectSaveOnly(o.counts());record('F-A:retry',o.counts())
    expect(current(h)).toBe(v);expect(current(coldSaved(h))).toEqual(v)
  })
  it.each(['retreat','victory'] as const)('F-C %s failure immediate repair rest reentry keeps resources/history',exit=>{
    const h=harness({draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:c.streamId.includes('H1-random')?41:max})})
    maintenanceEntry(h);const o=observe(h);o.clear();h.faults.write=true
    if(exit==='retreat'){action(h,{kind:'metal-pipe-basic-attack'});action(h,{kind:'escape'})}else win(h)
    const closed=current(h).battles[0]
    repair(h);const repaired=current(h);expect(repaired.battles[0]).toEqual(closed)
    rest(h)
    if(exit==='retreat'){move(h,'H4');win(h)}
    const latest=current(h),counts=o.counts();record('F-C:'+exit+':failed-chain',counts)
    expect(counts).toMatchObject({maintenance:1,sharedMaintenance:1,recipe:1,g1Cycle:1,rest:1})
    expect(counts.write).toBe(counts.current);expect(counts.batches).toBe(counts.current)
    expect(counts.write).toBeGreaterThanOrEqual(4);expect(latest.battles[0]).toEqual(closed)
    o.clear();h.faults.write=false;h.owner.retrySave();expectSaveOnly(o.counts());record('F-C:'+exit+':retry',o.counts())
    expect(current(h)).toBe(latest);expect(current(coldSaved(h))).toEqual(latest)
  })
  it('a crashed owner can only cold-load older successfully written bytes, not newer failed memory',()=>{
    const h=harness();start(h);const saved=current(h);h.faults.write=true;move(h,'H1');const unsaved=current(h)
    expect(unsaved.character.revision).toBe(saved.character.revision+1)
    const next=coldSaved(h);expect(current(next)).toEqual(saved);expect(current(next)).not.toEqual(unsaved)
    expect(next.storage.write).not.toHaveBeenCalled();expect(next.draw).not.toHaveBeenCalled()
  })
  it.each([false,{then(){}},Promise.resolve()])('nonvoid synchronous write %# is save-failed but keeps current',returnValue=>{
    const h=harness();h.owner.bootstrap();h.storage.write.mockImplementationOnce((()=>returnValue) as unknown as ()=>void)
    const result=h.owner.createFirst();expect(result.persistence).toBe('save-failed');expect(current(h).phase).toBe('first-hub')
    const before=current(h);h.owner.retrySave();expect(current(h)).toBe(before);expect(h.listener).toHaveBeenCalledTimes(1)
  })
  it('throwing and thenable listeners fail independently and cannot undo the complete commit',()=>{
    const h=harness();h.owner.bootstrap();h.owner.subscribe(()=>{throw new Error('listener')})
    h.owner.subscribe((()=>Promise.resolve()) as ()=>void);const last=vi.fn();h.owner.subscribe(last)
    const result=h.owner.createFirst();expect(result.notificationErrors).toHaveLength(2);expect(last).toHaveBeenCalledTimes(1)
    expect(last.mock.calls[0][0].current).toBe(current(h));expect(Object.isFrozen(current(h))).toBe(true)
    expect(()=>{(current(h) as {balance:number}).balance=999}).toThrow()
  })
})
