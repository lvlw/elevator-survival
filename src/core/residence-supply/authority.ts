import { deepFreeze } from '../config'
import { z } from 'zod'
import { parseResidence } from '../residence-config/validation'
import type { CycleAuthority } from '../character-cycle'
import type { MissionLifecycleValue } from '../mission-lifecycle'
import { same } from '../residence-terminal/validation'
import { readCycleContext } from '../character-cycle'
import { readSupplyValue, ensure } from './validation'
import { requireSupplyDomainAction } from './shared-validation'
import type { SupplyAuthority, SupplyDependencies, SupplyIndependentContext, SupplyValue } from './types'

const authorities = new WeakMap<object, { value: SupplyValue; dependencies: SupplyDependencies }>()
/** Complete independently supplied base; no current owner and no value-to-authority query. */
export function createSupplyAuthority(input: unknown, expected: SupplyIndependentContext, dependencies: SupplyDependencies): SupplyAuthority {
  const value = readSupplyValue(input, dependencies)
  const context = parseResidence(z.strictObject({ cycle: z.custom<CycleAuthority>(), missions: z.array(z.custom<MissionLifecycleValue>()) }), expected)
  readCycleContext(value.character, context.cycle, dependencies.residence)
  ensure(same(context.missions, value.missions), 'Independent mission context differs', 'BINDING_MISMATCH')
  const authority = deepFreeze({ kind: 'supply-authority' as const })
  authorities.set(authority, { value, dependencies })
  return authority
}
export function readAuthorizedSupply(input: unknown, authority: SupplyAuthority) {
  const ctx = authority && authorities.get(authority)
  ensure(ctx, 'Unissued authority', 'STALE_AUTHORITY')
  const value = readSupplyValue(input, ctx.dependencies)
  ensure(same(value, ctx.value), 'Complete base changed', 'STALE_AUTHORITY')
  return { value, dependencies: ctx.dependencies }
}
export function requireSupplyAction(value: SupplyValue, paid = false): asserts value is SupplyValue & { site: NonNullable<SupplyValue['site']> } {
  requireSupplyDomainAction(value, paid)
}
