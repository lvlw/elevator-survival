import { createStreamId } from '../random'
import { same } from '../residence-terminal/validation'
import { ensure } from '../residence-supply/shared-validation'
import { numberValue } from '../residence-supply/config'
import { verifyCombatBodyTrace } from './trace'
import type { CombatDependencies, CombatValue, EntryWitness, DecisionWitness } from './types'
export function exitEnergyCost(elapsed: number, deps: CombatDependencies): number {
  ensure(Number.isSafeInteger(elapsed) && elapsed >= 0, 'Invalid elapsed CTB')
  const c = deps.supply.configuration
  return Math.max(numberValue(c, 'combat.minimum'), Math.ceil(elapsed / numberValue(c, 'combat.ctb_step')) * numberValue(c, 'combat.energy_step'))
}
function verifyEntry(e: EntryWitness, v: CombatValue, deps: CombatDependencies) {
  const cat = deps.supply.catalogs.find(c => c.data.id === e.binding.catalogId)
  ensure(cat && cat.data.version === e.binding.catalogVersion && same(e.binding.identity, v.character.identity) &&
    v.missions.some(m => m.status !== 'unaccepted' && same(m.execution, e.binding.execution) && same(m.binding.mission, e.binding.mission)),
    'Entry execution/catalog differs')
  const edge = cat.data.edges.find(x => x.id === e.edgeId), enemy = cat.data.enemies.find(x => x.id === e.enemyId)
  ensure(edge?.from === e.from && edge.to === e.to && enemy?.nodeId === e.to &&
    enemy.definition.id === e.definitionId && e.enemyInstanceId === e.enemyId &&
    e.revision === e.baseRevision + 1 && e.revision <= v.character.revision &&
    e.id === createStreamId('residence-battle-v1', e.binding.execution.runId, String(e.revision), e.enemyInstanceId),
    'Invalid entry identity or route')
  ensure(e.enemyHealth <= enemy.definition.maxHealth && (e.previouslyEncountered || e.actionCount === 0 && e.riskIndex === 0), 'False first entry')
  if (!e.previouslyEncountered) ensure(e.enemyHealth === enemy.definition.maxHealth &&
    e.intent === enemy.definition.initialIntentActionId &&
    e.nextCycleIndex === (enemy.definition.actionCycle.indexOf(e.intent) + 1) % enemy.definition.actionCycle.length, 'Reset/fabricated first enemy')
  let hp = e.healthBefore
  ensure(hp <= deps.supply.residence.configuration.config.limits.hp, 'Invalid entry original HP')
  for (const [i, s] of e.steps.entries()) {
    ensure(s.kind === (i === 0 ? 'primary' : 'action-bleeding') && i < 2 && s.healthBefore === hp && hp > 0 && s.healthAfter <= hp,
      'Invalid entry body chain')
    hp = s.healthAfter
  }
  ensure(hp === e.healthAfter, 'Entry health result differs')
}
function verifyDecision(d: DecisionWitness, e: EntryWitness, v: CombatValue, deps: CombatDependencies, dead = false) {
  ensure(d.battleId === e.id && d.revision === d.baseRevision + 1 && d.baseRevision >= e.revision &&
    d.revision <= v.character.revision && d.ctbAfter >= d.ctbBefore && d.enemyHealthAfter <= d.enemyHealthBefore &&
    d.enemyHealthBefore <= deps.profiles.find(p => p.definitionId === e.definitionId)!.maxHealth &&
    d.actionCountAfter >= d.actionCountBefore && d.riskAfter >= d.riskBefore &&
    d.quotaAfter <= d.quotaBefore && d.quotaBefore <= deps.supply.residence.configuration.config.quota.pipe_signature,
    'Decision binding/monotonic facts differ')
  verifyCombatBodyTrace(d.trace, d.healthBefore, d.healthAfter, deps.supply.residence.configuration.config.limits.hp, dead)
  let queue = d.queue[0]
  if (queue) {
    ensure(queue.currentBefore === d.ctbBefore && queue.playerBefore === d.ctbBefore &&
      ['player-action-scheduled','escape-preparation-scheduled'].includes(queue.reason), 'Queue original differs')
    for (const next of d.queue.slice(1)) {
      ensure(next.currentBefore === queue.currentAfter && next.playerBefore === queue.playerAfter &&
        next.enemyBefore === queue.enemyAfter, 'Queue adjacency differs')
      queue = next
    }
    ensure(queue.currentAfter === d.ctbAfter && queue.playerAfter === d.playerNext && queue.enemyAfter === d.enemyNext,
      'Queue final differs')
  } else ensure(d.ctbAfter === d.ctbBefore && (dead || d.enemyHealthAfter === 0), 'Missing queue evidence')
  const profile = deps.profiles.find(p => p.definitionId === e.definitionId)!
  const cycle = deps.supply.catalog.enemies.get(e.definitionId).actionCycle
  let expectedRisk = 0
  for (let n = d.actionCountBefore; n < d.actionCountAfter; n++) {
    const action = profile.actions.find(a => a.actionId === cycle[n % cycle.length])!
    expectedRisk += action.exposureRiskTier === 'none' ? 1 : 2
  }
  ensure(d.riskAfter - d.riskBefore === expectedRisk && d.enemyResponses === d.actionCountAfter - d.actionCountBefore +
    (d.trace.some(t => t.kind === 'direct-damage' && t.healthAfter === 0) ? 1 : 0), 'Enemy response/risk count differs')
  for (const r of d.resources) ensure(r.consumed === Math.min(r.before, r.requested) && r.after === r.before - r.consumed, 'Resource trace differs')
  for (const r of d.resources) ensure(v.lineage.some(l => l.instanceId === r.instanceId) &&
    [v.carried.equipment.weapon, v.carried.equipment.armor, ...v.dispositions.map(d => d.item)].some(i => i?.instanceId === r.instanceId &&
      ['weapon_metal_pipe', 'armor_heavy_coat'].includes(i.definitionId)), 'Resource has no real instance reference')
  ensure(d.quotaAfter === d.quotaBefore - (d.command.kind === 'metal-pipe-charged-strike' ? 1 : 0), 'Quota command differs')
  ensure(d.uses.length === (d.command.kind === 'use-quick-slot-item' ? 1 : 0), 'Consumption command differs')
  for (const u of d.uses) ensure(new Set(u.dispositionIds).size === u.dispositionIds.length &&
    d.command.kind === 'use-quick-slot-item' && u.slot === d.command.quickSlotIndex &&
    u.definitionId === deps.supply.tasks.data.items.find(i => i.alias === u.kind)!.id &&
    u.dispositionIds.reduce((n, id) => n + (v.dispositions.find(x => x.id === id)?.item.quantity ?? 0), 0) === 1 &&
    u.dispositionIds.every(id => v.dispositions.some(x => x.id === id && x.reason === 'medical' &&
    x.item.instanceId === u.instanceId && x.item.definitionId === u.definitionId && x.revision === d.baseRevision &&
    same(x.binding, e.binding))), 'Wrong consumption reference')
}
export function verifyCombatHistory(v: CombatValue, deps: CombatDependencies) {
  const entries = [...v.battles.map(r => r.entry), ...v.combatDeaths.map(r => r.entry), ...(v.battle ? [v.battle.entry] : [])]
  ensure(new Set(entries.map(e => e.id)).size === entries.length, 'Battle replay')
  for (const e of entries) verifyEntry(e, v, deps)
  const previous = new Map<string, CombatValue['battles'][number]>()
  for (const e of [...entries].sort((a,b) => a.revision-b.revision)) {
    const key = e.binding.execution.runId + ':' + e.enemyId, old = previous.get(key)
    ensure(!old ? !e.previouslyEncountered : e.previouslyEncountered &&
      old.outcome === 'escaped' && old.exitRevision < e.revision &&
      old.decision.enemyHealthAfter === e.enemyHealth && old.decision.actionCountAfter === e.actionCount &&
      old.decision.riskAfter === e.riskIndex, 'Reentry resets persistent enemy or lacks prior exit')
    const closed = v.battles.find(r => r.entry.id === e.id)
    if (closed) previous.set(key, closed)
  }
  for (const r of v.battles) {
    verifyDecision(r.decision, r.entry, v, deps)
    ensure(r.exitRevision === r.decision.revision && r.elapsed === r.decision.ctbAfter &&
      r.requestedEnergy === exitEnergyCost(r.elapsed, deps) && r.energyAfter === Math.max(0, r.energyBefore - r.requestedEnergy) &&
      r.nodeId === (r.outcome === 'victory' ? r.entry.to : r.entry.from) &&
      (r.outcome !== 'victory' || r.decision.enemyHealthAfter === 0) && r.decision.healthAfter > 0, 'Invalid surviving exit receipt')
  }
  for (const r of v.combatDeaths) {
    verifyDecision(r.decision, r.entry, v, deps, true)
    ensure(r.revision === r.decision.revision && r.id === createStreamId('residence-combat-death-v1', r.entry.id, String(r.revision)) &&
      v.receipts.some(x => x.source === 'combat-death' && x.combatDeathReceiptId === r.id && x.revision === r.revision &&
        same(x.binding, r.entry.binding)), 'Missing combat terminal binding')
  }
  for (const r of v.receipts) if (r.source === 'combat-death')
    ensure(v.combatDeaths.some(d => d.id === r.combatDeathReceiptId), 'Missing typed death evidence')
  if (v.battle?.decision) verifyDecision(v.battle.decision, v.battle.entry, v, deps)
  for (const site of [...v.archives.map(a => a.site), ...(v.site ? [v.site] : [])]) {
    for (const enemy of site.enemies) {
      const entry = entries.filter(e => same(e.binding, site.binding) && e.enemyId === enemy.id)
        .sort((a,b) => b.revision-a.revision)[0]
      if (!entry) continue
      const decision = v.battles.find(r => r.entry.id === entry.id)?.decision ??
        v.combatDeaths.find(r => r.entry.id === entry.id)?.decision ?? v.battle?.decision
      ensure(enemy.state.currentHealth === (decision?.enemyHealthAfter ?? entry.enemyHealth) &&
        enemy.state.resolvedActionCount === (decision?.actionCountAfter ?? entry.actionCount) &&
        enemy.riskDrawIndex === (decision?.riskAfter ?? entry.riskIndex), 'Persistent enemy differs from latest real combat evidence')
    }
  }
}
