import { sameResidenceValue as same } from '../../core/character-cycle/validation'
import { safeAdd } from '../../core/residence-config/validation'
import { assertResidenceLocationPlanCurrent, planResidenceMove, planResidenceSourceReveal, planResidenceItemTransfer } from '../../core/residence-location'
import { planResidenceLocationRest } from '../../core/residence-location/controlled'
import { assertTerminalPlanCurrent, consumeResidenceLocationDeath, planResidenceTerminal } from '../../core/residence-terminal/controlled'
import type { TerminalSnapshot } from '../../core/residence-terminal'
import type { TerminalResidenceSavePolicy } from '../residence-save/terminal-index'
import { terminalActiveContext } from './terminal-context'
import { TerminalResidenceSessionError, type TerminalResidenceSessionCommand } from './terminal-types'

export function proposeTerminalTransition(current: TerminalSnapshot, command: Exclude<TerminalResidenceSessionCommand, { kind: 'launch' }>,
  policy: TerminalResidenceSavePolicy): TerminalSnapshot {
  const ctx = terminalActiveContext(current, policy)
  if (!same(command.binding, ctx.snapshot.site.binding)) throw new TerminalResidenceSessionError('BINDING_MISMATCH', 'Foreign execution')
  if (command.kind === 'deliver' || command.kind === 'withdraw' || command.kind === 'deadline') {
    const plan = planResidenceTerminal(current, command, ctx.terminalAuthority)
    assertTerminalPlanCurrent(current, plan, ctx.terminalAuthority)
    return plan.snapshot
  }
  // Issue terminal authority BEFORE the action, retaining the complete old base.
  const { snapshot, authority, locationDependencies: deps } = ctx
  const plan = command.kind === 'move' ? planResidenceMove(snapshot, command, authority, deps)
    : command.kind === 'reveal' ? planResidenceSourceReveal(snapshot, command, authority, deps)
      : command.kind === 'rest' ? planResidenceLocationRest(snapshot, command, authority, deps)
        : planResidenceItemTransfer(snapshot, command, authority, deps)
  assertResidenceLocationPlanCurrent(snapshot, plan, authority, deps)
  if (plan.coordination === 'death-required') {
    const terminal = consumeResidenceLocationDeath(current, plan, ctx.terminalAuthority)
    assertTerminalPlanCurrent(current, terminal, ctx.terminalAuthority)
    return terminal.snapshot
  }
  const next = plan.snapshot
  if (plan.coordination !== 'stable-local-result' || next.site.pending.kind !== 'none' || next.character.body.condition.currentHealth === 0) {
    throw new TerminalResidenceSessionError('UNSUPPORTED_RESULT', 'Living combat needs a future complete coordinator')
  }
  const before = snapshot.character
  const expectedClock = command.kind === 'rest' && before.clock.kind === 'active'
    ? { ...before.clock, taskDay: safeAdd(before.clock.taskDay, 1) } : before.clock
  if (!same(next.character.identity, before.identity) || !same(next.site.binding, snapshot.site.binding) ||
    next.character.revision !== safeAdd(before.revision, 1) || !same(next.character.clock, expectedClock) ||
    next.character.cycle !== (command.kind === 'rest' ? safeAdd(before.cycle, 1) : before.cycle) ||
    (command.kind === 'rest' && (!same(next.site, snapshot.site) || !same(next.carried, snapshot.carried) || !same(next.itemStates, snapshot.itemStates)))) {
    throw new TerminalResidenceSessionError('PLAN_MISMATCH', 'Local result violated continuity')
  }
  return { ...current, ...next }
}
