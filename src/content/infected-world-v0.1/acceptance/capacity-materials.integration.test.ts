import { test, expect } from 'vitest'
import { makeHarness, rejectUnchanged } from './e03-test-harness'
import { source, move, ordinaryPick, task } from './e03-test-policy'
import { createBackpackSnapshot, addItemToBackpack, calculateBackpackWeightSubtotal } from '../../../core/inventory'
import { classifyLoad } from '../../../core/load'
test('E03 actual source pickup requires explicit in-bounds non-overlapping placement',()=>{
  const h=makeHarness('E03-A-seed-01');h.begin();move(h,'H1');source(h,'H1-search',{method:'dark'});ordinaryPick(h,'metal',0)
  const item=h.current().site!.ground.find(g=>g.nodeId==='H1')!.items[0]
  for(const placement of [{x:0,y:0,rotated:false},{x:6,y:0,rotated:false}])
    rejectUnchanged(h,'inventory',{kind:'pickup',instanceId:item.instanceId,placement})
  expect(h.current().site!.ground.find(g=>g.nodeId==='H1')!.items.some(i=>i.instanceId===item.instanceId)).toBe(true)
})
test('E03 source once and first professional door cannot be claimed through another method',()=>{
  const h=makeHarness('E03-A-seed-01');h.begin();move(h,'H1');source(h,'H1-search',{method:'dark'})
  rejectUnchanged(h,'source',{sourceId:'H1-search',method:'dark'},'NOT_AVAILABLE')
  task(h,'fire-door',{method:'crow',toolInstanceId:h.current().carried.equipment.utility!.instanceId})
  rejectUnchanged(h,'task',{actionId:'fire-door',method:'toolbox',toolInstanceId:h.current().carried.equipment.utility!.instanceId},'NOT_AVAILABLE')
  expect(h.current().origins.some(o=>o.producerId==='H1-toolbox')).toBe(false)
})
test('E03 isolated geometry plus formal carry classifier: 28 is carryable, 29 is not',()=>{
  const h=makeHarness('E03-A-seed-01'),p=h.deps.supply.catalog.physical
  // Local inventory boundary, not a full route grant or a S-installed world fixture.
  const items=Array.from({length:8},(_,n)=>({instanceId:'TEST-capacity-'+n,
    definitionId:n<4?'material_metal_parts':'material_electronic_components',quantity:n<4?5:2}))
  const backpack=createBackpackSnapshot({width:6,height:4,items,placements:items.map((i,n)=>({instanceId:i.instanceId,x:n%6,y:Math.floor(n/6),rotated:false}))},p)
  expect(calculateBackpackWeightSubtotal(backpack,p)).toBe(28)
  expect(classifyLoad(28,h.deps.supply.catalog.data.backpack).canCarry).toBe(true)
  const food={instanceId:'TEST-capacity-food',definitionId:'consumable_ration',quantity:1}
  expect(()=>addItemToBackpack(backpack,food,{instanceId:food.instanceId,x:0,y:0,rotated:false},p)).toThrow()
  const proposed=addItemToBackpack(backpack,food,{instanceId:food.instanceId,x:2,y:1,rotated:false},p)
  const weight=calculateBackpackWeightSubtotal(proposed,p)
  expect(weight).toBe(29);expect(classifyLoad(weight,h.deps.supply.catalog.data.backpack).canCarry).toBe(false)
})
