import { test, expect } from 'vitest'
import { makeHarness, rejectUnchanged } from './e03-test-harness'
import { move, task } from './e03-test-policy'
import { assertExitAccounting, assertCompleteEqual } from './e03-test-observers'
test('E03 accounting harness detects wrong observed exit fee, not an import failure',()=>{
  const h=makeHarness('E03-A-seed-01');h.begin();move(h,'H1');task(h,'fire-door',{method:'crow',toolInstanceId:h.current().carried.equipment.utility!.instanceId});move(h,'H4')
  h.send('combat',{command:{kind:'metal-pipe-charged-strike'}});h.send('combat',{command:{kind:'escape'}})
  const r=h.current().battles[0];assertExitAccounting(r,h.deps)
  expect(()=>assertExitAccounting({...r,requestedEnergy:r.requestedEnergy+1},h.deps)).toThrowError()
})
test('E03 whole-result harness detects changed restored full value',()=>{
  const h=makeHarness('E03-A-seed-01');h.begin();const v=h.current();assertCompleteEqual(h.cold().owner.getState().current!,v)
  expect(()=>assertCompleteEqual({...v,balance:v.balance+1},v)).toThrowError()
})
test('E03 stale and wrong quick target reject without extra execution',()=>{
  const h=makeHarness('E03-A-seed-01');h.begin();move(h,'H1');task(h,'fire-door',{method:'crow',toolInstanceId:h.current().carried.equipment.utility!.instanceId});move(h,'H4')
  rejectUnchanged(h,'combat',{command:{kind:'use-quick-slot-item',quickSlotIndex:1},instanceId:'missing'},'NOT_AVAILABLE')
  const v=h.current(),writes=h.storage.write.mock.calls.length
  expect(()=>h.owner.dispatch({kind:'combat',command:{kind:'combat-action',expectedRevision:v.character.revision-1,
    expectedBattleId:v.battle!.entry.id,command:{kind:'metal-pipe-basic-attack'}}})).toThrowError(expect.objectContaining({code:'STALE_COMMAND'}))
  expect(h.current()).toBe(v);expect(h.storage.write).toHaveBeenCalledTimes(writes)
})
