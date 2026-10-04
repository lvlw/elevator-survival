import { z } from 'zod'
import { deepFreeze } from '../config'
import { countSchema, idSchema, parseResidence } from '../residence-config/validation'
import { TerminalError, type TerminalConfig } from './types'

const schema = z.strictObject({ configurationId: idSchema, config: z.strictObject({
  success_reward: countSchema, initial_balance: countSchema, balance_max: countSchema, failure_penalty: countSchema,
}) })
const issued = new WeakSet<object>()
export function createTerminalConfig(input: unknown, expectedId: string): TerminalConfig {
  const value = parseResidence(schema, input)
  if (value.configurationId !== parseResidence(idSchema, expectedId) ||
    value.config.success_reward > value.config.balance_max ||
    value.config.initial_balance > value.config.balance_max - value.config.success_reward ||
    value.config.failure_penalty > value.config.balance_max) {
    throw new TerminalError('INVALID_INPUT', 'Invalid terminal configuration binding or bounds')
  }
  const result = deepFreeze(value)
  issued.add(result)
  return result
}
export function requireTerminalConfig(input: TerminalConfig): TerminalConfig {
  if (!input || !issued.has(input)) throw new TerminalError('BINDING_MISMATCH', 'Uncontrolled terminal configuration')
  return input
}
export function queryTerminalRewardCapacity(input: unknown, configuration: TerminalConfig): boolean {
  const balance = parseResidence(countSchema, input)
  const c = requireTerminalConfig(configuration).config
  if (balance > c.balance_max) throw new TerminalError('INVALID_INPUT', 'Balance exceeds configured bound')
  return balance <= c.balance_max - c.success_reward
}
