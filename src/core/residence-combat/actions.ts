import { z } from 'zod'
import { countSchema, idSchema, parseResidence } from '../residence-config/validation'
import { ensure } from '../residence-supply/shared-validation'
import { resolveProfiledCombatAction } from '../combat/profiled-controlled'
import { actionSchema } from './schema'
import { readAuthorizedCombat } from './authority'
import { projectCombat } from './projection'
import { composeCombatResolution } from './effects'
import { closeSurvivingCombat } from './exit'
import { issueCombatPlan } from './plans'
import { issueCombatDeath, consumeCombatDeath } from './terminal'
import type { CombatAuthority } from './types'
const requestSchema = z.strictObject({ kind: z.literal('combat-action'), expectedRevision: countSchema,
  command: actionSchema, instanceId: idSchema.optional(), quantity: z.literal(1).optional() })
/** Controlled raw proposal: a death token has no installable snapshot. */
export function planResidenceCombatAction(input: unknown, request: unknown, authority: CombatAuthority) {
  const c = parseResidence(requestSchema, request)
  const { value, dependencies } = readAuthorizedCombat(input, authority)
  ensure(value.battle && value.site && c.expectedRevision === value.character.revision, 'Not current combat decision', 'NOT_AVAILABLE')
  if (c.command.kind === 'use-quick-slot-item') {
    const item = value.carried.quickSlots.slots[c.command.quickSlotIndex]
    ensure(item && c.instanceId === item.instanceId, 'Explicit real quick slot instance required', 'NOT_AVAILABLE')
  } else ensure(c.instanceId === undefined && c.quantity === undefined, 'Unexpected consumption fields')
  const { snapshot, engine } = projectCombat(value, dependencies)
  const resolution = resolveProfiledCombatAction(snapshot, c.command, engine)
  let proposed = composeCombatResolution(value, resolution, dependencies)
  if (resolution.snapshot.status === 'defeat') return issueCombatDeath(value, proposed, dependencies)
  if (resolution.snapshot.status === 'victory' || resolution.snapshot.status === 'escaped')
    proposed = closeSurvivingCombat(proposed, resolution.snapshot.status, dependencies)
  return issueCombatPlan(value, proposed, dependencies, 'combat')
}
/** Single synchronous pure composition, never publishes a raw HP0 active intermediate. */
export function resolveResidenceCombatAction(input: unknown, request: unknown, authority: CombatAuthority) {
  const plan = planResidenceCombatAction(input, request, authority)
  return plan.kind === 'combat-death-proposal' ? consumeCombatDeath(input, plan, authority) : plan
}
