import selectA from '../../assets/presentation/v0.1/audio/probe/aud_ui_select_a.wav'
import selectB from '../../assets/presentation/v0.1/audio/probe/aud_ui_select_b.wav'
import sceneMove from '../../assets/presentation/v0.1/audio/probe/aud_scene_move_a.wav'
import sceneSearch from '../../assets/presentation/v0.1/audio/probe/aud_scene_search_complete_a.wav'
import doorCard from '../../assets/presentation/v0.1/audio/probe/aud_scene_door_card_a.wav'
import combatBasic from '../../assets/presentation/v0.1/audio/probe/aud_combat_player_basic_a.wav'
import combatHurt from '../../assets/presentation/v0.1/audio/probe/aud_combat_player_hurt_a.wav'

export type PresentationAudioCue =
  | 'ui-select-a'
  | 'ui-select-b'
  | 'scene-move'
  | 'scene-search-complete'
  | 'scene-door-card'
  | 'combat-player-basic'
  | 'combat-player-hurt'

const sources: Readonly<Record<PresentationAudioCue, string>> = Object.freeze({
  'ui-select-a': selectA,
  'ui-select-b': selectB,
  'scene-move': sceneMove,
  'scene-search-complete': sceneSearch,
  'scene-door-card': doorCard,
  'combat-player-basic': combatBasic,
  'combat-player-hurt': combatHurt,
})

export interface PresentationAudioPlayer {
  play(source: string): void | Promise<void>
}

export function presentationAudioSource(cue: PresentationAudioCue): string {
  return sources[cue]
}

export function createBrowserPresentationAudioPlayer(): PresentationAudioPlayer {
  return Object.freeze({
    play(source: string) {
      try {
        const result = new Audio(source).play()
        if (result && typeof result.catch === 'function') void result.catch(() => undefined)
      } catch {
        // Autoplay and media loading failures are presentation-only.
      }
    },
  })
}

export function playPresentationAudioCue(
  player: PresentationAudioPlayer,
  cue: PresentationAudioCue,
): void {
  try {
    const result = player.play(presentationAudioSource(cue))
    if (result && typeof result.catch === 'function') void result.catch(() => undefined)
  } catch {
    // A failed probe must never affect canonical gameplay execution.
  }
}

export function uiSelectionCueForCategory(category: 'radio' | 'operation' | 'placement' | 'target'): PresentationAudioCue {
  return category === 'placement' || category === 'target' ? 'ui-select-b' : 'ui-select-a'
}
