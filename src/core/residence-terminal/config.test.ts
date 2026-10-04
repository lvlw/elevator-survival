import { describe, expect, it } from 'vitest'
import { createTerminalConfig, queryTerminalRewardCapacity } from './config'

const input = { configurationId: 'test-terminal', config: { success_reward: 120, initial_balance: 0, balance_max: 2147483647, failure_penalty: 20 } }
describe('T10 T12 strict configured terminal amounts', () => {
  it('copies, freezes and binds all four values without a default', () => {
    const raw = structuredClone(input); const c = createTerminalConfig(raw, 'test-terminal')
    expect(c).toEqual(raw); expect(c).not.toBe(raw); expect(Object.isFrozen(c.config)).toBe(true)
    expect(Object.isFrozen(raw)).toBe(false)
    expect(queryTerminalRewardCapacity(2147483527, c)).toBe(true)
    expect(queryTerminalRewardCapacity(2147483528, c)).toBe(false)
    expect(() => queryTerminalRewardCapacity(0, structuredClone(c))).toThrow()
  })
  it.each([-1, true, '120', 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, undefined])('rejects malformed numeric value %s', (value) => {
    expect(() => createTerminalConfig({ ...input, config: { ...input.config, success_reward: value } }, 'test-terminal')).toThrow()
  })
  it.each(['success_reward', 'initial_balance', 'balance_max', 'failure_penalty'])('rejects missing %s', (field) => {
    const config: Record<string, number> = { ...input.config }; delete config[field]
    expect(() => createTerminalConfig({ ...input, config }, 'test-terminal')).toThrow()
  })
  it('rejects unknown keys, identities, impossible reserve and uncontrolled handles', () => {
    expect(() => createTerminalConfig({ ...input, more: 1 }, 'test-terminal')).toThrow()
    expect(() => createTerminalConfig(input, 'other')).toThrow()
    expect(() => createTerminalConfig({ ...input, config: { ...input.config, balance_max: 119 } }, 'test-terminal')).toThrow()
    expect(() => createTerminalConfig({ ...input, config: { ...input.config, initial_balance: 2147483647 } }, 'test-terminal')).toThrow()
  })
})
