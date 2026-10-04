import { sameResidenceValue } from '../../core/character-cycle/validation'
import { safeAdd } from '../../core/residence-config/validation'
import { assertResidenceLocationPlanCurrent, planResidenceMove, planResidenceSourceReveal, planResidenceItemTransfer } from '../../core/residence-location'
import { planResidenceLocationRest } from '../../core/residence-location/controlled'
import type { ActiveResidenceWorld, ResidenceSavePolicy } from '../residence-save'
import { residenceActiveContext } from '../residence-save/validation'
import { ResidenceSessionError, type ResidenceSessionCommand } from './types'

export function proposeResidenceTransition(current: ActiveResidenceWorld,
  command: Exclude<ResidenceSessionCommand, { kind: 'launch' }>, policy: ResidenceSavePolicy): ActiveResidenceWorld {
  if (!sameResidenceValue(command.binding, current.site.binding)) {
    throw new ResidenceSessionError('BINDING_MISMATCH', 'Command belongs to another execution')
  }
  const ctx = residenceActiveContext(current, policy)
  if (command.kind === 'move') {
    const edge = ctx.dependencies.catalog.data.edges.find((e) => e.id === command.edgeId)
    if (edge && (edge.arrival.healthLoss !== 0 || edge.arrival.exposuresAdded !== 0)) {
      throw new ResidenceSessionError('UNSUPPORTED_RESULT', 'Arrival event coordinator is not supported')
    }
  }
  const plan = command.kind === 'move' ? planResidenceMove(ctx.snapshot, command, ctx.authority, ctx.dependencies)
    : command.kind === 'reveal' ? planResidenceSourceReveal(ctx.snapshot, command, ctx.authority, ctx.dependencies)
      : command.kind === 'rest' ? planResidenceLocationRest(ctx.snapshot, command, ctx.authority, ctx.dependencies)
        : planResidenceItemTransfer(ctx.snapshot, command, ctx.authority, ctx.dependencies)
  assertResidenceLocationPlanCurrent(ctx.snapshot, plan, ctx.authority, ctx.dependencies)
  if (plan.coordination !== 'stable-local-result' || plan.snapshot.site.pending.kind !== 'none' ||
    plan.snapshot.character.body.condition.currentHealth === 0) {
    throw new ResidenceSessionError('UNSUPPORTED_RESULT', 'Combat or terminal result requires a future coordinator')
  }
  const next = plan.snapshot
  const clock = current.character.clock
  const rest = command.kind === 'rest'
  const expectedClock = rest && clock.kind === 'active' ? { ...clock, taskDay: safeAdd(clock.taskDay, 1) } : clock
  if (!sameResidenceValue(next.site.binding, current.site.binding) ||
    !sameResidenceValue(next.character.identity, current.character.identity) ||
    !sameResidenceValue(next.character.clock, expectedClock) ||
    next.character.cycle !== (rest ? safeAdd(current.character.cycle, 1) : current.character.cycle) ||
    next.character.revision !== safeAdd(current.character.revision, 1) ||
    (rest && (!sameResidenceValue(next.site, current.site) || !sameResidenceValue(next.carried, current.carried) ||
      !sameResidenceValue(next.itemStates, current.itemStates)))) {
    throw new ResidenceSessionError('PLAN_MISMATCH', 'Plan changed execution, carry-forward or clock continuity')
  }
  return { phase: 'active-world', ...next, missions: current.missions }
}
