import { parseResidence } from '../../core/residence-config/validation'
import { same } from '../../core/residence-terminal/validation'
import type { CombatValue, CombatPlan } from '../../core/residence-combat/types'
import { readCombatResidenceExpectation } from '../residence-save/combat-validation'
import { requireCombatResidencePolicy } from '../residence-save/combat-policy'
import type { CombatResidencePolicy, CombatResidenceExpectation } from '../residence-save/combat-types'
import { combatExpectationSchema } from '../residence-save/combat-schema'
import type { CombatSessionExpectation } from './combat-types'
import type { CombatSessionCommand } from './combat-commands'
import { assertCombatData } from './combat-composition'
import { ResidenceSessionError } from './types'

export function readCombatStartupExpectation(input: unknown, policy: CombatResidencePolicy) {
  assertCombatData(input, 'INVALID_FACTORY_RESULT')
  // R performs its own strict parse inside its known-data error boundary.
  return readCombatResidenceExpectation(input as CombatResidenceExpectation, policy)
}
/** Private orchestration projection of authenticated output or installed current, never cold input. */
export function combatCommittedExpectation(v: CombatValue, initial: CombatSessionExpectation['initial'], policy: CombatResidencePolicy) {
  const { versions } = requireCombatResidencePolicy(policy), b = v.battle, r = v.receipts.at(-1)
  const enemy = b ? v.site!.enemies.find(x => x.id === b.entry.enemyId)! : null
  const death = r?.source === 'combat-death' ? v.combatDeaths.find(x => x.id === r.combatDeathReceiptId)! : null
  const a = death?.entry
  return readCombatResidenceExpectation(parseResidence(combatExpectationSchema, { identity: v.character.identity, phase: v.phase,
    revision: v.character.revision, cycle: v.character.cycle, versions, initial,
    missions: v.missions.map(m => m.status === 'unaccepted' ? { binding: m.binding, status: m.status } :
      m.status === 'active' ? { binding: m.binding, status: m.status, execution: m.execution } :
        { binding: m.binding, status: m.status, execution: m.execution, outcome: m.outcome }),
    battle: b && enemy ? { binding: b.entry.binding, battleId: b.entry.id, entryRevision: b.entry.revision,
      from: b.entry.from, to: b.entry.to, edgeId: b.entry.edgeId, enemyId: b.entry.enemyId,
      enemyInstanceId: b.entry.enemyInstanceId, definitionId: b.entry.definitionId,
      currentCtb: b.currentCtb, playerNext: b.playerNext, enemyNext: b.enemyNext,
      intent: enemy.state.currentIntentActionId, nextCycleIndex: enemy.state.nextCycleIndex,
      actionCount: enemy.state.resolvedActionCount, riskIndex: enemy.riskDrawIndex } : null,
    closure: r ? { binding: r.binding, outcome: r.outcome, source: r.source, revision: r.revision,
      startCycle: r.startCycle, endCycle: r.endCycle, taskDay: r.taskDay,
      combat: a && death ? { battleId: a.id, entryRevision: a.revision, edgeId: a.edgeId, from: a.from, to: a.to,
        enemyId: a.enemyId, enemyInstanceId: a.enemyInstanceId, definitionId: a.definitionId, trace: death.decision.trace } : null } : null,
  }), policy)
}
/** Caller must authenticate the original issued plan before deriving submit facts. */
export function combatNextExpectation(before: CombatValue, plan: CombatPlan, command: CombatSessionCommand,
  initial: CombatSessionExpectation['initial'], policy: CombatResidencePolicy) {
  const next = plan.snapshot, terminal = plan.producer === 'terminal'
  const fail = (): never => { throw new ResidenceSessionError('PLAN_MISMATCH', 'Issued v4 proposal broke complete continuity') }
  if (plan.baseRevision !== before.character.revision || next.character.revision !== before.character.revision + 1 ||
    !same(next.character.identity, before.character.identity) || next.choices.tool !== before.choices.tool ||
    next.choices.specialty !== before.choices.specialty ||
    next.missions.length !== before.missions.length ||
    next.phase !== (terminal ? plan.outcome === 'death' ? 'dead' : 'living-hub' : command.kind === 'depart' ? 'active-world' : before.phase)) fail()
  for (const key of ['receipts', 'dispositions', 'archives', 'origins', 'productions', 'battles', 'combatDeaths'] as const)
    if (!same(next[key].slice(0, before[key].length), before[key])) fail()
  before.missions.forEach((m, i) => {
    const n = next.missions[i]
    if (!same(m.binding, n.binding)) fail()
    if (command.kind === 'depart' && m.binding.mission.commissionId === command.command.commissionId) {
      if (m.status !== 'unaccepted' || n.status !== 'active' || !same(n.execution, initial.execution)) fail()
    } else if (terminal && m.status === 'active') {
      if (n.status !== 'closed' || !same(n.execution, m.execution) || n.outcome !== next.receipts.at(-1)?.outcome) fail()
    } else if (!same(m, n)) fail()
  })
  return combatCommittedExpectation(next, initial, policy)
}
