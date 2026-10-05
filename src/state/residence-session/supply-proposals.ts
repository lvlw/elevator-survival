import { createSupplyAuthority } from '../../core/residence-supply/authority'
import { cycleContext } from '../../core/residence-supply/validation'
import { assertSupplyPlanCurrent } from '../../core/residence-supply/plans'
import { planSupplyDeparture } from '../../core/residence-supply/initial'
import { planSupplyMove, planSupplyRest } from '../../core/residence-supply/controlled'
import { planSupplyInventory } from '../../core/residence-supply/inventory'
import { planSupplyMedical } from '../../core/residence-supply/medical'
import { planSupplyMaintenance } from '../../core/residence-supply/maintenance'
import { planSupplyTaskAction, planSupplySourceReveal, planSupplyTaskTransfer } from '../../core/residence-task/controlled'
import { planSupplyTerminal, consumeSupplyDeath } from '../../core/residence-terminal/supply-controlled'
import type { SupplyDependencies, SupplyValue, SupplyPlan } from '../../core/residence-supply/types'
import { ResidenceSessionError } from './types'
import type { SupplySessionCommand } from './supply-commands'
import type { SupplyMaintenanceResult } from './supply-types'

export function proposeSupplyCommand(current: SupplyValue, c: SupplySessionCommand, deps: SupplyDependencies) {
  if (c.command.expectedRevision !== current.character.revision)
    throw new ResidenceSessionError('STALE_COMMAND', 'Expected current revision')
  if (current.phase !== (c.kind === 'depart' ? 'first-hub' : 'active-world'))
    throw new ResidenceSessionError('NOT_AVAILABLE', 'Command not available in current phase')
  const authority = createSupplyAuthority(current, {
    cycle: cycleContext(current.character, deps, current.site?.nodeId ?? null), missions: current.missions,
  }, deps)
  let plan: SupplyPlan, maintenance: SupplyMaintenanceResult | null = null
  switch (c.kind) {
    case 'depart': plan = planSupplyDeparture(current, c.command, authority); break
    case 'move': plan = planSupplyMove(current, c.command, authority); break
    case 'rest': plan = planSupplyRest(current, c.command, authority); break
    case 'source': plan = planSupplySourceReveal(current, c.command, authority); break
    case 'task': plan = planSupplyTaskAction(current, c.command, authority); break
    case 'task-transfer': plan = planSupplyTaskTransfer(current, c.command, authority); break
    case 'inventory': plan = planSupplyInventory(current, c.command, authority); break
    case 'medical': plan = planSupplyMedical(current, c.command, authority); break
    case 'maintenance': {
      const result = planSupplyMaintenance(current, c.command, authority)
      plan = result.plan; maintenance = { resourceResult: result.resourceResult, unusedPool: result.unusedPool }; break
    }
    case 'terminal': plan = planSupplyTerminal(current, c.command, authority); break
  }
  assertSupplyPlanCurrent(current, plan, authority)
  const producer = c.kind === 'source' ? 'task' : c.kind === 'task-transfer' ? 'inventory' : c.kind === 'depart' ? 'departure' : c.kind
  if (plan.producer !== producer) throw new ResidenceSessionError('PLAN_MISMATCH', 'Wrong command producer')
  if (plan.outcome === 'death' && plan.producer !== 'terminal') {
    plan = consumeSupplyDeath(current, plan, authority)
    assertSupplyPlanCurrent(current, plan, authority)
  }
  return { plan, maintenance }
}
