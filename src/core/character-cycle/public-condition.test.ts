import { describe, expect, it } from 'vitest'
import { fixture } from '../../state/residence-session/combat-test-fixtures'
import { queryPublicInfectionCondition } from './public-condition'
import { createResidenceConfig } from '../residence-config'

describe('F01 current burden uses bound infection_damage, never growth thresholds', () => {
  it.each([[0, 'below-loss'], [1, 'below-loss'], [30, 'below-loss'], [59, 'below-loss'], [60, 'low'], [89, 'low'],
    [90, 'medium'], [119, 'medium'], [120, 'high'], [999, 'high']] as const)('%i projects %s', (progress, band) => {
    const f = fixture(), state = { ...f.value.character, body: { ...f.value.character.body, infectionProgress: progress } }
    const q = queryPublicInfectionCondition(state, f.deps.supply.residence)
    expect(q.kind).toBe('known'); expect(q.band).toBe(band)
    expect(Object.keys(q).sort()).toEqual(['band', 'kind', 'label', 'mechanism'])
    expect(Object.isFrozen(q)).toBe(true)
  })
  it.each([-1, 0.5, NaN, Infinity, true, Number.MAX_SAFE_INTEGER + 1])('rejects illegal original %s', progress => {
    const f = fixture(), state = { ...f.value.character, body: { ...f.value.character.body, infectionProgress: progress } }
    expect(() => queryPublicInfectionCondition(state as typeof f.value.character, f.deps.supply.residence)).toThrow()
  })
  it('reads controlled configuration segments rather than a second hardcoded threshold table', () => {
    const f = fixture(), d = f.deps.supply.residence, c = d.configuration
    const configuration = createResidenceConfig({ configurationId: 'TEST-public-mapping', config: { ...c.config, health: { ...c.config.health,
      infection_damage: [{ min: 0, hp: 0 }, { min: 10, hp: 1 }, { min: 20, hp: 2 }, { min: 30, hp: 3 }] } } }, 'TEST-public-mapping')
    const state = { ...f.value.character, identity: { ...f.value.character.identity, configurationId: configuration.configurationId },
      body: { ...f.value.character.body, infectionProgress: 20 } }
    expect(queryPublicInfectionCondition(state, { ...d, configuration }).band).toBe('medium')
    expect(() => queryPublicInfectionCondition(state, d)).toThrow()
    expect(() => queryPublicInfectionCondition(state, { ...d, configuration, rulesVersion: 'wrong' })).toThrow()
  })
  it('lookalike config is not silently read as the lowest band', () => {
    const f = fixture(), d = f.deps.supply.residence
    expect(() => queryPublicInfectionCondition(f.value.character, { ...d, configuration: { ...d.configuration } })).toThrow()
  })
})
