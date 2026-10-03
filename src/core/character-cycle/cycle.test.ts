import { describe, expect, it } from 'vitest'
import { deepFreeze } from '../config'
import { createMissionScope, establishMissionFact } from '../mission-lifecycle/controlled'
import { infectedResidenceConfig as configuration } from '../../content/infected-residence-core-v0.1/config'
import { ResidenceError } from '../residence-config'
import { createCycleRequest, planCharacterCycle, queryCycleDeparture, readCycleContext } from './index'
import type { CharacterCycleState, CycleAuthority, ResidenceDependencies } from './types'

const rulesVersion = 'g1-isolated-rules'
const first = { worldId: 'test-world', templateId: 'test-template', commissionId: 'one', rulesVersion, contractVersion: 'test-contract' }
const second = { ...first, commissionId: 'two' }
const scope = createMissionScope({ characterId: 'character', declarations: [first, second] }, (v) => v === rulesVersion)
const dependencies: ResidenceDependencies = { configuration, rulesVersion, scope }
function fixture(day = 1) {
  const state: CharacterCycleState = {
    identity: { characterId: 'character', rulesVersion, configurationId: configuration.configurationId }, revision: 0, cycle: day,
    body: { condition: { currentHealth: 12, bleeding: false, openWounds: [{ id: 'real-wound', kind: 'bite', treatment: 'treated' }],
      minorContusions: 2, painkillerActive: true, pendingInfectionExposures: 0 },
    energy: 95, infectionProgress: 0, satiety: 6, suppression: 0, quotasRemaining: { suppressant: 1, disinfectant: 0, pipe_signature: 0 } },
    clock: { kind: 'active', mission: first, execution: { runId: 'run-one', seed: 'seed-one', rulesVersion }, startCycle: 1, taskDay: day },
  }
  const authority: CycleAuthority = { identity: state.identity, revision: state.revision, cycle: state.cycle,
    stableContext: 'stable', rest: 'A', lifecycle: state.clock as Extract<typeof state.clock, { kind: 'active' }>, normalReturn: null, departure: null }
  return { state, authority }
}
const binding = (s: CharacterCycleState) => ({ identity: s.identity, expectedRevision: s.revision })
const rest = (s: CharacterCycleState, a: CycleAuthority, mode: 'A' | 'C' = 'A') =>
  planCharacterCycle(s, { ...binding(s), kind: 'rest', rest: mode }, { ...a, rest: mode }, dependencies)
function nextDeparture() {
  const fact = establishMissionFact({ characterId: 'character', mission: second }, scope)
  if (fact.status !== 'unaccepted') throw new Error('fixture')
  return { mission: fact, execution: { runId: 'run-two', seed: 'seed-two', rulesVersion } }
}

describe('G1 ordered character cycle', () => {
  it.each([[59, 69, 11], [89, 104, 10], [110, 130, 9], [120, 140, 9], [0, 0, 12]])(
    'old infection %i grows to %i and NEW progress determines HP %i', (infectionProgress, progress, health) => {
      const { state, authority } = fixture()
      const result = rest({ ...state, body: { ...state.body, infectionProgress } }, authority)
      expect(result.snapshot.body.infectionProgress).toBe(progress)
      expect(result.snapshot.body.condition.currentHealth).toBe(health)
      expect(result.outcome).toBe('alive')
      expect(result.steps.map((s) => s.kind)).toEqual(['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
    },
  )
  it.each([[110, 0, 15, 115, 10], [0, 1, 0, 20, 12], [0, 0, 15, 0, 12], [1, 0, 15, 1, 12], [0, 1, 15, 5, 12]])(
    'actual suppression/exposure: I%i exposures%i suppression%i -> I%i HP%i', (infectionProgress, pendingInfectionExposures, suppression, progress, hp) => {
      const { state, authority } = fixture()
      const body = { ...state.body, infectionProgress, suppression, quotasRemaining: { ...state.body.quotasRemaining, suppressant: suppression ? 0 : 1 },
        condition: { ...state.body.condition, pendingInfectionExposures } }
      const result = rest({ ...state, body }, authority)
      expect(result.snapshot.body.infectionProgress).toBe(progress)
      expect(result.snapshot.body.condition.currentHealth).toBe(hp)
      expect(result.snapshot.body.condition.pendingInfectionExposures).toBe(0)
      expect(result.snapshot.body.suppression).toBe(0)
      expect(result.snapshot.body.quotasRemaining).toEqual({ suppressant: 1, disinfectant: 1, pipe_signature: 1 })
    },
  )
  it.each(['cycle-bleeding', 'infection', 'hunger'] as const)('%s death short-circuits unexecuted stages and clock', (cause) => {
    const { state, authority } = fixture()
    const body = { ...state.body, infectionProgress: cause === 'infection' ? 110 : 0, satiety: cause === 'hunger' ? 2 : 4,
      condition: { ...state.body.condition, currentHealth: cause === 'cycle-bleeding' ? 2 : cause === 'infection' ? 3 : 1,
        bleeding: cause === 'cycle-bleeding', pendingInfectionExposures: cause === 'cycle-bleeding' ? 1 : 0 } }
    const result = rest({ ...state, body }, authority)
    expect(result.outcome).toBe('death')
    expect(result.deathCause).toBe(cause)
    expect(result.steps.at(-1)?.kind).toBe(cause)
    expect(result.snapshot.body.condition.currentHealth).toBe(0)
    expect(result.snapshot.cycle).toBe(state.cycle)
    expect(result.snapshot.clock).toEqual(state.clock)
    expect(result.snapshot.body.energy).toBe(95)
    expect(result.snapshot.body.condition.painkillerActive).toBe(true)
    expect(result.snapshot.body.quotasRemaining).toEqual(body.quotasRemaining)
    if (cause !== 'hunger') expect(result.snapshot.body.satiety).toBe(4)
    if (cause === 'cycle-bleeding') {
      expect(result.snapshot.body.infectionProgress).toBe(0)
      expect(result.snapshot.body.condition.pendingInfectionExposures).toBe(1)
    }
  })
  it.each([[95, 'C', 85], [0, 'C', 85], [0, 'A', 100]] as const)('rest E%i/%s resets to %i without healing/clearing real injuries', (energy, mode, expected) => {
    const { state, authority } = fixture()
    const body = { ...state.body, energy, condition: { ...state.body.condition, bleeding: true } }
    const result = rest({ ...state, body }, authority, mode)
    expect(result.snapshot.body.energy).toBe(expected)
    expect(result.snapshot.body.condition.currentHealth).toBe(10)
    expect(result.snapshot.body.condition.bleeding).toBe(true)
    expect(result.snapshot.body.condition.openWounds).toEqual(body.condition.openWounds)
    expect(result.snapshot.body.condition.minorContusions).toBe(2)
    expect(result.snapshot.body.condition.painkillerActive).toBe(false)
    expect(result.snapshot.cycle).toBe(2)
    expect(result.snapshot.clock).toMatchObject({ taskDay: 2, startCycle: 1 })
  })
  it('accepts frozen input; does not mutate or freeze mutable callers; plans are deeply immutable and deterministic', () => {
    const { state, authority } = fixture()
    const before = structuredClone({ state, authority })
    const one = rest(state, authority)
    expect({ state, authority }).toEqual(before)
    expect(Object.isFrozen(state.body.condition)).toBe(false)
    expect(Object.isFrozen(one.snapshot.body.condition.openWounds[0])).toBe(true)
    expect(rest(deepFreeze(structuredClone(state)), deepFreeze(structuredClone(authority)))).toEqual(one)
    expect(rest(state, authority)).toEqual(one)
  })
  it('normal Day7 return at E0 never settles a night or resets resources', () => {
    const { state, authority } = fixture(7)
    const input = { ...state, body: { ...state.body, energy: 0 } }
    const result = planCharacterCycle(input, { ...binding(input), kind: 'normal-return' }, { ...authority, normalReturn: 'success' }, dependencies)
    expect(result.steps).toEqual([])
    expect(result.snapshot.body).toEqual(input.body)
    expect(result.snapshot.cycle).toBe(7)
    expect(result.snapshot.clock).toMatchObject({ kind: 'return-due', source: { endCycle: 7, outcome: 'success' } })
  })
  it('deadline builds pending ready without demanding a precommitted closure; cannot consume it before closure', () => {
    const { state, authority } = fixture(7)
    const result = planCharacterCycle(state, { ...binding(state), kind: 'deadline' }, authority, dependencies)
    expect(result.snapshot.cycle).toBe(8)
    expect(result.snapshot.clock).toMatchObject({ kind: 'deadline-ready', source: { endCycle: 7, taskDay: 7 } })
    expect(result.requiresDeadlineClosure).toMatchObject({ outcome: 'deadline-failure', execution: { runId: 'run-one' } })
    expect(result.snapshot.clock).not.toHaveProperty('taskDay')
    expect(() => readCycleContext(result.snapshot, { ...authority, revision: 1, cycle: 8 }, dependencies)).toThrow(ResidenceError)
  })
  it('deadline death creates neither new day nor ready/closure', () => {
    const { state, authority } = fixture(7)
    const input = { ...state, body: { ...state.body, condition: { ...state.body.condition, currentHealth: 2, bleeding: true } } }
    const result = planCharacterCycle(input, { ...binding(input), kind: 'deadline' }, authority, dependencies)
    expect(result.snapshot.cycle).toBe(7)
    expect(result.snapshot.clock).toEqual(state.clock)
    expect(result.requiresDeadlineClosure).toBeNull()
  })
  it('first D1 consumes ready once without an imaginary previous day', () => {
    const f = fixture()
    const state: CharacterCycleState = { ...f.state, clock: { kind: 'first-ready' } }
    const authority: CycleAuthority = { ...f.authority, rest: null, lifecycle: { kind: 'first' }, departure: nextDeparture() }
    const request = { ...binding(state), kind: 'depart', commissionId: 'two' }
    expect(queryCycleDeparture(state, authority, dependencies)).toBe('available')
    const result = planCharacterCycle(state, request, authority, dependencies)
    expect(result.snapshot.body).toEqual(state.body)
    expect(result.snapshot.cycle).toBe(1)
    expect(result.steps).toEqual([])
    expect(result.snapshot.clock).toMatchObject({ kind: 'active', taskDay: 1, execution: { runId: 'run-two' } })
    expect(() => planCharacterCycle(state, request, { ...authority, revision: 1 }, dependencies)).toThrowError(expect.objectContaining({ code: 'STALE_REVISION' }))
  })
  it('no-content query and rejected departure preserve first ready and body', () => {
    const f = fixture()
    const state: CharacterCycleState = { ...f.state, clock: { kind: 'first-ready' } }
    const authority: CycleAuthority = { ...f.authority, rest: null, lifecycle: { kind: 'first' } }
    const before = structuredClone(state)
    expect(queryCycleDeparture(state, authority, dependencies)).toBe('no-content')
    expect(() => planCharacterCycle(state, { ...binding(state), kind: 'depart', commissionId: 'absent' }, authority, dependencies))
      .toThrowError(expect.objectContaining({ code: 'NO_AVAILABLE_COMMISSION' }))
    expect(state).toEqual(before)
  })
  it.each(['day7-rest', 'early-deadline', 'unsettled', 'missing-return', 'wrong-D', 'stale-revision', 'wrong-character', 'wrong-rules', 'wrong-config', 'wrong-seed', 'undeclared', 'dead', 'cycle-overflow', 'revision-overflow'])('%s rejects without mutation', (kind) => {
    let { state, authority } = fixture(kind === 'day7-rest' ? 7 : 1)
    let request: unknown = { ...binding(state), kind: 'rest', rest: 'A' }
    if (kind === 'early-deadline') request = { ...binding(state), kind: 'deadline' }
    if (kind === 'missing-return') request = { ...binding(state), kind: 'normal-return' }
    if (kind === 'unsettled') authority = { ...authority, stableContext: 'unsettled' }
    if (kind === 'wrong-D') state = { ...state, cycle: 2 }
    if (kind === 'stale-revision') authority = { ...authority, revision: 1 }
    if (kind === 'wrong-character') state = { ...state, identity: { ...state.identity, characterId: 'another' } }
    if (kind === 'wrong-rules') state = { ...state, identity: { ...state.identity, rulesVersion: 'other' } }
    if (kind === 'wrong-config') state = { ...state, identity: { ...state.identity, configurationId: 'other' } }
    if ((kind === 'wrong-seed' || kind === 'undeclared') && state.clock.kind === 'active') state = { ...state, clock: { ...state.clock,
      execution: { ...state.clock.execution, seed: 'different' }, mission: kind === 'undeclared' ? { ...first, commissionId: 'absent' } : first } }
    if (kind === 'dead') state = { ...state, body: { ...state.body, condition: { ...state.body.condition, currentHealth: 0 } } }
    if (kind === 'cycle-overflow' && state.clock.kind === 'active') {
      const clock = { ...state.clock, startCycle: Number.MAX_SAFE_INTEGER }
      state = { ...state, cycle: Number.MAX_SAFE_INTEGER, clock }
      authority = { ...authority, cycle: state.cycle, lifecycle: clock }
    }
    if (kind === 'revision-overflow') {
      state = { ...state, revision: Number.MAX_SAFE_INTEGER }; authority = { ...authority, revision: state.revision }
      request = { ...binding(state), kind: 'rest', rest: 'A' }
    }
    const before = structuredClone({ state, authority, request })
    expect(() => planCharacterCycle(state, request, authority, dependencies)).toThrow(ResidenceError)
    expect({ state, authority, request }).toEqual(before)
  })
  it.each([-1, true, 1.5, '2', NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, undefined])('invalid body %s rejects even before guaranteed bleeding death', (bad) => {
    const { state, authority } = fixture()
    const input = { ...state, body: { ...state.body, infectionProgress: bad, condition: { ...state.body.condition, currentHealth: 2, bleeding: true } } }
    const before = structuredClone(input)
    expect(() => planCharacterCycle(input, { ...binding(state), kind: 'rest', rest: 'A' }, authority, dependencies)).toThrow(ResidenceError)
    expect(input).toEqual(before)
  })
  it('valid-looking counters with unsafe exposure multiplication reject before short-circuit', () => {
    const { state, authority } = fixture()
    const input = { ...state, body: { ...state.body, condition: { ...state.body.condition, currentHealth: 2, bleeding: true, pendingInfectionExposures: Number.MAX_SAFE_INTEGER } } }
    expect(() => planCharacterCycle(input, { ...binding(state), kind: 'rest', rest: 'A' }, authority, dependencies))
      .toThrowError(expect.objectContaining({ code: 'SAFE_INTEGER_OVERFLOW' }))
  })
  it('strict requests reject extra fields, missing mode and nonplain values', () => {
    const { state } = fixture()
    for (const input of [null, [], new (class {})(), { ...binding(state), kind: 'rest' },
      { ...binding(state), kind: 'rest', rest: 'A', ready: true }, { ...binding(state), kind: 'rest', rest: 'B' }]) {
      expect(() => createCycleRequest(input)).toThrow(ResidenceError)
    }
  })
  it('request cannot upgrade an independently available C rest to A or invent rest access', () => {
    const { state, authority } = fixture()
    for (const rest of ['C', null] as const) {
      const current = { ...authority, rest }
      expect(() => planCharacterCycle(state, { ...binding(state), kind: 'rest', rest: 'A' }, current, dependencies))
        .toThrowError(expect.objectContaining({ code: 'INVALID_CONTEXT' }))
    }
  })
  it.each(['progress-sum', 'exposure-sum', 'actual-suppression', 'duplicate-wound', 'extra-body', 'missing-body'])('rejects %s before any ordered damage', (kind) => {
    const { state, authority } = fixture()
    let body: unknown = state.body
    if (kind === 'progress-sum') body = { ...state.body, infectionProgress: Number.MAX_SAFE_INTEGER }
    if (kind === 'exposure-sum') body = { ...state.body, infectionProgress: 110,
      condition: { ...state.body.condition, pendingInfectionExposures: 450359962737049 } }
    if (kind === 'actual-suppression') body = { ...state.body, suppression: 15 }
    if (kind === 'duplicate-wound') body = { ...state.body, condition: { ...state.body.condition, openWounds: [state.body.condition.openWounds[0], state.body.condition.openWounds[0]] } }
    if (kind === 'extra-body') body = { ...state.body, currentHealth: 12 }
    if (kind === 'missing-body') body = { energy: 1 }
    const input = { ...state, body }
    const before = structuredClone(input)
    expect(() => planCharacterCycle(input, { ...binding(state), kind: 'rest', rest: 'A' }, authority, dependencies)).toThrow(ResidenceError)
    expect(input).toEqual(before)
  })
})
