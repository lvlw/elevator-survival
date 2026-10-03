import { describe, expect, it } from 'vitest'
import { deepFreeze } from '../config'
import * as publicApi from './index'
import * as controlledApi from './controlled'
import {
  listFirstEligibleMissions, queryFirstMissionEligibility, queryMissionContinuation,
  restoreMissionCandidate, type MissionExpectation, type MissionLifecycleErrorCode,
  type MissionLifecycleValue, type MissionOutcome,
} from './index'
import { activateMission, createMissionScope, establishMissionFact, terminateMission } from './controlled'

const declaration = deepFreeze({
  worldId: 'test-world', templateId: 'test-template', commissionId: 'test-commission',
  rulesVersion: 'test-rules', contractVersion: 'test-contract-v1',
})
const secondDeclaration = deepFreeze({ ...declaration, commissionId: 'test-other-commission' })
const binding = deepFreeze({ characterId: 'test-character', mission: declaration })
const otherBinding = deepFreeze({ ...binding, mission: secondDeclaration })
const execution = deepFreeze({ runId: 'test-run', seed: 'test-seed', rulesVersion: 'test-rules' })
const request = deepFreeze({ binding, execution })
const scopeInput = deepFreeze({ characterId: binding.characterId, declarations: [declaration] })
const scope = createMissionScope(scopeInput, (version) => version === 'test-rules')
const initial = () => establishMissionFact(binding, scope)
const active = () => activateMission(initial(), request, scope)
const closed = (outcome: MissionOutcome = 'success') => terminateMission(active(), { ...request, outcome }, scope)
const unacceptedExpectation: MissionExpectation = deepFreeze({ binding, status: 'unaccepted' })
const activeExpectation: MissionExpectation = deepFreeze({ binding, status: 'active', execution })
const closedExpectation: MissionExpectation = deepFreeze({ binding, status: 'closed', execution, outcome: 'success' })

function rejects(action: () => unknown, code: MissionLifecycleErrorCode) {
  expect(action).toThrowError(expect.objectContaining({ name: 'MissionLifecycleError', code }))
}
function record(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new Error('test record required')
  return input as Record<string, unknown>
}
function clone(input: unknown): Record<string, unknown> {
  const parsed: unknown = JSON.parse(JSON.stringify(input))
  return record(parsed)
}
function changed(input: unknown, path: readonly string[], value: unknown, remove = false) {
  const copy = clone(input)
  let cursor = copy
  for (const key of path.slice(0, -1)) cursor = record(cursor[key])
  if (remove) delete cursor[path.at(-1)!]
  else cursor[path.at(-1)!] = value
  return copy
}
function expectDeepFrozen(input: unknown): void {
  if (input === null || typeof input !== 'object') return
  expect(Object.isFrozen(input)).toBe(true)
  for (const value of Object.values(input)) expectDeepFrozen(value)
}

// Local test owner only. All lifecycle decisions and rejections call real exports.
// This models installation of a value against an independently held expectation;
// it is not production installation authority or a second closure ledger.
function harness() {
  let current: MissionLifecycleValue = initial()
  return {
    read: () => current,
    first: () => queryFirstMissionEligibility(current, binding, scope),
    start: () => { current = activateMission(current, request, scope) },
    continue: () => queryMissionContinuation(current, request, scope),
    finish: (outcome: MissionOutcome) => { current = terminateMission(current, { ...request, outcome }, scope) },
    restoreSameProgress: (raw: unknown) => {
      // The held current fact supplies the expectation, never the candidate/caller.
      const { formatVersion: _format, ...expected } = current
      const candidate = restoreMissionCandidate(raw, expected, scope)
      current = candidate.value
    },
  }
}

describe('mission lifecycle transitions and read-only queries', () => {
  it('K01 K02 K17 repeats first queries and deterministic activation without changing inputs', () => {
    const before = initial()
    const snapshot = JSON.stringify([before, request, scopeInput])
    expect(queryFirstMissionEligibility(before, binding, scope)).toBe('first-eligible')
    expect(queryFirstMissionEligibility(before, binding, scope)).toBe('first-eligible')
    const after = activateMission(before, request, scope)
    expect(after).toEqual({ formatVersion: 1, ...activeExpectation })
    expect(activateMission(before, request, scope)).toEqual(after)
    expect(JSON.stringify([before, request, scopeInput])).toBe(snapshot)
    expectDeepFrozen(after)
    expectDeepFrozen(scope)
  })

  it.each([{ ...execution }, { ...execution, runId: 'another-run' }])('K03 rejects active activation %j', (next) => {
    const current = active()
    const before = JSON.stringify(current)
    rejects(() => activateMission(current, { binding, execution: next }, scope), 'ALREADY_ACTIVE')
    expect(JSON.stringify(current)).toBe(before)
  })

  it('K04 continues only the same full execution without reinitializing', () => {
    const current = active()
    expect(queryMissionContinuation(current, request, scope)).toEqual({ kind: 'continue', execution })
    expect(queryMissionContinuation(current, request, scope)).toEqual({ kind: 'continue', execution })
    expect(current).toEqual({ formatVersion: 1, ...activeExpectation })
    rejects(() => queryMissionContinuation(initial(), request, scope), 'NOT_ACTIVE')
  })

  it.each(['runId', 'seed', 'rulesVersion'] as const)('K04 K07 rejects wrong execution %s in continue and termination', (key) => {
    const current = active()
    const before = JSON.stringify(current)
    const wrong = { ...request, execution: { ...execution, [key]: 'different' } }
    rejects(() => queryMissionContinuation(current, wrong, scope), 'EXECUTION_MISMATCH')
    rejects(() => terminateMission(current, { ...wrong, outcome: 'success' }, scope), 'EXECUTION_MISMATCH')
    expect(JSON.stringify(current)).toBe(before)
  })

  it.each(['success', 'voluntary-failure', 'deadline-failure', 'death'] as const)(
    'K05 K06 K07 closes %s once without creating death or reward effects', (outcome) => {
      const before = active()
      const result = terminateMission(before, { ...request, outcome }, scope)
      expect(result).toEqual({ formatVersion: 1, binding, status: 'closed', execution, outcome })
      expectDeepFrozen(result)
      expect(terminateMission(before, { ...request, outcome }, scope)).toEqual(result)
      for (const repeated of ['success', 'voluntary-failure', 'deadline-failure', 'death'] as const) {
        rejects(() => terminateMission(result, { ...request, outcome: repeated }, scope), 'MISSION_CLOSED')
      }
      rejects(() => activateMission(result, request, scope), 'MISSION_CLOSED')
      rejects(() => queryMissionContinuation(result, request, scope), 'MISSION_CLOSED')
      if (result.status !== 'closed') throw new Error('expected closed transition')
      expect(result.outcome).toBe(outcome)
      expect(before).toEqual({ formatVersion: 1, ...activeExpectation })
    },
  )

  it('K07 refuses termination before activation', () => {
    const current = initial()
    rejects(() => terminateMission(current, { ...request, outcome: 'death' }, scope), 'NOT_ACTIVE')
    expect(current).toEqual({ formatVersion: 1, ...unacceptedExpectation })
  })

  it.each(['runId', 'seed'] as const)('K08 closed facts remain closed after changing %s', (key) => {
    const current = closed()
    rejects(() => activateMission(current, { binding, execution: { ...execution, [key]: 'new' } }, scope), 'MISSION_CLOSED')
    expect(queryFirstMissionEligibility(current, binding, scope)).toBe('closed')
  })

  it.each(['title', 'displayName', 'partialDelivery', 'installedFacility', 'storedTaskItem', 'nextState', 'completed'])(
    'K08 K10 rejects extra command field %s instead of reopening', (key) => {
      const current = closed()
      const wrong = { ...request, [key]: true }
      rejects(() => activateMission(current, wrong, scope), 'INVALID_INPUT')
      rejects(() => terminateMission(current, { ...wrong, outcome: 'success' }, scope), 'INVALID_INPUT')
      expect(current).toEqual(closed())
    },
  )

  it('K11 K12 returns empty for the closed sole mission and distinguishes a real test-only declaration', () => {
    expect(listFirstEligibleMissions([closed('voluntary-failure')], scope)).toEqual([])
    const two = createMissionScope({ ...scopeInput, declarations: [declaration, secondDeclaration] }, () => true)
    const other = establishMissionFact(otherBinding, two)
    expect(listFirstEligibleMissions([other, closed()], two)).toEqual([otherBinding])
    expect(listFirstEligibleMissions([closed(), other], two)).toEqual([otherBinding])
    expectDeepFrozen(listFirstEligibleMissions([other, closed()], two))
    expect(listFirstEligibleMissions([], createMissionScope({ ...scopeInput, declarations: [] }, () => true))).toEqual([])
  })

  it('K12 K06 closing another mission with death does not rewrite the earlier result', () => {
    const prior = closed()
    const two = createMissionScope({ ...scopeInput, declarations: [declaration, secondDeclaration] }, () => true)
    const otherRequest = { binding: otherBinding, execution: { ...execution, runId: 'other-run' } }
    const other = activateMission(establishMissionFact(otherBinding, two), otherRequest, two)
    expect(terminateMission(other, { ...otherRequest, outcome: 'death' }, two).status).toBe('closed')
    expect(prior).toEqual(closed('success'))
  })

  it('K13 rejects missing facts, undeclared commissions and duplicate or incomplete lists', () => {
    for (const missing of [undefined, null]) {
      rejects(() => queryFirstMissionEligibility(missing, binding, scope), 'MISSING_FACT')
      rejects(() => activateMission(missing, request, scope), 'MISSING_FACT')
      rejects(() => restoreMissionCandidate(missing, unacceptedExpectation, scope), 'MISSING_FACT')
    }
    rejects(() => establishMissionFact(otherBinding, scope), 'UNDECLARED_MISSION')
    rejects(() => queryFirstMissionEligibility({ ...initial(), binding: otherBinding }, otherBinding, scope), 'UNDECLARED_MISSION')
    rejects(() => listFirstEligibleMissions([], scope), 'MISSING_FACT')
    rejects(() => listFirstEligibleMissions([undefined], scope), 'MISSING_FACT')
    rejects(() => listFirstEligibleMissions([initial(), initial()], scope), 'DUPLICATE_FACT')
    rejects(() => listFirstEligibleMissions([initial(), closed()], scope), 'DUPLICATE_FACT')
    rejects(() => listFirstEligibleMissions([{ ...initial(), binding: otherBinding }], scope), 'UNDECLARED_MISSION')
  })
})

describe('strict candidate restoration and independent expectations', () => {
  it.each([
    ['unaccepted', initial, unacceptedExpectation],
    ['active', active, activeExpectation],
    ['closed', closed, closedExpectation],
  ] as const)('K14 K17 preserves %s semantics with frozen input', (_name, factory, expected) => {
    const original = factory()
    const candidate = restoreMissionCandidate(original, expected, scope)
    expect(candidate).toEqual({ kind: 'mission-lifecycle-candidate', value: original })
    expect(candidate.value).not.toBe(original)
    expectDeepFrozen(candidate)
    expect(restoreMissionCandidate(original, expected, scope)).toEqual(candidate)
    expect(queryFirstMissionEligibility(candidate.value, binding, scope)).toBe(
      original.status === 'unaccepted' ? 'first-eligible' : original.status,
    )
  })

  it.each(['characterId', 'worldId', 'templateId', 'commissionId', 'rulesVersion', 'contractVersion'] as const)(
    'K09 rejects changed %s against controlled declaration and expectation', (key) => {
      const path = key === 'characterId' ? ['binding', key] : ['binding', 'mission', key]
      const bad = deepFreeze(changed(active(), path, 'unknown'))
      const before = JSON.stringify(bad)
      rejects(() => restoreMissionCandidate(bad, activeExpectation, scope), key === 'commissionId' ? 'UNDECLARED_MISSION' : 'BINDING_MISMATCH')
      expect(JSON.stringify(bad)).toBe(before)
    },
  )

  it.each(['characterId', 'worldId', 'templateId', 'commissionId', 'rulesVersion', 'contractVersion'] as const)(
    'K09 activation and termination reject request binding axis %s', (key) => {
      const wrongBinding = key === 'characterId'
        ? { ...binding, characterId: 'another-character' }
        : { ...binding, mission: { ...declaration, [key]: 'another' } }
      const current = active()
      const original = JSON.stringify(current)
      const wrong = deepFreeze({ binding: wrongBinding, execution })
      const code = key === 'commissionId' ? 'UNDECLARED_MISSION' : 'BINDING_MISMATCH'
      rejects(() => activateMission(initial(), wrong, scope), code)
      rejects(() => terminateMission(current, { ...wrong, outcome: 'success' }, scope), code)
      expect(JSON.stringify(current)).toBe(original)
    },
  )

  it('K09 rejects a declared but different commission and a changed independent expectation', () => {
    const two = createMissionScope({ ...scopeInput, declarations: [declaration, secondDeclaration] }, () => true)
    rejects(() => restoreMissionCandidate(initial(), { binding: otherBinding, status: 'unaccepted' }, two), 'BINDING_MISMATCH')
    rejects(() => activateMission(initial(), { ...request, binding: otherBinding }, two), 'BINDING_MISMATCH')
    rejects(() => terminateMission(active(), { ...request, binding: otherBinding, outcome: 'success' }, two), 'BINDING_MISMATCH')
  })

  it.each(['runId', 'seed', 'rulesVersion'] as const)('K16 rejects altered restored execution %s', (key) => {
    const bad = changed(active(), ['execution', key], 'wrong')
    rejects(() => restoreMissionCandidate(bad, activeExpectation, scope), 'EXECUTION_MISMATCH')
  })

  const requiredPaths = [
    ['formatVersion'], ['binding'], ['status'], ['execution'], ['outcome'],
    ['binding', 'characterId'], ['binding', 'mission'],
    ...['worldId', 'templateId', 'commissionId', 'rulesVersion', 'contractVersion'].map((k) => ['binding', 'mission', k]),
    ...['runId', 'seed', 'rulesVersion'].map((k) => ['execution', k]),
  ]
  it.each(requiredPaths.map((path) => [path.join('.'), path] as const))('K15 missing field %s is rejected unchanged', (_label, path) => {
    const bad = deepFreeze(changed(closed(), path, undefined, true))
    const before = JSON.stringify(bad)
    rejects(() => restoreMissionCandidate(bad, closedExpectation, scope), 'INVALID_INPUT')
    expect(JSON.stringify(bad)).toBe(before)
  })

  it.each([
    ['root', []], ['binding', ['binding']], ['declaration', ['binding', 'mission']], ['execution', ['execution']],
  ] as const)('K15 nested unknown field at %s is not stripped', (_label, path) => {
    const bad = deepFreeze(changed(closed(), [...path, 'extra'], true))
    const before = JSON.stringify(bad)
    rejects(() => restoreMissionCandidate(bad, closedExpectation, scope), 'INVALID_INPUT')
    expect(JSON.stringify(bad)).toBe(before)
  })

  it.each(requiredPaths.map((path) => [path.join('.'), path] as const))('K15 wrong type at %s is rejected', (_label, path) => {
    const bad = changed(closed(), path, 42)
    rejects(() => restoreMissionCandidate(bad, closedExpectation, scope), path[0] === 'formatVersion' ? 'UNKNOWN_FORMAT' : 'INVALID_INPUT')
  })

  it.each(['', ' ', ' padded', 'padded ', 'line\nbreak', 'control\u0000'])(
    'K15 rejects noncanonical identities %j without trim repair', (text) => {
      for (const path of requiredPaths.filter((p) => p.length > 1 && p.at(-1) !== 'mission')) {
        const bad = changed(closed(), path, text)
        rejects(() => restoreMissionCandidate(bad, closedExpectation, scope), 'INVALID_INPUT')
      }
    },
  )

  it('K15 rejects unregistered declarations, conflicts and unknown format without migration', () => {
    rejects(() => createMissionScope(scopeInput, () => false), 'UNKNOWN_RULES_VERSION')
    rejects(() => createMissionScope({ ...scopeInput, declarations: [declaration, declaration] }, () => true), 'DUPLICATE_DECLARATION')
    rejects(() => createMissionScope({ ...scopeInput, declarations: [declaration, { ...declaration, contractVersion: 'conflict' }] }, () => true), 'DUPLICATE_DECLARATION')
    rejects(() => restoreMissionCandidate({ ...closed(), formatVersion: 2 }, closedExpectation, scope), 'UNKNOWN_FORMAT')
    const extraExpectation = { ...closedExpectation, extra: true }
    rejects(() => restoreMissionCandidate(closed(), extraExpectation, scope), 'INVALID_INPUT')
  })

  it.each([
    ['unaccepted with execution', { ...initial(), execution }],
    ['active with outcome', { ...active(), outcome: 'success' }],
    ['closed without execution', changed(closed(), ['execution'], undefined, true)],
    ['closed without outcome', changed(closed(), ['outcome'], undefined, true)],
    ['unknown result', { ...closed(), outcome: 'resurrected' }],
    ['boolean result', { ...closed(), outcome: true }],
    ['unknown status', { ...active(), status: 'pending' }],
  ])('K16 rejects impossible state: %s', (_label, bad) => {
    rejects(() => restoreMissionCandidate(bad, closedExpectation, scope), 'INVALID_INPUT')
  })

  it('K16 rejects coherent state or outcome downgrade against independent expected history', () => {
    rejects(() => restoreMissionCandidate(initial(), closedExpectation, scope), 'RESTORE_STATE_MISMATCH')
    rejects(() => restoreMissionCandidate(active(), closedExpectation, scope), 'RESTORE_STATE_MISMATCH')
    rejects(() => restoreMissionCandidate(closed('death'), closedExpectation, scope), 'RESTORE_STATE_MISMATCH')
    rejects(() => restoreMissionCandidate(active(), { ...activeExpectation, execution: { ...execution, seed: 'another' } }, scope), 'EXECUTION_MISMATCH')
  })

  it('K15 rejects accessors, symbols, prototypes and cycles without invoking getters', () => {
    let calls = 0
    const getter = { ...initial() }
    Object.defineProperty(getter, 'binding', { enumerable: true, get: () => { calls += 1; return binding } })
    const cycle: Record<string, unknown> = { ...initial() }; cycle.self = cycle
    const hidden = { ...initial() }; Object.defineProperty(hidden, 'extra', { value: true })
    for (const bad of [getter, cycle, hidden, { ...initial(), [Symbol('extra')]: true }, Object.create(initial())]) {
      rejects(() => restoreMissionCandidate(bad, unacceptedExpectation, scope), 'INVALID_INPUT')
    }
    rejects(() => listFirstEligibleMissions([getter], scope), 'INVALID_INPUT')
    expect(calls).toBe(0)
  })

  it.each(['extra', '4294967295', '01'])('K15 rejects non-element array property %s', (key) => {
    const facts = [initial()]
    Object.defineProperty(facts, key, { value: initial(), enumerable: true })
    rejects(() => listFirstEligibleMissions(facts, scope), 'INVALID_INPUT')
    expect(facts[0]).toEqual(initial())
  })

  it('K17 copies mutable inputs without freezing caller objects', () => {
    const raw = clone(active())
    const candidate = restoreMissionCandidate(raw, activeExpectation, scope)
    expect(Object.isFrozen(raw)).toBe(false)
    expect(Object.isFrozen(record(raw.execution))).toBe(false)
    record(raw.execution).seed = 'changed-after-parse'
    expect(candidate.value).toEqual(active())
  })
})

describe('composition and actual export boundaries', () => {
  it.each(['success', 'voluntary-failure', 'deadline-failure', 'death'] as const)(
    'K18 complete public and controlled export chain for %s', (outcome) => {
      const owner = harness()
      expect(owner.first()).toBe('first-eligible')
      owner.start()
      const inProgress = clone(owner.read())
      owner.restoreSameProgress(inProgress)
      expect(owner.first()).toBe('active')
      expect(owner.continue()).toEqual({ kind: 'continue', execution })
      owner.finish(outcome)
      owner.restoreSameProgress(clone(owner.read()))
      const final = owner.read()
      expect(owner.first()).toBe('closed')
      expect(owner.first()).toBe('closed')
      rejects(owner.start, 'MISSION_CLOSED')
      rejects(owner.continue, 'MISSION_CLOSED')
      expect(owner.read()).toBe(final)
    },
  )

  it('K19 candidate parsing and fresh construction cannot replace the harness current closed fact', () => {
    const owner = harness(); owner.start(); owner.finish('success')
    const committed = owner.read()
    const fresh = establishMissionFact(binding, scope)
    const candidate = publicApi.restoreMissionCandidate(fresh, unacceptedExpectation, scope)
    rejects(() => activateMission(candidate, request, scope), 'INVALID_INPUT')
    rejects(() => queryFirstMissionEligibility(candidate, binding, scope), 'INVALID_INPUT')
    rejects(() => owner.restoreSameProgress(candidate.value), 'RESTORE_STATE_MISMATCH')
    rejects(owner.start, 'MISSION_CLOSED')
    rejects(() => owner.finish('death'), 'MISSION_CLOSED')
    expect(owner.first()).toBe('closed')
    expect(owner.read()).toBe(committed)
    expect(listFirstEligibleMissions([owner.read()], scope)).toEqual([])
  })

  it('K19 K20 read-only exports exclude controlled transitions and test harnesses', () => {
    expect(Object.keys(publicApi).sort()).toEqual([
      'MissionLifecycleError', 'listFirstEligibleMissions', 'queryFirstMissionEligibility',
      'queryMissionContinuation', 'restoreMissionCandidate',
    ].sort())
    expect(Object.keys(controlledApi).sort()).toEqual([
      'activateMission', 'createMissionScope', 'establishMissionFact', 'terminateMission',
    ].sort())
  })
})
