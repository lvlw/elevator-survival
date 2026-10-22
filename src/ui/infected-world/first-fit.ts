import type { PlayerPlacement, PlayerRequest } from '../../state/residence-session/player-types'
import type { PlayerIntentMetadata } from '../../state/residence-session/player-preplay-types'

/** Approved convenience for ordinary whole-instance pickup only; no local legality formula. */
export function firstFit(width: number, height: number, request: Omit<PlayerRequest, 'placement'>,
  preview: (request: PlayerRequest) => PlayerIntentMetadata): PlayerPlacement | null {
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const placement = { x, y, rotated: false }
    if (preview({ ...request, placement }).qualification.kind === 'available') return placement
  }
  return null
}
