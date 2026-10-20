// TEST ONLY. Public decisions use the safe facade; raw S is an independent observer.
import { expect, vi } from 'vitest'
import { harness, coldRecord, type Harness } from './combat-test-fixtures'
import { wrapPlayerSession } from './player-facade'
import { infectedWorldPlayerLabels } from '../../content/infected-world-v0.1/player-query'
import type { PlayerSession, PlayerReadyView, PlayerRequest, PlayerView } from './player-types'
import type { CombatValue, CombatDependencies } from '../../core/residence-combat/types'
export function playerHarness(options: Parameters<typeof harness>[0] = {}) {
  const h = harness(options), dispatch = vi.fn(h.owner.dispatch)
  const facade = wrapPlayerSession(Object.freeze({ ...h.owner, dispatch }), h.policy, infectedWorldPlayerLabels)
  return { ...h, ...facade, dispatch }
}
export type PlayerHarness = ReturnType<typeof playerHarness>
export function ready(player: PlayerSession): PlayerReadyView {
  const view = player.query(); if (view.status !== 'ready') throw new Error('Expected ready safe view: ' + view.status)
  return view
}
export function allActions(v: PlayerReadyView) {
  return [...v.actions, ...v.move.options, ...v.tasks.choices, ...v.sources.flatMap(s => s.choices), ...(v.combat?.actions ?? [])]
}
export function choose(p: PlayerSession, family: string, label: string, method?: string) {
  const a = allActions(ready(p)).find(a => a.family === family && a.label === label && (method === undefined || a.method === method))
  if (!a) throw new Error('Missing safe action ' + family + '/' + label + '/' + method)
  return a.selector
}
export function send(p: PlayerSession, family: string, label: string, fields: Omit<PlayerRequest, 'action'> = {}, method?: string) {
  const result = p.execute({ action: choose(p, family, label, method), ...fields })
  expect(result.kind, family + '/' + label).toBe('committed'); return result
}
export function begin(h: PlayerHarness) {
  expect(h.bootstrap().status).toBe('no-current'); expect(h.storage.read).toHaveBeenCalledTimes(1)
  expect(h.storage.write).not.toHaveBeenCalled(); h.createFirst()
  send(h.player, 'depart', '进入封锁区')
}
export function fromValue(v: CombatValue, deps: CombatDependencies, initial?: Parameters<typeof coldRecord>[2]) {
  const h = coldRecord(v, deps, initial), dispatch = vi.fn(h.owner.dispatch)
  const facade = wrapPlayerSession(Object.freeze({ ...h.owner, dispatch }), h.policy, infectedWorldPlayerLabels)
  expect(facade.bootstrap().status).toBe('ready')
  return { ...h, ...facade, dispatch }
}
export function playerItem(p: PlayerSession, name: string, container?: string) {
  const v = ready(p), item = [...v.carried, ...v.ground].find(i => i.name === name && (!container || i.container === container))
  if (!item) throw new Error('Missing visible item ' + name + '/' + container)
  return item
}
export function normalize(view: PlayerView | unknown) {
  const handles = new Map<object, number>()
  function visit(v: unknown): unknown {
    if (!v || typeof v !== 'object') return v
    if ('selection' in v) {
      expect(v).toEqual({ selection: 'opaque' }); expect(Reflect.ownKeys(v)).toEqual(['selection'])
      if (!handles.has(v)) handles.set(v, handles.size)
      return { opaque: handles.get(v) }
    }
    if (Array.isArray(v)) return v.map(visit)
    return Object.fromEntries(Object.entries(v).map(([k, value]) => [k, visit(value)]))
  }
  return visit(view)
}
export function counts(h: Pick<Harness, 'storage' | 'listener' | 'draw'>) {
  return { reads: h.storage.read.mock.calls.length, writes: h.storage.write.mock.calls.length,
    notices: h.listener.mock.calls.length, draws: h.draw.mock.calls.length }
}
