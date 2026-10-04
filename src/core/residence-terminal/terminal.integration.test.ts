import { afterEach, describe, expect, it, vi } from 'vitest'
import * as cycle from '../character-cycle'
import * as mission from '../mission-lifecycle/controlled'
import * as random from '../random'
import * as location from '../residence-location'
import * as locationControlled from '../residence-location/controlled'
import * as plans from './plans'
import { infectedResidenceConfig as g1 } from '../../content/infected-residence-core-v0.1/config'
import { infectedTerminalCoreConfig as config } from '../../content/infected-terminal-core-v0.1/config'
import { consumeResidenceLocationDeath, planResidenceTerminal } from './controlled'
import { locationOf } from './authority'
import { fixture, command, mutable } from './test-fixtures'

afterEach(() => vi.restoreAllMocks())
const observe = () => ({ g1: vi.spyOn(cycle, 'planCharacterCycle'), close: vi.spyOn(mission, 'terminateMission'),
  move: vi.spyOn(location, 'planResidenceMove'), reveal: vi.spyOn(location, 'planResidenceSourceReveal'),
  rest: vi.spyOn(locationControlled, 'planResidenceLocationRest'), draw: vi.spyOn(random, 'drawIntInclusive'),
  plan: vi.spyOn(plans, 'issueTerminalPlan'), io: vi.spyOn(Storage.prototype, 'setItem') })

describe('T05 T08 T09 actual producer and A-consumption counts', () => {
  it.each([
    { label: 'normal', day: 1, node: 'a' as const, hp: 12, kind: 'withdraw' as const, phase: 'living-hub' },
    { label: 'deadline living', day: 7, node: 'b' as const, hp: 12, kind: 'deadline' as const, phase: 'living-hub' },
    { label: 'deadline death', day: 7, node: 'b' as const, hp: 1, kind: 'deadline' as const, phase: 'dead' },
  ])('$label: A calls G1=1 close=1 complete-plan=1 draw=0 IO=0', ({ day, node, hp, kind, phase }) => {
    const f = fixture(g1, config, { day, node, hp, bleeding: true }); const o = observe()
    const p = planResidenceTerminal(f.value, command(f.value, kind), f.authority)
    expect(p.snapshot.phase).toBe(phase)
    expect(o.g1).toHaveBeenCalledTimes(1); expect(o.close).toHaveBeenCalledTimes(1); expect(o.plan).toHaveBeenCalledTimes(1)
    expect(o.move).not.toHaveBeenCalled(); expect(o.reveal).not.toHaveBeenCalled(); expect(o.rest).not.toHaveBeenCalled()
    expect(o.draw).not.toHaveBeenCalled(); expect(o.io).not.toHaveBeenCalled()
    expect(p.snapshot.character.revision).toBe(f.value.character.revision + 1)
  })
  it.each([
    { mode: 'move', node: 'a' as const, energy: 100 }, { mode: 'move', node: 'a' as const, energy: 1 },
    { mode: 'reveal', node: 'a' as const, energy: 100 }, { mode: 'reveal', node: 'a' as const, energy: 1 },
    { mode: 'rest', node: 'a' as const, energy: 0 }, { mode: 'rest', node: 'b' as const, energy: 0 },
  ])('real $mode death at $node E$energy is consumed with zero replay', ({ mode, node, energy }) => {
    const f = fixture(g1, config, { hp: 1, bleeding: true, node, energy, balance: 47 })
    const s = locationOf(f.value); const a = f.authorityFor(s); const d = f.locationDependencies; const base = command(f.value, 'withdraw')
    const o = observe()
    const original = mode === 'move' ? location.planResidenceMove(s, { ...base, kind: 'move', edgeId: 'ab' }, a, d)
      : mode === 'reveal' ? location.planResidenceSourceReveal(s, { ...base, kind: 'reveal', sourceId: 'lottery-a' }, a, d)
        : locationControlled.planResidenceLocationRest(s, { ...base, kind: 'rest' }, a, d)
    expect(o.g1).toHaveBeenCalledTimes(mode === 'rest' ? 1 : 0)
    expect(o.move).toHaveBeenCalledTimes(mode === 'move' ? 1 : 0)
    expect(o.reveal).toHaveBeenCalledTimes(mode === 'reveal' ? 1 : 0)
    expect(o.rest).toHaveBeenCalledTimes(mode === 'rest' ? 1 : 0)
    expect(o.draw).toHaveBeenCalledTimes(mode === 'reveal' ? 1 : 0)
    const before = structuredClone(original)
    const p = consumeResidenceLocationDeath(f.value, original, f.authority)
    expect(p.snapshot.phase).toBe('dead'); expect(p.snapshot.balance).toBe(0)
    expect(p.snapshot.character).toEqual(original.snapshot.character)
    expect(p.snapshot.archives[0].site).toEqual(original.snapshot.site)
    expect(p.snapshot.receipts[0].steps).toEqual(original.steps)
    expect(o.g1).toHaveBeenCalledTimes(mode === 'rest' ? 1 : 0)
    expect(o.move).toHaveBeenCalledTimes(mode === 'move' ? 1 : 0)
    expect(o.reveal).toHaveBeenCalledTimes(mode === 'reveal' ? 1 : 0)
    expect(o.rest).toHaveBeenCalledTimes(mode === 'rest' ? 1 : 0)
    expect(o.draw).toHaveBeenCalledTimes(mode === 'reveal' ? 1 : 0)
    expect(o.close).toHaveBeenCalledTimes(1); expect(o.plan).toHaveBeenCalledTimes(1); expect(o.io).not.toHaveBeenCalled()
    expect(original).toEqual(before)
    if (energy === 1) { expect(original.energyCost).toBe(8); expect(p.snapshot.character.body.energy).toBe(0) }
    if (mode === 'reveal') {
      expect(p.snapshot.archives[0].site.sources.find((s) => s.id === 'lottery-a')).toMatchObject({ claimed: true, drawIndex: 1 })
      expect(p.snapshot.archives[0].site.ground[0].items.length).toBeGreaterThan(0)
      expect(p.snapshot.archives[0].itemStates).toEqual(original.snapshot.itemStates)
    }
  })
  it('wrong intent is rejected before any producer, closure, completed plan or IO', () => {
    const f = fixture(g1, config); const o = observe()
    expect(() => planResidenceTerminal(f.value, command(f.value, 'deliver'), f.authority)).toThrow()
    for (const spy of Object.values(o)) expect(spy).not.toHaveBeenCalled()
  })
  it.each(['revision', 'binding'])('wrong request %s is a zero-producer rejection', (fault) => {
    const f = fixture(g1, config); const q = mutable(command(f.value, 'withdraw')); const o = observe()
    if (fault === 'revision') q.expectedRevision++
    else q.binding.execution.runId = 'other-execution'
    expect(() => planResidenceTerminal(f.value, q, f.authority)).toThrow()
    for (const spy of Object.values(o)) expect(spy).not.toHaveBeenCalled()
  })
  it('real primary arrival death retains arrival and pending encounter without executing combat', () => {
    const f = fixture(g1, config, { hp: 1, arrivalDamage: 1, encounterOnArrival: true })
    const current = locationOf(f.value); const o = observe()
    const death = location.planResidenceMove(current, { ...command(f.value, 'withdraw'), kind: 'move', edgeId: 'ab' }, f.authorityFor(current), f.locationDependencies)
    const p = consumeResidenceLocationDeath(f.value, death, f.authority)
    expect(p.snapshot.archives[0].site).toEqual(death.snapshot.site)
    expect(p.snapshot.archives[0].site.pending).toEqual({ kind: 'combat-required', enemyId: 'guard' })
    expect(p.snapshot.receipts[0].steps.map((s) => s.kind)).toEqual(['primary'])
    expect(p.snapshot.receipts[0].deathCause).toBe('primary')
    expect(o.move).toHaveBeenCalledTimes(1); expect(o.g1).not.toHaveBeenCalled(); expect(o.draw).not.toHaveBeenCalled()
  })
  it('alive pending encounter blocks deadline without calling a producer', () => {
    const f = fixture(g1, config, { day: 7, encounterOnArrival: true }); const current = locationOf(f.value)
    const next = location.planResidenceMove(current, { ...command(f.value, 'withdraw'), kind: 'move', edgeId: 'ab' }, f.authorityFor(current), f.locationDependencies)
    const v = { ...f.value, ...next.snapshot }; const authority = f.authorize(v); const o = observe()
    expect(() => planResidenceTerminal(v, command(v, 'deadline'), authority)).toThrow()
    for (const spy of Object.values(o)) expect(spy).not.toHaveBeenCalled()
  })
  it.each([{ node: 'a' as const, infection: 60, cause: 'infection' }, { node: 'b' as const, satiety: 1, cause: 'hunger' }])('actual rest $cause death does not repeat settlement', ({ cause, ...options }) => {
    const f = fixture(g1, config, { ...options, hp: 1 }); const current = locationOf(f.value); const o = observe()
    const p = locationControlled.planResidenceLocationRest(current, { ...command(f.value, 'withdraw'), kind: 'rest' }, f.authorityFor(current), f.locationDependencies)
    const end = consumeResidenceLocationDeath(f.value, p, f.authority)
    expect(end.snapshot.receipts[0].deathCause).toBe(cause)
    expect(end.snapshot.character).toEqual(p.snapshot.character)
    expect(o.g1).toHaveBeenCalledTimes(1); expect(o.rest).toHaveBeenCalledTimes(1); expect(o.draw).not.toHaveBeenCalled()
  })
})
