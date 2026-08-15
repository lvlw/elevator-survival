import { describe, expect, it } from 'vitest'
import { hospitalSliceV01RuleConfig as config } from '../../content'
import { createDailyRunStateSnapshot, createInitialDailyRunStateSnapshot } from '.'

describe('daily Run state', () => {
  it('creates the configured current-day initial facts', () => {
    expect(createInitialDailyRunStateSnapshot(config)).toEqual({
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: 3,
      mainSceneUsedToday: false,
    })
  })

  it('strictly restores the daily main-scene usage fact', () => {
    const valid = createInitialDailyRunStateSnapshot(config)
    expect(createDailyRunStateSnapshot({ ...valid, mainSceneUsedToday: true }, config)
      .mainSceneUsedToday).toBe(true)
    const { mainSceneUsedToday: _omitted, ...missing } = valid
    expect(() => createDailyRunStateSnapshot(missing, config)).toThrow()
    expect(() => createDailyRunStateSnapshot({ ...valid, mainSceneUsedToday: 'false' }, config)).toThrow()
    expect(() => createDailyRunStateSnapshot({ ...valid, extra: false }, config)).toThrow()
  })

  it('closes suppression amount/count and maintenance bounds', () => {
    const valid = createInitialDailyRunStateSnapshot(config)
    expect(() => createDailyRunStateSnapshot({ ...valid, threatSuppression: { usesToday: 0, suppressionAmountToday: 15 } }, config)).toThrow()
    expect(() => createDailyRunStateSnapshot({ ...valid, threatSuppression: { usesToday: 1, suppressionAmountToday: 0 } }, config)).toThrow()
    expect(() => createDailyRunStateSnapshot({ ...valid, maintenanceLaborRemaining: 4 }, config)).toThrow()
    expect(() => createDailyRunStateSnapshot({ ...valid, extra: true }, config)).toThrow()
  })
})
