import { deepFreeze } from '../config'
import { queryActionBleedingHealth } from './cycle'
import { readResidenceBody } from './validation'
import type { ResidenceDependencies } from './types'
import { ResidenceError } from '../residence-config'

export type CommandDeath = Readonly<{ kind: 'guaranteed' | 'not-guaranteed' | 'unknown';
  basis: 'action-bleeding' | 'free-stable-action' | 'stable-action' | 'normal-return-no-night' | 'first-departure' |
    'hidden-target' | 'future-cycle' | 'combat-response' | 'combat-no-response' | 'combat-public-response' | 'arrival-consequences' | 'invalid-request' }>

/** Only a public checkpoint. The caller must establish the complete legal action. */
export function queryPublicActionCheckpoint(bodyInput: unknown, paid: boolean, deps: ResidenceDependencies) {
  const body = readResidenceBody(bodyInput, deps), hp = body.condition.currentHealth
  if (hp === 0) throw new ResidenceError('CHARACTER_DEAD', 'No new action checkpoint for a dead character')
  const after = queryActionBleedingHealth(hp, body.condition.bleeding, paid, deps)
  return deepFreeze({ healthAfter: after, bleedingLoss: hp - after,
    death: { kind: after === 0 ? 'guaranteed' : 'not-guaranteed',
      basis: after === 0 ? 'action-bleeding' : paid ? 'stable-action' : 'free-stable-action' } as CommandDeath })
}
