import { afterEach, describe, expect, it, vi } from 'vitest'
import { context, entered, fixture, mutable, rejectAll } from './combat-test-fixtures'
import { validateCombatResidenceAggregate } from './combat-validation'
import { createCombatResidencePolicy } from './combat-policy'
import * as core from '../../core/residence-combat/validation'
import { RANDOM_ALGORITHM_VERSION } from '../../core/random'
import { createResidenceCombatDependencies } from '../../core/residence-combat/dependencies'
import type { CombatResidencePolicyInput } from './combat-types'
import { serializeCombatResidenceSave } from './combat-codec'

afterEach(() => vi.restoreAllMocks())
describe('R01 R03 strict actual aggregate and policy', () => {
  it.each(['NaN', 'infinity', 'unsafe', 'negative', 'bool', 'unknown', 'protocol', 'array', 'null',
    'getter', 'class', 'sparse', 'symbol', 'nonenumerable', 'missing'] as const)('rejects raw %s before encode normalization', fault => {
    const h = fixture(), bad = mutable(h.value)
    if (fault === 'NaN') bad.character.body.energy = NaN
    if (fault === 'infinity') bad.character.body.energy = Infinity
    if (fault === 'unsafe') bad.character.revision = Number.MAX_SAFE_INTEGER + 1
    if (fault === 'negative') bad.character.revision = -1
    if (fault === 'bool') bad.character.body.energy = true as unknown as number
    if (fault === 'unknown') Object.assign(bad, { extra: 1 })
    if (fault === 'protocol') Object.assign(bad, { protocol: 'residence-supply-pure-v1' })
    if (fault === 'array') Object.assign(bad, { origins: {} })
    if (fault === 'null') Object.assign(bad, { choices: null })
    if (fault === 'getter') Object.defineProperty(bad, 'balance', { get: () => { throw new Error('Accessor executed') }, enumerable: true })
    if (fault === 'class') Object.setPrototypeOf(bad, new Date())
    if (fault === 'sparse') delete (bad.origins as unknown[])[0]
    if (fault === 'symbol') Object.assign(bad, { [Symbol('bad')]: 1 })
    if (fault === 'nonenumerable') Object.defineProperty(bad, 'secret', { value: 1 })
    if (fault === 'missing') Reflect.deleteProperty(bad, 'choices')
    // Raw aggregate and encoder both check descriptors before JSON can discard bad fields.
    const { e, policy } = context(h, h.value)
    expect(() => validateCombatResidenceAggregate(bad, e, policy)).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }))
    expect(() => serializeCombatResidenceSave(bad, e, policy)).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }))
  })
  it.each(['pending-no-battle', 'drain', 'preparation', 'temporary-defense', 'HP0', 'enemyHP0', 'private-death', 'unpaid-exit'] as const)(
    'rejects incomplete %s; never repairs it implicitly', fault => {
      const h = entered(), bad = mutable(h.value)
      if (fault === 'pending-no-battle') bad.battle = null
      if (fault === 'drain') bad.battle!.currentCtb = bad.battle!.playerNext = 100
      if (fault === 'preparation') bad.battle!.currentCtb = 1
      if (fault === 'temporary-defense') Object.assign(bad.battle!, { temporaryDefense: { amount: 1 } })
      if (fault === 'HP0') bad.character.body.condition.currentHealth = 0
      if (fault === 'enemyHP0') bad.site!.enemies.find(e => e.id === 'orderly')!.state.currentHealth = 0
      if (fault === 'private-death') Object.assign(bad, { kind: 'residence-combat-death-proposal' })
      if (fault === 'unpaid-exit') { bad.battle = null; bad.site!.pending = { kind: 'none' } }
      expect(rejectAll(h, h.value, bad)).toEqual(['INVALID_STATE', 'INVALID_STATE', 'INVALID_STATE'])
    })
  it.each(['configurationId', 'contentId', 'terminalConfigurationId'] as const)('binds actual %s', key => {
    const h = fixture(), bad = mutable(h.value); bad[key] = 'wrong'
    expect(rejectAll(h, h.value, bad)).toEqual(['INVALID_STATE', 'INVALID_STATE', 'INVALID_STATE'])
  })
  it('rejects an unissued dependency copy, unknown algorithm and extra policy fields', () => {
    const h = fixture(), raw: CombatResidencePolicyInput = { dependencies: h.deps, randomAlgorithmVersion: RANDOM_ALGORITHM_VERSION }
    expect(() => createCombatResidencePolicy({ ...raw, dependencies: { ...h.deps } })).toThrowError(expect.objectContaining({ code: 'INVALID_POLICY' }))
    expect(() => createCombatResidencePolicy({ ...raw, randomAlgorithmVersion: 'unknown' })).toThrowError(expect.objectContaining({ code: 'INVALID_POLICY' }))
    expect(() => createCombatResidencePolicy({ ...raw, extra: true } as CombatResidencePolicyInput)).toThrowError(expect.objectContaining({ code: 'INVALID_POLICY' }))
    expect(() => createCombatResidencePolicy({ ...raw, [Symbol('extra')]: 1 })).toThrowError(expect.objectContaining({ code: 'INVALID_POLICY' }))
  })
  it('implementation error is rethrown, not reported as successful semantic rejection', () => {
    const h = fixture(), { e, policy } = context(h, h.value), bug = new TypeError('implementation bug')
    vi.spyOn(core, 'readCombatValue').mockImplementationOnce(() => { throw bug })
    expect(() => validateCombatResidenceAggregate(h.value, e, policy)).toThrow(bug)
  })
  it('policy preserves caller-owned scope and rejects later scope mutation', () => {
    const h = fixture(), scope = mutable(h.deps.supply.residence.scope)
    const deps = createResidenceCombatDependencies({ ...h.deps.supply,
      residence: { ...h.deps.supply.residence, scope } }, h.deps.profiles)
    const policy = createCombatResidencePolicy({ dependencies: deps, randomAlgorithmVersion: RANDOM_ALGORITHM_VERSION })
    const { e } = context(h, h.value)
    expect(validateCombatResidenceAggregate(h.value, e, policy)).toEqual(h.value)
    expect(Object.isFrozen(scope)).toBe(false); expect(Object.isFrozen(scope.declarations)).toBe(false)
    scope.declarations[0].commissionId = 'changed-after-policy'
    expect(() => validateCombatResidenceAggregate(h.value, e, policy)).toThrowError(expect.objectContaining({ code: 'INVALID_POLICY' }))
  })
})
