import { describe, expect, it } from 'vitest'
import { fixture, bodyBoundary, entered } from './combat-test-fixtures'
import { fromValue, ready, normalize, choose } from './player-test-fixtures'
import { playerHarness, begin, send } from './player-test-fixtures'
import { initialMaterials } from './supply-test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { planCombatMaintenance, planCombatRest } from '../../core/residence-combat/controlled'

describe('A complete DTO, metadata, preview and error noninterference', () => {
  it('private execution/seed/issued item identities differ while entire public graph stays equal', () => {
    const records = ['alpha', 'beta'].map(tag => {
      const deps = createInfectedCombatDependencies('combat-test-character'), materials = initialMaterials(deps.supply, 'crow', 'engineer')
      materials.execution.runId = 'PRIVATE-execution-' + tag; materials.execution.seed = 'PRIVATE-seed-' + tag
      const h = playerHarness({ dependencies: deps, materials }); begin(h)
      for (const label of ['大厅', '后勤控制间', '岗亭', '登记室', '装卸场']) send(h.player, 'move', label)
      const query = ready(h.player), action = choose(h.player, 'combat', '金属管攻击')
      const result = { query, preview: h.player.preview({ action }), description: h.preplay.describeAction(action),
        invalid: h.player.execute({ action: { selection: 'opaque' } }) }
      expect(JSON.stringify(result)).not.toContain('PRIVATE')
      return { value: h.owner.getState().current!, public: normalize(result) }
    })
    expect(records[0].value.battle!.entry.id).not.toBe(records[1].value.battle!.entry.id)
    expect(records[0].value.carried.equipment.weapon!.instanceId).not.toBe(records[1].value.carried.equipment.weapon!.instanceId)
    expect(records[0].public).toEqual(records[1].public)
  })
  it('same approved burden with different hidden exposure/progress yields equal complete query/preview/errors', () => {
    const records = [0, 2].map(hidden => {
      const f = fixture(), base = bodyBoundary(f.value, f.deps, { infectionProgress: hidden ? 20 : 1,
        condition: { ...f.value.character.body.condition, pendingInfectionExposures: hidden } })
      let v = base
      for (const node of ['H1', 'H7', 'L0', 'L1', 'L2']) v = f.move(v, node).snapshot
      const h = fromValue(v, f.deps), query = ready(h.player)
      return normalize({ query,
        choices: query.combat!.actions.map(a => ({ preview: h.player.preview({ action: a.selector }), description: h.preplay.describeAction(a.selector) })),
        rejection: h.player.execute({ action: {} }) })
    })
    expect(records[0]).toEqual(records[1])
  })
  it('different real HP inside the same public phase compares entire DTO after native retreat/maintenance/rest/reentry', () => {
    const records = [true, false].map(charged => {
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
      const remote = ready(fromValue(v, f.deps).player); expect(remote.combat).toBeNull()
      v = f.move(v, 'L2').snapshot
      const h = fromValue(v, f.deps), query = ready(h.player), action = choose(h.player, 'combat', '退却')
      return { hp: v.site!.enemies.find(e => e.id === 'porter')!.state.currentHealth,
        phase: query.combat!.enemyStage, output: normalize({ remote, query, preview: h.player.preview({ action }),
          description: h.preplay.describeAction(action), rejection: h.player.execute({ action: {} }) }) }
    })
    expect(records[0].hp).not.toBe(records[1].hp); expect(records[0].phase).toBe(records[1].phase)
    expect(records[0].output).toEqual(records[1].output)
  })
  it('public enemy class is a positive control, while unreached hidden enemies have no query branch', () => {
    const views = (['orderly', 'porter', 'technician'] as const).map(enemy => {
      const f = entered(enemy); return ready(fromValue(f.value, f.deps).player).combat!.opponent
    })
    expect(new Set(views.map(v => v.visualKey)).size).toBe(3)
    expect(new Set(views.map(v => v.name)).size).toBe(3)
    const f = fixture(); expect(ready(fromValue(f.value, f.deps).player).combat).toBeNull()
  })
})
