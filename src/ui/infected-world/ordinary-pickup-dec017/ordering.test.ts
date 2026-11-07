import { expect, it } from 'vitest'
import { fullBagFixture } from './boundary-fixture'
import { ordinaryPickupCapacity } from '../../../core/residence-supply/inventory-qualification'
import { planSupplyInventory } from '../../../core/residence-supply/inventory'
import { readSupplyValue } from '../../../core/residence-supply/validation'

it('multiple compatible stacks fill in stable row-major order, preserving each exact source range',()=>{
  const {f,value,food}=fullBagFixture();let v=value
  const inv=(fields:object)=>{v=planSupplyInventory(v,{expectedRevision:v.character.revision,...fields},f.authorize(v)).snapshot}
  const material=v.carried.backpack.items.find(i=>i.definitionId==='material_metal_parts')!
  const pos=v.carried.backpack.placements.find(p=>p.instanceId===material.instanceId)!
  inv({kind:'drop',instanceId:material.instanceId})
  const other=v.site!.ground.flatMap(r=>r.items).find(i=>i.definitionId===food.definitionId&&i.instanceId!==food.instanceId)!
  inv({kind:'pickup',instanceId:other.instanceId,quantity:1})
  const target=v.carried.backpack.items.find(i=>i.definitionId===food.definitionId)!
  inv({kind:'split',instanceId:target.instanceId,quantity:1,placement:{x:pos.x,y:pos.y,rotated:false}})
  const expected=v.carried.backpack.placements.filter(p=>v.carried.backpack.items.some(i=>i.instanceId===p.instanceId&&i.definitionId===food.definitionId))
    .sort((a,b)=>a.y-b.y||a.x-b.x).map(p=>p.instanceId)
  const reversed={...v,carried:{...v.carried,backpack:{...v.carried.backpack,placements:[...v.carried.backpack.placements].reverse()}}}
  const capacity=ordinaryPickupCapacity(reversed,food.instanceId,2,undefined,f.dependencies)
  expect(capacity.merges.map(m=>m.instanceId)).toEqual(expected)
  expect(capacity.public).toMatchObject({picked:2,merged:2,created:0,remaining:0})
  inv({kind:'pickup',instanceId:food.instanceId,quantity:2})
  expect(v.carried.backpack.items.filter(i=>i.definitionId===food.definitionId).map(i=>i.quantity)).toEqual([2,2])
  expect(readSupplyValue(JSON.parse(JSON.stringify(v)),f.dependencies)).toEqual(v)
})

it('incompatible ItemState never merges; a supplied empty position remains a separate stack candidate',()=>{
  const {f,value,food}=fullBagFixture()
  const dropped=value.carried.backpack.items.find(i=>i.definitionId==='material_metal_parts')!
  const p=value.carried.backpack.placements.find(p=>p.instanceId===dropped.instanceId)!
  const free=planSupplyInventory(value,{kind:'drop',expectedRevision:value.character.revision,instanceId:dropped.instanceId},f.authorize(value)).snapshot
  // Current nine production stackable definitions are resource:none. A deliberately incompatible
  // local value exercises the shared compatibility seam; strict restore must reject this forgery.
  const incompatible={...free,itemStates:{states:free.itemStates.states.map(s=>s.instanceId===food.instanceId?{...s,resource:{kind:'charge' as const,current:1}}:s)}}
  expect(ordinaryPickupCapacity(incompatible,food.instanceId,2,undefined,f.dependencies).public).toMatchObject({picked:0,merged:0})
  expect(ordinaryPickupCapacity(incompatible,food.instanceId,2,{x:p.x,y:p.y,rotated:false},f.dependencies).public).toMatchObject({picked:2,merged:0,created:2})
  expect(()=>readSupplyValue(incompatible,f.dependencies)).toThrow()
  expect(()=>planSupplyInventory(incompatible,{kind:'pickup',expectedRevision:free.character.revision,instanceId:food.instanceId,quantity:2,placement:{x:p.x,y:p.y,rotated:false}},f.authorize(free))).toThrow()
})
