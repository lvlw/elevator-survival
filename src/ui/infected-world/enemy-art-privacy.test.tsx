import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { boundaryRecords } from '../../../docs/engineering/world-integration/preplay/browser-owner/validation/browser-cases'
import { fixture, bodyBoundary, quietDraw } from '../../state/residence-save/combat-test-fixtures'
import { createCombatTestFactory } from '../../core/residence-combat/test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { planCombatMaintenance, planCombatRest } from '../../core/residence-combat/controlled'
import { completeDom, mountPresentation, strictRecords } from './committed-presentation-test-fixtures'
import { installEnemyArtImages } from './enemy-art-test-fixtures'
let images: ReturnType<typeof installEnemyArtImages>
beforeEach(() => { images = installEnemyArtImages() })
afterEach(() => { images.restore(); vi.restoreAllMocks(); document.body.replaceChildren() })
describe('C2 complete ordered production DOM privacy with ready images', () => {
  it('different actual enemy HP in one public stage after native retreat/repair/rest/reentry has identical complete ordered DOM', async () => {
    const rows: { hp: number; stage: string; dom: ReturnType<typeof completeDom> }[] = []
    for (const charged of [true, false]) {
      const f = fixture({ hp: charged ? 10 : 12 }); let v = f.move(f.value, 'H1').snapshot
      v = f.source(v, 'H1-search', { method: 'dark' }).snapshot
      const metal = v.site!.ground.find(g => g.nodeId === 'H1')!.items.find(i => i.definitionId === 'material_metal_parts')!
      v = f.inventory(v, 'pickup', { instanceId: metal.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
      for (const node of ['H7', 'L0', 'L1', 'L2']) v = f.move(v, node).snapshot
      for (const kind of charged ? ['metal-pipe-charged-strike', 'defend', 'defend'] as const : ['metal-pipe-basic-attack', 'metal-pipe-basic-attack'] as const) v = f.action(v, { kind }).snapshot
      v = f.action(v, { kind: 'escape' }).snapshot
      v = planCombatMaintenance(v, { kind: 'mechanical', expectedRevision: v.character.revision, inputs: [{ instanceId: metal.instanceId, quantity: 1 }],
        allocations: [{ instanceId: v.carried.equipment.weapon!.instanceId, amount: 15 }] }, f.authorize(v)).plan.snapshot
      v = planCombatRest(v, { kind: 'rest', expectedRevision: v.character.revision }, f.authorize(v)).snapshot; v = f.move(v, 'L2').snapshot
      const h = await mountPresentation({ records: strictRecords(v, f.deps) })
      try {
        await images.finish(); expect(h.host.querySelector('img.iw-enemy-art-raster')).not.toBeNull()
        rows.push({ hp: v.site!.enemies.find(e => e.id === 'porter')!.state.currentHealth, stage: h.view().combat!.enemyStage, dom: completeDom(h.host) })
        expect(h.setItem).not.toHaveBeenCalled()
      } finally { await h.unmount() }
    }
    expect(rows[0].hp).not.toBe(rows[1].hp); expect(rows[0].stage).toBe(rows[1].stage); expect(rows[0].dom).toEqual(rows[1].dom)
  })
  it('different real seeds and hidden body progress/exposures with the same public facts have identical complete ordered DOM', async () => {
    const output: ReturnType<typeof completeDom>[] = []
    const factory = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
    for (const [seed, infectionProgress, pending] of [['C2-private-seed-A', 61, 0], ['C2-private-seed-B', 89, 2]] as const) {
      const f = factory.entered('orderly', { seed, draw: quietDraw })
      const v = bodyBoundary(f.value, f.deps, { infectionProgress, condition: { ...f.value.character.body.condition, pendingInfectionExposures: pending } })
      const h = await mountPresentation({ records: strictRecords(v, f.deps, seed) })
      try {
        await images.finish(); output.push(completeDom(h.host)); expect(h.host.querySelector('img.iw-enemy-art-raster')).not.toBeNull()
        expect(h.host.innerHTML).not.toMatch(/C2-private-seed|infectionProgress|pendingInfectionExposures|enemyHealth|runSeed|sourceSha256|sourceFoot|sourceHit|gitBlob/)
        expect(h.setItem).not.toHaveBeenCalled(); expect(h.entropy).not.toHaveBeenCalled()
      } finally { await h.unmount() }
    }
    expect(output[0]).toEqual(output[1])
  })
  it('positive control: three different formal public opponents really change the full DOM and visible image', async () => {
    const dom: string[] = [], src: string[] = []
    for (const enemy of ['orderly', 'porter', 'technician'] as const) {
      const h = await mountPresentation({ records: boundaryRecords(enemy) })
      try { await images.finish(); dom.push(completeDom(h.host).html); src.push(h.host.querySelector('img.iw-enemy-art-raster')!.getAttribute('src')!) } finally { await h.unmount() }
    }
    expect(new Set(dom).size).toBe(3); expect(new Set(src).size).toBe(3)
  })
})
