import { z } from 'zod'
import { planCharacterCycle, type BodyStep } from '../character-cycle'
import { terminateMission } from '../mission-lifecycle/controlled'
import { assertResidenceLocationPlanCurrent } from '../residence-location'
import { readLocationContext } from '../residence-location/validation'
import type { LocationPlan, ResidenceLocationSnapshot } from '../residence-location'
import { countSchema, parseResidence, safeAdd, safeMultiply } from '../residence-config/validation'
import { locationBindingSchema } from '../residence-location/identity'
import { readAuthorized, locationOf } from './authority'
import { disposeTerminalAssets } from './dispositions'
import { eligibility } from './queries'
import { issueTerminalPlan, terminalCommandSchema, verifyCycleResult, verifySteps } from './plans'
import { ensure, readTerminalSnapshot, same, stepSchema } from './validation'
import { TerminalError, type TerminalAuthority, type TerminalOutcome, type TerminalReceipt } from './types'

function finish(ctx: ReturnType<typeof readAuthorized>, result: ResidenceLocationSnapshot, outcome: TerminalOutcome,
  source: TerminalReceipt['source'], steps: readonly BodyStep[]) {
  const { value: before, dependencies, policy } = ctx
  const clock = before.character.clock
  ensure(clock.kind === 'active', 'No active execution')
  const config = dependencies.configuration.config
  const reward = outcome === 'success' ? config.success_reward : 0
  const penalty = outcome === 'voluntary-failure' || outcome === 'deadline-failure' ? Math.min(before.balance, config.failure_penalty) : 0
  const forfeited = outcome === 'death' ? before.balance : 0
  const balance = safeAdd(before.balance - penalty - forfeited, reward)
  const assets = disposeTerminalAssets(before, result, outcome, policy)
  const receipt: TerminalReceipt = { binding: result.site.binding, outcome, source, steps,
    startCycle: clock.startCycle, endCycle: before.character.cycle, taskDay: clock.taskDay, revision: result.character.revision,
    deathCause: outcome === 'death' ? steps.at(-1)!.kind : null,
    before: before.balance, reward, penalty, forfeited, dispositionIds: assets.dispositionIds }
  const active = before.missions.find((m) => m.status === 'active')!
  const closed = terminateMission(active, { binding: active.binding, execution: clock.execution, outcome }, dependencies.residence.scope)
  const { dispositionIds: _ids, ...containers } = assets
  const snapshot = readTerminalSnapshot({ ...before, ...containers, phase: outcome === 'death' ? 'dead' : 'living-hub',
    character: result.character, site: null, balance, missions: before.missions.map((m) => m === active ? closed : m),
    receipts: [...before.receipts, receipt] }, dependencies)
  return issueTerminalPlan(before, snapshot)
}

/** Explicit H0 delivery/withdrawal or actual Day7 remote deadline. No fallback intent. */
export function planResidenceTerminal(input: unknown, commandInput: unknown, authority: TerminalAuthority) {
  const ctx = readAuthorized(input, authority)
  const command = parseResidence(terminalCommandSchema, commandInput)
  const { value, dependencies, policy } = ctx
  const current = locationOf(value)
  if (!same(command.binding, current.site.binding) || command.expectedRevision !== current.character.revision) {
    throw new TerminalError('BINDING_MISMATCH', 'Command does not bind the current execution and revision')
  }
  const available = eligibility(value, policy, ctx.location.cycle.stableContext === 'stable', dependencies.residence.configuration.config.limits.days)
  if (!available[command.kind]) throw new TerminalError('NOT_AVAILABLE', 'Requested terminal intent is not eligible')
  safeAdd(current.character.revision, 1)
  if (command.kind === 'deadline') {
    safeAdd(current.character.cycle, 1)
    // Capacity preflight only, including later steps a death might skip. Does not
    // produce infection/HP state; G1 remains the sole settlement producer.
    const body = current.character.body; const health = dependencies.residence.configuration.config.health
    const base = health.infection_stages.filter((r) => body.infectionProgress >= r.min).at(-1)!.base
    const gross = safeAdd(base, safeMultiply(body.condition.pendingInfectionExposures, health.exposure_progress))
    safeAdd(body.infectionProgress, Math.max(0, gross - body.suppression))
  }
  const outcome = command.kind === 'deliver' ? 'success' : command.kind === 'withdraw' ? 'voluntary-failure' : 'deadline-failure'
  const kind = command.kind === 'deadline' ? 'deadline' : 'normal-return'
  const authorityForCycle = { ...ctx.location.cycle, normalReturn: kind === 'normal-return' ? outcome as 'success' | 'voluntary-failure' : null }
  const raw = planCharacterCycle(current.character, { kind, identity: current.character.identity,
    expectedRevision: current.character.revision }, authorityForCycle, dependencies.residence)
  const result = verifyCycleResult(raw, current.character, kind, outcome, dependencies.residence)
  return finish(ctx, { ...current, character: result.snapshot }, result.outcome === 'death' ? 'death' : outcome, kind, result.steps)
}

const locationPlanSchema = z.strictObject({ kind: z.literal('residence-location-plan'),
  base: z.strictObject({ binding: locationBindingSchema, revision: countSchema }),
  snapshot: z.custom<ResidenceLocationSnapshot>(), energyCost: countSchema, steps: z.array(stepSchema).min(1),
  coordination: z.enum(['stable-local-result', 'combat-required', 'death-required']) })
/** Consume the original G2 capability before copying. No action, cycle or draw is replayed. */
export function consumeResidenceLocationDeath(input: unknown, original: LocationPlan, authority: TerminalAuthority) {
  const ctx = readAuthorized(input, authority)
  const before = locationOf(ctx.value)
  const deps = { residence: ctx.dependencies.residence, catalog: ctx.policy.catalog }
  ensure(ctx.location.cycle.stableContext === 'stable' && before.site.pending.kind === 'none', 'Death source requires the independent stable action boundary')
  assertResidenceLocationPlanCurrent(before, original, ctx.location, deps)
  const raw = parseResidence(locationPlanSchema, original)
  ensure(raw.coordination === 'death-required' && (raw.energyCost === 0 || before.character.body.energy > 0), 'Not a supported location death')
  const result = readLocationContext(raw.snapshot, { ...ctx.location, cycle: { ...ctx.location.cycle,
    revision: safeAdd(before.character.revision, 1) } }, deps).snapshot
  ensure(result.character.body.condition.currentHealth === 0 && same(result.character.clock, before.character.clock) &&
    result.character.cycle === before.character.cycle, 'Location death changed cycle or lost HP0')
  ensure(raw.steps[0].kind === 'primary' || raw.steps[0].kind === 'cycle-bleeding', 'Invalid body step order')
  const mode = raw.steps[0].kind === 'primary' ? 'action' : 'cycle'
  if (mode === 'action') ensure(raw.energyCost > 0, 'Supported G2 action deaths are paid move/reveal results')
  if (mode === 'cycle') {
    const rest = ctx.policy.catalog.data.nodes.find((n) => n.id === before.site.nodeId)!.rest
    ensure(rest !== null && ctx.location.cycle.rest === rest && before.character.clock.kind === 'active' &&
      before.character.clock.taskDay < deps.residence.configuration.config.limits.days, 'Rest death lacks independent facility qualification')
  }
  if (mode === 'cycle') ensure(raw.energyCost === 0 && same(result.site, before.site) && same(result.carried, before.carried) &&
    same(result.itemStates, before.itemStates), 'Rest death changed non-body state')
  const steps = verifySteps(before.character.body, result.character.body, raw.steps, mode,
    Math.max(0, before.character.body.energy - raw.energyCost), deps.residence)
  return finish(ctx, result, 'death', 'location-death', steps)
}
