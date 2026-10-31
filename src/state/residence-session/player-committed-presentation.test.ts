import { afterEach, describe, expect, it, vi } from 'vitest'
import baseline from '../../../docs/engineering/world-integration/committed-presentation-b1-001/BASELINE-COMPATIBILITY.json'
import { committedCombatAction } from './player-committed-presentation'
import type { CombatSessionCommand } from './combat-commands'
import { normalize } from './player-test-fixtures'
import { observe } from './combat-test-observers'
import { committedCase, compatibilityCases, digest, type CompatibilityCase } from './player-committed-presentation-test-fixtures'
import { createPreplayController } from '../../app/infected-preplay/controller'
import { baselineCreatePreplayController } from '../../app/infected-preplay/committed-presentation-test-fixtures'

afterEach(() => vi.restoreAllMocks())
const mapping = { 'metal-pipe-basic-attack': 'basic-attack', 'metal-pipe-charged-strike': 'signature',
  'temporary-attack': 'temporary-attack', defend: 'defend', escape: 'retreat', 'use-quick-slot-item': 'quick-use' } as const
describe('B1 parsed command classification and exact-base compatibility', () => {
  it.each(Object.entries(mapping))('K01 explicit %s mapping reads no label/trace/identity', (kind, action) => {
    const command = { kind: 'combat', command: { command: { kind }, get expectedBattleId() { throw new Error('private ID read') } },
      get label() { throw new Error('label read') }, get trace() { throw new Error('trace read') } } as unknown as CombatSessionCommand
    const result = committedCombatAction(command)
    expect(result).toEqual({ action }); expect(Object.isFrozen(result)).toBe(true)
    expect(Reflect.ownKeys(result!)).toEqual(['action'])
  })
  it('K01 future combat enum and noncombat never acquire a generic action', () => {
    expect(committedCombatAction({ kind: 'combat', command: { command: { kind: 'future' } } } as unknown as CombatSessionCommand)).toBeNull()
    expect(committedCombatAction({ kind: 'move', get command() { throw new Error('noncombat detail read') } } as unknown as CombatSessionCommand)).toBeNull()
  })
  for (const layer of ['facade', 'controller'] as const) it.each(compatibilityCases)(`K17 ${layer} %s equals exact-base live oracle in the same locale after only the new property is removed`, id => {
    const expected = baseline.records.find(r => r.id === id && r.layer === layer)!
    const old = runNativeCase(layer, id, true), current = runNativeCase(layer, id, false)
    expect(current).toEqual(old) // Every public field, array order, handle topology, canonical bytes and count.
    // The immutable Windows capture remains an independent canonical/save/RNG oracle on every platform.
    for (const result of [old, current]) {
      expect(result.currentBefore).toBe(expected.currentBefore); expect(result.diskBefore).toBe(expected.diskBefore)
      expect(result.currentAfter).toBe(expected.currentAfter); expect(result.diskAfter).toBe(expected.diskAfter)
      expect(result.counts).toEqual(expected.counts); expect(result.dispatches).toBe(expected.dispatches)
      expect(result.controllerNotifications).toEqual(expected.controllerNotifications)
    }
  })
  it('K17 full ordered graph follows exact baseline under both en and zh-CN collations, without sorting the oracle away', () => {
    const original = String.prototype.localeCompare, orders: string[][] = []
    for (const locale of ['en', 'zh-CN']) {
      const spy = vi.spyOn(String.prototype, 'localeCompare').mockImplementation(function(this: string, other: string) {
        return original.call(this, other, locale)
      })
      try {
        const old = runNativeCase('controller', 'basic', true), current = runNativeCase('controller', 'basic', false)
        expect(current).toEqual(old)
        orders.push((old.before as { combat: { actions: { label: string }[] } }).combat.actions.map(a => a.label))
      } finally { spy.mockRestore() }
    }
    expect(orders[0]).not.toEqual(orders[1]) // Positive control for the real source of CI178's mismatch.
  })
})

// Exact baseline executable bodies are in TEST-only fixtures. Shared core/query/S dependencies are unchanged at the task base.
function runNativeCase(layer: 'facade' | 'controller', id: CompatibilityCase, old: boolean) {
  const { h, request } = committedCase(id, old), app = layer === 'controller' ? (old ? baselineCreatePreplayController(h) : createPreplayController(h)) : null
  const before = normalize(h.player.query()), currentBefore = digest(h.owner.getState().current), diskBefore = digest(h.disk())
  const observer = observe(h), statuses: string[] = []
  app?.subscribe(() => statuses.push(app.getSnapshot().status))
  observer.clear(); h.dispatch.mockClear(); if (id === 'save-failed') h.faults.write = true
  try {
    let legacy: unknown
    if (app) {
      const ask = app.execute(request), result = ask.kind === 'confirmation-required' ? app.confirm(ask.confirmation!) : ask
      const { presentation, ...rest } = result; legacy = rest
      expect(Object.hasOwn(result, 'presentation')).toBe(!old && id !== 'move-enters-battle')
      expect(Boolean(presentation)).toBe(!old && id !== 'move-enters-battle')
    } else {
      const result = h.player.execute(request), { committedAction, ...rest } = result; legacy = rest
      expect(Object.hasOwn(result, 'committedAction')).toBe(!old && id !== 'move-enters-battle')
      expect(Boolean(committedAction)).toBe(!old && id !== 'move-enters-battle')
    }
    return { before, currentBefore, diskBefore, result: normalize(legacy), currentAfter: digest(h.owner.getState().current),
      diskAfter: digest(h.disk()), counts: observer.counts(), dispatches: h.dispatch.mock.calls.length, controllerNotifications: statuses }
  } finally { for (const spy of Object.values(observer.spies)) spy.mockRestore() }
}
