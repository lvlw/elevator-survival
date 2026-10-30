import { describe, expect, it, vi } from 'vitest'
import { entered, mutable } from './combat-test-fixtures'
import { fromValue, ready } from './player-test-fixtures'
import { wrapPlayerSession } from './player-facade'
import { infectedWorldPlayerLabels as labels } from '../../content/infected-world-v0.1/player-query'
import type { PlayerLabels, PlayerOpponentPresentation } from './player-types'
import { readCombatValue } from '../../core/residence-combat/validation'
import { createPlayerContext } from './player-context'
import { projectPlayerView } from './player-queries'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { createLocationCatalog } from '../../core/residence-location/catalog'
import { createResidenceCombatDependencies } from '../../core/residence-combat/dependencies'
import { createCombatTestFactory } from '../../core/residence-combat/test-fixtures'
import { quietDraw } from './combat-test-fixtures'

describe('A actual query boundary and defensive projection', () => {
  it('valid TEST definition alias with unchanged rules and real entry yields unknown in actual query', () => {
    const base = createInfectedCombatDependencies('combat-test-character')
    const catalog = createLocationCatalog({ ...base.supply.catalog.data, enemies: base.supply.catalog.data.enemies.map(e =>
      e.id === 'orderly' ? { ...e, definition: { ...e.definition, id: 'TEST-unmapped-definition' } } : e) })
    const deps = createResidenceCombatDependencies({ ...base.supply, catalog, catalogs: [catalog] }, base.profiles.map(p =>
      p.definitionId === 'infected-world-orderly' ? { ...p, definitionId: 'TEST-unmapped-definition' } : p))
    const f = createCombatTestFactory(() => deps).entered('orderly', { draw: quietDraw }), h = fromValue(f.value, f.deps)
    expect(ready(h.player).combat!.opponent).toEqual({ kind: 'unknown', visualKey: null, name: '当前对手' })
    expect(ready(h.player).combat!.actions.length).toBeGreaterThan(0)
  })
  it('optional legacy labels explicitly produce unknown, without touching current', () => {
    const f = entered(), h = fromValue(f.value, f.deps), before = h.owner.getState().current
    const { action, source, place } = labels
    const legacy: PlayerLabels = { action, source, place }
    const q = ready(wrapPlayerSession(h.owner, h.policy, legacy).player)
    expect(q.combat!.opponent).toEqual({ kind: 'unknown', visualKey: null, name: '当前对手' })
    expect(h.owner.getState().current).toBe(before)
  })
  it.each([null, { kind: 'known', visualKey: 'private-id', name: 'private' },
    { kind: 'known', visualKey: 'infected-orderly', name: '感染技术员' },
    { kind: 'unknown', visualKey: 'private', name: 'private' }])('malformed mapping is a fixed unknown with no diagnostics: %j', candidate => {
    const f = entered(), h = fromValue(f.value, f.deps)
    const custom = { ...labels, opponent: () => candidate as PlayerOpponentPresentation }
    const q = ready(wrapPlayerSession(h.owner, h.policy, custom).player)
    expect(q.combat!.opponent).toEqual({ kind: 'unknown', visualKey: null, name: '当前对手' })
    expect(JSON.stringify(q)).not.toContain('private')
  })
  it('copies only three approved keys from trusted mapping; returned objects cannot mutate current', () => {
    const f = entered(), h = fromValue(f.value, f.deps), current = h.owner.getState().current
    const candidate = { kind: 'known', visualKey: 'infected-orderly', name: '感染护工', instanceId: 'PRIVATE' } as const
    const p = wrapPlayerSession(h.owner, h.policy, { ...labels, opponent: () => candidate }).player
    const q = ready(p)
    expect(q.combat!.opponent).not.toBe(candidate)
    expect(Reflect.ownKeys(q.combat!.opponent).sort()).toEqual(['kind', 'name', 'visualKey'])
    expect(Reflect.set(q.combat!.opponent, 'name', 'bad')).toBe(false)
    expect(h.owner.getState().current).toBe(current)
    expect(JSON.stringify(q)).not.toContain('PRIVATE')
  })
  it('invalid battle binding is rejected before presentation, never converted into unknown', () => {
    const f = entered(), bad = mutable(f.value), opponent = vi.fn(labels.opponent)
    bad.battle!.entry.definitionId = 'invalid-binding'
    expect(() => readCombatValue(bad, f.deps)).toThrow()
    const h = fromValue(f.value, f.deps)
    const owner = { ...h.owner, getState: () => ({ ...h.owner.getState(), current: bad }) }
    expect(() => wrapPlayerSession(owner, h.policy, { ...labels, opponent })).toThrow()
    expect(opponent).not.toHaveBeenCalled()
  })
  it('busy and mismatched contexts omit combat and never resolve a presentation', () => {
    const f = entered(), h = fromValue(f.value, f.deps), opponent = vi.fn(labels.opponent)
    const ctx = createPlayerContext(h.owner.getState().current!, h.deps)
    for (const view of [projectPlayerView(h.owner.getState(), ctx, h.deps, { ...labels, opponent }, true),
      projectPlayerView(h.owner.getState(), null, h.deps, { ...labels, opponent })]) {
      expect(view.status).toBe('blocked'); expect(view).not.toHaveProperty('combat')
    }
    expect(opponent).not.toHaveBeenCalled()
  })
})
