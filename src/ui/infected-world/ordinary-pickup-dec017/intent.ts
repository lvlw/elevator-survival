import type { PlayerRequest } from '../../../state/residence-session/player-types'
import type { PlayerIntentMetadata } from '../../../state/residence-session/player-preplay-types'

/** Only supplies row-major candidates to the formal Preview; no capacity or merge rules here. */
export function stackablePickupIntent(width: number, height: number, request: PlayerRequest,
  preview: (request: PlayerRequest) => PlayerIntentMetadata): PlayerRequest {
  if (request.placement) return request
  const initial = preview(request).qualification.pickup
  if (!initial || initial.picked === initial.requested || initial.limitedBy.includes('weight') && !initial.limitedBy.includes('space')) return request
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const candidate = { ...request, placement: { x, y, rotated: false } }
    if ((preview(candidate).qualification.pickup?.created ?? 0) > 0) return candidate
  }
  return request
}
