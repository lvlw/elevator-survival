import type { FrozenRuleConfig } from '../core/config'
import {
  HOSPITAL_SLICE_RULES_VERSION,
  hospitalSliceV01RuleConfig,
} from './hospital-v0.1/rule-config'

const ruleConfigs = new Map<string, FrozenRuleConfig>([
  [HOSPITAL_SLICE_RULES_VERSION, hospitalSliceV01RuleConfig],
])

export class UnknownRulesVersionError extends Error {
  constructor(rulesVersion: string) {
    super(`未知的规则版本：${rulesVersion}`)
    this.name = 'UnknownRulesVersionError'
  }
}

export function getRuleConfig(rulesVersion: string): FrozenRuleConfig {
  const config = ruleConfigs.get(rulesVersion)

  if (!config) {
    throw new UnknownRulesVersionError(rulesVersion)
  }

  return config
}

export function hasRuleConfig(rulesVersion: string): boolean {
  return ruleConfigs.has(rulesVersion)
}

export function listRuleConfigVersions(): readonly string[] {
  return Object.freeze([...ruleConfigs.keys()])
}
