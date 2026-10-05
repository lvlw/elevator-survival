import { ensure } from '../residence-supply/shared-validation'
import { exitEnergyCost } from './history'
import type { CombatDependencies, CombatValue, ClosedBattleReceipt } from './types'
/** Private composition seam, never a separately callable player fee command. */
export function closeSurvivingCombat(value: CombatValue, outcome: 'victory' | 'escaped', deps: CombatDependencies): CombatValue {
  const b = value.battle!, site = value.site!, d = b.decision!
  ensure(value.character.body.condition.currentHealth > 0 && !value.battles.some(r => r.entry.id === b.entry.id), 'Already closed/dead battle')
  const cost = exitEnergyCost(b.currentCtb, deps), energy = value.character.body.energy
  const nodeId = outcome === 'victory' ? b.entry.to : b.entry.from
  const receipt: ClosedBattleReceipt = { entry: b.entry, decision: d, outcome, exitRevision: value.character.revision,
    elapsed: b.currentCtb, requestedEnergy: cost, energyBefore: energy, energyAfter: Math.max(0, energy - cost), nodeId }
  return { ...value, battle: null, battles: [...value.battles, receipt], character: { ...value.character,
    body: { ...value.character.body, energy: receipt.energyAfter } },
    site: { ...site, nodeId, pending: { kind: 'none' },
      facts: site.facts.map(f => outcome === 'victory' && f.id === 'enemy-' + b.entry.enemyId + '-cleared' ? { ...f, value: true } : f) } }
}
