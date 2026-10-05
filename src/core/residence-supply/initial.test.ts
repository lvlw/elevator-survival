import { describe, expect, it } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { fixture as makeFixture, revision } from './test-fixtures'
import { planSupplyDeparture } from './initial'
import { readSupplyValue } from './validation'
describe('P02 real initial and departure', () => {
  it.each(['crow', 'lamp', 'toolbox'] as const)('three specialties with %s preserve real choices/resources', tool => {
    for (const specialty of ['scout', 'engineer', 'survival'] as const) {
      const f = fixture({ tool, specialty })
      expect(f.initial.carried.backpack.items).toEqual([])
      expect(f.initial.origins).toHaveLength(4)
      expect(f.initial.itemStates.states).toHaveLength(4)
      expect(f.initial.carried.quickSlots.slots[0]?.quantity).toBe(1)
      expect(f.value.phase).toBe('active-world')
      expect(f.value.site?.nodeId).toBe('H0')
      expect(f.value.choices).toEqual({ tool, specialty, firstBandageUsed: false })
      expect(readSupplyValue(structuredClone(f.value), f.dependencies)).toEqual(f.value)
    }
  })
  it('rejects additive departure/regrant without changing input', () => {
    const f = fixture(), copy = structuredClone(f.value)
    expect(() => planSupplyDeparture(f.value, { kind: 'depart', ...revision(f.value),
      commissionId: f.dependencies.catalog.data.mission.commissionId }, f.authorize(f.value))).toThrow()
    expect(f.value).toEqual(copy)
  })
  it('locked choices, damaged initial resource, fabricated first-bandage flag cannot become a first state', () => {
    const f = fixture()
    expect(() => readSupplyValue({ ...f.value, choices: { ...f.value.choices, specialty: 'scout' } }, f.dependencies)).toThrow()
    expect(() => readSupplyValue({ ...f.value, choices: { ...f.value.choices, tool: 'crow' } }, f.dependencies)).toThrow()
    expect(() => readSupplyValue({ ...f.initial, choices: { ...f.initial.choices, firstBandageUsed: true } }, f.dependencies)).toThrow()
    expect(() => readSupplyValue({ ...f.initial, itemStates: { states: f.initial.itemStates.states.map(s => s.resource.kind === 'none' ? s :
      { ...s, resource: { ...s.resource, current: 0 } }) } }, f.dependencies)).toThrow()
  })
})
