import { describe, expect, it } from 'vitest'
import { fixture, bodyBoundary, entered } from './combat-test-fixtures'
import { playerHarness, begin, send, fromValue, ready, normalize, choose } from './player-test-fixtures'
import { initialMaterials } from './supply-test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { planCombatMaintenance, planCombatRest } from '../../core/residence-combat/controlled'
import { createPreplayController } from '../../app/infected-preplay/controller'
import { commit } from '../../app/infected-preplay/test-fixtures'
import { expectClosedPresentation, presentationOf } from '../../app/infected-preplay/committed-presentation-test-fixtures'
import { wrapPlayerSession } from './player-facade'
import { infectedWorldPlayerLabels as labels } from '../../content/infected-world-v0.1/player-query'
import type { PlayerHarness } from './player-test-fixtures'
import type { CommittedCombatPresentation } from '../../app/infected-preplay/committed-presentation'

// Preserve every field. Only the one real scope reference is bijectively renamed.
function renamed(p: CommittedCombatPresentation) { return { ...p, token: { ...p.token, scope: 'scope-reference-0' } } }
function record(h: PlayerHarness) {
  const app = createPreplayController(h), before = normalize(h.player.query()), request = { action: choose(h.player, 'combat', '防御') }
  const p = presentationOf(commit(app, request)); expectClosedPresentation(p)
  const bad = app.execute({ action: { selection: 'opaque' } })
  return { before, after: normalize(h.player.query()), result: normalize({ ...bad }), payload: renamed(p), scope: p.token.scope }
}
function equalPublicAndPayload(a: ReturnType<typeof record>, b: ReturnType<typeof record>) {
  expect(a.before).toEqual(b.before); expect(a.after).toEqual(b.after); expect(a.result).toEqual(b.result)
  expect(a.scope).not.toBe(b.scope); expect(a.payload).toEqual(b.payload)
  expect(JSON.stringify([a.payload, b.payload])).not.toMatch(/PRIVATE|instanceId|seed|riskIndex|infectionProgress|trace|enemyResponses|currentCtb/)
}
describe('B1 K15 whole-output native noninterference, not a field-name scan', () => {
  it('different native execution/seed/item/battle identities compare under one-to-one scope renaming', () => {
    const pairs = ['alpha', 'beta'].map(tag => {
      const deps = createInfectedCombatDependencies('combat-test-character'), materials = initialMaterials(deps.supply, 'crow', 'engineer')
      materials.execution.runId = 'PRIVATE-execution-'+tag; materials.execution.seed = 'PRIVATE-seed-'+tag
      const h = playerHarness({ dependencies: deps, materials }); begin(h)
      for (const label of ['大厅', '后勤控制间', '岗亭', '登记室', '装卸场']) send(h.player, 'move', label)
      return { privateBattle: h.owner.getState().current!.battle!.entry.id, output: record(h) }
    })
    expect(pairs[0].privateBattle).not.toBe(pairs[1].privateBattle)
    equalPublicAndPayload(pairs[0].output, pairs[1].output)
  })
  it('same approved current band with hidden progress/exposure has identical complete before/after/result/payload', () => {
    const rows = [0, 2].map(hidden => {
      const f = fixture(), body = bodyBoundary(f.value, f.deps, { infectionProgress: hidden ? 20 : 1,
        condition: { ...f.value.character.body.condition, pendingInfectionExposures: hidden } })
      let v = body
      for (const node of ['H1', 'H7', 'L0', 'L1', 'L2']) v = f.move(v, node).snapshot
      return record(fromValue(v, f.deps))
    })
    equalPublicAndPayload(rows[0], rows[1])
  })
  it('same-stage different real enemy HP after native retreat/repair/rest/reentry preserves the entire payload', () => {
    const rows = [true, false].map(charged => {
      const f = fixture({ hp: charged ? 10 : 12 }); let v = f.move(f.value, 'H1').snapshot
      v = f.source(v, 'H1-search', { method: 'dark' }).snapshot
      const metal = v.site!.ground.find(g => g.nodeId === 'H1')!.items.find(i => i.definitionId === 'material_metal_parts')!
      v = f.inventory(v, 'pickup', { instanceId: metal.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
      for (const node of ['H7', 'L0', 'L1', 'L2']) v = f.move(v, node).snapshot
      for (const kind of charged ? ['metal-pipe-charged-strike', 'defend', 'defend'] as const : ['metal-pipe-basic-attack', 'metal-pipe-basic-attack'] as const)
        v = f.action(v, { kind }).snapshot
      v = f.action(v, { kind: 'escape' }).snapshot
      v = planCombatMaintenance(v, { kind: 'mechanical', expectedRevision: v.character.revision,
        inputs: [{ instanceId: metal.instanceId, quantity: 1 }], allocations: [{ instanceId: v.carried.equipment.weapon!.instanceId, amount: 15 }] }, f.authorize(v)).plan.snapshot
      v = planCombatRest(v, { kind: 'rest', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
      v = f.move(v, 'L2').snapshot
      return { hp: v.site!.enemies.find(e => e.id === 'porter')!.state.currentHealth, output: record(fromValue(v, f.deps)) }
    })
    expect(rows[0].hp).not.toBe(rows[1].hp); equalPublicAndPayload(rows[0].output, rows[1].output)
  })
  it('K03 known/unknown are actual A facts at the same node; public enemy and stage changes are positive controls', () => {
    const outputs = (['orderly', 'porter', 'technician'] as const).map(enemy => {
      const f = entered(enemy); return record(fromValue(f.value, f.deps)).payload
    })
    expect(new Set(outputs.map(p => p.opponent.visualKey)).size).toBe(3)
    const f = entered(), h = fromValue(f.value, f.deps)
    const unknown = wrapPlayerSession(h.owner, h.policy, { ...labels, opponent: () => ({ kind: 'unknown', visualKey: null, name: '当前对手' }) })
    const app = createPreplayController(unknown), p = presentationOf(commit(app, { action: choose(unknown.player, 'combat', '金属管攻击') }))
    expectClosedPresentation(p); expect(p.opponent).toEqual({ kind: 'unknown', visualKey: null, name: '当前对手' })
    const q = presentationOf(commit(app, { action: choose(unknown.player, 'combat', '防御') }))
    expect(q.stageBefore).not.toBe(p.stageBefore); expect(q.stageBefore).toBe(p.stageAfter)
  })
})
