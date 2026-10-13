// TEST ONLY. Every route step uses S dispatch, including real CTB; never replaces current.
import { expect } from 'vitest'
import { current, request, start, type Harness } from './combat-test-fixtures'
import type { CombatPlayerActionCommand } from '../../core/combat/combat-types'
export function move(h: Harness, to: string) {
  const v = current(h), edge = h.deps.supply.catalog.data.edges.find(e => e.from === v.site!.nodeId && e.to === to)!
  return h.owner.dispatch(request(h, 'move', { edgeId: edge.id }))
}
export function task(h: Harness, actionId: string, extra = {}) { return h.owner.dispatch(request(h, 'task', { actionId, ...extra })) }
export function source(h: Harness, sourceId: string, extra = {}) { return h.owner.dispatch(request(h, 'source', { sourceId, ...extra })) }
export function action(h: Harness, command: CombatPlayerActionCommand, extra = {}) {
  return h.owner.dispatch(request(h, 'combat', { command, ...extra }))
}
export function win(h: Harness) {
  if (current(h).character.body.quotasRemaining.pipe_signature > 0)
    action(h, { kind: 'metal-pipe-charged-strike' })
  for (let i = 0; current(h).battle && i < 12; i++) action(h, { kind: 'metal-pipe-basic-attack' })
  expect(current(h).phase).toBe('active-world'); expect(current(h).battle).toBeNull()
}
export function enter(h: Harness, enemy: 'orderly' | 'porter' | 'technician' = 'orderly') {
  if (h.owner.getState().current === null) start(h)
  if (enemy === 'orderly') {
    move(h, 'H1'); task(h, 'fire-door', { method: 'crow', toolInstanceId: current(h).carried.equipment.utility!.instanceId }); move(h, 'H4')
  } else if (enemy === 'porter') for (const n of ['H1','H7','L0','L1','L2']) move(h, n)
  else { move(h,'C0'); move(h,'C1'); task(h,'c-gate',{method:'manual'}); move(h,'C2') }
}
export function pick(h: Harness, alias: string, x: number, y = 0) {
  const v = current(h), id = h.deps.supply.tasks.data.items.find(i => i.alias === alias)!.id
  const item = v.site!.ground.find(g => g.nodeId === v.site!.nodeId)!.items.find(i => i.definitionId === id)!
  return h.owner.dispatch(request(h,'inventory',{kind:'pickup',instanceId:item.instanceId,placement:{x,y,rotated:false}}))
}
export function medical(h: Harness, alias: string, extra = {}) {
  const v = current(h), definitionId = h.deps.supply.tasks.data.items.find(i => i.alias === alias)!.id
  const item = [...v.carried.backpack.items,...v.carried.quickSlots.slots.filter(x=>x!==null)].find(i=>i.definitionId===definitionId)!
  return h.owner.dispatch(request(h,'medical',{instanceId:item.instanceId,...extra}))
}
export function repair(h: Harness, target: 'mechanical' | 'coat' = 'mechanical') {
  const v = current(h), def = h.deps.supply.tasks.data.items.find(i=>i.alias===(target==='mechanical'?'metal':'cloth'))!.id
  const material = v.carried.backpack.items.find(i=>i.definitionId===def)!
  const extra = target==='mechanical' ? { allocations:[{instanceId:v.carried.equipment.weapon!.instanceId,amount:15}] } :
    {instanceId:v.carried.equipment.armor!.instanceId}
  return h.owner.dispatch(request(h,'maintenance',{kind:target,inputs:[{instanceId:material.instanceId,quantity:1}],...extra}))
}
export function rest(h: Harness) { return h.owner.dispatch(request(h,'rest')) }
export function maintenanceEntry(h: Harness) {
  start(h); move(h,'H1'); source(h,'H1-search',{method:'dark'}); pick(h,'metal',0); pick(h,'cloth',1)
  task(h,'fire-door',{method:'crow',toolInstanceId:current(h).carried.equipment.utility!.instanceId}); move(h,'H4')
}
export function successRoute(h: Harness) {
  start(h); move(h,'H1'); source(h,'H1-search',{method:'dark'}); pick(h,'metal',4)
  task(h,'fire-door',{method:'toolbox',toolInstanceId:current(h).carried.equipment.utility!.instanceId}); pick(h,'electronic',5)
  move(h,'H4'); win(h)
  for(const n of ['H1','H7','L0','L1']) move(h,n)
  task(h,'l1-open',{method:'manual'}); source(h,'L1-cabinet'); pick(h,'food',4,1); pick(h,'bandage',5,1)
  rest(h); medical(h,'food'); move(h,'L2'); win(h)
  medical(h,'bandage'); medical(h,'bandage')
  task(h,'verify',{method:'full'}); task(h,'fix',{method:'manual'}); task(h,'component',{placement:{x:0,y:0,rotated:false}})
  for(const n of ['L1','L0','C0','C1']) move(h,n)
  task(h,'match',{method:'fast'}); task(h,'c-gate',{method:'manual'}); rest(h); medical(h,'food')
  move(h,'C2'); win(h); move(h,'C3'); task(h,'module',{placement:{x:2,y:0,rotated:false}})
  for(const n of ['C2','C1','C0','H0','H1','H4','H5']) move(h,n)
  task(h,'sample',{method:'cautious',placement:{x:0,y:2,rotated:false}})
  for(const n of ['H4','H1','H7','L0','P0','P1']) move(h,n)
  rest(h); task(h,'power-survey'); task(h,'power')
  for(const n of ['P0','L0','H7','H8']) move(h,n)
  task(h,'install',{inputs:['component','module','metal','electronic'].map(alias=>({instanceId:current(h).carried.backpack.items.find(i=>
    i.definitionId===h.deps.supply.tasks.data.items.find(d=>d.alias===alias)!.id)!.instanceId,quantity:1}))})
  for(const n of ['H7','H1','H0']) move(h,n)
  return h.owner.dispatch(request(h,'terminal',{kind:'deliver'}))
}
