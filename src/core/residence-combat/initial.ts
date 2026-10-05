import { establishSharedInitial, planSharedDeparture } from '../residence-supply/shared-initial'
import { readCombatValue } from './validation'
import { readAuthorizedCombat } from './authority'
import { combatDomainContext } from './stable'
import type { CombatDependencies, CombatAuthority } from './types'
export function establishCombatInitial(input: unknown, deps: CombatDependencies) {
  return establishSharedInitial(input, deps.supply, facts => readCombatValue({ ...facts,
    protocol: 'residence-combat-pure-v1', battle: null, battles: [], combatDeaths: [] }, deps),
    value => readCombatValue(value, deps))
}
export function planCombatDeparture(input: unknown, request: unknown, authority: CombatAuthority) {
  const { value, dependencies } = readAuthorizedCombat(input, authority)
  return planSharedDeparture(value, request, combatDomainContext(dependencies))
}
