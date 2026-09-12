import { describe, expect, it, vi } from 'vitest'
import {
  playPresentationAudioCue,
  presentationAudioSource,
  uiSelectionCueForCategory,
} from './presentation-audio'

describe('presentation audio probe adapter', () => {
  it('keeps cue sources deterministic and separates selection variants', () => {
    expect(presentationAudioSource('scene-move')).toContain('aud_scene_move_a')
    expect(uiSelectionCueForCategory('radio')).toBe('ui-select-a')
    expect(uiSelectionCueForCategory('placement')).toBe('ui-select-b')
  })

  it('swallows a rejecting browser player without affecting callers', async () => {
    const player = { play: vi.fn(() => Promise.reject(new Error('autoplay denied'))) }
    expect(() => playPresentationAudioCue(player, 'combat-player-hurt')).not.toThrow()
    await Promise.resolve()
    expect(player.play).toHaveBeenCalledTimes(1)
  })
})
