import {afterEach,describe,expect,it,vi} from 'vitest'
import {current,request,coldSaved,fixture,entered,bodyBoundary,atDay,maintenanceReady,installBoundary,harness,start} from './combat-test-fixtures'
import {simultaneous} from '../residence-save/combat-review-simultaneous-fixtures'
import {action,repair,move} from './combat-test-routes'
import {observe,expectSaveOnly,record} from './combat-test-observers'
afterEach(()=>vi.restoreAllMocks())
describe('S07 S09 final terminal consumption and F-D',()=>{
  it.each(['killed','living','heal'] as const)('%s enemy terminal branch is saved once and restored without closing twice',kind=>{
    const f=kind==='killed'?simultaneous():{h:entered('orderly',{hp:1}),beforeLast:null}
    const before=kind==='killed'?f.beforeLast!:f.h.value,h=installBoundary(before,f.h.deps),o=observe(h);o.clear()
    h.faults.write=true
    const slot=before.carried.quickSlots.slots[0]
    action(h,kind==='heal'?{kind:'use-quick-slot-item',quickSlotIndex:0}:kind==='killed'?{kind:'metal-pipe-basic-attack'}:{kind:'defend'},
      kind==='heal'?{instanceId:slot!.instanceId}:{})
    const v=current(h),counts=o.counts();record('F-D:'+kind+':failed-close',counts)
    expect(v.phase).toBe('dead');expect(v.site).toBeNull();expect(v.battle).toBeNull();expect(v.receipts).toHaveLength(1)
    expect(v.receipts[0]).toMatchObject({outcome:'death',reward:0,penalty:0,steps:[]})
    expect(v.archives[0].site.pending).toEqual(kind==='killed'?{kind:'none'}:{kind:'combat-required',enemyId:'orderly'})
    expect(v.battles).toHaveLength(0);expect(v.character.revision).toBe(before.character.revision+1)
    expect(counts).toMatchObject({combat:1,ctb:1,ctbPlan:1,ctbReduce:1,death:1,terminate:1,settle:1,write:1,current:1,batches:1,g1Cycle:0})
    o.clear();h.faults.write=false;h.owner.retrySave();expectSaveOnly(o.counts());record('F-D:'+kind+':retry',o.counts())
    expect(current(h)).toBe(v);expect(current(coldSaved(h))).toEqual(v)
    expect(()=>h.owner.dispatch(request(h,'rest'))).toThrow()
  })
  it('stable immediate maintenance death is already complete and is not consumed as combat death',()=>{
    const {h:f,v}=maintenanceReady(),before=bodyBoundary(v,f.deps,{energy:1,condition:{...v.character.body.condition,currentHealth:1,bleeding:true}})
    const h=installBoundary(before,f.deps),o=observe(h);o.clear();h.faults.write=true
    repair(h);const v4=current(h);expect(v4.phase).toBe('dead');expect(v4.receipts[0].source).toBe('supply-death')
    expect(o.counts()).toMatchObject({maintenance:1,sharedMaintenance:1,g1Action:1,death:0,terminate:1,settle:1,current:1,write:1,batches:1})
    record('F-D:maintenance-death',o.counts());o.clear();h.faults.write=false;h.owner.retrySave();expectSaveOnly(o.counts())
    expect(current(coldSaved(h))).toEqual(v4)
  })
  it.each([1,7])('normal Day%i H0 withdrawal preserves actual empty G1 steps',day=>{
    const f=fixture(),before=day===7?atDay(f.value,f,7):f.value,h=installBoundary(before,f.deps),o=observe(h);o.clear()
    h.faults.write=true;h.owner.dispatch(request(h,'terminal',{kind:'withdraw'}))
    const v=current(h);expect(v.phase).toBe('living-hub');expect(v.receipts[0].steps).toEqual([])
    expect(v.character.cycle).toBe(before.character.cycle);expect(v.character.body).toEqual(before.character.body)
    expect(o.counts()).toMatchObject({g1Cycle:1,sharedTerminal:1,terminate:1,current:1,write:1,batches:1})
    expect(o.spies.g1Cycle.mock.calls[0][1]).toMatchObject({kind:'normal-return'})
    record('F-D:normal-H0-Day'+day,o.counts())
    o.clear();h.faults.write=false;h.owner.retrySave();expectSaveOnly(o.counts());expect(current(coldSaved(h))).toEqual(v)
  })
  it.each([false,true])('Day7 stable deadline bleeding=%s keeps real cycle/death short circuit',bleeding=>{
    const f=fixture(),day=atDay(f.value,f,7),atH1=f.move(day,'H1').snapshot
    const before=bleeding?bodyBoundary(atH1,f.deps,{condition:{...atH1.character.body.condition,currentHealth:1,bleeding:true}}):atH1
    const h=installBoundary(before,f.deps),o=observe(h);o.clear();h.faults.write=true
    h.owner.dispatch(request(h,'terminal',{kind:'deadline'}));const v=current(h)
    expect(v.phase).toBe(bleeding?'dead':'living-hub');expect(v.receipts[0].outcome).toBe(bleeding?'death':'deadline-failure')
    expect(v.receipts[0].steps.length).toBeGreaterThan(0);expect(o.counts()).toMatchObject({g1Cycle:1,sharedTerminal:1,terminate:1,current:1,write:1,batches:1})
    expect(o.spies.g1Cycle.mock.calls[0][1]).toMatchObject({kind:'deadline'})
    record('F-D:deadline-bleeding-'+bleeding,o.counts())
    o.clear();h.faults.write=false;h.owner.retrySave();expectSaveOnly(o.counts());expect(current(coldSaved(h))).toEqual(v)
  })
  it('real stable move death produces final dead once without opening an encounter',()=>{
    const f=fixture(),before=bodyBoundary(f.value,f.deps,{condition:{...f.value.character.body.condition,currentHealth:1,bleeding:true}})
    const h=installBoundary(before,f.deps),o=observe(h);o.clear();move(h,'H1')
    expect(current(h).phase).toBe('dead');expect(current(h).combatDeaths).toEqual([])
    expect(o.counts()).toMatchObject({move:1,g1Action:1,ctb:0,death:0,settle:1,terminate:1,current:1})
  })
})
