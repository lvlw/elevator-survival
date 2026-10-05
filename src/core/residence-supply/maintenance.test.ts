import { describe, expect, it } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { fixture as makeFixture, forcedDraw, searchAt, pickAlias } from '../residence-task/test-fixtures'
import { planSupplyMaintenance } from './maintenance'
import { readSupplyValue } from './validation'
import { consumeSupplyDeath } from '../residence-terminal/supply-terminal'
import type { SupplyValue } from './types'
const damage = (f: ReturnType<typeof fixture>, v: SupplyValue, ids: readonly string[], current: number) =>
  readSupplyValue({ ...v, itemStates: { states: v.itemStates.states.map(s => ids.includes(s.instanceId) && s.resource.kind !== 'none' ?
    { ...s, resource: { ...s.resource, current } } : s) } }, f.dependencies)
describe('P08 real maintenance, one pool and primary-before-death', () => {
  it('15 total mechanical pool distributes to two explicit targets, cap waste is not another grant', () => {
    const f = fixture({ tool: 'crow' })
    let v = pickAlias(f, searchAt(f, f.value, 'H1-search'), 'metal', 0)
    const pipe = v.carried.equipment.weapon!, crow = v.carried.equipment.utility!, metal = v.carried.backpack.items[0]
    v = damage(f, v, [pipe.instanceId, crow.instanceId], 1)
    const request = { kind: 'mechanical', expectedRevision: v.character.revision, inputs: [{ instanceId: metal.instanceId, quantity: 1 }],
      allocations: [{ instanceId: pipe.instanceId, amount: 10 }, { instanceId: crow.instanceId, amount: 5 }] }
    const result = planSupplyMaintenance(v, request, f.authorize(v))
    expect(result.resourceResult.map(r => r.restored)).toEqual([10, 5]); expect(result.unusedPool).toBe(0)
    expect(result.plan.snapshot.carried.backpack.items).toEqual([])
    expect(() => planSupplyMaintenance(v, { ...request, allocations: [{ instanceId: pipe.instanceId, amount: 15 }, { instanceId: crow.instanceId, amount: 15 }] }, f.authorize(v))).toThrow()
    expect(() => planSupplyMaintenance(v, { ...request, allocations: [{ instanceId: pipe.instanceId, amount: 7 }, { instanceId: pipe.instanceId, amount: 8 }] }, f.authorize(v))).toThrow()
    const nearly = damage(f, v, [pipe.instanceId], 29)
    const waste = planSupplyMaintenance(nearly, { ...request, allocations: [{ instanceId: pipe.instanceId, amount: 15 }] }, f.authorize(nearly))
    expect(waste.resourceResult[0]).toMatchObject({ restored: 1, unused: 14 }); expect(waste.unusedPool).toBe(14)
  })
  it.each(['coat', 'toolbox', 'recharge'] as const)('%s consumes actual compatible materials and rejects reuse/wrong target', kind => {
    const f = forcedDraw(fixture({ tool: kind === 'recharge' ? 'lamp' : 'toolbox' }), 41)
    let v = searchAt(f, f.value, kind === 'coat' ? 'H1-search' : 'C4-cabinet')
    const aliases = kind === 'coat' ? ['cloth'] : kind === 'toolbox' ? ['metal', 'electronic'] : ['battery']
    aliases.forEach((alias, x) => { v = pickAlias(f, v, alias, x) })
    const target = (kind === 'coat' ? v.carried.equipment.armor : v.carried.equipment.utility)!
    v = damage(f, v, [target.instanceId], 0)
    const inputs = v.carried.backpack.items.map(i => ({ instanceId: i.instanceId, quantity: 1 }))
    const req = { kind, expectedRevision: v.character.revision, instanceId: target.instanceId, inputs }
    const result = planSupplyMaintenance(v, req, f.authorize(v))
    expect(result.resourceResult[0].restored).toBe(kind === 'coat' ? 6 : kind === 'toolbox' ? 3 : 4)
    expect(result.plan.snapshot.carried.backpack.items).toEqual([])
    expect(() => planSupplyMaintenance(result.plan.snapshot, { ...req, expectedRevision: result.plan.snapshot.character.revision }, f.authorize(result.plan.snapshot))).toThrow()
    expect(() => planSupplyMaintenance(v, { ...req, instanceId: v.carried.equipment.weapon!.instanceId }, f.authorize(v))).toThrow()
  })
  it('positive E below cost completes primary then bleeding death; E0 cannot start', () => {
    const f = fixture({ hp: 2, bleeding: true })
    let v = pickAlias(f, searchAt(f, f.value, 'H1-search'), 'metal', 0)
    const pipe = v.carried.equipment.weapon!, metal = v.carried.backpack.items[0]
    v = damage(f, v, [pipe.instanceId], 0)
    v = readSupplyValue({ ...v, character: { ...v.character, body: { ...v.character.body, energy: 1 } } }, f.dependencies)
    const req = { kind: 'mechanical', expectedRevision: v.character.revision, inputs: [{ instanceId: metal.instanceId, quantity: 1 }],
      allocations: [{ instanceId: pipe.instanceId, amount: 15 }] }
    const r = planSupplyMaintenance(v, req, f.authorize(v)), terminal = consumeSupplyDeath(v, r.plan, f.authorize(v))
    expect(r.plan.snapshot.character.body.energy).toBe(0)
    expect(r.plan.outcome).toBe('death'); expect(r.resourceResult[0].restored).toBe(15)
    expect(terminal.snapshot.character.revision).toBe(v.character.revision + 1)
    expect(terminal.snapshot.dispositions.find(d => d.item.instanceId === pipe.instanceId)!.state.resource).toMatchObject({ current: 15 })
    const zero = readSupplyValue({ ...v, character: { ...v.character, body: { ...v.character.body, energy: 0 } } }, f.dependencies)
    expect(() => planSupplyMaintenance(zero, req, f.authorize(zero))).toThrow()
  })
})
