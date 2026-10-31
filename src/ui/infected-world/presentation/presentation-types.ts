import type { PublicCombatAction } from '../../../state/residence-session/player-types'
export type ActionCue = Readonly<{ action: PublicCombatAction; phase: 'active' | 'settled'; epoch: number }>
export const CUE_MILLISECONDS = 180
