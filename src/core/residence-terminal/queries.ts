import { deepFreeze } from '../config'
import { readAuthorized } from './authority'
import { same, sampleFor } from './validation'
import type { TerminalAuthority, TerminalPolicy, TerminalSnapshot } from './types'

export { sampleFor } from './validation'
export function hasSample(value: TerminalSnapshot, policy: TerminalPolicy): boolean {
  if (!value.site) return false
  const { instanceId, grant } = sampleFor(value.site, policy)
  return value.site.sources.some((s) => s.id === policy.sampleSourceId && s.claimed) &&
    value.carried.backpack.items.some((i) => i.instanceId === instanceId && i.definitionId === grant.definitionId && i.quantity === grant.quantity) &&
    value.itemStates.states.some((s) => s.instanceId === instanceId && s.definitionId === grant.definitionId && same(s.resource, grant.resource))
}
export function eligibility(value: TerminalSnapshot, policy: TerminalPolicy, stable: boolean, days: number) {
  const site = value.site
  const clock = value.character.clock
  const active = value.phase === 'active-world' && clock.kind === 'active' && value.character.body.condition.currentHealth > 0 &&
    stable && site?.pending.kind === 'none'
  const complete = !!site && [policy.powerFactId, policy.transferFactId].every((id) => site.facts.some((f) => f.id === id && f.value)) && hasSample(value, policy)
  const atReturn = site?.nodeId === policy.returnNodeId
  return deepFreeze({ deliver: !!active && atReturn && complete, withdraw: !!active && atReturn && !complete,
    deadline: !!active && !atReturn && clock.kind === 'active' && clock.taskDay === days })
}
/** Explicit allow-list: no seed, exact infection, hidden cursor or raw state. */
export function queryTerminalEligibility(input: unknown, authority: TerminalAuthority) {
  const ctx = readAuthorized(input, authority)
  return eligibility(ctx.value, ctx.policy, ctx.location.cycle.stableContext === 'stable', ctx.dependencies.residence.configuration.config.limits.days)
}
