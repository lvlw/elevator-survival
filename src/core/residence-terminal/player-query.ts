import { deepFreeze } from '../config'
import { sharedTerminalEligibility } from './supply-settlement-shared'
import type { CombatValue } from '../residence-combat/types'
import type { SupplyDependencies } from '../residence-supply/types'

export function playerTerminalFacts(v: CombatValue, deps: SupplyDependencies) {
  const receipt = v.receipts.at(-1)
  return deepFreeze({ eligibility: v.battle ? { deliver: false, withdraw: false, deadline: false } : sharedTerminalEligibility(v, deps),
    result: !receipt || v.phase === 'active-world' || v.phase === 'first-hub' ? null : {
      outcome: receipt.outcome, reward: receipt.reward, penalty: receipt.penalty, forfeited: receipt.forfeited, balance: v.balance,
      taskDay: receipt.taskDay,
      items: v.dispositions.filter(d => receipt.dispositionIds.includes(d.id)).map(d => ({
        name: deps.catalog.physical.get(d.item.definitionId).name, quantity: d.item.quantity, disposition: d.kind })) },
    successors: v.phase === 'living-hub' ? { kind: 'no-content' as const, choices: [] } : null })
}
