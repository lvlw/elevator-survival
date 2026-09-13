import { describe, expect, it } from 'vitest'
import { positionFloating } from './floating-position'

describe('positionFloating', () => {
  it('anchors beneath a control without covering the trigger', () => {
    const position = positionFloating(
      { left: 100, right: 180, top: 120, bottom: 150 },
      { width: 220, height: 130 },
      { width: 1280, height: 720 },
    )
    expect(position).toEqual({ left: 100, top: 160 })
  })

  it('flips at the right and bottom edges while remaining inside the viewport', () => {
    const position = positionFloating(
      { left: 1190, right: 1260, top: 660, bottom: 690 },
      { width: 300, height: 180 },
      { width: 1280, height: 720 },
    )
    expect(position).toEqual({ left: 960, top: 470 })
    expect(position.left + 300).toBeLessThanOrEqual(1272)
    expect(position.top + 180).toBeLessThanOrEqual(712)
  })

  it('shifts an oversized panel into the visible margin without using a fixed corner', () => {
    const position = positionFloating(
      { left: 120, right: 160, top: 20, bottom: 50 },
      { width: 780, height: 500 },
      { width: 600, height: 400 },
    )
    expect(position).toEqual({ left: 8, top: 8 })
  })
})
