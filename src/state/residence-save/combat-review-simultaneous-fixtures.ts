// TEST ONLY. Real P producers; explicit HP/bleeding boundary is set BEFORE actual entry.
import { fixture, entered, bodyBoundary, win, quietDraw, wire } from './combat-test-fixtures'
import { validateCombatResidenceAggregate } from './combat-validation'
import { serializeCombatResidenceSave, deserializeCombatResidenceSave } from './combat-codec'
import { restoreCombatResidenceCandidate } from './combat-expected'
import type { CombatValue } from '../../core/residence-combat/types'
import type { CombatResidenceExpectation, CombatResidencePolicy } from './combat-types'

export const apiNames = ['aggregate', 'encode', 'decode', 'same-progress'] as const
export type ApiName = typeof apiNames[number]
export function callApi(api: ApiName, value: unknown, expected: CombatResidenceExpectation,
  policy: CombatResidencePolicy, committed: CombatValue) {
  if (api === 'aggregate') return validateCombatResidenceAggregate(value, expected, policy)
  if (api === 'encode') return serializeCombatResidenceSave(value, expected, policy)
  if (api === 'decode') return deserializeCombatResidenceSave(wire(value), expected, policy)
  return restoreCombatResidenceCandidate(value, committed, expected, policy)
}
export function simultaneous(mode: 'first-basic' | 'first-charged' | 'reentry-basic' = 'first-basic', draw = quietDraw) {
  const h = fixture({ draw })
  let v = h.move(h.value, 'H1').snapshot
  v = h.task(v, 'fire-door', { method: 'crow', toolInstanceId: v.carried.equipment.utility!.instanceId }).snapshot
  if (mode === 'reentry-basic') {
    v = h.move(v, 'H4').snapshot
    v = h.action(v, { kind: 'escape' }).snapshot
  }
  v = bodyBoundary(v, h.deps, { condition: { ...v.character.body.condition,
    currentHealth: mode === 'first-basic' ? 6 : mode === 'first-charged' ? 12 : 10, bleeding: true } })
  v = h.move(v, 'H4').snapshot
  const sequence = mode === 'first-charged' ? ['metal-pipe-basic-attack', 'metal-pipe-basic-attack', 'metal-pipe-charged-strike'] as const :
    ['metal-pipe-charged-strike', 'metal-pipe-basic-attack', 'metal-pipe-basic-attack'] as const
  v = h.action(v, { kind: sequence[0] }).snapshot
  v = h.action(v, { kind: sequence[1] }).snapshot
  const beforeLast = v, end = h.action(v, { kind: sequence[2] }).snapshot
  return { h, end, beforeLast }
}
export function livingEnemyDeath(kind: 'direct' | 'bleeding' | 'heal' = 'direct', draw = quietDraw) {
  const h = entered('orderly', { hp: kind === 'bleeding' ? 4 : 1, bleeding: kind === 'bleeding', draw })
  const beforeLast = h.value, end = h.action(beforeLast, kind === 'heal' ? { kind: 'use-quick-slot-item', quickSlotIndex: 0 }
    : { kind: kind === 'bleeding' ? 'metal-pipe-basic-attack' : 'defend' }, kind === 'heal'
      ? { instanceId: beforeLast.carried.quickSlots.slots[0]!.instanceId } : {}).snapshot
  return { h, end, beforeLast }
}
export function laterDeath() {
  const h = entered()
  let v = win(h, h.value)
  for (const node of ['H1', 'H0', 'C0', 'C1']) v = h.move(v, node).snapshot
  v = h.task(v, 'c-gate', { method: 'manual' }).snapshot
  v = bodyBoundary(v, h.deps, { condition: { ...v.character.body.condition, currentHealth: 1, bleeding: false } })
  v = h.move(v, 'C2').snapshot
  const beforeLast = v, end = h.action(v, { kind: 'defend' }).snapshot
  return { h, end, beforeLast }
}
