import { describe, expect, it, vi } from 'vitest'
import { createMissionScope, establishMissionFact, activateMission, terminateMission } from '../mission-lifecycle/controlled'
import type { MissionDeclaration, MissionLifecycleValue } from '../mission-lifecycle'
import { infectedResidenceConfig as configuration } from '../../content/infected-residence-core-v0.1/config'
import { planResidenceAction, planTriggeredResidenceConsequence, queryResidenceAction } from '../residence-energy'
import type { ResidenceCompletion } from '../residence-energy'
import { ResidenceError } from '../residence-config'
import { planCharacterCycle, queryCycleDeparture, readCycleContext } from './index'
import type { ActiveCycleClock, CharacterCycleState, CycleAuthority, CycleClosure, ResidenceDependencies } from './index'

const rulesVersion = 'g1-isolated-rules'
const declaration = (commissionId: string): MissionDeclaration => ({ worldId: 'test-world', templateId: 'test-template', commissionId, rulesVersion, contractVersion: 'test-contract' })
const missions = ['one', 'two', 'three'].map(declaration)
const scope = createMissionScope({ characterId: 'character', declarations: missions }, (v) => v === rulesVersion)
const dependencies: ResidenceDependencies = { configuration, rulesVersion, scope }
const execution = (name: string) => ({ runId: `run-${name}`, seed: `seed-${name}`, rulesVersion })
const requestBinding = (s: CharacterCycleState) => ({ identity: s.identity, expectedRevision: s.revision })
const none = (completion: ResidenceCompletion) => ({ completion, effects: { healthLoss: 0, exposuresAdded: 0 } })
function unaccepted(index: number) {
  const value = establishMissionFact({ characterId: 'character', mission: missions[index] }, scope)
  if (value.status !== 'unaccepted') throw new Error('fixture must establish an unaccepted mission')
  return value
}
const departure = (index: number) => ({ mission: unaccepted(index), execution: execution(missions[index].commissionId) })
function fixture(day = 7) {
  const clock: ActiveCycleClock = { kind: 'active', mission: missions[0], execution: execution('one'), startCycle: 1, taskDay: day }
  const state: CharacterCycleState = { identity: { characterId: 'character', rulesVersion, configurationId: configuration.configurationId },
    revision: 0, cycle: day, clock,
    body: { energy: 1, infectionProgress: 0, satiety: 6, suppression: 0, quotasRemaining: { suppressant: 1, disinfectant: 1, pipe_signature: 1 },
      condition: { currentHealth: 12, bleeding: false, openWounds: [{ id: 'wound', kind: 'puncture', treatment: 'untreated' }],
        minorContusions: 1, painkillerActive: false, pendingInfectionExposures: 0 } } }
  const authority: CycleAuthority = { identity: state.identity, revision: 0, cycle: day, lifecycle: clock, stableContext: 'stable', rest: 'A', normalReturn: null, departure: null }
  const fact = activateMission(unaccepted(0), { binding: unaccepted(0).binding, execution: execution('one') }, scope)
  return { state, authority, fact }
}
function closedAuthority(state: CharacterCycleState, source: CycleClosure, next: number | null): CycleAuthority {
  return { identity: state.identity, revision: state.revision, cycle: state.cycle, stableContext: 'stable', rest: null,
    lifecycle: { kind: 'closed', source }, normalReturn: null, departure: next === null ? null : departure(next) }
}
function readyFixture() {
  const f = fixture()
  const plan = planCharacterCycle(f.state, { ...requestBinding(f.state), kind: 'deadline' }, f.authority, dependencies)
  if (!plan.requiresDeadlineClosure) throw new Error('expected pending closure')
  // Independent mission core closes the old execution; the fixture is NOT a production coordinator.
  const closed = terminateMission(f.fact, { binding: f.fact.binding, execution: execution('one'), outcome: 'deadline-failure' }, scope)
  if (closed.status !== 'closed') throw new Error('expected closure')
  const source = { ...plan.requiresDeadlineClosure, mission: closed.binding.mission, execution: closed.execution }
  return { state: plan.snapshot, source, authority: closedAuthority(plan.snapshot, source, 1), closed }
}

describe('G1 public energy/cycle/mission composition', () => {
  it('each edge uses the public entry; final positive-energy edge completes, next edge cannot trigger effects', () => {
    const f = fixture(1)
    let current = f.state
    let authority = f.authority
    const equipmentWitness = { pipe: { instanceId: 'real-pipe', durability: 0 }, flashlight: { charge: 0 } }
    const beforeEquipment = structuredClone(equipmentWitness)
    const provide = vi.fn(none)
    const edge = () => ({ ...requestBinding(current), action: 'move', cost: { kind: 'paid', base: 8, factors: [] } })
    current = planResidenceAction(current, edge(), authority, dependencies, provide).snapshot
    authority = { ...authority, revision: current.revision }
    expect(current.body.energy).toBe(0)
    expect(queryResidenceAction(current, edge(), authority, dependencies).canStart).toBe(false)
    expect(() => planResidenceAction(current, edge(), authority, dependencies, provide)).toThrow(ResidenceError)
    expect(provide).toHaveBeenCalledTimes(1)
    const triggered = planTriggeredResidenceConsequence(current, { ...requestBinding(current), triggerId: 'already-occurred' },
      { ...authority, stableContext: 'unsettled' }, { identity: current.identity, revision: current.revision, execution: execution('one'),
        triggerId: 'already-occurred', kind: 'immediate-result', effects: { healthLoss: 1, exposuresAdded: 1 } }, dependencies)
    current = triggered.snapshot
    authority = { ...authority, revision: current.revision }
    expect(current.body.condition.currentHealth).toBe(11)
    const rest = planCharacterCycle(current, { ...requestBinding(current), kind: 'rest', rest: 'C' }, { ...authority, rest: 'C' }, dependencies)
    expect(rest.snapshot.body.energy).toBe(85)
    expect(rest.snapshot.body.infectionProgress).toBe(20)
    expect(rest.snapshot.body.condition.currentHealth).toBe(11)
    expect(rest.snapshot.body.condition.openWounds).toEqual(f.state.body.condition.openWounds)
    expect(equipmentWitness).toEqual(beforeEquipment)
    expect(rest.snapshot.body).not.toHaveProperty('equipment')
  })
  it('deadline -> current hub medication -> consume ready -> normal return -> next due settles exactly once', () => {
    const f = readyFixture()
    let current: CharacterCycleState = { ...f.state, revision: f.state.revision + 1,
      body: { ...f.state.body, suppression: 15, quotasRemaining: { suppressant: 0, disinfectant: 0, pipe_signature: 0 },
        condition: { ...f.state.body.condition, painkillerActive: true } } }
    // Isolated witness of a future legitimate Hub mutation, not a new medical command.
    let authority = { ...f.authority, revision: current.revision }
    const oldRequest = { ...requestBinding(current), kind: 'depart', commissionId: 'two' }
    const departed = planCharacterCycle(current, oldRequest, authority, dependencies)
    expect(departed.steps).toEqual([])
    expect(departed.snapshot.body).toEqual(current.body)
    expect(departed.snapshot.cycle).toBe(8)
    current = departed.snapshot
    if (current.clock.kind !== 'active') throw new Error('new active')
    authority = { ...authority, revision: current.revision, lifecycle: current.clock, departure: null, normalReturn: 'success' }
    expect(() => planCharacterCycle(current, oldRequest, authority, dependencies)).toThrowError(expect.objectContaining({ code: 'STALE_REVISION' }))
    const secondFact = activateMission(unaccepted(1), { binding: unaccepted(1).binding, execution: execution('two') }, scope)
    const returned = planCharacterCycle(current, { ...requestBinding(current), kind: 'normal-return' }, authority, dependencies)
    expect(returned.snapshot.body).toEqual(current.body)
    const secondClosed = terminateMission(secondFact, { binding: secondFact.binding, execution: execution('two'), outcome: 'success' }, scope)
    current = returned.snapshot
    if (current.clock.kind !== 'return-due') throw new Error('normal return is due')
    authority = closedAuthority(current, current.clock.source, 2)
    const next = planCharacterCycle(current, { ...requestBinding(current), kind: 'depart', commissionId: 'three' }, authority, dependencies)
    expect(next.steps.map((s) => s.kind)).toEqual(['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
    expect(next.snapshot.cycle).toBe(9)
    expect(next.snapshot.body.satiety).toBe(2)
    expect(next.snapshot.body.suppression).toBe(0)
    expect(next.snapshot.body.condition.painkillerActive).toBe(false)
    expect(next.snapshot.body.quotasRemaining).toEqual({ suppressant: 1, disinfectant: 1, pipe_signature: 1 })
    expect(next.snapshot.clock).toMatchObject({ kind: 'active', startCycle: 9, taskDay: 1, mission: { commissionId: 'three' } })
    expect(secondClosed).toMatchObject({ outcome: 'success' })
    expect(f.closed).toMatchObject({ outcome: 'deadline-failure' })
  })
  it.each(['success', 'voluntary-failure'] as const)('future departure death preserves prior %s and does not activate the next mission', (outcome) => {
    const f = fixture(3)
    const prepared = { ...f.state, body: { ...f.state.body, condition: { ...f.state.body.condition, bleeding: true, currentHealth: 2 } } }
    const returned = planCharacterCycle(prepared, { ...requestBinding(prepared), kind: 'normal-return' }, { ...f.authority, normalReturn: outcome }, dependencies)
    const old = terminateMission(f.fact, { binding: f.fact.binding, execution: execution('one'), outcome }, scope)
    const state = returned.snapshot
    if (state.clock.kind !== 'return-due') throw new Error('due')
    const before = structuredClone(old)
    const authority = closedAuthority(state, state.clock.source, 1)
    const result = planCharacterCycle(state, { ...requestBinding(state), kind: 'depart', commissionId: 'two' }, authority, dependencies)
    expect(result.outcome).toBe('death')
    expect(result.snapshot.clock).toEqual(state.clock)
    expect(result.snapshot.cycle).toBe(3)
    expect(old).toEqual(before)
    expect(authority.departure?.mission.status).toBe('unaccepted')
  })
  it.each(['return-due', 'deadline-ready'] as const)('%s with no different commission never settles or consumes ready', (kind) => {
    const f = readyFixture()
    let state = f.state
    let source = f.source
    if (kind === 'return-due') {
      source = { ...source, outcome: 'success' }
      state = { ...state, cycle: source.endCycle, clock: { kind, source } }
    }
    state = { ...state, body: { ...state.body, condition: { ...state.body.condition, bleeding: true, currentHealth: 1 } } }
    const authority = closedAuthority(state, source, null)
    const before = structuredClone({ state, authority })
    expect(queryCycleDeparture(state, authority, dependencies)).toBe('no-content')
    expect(() => planCharacterCycle(state, { ...requestBinding(state), kind: 'depart', commissionId: 'two' }, authority, dependencies))
      .toThrowError(expect.objectContaining({ code: 'NO_AVAILABLE_COMMISSION' }))
    expect({ state, authority }).toEqual(before)
  })
  it.each(['missing-source', 'source-seed', 'source-run', 'source-commission', 'source-rules', 'old-cycle', 'latest-normal-return', 'same-commission', 'same-execution', 'wrong-departure', 'fake-first', 'source-extra'])('ready forgery %s rejects without mutation', (variant) => {
    const f = readyFixture()
    let state: unknown = f.state
    let authority: CycleAuthority = f.authority
    let command = { ...requestBinding(f.state), kind: 'depart', commissionId: 'two' }
    if (variant === 'missing-source') state = { ...f.state, clock: { kind: 'deadline-ready' } }
    if (variant.startsWith('source-')) {
      const source = { ...f.source,
        execution: { ...f.source.execution, seed: variant === 'source-seed' ? 'other' : f.source.execution.seed,
          runId: variant === 'source-run' ? 'other' : f.source.execution.runId },
        mission: { ...f.source.mission, commissionId: variant === 'source-commission' ? 'two' : 'one',
          rulesVersion: variant === 'source-rules' ? 'other' : rulesVersion } }
      state = { ...f.state, clock: { kind: 'deadline-ready', source: variant === 'source-extra' ? { ...source, authorized: true } : source } }
    }
    if (variant === 'old-cycle') state = { ...f.state, cycle: 7 }
    if (variant === 'latest-normal-return') authority = { ...authority, lifecycle: { kind: 'closed', source: { ...f.source, outcome: 'success' } } }
    if (variant === 'same-commission') authority = { ...authority, departure: departure(0) }
    if (variant === 'same-execution') authority = { ...authority, departure: { ...departure(1), execution: execution('one') } }
    if (variant === 'wrong-departure') command = { ...command, commissionId: 'three' }
    if (variant === 'fake-first') { state = { ...f.state, clock: { kind: 'first-ready' } }; authority = { ...authority, lifecycle: { kind: 'first' } } }
    const before = structuredClone({ state, authority, command })
    expect(() => planCharacterCycle(state, command, authority, dependencies)).toThrow(ResidenceError)
    expect({ state, authority, command }).toEqual(before)
  })
  it('current authority rejects replayed prior state even when the candidate remains internally consistent', () => {
    const f = fixture(1)
    const request = { ...requestBinding(f.state), kind: 'rest', rest: 'A' }
    const first = planCharacterCycle(f.state, request, f.authority, dependencies)
    if (first.snapshot.clock.kind !== 'active') throw new Error('active')
    const latest = { ...f.authority, revision: first.snapshot.revision, cycle: first.snapshot.cycle, lifecycle: first.snapshot.clock }
    expect(() => readCycleContext(f.state, latest, dependencies)).toThrowError(expect.objectContaining({ code: 'STALE_REVISION' }))
    expect(() => planCharacterCycle(first.snapshot, request, latest, dependencies)).toThrow(ResidenceError)
    expect(first.snapshot.revision).toBe(1)
  })
  it('caller body, scope, request and old mission fact remain separate from immutable output', () => {
    const f = fixture(1)
    const request = { ...requestBinding(f.state), kind: 'rest', rest: 'C' }
    const before = structuredClone(f)
    const oldFact: MissionLifecycleValue = f.fact
    const plan = planCharacterCycle(f.state, request, { ...f.authority, rest: 'C' }, dependencies)
    expect(f).toEqual(before)
    expect(oldFact.status).toBe('active')
    expect(plan.snapshot).not.toBe(f.state)
    expect(Object.isFrozen(plan.snapshot.body.condition.openWounds[0])).toBe(true)
    expect(Object.isFrozen(request)).toBe(false)
  })
})
