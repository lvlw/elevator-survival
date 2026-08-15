import { describe, expect, it } from 'vitest'
import { hospitalSliceV01RuleConfig as config } from '../../content'
import { consumeSatiety, createInitialSatietySnapshot, createSatietySnapshot, restoreSatiety } from '.'

describe('satiety', () => {
  it('starts at the configured value and caps restoration', () => {
    expect(createInitialSatietySnapshot(config)).toEqual({ current: 6 })
    expect(restoreSatiety(createSatietySnapshot({ current: 5 }, config), 2, config)).toEqual({
      snapshot: { current: 6 },
      result: { before: 5, requested: 2, restored: 1, after: 6 },
    })
  })

  it('rejects values outside the configured range and unknown fields', () => {
    expect(() => createSatietySnapshot({ current: -1 }, config)).toThrow()
    expect(() => createSatietySnapshot({ current: 7 }, config)).toThrow()
    expect(() => createSatietySnapshot({ current: 1, extra: true }, config)).toThrow()
  })

  it('consumes only the available satiety and reports the full deterministic result', () => {
    expect(consumeSatiety(createSatietySnapshot({ current: 1 }, config), 2, config)).toEqual({
      snapshot: { current: 0 },
      result: { before: 1, requested: 2, consumed: 1, after: 0 },
    })
    expect(consumeSatiety(createSatietySnapshot({ current: 4 }, config), 0, config)).toEqual({
      snapshot: { current: 4 },
      result: { before: 4, requested: 0, consumed: 0, after: 4 },
    })
  })
})
