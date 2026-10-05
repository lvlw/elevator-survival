import { describe, expect, it, vi } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { fixture as makeFixture, realMove, forcedDraw, searchAt, pickAlias, atNode } from './test-fixtures'
import { planSupplyTaskAction } from './actions'
import { createSupplyAuthority } from '../residence-supply/authority'
import { cycleContext } from '../residence-supply/validation'
import { planSupplySourceReveal } from './sources'
import { assertSupplyPlanCurrent } from '../residence-supply/plans'
import { drawIntInclusive } from '../random'
describe('P05 real fixed and weighted source', () => {
  it.each(['H1', 'H2'] as const)('%s produces fixed and exactly one paired random source once', node => {
    const f = fixture(), draw = vi.fn(drawIntInclusive)
    const deps = { ...f.dependencies, draw }
    const authorize = (v: typeof f.value) => createSupplyAuthority(v, { cycle: cycleContext(v.character, deps, v.site?.nodeId ?? null), missions: v.missions }, deps)
    let value = realMove(f, f.value, 'H0-H1:forward')
    if (node === 'H2') value = realMove(f, value, 'H1-H2:forward')
    const before = structuredClone(value), auth = authorize(value)
    const p = planSupplySourceReveal(value, { kind: 'reveal', expectedRevision: value.character.revision, sourceId: node + '-search', method: 'dark' }, auth)
    expect(draw).toHaveBeenCalledTimes(1)
    expect(value).toEqual(before)
    expect(p.snapshot.origins.filter(o => o.producerId === node + '-random')).toHaveLength(1)
    expect(p.snapshot.productions.filter(o => o.producerId.startsWith(node))).toHaveLength(2)
    expect(p.snapshot.site!.ground.find(g => g.nodeId === node)!.items.length).toBe(2)
    expect(() => planSupplySourceReveal(p.snapshot, { kind: 'reveal', expectedRevision: p.snapshot.character.revision, sourceId: node + '-search', method: 'dark' }, authorize(p.snapshot))).toThrow()
    expect(draw).toHaveBeenCalledTimes(1)
    expect(() => assertSupplyPlanCurrent(p.snapshot, p, authorize(p.snapshot))).toThrow()
  })
  it('rejects inaccessible/random-only source before drawing', () => {
    const f = fixture(), draw = vi.fn(drawIntInclusive), deps = { ...f.dependencies, draw }
    const auth = createSupplyAuthority(f.value, { cycle: cycleContext(f.value.character, deps, 'H0'), missions: f.value.missions }, deps)
    for (const sourceId of ['H1-search', 'H1-random', 'H1-toolbox', 'missing']) expect(() =>
      planSupplySourceReveal(f.value, { kind: 'reveal', expectedRevision: f.value.character.revision, sourceId, method: 'dark' }, auth)).toThrow()
    expect(draw).not.toHaveBeenCalled()
  })
  it.each([['H1', 1, 'battery'], ['H1', 40, 'battery'], ['H1', 41, 'cloth'], ['H1', 70, 'cloth'], ['H1', 71, 'electronic'], ['H1', 100, 'electronic'],
    ['H2', 1, 'disinfect'], ['H2', 35, 'disinfect'], ['H2', 36, 'painkiller'], ['H2', 65, 'painkiller'], ['H2', 66, 'firstaid'], ['H2', 85, 'firstaid'], ['H2', 86, 'suppressant'], ['H2', 100, 'suppressant']] as const)
  ('%s weighted branch boundary %i produces only %s', (node, roll, alias) => {
    const f = forcedDraw(fixture(), roll), v = searchAt(f, f.value, node + '-search')
    const origins = v.origins.filter(o => o.producerId === node + '-random')
    expect(origins).toHaveLength(1)
    expect(origins[0].definitionId).toBe(f.dependencies.tasks.data.items.find(i => i.alias === alias)!.id)
  })
  it('T1 exchange consumes one selected bandage/disinfectant atomically; bad placement consumes nothing', () => {
    const f = forcedDraw(fixture(), 1)
    let v = pickAlias(f, searchAt(f, f.value, 'H2-search'), 'disinfect', 0)
    v = atNode(f, v, 'T1')
    const inputs = [{ instanceId: v.carried.quickSlots.slots[0]!.instanceId, quantity: 1 }, { instanceId: v.carried.backpack.items[0].instanceId, quantity: 1 }]
    const req = { kind: 'reveal', expectedRevision: v.character.revision, sourceId: 'T1-exchange', inputs, placements: [{ x: 0, y: 0, rotated: false }] }
    const before = structuredClone(v)
    expect(() => planSupplySourceReveal(v, { ...req, placements: [{ x: 6, y: 0, rotated: false }] }, f.authorize(v))).toThrow()
    expect(v).toEqual(before)
    expect(() => planSupplySourceReveal(v, { ...req, inputs: [{ ...inputs[0], instanceId: 'remote' }, inputs[1]] }, f.authorize(v))).toThrow()
    const p = planSupplySourceReveal(v, req, f.authorize(v))
    expect(p.snapshot.carried.backpack.items[0]).toMatchObject({ definitionId: f.dependencies.tasks.data.items.find(i => i.alias === 'food')!.id, quantity: 2 })
    expect(p.snapshot.choices.firstBandageUsed).toBe(false)
    expect(p.snapshot.dispositions).toHaveLength(2)
    expect(() => planSupplySourceReveal(p.snapshot, { ...req, expectedRevision: p.snapshot.character.revision }, f.authorize(p.snapshot))).toThrow()
  })
  it('charge 0 rejects lit search, last charge succeeds; first crow opening cannot later claim toolbox award', () => {
    const f = fixture({ tool: 'lamp' }), v = realMove(f, f.value, 'H0-H1:forward'), lamp = v.carried.equipment.utility!
    const withCharge = (current: number) => ({ ...v, itemStates: { states: v.itemStates.states.map(s => s.instanceId === lamp.instanceId ? { ...s, resource: { kind: 'charge' as const, current } } : s) } })
    const req = { kind: 'reveal', sourceId: 'H1-search', method: 'lit', expectedRevision: v.character.revision, toolInstanceId: lamp.instanceId }
    expect(() => planSupplySourceReveal(withCharge(0), req, f.authorize(withCharge(0)))).toThrow()
    const p = planSupplySourceReveal(withCharge(1), req, f.authorize(withCharge(1)))
    expect(p.snapshot.itemStates.states.find(s => s.instanceId === lamp.instanceId)!.resource).toEqual({ kind: 'charge', current: 0 })
    const crow = fixture({ tool: 'crow' }), at = realMove(crow, crow.value, 'H0-H1:forward')
    const opened = planSupplyTaskAction(at, { kind: 'task', actionId: 'fire-door', method: 'crow', toolInstanceId: at.carried.equipment.utility!.instanceId,
      expectedRevision: at.character.revision }, crow.authorize(at)).snapshot
    expect(() => planSupplyTaskAction(opened, { kind: 'task', actionId: 'fire-door', method: 'toolbox', expectedRevision: opened.character.revision,
      toolInstanceId: opened.carried.equipment.utility!.instanceId }, crow.authorize(opened))).toThrow()
    expect(opened.origins.some(o => o.producerId === 'H1-toolbox')).toBe(false)
  })
})
