import { createCombatAuthority } from '../../core/residence-combat/authority'
import { assertCombatPlanCurrent } from '../../core/residence-combat/plans'
import { planCombatDeparture } from '../../core/residence-combat/initial'
import { planCombatMove } from '../../core/residence-combat/entry'
import { resolveResidenceCombatAction } from '../../core/residence-combat/actions'
import { planCombatInventory, planCombatMedical, planCombatMaintenance, planCombatRest,
  planCombatTask, planCombatSource, planCombatTransfer, planCombatTerminal } from '../../core/residence-combat/stable'
import { cycleContext } from '../../core/residence-supply/validation'
import type { CombatDependencies, CombatValue, CombatPlan } from '../../core/residence-combat/types'
import { ResidenceSessionError } from './types'
import type { CombatSessionCommand } from './combat-commands'
import type { CombatMaintenanceResult } from './combat-types'

export function proposeCombatCommand(current: CombatValue, c: CombatSessionCommand, deps: CombatDependencies) {
  if (c.command.expectedRevision !== current.character.revision)
    throw new ResidenceSessionError('STALE_COMMAND', 'Expected current revision')
  if (current.phase !== (c.kind === 'depart' ? 'first-hub' : 'active-world') ||
    (c.kind === 'combat' ? !current.battle : !!current.battle))
    throw new ResidenceSessionError('NOT_AVAILABLE', 'Command not available at this complete stop point')
  if (c.kind === 'combat' && c.command.expectedBattleId !== current.battle!.entry.id)
    throw new ResidenceSessionError('BINDING_MISMATCH', 'Expected actual current battle')
  const authority = createCombatAuthority(current, { cycle: cycleContext(current.character, deps.supply, current.site?.nodeId ?? null),
    missions: current.missions }, deps)
  let plan: CombatPlan, maintenance: CombatMaintenanceResult | null = null
  switch (c.kind) {
    case 'depart': plan = planCombatDeparture(current, c.command, authority); break
    case 'move': plan = planCombatMove(current, c.command, authority); break
    case 'rest': plan = planCombatRest(current, c.command, authority); break
    case 'source': plan = planCombatSource(current, c.command, authority); break
    case 'task': plan = planCombatTask(current, c.command, authority); break
    case 'task-transfer': plan = planCombatTransfer(current, c.command, authority); break
    case 'inventory': plan = planCombatInventory(current, c.command, authority); break
    case 'medical': plan = planCombatMedical(current, c.command, authority); break
    case 'maintenance': {
      const result = planCombatMaintenance(current, c.command, authority)
      plan = result.plan; maintenance = { resourceResult: result.resourceResult, unusedPool: result.unusedPool }; break
    }
    case 'terminal': plan = planCombatTerminal(current, c.command, authority); break
    case 'combat': {
      const { expectedBattleId: _, ...request } = c.command
      // P already consumes a raw death once and returns the complete final plan.
      plan = resolveResidenceCombatAction(current, request, authority); break
    }
  }
  assertCombatPlanCurrent(current, plan, authority)
  const producer = c.kind === 'source' ? 'task' : c.kind === 'task-transfer' ? 'inventory' : c.kind === 'depart' ? 'departure' : c.kind
  if (plan.producer !== producer && !(plan.producer === 'terminal' && plan.outcome === 'death' && plan.snapshot.phase === 'dead'))
    throw new ResidenceSessionError('PLAN_MISMATCH', 'Wrong command producer')
  return { plan, maintenance }
}
