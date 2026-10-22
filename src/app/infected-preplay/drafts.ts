import type { PlayerRequest } from '../../state/residence-session/player-types'
import type { PlayerScope } from '../../state/residence-session/player-preplay-types'
import type { PreplayDraft } from './types'

export function createDraftStore() {
  let active: Readonly<{ token: PreplayDraft; request: PlayerRequest; scope: PlayerScope }> | null = null
  return Object.freeze({
    create(request: PlayerRequest, scope: PlayerScope) {
      active = Object.freeze({ token: Object.freeze({ draft: 'preplay' as const }), request, scope })
      return active.token
    },
    get: () => active,
    clear: () => { active = null },
    resolve: (token: PreplayDraft, scope: PlayerScope | null) => active?.token === token && active.scope === scope ? active.request : null,
  })
}
