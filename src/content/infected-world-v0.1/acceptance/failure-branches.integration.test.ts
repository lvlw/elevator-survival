import { test, expect } from 'vitest'
import { makeHarness, boundaryOwner, rejectUnchanged } from './e03-test-harness'
import { move, task, source, ordinaryPick } from './e03-test-policy'
import { emitReport } from './e03-test-report'
test('E03 legal loss-cutting closes once, spent repair metal stays spent and unused gear keeps resources', async () => {
  const h=makeHarness('E03-A-seed-01'); h.begin(); move(h,'H1'); source(h,'H1-search',{method:'dark'}); ordinaryPick(h,'metal',0)
  task(h,'fire-door',{method:'crow',toolInstanceId:h.current().carried.equipment.utility!.instanceId}); move(h,'H4')
  h.send('combat',{command:{kind:'metal-pipe-charged-strike'}}); h.send('combat',{command:{kind:'escape'}})
  const metal=h.current().carried.backpack.items[0], pipe=h.current().carried.equipment.weapon!
  h.send('maintenance',{kind:'mechanical',inputs:[{instanceId:metal.instanceId,quantity:1}],allocations:[{instanceId:pipe.instanceId,amount:15}]})
  move(h,'H0'); const before=h.current(); h.send('terminal',{kind:'withdraw'})
  const v=h.current(); expect(v.phase).toBe('living-hub'); expect(v.receipts).toHaveLength(1)
  expect(v.receipts[0].outcome).toBe('voluntary-failure'); expect(v.balance).toBe(0)
  expect(v.receipts[0].steps).toEqual([]); expect(v.character.body).toEqual(before.character.body)
  expect(v.dispositions.some(d=>d.item.instanceId===metal.instanceId&&d.kind==='consumed')).toBe(true)
  expect(v.carried.equipment.weapon!.instanceId).toBe(pipe.instanceId)
  rejectUnchanged(h,'depart',{commissionId:h.deps.supply.catalog.data.mission.commissionId},'NOT_AVAILABLE')
  await emitReport('failure-loss-cutting',{receipt:v.receipts[0],dispositions:v.dispositions,dispatch:h.ledger.length-1,writes:h.storage.write.mock.calls.length})
})
test('E03 explicit isolated E0 boundary: free bandage saves, paid move rejects', () => {
  const h=makeHarness('E03-A-seed-01'); h.begin()
  const condition={...h.current().character.body.condition,currentHealth:2,bleeding:true}
  const b=boundaryOwner(h,{energy:0,condition}), v=b.owner.getState().current!
  expect(()=>b.owner.dispatch({kind:'move',command:{kind:'move',expectedRevision:v.character.revision,edgeId:'H0-H1:forward'}})).toThrow()
  expect(b.writes).not.toHaveBeenCalled()
  const r=b.owner.dispatch({kind:'medical',command:{kind:'medical',expectedRevision:v.character.revision,instanceId:v.carried.quickSlots.slots[0]!.instanceId}})
  expect(r.current.character.body.condition.currentHealth).toBe(3)
  expect(r.current.character.body.condition.bleeding).toBe(false); expect(r.current.character.body.energy).toBe(0)
  expect(b.writes).toHaveBeenCalledTimes(1)
})
test('E03 positive E last move completes with zero, no debt or extra damage', () => {
  const h=makeHarness('E03-A-seed-01'); h.begin(); const b=boundaryOwner(h,{energy:1}),v=b.owner.getState().current!
  const r=b.owner.dispatch({kind:'move',command:{kind:'move',expectedRevision:v.character.revision,edgeId:'H0-H1:forward'}})
  expect(r.current.site!.nodeId).toBe('H1'); expect(r.current.character.body.energy).toBe(0)
  expect(r.current.character.body.condition.currentHealth).toBe(12); expect(b.writes).toHaveBeenCalledTimes(1)
})
test('E03 missing installation inputs reject atomically, not a commission failure', () => {
  const h=makeHarness('E03-A-seed-01'); h.begin(); move(h,'H1'); move(h,'H7'); move(h,'H8')
  rejectUnchanged(h,'task',{actionId:'install',inputs:[{instanceId:'missing',quantity:1}]})
  expect(h.current().phase).toBe('active-world'); expect(h.current().receipts).toEqual([])
})
test('E03 actual hotel with no disinfectant rejects exchange without consuming bandage or writing',()=>{
  const h=makeHarness('E03-A-seed-01','lamp','survival');h.begin();move(h,'H1');move(h,'H2')
  source(h,'H2-search',{method:'lit',toolInstanceId:h.current().carried.equipment.utility!.instanceId});ordinaryPick(h,'bandage',0)
  move(h,'H1');move(h,'H0');move(h,'T0');move(h,'T1')
  const bandage=h.current().carried.backpack.items[0]
  rejectUnchanged(h,'source',{sourceId:'T1-exchange',inputs:[{instanceId:bandage.instanceId,quantity:1}],placements:[{x:0,y:0,rotated:false}]})
  expect(h.current().carried.backpack.items).toContainEqual(bandage)
})
