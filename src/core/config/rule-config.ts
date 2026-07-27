import { deepFreeze, type DeepReadonly } from './deep-freeze'
import {
  ruleConfigSchema,
  type RuleConfig,
  type RuleConfigInput,
} from './rule-config-schema'

export type FrozenRuleConfig = DeepReadonly<RuleConfig>

export function parseRuleConfig(input: RuleConfigInput): FrozenRuleConfig {
  const validatedConfig = ruleConfigSchema.parse(input)
  return deepFreeze(validatedConfig)
}
