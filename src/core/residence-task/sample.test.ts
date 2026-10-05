import { describe, expect, it, vi } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { fixture as makeFixture, atNode, resolvedDanger } from './test-fixtures'
import { createSupplyAuthority } from '../residence-supply/authority'
import { cycleContext } from '../residence-supply/validation'
import { planSupplyTaskAction } from './actions'
import { consumeSupplyDeath } from '../residence-terminal/supply-terminal'
import { drawIntInclusive } from '../random'
import { querySupplyKnownObjects } from '../residence-supply/queries'
describe('P03 P10 actual sample, risk and action death', () => {
  it('different seeds can give opposite actual pollution while pre-action safe known-object query is identical', () => {
    let exposed: ReturnType<typeof querySupplyKnownObjects> | null = null
    let clean: ReturnType<typeof querySupplyKnownObjects> | null = null
    for (let n = 0; n < 32 && (!exposed || !clean); n++) {
      const f = fixture({ seed: 'pollution-probe-' + n }), root = atNode(f, resolvedDanger(f), 'H5')
      const armor = root.carried.equipment.armor!
      const v = { ...root, itemStates: { states: root.itemStates.states.map(s => s.instanceId === armor.instanceId ?
        { ...s, resource: { kind: 'integrity' as const, current: 0 } } : s) } }
      const view = querySupplyKnownObjects(v, f.dependencies)
      const p = planSupplyTaskAction(v, { kind: 'task', expectedRevision: v.character.revision, actionId: 'sample', method: 'direct',
        placement: { x: 0, y: 0, rotated: false } }, f.authorize(v))
      if (p.snapshot.character.body.condition.pendingInfectionExposures) exposed = view; else clean = view
      expect(p.snapshot.itemStates.states.find(s => s.instanceId === armor.instanceId)!.resource).toEqual({ kind: 'integrity', current: 0 })
    }
    expect(exposed).not.toBeNull(); expect(clean).not.toBeNull(); expect(exposed).toEqual(clean)
  })
  it.each(['cautious', 'direct'] as const)('%s obtains real sample and preserves coat last-use semantics', method => {
    const f = fixture(), draw = vi.fn(drawIntInclusive), deps = { ...f.dependencies, draw }
    const v0 = atNode(f, resolvedDanger(f), 'H5'), armor = v0.carried.equipment.armor!
    const v = { ...v0, itemStates: { states: v0.itemStates.states.map(s => s.instanceId === armor.instanceId ?
      { ...s, resource: { kind: 'integrity' as const, current: 1 } } : s) } }
    const auth = createSupplyAuthority(v, { cycle: cycleContext(v.character, deps, 'H5'), missions: v.missions }, deps)
    const p = planSupplyTaskAction(v, { kind: 'task', expectedRevision: v.character.revision, actionId: 'sample', method,
      placement: { x: 0, y: 0, rotated: false } }, auth)
    expect(p.snapshot.carried.backpack.items[0]).toMatchObject({ definitionId: 'quest_sealed_pathogen_case', quantity: 1 })
    expect(p.snapshot.itemStates.states.find(s => s.instanceId === armor.instanceId)!.resource).toEqual({ kind: 'integrity', current: 0 })
    expect(draw).toHaveBeenCalledTimes(method === 'cautious' ? 0 : 1)
    if (method === 'cautious') expect(p.snapshot.character.body.condition.pendingInfectionExposures).toBe(0)
  })
  it('rejects overlap/out-of-bounds before pollution entropy', () => {
    const f = fixture(), draw = vi.fn(drawIntInclusive), deps = { ...f.dependencies, draw }
    const v = atNode(f, resolvedDanger(f), 'H5')
    const auth = createSupplyAuthority(v, { cycle: cycleContext(v.character, deps, 'H5'), missions: v.missions }, deps)
    expect(() => planSupplyTaskAction(v, { kind: 'task', expectedRevision: v.character.revision, actionId: 'sample', method: 'direct',
      placement: { x: 5, y: 3, rotated: false } }, auth)).toThrow()
    expect(draw).not.toHaveBeenCalled()
    expect(v.carried.backpack.items).toEqual([])
  })
  it('sample primary happens before paid bleeding death; A consumes same result without revision or draw replay', () => {
    const f = fixture({ hp: 1, bleeding: true }), v = atNode(f, resolvedDanger(f), 'H5'), auth = f.authorize(v)
    const p = planSupplyTaskAction(v, { kind: 'task', expectedRevision: v.character.revision, actionId: 'sample', method: 'cautious',
      placement: { x: 0, y: 0, rotated: false } }, auth)
    expect(p.outcome).toBe('death')
    expect(p.steps.map(s => s.kind)).toEqual(['primary', 'action-bleeding'])
    expect(p.snapshot.carried.backpack.items[0].definitionId).toBe('quest_sealed_pathogen_case')
    const terminal = consumeSupplyDeath(v, p, auth)
    expect(terminal.snapshot.phase).toBe('dead')
    expect(terminal.snapshot.character.revision).toBe(v.character.revision + 1)
    expect(terminal.snapshot.dispositions.find(d => d.item.definitionId === 'quest_sealed_pathogen_case')!.kind).toBe('death-unavailable')
    expect(terminal.snapshot.receipts[0].reward).toBe(0)
    expect(() => consumeSupplyDeath(v, structuredClone(p), auth)).toThrow()
  })
})
