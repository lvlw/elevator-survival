import { describe, expect, it } from 'vitest'
import { entered, fixture, context, mutable, h0Return } from './combat-test-fixtures'
import { readCombatResidenceExpectation, validateCombatResidenceAggregate } from './combat-validation'
import { restoreCombatResidenceCandidate } from './combat-expected'
import { CombatResidenceSaveError } from './combat-types'

describe('R02 R09 independent expected and complete committed comparison', () => {
  it.each(['missing', 'extra', 'identity', 'rules', 'configuration', 'content', 'random', 'catalog', 'profile',
    'revision', 'cycle', 'phase', 'missions', 'initial-run', 'initial-seed', 'initial-choice', 'battle-null',
    'battle-id', 'entry', 'edge', 'enemy', 'queue', 'intent', 'count', 'risk', 'NaN', 'bool'] as const)(
    'rejects external expected %s without changing candidate', fault => {
      const h = entered(), { e, policy } = context(h, h.value), before = structuredClone(h.value)
      const bad = mutable(e)
      if (fault === 'extra') Object.assign(bad, { extra: true })
      if (fault === 'identity') bad.identity.characterId = 'foreign'
      if (fault === 'rules') bad.versions.rulesVersion = 'foreign'
      if (fault === 'configuration') bad.versions.supplyConfigurationId = 'foreign'
      if (fault === 'content') bad.versions.contentId = 'foreign'
      if (fault === 'random') bad.versions.randomAlgorithmVersion = 'foreign'
      if (fault === 'catalog') bad.versions.catalogs[0].catalogVersion = 'foreign'
      if (fault === 'profile') bad.versions.profileIds[0] = 'foreign'
      if (fault === 'revision') bad.revision++
      if (fault === 'cycle') bad.cycle++
      if (fault === 'phase') bad.phase = 'first-hub'
      if (fault === 'missions') bad.missions = []
      if (fault === 'initial-run') bad.initial.execution.runId = 'foreign'
      if (fault === 'initial-seed') bad.initial.execution.seed = 'foreign'
      if (fault === 'initial-choice') bad.initial.choices.tool = 'lamp'
      if (fault === 'battle-null') bad.battle = null
      if (fault === 'battle-id') bad.battle!.battleId = 'foreign'
      if (fault === 'entry') bad.battle!.entryRevision++
      if (fault === 'edge') bad.battle!.edgeId = 'foreign'
      if (fault === 'enemy') bad.battle!.enemyId = 'foreign'
      if (fault === 'queue') bad.battle!.enemyNext++
      if (fault === 'intent') bad.battle!.intent = 'foreign'
      if (fault === 'count') bad.battle!.actionCount++
      if (fault === 'risk') bad.battle!.riskIndex++
      if (fault === 'NaN') bad.revision = NaN
      if (fault === 'bool') bad.revision = true as unknown as number
      expect(() => validateCombatResidenceAggregate(h.value, fault === 'missing' ? undefined! : bad, policy))
        .toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
      expect(h.value).toEqual(before); expect(e).toEqual(context(h, h.value).e)
    })
  it('first-hub seed comes from external bootstrap, not candidate initial origins', () => {
    const h = fixture(), other = fixture({ seed: 'other-seed' }), { e, policy } = context(h, h.initial)
    expect(() => validateCombatResidenceAggregate(other.initial, e, policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
    expect(readCombatResidenceExpectation(e, policy)).toEqual(e); expect(Object.isFrozen(e)).toBe(false)
  })
  it('same anchors do not permit a different complete committed body', () => {
    const h = fixture(), { e, policy } = context(h, h.value), changed = mutable(h.value)
    changed.character.body.energy--
    // This is a valid isolated TEST body boundary, not malformed state. Cold anchors are intentionally not authentication.
    expect(validateCombatResidenceAggregate(changed, e, policy)).toEqual(changed)
    expect(() => restoreCombatResidenceCandidate(changed, h.value, e, policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
    const committed = mutable(h.value), before = structuredClone(committed)
    expect(restoreCombatResidenceCandidate(h.value, committed, e, policy).value).toEqual(h.value)
    expect(committed).toEqual(before); expect(Object.isFrozen(committed)).toBe(false)
    expect(() => restoreCombatResidenceCandidate(h.value, undefined, e, policy)).toThrow(CombatResidenceSaveError)
  })
  it.each(['source', 'binding', 'missing', 'trace'] as const)('final closure %s is independently bound', fault => {
    const h = fault === 'trace' ? entered('orderly', { hp: 1 }) : fixture()
    const v = fault === 'trace' ? h.action(h.value, { kind: 'defend' }).snapshot : h0Return(h)
    const { e, policy } = context(h, v), bad = mutable(e)
    if (fault === 'source') bad.closure!.source = 'deadline'
    if (fault === 'binding') bad.closure!.binding.execution.runId = 'foreign'
    if (fault === 'missing') bad.closure = null
    if (fault === 'trace') bad.closure!.combat!.trace[0].requested++
    expect(() => validateCombatResidenceAggregate(v, bad, policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
  })
})
