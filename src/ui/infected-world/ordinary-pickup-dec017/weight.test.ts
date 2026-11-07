import { expect, it } from 'vitest'
import { fullBagFixture } from './boundary-fixture'
import { planSupplyInventory } from '../../../core/residence-supply/inventory'
import { readSupplyValue } from '../../../core/residence-supply/validation'
import { ordinaryPickupCapacity } from '../../../core/residence-supply/inventory-qualification'
import { calculateBackpackWeightSubtotal, previewBackpackPlacement } from '../../../core/inventory'

function weightBoundary() {
  const f = fullBagFixture(), deps = f.f.dependencies
  let v = f.value
  const inv = (fields: object) => { v = planSupplyInventory(v, { expectedRevision: v.character.revision, ...fields }, f.f.authorize(v)).snapshot }
  for (const item of [...v.carried.backpack.items]) {
    if (item.definitionId === f.food.definitionId || !v.carried.backpack.items.some(i=>i.instanceId===item.instanceId)) continue
    const d = deps.catalog.physical.get(item.definitionId)
    if (d.stacking.kind !== 'stackable') continue
    const maximum = d.stacking.maxQuantity
    const target = v.carried.backpack.items.find(i => i.definitionId === item.definitionId && i.instanceId !== item.instanceId && i.quantity + item.quantity <= maximum)
    if (target) inv({ kind: 'merge', instanceId: item.instanceId, targetId: target.instanceId, quantity: item.quantity })
  }
  const aid = v.site!.ground.flatMap(row=>row.items).find(i=>i.definitionId==='consumable_first_aid_kit')!
  let aidPlacement: {x:number;y:number;rotated:boolean} | null = null
  for(let y=0;y<4 && !aidPlacement;y++)for(let x=0;x<6 && !aidPlacement;x++) {
    const placement={x,y,rotated:true}
    if(previewBackpackPlacement(v.carried.backpack,aid,{instanceId:aid.instanceId,...placement},deps.catalog.physical).canPlace)aidPlacement=placement
  }
  expect(aidPlacement).not.toBeNull()
  expect(()=>planSupplyInventory(v,{kind:'pickup',instanceId:aid.instanceId,expectedRevision:v.character.revision},f.f.authorize(v))).toThrow()
  expect(()=>planSupplyInventory(v,{kind:'pickup',instanceId:aid.instanceId,quantity:1,placement:aidPlacement,expectedRevision:v.character.revision},f.f.authorize(v))).toThrow()
  inv({kind:'pickup',instanceId:aid.instanceId,placement:aidPlacement})
  while (calculateBackpackWeightSubtotal(v.carried.backpack, deps.catalog.physical) < 27) {
    const source = v.site!.ground.flatMap(r=>r.items).find(i => i.definitionId !== f.food.definitionId && deps.catalog.physical.get(i.definitionId).stacking.kind === 'stackable')!
    if (!source) throw Error('Insufficient real units for weight boundary')
    const placement = findPlacement(v, source.instanceId, f)
    inv({ kind: 'pickup', instanceId: source.instanceId, quantity: 1, ...placement })
  }
  return { ...f, value:v }
}
function findPlacement(v: ReturnType<typeof fullBagFixture>['value'], id: string, f: ReturnType<typeof fullBagFixture>) {
  for(let y=0;y<4;y++)for(let x=0;x<6;x++) {
    const placement = {x,y,rotated:false}
    if(ordinaryPickupCapacity(v,id,1,placement,f.f.dependencies).public.picked===1)return {placement}
  }
  throw Error('No formal pickup candidate')
}

it('weight allows only one requested unit even with space, then zero capacity is pure', () => {
  const { f, value, food }=weightBoundary()
  const before=structuredClone(value)
  const capacity=ordinaryPickupCapacity(value,food.instanceId,2,{x:5,y:3,rotated:false},f.dependencies)
  expect(capacity.public).toMatchObject({picked:1,merged:1,created:0,remaining:1,limitedBy:['weight']})
  const after=planSupplyInventory(value,{kind:'pickup',expectedRevision:value.character.revision,instanceId:food.instanceId,quantity:2},f.authorize(value)).snapshot
  expect(calculateBackpackWeightSubtotal(after.carried.backpack,f.dependencies.catalog.physical)).toBe(28)
  expect(value).toEqual(before)
  expect(readSupplyValue(JSON.parse(JSON.stringify(after)),f.dependencies)).toEqual(after)
  expect(ordinaryPickupCapacity(after,food.instanceId,1,undefined,f.dependencies).public).toMatchObject({picked:0,remaining:1,limitedBy:['weight']})
  expect(()=>planSupplyInventory(after,{kind:'pickup',expectedRevision:after.character.revision,instanceId:food.instanceId,quantity:1},f.authorize(after))).toThrow()
})

it('weight-limited new stack gets a stable child identity and disjoint source ranges', () => {
  const f=weightBoundary(),deps=f.f.dependencies
  let v=f.value
  const inv=(fields:object)=>{v=planSupplyInventory(v,{expectedRevision:v.character.revision,...fields},f.f.authorize(v)).snapshot}
  const foodTarget=v.carried.backpack.items.find(i=>i.definitionId===f.food.definitionId)!
  const anchor=v.carried.backpack.placements.find(p=>p.instanceId===foodTarget.instanceId)!
  const placement={x:anchor.x,y:anchor.y,rotated:false}
  inv({kind:'drop',instanceId:foodTarget.instanceId})
  inv({kind:'to-backpack',slot:0,placement})
  const nextPlacement=findPlacement(v,f.food.instanceId,f).placement
  expect(calculateBackpackWeightSubtotal(v.carried.backpack,deps.catalog.physical)).toBe(27)
  const before=v
  const preview=ordinaryPickupCapacity(v,f.food.instanceId,2,nextPlacement,deps)
  expect(preview.public).toMatchObject({picked:1,merged:0,created:1,remaining:1,limitedBy:['weight']})
  inv({kind:'pickup',instanceId:f.food.instanceId,quantity:2,placement:nextPlacement})
  const child=v.carried.backpack.items.find(i=>i.definitionId===f.food.definitionId)!
  expect(child.instanceId).not.toBe(f.food.instanceId)
  expect(v.lineage.at(-1)).toMatchObject({parentId:f.food.instanceId,instanceId:child.instanceId,quantityBefore:2,quantity:1})
  expect(v.origins).toEqual(before.origins)
  expect(v.itemStates.states.find(s=>s.instanceId===child.instanceId)?.resource).toEqual(before.itemStates.states.find(s=>s.instanceId===f.food.instanceId)?.resource)
  expect(readSupplyValue(JSON.parse(JSON.stringify(v)),deps)).toEqual(v)
  expect(()=>readSupplyValue({...v,unitTransfers:before.unitTransfers},deps)).toThrow()
  expect(planSupplyInventory(before,{kind:'pickup',expectedRevision:before.character.revision,instanceId:f.food.instanceId,quantity:2,placement:nextPlacement},f.f.authorize(before)).snapshot).toEqual(v)
})
