import { test, expect } from 'vitest'
import { makeHarness, boundaryOwner } from './e03-test-harness'
import { move, task, source, ordinaryPick, med } from './e03-test-policy'
test('E03 task component left on ground survives actual rest and cold restore with original identity',()=>{
  const h=makeHarness('E03-A-seed-01');h.begin();move(h,'H1');move(h,'H7');move(h,'L0');move(h,'L1')
  task(h,'l1-open',{method:'crow',toolInstanceId:h.current().carried.equipment.utility!.instanceId});source(h,'L1-cabinet');ordinaryPick(h,'food',4)
  h.send('rest');med(h,'food');move(h,'L2')
  h.send('combat',{command:{kind:'metal-pipe-charged-strike'}})
  for(let i=0;h.current().battle&&i<4;i++)h.send('combat',{command:{kind:'metal-pipe-basic-attack'}})
  task(h,'verify',{method:'full'});task(h,'fix',{method:'manual'});task(h,'component',{placement:{x:0,y:0,rotated:false}})
  const item=h.current().carried.backpack.items.find(i=>i.definitionId==='draft_transfer_control_component')!
  h.send('task-transfer',{kind:'task-drop',instanceId:item.instanceId});h.send('rest')
  const c=h.cold(),v=c.owner.getState().current!
  expect(v.site!.ground.find(g=>g.nodeId==='L2')!.items).toContainEqual(item)
  const r=c.owner.dispatch({kind:'task-transfer',command:{kind:'task-pickup',expectedRevision:v.character.revision,
    instanceId:item.instanceId,placement:{x:0,y:0,rotated:false}}})
  expect(r.current.carried.backpack.items).toContainEqual(item)
})
for(const specialty of ['scout','engineer','survival'] as const)test(`E03 isolated first-bandage ${specialty} quota survives actual rest`,()=>{
  const h=makeHarness('E03-A-seed-01','crow',specialty);h.begin()
  const b=boundaryOwner(h,{condition:{...h.current().character.body.condition,currentHealth:10}}),v=b.owner.getState().current!
  const r=b.owner.dispatch({kind:'medical',command:{kind:'medical',expectedRevision:v.character.revision,instanceId:v.carried.quickSlots.slots[0]!.instanceId}})
  expect(r.current.character.body.condition.currentHealth).toBe(specialty==='survival'?12:11)
  expect(r.current.choices.firstBandageUsed).toBe(true)
  const rest=b.owner.dispatch({kind:'rest',command:{kind:'rest',expectedRevision:r.current.character.revision}})
  expect(rest.current.choices.firstBandageUsed).toBe(true)
  expect(rest.current.character.body.condition.currentHealth).toBe(r.current.character.body.condition.currentHealth)
})
