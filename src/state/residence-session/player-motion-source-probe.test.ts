import { afterEach, describe, expect, it, vi } from 'vitest'
import { entered, coldSaved } from './combat-test-fixtures'
import { fromValue, ready, choose, send, counts } from './player-test-fixtures'
import { probeMotion } from './player-motion-probe-fixtures'
import { readCombatValue } from '../../core/residence-combat/validation'
import { simultaneous } from '../residence-save/combat-review-simultaneous-fixtures'
import { wrapPlayerSession } from './player-facade'
import { infectedWorldPlayerLabels as labels } from '../../content/infected-world-v0.1/player-query'
import { expectSaveOnly } from './combat-test-observers'
afterEach(() => vi.restoreAllMocks())

describe('B TEST-only original P/S/facade source observations', () => {
  it.each(['金属管攻击', '蓄力打击', '防御', '退却'])('%s observes one original result, not replayed CTB', label => {
    const f = entered(), h = fromValue(f.value, f.deps)
    const r = probeMotion(h, label, { action: choose(h.player, 'combat', label) })
    expect(r.execution).not.toHaveProperty('events'); expect(r.execution).not.toHaveProperty('trace')
    expect(r.observer.counts()).toMatchObject({ ctbPlan: 1 })
    expect(ready(h.player).combat === null).toBe(label === '退却')
  })
  it('one legal temporary attack has two native enemy responses only in trusted witnesses', () => {
    const f = entered('technician'), weapon = f.value.carried.equipment.weapon!.instanceId
    // Explicit TEST-only valid resource boundary, inherited from the native P04 regression.
    // No CTB, enemy HP, damage, history or content parameter is changed.
    let v = readCombatValue({ ...f.value, itemStates: { states: f.value.itemStates.states.map(s => s.instanceId === weapon ?
      { ...s, resource: { kind: 'durability', current: 0 } } : s) } }, f.deps)
    for (let n = 0; n < 8; n++) v = f.action(v, { kind: 'defend' }).snapshot
    const h = fromValue(v, f.deps), r = probeMotion(h, 'two-responses', { action: choose(h.player, 'combat', '临时攻击') })
    expect(r.decision.enemyResponses).toBe(2)
    expect(r.decision.trace.filter(t => t.kind === 'direct-damage').map(t => t.actionId)).toEqual(['technician-basic', 'technician-special'])
    expect(r.decision.queue.filter(q => q.reason.startsWith('enemy-action-'))).toHaveLength(2)
    expect(r.execution.view).not.toHaveProperty('enemyResponses')
    expect(JSON.stringify(r.execution)).not.toMatch(/enemyResponses|trace|currentCtb|technician-basic|technician-special/)
  })
  it('actual quick healing consumes the last unit, and stale/repeated requests have zero commit', () => {
    const f = entered('orderly', { hp: 10 }), h = fromValue(f.value, f.deps), q = ready(h.player)
    const action = q.combat!.actions.find(a => a.label.startsWith('使用快捷物品'))!.selector
    const r = probeMotion(h, 'quick-heal', { action })
    expect(r.decision.trace[0].kind).toBe('heal'); expect(r.decision.uses).toHaveLength(1)
    expect(r.commit.current.carried.quickSlots.slots[0]).toBeNull()
    const n = counts(h); h.dispatch.mockClear()
    expect(h.player.execute({ action }).kind).toBe('rejected'); expect(counts(h)).toEqual(n); expect(h.dispatch).not.toHaveBeenCalled()
    expect(ready(h.player).combat!.actions.some(a => a.quickConsumption)).toBe(false)
  })
  it('last insufficient durability retains informed payment without creating per-hit public records', () => {
    const f = entered(), weapon = f.value.carried.equipment.weapon!.instanceId
    const v = readCombatValue({ ...f.value, itemStates: { states: f.value.itemStates.states.map(s => s.instanceId === weapon ?
      { ...s, resource: { kind: 'durability', current: 1 } } : s) } }, f.deps)
    const h = fromValue(v, f.deps), a = ready(h.player).combat!.actions.find(a => a.label === '蓄力打击')!
    expect(a.resourceCost).toMatchObject({ currentBefore: 1, requested: 3, consumed: 1, after: 0 })
    const r = probeMotion(h, 'last-durability', { action: a.selector })
    expect(r.decision.resources.find(s => s.instanceId === weapon)).toMatchObject({ before: 1, requested: 3, consumed: 1, after: 0 })
  })
  it.each(['victory', 'death', 'both-zero'] as const)('%s closes before presentation and never waits for an animation', kind => {
    const pair = kind === 'both-zero' ? simultaneous() : null
    const f = pair?.h ?? entered('orderly', kind === 'death' ? { hp: 1 } : {})
    let v = pair?.beforeLast ?? f.value
    if (kind === 'victory') for (const cmd of ['metal-pipe-charged-strike', 'metal-pipe-basic-attack'] as const) v = f.action(v, { kind: cmd }).snapshot
    const h = fromValue(v, f.deps), r = probeMotion(h, kind, { action: choose(h.player, 'combat', kind === 'death' ? '防御' : '金属管攻击') })
    expect(r.commit.current.battle).toBeNull(); expect(ready(h.player).combat).toBeNull()
    if (kind === 'victory') expect(r.commit.current.battles.at(-1)!.outcome).toBe('victory')
    else {
      expect(r.commit.current.phase).toBe('dead'); expect(r.commit.current.receipts).toHaveLength(1)
      expect(r.commit.current.battles).toHaveLength(0)
      expect(r.observer.counts()).toMatchObject({ death: 1, terminate: 1, settle: 1, current: 1 })
      if (kind === 'both-zero') {
        expect(r.decision.enemyHealthAfter).toBe(0)
        expect(r.commit.current.archives[0].site.pending).toEqual({ kind: 'none' })
        expect(r.decision.trace.at(-1)!.kind).toBe('post-action-bleeding')
      }
    }
  })
  it('commit with failed save continues; retry and real v4 cold restore have no new gameplay result', () => {
    const f = entered(), h = fromValue(f.value, f.deps); h.faults.write = true
    const r = probeMotion(h, 'committed-save-failed', { action: choose(h.player, 'combat', '金属管攻击') })
    expect(r.commit.persistence).toBe('save-failed')
    send(h.player, 'combat', '防御'); const latest = h.owner.getState().current!
    h.faults.write = false; r.observer.clear(); h.player.retrySave(); expectSaveOnly(r.observer.counts())
    expect(h.owner.getState().current).toBe(latest)
    r.observer.clear(); const cold = coldSaved(h), p = wrapPlayerSession(cold.owner, cold.policy, labels).player
    expect(ready(p).combat!.opponent).toEqual(ready(h.player).combat!.opponent)
    expect(cold.storage.write).not.toHaveBeenCalled(); expect(cold.listener).not.toHaveBeenCalled()
    expect(r.observer.counts()).toMatchObject({ combat: 0, ctb: 0, issue: 0, draw: 0, death: 0, write: 0, batches: 0 })
    expect(p.query()).not.toHaveProperty('events')
  })
})
