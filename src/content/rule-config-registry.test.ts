import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_SLICE_RULES_VERSION,
  getRuleConfig,
  hasRuleConfig,
  listRuleConfigVersions,
  UnknownRulesVersionError,
} from './index'

describe('rule config registry', () => {
  it('resolves the registered hospital rules version', () => {
    const config = getRuleConfig(HOSPITAL_SLICE_RULES_VERSION)

    expect(config.metadata.rulesVersion).toBe(HOSPITAL_SLICE_RULES_VERSION)
    expect(hasRuleConfig(HOSPITAL_SLICE_RULES_VERSION)).toBe(true)
  })

  it('fails explicitly for an unknown version without fallback', () => {
    expect(() => getRuleConfig('hospital-slice-v9.9')).toThrow(
      UnknownRulesVersionError,
    )
    expect(hasRuleConfig('hospital-slice-v9.9')).toBe(false)
  })

  it('lists registered versions once and returns a frozen list', () => {
    const versions = listRuleConfigVersions()

    expect(versions).toContain(HOSPITAL_SLICE_RULES_VERSION)
    expect(new Set(versions).size).toBe(versions.length)
    expect(Object.isFrozen(versions)).toBe(true)
  })
})
