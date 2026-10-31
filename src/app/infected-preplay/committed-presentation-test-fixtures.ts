// TEST ONLY. Protocol reference consumer; never imported by production.
import { expect } from 'vitest'
import type { CommittedCombatPresentation } from './committed-presentation'
import type { PreplayResult } from './types'

export function presentationOf(result: PreplayResult) {
  expect(result.kind).toBe('committed'); expect(result.presentation).toBeDefined()
  return result.presentation!
}
export function expectClosedPresentation(p: CommittedCombatPresentation) {
  expect(Reflect.ownKeys(p).sort()).toEqual(['opponent', 'persistence', 'sequence', 'stageAfter', 'stageBefore', 'stop', 'token', 'version'])
  expect(Reflect.ownKeys(p.token).sort()).toEqual(['ordinal', 'scope'])
  expect(Reflect.ownKeys(p.token.scope)).toEqual([])
  expect(Reflect.ownKeys(p.opponent).sort()).toEqual(['kind', 'name', 'visualKey'])
  expect(p.sequence).toHaveLength(1)
  expect(Reflect.ownKeys(p.sequence[0]).sort()).toEqual(['action', 'actor', 'ordinal'])
  expect(p.sequence[0].actor).toEqual({ role: 'player' }); expect(p.sequence[0].ordinal).toBe(0)
  expect(p.version).toBe(1); expect(Number.isSafeInteger(p.token.ordinal)).toBe(true)
  for (const object of [p, p.token, p.token.scope, p.opponent, p.sequence, p.sequence[0], p.sequence[0].actor]) expect(Object.isFrozen(object)).toBe(true)
}
/** Single scope/high-water/pending only; no token set, command, save or gameplay port. */
export function referenceConsumer(canUse: () => boolean = () => true) {
  let scope: Readonly<object> | null = null, high = -1, generation = 0, accepted = 0, settled = 0
  let pending: ReturnType<typeof setTimeout> | null = null
  function cancel() { generation++; if (pending !== null) clearTimeout(pending); pending = null }
  function activate(next: Readonly<object>) { if (scope !== next) { cancel(); scope = next; high = -1 } }
  function consume(p: CommittedCombatPresentation, mode: 'animate' | 'skip' | 'reduced' = 'animate') {
    if (!canUse() || scope !== p.token.scope || !Number.isSafeInteger(p.token.ordinal) || p.token.ordinal <= high) return null
    cancel(); high = p.token.ordinal; accepted++
    const ticket = generation, active = scope
    const finish = () => {
      if (!canUse() || scope !== active || generation !== ticket) return false
      cancel(); settled++; return true
    }
    if (mode === 'animate') pending = setTimeout(finish, 20)
    else finish()
    return { finish }
  }
  return { activate, consume, cancel, counts: () => ({ accepted, settled, high, pending: pending !== null }) }
}
