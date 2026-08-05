import { describe, expect, it } from 'vitest'
import { convertCombatElapsedCtbToSceneTime } from './combat-scene-time'

describe('combat CTB to scene time conversion', () => {
  const rules = { minimumSceneTime: 10, ctbPerStep: 100, sceneTimePerStep: 10 }

  it.each([
    [0, 10], [1, 10], [80, 10], [100, 10], [101, 20],
    [180, 20], [250, 30], [280, 30], [300, 30], [380, 40],
  ])('converts %i CTB to %i scene time', (ctb, expected) => {
    expect(convertCombatElapsedCtbToSceneTime(ctb, rules)).toBe(expected)
  })

  it('rejects invalid elapsed CTB and conversion rules', () => {
    expect(() => convertCombatElapsedCtbToSceneTime(-1, rules)).toThrow()
    expect(() => convertCombatElapsedCtbToSceneTime(1, { ...rules, ctbPerStep: 0 })).toThrow()
  })
})
