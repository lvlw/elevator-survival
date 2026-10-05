import { describe, expect, it, vi } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { fixture as makeFixture } from './test-fixtures'
import { createSupplyAuthority } from './authority'
import { readSupplyValue, cycleContext } from './validation'
import { planSupplyMove } from './controlled'
import { assertSupplyPlanCurrent } from './plans'
import { querySupplyKnownObjects, rejectSupplyV2 } from './queries'
import * as publicSupply from './index'
import * as publicTask from '../residence-task'
describe('P11 strict input, complete authority and safe queries', () => {
  it('mutable input canonicalizes/freezes, query has zero entropy and no capability', () => {
    const f = fixture(), copy = structuredClone(f.value), draw = vi.fn(f.dependencies.draw), deps = { ...f.dependencies, draw }
    const canonical = readSupplyValue(copy, deps)
    expect(canonical).not.toBe(copy); expect(Object.isFrozen(canonical.character.body.condition)).toBe(true)
    const view = querySupplyKnownObjects(copy, deps)
    expect(view).toEqual(querySupplyKnownObjects(canonical, deps)); expect(draw).not.toHaveBeenCalled()
    const text = JSON.stringify(view)
    for (const hidden of ['seed', 'riskDrawIndex', 'currentHealth', 'origins', 'drawIndex', 'lineage']) expect(text).not.toContain(hidden)
    expect(Object.keys(publicSupply).sort()).toEqual(['SupplyError', 'querySupplyKnownObjects'].sort())
    expect(Object.keys(publicTask)).toEqual([])
    expect(() => rejectSupplyV2()).toThrow(/E01-R\/S/)
  })
  it('cloned authority/plan, same-revision mutated base, independent mismatch and stale revision reject', () => {
    const f = fixture(), v = f.value, auth = f.authorize(v), request = { kind: 'move', expectedRevision: v.character.revision, edgeId: 'H0-H1:forward' }
    const p = planSupplyMove(v, request, auth)
    assertSupplyPlanCurrent(structuredClone(v), p, auth)
    expect(() => assertSupplyPlanCurrent(v, structuredClone(p), auth)).toThrow()
    expect(() => planSupplyMove(v, request, structuredClone(auth))).toThrow()
    const changed = { ...v, character: { ...v.character, body: { ...v.character.body, energy: 90 } } }
    expect(() => planSupplyMove(changed, request, auth)).toThrow()
    expect(() => assertSupplyPlanCurrent(p.snapshot, p, f.authorize(p.snapshot))).toThrow()
    expect(() => createSupplyAuthority(v, { cycle: { ...cycleContext(v.character, f.dependencies, 'H0'), revision: 99 }, missions: v.missions }, f.dependencies)).toThrow()
    expect(() => planSupplyMove(v, { ...request, expectedRevision: 0 }, auth)).toThrow()
  })
  it.each([null, [], new (class Bad {})(), { unknown: true }])('rejects nonexact aggregate %j', input => {
    const f = fixture()
    expect(() => readSupplyValue(input, f.dependencies)).toThrow()
  })
  it.each([NaN, Infinity, true, -1, 0.25, Number.MAX_SAFE_INTEGER + 1])('rejects unsafe command count %s', n => {
    const f = fixture()
    expect(() => planSupplyMove(f.value, { kind: 'move', edgeId: 'H0-H1:forward', expectedRevision: n }, f.authorize(f.value))).toThrow()
  })
  it('rejects accessor without evaluating it, corrupt body and versions, unknown result/selector', () => {
    const f = fixture(), getter = vi.fn(() => f.value.character)
    const input = { ...f.value }; Object.defineProperty(input, 'character', { get: getter, enumerable: true })
    expect(() => readSupplyValue(input, f.dependencies)).toThrow(); expect(getter).not.toHaveBeenCalled()
    for (const character of [null, { clock: null }, { ...f.value.character, body: { ...f.value.character.body, extra: 1 } }])
      expect(() => readSupplyValue({ ...f.value, character }, f.dependencies)).toThrow()
    expect(() => readSupplyValue({ ...f.value, contentId: 'wrong' }, f.dependencies)).toThrow()
    expect(() => planSupplyMove(f.value, { kind: 'move', edgeId: 'H0-H1:forward', expectedRevision: 1, result: {} }, f.authorize(f.value))).toThrow()
  })
})
