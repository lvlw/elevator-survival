import { parseResidence } from '../residence-config/validation'
import { z } from 'zod'
import { traceSchema } from './schema'
import { ensure } from '../residence-supply/shared-validation'
import type { CombatBodyTrace } from './types'
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
