import { describe, expect, it, vi } from 'vitest'
import { deepFreeze } from '../config'
import { createMissionScope } from '../mission-lifecycle/controlled'
import { infectedResidenceConfig as configuration } from '../../content/infected-residence-core-v0.1/config'
import { ResidenceError } from '../residence-config'
import type { CharacterCycleState, CycleAuthority, ResidenceDependencies } from '../character-cycle'
import { calculateResidenceActionCost, createResidenceActionRequest, planResidenceAction, planTriggeredResidenceConsequence, queryResidenceAction } from './index'
import type { ResidenceCompletion, ResidenceTrigger } from './types'

const rulesVersion = 'g1-isolated-rules'
const mission = { worldId: 'test-world', templateId: 'test-template', commissionId: 'one', rulesVersion, contractVersion: 'test-contract' }
const scope = createMissionScope({ characterId: 'character', declarations: [mission] }, (v) => v === rulesVersion)
const dependencies: ResidenceDependencies = { configuration, rulesVersion, scope }
function fixture(energy = 1) {
  const clock = { kind: 'active' as const, mission, execution: { runId: 'run-one', seed: 'seed-one', rulesVersion }, startCycle: 1, taskDay: 1 }
  const state: CharacterCycleState = { identity: { characterId: 'character', rulesVersion, configurationId: configuration.configurationId },
    revision: 0, cycle: 1, clock,
    body: { energy, infectionProgress: 0, satiety: 6, suppression: 0, quotasRemaining: { suppressant: 1, disinfectant: 1, pipe_signature: 1 },
      condition: { currentHealth: 12, bleeding: false, openWounds: [], minorContusions: 0, painkillerActive: false, pendingInfectionExposures: 0 } } }
  const authority: CycleAuthority = { identity: state.identity, revision: 0, cycle: 1, stableContext: 'stable', rest: null, lifecycle: clock, normalReturn: null, departure: null }
  return { state, authority }
}
const binding = (s: CharacterCycleState) => ({ identity: s.identity, expectedRevision: s.revision })
const paid = (s: CharacterCycleState, action = 'move') => ({ ...binding(s), action, cost: { kind: 'paid', base: 8, factors: [] } })
const none = (completion: ResidenceCompletion) => ({ completion, effects: { healthLoss: 0, exposuresAdded: 0 } })

describe('G1 single energy boundary', () => {
  it('repeated queries are pure; E1/cost8 completes at E0 without debt or HP penalty', () => {
    const { state, authority } = fixture()
    const request = paid(state)
    const before = structuredClone({ state, authority, request })
    for (let i = 0; i < 3; i++) expect(queryResidenceAction(state, request, authority, dependencies))
      .toEqual({ canStart: true, cost: 8, energyBefore: 1, energyAfter: 0 })
    const provide = vi.fn(none)
    const result = planResidenceAction(state, request, authority, dependencies, provide)
    expect(provide).toHaveBeenCalledTimes(1)
    expect(result.snapshot.body.energy).toBe(0)
    expect(result.snapshot.body.condition.currentHealth).toBe(12)
    expect(result.snapshot.revision).toBe(1)
    expect(result).not.toHaveProperty('debt')
    expect({ state, authority, request }).toEqual(before)
    expect(Object.isFrozen(state.body)).toBe(false)
    expect(Object.isFrozen(result.snapshot.body.condition.openWounds)).toBe(true)
    expect(planResidenceAction(deepFreeze(structuredClone(state)), deepFreeze(structuredClone(request)), authority, dependencies, none)).toEqual(result)
  })
  it.each(['view', 'organize', 'revealed-pickup', 'medical', 'food'])('E0 free %s has only local energy eligibility and no action bleed', (action) => {
    const { state, authority } = fixture(0)
    const input = { ...state, body: { ...state.body, condition: { ...state.body.condition, bleeding: true } } }
    const request = { ...binding(state), action, cost: { kind: 'free', amount: 0 } }
    expect(queryResidenceAction(input, request, authority, dependencies).canStart).toBe(true)
    const result = planResidenceAction(input, request, authority, dependencies, none)
    expect(result.snapshot.body).toEqual(input.body)
    expect(result.steps.map((s) => s.kind)).toEqual(['primary'])
  })
  it.each(['move', 'search', 'extraction', 'repair', 'recharge', 'npc-handover', 'install'])('E0 new paid %s is rejected before provider', (action) => {
    const { state, authority } = fixture(0)
    const request = paid(state, action)
    const before = structuredClone(state)
    const provide = vi.fn(none)
    expect(queryResidenceAction(state, request, authority, dependencies).canStart).toBe(false)
    expect(() => planResidenceAction(state, request, authority, dependencies, provide))
      .toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(provide).not.toHaveBeenCalled()
    expect(state).toEqual(before)
  })
  it('paid completion bleeds exactly once; primary death short-circuits action bleeding', () => {
    const f = fixture()
    const state = { ...f.state, body: { ...f.state.body, condition: { ...f.state.body.condition, bleeding: true } } }
    const result = planResidenceAction(state, paid(state), f.authority, dependencies, none)
    expect(result.steps.map((s) => s.kind)).toEqual(['primary', 'action-bleeding'])
    expect(result.snapshot.body.condition.currentHealth).toBe(11)
    const dead = planResidenceAction(state, paid(state), f.authority, dependencies,
      (completion) => ({ completion, effects: { healthLoss: 12, exposuresAdded: 1 } }))
    expect(dead.deathCause).toBe('primary')
    expect(dead.steps).toHaveLength(1)
    expect(dead.snapshot.body.condition.pendingInfectionExposures).toBe(1)
  })
  it.each(['combat-action-completed', 'bleeding-checkpoint', 'immediate-result'] as const)('E0 controlled %s still resolves and can kill', (kind) => {
    const f = fixture(0)
    const state = { ...f.state, body: { ...f.state.body, condition: { ...f.state.body.condition, currentHealth: 1, bleeding: true } } }
    const trigger: ResidenceTrigger = { identity: state.identity, revision: 0, execution: f.authority.lifecycle.kind === 'active' ? f.authority.lifecycle.execution : { runId: '', seed: '', rulesVersion },
      triggerId: 'pending-fact', kind, effects: { healthLoss: kind === 'immediate-result' ? 1 : 0, exposuresAdded: 0 } }
    const result = planTriggeredResidenceConsequence(state, { ...binding(state), triggerId: trigger.triggerId },
      { ...f.authority, stableContext: 'unsettled' }, trigger, dependencies)
    expect(result.outcome).toBe('death')
    expect(result.snapshot.body.energy).toBe(0)
    expect(result.snapshot.body.condition.currentHealth).toBe(0)
  })
  it('rejects stable, stale or wrong-execution triggers and player alreadyTriggered flag', () => {
    const { state, authority } = fixture(0)
    const trigger: ResidenceTrigger = { identity: state.identity, revision: 0, execution: { runId: 'run-one', seed: 'seed-one', rulesVersion },
      triggerId: 'fact', kind: 'immediate-result', effects: { healthLoss: 1, exposuresAdded: 0 } }
    const request = { ...binding(state), triggerId: 'fact' }
    expect(() => planTriggeredResidenceConsequence(state, request, authority, trigger, dependencies)).toThrow(ResidenceError)
    for (const wrong of [{ ...trigger, revision: 1 }, { ...trigger, triggerId: 'old' }, { ...trigger, execution: { ...trigger.execution, seed: 'wrong' } }]) {
      expect(() => planTriggeredResidenceConsequence(state, request, { ...authority, stableContext: 'unsettled' }, wrong, dependencies)).toThrow(ResidenceError)
    }
    expect(() => createResidenceActionRequest({ ...paid(state), alreadyTriggered: true })).toThrow(ResidenceError)
  })
  it('multiplies all rational factors before a single ceiling', () => {
    expect(calculateResidenceActionCost({ kind: 'paid', base: 2, factors: [{ numerator: 2, denominator: 3 }, { numerator: 3, denominator: 2 }] })).toBe(2)
    expect(calculateResidenceActionCost({ kind: 'paid', base: 5, factors: [{ numerator: 1, denominator: 2 }] })).toBe(3)
    expect(calculateResidenceActionCost({ kind: 'paid', base: Number.MAX_SAFE_INTEGER, factors: [{ numerator: 1, denominator: 2 }] })).toBe(4503599627370496)
    expect(calculateResidenceActionCost({ kind: 'paid', base: Number.MAX_SAFE_INTEGER, factors: [] })).toBe(Number.MAX_SAFE_INTEGER)
  })
  it.each([-1, 0, true, 0.5, '8', NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])('invalid paid base %s rejects BEFORE provider and clamp', (bad) => {
    const { state, authority } = fixture()
    const request = { ...paid(state), cost: { kind: 'paid', base: bad, factors: [] } }
    const before = structuredClone({ state, request })
    const provide = vi.fn(none)
    expect(() => planResidenceAction(state, request, authority, dependencies, provide)).toThrow(ResidenceError)
    expect(provide).not.toHaveBeenCalled()
    expect({ state, request }).toEqual(before)
  })
  it.each([
    { kind: 'paid', base: 2, factors: [{ numerator: Number.MAX_SAFE_INTEGER, denominator: 1 }] },
    { kind: 'paid', base: 1, factors: [{ numerator: 1, denominator: Number.MAX_SAFE_INTEGER }, { numerator: 1, denominator: 2 }] },
    { kind: 'paid', base: Number.MAX_SAFE_INTEGER, factors: [{ numerator: 2, denominator: 2 }] },
    { kind: 'paid', base: 2, factors: [{ numerator: 0, denominator: 1 }] },
    { kind: 'paid', base: 2, factors: [{ numerator: 1, denominator: 0 }] },
    { kind: 'free', amount: 1 },
  ])('unsafe/invalid cost %j rejects', (cost) => {
    expect(() => calculateResidenceActionCost(cost)).toThrow(ResidenceError)
  })
  it.each(['free-move', 'paid-food', 'missing', 'extra', 'unsettled', 'revision', 'identity', 'rules', 'config', 'overflow'])('%s rejects without provider effects', (kind) => {
    let { state, authority } = fixture()
    let request: unknown = paid(state)
    if (kind === 'free-move') request = { ...paid(state), cost: { kind: 'free', amount: 0 } }
    if (kind === 'paid-food') request = paid(state, 'food')
    if (kind === 'missing') request = { ...binding(state), action: 'move' }
    if (kind === 'extra') request = { ...paid(state), nextEnergy: 0 }
    if (kind === 'unsettled') authority = { ...authority, stableContext: 'unsettled' }
    if (kind === 'revision') request = { ...paid(state), expectedRevision: 1 }
    if (kind === 'identity') request = { ...paid(state), identity: { ...state.identity, characterId: 'wrong' } }
    if (kind === 'rules') state = { ...state, identity: { ...state.identity, rulesVersion: 'wrong' } }
    if (kind === 'config') state = { ...state, identity: { ...state.identity, configurationId: 'wrong' } }
    if (kind === 'overflow') {
      state = { ...state, revision: Number.MAX_SAFE_INTEGER }; authority = { ...authority, revision: state.revision }; request = paid(state)
    }
    const before = structuredClone({ state, authority, request })
    const provider = vi.fn(none)
    expect(() => planResidenceAction(state, request, authority, dependencies, provider)).toThrow(ResidenceError)
    expect(provider).not.toHaveBeenCalled()
    expect({ state, authority, request }).toEqual(before)
  })
  it.each(['command', 'revision', 'execution', 'energy'])('coordinated provider %s tampering is not self-authorizing', (field) => {
    const { state, authority } = fixture()
    const before = structuredClone(state)
    expect(() => planResidenceAction(state, paid(state), authority, dependencies, (completion) => {
      const forged = { ...completion,
        request: field === 'command' ? createResidenceActionRequest(paid(state, 'search')) : completion.request,
        revision: field === 'revision' ? 1 : completion.revision,
        execution: field === 'execution' ? { runId: 'other', seed: 'seed-one', rulesVersion } : completion.execution,
        energyAfter: field === 'energy' ? 1 : completion.energyAfter }
      return { completion: forged, effects: { healthLoss: 0, exposuresAdded: 0 } }
    })).toThrowError(expect.objectContaining({ code: 'PLAN_MISMATCH' }))
    expect(state).toEqual(before)
  })
  it('does not swallow provider failures or accept malformed effect values', () => {
    const { state, authority } = fixture()
    const problem = new Error('controlled upstream failure')
    expect(() => planResidenceAction(state, paid(state), authority, dependencies, () => { throw problem })).toThrow(problem)
    expect(() => planResidenceAction(state, paid(state), authority, dependencies,
      (completion) => ({ completion, effects: { healthLoss: NaN, exposuresAdded: 0 } }))).toThrow(ResidenceError)
    expect(state.body.energy).toBe(1)
  })
})
