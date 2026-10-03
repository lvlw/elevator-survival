import { describe, expect, it } from 'vitest'
import { infectedResidenceConfig as original } from '../../content/infected-residence-core-v0.1/config'
import { createResidenceConfig, requireResidenceConfig, ResidenceError } from './index'
import type { ResidenceConfigInput } from './types'

// A mutable copy for adversarial input tests; production still parses unknown.
const copy = (): ResidenceConfigInput => structuredClone(original) as ResidenceConfigInput

describe('G1 strict controlled configuration', () => {
  it('clones and deeply freezes without freezing mutable input; rejects same-name lookalikes', () => {
    const input = copy()
    const result = createResidenceConfig(input, original.configurationId)
    expect(result).toEqual(input)
    expect(result).not.toBe(input)
    expect(Object.isFrozen(result.config.health.infection_stages[0])).toBe(true)
    expect(Object.isFrozen(input.config.health)).toBe(false)
    expect(requireResidenceConfig(result)).toBe(result)
    expect(() => requireResidenceConfig(input)).toThrowError(expect.objectContaining({ code: 'CONFIGURATION_MISMATCH' }))
  })
  it.each([-1, true, 1.5, '100', NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, null, undefined])(
    'rejects invalid numeric leaf %s before creating a handle', (bad) => {
      const input = copy()
      const value = { ...input, config: { ...input.config, limits: { ...input.config.limits, energy: bad } } }
      const before = structuredClone(value)
      expect(() => createResidenceConfig(value, original.configurationId)).toThrow(ResidenceError)
      expect(value).toEqual(before)
    },
  )
  it.each(['missing', 'extra', 'unknown-id', 'threshold-origin', 'duplicate-threshold', 'descending-damage', 'rest-over-cap', 'quota-product-overflow'])('%s is rejected', (kind) => {
    const input = copy()
    let value: unknown = input
    if (kind === 'missing') value = { configurationId: input.configurationId }
    if (kind === 'extra') value = { ...input, enabled: true }
    if (kind === 'unknown-id') value = { ...input, configurationId: 'other' }
    if (kind === 'threshold-origin') input.config.health.infection_stages[0].min = 1
    if (kind === 'duplicate-threshold') input.config.health.infection_stages[1].min = 0
    if (kind === 'descending-damage') input.config.health.infection_damage[2].hp = 0
    if (kind === 'rest-over-cap') input.config.rest.C = 101
    if (kind === 'quota-product-overflow') input.config.quota.suppressant = Number.MAX_SAFE_INTEGER
    const before = structuredClone(value)
    expect(() => createResidenceConfig(value, original.configurationId)).toThrow(ResidenceError)
    expect(value).toEqual(before)
  })
  it('rejects getters without invoking them, nonplain objects, symbols, sparse arrays and cycles', () => {
    let calls = 0
    const getter = Object.defineProperty({}, 'config', { enumerable: true, get: () => { calls++; return original.config } })
    const symbol = { ...original, [Symbol('extra')]: 1 }
    const sparse = copy()
    delete sparse.config.health.infection_stages[1]
    const cyclic: { self?: unknown } = {}; cyclic.self = cyclic
    for (const value of [getter, symbol, sparse, cyclic, new (class {})(), [], null]) {
      expect(() => createResidenceConfig(value, original.configurationId)).toThrow(ResidenceError)
    }
    expect(calls).toBe(0)
  })
  it('allows a separately controlled valid test configuration without a default fallback', () => {
    const input = copy()
    input.config.limits.energy = 120
    input.config.rest.A = 110
    const configured = createResidenceConfig(input, original.configurationId)
    expect(configured.config.rest.A).toBe(110)
    expect(original.config.rest.A).toBe(100)
  })
})
