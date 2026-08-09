import { describe, expect, it } from 'vitest'
import { hospitalSliceV01RuleConfig as config } from '../../content/hospital-v0.1/rule-config'
import {
  DailyStateError,
  createDailyMedicalUsageSnapshot,
  createInitialDailyMedicalUsageSnapshot,
} from '.'

describe('daily medical usage snapshot', () => {
  it('creates the explicit zero-use state only for a new game day', () => {
    expect(createInitialDailyMedicalUsageSnapshot()).toEqual({
      disinfectantUsesToday: 0,
    })
    expect(Object.isFrozen(createInitialDailyMedicalUsageSnapshot())).toBe(true)
  })

  it.each([
    -1,
    2,
    999,
    0.5,
    Number.NaN,
  ])('rejects invalid disinfectant uses today: %s', (usesToday) => {
    expect(() => createDailyMedicalUsageSnapshot(
      { disinfectantUsesToday: usesToday },
      config,
    )).toThrow(DailyStateError)
  })

  it('rejects unknown daily usage fields and accepts the configured daily maximum', () => {
    expect(() => createDailyMedicalUsageSnapshot(
      { disinfectantUsesToday: 1, unknown: true },
      config,
    )).toThrow(DailyStateError)
    expect(createDailyMedicalUsageSnapshot(
      { disinfectantUsesToday: config.medical.disinfectant.maxUsesPerDay },
      config,
    )).toEqual({ disinfectantUsesToday: 1 })
  })
})
