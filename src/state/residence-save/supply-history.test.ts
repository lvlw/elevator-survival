import { describe, expect, it } from 'vitest'
import type { SupplyValue } from '../../core/residence-supply/types'
import { fixture, expectation, mutable, organized, successful, history, searchAt, pickAlias, states, type Mutable } from './supply-test-fixtures'
import { validateSupplyResidenceAggregate as read } from './supply-validation'
import { restoreSupplyResidenceCandidate } from './supply-expected'
type Change = (v: Mutable<SupplyValue>) => void
const mutations: [string, Change][] = [
  ['missing origin', v => { v.origins.pop() }],
  ['extra origin', v => { v.origins.push(v.origins[0]) }],
  ['overlapping allocation', v => { v.allocations[0].ranges.push(v.allocations[0].ranges[0]) }],
  ['missing allocation units', v => { v.allocations[0].ranges = [] }],
  ['lineage replay', v => { v.lineage.push(v.lineage[0]) }],
  ['transfer replay', v => { v.unitTransfers.push(v.unitTransfers[0]) }],
  ['missing split transfer', v => { v.unitTransfers.shift() }],
  ['changed split parent', v => { v.lineage.find(l => l.parentId)!.parentId = 'forged' }],
  ['disposed units reintroduced', v => { v.allocations[0].ranges = v.dispositions[0].ranges }],
  ['missing production', v => { v.productions.pop() }],
  ['duplicate production', v => { v.productions.push(v.productions[0]) }],
  ['reset firstBandageUsed', v => { v.choices.firstBandageUsed = false }],
  ['changed ItemState binding', v => { v.itemStates.states[0].instanceId = 'substitute' }],
  ['extra production field', v => { Reflect.set(v.productions[0], 'completed', true) }],
]
describe('R06 R07 source units, split lineage and medical history', () => {
  it.each(mutations)('rejects %s through actual P aggregate invariants', (_name, mutate) => {
    const { f, value } = organized(), bad = mutable(value)
    mutate(bad)
    expect(() => read(bad, expectation(value, f.dependencies), f.policy)).toThrow()
    expect(value.choices.firstBandageUsed).toBe(true)
  })
  it('same-definition equal-total cross-origin substitution is not accepted', () => {
    const f = fixture()
    let v = pickAlias(f, searchAt(f, f.value, 'H1-search'), 'metal', 0)
    v = pickAlias(f, searchAt(f, v, 'C4-cabinet'), 'metal', 1)
    const bad = mutable(v), [a, b] = bad.carried.backpack.items
    const aa = bad.allocations.find(x => x.instanceId === a.instanceId)!, bb = bad.allocations.find(x => x.instanceId === b.instanceId)!
    expect(a.definitionId).toBe(b.definitionId); expect(a.quantity).toBe(b.quantity)
    const saved = aa.ranges; aa.ranges = bb.ranges; bb.ranges = saved
    expect(() => read(bad, expectation(v, f.dependencies), f.policy)).toThrow()
  })
})
const closedMutations: [string, Change][] = [
  ['task wrong execution', v => { v.origins.find(o => o.producerId === 'sample')!.binding.execution.seed = 'wrong' }],
  ['task wrong ordinal', v => { v.origins.find(o => o.producerId === 'sample')!.ordinal = 1 }],
  ['task substitute instance', v => { v.dispositions.find(d => d.kind === 'delivered')!.item.instanceId = 'substitute' }],
  ['production after closure', v => { v.productions[0].revision = v.receipts[0].revision }],
  ['installation recipe missing', v => { v.dispositions.splice(v.dispositions.findIndex(d => d.kind === 'installed'), 1) }],
  ['success sample disposition wrong', v => { v.dispositions.find(d => d.kind === 'delivered')!.kind = 'partial-delivery' }],
  ['wallet reward changed', v => { v.balance++ }],
  ['receipt replay', v => { v.receipts.push(v.receipts[0]) }],
  ['archive missing', v => { v.archives = [] }],
  ['closure changed to death', v => { const m = v.missions[0]; if (m.status === 'closed') m.outcome = 'death' }],
  ['latest clock changed', v => { if (v.character.clock.kind === 'return-due') v.character.clock.source.execution.seed = 'other' }],
  ['terminal disposition reason', v => { v.dispositions.find(d => d.kind === 'delivered')!.reason = 'recipe' }],
]
describe('R08 R09 real installation, delivered sample and passive closure', () => {
  const traceMutations: [string, Change][] = [
    ['empty death trace', v => { v.receipts[0].steps = [] }],
    ['reordered death trace', v => { v.receipts[0].steps.reverse() }],
    ['false damage fact', v => { v.receipts[0].steps[1].facts.damage = 0 }],
    ['unknown trace fact', v => { v.receipts[0].steps[0].facts.future = 1 }],
    ['bleeding qualification lost', v => { v.character.body.condition.bleeding = false }],
    ['continued after death', v => { v.receipts[0].steps.push(v.receipts[0].steps[1]) }],
    ['primary exposure lost', v => { v.receipts[0].steps[0].facts.exposuresAdded = 1 }],
  ]
  it.each(traceMutations)('rejects %s without evaluating body rules', (_name, mutate) => {
    const { f, rows } = states(), value = rows.find(v => v.phase === 'dead')!, bad = mutable(value)
    mutate(bad)
    expect(() => read(bad, expectation(value, f.dependencies), f.policy)).toThrow()
  })
  it.each(closedMutations)('rejects %s', (_name, mutate) => {
    const f = fixture(), value = successful(f), bad = mutable(value)
    mutate(bad)
    expect(() => read(bad, expectation(value, f.dependencies), f.policy)).toThrow()
  })
  it.each(['receipt', 'archive', 'cycles', 'old-outcome'] as const)('two-declaration %s history tampering rejects', field => {
    const h = history('success'), bad = mutable(h.dead), e = expectation(h.dead, h.f.dependencies)
    if (field === 'receipt') bad.receipts.reverse()
    if (field === 'archive') bad.archives.reverse()
    if (field === 'cycles') bad.receipts[1].startCycle++
    if (field === 'old-outcome') {
      const m = bad.missions[0]; if (m.status === 'closed') m.outcome = 'death'
      bad.receipts[0].outcome = 'death'
    }
    expect(() => read(bad, e, h.policy)).toThrow()
    expect(() => restoreSupplyResidenceCandidate(bad, h.dead, e, h.policy)).toThrow()
  })
})
