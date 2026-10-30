import type { CombatValue } from '../../core/residence-combat/types'
import type { PlayerLabels, PlayerOpponentPresentation } from './player-types'

const unknownOpponent: PlayerOpponentPresentation = Object.freeze({ kind: 'unknown', visualKey: null, name: '当前对手' })

/** value is the current CombatValue already validated by the existing facade/context boundary. */
export function playerOpponent(value: CombatValue, labels: PlayerLabels): PlayerOpponentPresentation | null {
  if (value.phase !== 'active-world' || !value.battle) return null
  const candidate = labels.opponent?.(value.battle.entry.definitionId)
  if (!candidate || candidate.kind !== 'known') return unknownOpponent
  // Treat the composition result as data: never copy unknown properties into the public DTO.
  if (candidate.visualKey === 'infected-orderly' && candidate.name === '感染护工')
    return Object.freeze({ kind: 'known', visualKey: 'infected-orderly', name: '感染护工' })
  if (candidate.visualKey === 'infected-porter' && candidate.name === '感染装卸工')
    return Object.freeze({ kind: 'known', visualKey: 'infected-porter', name: '感染装卸工' })
  if (candidate.visualKey === 'infected-technician' && candidate.name === '感染技术员')
    return Object.freeze({ kind: 'known', visualKey: 'infected-technician', name: '感染技术员' })
  return unknownOpponent
}
