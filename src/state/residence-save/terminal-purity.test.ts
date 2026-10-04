import { afterEach, describe, expect, it, vi } from 'vitest'
import * as cycle from '../../core/character-cycle'
import * as energy from '../../core/residence-energy'
import * as mission from '../../core/mission-lifecycle/controlled'
import * as random from '../../core/random'
import * as location from '../../core/residence-location'
import * as locationControlled from '../../core/residence-location/controlled'
import * as terminal from '../../core/residence-terminal/controlled'
import * as plans from '../../core/residence-terminal/plans'
import * as session from '../residence-session/session'
import { createTerminalResidenceEnvelope, deserializeTerminalResidenceSave, serializeTerminalResidenceSave, restoreTerminalResidenceCandidate } from './terminal-index'
import { initial, fixture, history, normal, death, roundTrip, mutable, command, locationOf } from './terminal-test-fixtures'

afterEach(() => vi.restoreAllMocks())
function observe() {
  return {
    cycle: vi.spyOn(cycle, 'planCharacterCycle'), energy: vi.spyOn(energy, 'planResidenceAction'),
    activate: vi.spyOn(mission, 'activateMission'), terminate: vi.spyOn(mission, 'terminateMission'),
    firstFactFactory: vi.spyOn(mission, 'establishMissionFact'), siteFactory: vi.spyOn(locationControlled, 'establishResidenceLocation'),
    catalogFactory: vi.spyOn(locationControlled, 'createLocationCatalog'),
    move: vi.spyOn(location, 'planResidenceMove'), reveal: vi.spyOn(location, 'planResidenceSourceReveal'),
    transfer: vi.spyOn(location, 'planResidenceItemTransfer'), rest: vi.spyOn(locationControlled, 'planResidenceLocationRest'),
    settle: vi.spyOn(terminal, 'planResidenceTerminal'), consumeDeath: vi.spyOn(terminal, 'consumeResidenceLocationDeath'),
    authority: vi.spyOn(terminal, 'createTerminalAuthority'), issuePlan: vi.spyOn(plans, 'issueTerminalPlan'),
    drawInt: vi.spyOn(random, 'drawIntInclusive'), drawFloat: vi.spyOn(random, 'drawFloat01'),
    drawChance: vi.spyOn(random, 'drawChance'), drawUint: vi.spyOn(random, 'drawUint32'),
    ownerFactory: vi.spyOn(session, 'buildResidenceSession'),
    read: vi.spyOn(Storage.prototype, 'getItem'), write: vi.spyOn(Storage.prototype, 'setItem'),
    remove: vi.spyOn(Storage.prototype, 'removeItem'), clear: vi.spyOn(Storage.prototype, 'clear'),
  }
}
function frozenGraph(value: unknown) {
  if (!value || typeof value !== 'object') return
  expect(Object.isFrozen(value)).toBe(true)
  Object.values(value).forEach(frozenGraph)
}
describe('B11 pure codec with counters independent from native fixture construction', () => {
  it.each(['fresh', 'active', 'normal', 'deadline', 'g2-death', 'two-history'] as const)('%s codec never executes producers, creates an owner, draws or performs IO', (kind) => {
    const o = observe()
    let pair
    if (kind === 'fresh' || kind === 'active') {
      const f = initial(); pair = { value: kind === 'fresh' ? f.fresh : f.depart().value, policy: f.policy }
      expect(o.firstFactFactory).toHaveBeenCalledTimes(1)
      expect(o.activate).toHaveBeenCalledTimes(kind === 'active' ? 1 : 0)
    } else if (kind === 'two-history') {
      const f = history(true); pair = { value: f.final, policy: f.policy }
      expect(o.terminate).toHaveBeenCalledTimes(2)
      expect(o.consumeDeath).toHaveBeenCalledTimes(1)
    } else {
      const f = fixture(kind === 'deadline' ? { day: 7, node: 'b' } : kind === 'g2-death' ? { hp: 1, bleeding: true } : {})
      const value = kind === 'normal' ? normal(f) : kind === 'g2-death' ? death(f, 'reveal').value
        : terminal.planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority).snapshot
      pair = { value, policy: f.policy }
      expect(o.terminate).toHaveBeenCalledTimes(1)
      expect(o.issuePlan).toHaveBeenCalledTimes(1)
      if (kind === 'g2-death') expect(o.drawInt).toHaveBeenCalledTimes(1)
    }
    // Independence is explicit: native setup counts above are not codec counts.
    Object.values(o).forEach((spy) => spy.mockClear())
    const raw = mutable(pair.value)
    const before = structuredClone(raw)
    const text = serializeTerminalResidenceSave(raw, pair.policy)
    expect(serializeTerminalResidenceSave(raw, pair.policy)).toBe(text)
    const candidate = deserializeTerminalResidenceSave(text, pair.policy)
    expect(deserializeTerminalResidenceSave(text, pair.policy)).toEqual(candidate)
    expect(restoreTerminalResidenceCandidate(candidate, pair.value, pair.policy).value).toEqual(pair.value)
    frozenGraph(createTerminalResidenceEnvelope(raw, pair.policy))
    frozenGraph(candidate)
    expect(raw).toEqual(before)
    expect(Object.isFrozen(raw)).toBe(false)
    expect(Object.isFrozen(raw.character.body)).toBe(false)
    for (const [name, spy] of Object.entries(o)) expect(spy, `${name} codec count`).toHaveBeenCalledTimes(0)
  })
  it('reconstructed TerminalPlan and G2 plan do not regain signing capability', () => {
    const f = fixture({ hp: 1, bleeding: true })
    const s = locationOf(f.value)
    const p = location.planResidenceMove(s, { ...command(f.value, 'withdraw'), kind: 'move', edgeId: 'ab' }, f.authorityFor(s), f.locationDependencies)
    const end = terminal.consumeResidenceLocationDeath(f.value, p, f.authority)
    const candidate = roundTrip(end.snapshot, f.policy)
    if (candidate.phase === 'fresh-hub') throw new Error('Not the native terminal phase')
    expect(() => terminal.assertTerminalPlanCurrent(f.value, { ...end, snapshot: candidate }, f.authority))
      .toThrowError(expect.objectContaining({ code: 'UNISSUED_PLAN' }))
    expect(() => location.assertResidenceLocationPlanCurrent(s, mutable(p), f.authorityFor(s), f.locationDependencies)).toThrow()
  })
  it('raw mutable nested states are copied; modifying caller after a read cannot mutate candidate', () => {
    const f = fixture(); const raw = mutable(f.value); const copy = roundTrip(raw, f.policy)
    raw.character.body.energy = 0; raw.site!.facts[0].value = true
    expect(copy).toEqual(f.value)
  })
  it('new runtime imports no session, content, fixture, browser, random draw or installation APIs', () => {
    const files = import.meta.glob<string>(['./terminal-types.ts', './terminal-policy.ts', './terminal-validation.ts', './terminal-history.ts',
      './terminal-expected.ts', './terminal-codec.ts', './terminal-controlled.ts', './terminal-index.ts'], { query: '?raw', import: 'default', eager: true })
    expect(Object.keys(files)).toHaveLength(8)
    for (const source of Object.values(files)) {
      expect(source).not.toMatch(/from\s+['"][^'"]*(?:residence-session|content\/|test-fixtures|react|zustand)['"]?/)
      expect(source).not.toMatch(/Math\.random|Date\.now|new Date\(|randomUUID|localStorage|sessionStorage|\bdraw(?:IntInclusive|Uint32|Chance|Float01)\s*\(/)
    }
  })
})
