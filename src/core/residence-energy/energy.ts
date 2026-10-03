import { deepFreeze } from '../config'
import { planActionBodyConsequences } from '../character-cycle/cycle'
import { readCycleContext, sameResidenceValue, validateResidenceRequest } from '../character-cycle/validation'
import type { CharacterCycleState, CycleAuthority, ResidenceDependencies } from '../character-cycle'
import { ResidenceError } from '../residence-config'
import { parseResidence, safeAdd } from '../residence-config/validation'
import { calculateResidenceActionCost, createResidenceActionRequest, createResidenceQueryRequest, providedSchema, triggeredRequestSchema, triggerSchema } from './validation'
import type { ResidenceActionPlan, ResidenceEffectProvider, ResidenceQueryRequest, ResidenceTrigger } from './types'

function checkStart(input: unknown, request: ResidenceQueryRequest, authorityInput: CycleAuthority, dependencies: ResidenceDependencies) {
  const { state, authority } = readCycleContext(input, authorityInput, dependencies)
  validateResidenceRequest(state, request)
  if (state.body.condition.currentHealth === 0) throw new ResidenceError('CHARACTER_DEAD', 'Dead character cannot start an action')
  if (authority.stableContext !== 'stable') throw new ResidenceError('INVALID_CONTEXT', 'A new action requires a stable boundary')
  const cost = calculateResidenceActionCost(request.cost)
  const canStart = request.cost.kind === 'free' || (state.clock.kind === 'active' && state.body.energy > 0)
  return { state, cost, canStart }
}

/** This query grants energy eligibility only, never target/resource/placement eligibility. */
export function queryResidenceAction(input: unknown, requestInput: unknown, authority: CycleAuthority, dependencies: ResidenceDependencies) {
  const request = createResidenceQueryRequest(requestInput)
  const { state, cost, canStart } = checkStart(input, request, authority, dependencies)
  return deepFreeze({ canStart, cost, energyBefore: state.body.energy,
    energyAfter: canStart ? Math.max(0, state.body.energy - cost) : state.body.energy })
}

function finish(state: CharacterCycleState, revision: number, cost: number, result: ReturnType<typeof planActionBodyConsequences>): ResidenceActionPlan {
  return deepFreeze({ base: { identity: state.identity, revision: state.revision }, snapshot: { ...state, revision, body: result.body },
    cost, steps: result.steps, outcome: result.deathCause ? 'death' : 'alive', deathCause: result.deathCause })
}

export function planResidenceAction(
  input: unknown, requestInput: unknown, authority: CycleAuthority, dependencies: ResidenceDependencies, provide: ResidenceEffectProvider,
): ResidenceActionPlan {
  // Execution has its own strict boundary: view never reaches a provider or a plan.
  const request = createResidenceActionRequest(requestInput)
  const { state, cost, canStart } = checkStart(input, request, authority, dependencies)
  if (!canStart) throw new ResidenceError('ACTION_NOT_AVAILABLE', 'Positive energy and an active execution are required')
  const revision = safeAdd(state.revision, 1)
  if (typeof provide !== 'function') throw new ResidenceError('INVALID_INPUT', 'A controlled consequence provider is required')
  const energy = Math.max(0, state.body.energy - cost)
  const completion = deepFreeze({ identity: state.identity, revision: state.revision,
    execution: state.clock.kind === 'active' ? state.clock.execution : null, request,
    energyBefore: state.body.energy, energyAfter: energy })
  const provided = parseResidence(providedSchema, provide(completion))
  if (!sameResidenceValue(provided.completion, completion)) throw new ResidenceError('PLAN_MISMATCH', 'Consequences belong to a different command/state/execution')
  const result = planActionBodyConsequences({ ...state.body, energy }, provided.effects, request.cost.kind === 'paid', dependencies)
  return finish(state, revision, cost, result)
}

export function planTriggeredResidenceConsequence(
  input: unknown, requestInput: unknown, authorityInput: CycleAuthority, triggerInput: ResidenceTrigger, dependencies: ResidenceDependencies,
): ResidenceActionPlan {
  const { state, authority } = readCycleContext(input, authorityInput, dependencies)
  const request = parseResidence(triggeredRequestSchema, requestInput)
  const trigger = parseResidence(triggerSchema, triggerInput)
  validateResidenceRequest(state, request)
  if (state.clock.kind !== 'active' || authority.stableContext !== 'unsettled') {
    throw new ResidenceError('INVALID_CONTEXT', 'Triggered consequences require the independently unsettled execution')
  }
  if (state.body.condition.currentHealth === 0) throw new ResidenceError('CHARACTER_DEAD', 'No consequence can resume a dead character')
  if (!sameResidenceValue(trigger.identity, state.identity) || !sameResidenceValue(trigger.execution, state.clock.execution) ||
    trigger.revision !== state.revision || trigger.triggerId !== request.triggerId) {
    throw new ResidenceError('PLAN_MISMATCH', 'Trigger is not bound to the current execution/revision')
  }
  const revision = safeAdd(state.revision, 1)
  const result = planActionBodyConsequences(state.body, trigger.effects, trigger.kind !== 'immediate-result', dependencies)
  return finish(state, revision, 0, result)
}
