import { z } from 'zod'
import { deepFreeze } from '../config'
import { ResidenceError, requireResidenceConfig } from '../residence-config'
import { countSchema, idSchema, parseResidence, safeAdd, safeMultiply } from '../residence-config/validation'
import { readCycleContext, readResidenceBody, requestBindingShape, validateResidenceRequest } from './validation'
import type { BodyStep, CharacterCycleState, CycleAuthority, CycleClosure, CyclePlan, CycleRequest, ResidenceBody, ResidenceDependencies } from './types'

const requestSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...requestBindingShape, kind: z.literal('rest'), rest: z.enum(['A', 'C']) }),
  z.strictObject({ ...requestBindingShape, kind: z.literal('normal-return') }),
  z.strictObject({ ...requestBindingShape, kind: z.literal('deadline') }),
  z.strictObject({ ...requestBindingShape, kind: z.literal('depart'), commissionId: idSchema }),
])
export function createCycleRequest(input: unknown): CycleRequest {
  return deepFreeze(parseResidence(requestSchema, input))
}

type BodyResult = Readonly<{ body: ResidenceBody; steps: readonly BodyStep[]; deathCause: BodyStep['kind'] | null }>
const primarySchema = z.strictObject({ healthLoss: countSchema, exposuresAdded: countSchema })

/** Narrow consequence composition; eligibility and completion provenance belong to
 * the energy entry/coordinator. This function never spends energy or revisions. */
export function planActionBodyConsequences(
  input: unknown, effects: unknown, bleedingQualified: boolean, dependencies: ResidenceDependencies,
): BodyResult {
  const body = readResidenceBody(input, dependencies)
  const primary = parseResidence(primarySchema, effects)
  const qualified = parseResidence(z.boolean(), bleedingQualified)
  const exposure = safeAdd(body.condition.pendingInfectionExposures, primary.exposuresAdded)
  const before = body.condition.currentHealth
  const after = Math.max(0, before - primary.healthLoss)
  const steps: BodyStep[] = [{ kind: 'primary', healthBefore: before, healthAfter: after,
    facts: { healthLoss: before - after, exposuresAdded: primary.exposuresAdded } }]
  let condition = { ...body.condition, currentHealth: after, pendingInfectionExposures: exposure }
  let deathCause: BodyStep['kind'] | null = after === 0 ? 'primary' : null
  if (after > 0 && qualified && condition.bleeding) {
    const hp = Math.max(0, after - dependencies.configuration.config.health.bleed_action)
    steps.push({ kind: 'action-bleeding', healthBefore: after, healthAfter: hp, facts: { damage: after - hp } })
    condition = { ...condition, currentHealth: hp }
    if (hp === 0) deathCause = 'action-bleeding'
  }
  return deepFreeze({ body: { ...body, condition }, steps, deathCause })
}

function settleBody(body: ResidenceBody, energy: number, dependencies: ResidenceDependencies): BodyResult {
  const c = requireResidenceConfig(dependencies.configuration).config
  // Preflight all arithmetic, including segments that a legitimate death may skip.
  const base = c.health.infection_stages.filter((r) => body.infectionProgress >= r.min).at(-1)!.base
  const gross = safeAdd(base, safeMultiply(body.condition.pendingInfectionExposures, c.health.exposure_progress))
  const progress = safeAdd(body.infectionProgress, Math.max(0, gross - body.suppression))
  const infectionDamage = c.health.infection_damage.filter((r) => progress >= r.min).at(-1)!.hp
  const steps: BodyStep[] = []
  let next = body
  const damage = (kind: BodyStep['kind'], amount: number, facts: BodyStep['facts']) => {
    const before = next.condition.currentHealth
    const after = Math.max(0, before - amount)
    next = { ...next, condition: { ...next.condition, currentHealth: after } }
    steps.push({ kind, healthBefore: before, healthAfter: after, facts: { ...facts, damage: before - after } })
    return after === 0
  }
  const done = (deathCause: BodyStep['kind'] | null): BodyResult => deepFreeze({ body: next, steps, deathCause })
  if (damage('cycle-bleeding', body.condition.bleeding ? c.health.bleed_night : 0, {})) return done('cycle-bleeding')
  next = { ...next, infectionProgress: progress, condition: { ...next.condition, pendingInfectionExposures: 0 } }
  if (damage('infection', infectionDamage, { progressBefore: body.infectionProgress, progressAfter: progress,
    exposuresConverted: body.condition.pendingInfectionExposures, suppression: body.suppression })) return done('infection')
  const satiety = Math.max(0, body.satiety - c.health.night_food)
  next = { ...next, satiety }
  if (damage('hunger', satiety <= c.health.starve_threshold ? c.health.starve_damage : 0,
    { satietyBefore: body.satiety, satietyAfter: satiety })) return done('hunger')
  next = { ...next, energy, suppression: 0, quotasRemaining: { ...c.quota },
    condition: { ...next.condition, painkillerActive: false } }
  steps.push({ kind: 'end-cycle', healthBefore: next.condition.currentHealth, healthAfter: next.condition.currentHealth,
    facts: { energyBefore: body.energy, energyAfter: energy } })
  return done(null)
}

export function queryCycleDeparture(input: unknown, authority: CycleAuthority, dependencies: ResidenceDependencies): 'available' | 'no-content' {
  const checked = readCycleContext(input, authority, dependencies)
  if (checked.state.body.condition.currentHealth === 0) throw new ResidenceError('CHARACTER_DEAD', 'Dead character cannot depart')
  if (checked.state.clock.kind === 'active' || checked.authority.stableContext !== 'stable') {
    throw new ResidenceError('INVALID_CONTEXT', 'Departure requires a stable returned/first boundary')
  }
  return checked.authority.departure ? 'available' : 'no-content'
}

export function planCharacterCycle(
  input: unknown, requestInput: unknown, authorityInput: CycleAuthority, dependencies: ResidenceDependencies,
): CyclePlan {
  const { state, authority } = readCycleContext(input, authorityInput, dependencies)
  const request = createCycleRequest(requestInput)
  validateResidenceRequest(state, request)
  if (state.body.condition.currentHealth === 0) throw new ResidenceError('CHARACTER_DEAD', 'Dead character cannot start a cycle')
  if (authority.stableContext !== 'stable') throw new ResidenceError('INVALID_CONTEXT', 'Unsettled consequences remain')
  const revision = safeAdd(state.revision, 1)
  const c = dependencies.configuration.config
  let next: CharacterCycleState = { ...state, revision }
  let result: BodyResult = { body: state.body, steps: [], deathCause: null }
  let requiresDeadlineClosure: CycleClosure | null = null
  const clock = state.clock
  if (request.kind === 'depart') {
    if (clock.kind === 'active') throw new ResidenceError('INVALID_CONTEXT', 'An execution is already active')
    const departure = authority.departure
    if (!departure) throw new ResidenceError('NO_AVAILABLE_COMMISSION', 'No real commission is available')
    if (request.commissionId !== departure.mission.binding.mission.commissionId) {
      throw new ResidenceError('BINDING_MISMATCH', 'Requested commission is not the controlled candidate')
    }
    const cycle = clock.kind === 'return-due' ? safeAdd(state.cycle, 1) : state.cycle
    if (clock.kind === 'return-due') result = settleBody(state.body, c.rest.A, dependencies)
    if (!result.deathCause) next = { ...next, cycle, clock: { kind: 'active',
      mission: departure.mission.binding.mission, execution: departure.execution, startCycle: cycle, taskDay: 1 } }
  } else {
    if (clock.kind !== 'active') throw new ResidenceError('INVALID_CONTEXT', 'Requires the current active execution')
    if (request.kind === 'normal-return') {
      if (!authority.normalReturn) throw new ResidenceError('INVALID_CONTEXT', 'Missing independently established normal return')
      next = { ...next, clock: { kind: 'return-due', source: { mission: clock.mission, execution: clock.execution,
        startCycle: clock.startCycle, endCycle: state.cycle, taskDay: clock.taskDay, outcome: authority.normalReturn } } }
    } else {
      if (authority.normalReturn !== null) throw new ResidenceError('INVALID_CONTEXT', 'Normal return cannot also rest or expire')
      const deadline = request.kind === 'deadline'
      if (request.kind === 'rest' && authority.rest !== request.rest) {
        throw new ResidenceError('INVALID_CONTEXT', 'Rest type is not independently available at the current boundary')
      }
      if (deadline ? clock.taskDay !== c.limits.days : clock.taskDay >= c.limits.days) {
        throw new ResidenceError('INVALID_CONTEXT', 'Wrong task day for cycle mode')
      }
      const cycle = safeAdd(state.cycle, 1)
      result = settleBody(state.body, deadline ? c.rest.A : c.rest[request.rest], dependencies)
      if (!result.deathCause) {
        if (deadline) {
          requiresDeadlineClosure = { mission: clock.mission, execution: clock.execution, startCycle: clock.startCycle,
            endCycle: state.cycle, taskDay: clock.taskDay, outcome: 'deadline-failure' }
          next = { ...next, cycle, clock: { kind: 'deadline-ready', source: requiresDeadlineClosure } }
        } else next = { ...next, cycle, clock: { ...clock, taskDay: safeAdd(clock.taskDay, 1) } }
      }
    }
  }
  return deepFreeze({ base: { identity: state.identity, revision: state.revision }, snapshot: { ...next, body: result.body },
    steps: result.steps, outcome: result.deathCause ? 'death' : 'alive', deathCause: result.deathCause, requiresDeadlineClosure })
}
