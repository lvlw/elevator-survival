import { describe, it, expect } from 'vitest'
import { createInfectedSupplyDependencies } from './initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import approvedNew from '../../../docs/design-drafts/world-infected-001/entry-004/adoption/inputs/approved-documents/infected-world-entry-test-config-v0.1.json'
import approvedG1 from '../../../docs/design-drafts/world-infected-001/entry-002/adoption/inputs/approved-documents/infected-residence-core-test-config-v0.1.json'
import approvedA from '../../../docs/design-drafts/world-infected-001/entry-003/adoption/inputs/approved-documents/infected-terminal-core-test-config-v0.1.json'
import { infectedWorldSupplyConfig, infectedWorldSupplyValues } from './config'
import { createSupplyConfig } from '../../core/residence-supply/config'
import { fixture as makeFixture } from '../../core/residence-supply/test-fixtures'
const leaves = (v: unknown): number => typeof v === 'number' ? 1 : Array.isArray(v) ? v.reduce((n: number, i) => n + leaves(i), 0) :
  v && typeof v === 'object' ? Object.values(v).reduce((n: number, i) => n + leaves(i), 0) : 0
describe('P01 approved parameter oracle', () => {
  it('103 keys and 193 leaves equal approved source, original 38 values unchanged', () => {
    const a = approvedNew
    expect(infectedWorldSupplyValues).toEqual(a.config)
    expect(Object.keys(infectedWorldSupplyValues)).toHaveLength(103)
    expect(leaves(infectedWorldSupplyValues)).toBe(193)
    const f = fixture()
    expect(f.dependencies.residence.configuration.config).toEqual(approvedG1.config)
    expect(f.dependencies.terminal.config).toEqual(approvedA.config)
  })
  it.each([null, [], { extra: 1 }, { configurationId: 'v', values: {} }])('rejects invalid configuration %j', input => {
    expect(() => createSupplyConfig(input)).toThrow()
  })
  it.each([true, NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])('rejects numeric impostor %s', bad => {
    expect(() => createSupplyConfig({ ...infectedWorldSupplyConfig, values: { ...infectedWorldSupplyValues, 'move.local': bad } })).toThrow()
  })
  it('rejects missing/extra keys and H2 fixed random grants', () => {
    const { ['move.local']: omitted, ...rest } = infectedWorldSupplyValues
    expect(omitted).toBe(2)
    expect(() => createSupplyConfig({ ...infectedWorldSupplyConfig, values: rest })).toThrow()
    expect(() => createSupplyConfig({ ...infectedWorldSupplyConfig, values: { ...rest, 'grant.H2-random': { firstaid: 1 } } })).toThrow()
  })
})
