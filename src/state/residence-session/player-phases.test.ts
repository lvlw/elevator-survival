import { describe, expect, it } from 'vitest'
import { fixture, entered, bodyBoundary, atDay } from './combat-test-fixtures'
import { planCombatTerminal } from '../../core/residence-combat/controlled'
import { begin, playerHarness, fromValue, ready, send, counts } from './player-test-fixtures'

describe('Q01 Q02 Q07 safe application states and complete points', () => {
  it('unbootstrapped/no-current setup is pure; real first-hub locks actual choices', () => {
    const h = playerHarness({ tool: 'lamp', specialty: 'survival' })
    expect(h.player.query().status).toBe('unbootstrapped')
    const before = counts(h)
    expect(h.player.setup()).toEqual({ tools: ['crow', 'lamp', 'toolbox'], specialties: ['scout', 'engineer', 'survival'] })
    expect(counts(h)).toEqual(before)
    expect(h.bootstrap().status).toBe('no-current'); h.createFirst()
    expect(ready(h.player).point).toBe('first-hub')
    expect(h.player.setup()).toEqual({ tools: ['lamp'], specialties: ['survival'] })
    expect(ready(h.player).first.locked).toBe(true)
    const n = counts(h); expect(() => h.createFirst()).toThrow(); expect(counts(h)).toEqual(n)
  })
  it.each(['read-error', 'blocked'] as const)('%s is not a fake domain death', status => {
    const h = playerHarness(status === 'blocked' ? { text: '{untrusted-save}' } : {})
    if (status === 'read-error') h.faults.read = true
    expect(h.bootstrap().status).toBe(status)
    expect(h.player.query()).not.toHaveProperty('phase')
    expect(h.storage.write).not.toHaveBeenCalled()
  })
  it.each(['orderly', 'porter', 'technician'] as const)('%s real complete battle uses formal stage/intent, no raw timeline', enemy => {
    const f = entered(enemy), h = fromValue(f.value, f.deps), q = ready(h.player)
    expect(q.point).toBe('battle-decision'); expect(q.phase).toBe('active-world')
    expect(q.combat!.enemyStage).toBe('healthy'); expect(q.combat!.actions.length).toBeGreaterThan(0)
    expect(q.combat!.relativeTimeline.current).toBe('player')
    const charged = q.combat!.actions.find(a => a.label === '蓄力打击')!
    expect(charged.resourceCost!.requested).toBe(f.deps.profiles.find(p => p.definitionId === f.value.battle!.entry.definitionId)!.rules.metalPipe.chargedStrike.durabilityCost)
    expect(charged.signatureUsesRemaining).toBe(f.value.character.body.quotasRemaining.pipe_signature)
    expect(q.combat!.energySettlement).toBe('once-on-victory-or-retreat')
    expect(JSON.stringify(q)).not.toMatch(/currentCtb|enemyNext|enemyHealth|riskIndex|streamId|runId|instanceId/)
    expect(q.actions).toEqual([])
  })
  it('normal H0 withdraw is exactly one command/save/notice; static living Hub has no successors or extra cycle', () => {
    const h = playerHarness(); begin(h)
    const before = h.owner.getState().current!, n = counts(h)
    send(h.player, 'terminal', '失败止损返回')
    const v = h.owner.getState().current!, q = ready(h.player)
    expect(q.point).toBe('living-hub'); expect(q.terminal.result!.outcome).toBe('voluntary-failure')
    expect(v.receipts.at(-1)!.steps).toEqual([]); expect(v.character.cycle).toBe(before.character.cycle)
    expect(q.actions).toEqual([]); expect(q.staticHub.successors).toEqual({ kind: 'no-content', choices: [] })
    expect(counts(h)).toEqual({ ...n, writes: n.writes + 1, notices: n.notices + 1 })
  })
  it('Day7 exposes formal deadline only outside H0; no invented Day8', () => {
    const f = fixture(); const day = atDay(f.move(f.value, 'H1').snapshot, f, 7), h = fromValue(day, f.deps)
    expect(ready(h.player).terminal.eligibility.deadline).toBe(true)
    expect(ready(h.player).actions.some(a => a.family === 'rest')).toBe(false)
    send(h.player, 'terminal', '期限结算')
    const q = ready(h.player)
    expect(q.taskDay).toBe(7); expect(q.phase).toBe('living-hub'); expect(q.terminal.result!.outcome).toBe('deadline-failure')
  })
  it('real post-action death projects dead, not a living-hub or actionable HP0 state', () => {
    const f = fixture({ hp: 1, bleeding: true }), h = fromValue(f.value, f.deps)
    send(h.player, 'move', '大厅')
    const q = ready(h.player)
    expect(q.phase).toBe('dead'); expect(q.body.hp.current).toBe(0); expect(q.terminal.result!.outcome).toBe('death')
    expect(q.carried).toEqual([]); expect(q.actions).toEqual([]); expect(q.location).toBeNull()
  })
})
