import { expect, test, afterEach, vi } from 'vitest'
import { makeHarness } from './e03-test-harness'
import { move, task } from './e03-test-policy'
import { queryResidenceCombat, queryCombatTerminalEligibility } from '../../../core/residence-combat/queries'
import { queryPlayerResidenceKnowledge } from '../../../core/residence-location/knowledge'
import { cycleContext } from '../../../core/residence-supply/shared-validation'
import { readCombatValue } from '../../../core/residence-combat/validation'
import { observe } from './e03-test-observers'
import { emitReport } from './e03-test-report'
afterEach(() => vi.restoreAllMocks())
test('E03 native existing queries: same public knowledge, different seed and hidden infection', async () => {
  const a = makeHarness('E03-A-seed-01'), b = makeHarness('E03-A-seed-02')
  for (const h of [a,b]) { h.begin(); move(h,'H1'); task(h,'fire-door',{method:'crow',toolInstanceId:h.current().carried.equipment.utility!.instanceId}); move(h,'H4') }
  const v = a.current(), hidden = readCombatValue({ ...v, character: { ...v.character,
    body: { ...v.character.body, infectionProgress: 5 } } }, a.deps)
  const q = queryResidenceCombat(v,a.deps)
  expect(queryResidenceCombat(hidden,a.deps)).toEqual(q)
  expect(b.owner.queryCombat()).toEqual(q)
  expect(queryCombatTerminalEligibility(hidden,a.deps)).toEqual(a.owner.queryTerminal())
  const o = observe(a); o.clear()
  const knowledge = (value: typeof v) => queryPlayerResidenceKnowledge({ character:value.character,site:value.site,
    carried:value.carried,itemStates:value.itemStates }, { mission:value.missions.find(m=>m.status==='active')!,
    cycle:cycleContext(value.character,a.deps.supply,value.site!.nodeId) },
    { residence:a.deps.supply.residence,catalog:a.deps.supply.catalog })
  expect(knowledge(hidden)).toEqual(knowledge(v))
  const k = knowledge(v)
  expect(k.nodes.some(n=>n.id==='C5')).toBe(false)
  expect(k.sources).toEqual([]) // Native G2 source catalog has no E01 task-source projection, NOT a completed source query.
  expect(JSON.stringify(q)).not.toMatch(/currentCtb|playerNext|enemyNext|riskDrawIndex|infectionProgress|seed|streamId/)
  expect(Object.values(o.counts())).toEqual(Object.values(o.counts()).map(()=>0))
  await emitReport('query-native-probe',{ combat:q, knowledge:k, hiddenPairEqual:true, nativeSourcesUnsupported:true, counts:o.counts() })
})
test('E03 diagnostic getState is not a player-safe ViewModel', () => {
  const h=makeHarness('E03-A-seed-01'); h.begin()
  expect(JSON.stringify(h.owner.getState())).toContain('E03-A-seed-01')
  expect(JSON.stringify(h.owner.getState())).toContain('infectionProgress')
  expect(h.owner.queryCombat()).toBeNull()
})
test('E03 raw item selectors contain seed and require opaque query separation',()=>{
  const h=makeHarness('E03-A-seed-01');h.begin()
  expect(h.current().carried.equipment.weapon!.instanceId).toContain('E03-A-seed-01')
})
test('E03 current action selector encodes execution identity and must not be rendered as ordinary text', async()=>{
  const h=makeHarness('E03-A-seed-05');h.begin();move(h,'H1')
  task(h,'fire-door',{method:'crow',toolInstanceId:h.current().carried.equipment.utility!.instanceId});move(h,'H4')
  h.send('combat',{command:{kind:'metal-pipe-basic-attack'}})
  const query=h.owner.queryCombat()!
  const selector=query.actions.find(a=>a.kind==='use-quick-slot-item'&&a.targetOpenWoundId)
  expect(selector).toBeDefined()
  expect(JSON.stringify(selector)).toContain('E03-A-execution')
  expect(JSON.stringify(selector)).not.toContain('E03-A-seed-05')
  await emitReport('query-selector-finding',{selector,classification:'technical command selector, not safe ordinary text',source:'combat-transition-plan.ts:430'})
})
