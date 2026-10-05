import { z } from 'zod'
import { deepFreeze } from '../config'
import { readCycleContext, type CycleAuthority } from '../character-cycle'
import type { MissionLifecycleValue } from '../mission-lifecycle'
import { same } from '../residence-terminal/validation'
import { parseResidence } from '../residence-config/validation'
import { ensure } from '../residence-supply/shared-validation'
import { readCombatValue } from './validation'
import type { CombatAuthority, CombatDependencies, CombatIndependentContext, CombatValue } from './types'
const authorities = new WeakMap<object, { value: CombatValue; dependencies: CombatDependencies }>()
export function createCombatAuthority(input: unknown, expected: CombatIndependentContext, dependencies: CombatDependencies): CombatAuthority {
  const value = readCombatValue(input, dependencies)
  const e = parseResidence(z.strictObject({ cycle: z.custom<CycleAuthority>(), missions: z.array(z.custom<MissionLifecycleValue>()) }), expected)
  readCycleContext(value.character, e.cycle, dependencies.supply.residence)
  ensure(same(e.missions, value.missions), 'Independent mission facts differ', 'BINDING_MISMATCH')
  const result = deepFreeze({ kind: 'residence-combat-authority' as const })
  authorities.set(result, { value, dependencies }); return result
}
export function readAuthorizedCombat(input: unknown, authority: CombatAuthority) {
  const saved = authority && authorities.get(authority)
  ensure(saved, 'Unissued combat authority', 'STALE_AUTHORITY')
  const value = readCombatValue(input, saved.dependencies)
  ensure(same(value, saved.value), 'Complete combat base changed', 'STALE_AUTHORITY')
  return { value, dependencies: saved.dependencies }
}
