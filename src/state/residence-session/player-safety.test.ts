import { describe, expect, it } from 'vitest'
import { fixture, entered, bodyBoundary } from './combat-test-fixtures'
import { fromValue, ready, choose, counts } from './player-test-fixtures'
import { drawIntInclusive } from '../../core/random'

describe('F02 F03 complete request safety and actual native outcomes', () => {
  it('a legal free quick-to-backpack alternative still protects a fatal move when the medicine has no clinical target', () => {
    const f = fixture({ draw: (c, min, max) => ({ ...drawIntInclusive(c, min, max), value: 50 }) })
    let value = f.move(f.value, 'H1').snapshot
    value = f.move(value, 'H2').snapshot; value = f.source(value, 'H2-search', { method: 'dark' }).snapshot
    const alias = f.deps.supply.tasks.data.items.find(i => i.alias === 'painkiller')!.id
    const painkiller = value.site!.ground.find(g => g.nodeId === 'H2')!.items.find(i => i.definitionId === alias)!
    expect(painkiller).toBeDefined()
    value = bodyBoundary(value, f.deps, { condition: { ...value.character.body.condition, currentHealth: 10 } })
    value = f.medical(value, value.carried.quickSlots.slots[0]!.instanceId).snapshot
    value = f.inventory(value, 'pickup', { instanceId: painkiller.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
    value = f.inventory(value, 'to-quick', { instanceId: painkiller.instanceId, slot: 0 }).snapshot
    value = bodyBoundary(value, f.deps, { condition: { ...value.character.body.condition, currentHealth: 1, bleeding: true } })
    const h = fromValue(value, f.deps), q = ready(h.player), n = counts(h), item = q.carried.find(i => i.container === 'quick')!
    expect(q.carried.filter(i => i.container === 'backpack')).toEqual([])
    expect(h.preplay.inspect({ action: choose(h.player, 'medical', '使用药食'), item: item.selector }).qualification.kind).toBe('unavailable')
    const transfer = { action: choose(h.player, 'inventory', '放入背包'), item: item.selector, placement: { x: 0, y: 0, rotated: false } }
    expect(h.preplay.inspect(transfer).death.kind).toBe('not-guaranteed')
    const fatal = { action: q.move.options[0].selector }
    expect(h.preplay.inspect(fatal).death.kind).toBe('guaranteed')
    expect(h.preplay.inspect(fatal).confirmation.kind).toBe('dynamic')
    expect(counts(h)).toEqual(n)
  })
  it('same legitimate HP1 bleeding origin: paid move is fatal, free bandage lives and enables the next move', () => {
    const f = fixture({ hp: 1, bleeding: true }), doomed = fromValue(f.value, f.deps), rescue = fromValue(f.value, f.deps)
    const move = { action: choose(doomed.player, 'move', '大厅') }, safe = doomed.preplay.inspect(move), before = counts(doomed)
    expect(safe.death.kind).toBe('guaranteed'); expect(safe.hasProvenAlternative).toBe(true)
    expect(safe.confirmation).toEqual({ kind: 'dynamic', reason: 'certain-death-with-alternative' })
    expect(counts(doomed)).toEqual(before)
    expect(doomed.player.execute(move).kind).toBe('committed'); expect(ready(doomed.player).phase).toBe('dead')
    const bandage = ready(rescue.player).carried.find(i => i.name === '绷带')!
    const heal = { action: choose(rescue.player, 'medical', '使用药食'), item: bandage.selector }
    expect(rescue.preplay.inspect(heal).death.kind).toBe('not-guaranteed')
    expect(rescue.preplay.inspect(heal).facts!.clinical!.healthRecovery).toBe(1)
    expect(rescue.player.execute(heal).kind).toBe('committed')
    expect(ready(rescue.player).body.bleeding).toBe(false); expect(ready(rescue.player).body.hp.current).toBe(2)
    expect(rescue.player.execute({ action: choose(rescue.player, 'move', '大厅') }).kind).toBe('committed')
    expect(ready(rescue.player).phase).toBe('active-world')
  })
  it('E0 rejects paid move but keeps a concrete free self-treatment; unknown is never a nonfatal proof', () => {
    const f = fixture({ hp: 1, energy: 0, bleeding: true }), h = fromValue(f.value, f.deps)
    const bandage = ready(h.player).carried.find(i => i.name === '绷带')!
    expect(h.preplay.inspect({ action: choose(h.player, 'medical', '使用药食'), item: bandage.selector }).death.kind).toBe('not-guaranteed')
    expect(ready(h.player).move.options).toEqual([])
    const rest = h.preplay.inspect({ action: choose(h.player, 'rest', '原位休整') })
    expect(rest.death.kind).toBe('unknown'); expect(rest.confirmation.kind).toBe('none')
  })
  it('normal H0 closure is not predicted by adding a night; exact static confirmation is separate', () => {
    const f = fixture({ hp: 1, bleeding: true }), h = fromValue(f.value, f.deps)
    const request = { action: choose(h.player, 'terminal', '失败止损返回') }, meta = h.preplay.inspect(request)
    expect(meta.death).toEqual({ kind: 'not-guaranteed', basis: 'normal-return-no-night' })
    expect(meta.confirmation.kind).toBe('static'); h.player.execute(request)
    const after = h.owner.getState().current!
    expect(after.phase).toBe('living-hub'); expect(after.character.body.condition.currentHealth).toBe(1)
    expect(after.receipts.at(-1)!.steps).toEqual([])
  })
  it.each(['orderly', 'porter', 'technician'] as const)('%s attack never reads enemy HP to cancel a response', enemy => {
    const f = entered(enemy), h = fromValue(f.value, f.deps), a = ready(h.player).combat!.actions.find(a => a.label === '金属管攻击')!
    const m = h.preplay.inspect({ action: a.selector })
    expect(m.qualification.kind).toBe('available')
    expect(m.death).toEqual(enemy === 'porter' ? { kind: 'not-guaranteed', basis: 'combat-no-response' } : { kind: 'unknown', basis: 'combat-response' })
    expect(m.confirmation.kind).toBe('none')
    expect(JSON.stringify(m)).not.toMatch(/enemyHealth|currentCtb|roll|streamId|riskPercent|instanceId/)
  })
  it('actual HP2 bleeding: bandage before the current enemy response survives, while escape is protected fatal', () => {
    const f = entered('orderly', { hp: 5, bleeding: true }), a = fromValue(f.value, f.deps), b = fromValue(f.value, f.deps)
    expect(ready(a.player).body.hp.current).toBe(2)
    const escape = { action: choose(a.player, 'combat', '退却') }, bandage = { action: ready(b.player).combat!.actions.find(a => a.label.startsWith('使用快捷物品'))!.selector }
    expect(a.preplay.inspect(escape).death.kind).toBe('guaranteed')
    expect(a.preplay.inspect(escape).confirmation.kind).toBe('dynamic')
    expect(b.preplay.inspect(bandage).death.kind).toBe('not-guaranteed')
    expect(a.player.execute(escape).kind).toBe('committed'); expect(ready(a.player).phase).toBe('dead')
    expect(b.player.execute(bandage).kind).toBe('committed'); expect(ready(b.player).point).toBe('battle-decision')
    expect(ready(b.player).body.hp.current).toBe(1)
  })
  it('combat primary precedes own bleeding even on a kill; a timely real bandage is a proven nonfatal alternative', () => {
    const f = entered('porter', { hp: 6, bleeding: true }), h = fromValue(f.value, f.deps), rescue = fromValue(f.value, f.deps)
    expect(ready(h.player).body.hp.current).toBe(1)
    const attack = { action: choose(h.player, 'combat', '金属管攻击') }, proof = h.preplay.inspect(attack)
    expect(proof.death.kind).toBe('guaranteed'); expect(proof.confirmation.kind).toBe('dynamic')
    expect(h.player.execute(attack).kind).toBe('committed'); expect(ready(h.player).phase).toBe('dead')
    const bandage = ready(rescue.player).combat!.actions.find(a => a.label.startsWith('使用快捷物品'))!
    const saved = { action: bandage.selector }, safe = rescue.preplay.inspect(saved)
    expect(safe.death).toEqual({ kind: 'not-guaranteed', basis: 'combat-no-response' })
    expect(rescue.player.execute(saved).kind).toBe('committed')
    expect(ready(rescue.player).point).toBe('battle-decision'); expect(ready(rescue.player).body.hp.current).toBe(2)
  })
  it('hidden medical targets retain identical unknown metadata; actual explicit execution may differ', () => {
    const f = fixture(); let v = f.move(f.value, 'H1').snapshot
    v = f.move(v, 'H2').snapshot; v = f.source(v, 'H2-search', { method: 'dark' }).snapshot
    const item = v.site!.ground.find(g => g.nodeId === 'H2')!.items.find(i => f.deps.supply.tasks.data.items.some(d => d.id === i.definitionId && d.alias === 'suppressant'))!
    expect(item).toBeDefined()
    v = f.inventory(v, 'pickup', { instanceId: item.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
    const pair = [0, 9].map(progress => {
      const h = fromValue(bodyBoundary(v, f.deps, { infectionProgress: progress }), f.deps), q = ready(h.player)
      const med = q.carried.find(i => i.name === '感染抑制剂')!
      const request = { action: choose(h.player, 'medical', '使用药食'), item: med.selector }
      return { h, request, meta: h.preplay.inspect(request) }
    })
    expect(pair[0].meta).toEqual(pair[1].meta); expect(pair[0].meta.qualification.kind).toBe('unknown')
    expect(pair[0].meta.death.kind).toBe('unknown')
    expect(pair[0].h.player.execute(pair[0].request).kind).toBe('rejected')
    expect(pair[1].h.player.execute(pair[1].request).kind).toBe('committed')
  })
})
