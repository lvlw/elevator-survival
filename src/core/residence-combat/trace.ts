import { parseResidence } from '../residence-config/validation'
import { z } from 'zod'
import { traceSchema } from './schema'
import { ensure } from '../residence-supply/shared-validation'
import type { CombatBodyTrace, CombatDependencies, CombatValue, DecisionWitness, EntryWitness } from './types'
import { decisionFacts, responseAction } from './history-context'
import { same } from '../residence-terminal/validation'
import { createStreamId } from '../random'
import { reduceRiskTier } from '../combat/combat-risk'
import { safeAdd } from '../residence-config/validation'
import type { CombatEffect } from '../combat/combat-types'
export function combatBodyTrace(effects: readonly CombatEffect[], health: number, startCtb: number): readonly CombatBodyTrace[] {
  const rows: CombatBodyTrace[] = []
  let hp = health, ctb = startCtb, enemyAction = ''
  const add = (kind: CombatBodyTrace['kind'], actionId: string, requested: number, actual: number, after: number, reference: string | null = null) => {
    rows.push({ kind, actionId, requested, actual, healthBefore: hp, healthAfter: after, ctb, reference }); hp = after
  }
  for (const [index, e] of effects.entries()) {
    if (e.kind === 'player-health-lost' && e.source !== 'post-player-action-bleeding') {
      enemyAction = e.source
      const event = effects.slice(index + 1).find(e => e.kind === 'combat-ctb-position-changed' &&
        (e.reason === 'enemy-action-resolved' || e.reason === 'enemy-action-terminal'))
      if (event?.kind === 'combat-ctb-position-changed') ctb = event.currentCtbAfter
    }
    if (e.kind === 'combat-ctb-position-changed') ctb = e.currentCtbAfter
    else if (e.kind === 'player-health-restored') add('heal', e.source, e.requestedRecovery, e.actualRecovery, e.healthAfter)
    else if (e.kind === 'player-health-lost') add(e.source === 'post-player-action-bleeding' ? 'post-action-bleeding' : 'direct-damage',
      e.source, e.requestedLoss, e.actualLoss, e.healthAfter)
    else if (e.kind === 'open-wound-added') add('injury', enemyAction, 1, 1, hp, e.wound.id)
    else if (e.kind === 'minor-contusion-added') add('injury', enemyAction, 1, 1, hp)
    else if (e.kind === 'infection-exposure-added') add('exposure', enemyAction, e.added, e.added, hp)
    else if (e.kind === 'open-wound-treated') add('treatment', 'combat-bandage', 1, 1, hp, e.woundId)
    else if (e.kind === 'painkiller-changed') add('treatment', 'combat-painkiller', 1, 1, hp)
  }
  return rows
}
/** Joint source/checkpoint constraints; the generic clipped-HP validator above stays arithmetic-only. */
export function verifyDecisionTrace(d: DecisionWitness, e: EntryWitness, v: CombatValue, deps: CombatDependencies) {
  const { profile, recovery, weaponCost } = decisionFacts(d, e, v, deps)
  const r = profile.rules, c = d.context, escape = d.command.kind === 'escape'
  const resources: DecisionWitness['resources'][number][] = []
  const consume = (item: NonNullable<typeof c.armor>, before: number, requested: number) => {
    const consumed = Math.min(before, requested)
    resources.push({ instanceId: item.instanceId, before, requested, consumed, after: before - consumed })
    return before - consumed
  }
  if (weaponCost) consume(c.weapon!, c.weapon!.current, weaponCost)
  let cursor = 0, hp = d.healthBefore, bleeding = c.bleeding, armor = c.armor?.current ?? 0
  const take = (kind: CombatBodyTrace['kind'], source: string, ctb: number, requested: number, reference: string | null = null) => {
    const row = d.trace[cursor++]
    ensure(row && row.kind === kind && row.actionId === source && row.ctb === ctb && row.ctb <= d.ctbAfter &&
      row.requested === requested && row.reference === reference && row.healthBefore === hp,
      'Trace source/checkpoint/request differs from formal context')
    hp = row.healthAfter
    return row
  }
  if (d.command.kind === 'use-quick-slot-item') {
    const use = d.uses[0]
    if (use.kind === 'bandage') {
      const previousUse = v.dispositions.some(x => x.reason === 'medical' && x.item.definitionId === use.definitionId &&
        x.revision < d.baseRevision && same(x.binding.execution, e.binding.execution))
      ensure(!previousUse || c.firstBandageUsed, 'First-bandage evidence contradicts prior consumption')
      take('heal', 'combat-bandage', d.ctbBefore, recovery)
      if (d.command.targetOpenWoundId) take('treatment', 'combat-bandage', d.ctbBefore, 1, d.command.targetOpenWoundId)
      if (r.bandage.stopsBleeding) bleeding = false
    } else take('treatment', 'combat-painkiller', d.ctbBefore, 1)
  }
  if (!escape && bleeding) take('post-action-bleeding', 'post-player-action-bleeding', d.ctbBefore, r.postPlayerActionBleedingDamage)
  let responseIndex = 0, defense = d.command.kind === 'defend'
  for (const q of d.queue) {
    if (q.reason !== 'enemy-action-resolved' && q.reason !== 'enemy-action-terminal') continue
    ensure(hp > 0, 'Response after primary death')
    const action = responseAction(d, e, deps, responseIndex)
    const protectedByCoat = armor > 0, protectedByDefense = defense
    if (protectedByCoat) armor = consume(c.armor!, armor, r.heavyCoat.integrityCostPerAttack)
    let requested = Math.max(0, action.damage - (protectedByCoat ? r.heavyCoat.directDamageReduction : 0))
    if (protectedByDefense) requested = Math.ceil(requested * r.defend.remainingDamagePercent / 100)
    take('direct-damage', action.actionId, q.currentAfter, requested)
    defense = false
    ensure((hp === 0) === (q.reason === 'enemy-action-terminal'), 'Death checkpoint/queue reason differs')
    if (hp === 0) break
    if (d.trace[cursor]?.kind === 'injury') {
      const tier = reduceRiskTier(action.injuryRiskTier,
        (protectedByCoat ? r.heavyCoat.injuryRiskTierReduction : 0) + (protectedByDefense ? r.defend.injuryRiskTierReduction : 0))
      ensure(tier !== 'none', 'Impossible injury at protected response')
      const reference = action.injuryKind === 'contusion' ? null : createStreamId('residence-combat-wound',
        e.binding.execution.runId, e.enemyInstanceId, String(safeAdd(d.actionCountBefore, responseIndex)), action.actionId, 'injury')
      take('injury', action.actionId, q.currentAfter, 1, reference)
      if (action.injuryKind !== 'contusion') bleeding = true
    }
    if (d.trace[cursor]?.kind === 'exposure') {
      ensure(reduceRiskTier(action.exposureRiskTier, protectedByCoat ? r.heavyCoat.exposureRiskTierReduction : 0) !== 'none',
        'Impossible exposure at protected response')
      take('exposure', action.actionId, q.currentAfter, 1)
    }
    responseIndex++
  }
  if (escape && hp > 0 && bleeding)
    take('post-action-bleeding', 'post-player-action-bleeding', d.ctbAfter, r.postPlayerActionBleedingDamage)
  ensure(cursor === d.trace.length && hp === d.healthAfter, 'Missing/duplicate or foreign trace event')
  ensure(same(resources, d.resources), 'Resource events differ from actual weapon/protection sequence')
  if (d.revision === v.character.revision) for (const original of [c.weapon, c.armor]) {
    if (!original) continue
    const expected = resources.filter(x => x.instanceId === original.instanceId).at(-1)?.after ?? original.current
    const state = v.itemStates.states.find(s => s.instanceId === original.instanceId) ??
      v.dispositions.find(x => x.item.instanceId === original.instanceId && x.revision === d.revision)?.state
    ensure(state && state.resource.kind !== 'none' && state.resource.current === expected,
      'Latest real resource differs from decision evidence')
  }
}
/** Evidence validation only: no resolver, RNG, condition mutator or G1 invocation. */
export function verifyCombatBodyTrace(input: unknown, before: number, after: number, max: number, dead = false) {
  const rows = parseResidence(z.array(traceSchema), input)
  ensure(Number.isSafeInteger(before) && before > 0 && before <= max &&
    Number.isSafeInteger(after) && after >= 0 && after <= max, 'Invalid original HP')
  let hp = before, ctb = 0
  for (const row of rows) {
    ensure(hp > 0 && row.healthBefore === hp && row.healthAfter <= max && row.actual <= row.requested && row.ctb >= ctb, 'Invalid typed HP adjacency')
    if (row.kind === 'heal') ensure(row.actionId === 'combat-bandage' && row.actual === Math.min(max - hp, row.requested) && row.healthAfter === hp + row.actual, 'Invalid clipped heal')
    else if (row.kind === 'direct-damage' || row.kind === 'post-action-bleeding')
      ensure(row.actual === Math.min(hp, row.requested) && row.healthAfter === hp - row.actual, 'Invalid clipped damage')
    else ensure(row.healthAfter === hp && row.actual === 1 && row.requested === 1, 'Non-HP step changed HP or source amount')
    hp = row.healthAfter
    ctb = row.ctb
  }
  ensure(hp === after && (!dead || rows.length > 0 && hp === 0), 'Trace final HP differs')
  return rows
}
