import {afterEach,describe,expect,it,vi} from 'vitest'
import {harness,start,current,request,reject,coldSaved} from './combat-test-fixtures'
import {move,task,source,pick,win,maintenanceEntry,repair} from './combat-test-routes'
import {drawIntInclusive} from '../../core/random'
import {numberValue} from '../../core/residence-supply/config'
afterEach(()=>vi.restoreAllMocks())
describe('S06 true stable operations after or before battle',()=>{
  it('toolbox maintenance uses actual metal and electronics, not a recreated full tool',()=>{
    const h=harness({tool:'toolbox'});start(h);move(h,'H1');source(h,'H1-search',{method:'dark'});pick(h,'metal',4);pick(h,'electronic',5)
    const tool=current(h).carried.equipment.utility!
    task(h,'fire-door',{method:'toolbox',toolInstanceId:tool.instanceId})
    const before=current(h),inputs=before.carried.backpack.items.map(i=>({instanceId:i.instanceId,quantity:1}))
    h.owner.dispatch(request(h,'maintenance',{kind:'toolbox',instanceId:tool.instanceId,inputs}))
    expect(current(h).carried.equipment.utility).toEqual(tool);expect(current(h).carried.backpack.items).toHaveLength(0)
    expect(current(h).itemStates.states.find(s=>s.instanceId===tool.instanceId)?.resource).not.toEqual(before.itemStates.states.find(s=>s.instanceId===tool.instanceId)?.resource)
    expect(current(coldSaved(h))).toEqual(current(h))
  })
  it('real stack split merge move drop pickup and quick transfers preserve units and identities',()=>{
    const h=harness();start(h);for(const n of ['H1','H7','L0','L1'])move(h,n)
    task(h,'l1-open',{method:'manual'});source(h,'L1-cabinet');pick(h,'food',4,1);pick(h,'bandage',5,1)
    const before=current(h),food=before.carried.backpack.items.find(i=>i.quantity===2)!,bandage=before.carried.backpack.items.find(i=>i.definitionId==='consumable_bandage')!
    expect(food).toBeDefined();expect(bandage).toBeDefined()
    h.owner.dispatch(request(h,'inventory',{kind:'split',instanceId:food.instanceId,quantity:1,placement:{x:3,y:1,rotated:false}}))
    const child=current(h).carried.backpack.items.find(i=>i.definitionId===food.definitionId&&i.instanceId!==food.instanceId)!
    h.owner.dispatch(request(h,'inventory',{kind:'merge',instanceId:child.instanceId,targetId:food.instanceId,quantity:1}))
    expect(current(h).carried.backpack.items.find(i=>i.instanceId===food.instanceId)?.quantity).toBe(2)
    h.owner.dispatch(request(h,'inventory',{kind:'move',instanceId:food.instanceId,placement:{x:2,y:1,rotated:true}}))
    h.owner.dispatch(request(h,'inventory',{kind:'to-quick',instanceId:bandage.instanceId,slot:1}))
    expect(current(h).carried.quickSlots.slots[1]?.instanceId).toBe(bandage.instanceId)
    h.owner.dispatch(request(h,'inventory',{kind:'to-backpack',slot:1,placement:{x:5,y:1,rotated:false}}))
    const state=current(h).itemStates.states.find(s=>s.instanceId===bandage.instanceId)
    h.owner.dispatch(request(h,'inventory',{kind:'drop',instanceId:bandage.instanceId}))
    h.owner.dispatch(request(h,'inventory',{kind:'pickup',instanceId:bandage.instanceId,placement:{x:5,y:1,rotated:false}}))
    expect(current(h).itemStates.states.find(s=>s.instanceId===bandage.instanceId)).toEqual(state)
    expect(current(h).character.body).toEqual(before.character.body)
    expect(current(h).origins).toEqual(before.origins);expect(current(coldSaved(h))).toEqual(current(h))
  })
  it('real sample extraction and explicit ground leave/retrieve never clone a task instance',()=>{
    const h=harness();start(h);move(h,'H1');task(h,'fire-door',{method:'crow',toolInstanceId:current(h).carried.equipment.utility!.instanceId})
    move(h,'H4');win(h);move(h,'H5');task(h,'sample',{method:'cautious',placement:{x:0,y:0,rotated:false}})
    const v=current(h),sample=v.carried.backpack.items.find(i=>i.definitionId==='quest_sealed_pathogen_case')!
    h.owner.dispatch(request(h,'task-transfer',{kind:'task-drop',instanceId:sample.instanceId}))
    expect(current(h).carried.backpack.items.some(i=>i.instanceId===sample.instanceId)).toBe(false)
    h.owner.dispatch(request(h,'task-transfer',{kind:'task-pickup',instanceId:sample.instanceId,placement:{x:0,y:0,rotated:false}}))
    expect(current(h).carried.backpack.items.find(i=>i.instanceId===sample.instanceId)).toEqual(sample)
    expect(current(h).character.body).toEqual(v.character.body);expect(current(coldSaved(h))).toEqual(current(h))
    reject(h,request(h,'task',{actionId:'sample',method:'cautious',placement:{x:2,y:0,rotated:false}}))
  })
  it('charge uses an actually acquired battery and cannot replay a source',()=>{
    const h=harness({tool:'lamp'});start(h);move(h,'H1')
    source(h,'H1-search',{method:'lit',toolInstanceId:current(h).carried.equipment.utility!.instanceId})
    move(h,'H3');source(h,'H3-search',{method:'dark'});pick(h,'battery',0)
    const v=current(h),lamp=v.carried.equipment.utility!,battery=v.carried.backpack.items[0]
    h.owner.dispatch(request(h,'maintenance',{kind:'recharge',instanceId:lamp.instanceId,inputs:[{instanceId:battery.instanceId,quantity:1}]}))
    expect(current(h).carried.backpack.items.some(i=>i.instanceId===battery.instanceId)).toBe(false)
    expect(current(h).itemStates.states.find(s=>s.instanceId===lamp.instanceId)?.resource).toMatchObject({
      current:numberValue(h.deps.supply.configuration,'capacity.lamp')})
    reject(h,request(h,'source',{sourceId:'H3-search',method:'dark'}))
    expect(current(coldSaved(h))).toEqual(current(h))
  })
  it('victory immediate coat repair consumes the carried cloth once',()=>{
    const h=harness({draw:(c,min,max)=>({...drawIntInclusive(c,min,max),value:c.streamId.includes('H1-random')?41:max})})
    maintenanceEntry(h);win(h);const before=current(h),id=before.carried.equipment.armor!.instanceId
    repair(h,'coat');expect(current(h).battles).toEqual(before.battles)
    expect(current(h).itemStates.states.find(s=>s.instanceId===id)?.resource).not.toEqual(before.itemStates.states.find(s=>s.instanceId===id)?.resource)
    expect(current(coldSaved(h))).toEqual(current(h))
  })
})
