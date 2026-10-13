import { test, expect } from 'vitest'
import { makeHarness, boundaryOwner } from './e03-test-harness'
import { move } from './e03-test-policy'
for(const terminal of ['normal','deadline','death'] as const) test(`E03 isolated Day7 ${terminal} consumes true outcome once, never Day8`,()=>{
  const h=makeHarness('E03-A-seed-01'); h.begin(); if(terminal!=='normal')move(h,'H1')
  const body=terminal==='death'?{condition:{...h.current().character.body.condition,currentHealth:1,bleeding:true}}:{}
  const b=boundaryOwner(h,body,7),v=b.owner.getState().current!
  const r=b.owner.dispatch({kind:'terminal',command:{kind:terminal==='normal'?'withdraw':'deadline',expectedRevision:v.character.revision}})
  expect(r.current.receipts).toHaveLength(1); expect(r.current.receipts[0].taskDay).toBe(7)
  expect(r.current.receipts[0].outcome).toBe(terminal==='normal'?'voluntary-failure':terminal==='death'?'death':'deadline-failure')
  expect(r.current.character.cycle).toBe(terminal==='deadline'?8:7)
  // HP0 short-circuits G1 before clock advancement; domain phase is the terminal authority.
  expect(r.current.phase).toBe(terminal==='death'?'dead':'living-hub'); expect(b.writes).toHaveBeenCalledTimes(1)
  if(terminal!=='death')expect(r.current.character.clock.kind).not.toBe('active')
  if(terminal==='normal')expect(r.current.receipts[0].steps).toEqual([])
})
