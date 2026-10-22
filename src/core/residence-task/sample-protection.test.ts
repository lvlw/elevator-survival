import { describe, expect, it } from 'vitest'
import { fixture } from '../../state/residence-session/combat-test-fixtures'
import { querySampleProtection } from './sample-protection'
import { createSupplyConfig, numberValue, vectorValue } from '../residence-supply/config'

describe('R-M01 internal sample protection facts', () => {
  for (const method of ['cautious', 'direct'] as const) {
    it.each([12, 1, 0])(`${method} uses current integrity %i and the versioned payment`, current => {
      const h = fixture(), value = JSON.parse(JSON.stringify(h.value)) as typeof h.value
      const armor = value.carried.equipment.armor!
      const input = { carried: value.carried, itemStates: { states: value.itemStates.states.map(s => s.instanceId === armor.instanceId
        ? { ...s, resource: { kind: 'integrity' as const, current } } : s) } }
      const before = JSON.stringify(input), facts = querySampleProtection(input, method, h.deps.supply)
      const index = method === 'cautious' ? 0 : 1
      expect(facts.effectiveRiskPercent).toBe(vectorValue(h.deps.supply.configuration, current ? 'sample.coat_risks' : 'sample.risks', 2)[index])
      expect(facts.payment).toEqual(current ? { instanceId: armor.instanceId, requested: numberValue(h.deps.supply.configuration, 'wear.tool') } : null)
      expect(JSON.stringify(input)).toBe(before); expect(Object.isFrozen(input.carried)).toBe(false)
      expect(input.itemStates.states.every(s => !Object.isFrozen(s))).toBe(true); expect(Object.isFrozen(facts)).toBe(true)
    })
    it(`${method} without equipped armor has no payment`, () => {
      const h = fixture(), input = { carried: { ...h.value.carried, equipment: { ...h.value.carried.equipment, armor: null } }, itemStates: h.value.itemStates }
      expect(querySampleProtection(input, method, h.deps.supply).payment).toBeNull()
    })
    it(`${method} charges only when protection actually lowers risk, not just when a coat exists`, () => {
      const h = fixture(), original = h.deps.supply.configuration
      // Pure owner parameterization only; no approved configuration or native producer is changed.
      const configuration = createSupplyConfig({ ...original, values: { ...original.values, 'sample.coat_risks': original.values['sample.risks'] } })
      const facts = querySampleProtection(h.value, method, { ...h.deps.supply, configuration })
      expect(facts.payment).toBeNull()
      expect(facts.effectiveRiskPercent).toBe(vectorValue(configuration, 'sample.risks', 2)[method === 'cautious' ? 0 : 1])
    })
  }
})
