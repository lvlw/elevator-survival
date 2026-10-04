import { describe, expect, it } from 'vitest'
import { infectedResidenceConfig as g1 } from '../../content/infected-residence-core-v0.1/config'
import { infectedTerminalCoreConfig as config } from '../../content/infected-terminal-core-v0.1/config'
import { planResidenceTerminal } from './controlled'
import { queryTerminalEligibility } from './index'
import { command, fixture, mutable } from './test-fixtures'

describe('T01 T02 T04 complete normal terminal transactions', () => {
  it.each([1, 7])('Day %i success preserves genuine empty G1 steps and body without overnight', (day) => {
    const f = fixture(g1, config, { day, complete: true, hp: 1, balance: 47 })
    const before = structuredClone(f.value)
    const p = planResidenceTerminal(f.value, command(f.value, 'deliver'), f.authority)
    expect(p.snapshot.phase).toBe('living-hub')
    expect(p.snapshot.balance).toBe(167)
    expect(p.snapshot.character.body).toEqual(before.character.body)
    expect(p.snapshot.character.cycle).toBe(day)
    expect(p.snapshot.character.revision).toBe(before.character.revision + 1)
    expect(p.snapshot.character.clock).toMatchObject({ kind: 'return-due', source: { taskDay: day, outcome: 'success' } })
    expect(p.snapshot.receipts[0]).toMatchObject({ steps: [], reward: 120, penalty: 0, deathCause: null })
    expect(p.snapshot.dispositions[0].item).toEqual(f.value.carried.backpack.items[0])
    expect(p.snapshot.dispositions[0].kind).toBe('delivered')
    expect(p.snapshot.carried.backpack.items).toEqual([])
    expect(f.value).toEqual(before)
  })
  it.each([1, 7])('Day %i incomplete withdrawal is a real empty-step return', (day) => {
    const f = fixture(g1, config, { day })
    const result = planResidenceTerminal(f.value, command(f.value, 'withdraw'), f.authority).snapshot
    expect(result.character.body).toEqual(f.value.character.body)
    expect(result.character.cycle).toBe(day)
    expect(result.receipts[0]).toMatchObject({ steps: [], outcome: 'voluntary-failure', reward: 0 })
  })
  it.each([[0, 0, 0], [19, 19, 0], [20, 20, 0], [47, 20, 27]])('failure P%i deducts only %i, leaves %i', (balance, penalty, after) => {
    const f = fixture(g1, config, { balance, sample: true })
    const result = planResidenceTerminal(f.value, command(f.value, 'withdraw'), f.authority).snapshot
    expect(result.balance).toBe(after)
    expect(result.receipts[0]).toMatchObject({ reward: 0, penalty, forfeited: 0 })
    expect(result.dispositions[0].kind).toBe('partial-delivery')
  })
  it.each([true, false])('wrong explicit intent never falls back (complete %s)', (complete) => {
    const f = fixture(g1, config, { complete })
    expect(() => planResidenceTerminal(f.value, command(f.value, complete ? 'withdraw' : 'deliver'), f.authority)).toThrow()
  })
  it.each(['road-open', 'installed'])('missing %s denies success; no hotel gate exists', (id) => {
    const f = fixture(g1, config, { complete: true })
    const v = mutable(f.value); v.site!.facts.find((x) => x.id === id)!.value = false
    expect(queryTerminalEligibility(v, f.authorize(v))).toEqual({ deliver: false, withdraw: true, deadline: false })
  })
  it('ground sample is not a carried success certificate', () => {
    const f = fixture(g1, config, { complete: true })
    const v = mutable(f.value); v.site!.ground[0].items.push(...v.carried.backpack.items)
    v.carried.backpack.items = []; v.carried.backpack.placements = []
    expect(queryTerminalEligibility(v, f.authorize(v)).deliver).toBe(false)
    const p = planResidenceTerminal(v, command(v, 'withdraw'), f.authorize(v))
    expect(p.snapshot.archives[0].site.ground[0].items).toHaveLength(1)
    expect(p.snapshot.warehouse.items).toHaveLength(0)
  })
  it.each(['fake-id', 'wrong-definition', 'unclaimed'])('sample %s cannot grant success', (kind) => {
    const f = fixture(g1, config, { complete: true }); const v = mutable(f.value)
    if (kind === 'unclaimed') v.site!.sources.find((s) => s.id === 'sample')!.claimed = false
    else if (kind === 'fake-id') {
      v.carried.backpack.items[0].instanceId = 'same-name-fake'
      v.carried.backpack.placements[0].instanceId = 'same-name-fake'; v.itemStates.states[0].instanceId = 'same-name-fake'
    } else {
      v.carried.backpack.items[0].definitionId = 'component'; v.itemStates.states[0].definitionId = 'component'
    }
    expect(queryTerminalEligibility(v, f.authorize(v)).deliver).toBe(false)
  })
})

describe('T03 actual deadline cycle', () => {
  it('Day7 away settles once and advances character D, never creates old task Day8', () => {
    const f = fixture(g1, config, { day: 7, node: 'b', balance: 47 })
    const s = planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority).snapshot
    expect(s.character.cycle).toBe(8)
    expect(s.character.clock).toMatchObject({ kind: 'deadline-ready', source: { taskDay: 7, endCycle: 7, outcome: 'deadline-failure' } })
    expect(s.receipts[0].steps.map((s) => s.kind)).toEqual(['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
    expect(s.balance).toBe(27)
  })
  it.each([
    { hp: 1, bleeding: true, cause: 'cycle-bleeding', kinds: ['cycle-bleeding'] },
    { hp: 1, infection: 60, cause: 'infection', kinds: ['cycle-bleeding', 'infection'] },
    { hp: 1, satiety: 1, cause: 'hunger', kinds: ['cycle-bleeding', 'infection', 'hunger'] },
  ])('deadline real $cause death short-circuits with no dead cycle increment', ({ cause, kinds, ...options }) => {
    const f = fixture(g1, config, { ...options, day: 7, node: 'b', balance: 47 })
    const s = planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority).snapshot
    expect(s.phase).toBe('dead'); expect(s.character.cycle).toBe(7)
    expect(s.character.clock).toEqual(f.value.character.clock)
    expect(s.character.body.condition.currentHealth).toBe(0)
    expect(s.receipts[0]).toMatchObject({ deathCause: cause, penalty: 0, reward: 0, forfeited: 47 })
    expect(s.receipts[0].steps.map((s) => s.kind)).toEqual(kinds)
  })
  it.each([{ day: 6, node: 'b' as const }, { day: 7, node: 'a' as const }])('deadline rejects wrong boundary %j', (options) => {
    const f = fixture(g1, config, options)
    expect(() => planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority)).toThrow()
  })
})
