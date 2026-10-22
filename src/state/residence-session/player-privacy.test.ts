import { describe, expect, it } from 'vitest'
import { fixture, bodyBoundary, entered } from './combat-test-fixtures'
import { fromValue, ready, normalize, begin, playerHarness, choose, send } from './player-test-fixtures'
import { planCombatMaintenance, planCombatRest } from '../../core/residence-combat/controlled'
import { nativePlayer } from './player-test-routes'

describe('Q06 Q11 whole safe-view noninterference', () => {
  it('different execution seeds/unrevealed outcomes compare with handle bijection, not deleted action lists', () => {
    const views = ['private-alpha-seed', 'private-beta-seed'].map(seed => {
      const f = fixture({ seed }), h = fromValue(f.value, f.deps, { runId: 'combat-test-execution', seed, tool: 'crow', specialty: 'engineer' })
      const view = ready(h.player), text = JSON.stringify(view)
      expect(text).not.toContain(seed); expect(text).not.toContain('combat-test-execution')
      expect(text).not.toMatch(/originId|instanceId|woundId|riskPercent|riskDraw|drawIndex|streamId|currentCtb|infectionProgress|pendingInfectionExposures/)
      expect(Object.isFrozen(view)).toBe(true); expect(Object.isFrozen(view.carried)).toBe(true)
      return normalize(view)
    })
    expect(views[0]).toEqual(views[1])
  })
  it.each([[0, 9], [60, 89], [120, 180]])('same public burden %i/%i does not change actions, length, warnings or generic qualification', (progress, other) => {
    const f = fixture(), first = bodyBoundary(f.value, f.deps, { infectionProgress: progress }), hidden = bodyBoundary(f.value, f.deps, { infectionProgress: other })
    const a = fromValue(first, f.deps), b = fromValue(hidden, f.deps)
    expect(normalize(ready(a.player))).toEqual(normalize(ready(b.player)))
    expect(ready(b.player).body.infectionWarning.kind).toBe('known')
  })
  it.each([[59, 60], [89, 90], [119, 120]])('DEC-053 permits only the approved current-band difference at %i/%i', (left, right) => {
    const f = fixture(), a = fromValue(bodyBoundary(f.value, f.deps, { infectionProgress: left }), f.deps),
      b = fromValue(bodyBoundary(f.value, f.deps, { infectionProgress: right }), f.deps)
    const x = ready(a.player), y = ready(b.player)
    expect(x.body.infectionWarning.band).not.toBe(y.body.infectionWarning.band)
    expect(normalize({ ...x, body: { ...x.body, infectionWarning: y.body.infectionWarning } })).toEqual(normalize(y))
  })
  it('actual opposite default-RNG source outputs have identical whole pre-reveal views and previews', () => {
    const pair = ['E03-A-seed-01', 'E03-A-seed-03'].map(seed => {
      const h = nativePlayer(seed); begin(h); send(h.player, 'move', '大厅')
      return h
    })
    expect(normalize(ready(pair[0].player))).toEqual(normalize(ready(pair[1].player)))
    const selections = pair.map(h => ({ action: choose(h.player, 'source', '大厅搜索', 'dark') }))
    expect(pair[0].player.preview(selections[0])).toEqual(pair[1].player.preview(selections[1]))
    pair.forEach((h, n) => expect(h.player.execute(selections[n]).kind).toBe('committed'))
    const outcomes = pair.map(h => h.owner.getState().current!.origins.find(o => o.producerId === 'H1-random')!.definitionId)
    expect(outcomes[0]).not.toBe(outcomes[1])
    expect(ready(pair[0].player).ground.map(i => i.name)).not.toEqual(ready(pair[1].player).ground.map(i => i.name))
  })
  it('no unknown side-door placeholder is introduced, local witnessed routes update after actual investigation', () => {
    const h = playerHarness(); begin(h)
    expect(ready(h.player).map.nodes.map(n => n.name)).not.toContain('检修间')
    expect(ready(h.player).map.routes.every(r => !r.from.includes('undefined') && !r.to.includes('undefined'))).toBe(true)
    const old = choose(h.player, 'move', '大厅'); h.player.execute({ action: old })
    expect(ready(h.player).map.nodes.some(n => n.name === '药房')).toBe(true)
    const routes = ready(h.player).map.routes
    expect(routes.some(r => r.observation === 'last-observed')).toBe(true)
  })
  it('real public resource and health changes are not flattened away for privacy', () => {
    const f = entered(), h = fromValue(f.value, f.deps), before = ready(h.player)
    send(h.player, 'combat', '金属管攻击')
    const after = ready(h.player)
    expect(normalize(before)).not.toEqual(normalize(after))
    const b = before.carried.find(i => i.container === 'weapon')!.resource
    const a = after.carried.find(i => i.container === 'weapon')!.resource
    expect(a).not.toEqual(b)
  })
  it('different real enemy HP inside one public phase stays private after native retreat/repair/rest/reentry', () => {
    const records = [true, false].map(charged => {
      const f = fixture({ hp: charged ? 10 : 12 }); let v = f.move(f.value, 'H1').snapshot
      v = f.source(v, 'H1-search', { method: 'dark' }).snapshot
      const metal = v.site!.ground.find(g => g.nodeId === 'H1')!.items.find(i => i.definitionId === f.deps.supply.tasks.data.items.find(i => i.alias === 'metal')!.id)!
      v = f.inventory(v, 'pickup', { instanceId: metal.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
      for (const node of ['H7', 'L0', 'L1', 'L2']) v = f.move(v, node).snapshot
      if (charged) {
        v = f.action(v, { kind: 'metal-pipe-charged-strike' }).snapshot
        v = f.action(v, { kind: 'defend' }).snapshot
        v = f.action(v, { kind: 'defend' }).snapshot
      } else {
        v = f.action(v, { kind: 'metal-pipe-basic-attack' }).snapshot
        v = f.action(v, { kind: 'metal-pipe-basic-attack' }).snapshot
      }
      v = f.action(v, { kind: 'escape' }).snapshot
      v = planCombatMaintenance(v, { kind: 'mechanical', expectedRevision: v.character.revision,
        inputs: [{ instanceId: metal.instanceId, quantity: 1 }], allocations: [{ instanceId: v.carried.equipment.weapon!.instanceId, amount: 15 }] }, f.authorize(v)).plan.snapshot
      v = planCombatRest(v, { kind: 'rest', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
      const remote = fromValue(v, f.deps), remoteView = ready(remote.player)
      expect(remoteView.combat).toBeNull()
      v = f.move(v, 'L2').snapshot
      const h = fromValue(v, f.deps)
      return { hp: v.site!.enemies.find(e => e.id === 'porter')!.state.currentHealth, view: ready(h.player), remoteView }
    })
    expect(records[0].hp).not.toBe(records[1].hp)
    expect(records[0].view.combat!.enemyStage).toBe(records[1].view.combat!.enemyStage)
    expect(normalize(records[0].remoteView)).toEqual(normalize(records[1].remoteView))
    expect(normalize(records[0].view)).toEqual(normalize(records[1].view))
  })
})
