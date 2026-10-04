import { z } from 'zod'
import { deepFreeze } from '../config'
import { readCycleContext, type BodyStep, type CharacterCycleState, type CyclePlan, type ResidenceBody, type ResidenceDependencies } from '../character-cycle'
import { identitySchema } from '../character-cycle/validation'
import { countSchema, parseResidence, safeAdd } from '../residence-config/validation'
import { declarationSchema, executionSchema } from '../mission-lifecycle/validation'
import { locationBindingSchema } from '../residence-location/identity'
import { TerminalError, type TerminalAuthority, type TerminalPlan, type TerminalSnapshot } from './types'
import { ensure, same, stepSchema } from './validation'
import { readAuthorized } from './authority'

const closureSchema = z.strictObject({ mission: declarationSchema, execution: executionSchema, startCycle: countSchema,
  endCycle: countSchema, taskDay: countSchema, outcome: z.enum(['success', 'voluntary-failure', 'deadline-failure']) })
const cyclePlanSchema = z.strictObject({ base: z.strictObject({ identity: identitySchema, revision: countSchema }),
  snapshot: z.custom<CharacterCycleState>(), steps: z.array(stepSchema), outcome: z.enum(['alive', 'death']),
  deathCause: stepSchema.shape.kind.nullable(), requiresDeadlineClosure: closureSchema.nullable() })
export const terminalCommandSchema = z.strictObject({ kind: z.enum(['deliver', 'withdraw', 'deadline']),
  binding: locationBindingSchema, expectedRevision: countSchema })

/** Validate the producer's actual trace and unchanged fields, not a second damage calculator. */
export function verifySteps(before: ResidenceBody, after: ResidenceBody, input: unknown,
  mode: 'action' | 'cycle', energyAfter: number, deps: ResidenceDependencies): readonly BodyStep[] {
  const steps = parseResidence(z.array(stepSchema).min(1), input)
  const kinds = mode === 'action' ? ['primary', 'action-bleeding'] : ['cycle-bleeding', 'infection', 'hunger', 'end-cycle']
  ensure(steps.length <= kinds.length && steps.every((s, i) => s.kind === kinds[i]), 'Invalid body step order')
  let expected = structuredClone(before)
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    ensure(s.healthBefore === expected.condition.currentHealth && s.healthBefore > 0 && s.healthAfter <= s.healthBefore, 'Broken HP checkpoint chain')
    const damage = s.healthBefore - s.healthAfter
    const facts = s.facts
    const exact = (keys: readonly string[]) => ensure(same(Object.keys(facts).sort(), [...keys].sort()), 'Invalid step fact fields')
    if (s.kind === 'primary') {
      exact(['healthLoss', 'exposuresAdded'])
      ensure(facts.healthLoss === damage && typeof facts.exposuresAdded === 'number', 'Invalid primary facts')
      expected = { ...expected, condition: { ...expected.condition,
        pendingInfectionExposures: safeAdd(expected.condition.pendingInfectionExposures, facts.exposuresAdded) } }
    } else if (s.kind === 'infection') {
      exact(['progressBefore', 'progressAfter', 'exposuresConverted', 'suppression', 'damage'])
      ensure(facts.progressBefore === before.infectionProgress && facts.exposuresConverted === before.condition.pendingInfectionExposures &&
        facts.suppression === before.suppression && typeof facts.progressAfter === 'number' && facts.progressAfter >= before.infectionProgress && facts.damage === damage, 'Invalid infection trace')
      expected = { ...expected, infectionProgress: facts.progressAfter, condition: { ...expected.condition, pendingInfectionExposures: 0 } }
    } else if (s.kind === 'hunger') {
      exact(['satietyBefore', 'satietyAfter', 'damage'])
      ensure(facts.satietyBefore === before.satiety && typeof facts.satietyAfter === 'number' && facts.satietyAfter <= before.satiety && facts.damage === damage, 'Invalid hunger trace')
      expected = { ...expected, satiety: facts.satietyAfter }
    } else if (s.kind === 'end-cycle') {
      exact(['energyBefore', 'energyAfter'])
      ensure(facts.energyBefore === before.energy && facts.energyAfter === energyAfter && damage === 0, 'Invalid cycle reset trace')
      expected = { ...expected, energy: energyAfter, suppression: 0, quotasRemaining: { ...deps.configuration.config.quota },
        condition: { ...expected.condition, painkillerActive: false } }
    } else {
      exact(['damage']); ensure(facts.damage === damage, 'Invalid bleeding trace')
      if (s.kind === 'action-bleeding') ensure(before.condition.bleeding, 'Unqualified action bleeding')
      if (s.kind === 'cycle-bleeding' && !before.condition.bleeding) ensure(damage === 0, 'Unqualified cycle bleeding')
    }
    expected = { ...expected, condition: { ...expected.condition, currentHealth: s.healthAfter } }
    ensure(s.healthAfter > 0 || i === steps.length - 1, 'Steps continued after death')
  }
  if (mode === 'action') expected = { ...expected, energy: energyAfter }
  if (after.condition.currentHealth > 0) ensure(mode === 'action' ? steps.length === (before.condition.bleeding ? 2 : 1) : steps.length === 4, 'Missing living checkpoint')
  else ensure(steps.at(-1)!.kind !== 'end-cycle', 'Death cannot execute cycle reset')
  ensure(same(expected, after), 'Body result changed unowned fields or disagrees with actual trace')
  return deepFreeze(steps)
}

export function verifyCycleResult(input: unknown, before: CharacterCycleState, kind: 'normal-return' | 'deadline',
  outcome: 'success' | 'voluntary-failure' | 'deadline-failure', deps: ResidenceDependencies): CyclePlan {
  const p = parseResidence(cyclePlanSchema, input)
  ensure(before.clock.kind === 'active', 'Missing active clock')
  ensure(same(p.base, { identity: before.identity, revision: before.revision }), 'Cycle result is not from complete bound current')
  const clock = before.clock
  const source = { mission: clock.mission, execution: clock.execution, startCycle: clock.startCycle,
    endCycle: before.cycle, taskDay: clock.taskDay, outcome }
  const dead = p.outcome === 'death'
  const expectedClock = kind === 'normal-return' ? { kind: 'return-due' as const, source }
    : dead ? clock : { kind: 'deadline-ready' as const, source }
  const expectedCycle = kind === 'deadline' && !dead ? safeAdd(before.cycle, 1) : before.cycle
  const after = readCycleContext(p.snapshot, { identity: before.identity, revision: safeAdd(before.revision, 1), cycle: expectedCycle,
    lifecycle: expectedClock.kind === 'active' ? expectedClock : { kind: 'closed', source },
    stableContext: 'stable', rest: null, normalReturn: null, departure: null }, deps).state
  ensure(same(after.clock, expectedClock), 'Wrong cycle closure or active clock')
  if (kind === 'normal-return') {
    ensure(p.steps.length === 0 && !dead && p.deathCause === null && p.requiresDeadlineClosure === null && same(before.body, after.body),
      'Normal H0 return must preserve body and real empty steps')
  } else {
    verifySteps(before.body, after.body, p.steps, 'cycle', deps.configuration.config.rest.A, deps)
    ensure(dead === (after.body.condition.currentHealth === 0) && p.deathCause === (dead ? p.steps.at(-1)!.kind : null) &&
      same(p.requiresDeadlineClosure, dead ? null : source), 'Deadline outcome/source mismatch')
  }
  return deepFreeze({ ...p, snapshot: after })
}

const plans = new WeakMap<object, string>()
export function issueTerminalPlan(before: TerminalSnapshot, snapshot: TerminalSnapshot): TerminalPlan {
  ensure(before.site, 'Missing plan base')
  const plan = deepFreeze({ kind: 'residence-terminal-plan' as const,
    base: { binding: before.site.binding, revision: before.character.revision }, snapshot })
  plans.set(plan, JSON.stringify(before))
  return plan
}
export function assertTerminalPlanCurrent(input: unknown, plan: TerminalPlan, authority: TerminalAuthority): void {
  const { value } = readAuthorized(input, authority)
  if (!plan || plans.get(plan) !== JSON.stringify(value)) throw new TerminalError('UNISSUED_PLAN', 'Unissued or stale complete terminal plan')
}
