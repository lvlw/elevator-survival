import { describe, expect, it, vi } from 'vitest'
import { fixture, expectation, mutable, atNode } from './supply-test-fixtures'
import { createSupplyResidencePolicy } from './supply-policy'
import { validateSupplyResidenceAggregate as read } from './supply-validation'
import { planSupplyTaskAction } from '../../core/residence-task/actions'
import { planSupplyMove } from '../../core/residence-supply/controlled'
import type { SupplyResidenceDependencies } from './supply-types'
describe('R04 strict supplied values and controlled dependencies', () => {
  it.each([null, [], {}, true, new Date(0), Object.create(null)])('rejects non-SupplyValue %#', raw => {
    const f = fixture()
    expect(() => read(raw, expectation(f.value, f.dependencies), f.policy)).toThrow()
  })
  it.each([true, -1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])('rejects unsafe number %# before serialization', n => {
    const f = fixture(), v = mutable(f.value)
    Reflect.set(v.character, 'revision', n)
    expect(() => read(v, expectation(f.value, f.dependencies), f.policy)).toThrow()
  })
  it('rejects extra keys, unknown tags, sparse arrays, cycles and getters without reading them', () => {
    const f = fixture(), e = expectation(f.value, f.dependencies)
    const getter = vi.fn(() => f.value.character)
    const accessed = { ...f.value }; Object.defineProperty(accessed, 'character', { enumerable: true, get: getter })
    const sparse = mutable(f.value); Reflect.deleteProperty(sparse.origins, '1')
    const circular = mutable(f.value); Reflect.set(circular, 'extra', circular)
    for (const bad of [{ ...f.value, current: f.value }, { ...f.value, phase: 'combat' },
      { ...f.value, choices: { ...f.value.choices, extra: false } }, accessed, sparse, circular])
      expect(() => read(bad, e, f.policy)).toThrow()
    expect(getter).not.toHaveBeenCalled()
  })
  it('real pending enemy encounter remains unsupported and is never cleared', () => {
    const f = fixture()
    let v = atNode(f, f.value, 'H1')
    v = planSupplyTaskAction(v, { kind: 'task', expectedRevision: v.character.revision, actionId: 'fire-door',
      method: 'toolbox', toolInstanceId: v.carried.equipment.utility!.instanceId }, f.authorize(v)).snapshot
    v = planSupplyMove(v, { kind: 'move', expectedRevision: v.character.revision, edgeId: 'H1-H4:forward' }, f.authorize(v)).snapshot
    expect(v.site!.pending.kind).toBe('combat-required')
    const before = structuredClone(v)
    expect(() => read(v, expectation(v, f.dependencies), f.policy)).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_STAGE' }))
    expect(v).toEqual(before)
  })
  it('policy keeps copied shells and requires issued config/catalog handles', () => {
    const f = fixture(), catalogs = [...f.dependencies.catalogs], input = { ...f.dependencies, catalogs }
    const policy = createSupplyResidencePolicy(input)
    catalogs.length = 0
    expect(read(f.value, expectation(f.value, f.dependencies), policy)).toEqual(f.value)
    expect(Object.isFrozen(input)).toBe(false); expect(Object.isFrozen(catalogs)).toBe(false)
    expect(() => createSupplyResidencePolicy({ ...f.dependencies, configuration: structuredClone(f.dependencies.configuration) })).toThrow()
    expect(() => read(f.value, expectation(f.value, f.dependencies), { kind: 'supply-residence-policy' })).toThrow()
  })
  it('rejects dependency accessor without invoking it and changed declaration scope', () => {
    const f = fixture(), getter = vi.fn(() => f.dependencies.catalog)
    const input = { ...f.dependencies }; Object.defineProperty(input, 'catalog', { enumerable: true, get: getter })
    expect(() => createSupplyResidencePolicy(input)).toThrow()
    expect(getter).not.toHaveBeenCalled()
    const bad: SupplyResidenceDependencies = { ...f.dependencies, residence: { ...f.dependencies.residence,
      scope: { ...f.dependencies.residence.scope, declarations: [] } } }
    expect(() => createSupplyResidencePolicy(bad)).toThrow()
  })
})
