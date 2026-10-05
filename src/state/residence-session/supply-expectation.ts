import { deepFreeze } from '../../core/config'
import { same } from '../../core/residence-terminal/validation'
import { parseResidence } from '../../core/residence-config/validation'
import { supplyExpectationSchema } from '../residence-save/supply-schema'
import { readSupplyResidenceExpectation } from '../residence-save/supply-validation'
import type { SupplyResidenceExpectation, SupplyResidencePolicy } from '../residence-save/supply-types'
import type { SupplyValue, SupplyPlan } from '../../core/residence-supply/types'
import type { SupplySessionCommand } from './supply-commands'
import { ResidenceSessionError } from './types'

export function readSupplyStartupExpectation(input: unknown, policy: SupplyResidencePolicy) {
  return readSupplyResidenceExpectation(parseResidence(supplyExpectationSchema, input), policy)
}
/** Only accepts a plan after caller authenticates it against private current/authority. */
export function supplyNextExpectation(before: SupplyValue, plan: SupplyPlan,
  command: SupplySessionCommand, initial: SupplyResidenceExpectation['initial'], policy: SupplyResidencePolicy) {
  const next = plan.snapshot
  const fail = () => { throw new ResidenceSessionError('PLAN_MISMATCH', 'Issued proposal broke session continuity') }
  const terminal = plan.producer === 'terminal'
  if (next.character.revision !== before.character.revision + 1 || !same(next.character.identity, before.character.identity) ||
    next.missions.length !== before.missions.length || next.choices.tool !== before.choices.tool ||
    next.choices.specialty !== before.choices.specialty ||
    next.phase !== (terminal ? plan.outcome === 'death' ? 'dead' : 'living-hub' : command.kind === 'depart' ? 'active-world' : before.phase)) fail()
  for (const key of ['receipts', 'dispositions', 'archives', 'origins', 'productions'] as const) {
    if (!same(next[key].slice(0, before[key].length), before[key])) fail()
  }
  before.missions.forEach((m, i) => {
    const n = next.missions[i]
    if (!same(m.binding, n.binding)) fail()
    if (command.kind === 'depart' && m.binding.mission.commissionId === command.command.commissionId) {
      if (m.status !== 'unaccepted' || n.status !== 'active' || !same(n.execution, initial.execution)) fail()
    } else if (terminal && m.status === 'active') {
      if (n.status !== 'closed' || !same(n.execution, m.execution) || n.outcome !== next.receipts.at(-1)?.outcome) fail()
    } else if (!same(m, n)) fail()
  })
  return readSupplyResidenceExpectation(deepFreeze({
    identity: before.character.identity, phase: next.phase, revision: before.character.revision + 1,
    cycle: next.character.cycle, initial,
    missions: next.missions.map(m => m.status === 'unaccepted' ? { binding: m.binding, status: m.status } :
      m.status === 'active' ? { binding: m.binding, status: m.status, execution: m.execution } :
        { binding: m.binding, status: m.status, execution: m.execution, outcome: m.outcome }),
  }), policy)
}
