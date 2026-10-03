import { z } from 'zod'
import { deepFreeze } from '../config'
import { restoreMissionCandidate } from '../mission-lifecycle'
import {
  declarationSchema, executionSchema, readExecution, readScope, validateBinding,
} from '../mission-lifecycle/validation'
import { requireResidenceConfig, ResidenceError } from '../residence-config'
import {
  countSchema, idSchema, parseResidence, positiveSchema, safeAdd, safeMultiply,
} from '../residence-config/validation'
import type { CharacterCycleState, CycleAuthority, ResidenceBody, ResidenceDependencies, ResidenceRequestBinding } from './types'

export const identitySchema = z.strictObject({ characterId: idSchema, rulesVersion: idSchema, configurationId: idSchema })
export const requestBindingShape = { identity: identitySchema, expectedRevision: countSchema }
export const activeClockSchema = z.strictObject({
  kind: z.literal('active'), mission: declarationSchema, execution: executionSchema,
  startCycle: positiveSchema, taskDay: positiveSchema,
})
const closureSchema = z.strictObject({
  mission: declarationSchema, execution: executionSchema,
  startCycle: positiveSchema, endCycle: positiveSchema, taskDay: positiveSchema,
  outcome: z.enum(['success', 'voluntary-failure', 'deadline-failure']),
})
const clockSchema = z.discriminatedUnion('kind', [
  activeClockSchema,
  z.strictObject({ kind: z.literal('first-ready') }),
  z.strictObject({ kind: z.literal('return-due'), source: closureSchema }),
  z.strictObject({ kind: z.literal('deadline-ready'), source: closureSchema }),
])
const bodySchema = z.strictObject({
  condition: z.strictObject({
    currentHealth: countSchema, bleeding: z.boolean(), minorContusions: countSchema,
    painkillerActive: z.boolean(), pendingInfectionExposures: countSchema,
    openWounds: z.array(z.strictObject({
      id: idSchema, kind: z.enum(['laceration', 'puncture', 'bite']), treatment: z.enum(['untreated', 'treated']),
    })),
  }),
  energy: countSchema, infectionProgress: countSchema, satiety: countSchema, suppression: countSchema,
  quotasRemaining: z.strictObject({ suppressant: countSchema, disinfectant: countSchema, pipe_signature: countSchema }),
})
const stateSchema = z.strictObject({
  identity: identitySchema, revision: countSchema, cycle: positiveSchema,
  body: bodySchema, clock: clockSchema,
})
const unacceptedSchema = z.strictObject({
  formatVersion: z.literal(1), status: z.literal('unaccepted'),
  binding: z.strictObject({ characterId: idSchema, mission: declarationSchema }),
})
const authoritySchema = z.strictObject({
  identity: identitySchema, revision: countSchema, cycle: positiveSchema,
  stableContext: z.enum(['stable', 'unsettled']),
  rest: z.enum(['A', 'C']).nullable(),
  lifecycle: z.discriminatedUnion('kind', [
    activeClockSchema, z.strictObject({ kind: z.literal('first') }),
    z.strictObject({ kind: z.literal('closed'), source: closureSchema }),
  ]),
  normalReturn: z.enum(['success', 'voluntary-failure']).nullable(),
  departure: z.strictObject({ mission: unacceptedSchema, execution: executionSchema }).nullable(),
})

export const sameResidenceValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)

export function readResidenceBody(input: unknown, dependencies: ResidenceDependencies): ResidenceBody {
  const c = requireResidenceConfig(dependencies.configuration).config
  const body = parseResidence(bodySchema, input)
  const q = body.quotasRemaining
  if (body.condition.currentHealth > c.limits.hp || body.energy > c.limits.energy || body.satiety > c.limits.satiety ||
    q.suppressant > c.quota.suppressant || q.disinfectant > c.quota.disinfectant || q.pipe_signature > c.quota.pipe_signature ||
    body.suppression !== safeMultiply(c.quota.suppressant - q.suppressant, c.health.suppression) ||
    new Set(body.condition.openWounds.map((w) => w.id)).size !== body.condition.openWounds.length) {
    throw new ResidenceError('INVALID_INPUT', 'Body bounds, wounds or actual suppression do not match')
  }
  return deepFreeze(body)
}

export function readCycleContext(
  input: unknown, authorityInput: CycleAuthority, dependencies: ResidenceDependencies,
): Readonly<{ state: CharacterCycleState; authority: CycleAuthority }> {
  const configuration = requireResidenceConfig(dependencies.configuration)
  const rules = parseResidence(idSchema, dependencies.rulesVersion)
  const state = parseResidence(stateSchema, input)
  const authority = parseResidence(authoritySchema, authorityInput)
  if (state.identity.configurationId !== configuration.configurationId || authority.identity.configurationId !== configuration.configurationId) {
    throw new ResidenceError('CONFIGURATION_MISMATCH', 'State configuration binding mismatch')
  }
  if (!sameResidenceValue(state.identity, authority.identity) || state.identity.rulesVersion !== rules) {
    throw new ResidenceError('BINDING_MISMATCH', 'Independent identity mismatch')
  }
  if (state.revision !== authority.revision) throw new ResidenceError('STALE_REVISION', 'Current revision mismatch')
  if (state.cycle !== authority.cycle) throw new ResidenceError('INVALID_CONTEXT', 'Current cycle mismatch')
  const body = readResidenceBody(state.body, dependencies)
  try {
    const scope = readScope(dependencies.scope)
    if (scope.characterId !== state.identity.characterId) throw new ResidenceError('BINDING_MISMATCH', 'Wrong character scope')
    const validate = (fact: z.infer<typeof activeClockSchema> | z.infer<typeof closureSchema>, cycle: number) => {
      const binding = validateBinding({ characterId: state.identity.characterId, mission: fact.mission }, scope)
      readExecution(fact.execution, binding)
      if (fact.mission.rulesVersion !== rules || fact.taskDay > configuration.config.limits.days ||
        safeAdd(fact.startCycle, fact.taskDay - 1) !== cycle) {
        throw new ResidenceError('INVALID_CONTEXT', 'Impossible D/start/T or rules binding')
      }
    }
    const clock = state.clock
    const latest = authority.lifecycle
    if (clock.kind !== 'active' && authority.rest !== null) {
      throw new ResidenceError('INVALID_CONTEXT', 'World rest cannot be authorized outside an active execution')
    }
    if (clock.kind === 'active') {
      validate(clock, state.cycle)
      if (latest.kind !== 'active' || !sameResidenceValue(clock, latest) || authority.departure !== null) {
        throw new ResidenceError('INVALID_CONTEXT', 'Active execution is not independently current')
      }
    } else if (clock.kind === 'first-ready') {
      if (state.cycle !== 1 || latest.kind !== 'first' || authority.normalReturn !== null) {
        throw new ResidenceError('INVALID_CONTEXT', 'First ready requires actual first D1 context')
      }
    } else {
      const source = clock.source
      validate(source, source.endCycle)
      const deadline = clock.kind === 'deadline-ready'
      if (latest.kind !== 'closed' || !sameResidenceValue(source, latest.source) || authority.normalReturn !== null ||
        (deadline ? source.outcome !== 'deadline-failure' || source.taskDay !== configuration.config.limits.days ||
          safeAdd(source.endCycle, 1) !== state.cycle
          : source.outcome === 'deadline-failure' || source.endCycle !== state.cycle)) {
        throw new ResidenceError('INVALID_CONTEXT', 'Missing, stale or contradictory cycle closure source')
      }
    }
    if (authority.departure) {
      const candidate = authority.departure.mission
      restoreMissionCandidate(candidate, { binding: candidate.binding, status: 'unaccepted' }, scope)
      readExecution(authority.departure.execution, candidate.binding)
      if (candidate.binding.mission.rulesVersion !== rules ||
        (latest.kind === 'closed' && (candidate.binding.mission.commissionId === latest.source.mission.commissionId ||
          authority.departure.execution.runId === latest.source.execution.runId))) {
        throw new ResidenceError('INVALID_CONTEXT', 'Departure is not a different declared unaccepted commission/execution')
      }
    }
  } catch (error) {
    if (error instanceof ResidenceError) throw error
    throw new ResidenceError('BINDING_MISMATCH', error instanceof Error ? error.message : 'Invalid mission context')
  }
  return deepFreeze({ state: { ...state, body }, authority })
}

export function validateResidenceRequest(state: CharacterCycleState, request: ResidenceRequestBinding): void {
  if (!sameResidenceValue(state.identity, request.identity)) throw new ResidenceError('BINDING_MISMATCH', 'Request identity mismatch')
  if (request.expectedRevision !== state.revision) throw new ResidenceError('STALE_REVISION', 'Request revision is stale')
}
