import { afterEach, describe, expect, it, vi } from 'vitest'
import baseline from '../../../docs/engineering/world-integration/committed-presentation-b1-001/BASELINE-COMPATIBILITY.json'
import { committedCombatAction } from './player-committed-presentation'
import type { CombatSessionCommand } from './combat-commands'
import { normalize } from './player-test-fixtures'
import { observe } from './combat-test-observers'
import { committedCase, compatibilityCases, digest } from './player-committed-presentation-test-fixtures'
import { createPreplayController } from '../../app/infected-preplay/controller'

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
  for (const layer of ['facade', 'controller'] as const) it.each(compatibilityCases)(`K17 ${layer} %s equals pre-edit baseline after only the new property is removed`, id => {
    const expected = baseline.records.find(r => r.id === id && r.layer === layer)!
    const { h, request } = committedCase(id), app = layer === 'controller' ? createPreplayController(h) : null
    expect(normalize(h.player.query())).toEqual(expected.before)
    expect(digest(h.owner.getState().current)).toBe(expected.currentBefore); expect(digest(h.disk())).toBe(expected.diskBefore)
    const observer = observe(h), statuses: string[] = []
    app?.subscribe(() => statuses.push(app.getSnapshot().status))
    observer.clear(); h.dispatch.mockClear(); if (id === 'save-failed') h.faults.write = true
    if (app) {
      const ask = app.execute(request), result = ask.kind === 'confirmation-required' ? app.confirm(ask.confirmation!) : ask
      const { presentation, ...legacy } = result
      expect(normalize(legacy)).toEqual(expected.result)
      expect(Boolean(presentation)).toBe(id !== 'move-enters-battle')
    } else {
      const { committedAction, ...legacy } = h.player.execute(request)
      expect(normalize(legacy)).toEqual(expected.result)
      expect(Boolean(committedAction)).toBe(id !== 'move-enters-battle')
    }
    expect(digest(h.owner.getState().current)).toBe(expected.currentAfter); expect(digest(h.disk())).toBe(expected.diskAfter)
    expect(observer.counts()).toEqual(expected.counts); expect(h.dispatch).toHaveBeenCalledTimes(expected.dispatches)
    expect(statuses).toEqual(expected.controllerNotifications)
  })
})
