import { describe, expect, it } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { fixture as makeFixture } from '../residence-supply/test-fixtures'
import { atNode } from '../residence-task/test-fixtures'
import { planSupplyTerminal } from './supply-terminal'
describe('P10 explicit supply terminal', () => {
  it('normal H0 failure retains empty G1 steps, body, ordinary identities', () => {
    const f = fixture(), before = f.value
    const p = planSupplyTerminal(before, { kind: 'withdraw', expectedRevision: before.character.revision }, f.authorize(before))
    expect(p.steps).toEqual([])
    expect(p.snapshot.character.body).toEqual(before.character.body)
    expect(p.snapshot.carried).toEqual(before.carried)
    expect(p.snapshot.phase).toBe('living-hub')
    expect(p.snapshot.receipts[0].penalty).toBe(0)
    expect(() => planSupplyTerminal(p.snapshot, { kind: 'withdraw', expectedRevision: p.snapshot.character.revision }, f.authorize(p.snapshot))).toThrow()
  })
  it.each([false, true])('real remote Day7 deadline death=%s', dead => {
    const f = fixture()
    const root = atNode(f, f.value, 'H1')
    if (root.character.clock.kind !== 'active') throw new Error('test clock')
    const v = { ...root, character: { ...root.character, cycle: 7, clock: { ...root.character.clock, taskDay: 7 },
      body: { ...root.character.body, condition: { ...root.character.body.condition, currentHealth: dead ? 1 : 12, bleeding: dead } } } }
    const p = planSupplyTerminal(v, { kind: 'deadline', expectedRevision: v.character.revision }, f.authorize(v))
    expect(p.snapshot.phase).toBe(dead ? 'dead' : 'living-hub')
    expect(p.steps.map(s => s.kind)).toEqual(dead ? ['cycle-bleeding'] : ['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
    expect(p.snapshot.character.cycle).toBe(dead ? 7 : 8)
  })
})
