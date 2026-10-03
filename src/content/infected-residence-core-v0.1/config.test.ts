import document from '../../../docs/content/infected-residence-core-test-config-v0.1.json'
import { describe, expect, it } from 'vitest'
import { infectedResidenceConfig } from './config'

describe('G1 approved configuration parity', () => {
  it('matches the exact approved recursive key set, identifier and 34 numeric leaves', () => {
    expect(infectedResidenceConfig).toEqual({ configurationId: document.configurationId, config: document.config })
    const leaves = (v: unknown): number => typeof v === 'number' ? 1 :
      v !== null && typeof v === 'object' ? Object.values(v).reduce<number>((n, entry) => n + leaves(entry), 0) : 0
    expect(leaves(infectedResidenceConfig)).toBe(34)
    expect(Object.isFrozen(infectedResidenceConfig.config.quota)).toBe(true)
  })
})
