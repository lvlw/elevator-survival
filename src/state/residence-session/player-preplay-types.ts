import type { CommandDeath } from '../../core/character-cycle/safety-facts'
import type { PublicActionMetadata } from '../../core/residence-supply/player-metadata'
import type { PlayerPreview, PlayerRequest } from './player-types'

/** Equality-only, session-local presentation scope. Not identity or action authority. */
export type PlayerScope = Readonly<{ scope: 'player-context' }>
export type PlayerIntentMetadata = Readonly<{ qualification: PlayerPreview; death: CommandDeath;
  facts: PublicActionMetadata | null; confirmation: Readonly<{ kind: 'none' | 'static' | 'dynamic';
    reason: 'commission-closure' | 'critical-item' | 'certain-death-with-alternative' | null }>;
  hasProvenAlternative: boolean }>
export type PlayerPreplay = Readonly<{
  scope(): PlayerScope | null
  capture(request: unknown): Readonly<{ scope: PlayerScope; request: PlayerRequest }>
  inspect(request: unknown): PlayerIntentMetadata
}>
