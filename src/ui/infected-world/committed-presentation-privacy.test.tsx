import { afterEach, describe, expect, it, vi } from 'vitest'
import { fixture, bodyBoundary } from '../../state/residence-save/combat-test-fixtures'
import { playerHarness, begin, send } from '../../state/residence-session/player-test-fixtures'
import { initialMaterials } from '../../state/residence-session/supply-test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { planCombatMaintenance, planCombatRest } from '../../core/residence-combat/controlled'
import { normalize } from '../../state/residence-session/player-test-fixtures'
import { mountPresentation, strictRecords, completeDom } from './committed-presentation-test-fixtures'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.replaceChildren() })
async function output(records: ReturnType<typeof strictRecords>) {
  const h = await mountPresentation({ records })
  try {
    const beforeView = normalize(h.view()), before = completeDom(h.host)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); await h.combat('防御')
    const after = completeDom(h.host), cue = h.cue().outerHTML, afterView = normalize(h.view())
    expect(h.cue().querySelectorAll('span')).toHaveLength(1)
    expect(h.host.innerHTML).not.toMatch(/infectionProgress|pendingInfectionExposures|riskIndex|enemyResponses|currentCtb|instanceId|runId|PRIVATE-/)
    return { beforeView, afterView, before, after, cue }
  } finally { await h.unmount(); vi.useRealTimers() }
}
describe('C1 whole native public graph / DOM / aria / cue noninterference', () => {
  it('same public band with different hidden disease progress and exposure preserves every field and ordered DOM attribute', async () => {
    const rows = []
    for (const hidden of [0, 2]) {
      const f = fixture(); let value = bodyBoundary(f.value, f.deps, { infectionProgress: hidden ? 20 : 1,
        condition: { ...f.value.character.body.condition, pendingInfectionExposures: hidden } })
      for (const node of ['H1', 'H7', 'L0', 'L1', 'L2']) value = f.move(value, node).snapshot
      rows.push(await output(strictRecords(value, f.deps)))
    }
    expect(rows[0]).toEqual(rows[1])
  })
  it('different real character/seed/item/battle identities retain identical complete DOM and feedback structure', async () => {
    const rows = [], ids = []
    for (const tag of ['alpha', 'beta']) {
      const deps = createInfectedCombatDependencies('PRIVATE-character-' + tag), materials = initialMaterials(deps.supply, 'crow', 'engineer')
      const seed = 'PRIVATE-seed-' + tag, runId = 'PRIVATE-execution-' + tag
      materials.execution.runId = runId; materials.execution.seed = seed
      const h = playerHarness({ dependencies: deps, materials }); begin(h)
      for (const label of ['大厅', '后勤控制间', '岗亭', '登记室', '装卸场']) send(h.player, 'move', label)
      const value = h.owner.getState().current!
      ids.push({ battle: value.battle!.entry.id, weapon: value.carried.equipment.weapon!.instanceId })
      rows.push(await output(strictRecords(value, h.deps, seed, runId)))
    }
    expect(ids[0].battle).not.toBe(ids[1].battle); expect(ids[0].weapon).not.toBe(ids[1].weapon); expect(rows[0]).toEqual(rows[1])
  })
  it('same-stage differing enemy HP after actual retreat/repair/rest/reentry does not change before/after DOM or the action cue', async () => {
    const rows = [], health = []
    for (const charged of [true, false]) {
      const f = fixture({ hp: charged ? 10 : 12 }); let value = f.move(f.value, 'H1').snapshot
      value = f.source(value, 'H1-search', { method: 'dark' }).snapshot
      const metal = value.site!.ground.find(g => g.nodeId === 'H1')!.items.find(i => i.definitionId === 'material_metal_parts')!
      value = f.inventory(value, 'pickup', { instanceId: metal.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
      for (const node of ['H7', 'L0', 'L1', 'L2']) value = f.move(value, node).snapshot
      for (const kind of charged ? ['metal-pipe-charged-strike', 'defend', 'defend'] as const : ['metal-pipe-basic-attack', 'metal-pipe-basic-attack'] as const) value = f.action(value, { kind }).snapshot
      value = f.action(value, { kind: 'escape' }).snapshot
      value = planCombatMaintenance(value, { kind: 'mechanical', expectedRevision: value.character.revision,
        inputs: [{ instanceId: metal.instanceId, quantity: 1 }], allocations: [{ instanceId: value.carried.equipment.weapon!.instanceId, amount: 15 }] }, f.authorize(value)).plan.snapshot
      value = planCombatRest(value, { kind: 'rest', expectedRevision: value.character.revision }, f.authorize(value)).snapshot
      value = f.move(value, 'L2').snapshot; health.push(value.site!.enemies.find(e => e.id === 'porter')!.state.currentHealth)
      rows.push(await output(strictRecords(value, f.deps)))
    }
    expect(health[0]).not.toBe(health[1]); expect(rows[0]).toEqual(rows[1])
  })
})
