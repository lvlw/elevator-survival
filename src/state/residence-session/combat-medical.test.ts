import {afterEach,describe,expect,it,vi} from 'vitest'
import {harness,current,request,reject,coldSaved,entered,installBoundary,fixture,bodyBoundary} from './combat-test-fixtures'
import {enter,action,move,source,pick,task} from './combat-test-routes'
import {observe,expectSaveOnly,record} from './combat-test-observers'
import {drawIntInclusive} from '../../core/random'
afterEach(()=>vi.restoreAllMocks())
describe('S05 real quick medical units and F-B failure',()=>{
  it('E0 stable self-rescue consumes one real bandage without action bleeding or day refresh',()=>{
    const f=fixture(),v=bodyBoundary(f.value,f.deps,{energy:0,condition:{...f.value.character.body.condition,currentHealth:10,bleeding:true}})
    const h=installBoundary(v,f.deps),slot=current(h).carried.quickSlots.slots[0]!,o=observe(h);o.clear()
    h.owner.dispatch(request(h,'medical',{instanceId:slot.instanceId,quantity:1}))
    expect(current(h).character.body.energy).toBe(0);expect(current(h).character.body.condition.bleeding).toBe(false)
    expect(current(h).character.body.condition.currentHealth).toBe(11)
    expect(current(h).character.body.quotasRemaining).toEqual(v.character.body.quotasRemaining)
    expect(o.counts()).toMatchObject({medical:1,use:1,g1Action:1,g1Cycle:0,current:1,write:1})
    expect(o.spies.g1Action.mock.calls[0][1]).toMatchObject({action:'medical',cost:{kind:'free',amount:0}})
  })
  it('actually acquired quick painkiller persists its effect and unit through failed save and retry',()=>{
    const h=harness({draw:(c,min,max)=>({...drawIntInclusive(c,min,max),
      value:c.streamId.includes('H2-random')?41:c.streamId.includes('residence-combat')?min:max})})
    h.owner.bootstrap();h.owner.createFirst();h.owner.dispatch(request(h,'depart',{commissionId:h.deps.supply.catalog.data.mission.commissionId}))
    move(h,'H1');move(h,'H2');source(h,'H2-search',{method:'dark'});pick(h,'painkiller',0)
    const pain=current(h).carried.backpack.items[0]
    h.owner.dispatch(request(h,'inventory',{kind:'to-quick',instanceId:pain.instanceId,slot:1}))
    move(h,'H1');task(h,'fire-door',{method:'crow',toolInstanceId:current(h).carried.equipment.utility!.instanceId});move(h,'H4')
    action(h,{kind:'metal-pipe-basic-attack'})
    // TEST risk strategy picks the formal risk outcome, never edits wounds.
    const o=observe(h);o.clear();h.faults.write=true
    action(h,{kind:'use-quick-slot-item',quickSlotIndex:1},{instanceId:pain.instanceId,quantity:1})
    expect(current(h).carried.quickSlots.slots[1]).toBeNull();expect(current(h).character.body.condition.painkillerActive).toBe(true)
    expect(o.counts()).toMatchObject({combat:1,ctb:1,use:1,current:1,write:1,batches:1})
    record('F-B:painkiller',o.counts());const latest=current(h);o.clear();h.faults.write=false;h.owner.retrySave()
    expectSaveOnly(o.counts());expect(current(h)).toBe(latest);expect(current(coldSaved(h))).toEqual(latest)
  })
  it('risk-bearing attack, failed bandage save, another failed action and retry keep latest facts',()=>{
    const h=harness({specialty:'survival',draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:min})});enter(h)
    action(h,{kind:'metal-pipe-basic-attack'});const v=current(h),slot=v.carried.quickSlots.slots[0]!,wound=v.character.body.condition.openWounds.find(w=>w.treatment==='untreated')
    const o=observe(h);o.clear();h.faults.write=true
    action(h,{kind:'use-quick-slot-item',quickSlotIndex:0,...(wound?{targetOpenWoundId:wound.id}:{})},{instanceId:slot.instanceId,quantity:1})
    expect(current(h).carried.quickSlots.slots[0]).toBeNull();expect(current(h).choices.firstBandageUsed).toBe(true)
    expect(current(h).dispositions.filter(d=>d.item.instanceId===slot.instanceId)).toHaveLength(1)
    expect(h.owner.getState().persistence).toBe('save-failed')
    action(h,{kind:'defend'});const latest=current(h),counts=o.counts();record('F-B:two-failed-native-actions',counts)
    expect(counts).toMatchObject({combat:2,ctb:2,ctbPlan:2,ctbReduce:2,use:1,current:2,write:2,batches:2})
    expect(counts.draw).toBeGreaterThan(0)
    o.clear();h.faults.write=false;h.owner.retrySave();expect(current(h)).toBe(latest)
    expectSaveOnly(o.counts());record('F-B:retry',o.counts());expect(current(coldSaved(h))).toEqual(latest)
  })
  it.each([0,2,true,1.5,-1])('bad quantity %s never consumes the quick item',quantity=>{
    const h=harness();enter(h);action(h,{kind:'metal-pipe-basic-attack'})
    reject(h,request(h,'combat',{command:{kind:'use-quick-slot-item',quickSlotIndex:0},
      instanceId:current(h).carried.quickSlots.slots[0]!.instanceId,quantity}))
  })
  it('wrong instance, wrong target, no target and missing instance are rejected without refill',()=>{
    const h=harness();enter(h);const id=current(h).carried.quickSlots.slots[0]!.instanceId
    for(const extra of [{instanceId:'foreign'},{},{instanceId:id}])
      reject(h,request(h,'combat',{command:{kind:'use-quick-slot-item',quickSlotIndex:0},...extra}))
    action(h,{kind:'metal-pipe-basic-attack'})
    reject(h,request(h,'combat',{instanceId:id,command:{kind:'use-quick-slot-item',quickSlotIndex:0,targetOpenWoundId:'foreign'}}))
    action(h,{kind:'use-quick-slot-item',quickSlotIndex:0},{instanceId:id})
    expect(current(h).carried.quickSlots.slots[0]).toBeNull()
    reject(h,request(h,'combat',{instanceId:id,command:{kind:'use-quick-slot-item',quickSlotIndex:0}}))
  })
  it('real bandage heal followed by enemy damage can commit only final dead',()=>{
    const f=entered('orderly',{hp:1}),h=installBoundary(f.value,f.deps),o=observe(h);o.clear()
    const slot=current(h).carried.quickSlots.slots[0]!
    action(h,{kind:'use-quick-slot-item',quickSlotIndex:0},{instanceId:slot.instanceId})
    expect(current(h).phase).toBe('dead');expect(current(h).combatDeaths[0].decision.trace[0].kind).toBe('heal')
    expect(o.counts()).toMatchObject({death:1,terminate:1,settle:1,current:1,write:1,batches:1,use:1})
    expect(current(coldSaved(h))).toEqual(current(h))
  })
})
