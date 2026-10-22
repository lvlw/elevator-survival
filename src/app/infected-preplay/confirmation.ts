import type { PlayerRequest } from '../../state/residence-session/player-types'
import type { PlayerIntentMetadata, PlayerScope } from '../../state/residence-session/player-preplay-types'
import type { PreplayConfirmation } from './types'

/** Authorization is one-use and bound to the original request and opaque scope. */
export function createConfirmationStore() {
  let active: Readonly<{ token: PreplayConfirmation; request: PlayerRequest; scope: PlayerScope; metadata: PlayerIntentMetadata }> | null = null
  return Object.freeze({
    create(request: PlayerRequest, scope: PlayerScope, metadata: PlayerIntentMetadata) {
      const token = Object.freeze({ confirmation: 'preplay' as const })
      active = Object.freeze({ token, request, scope, metadata }); return token
    },
    clear: () => { active = null },
    take(token: PreplayConfirmation, scope: PlayerScope | null, inspect: (request: PlayerRequest) => PlayerIntentMetadata) {
      const previous = active
      if (!previous || previous.token !== token || previous.scope !== scope) return null
      active = null
      return JSON.stringify(previous.metadata) === JSON.stringify(inspect(previous.request)) ? previous.request : null
    },
  })
}
