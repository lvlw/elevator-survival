import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { fixture as makeFixture, resolvedDanger, realMove, pickAlias } from '../residence-task/test-fixtures'
import { planSupplyTaskAction } from '../residence-task/actions'
import { planSupplyTaskTransfer } from '../residence-task/transfer'
import * as sources from '../residence-task/sources'
import * as taskPlans from '../residence-task/plans'
import * as itemTransfers from '../residence-location/items'
import * as energy from '../residence-energy'
import * as cycle from '../character-cycle'
import * as allocations from './allocations'
import * as plans from './plans'
import * as lifecycle from '../mission-lifecycle/controlled'
import * as location from '../residence-location/movement'
import * as condition from '../condition'
import * as resources from '../item-state'
import { atNode, searchAt } from '../residence-task/test-fixtures'
import { planSupplyMaintenance } from './maintenance'
import * as terminal from '../residence-terminal/supply-terminal'
import { planSupplyRest } from './controlled'
import { planSupplyMedical } from './medical'
import { createSupplyAuthority } from './authority'
import { cycleContext, readSupplyValue } from './validation'
import type { SupplyValue } from './types'
afterEach(() => vi.restoreAllMocks())
describe('P12 native first departure and complete producer route (danger-cleared TEST prestate, no CTB)', () => {
  it('real single-edge long chain sources, rest, component transport, module, sample, install, success', () => {
    const f = fixture()
    let v = resolvedDanger(f)
    const move = (edge: string) => { v = realMove(f, v, edge) }
    const act = (actionId: string, extra = {}) => { v = planSupplyTaskAction(v,
      { kind: 'task', expectedRevision: v.character.revision, actionId, ...extra }, f.authorize(v)).snapshot }
    const rest = () => { v = planSupplyRest(v, { kind: 'rest', expectedRevision: v.character.revision }, f.authorize(v)).snapshot }
    move('H0-H1:forward')
    v = sources.planSupplySourceReveal(v, { kind: 'reveal', expectedRevision: v.character.revision, sourceId: 'H1-search', method: 'dark' }, f.authorize(v)).snapshot
    v = pickAlias(f, v, 'metal', 4)
    act('fire-door', { method: 'toolbox', toolInstanceId: v.carried.equipment.utility!.instanceId })
    v = pickAlias(f, v, 'electronic', 5)
    move('H1-H7:forward'); move('H7-L0:forward'); move('L0-L1:forward')
    act('l1-open', { method: 'manual' })
    v = sources.planSupplySourceReveal(v, { kind: 'reveal', expectedRevision: v.character.revision, sourceId: 'L1-cabinet' }, f.authorize(v)).snapshot
    v = pickAlias(f, v, 'food', 4, 1); v = pickAlias(f, v, 'bandage', 5, 1)
    rest()
    move('L1-L2:forward'); act('verify', { method: 'full' }); act('fix', { method: 'manual' })
    act('component', { placement: { x: 0, y: 0, rotated: false } })
    const component = v.carried.backpack.items.find(i => i.definitionId === 'draft_transfer_control_component')!
    const componentState = v.itemStates.states.find(s => s.instanceId === component.instanceId)
    v = planSupplyTaskTransfer(v, { kind: 'task-drop', expectedRevision: v.character.revision, instanceId: component.instanceId }, f.authorize(v)).snapshot
    rest()
    v = planSupplyTaskTransfer(v, { kind: 'task-pickup', expectedRevision: v.character.revision, instanceId: component.instanceId,
      placement: { x: 0, y: 0, rotated: false } }, f.authorize(v)).snapshot
    expect(v.carried.backpack.items).toContainEqual(component)
    expect(v.itemStates.states.find(s => s.instanceId === component.instanceId)).toEqual(componentState)
    move('L1-L2:reverse'); move('L0-L1:reverse'); move('L0-C0:forward'); move('C0-C1:forward')
    act('match', { method: 'fast' }); act('c-gate', { method: 'manual' })
    move('C1-C2:forward'); move('C2-C3:forward'); act('module', { placement: { x: 2, y: 0, rotated: false } })
    move('C2-C3:reverse'); move('C1-C2:reverse')
    const food = v.carried.backpack.items.find(i => i.definitionId === f.dependencies.tasks.data.items.find(i => i.alias === 'food')!.id)!
    v = planSupplyMedical(v, { kind: 'medical', expectedRevision: v.character.revision, instanceId: food.instanceId }, f.authorize(v)).snapshot
    rest()
    move('C0-C1:reverse'); move('C0-H0:forward'); move('H0-H1:forward'); move('H1-H4:forward'); move('H4-H5:forward')
    act('sample', { method: 'cautious', placement: { x: 0, y: 2, rotated: false } })
    const sample = v.carried.backpack.items.find(i => i.definitionId === 'quest_sealed_pathogen_case')!
    move('H4-H5:reverse'); move('H1-H4:reverse'); move('H1-H7:forward'); move('H7-H8:forward')
    // Power is a real source on its separate route, never a hand-authored completed flag.
    move('H7-H8:reverse'); move('H7-L0:forward'); move('P0-L0:reverse'); move('P0-P1:forward')
    act('power-survey'); act('power'); rest()
    move('P0-P1:reverse'); move('P0-L0:forward'); move('H7-L0:reverse'); move('H7-H8:forward')
    const aliases = ['component', 'module', 'metal', 'electronic']
    const inputs = aliases.map(alias => ({ instanceId: v.carried.backpack.items.find(i => i.definitionId ===
      f.dependencies.tasks.data.items.find(d => d.alias === alias)!.id)!.instanceId, quantity: 1 }))
    act('install', { inputs })
    expect(v.dispositions.filter(d => d.kind === 'installed')).toHaveLength(4)
    move('H7-H8:reverse'); move('H1-H7:reverse'); move('H0-H1:reverse')
    const returned = terminal.planSupplyTerminal(v, { kind: 'deliver', expectedRevision: v.character.revision }, f.authorize(v))
    expect(returned.steps).toEqual([])
    expect(returned.snapshot.balance).toBe(120)
    expect(returned.snapshot.phase).toBe('living-hub')
    expect(returned.snapshot.dispositions.find(d => d.kind === 'delivered')!.item).toEqual(sample)
    expect(returned.snapshot.archives[0].site.enemies).toHaveLength(3)
    expect(readSupplyValue(structuredClone(returned.snapshot), f.dependencies)).toEqual(returned.snapshot)
  })
})
describe('P10 P12 native independent producer counts', () => {
  it('new task and maintenance death each perform one body action then consume once, no rerun/draw/revision', () => {
    for (const producer of ['task', 'maintenance'] as const) {
      const f = fixture({ hp: producer === 'task' ? 1 : 2, bleeding: true })
      let v = f.value
      if (producer === 'maintenance') v = pickAlias(f, searchAt(f, v, 'H1-search'), 'metal', 0)
      else v = realMove({ ...f, value: v }, { ...v, character: { ...v.character, body: { ...v.character.body, condition: { ...v.character.body.condition, bleeding: false } } } }, 'H0-H1:forward')
      v = readSupplyValue({ ...v, character: { ...v.character, body: { ...v.character.body, condition: { ...v.character.body.condition, currentHealth: 1, bleeding: true } } },
        itemStates: { states: v.itemStates.states.map(s => s.instanceId === v.carried.equipment.weapon!.instanceId ? { ...s, resource: { kind: 'durability' as const, current: 0 } } : s) } }, f.dependencies)
      const actions = vi.spyOn(energy, 'planResidenceAction'), cycles = vi.spyOn(cycle, 'planCharacterCycle'),
        origins = vi.spyOn(allocations, 'issueSupplyOrigin'), issued = vi.spyOn(plans, 'issueSupplyPlan'), closes = vi.spyOn(lifecycle, 'terminateMission')
      const p = producer === 'task' ? planSupplyTaskAction(v, { kind: 'task', expectedRevision: v.character.revision, actionId: 'fire-door', method: 'toolbox', toolInstanceId: v.carried.equipment.utility!.instanceId }, f.authorize(v)) :
        planSupplyMaintenance(v, { kind: 'mechanical', expectedRevision: v.character.revision, allocations: [{ instanceId: v.carried.equipment.weapon!.instanceId, amount: 15 }], inputs: [{ instanceId: v.carried.backpack.items[0].instanceId, quantity: 1 }] }, f.authorize(v)).plan
      const count = [actions.mock.calls.length, cycles.mock.calls.length, origins.mock.calls.length, issued.mock.calls.length, closes.mock.calls.length]
      expect(count).toEqual([1, 0, producer === 'task' ? 1 : 0, 1, 0])
      expect(p.steps.map(s => s.kind)).toEqual(['primary', 'action-bleeding'])
      const end = terminal.consumeSupplyDeath(v, p, f.authorize(v))
      expect([actions.mock.calls.length, cycles.mock.calls.length, origins.mock.calls.length, issued.mock.calls.length, closes.mock.calls.length])
        .toEqual([1, 0, producer === 'task' ? 1 : 0, 2, 1])
      expect(end.snapshot.character.revision).toBe(v.character.revision + 1)
      vi.restoreAllMocks()
    }
  })
  it('real G2 movement death is consumed unchanged, no G1/G2 replay', () => {
    const f = fixture({ hp: 1, bleeding: true }), v = f.value
    const actions = vi.spyOn(energy, 'planResidenceAction'), cycles = vi.spyOn(cycle, 'planCharacterCycle'), closes = vi.spyOn(lifecycle, 'terminateMission')
    const p = location.planResidenceMove({ character: v.character, site: v.site, carried: v.carried, itemStates: v.itemStates },
      { kind: 'move', binding: v.site!.binding, expectedRevision: v.character.revision, edgeId: 'H0-H1:forward' },
      { cycle: cycleContext(v.character, f.dependencies, 'H0'), mission: v.missions.find(m => m.status === 'active')! },
      { residence: f.dependencies.residence, catalog: f.dependencies.catalog })
    expect(p.coordination).toBe('death-required')
    const end = terminal.consumeSupplyLocationDeath(v, p, f.authorize(v))
    expect([actions.mock.calls.length, cycles.mock.calls.length, closes.mock.calls.length]).toEqual([1, 0, 1])
    expect(end.steps).toEqual(p.steps); expect(end.snapshot.character.revision).toBe(v.character.revision + 1)
  })
  it.each(['home', 'remote'] as const)('Day7 %s retains independent cycle and termination counts', where => {
    const f = fixture(), root = atNode(f, f.value, where === 'home' ? 'H0' : 'H1')
    if (root.character.clock.kind !== 'active') throw new Error('Clock')
    const v = { ...root, character: { ...root.character, cycle: 7, clock: { ...root.character.clock, taskDay: 7 } } }
    const actions = vi.spyOn(energy, 'planResidenceAction'), cycles = vi.spyOn(cycle, 'planCharacterCycle'), closes = vi.spyOn(lifecycle, 'terminateMission')
    const end = terminal.planSupplyTerminal(v, { kind: where === 'home' ? 'withdraw' : 'deadline', expectedRevision: v.character.revision }, f.authorize(v))
    expect([actions.mock.calls.length, cycles.mock.calls.length, closes.mock.calls.length]).toEqual([0, 1, 1])
    expect(end.steps.map(s => s.kind)).toEqual(where === 'home' ? [] : ['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
  })
  it('H1 real source then H0 closure counts; pre-reject vs producer fault remain distinct', () => {
    const f = fixture({ hp: 8 })
    const arrived = realMove(f, f.value, 'H0-H1:forward')
    const base = readSupplyValue({ ...arrived, itemStates: { states: arrived.itemStates.states.map(s =>
      s.instanceId === arrived.carried.equipment.weapon!.instanceId ? { ...s, resource: { kind: 'durability', current: 0 } } : s) } }, f.dependencies)
    const draw = vi.fn(f.dependencies.draw), deps = { ...f.dependencies, draw }
    const authorize = (v: SupplyValue) => createSupplyAuthority(v, { cycle: cycleContext(v.character, deps, v.site?.nodeId ?? null), missions: v.missions }, deps)
    const actions = vi.spyOn(energy, 'planResidenceAction'), cycles = vi.spyOn(cycle, 'planCharacterCycle'),
      origins = vi.spyOn(allocations, 'issueSupplyOrigin'), issued = vi.spyOn(plans, 'issueSupplyPlan'),
      closes = vi.spyOn(lifecycle, 'terminateMission'), materialized = vi.spyOn(taskPlans, 'materializeSupplySource'),
      itemMoves = vi.spyOn(itemTransfers, 'planResidenceItemTransfer'),
      medicalEffects = vi.spyOn(condition, 'restoreHealth'), resourceEffects = vi.spyOn(resources, 'restoreItemResource'),
      terminalConsumers = vi.spyOn(terminal, 'planSupplyTerminal')
    const req = { kind: 'reveal', expectedRevision: base.character.revision, sourceId: 'H1-search', method: 'dark' }
    const p = sources.planSupplySourceReveal(base, req, authorize(base))
    expect([actions.mock.calls.length, cycles.mock.calls.length, draw.mock.calls.length, origins.mock.calls.length, issued.mock.calls.length, closes.mock.calls.length])
      .toEqual([1, 0, 1, 2, 1, 0])
    expect(materialized).toHaveBeenCalledTimes(2)
    expect(() => sources.planSupplySourceReveal(p.snapshot, { ...req, expectedRevision: p.snapshot.character.revision }, authorize(p.snapshot))).toThrow()
    expect(draw).toHaveBeenCalledTimes(1)
    actions.mockClear(); issued.mockClear()
    const mixed = { ...f, dependencies: deps, authorize }
    const picked = pickAlias(mixed, p.snapshot, 'metal', 0)
    expect([actions.mock.calls.length, itemMoves.mock.calls.length, issued.mock.calls.length]).toEqual([1, 1, 1])
    actions.mockClear(); issued.mockClear()
    const repaired = planSupplyMaintenance(picked, { kind: 'mechanical', expectedRevision: picked.character.revision,
      inputs: [{ instanceId: picked.carried.backpack.items[0].instanceId, quantity: 1 }],
      allocations: [{ instanceId: picked.carried.equipment.weapon!.instanceId, amount: 15 }] }, authorize(picked)).plan
    expect([actions.mock.calls.length, issued.mock.calls.length, materialized.mock.calls.length]).toEqual([1, 1, 2])
    expect(resourceEffects).toHaveBeenCalledTimes(1)
    expect(medicalEffects).not.toHaveBeenCalled()
    actions.mockClear(); issued.mockClear()
    const healed = planSupplyMedical(repaired.snapshot, { kind: 'medical', expectedRevision: repaired.snapshot.character.revision,
      instanceId: repaired.snapshot.carried.quickSlots.slots[0]!.instanceId }, authorize(repaired.snapshot)).snapshot
    expect([actions.mock.calls.length, issued.mock.calls.length]).toEqual([1, 1])
    expect(medicalEffects).toHaveBeenCalledTimes(1)
    expect(resourceEffects).toHaveBeenCalledTimes(1)
    const home = realMove(mixed, healed, 'H0-H1:reverse')
    actions.mockClear(); issued.mockClear()
    const end = terminal.planSupplyTerminal(home, { kind: 'withdraw', expectedRevision: home.character.revision }, authorize(home))
    expect(end.steps).toEqual([])
    expect(terminalConsumers).toHaveBeenCalledTimes(1)
    expect([actions.mock.calls.length, cycles.mock.calls.length, draw.mock.calls.length, origins.mock.calls.length, issued.mock.calls.length, closes.mock.calls.length])
      .toEqual([0, 1, 1, 2, 1, 1])
    const brokenDraw = vi.fn(() => { throw new Error('injected entropy producer failure') })
    const broken = { ...f.dependencies, draw: brokenDraw }
    const auth = createSupplyAuthority(base, { cycle: cycleContext(base.character, broken, 'H1'), missions: base.missions }, broken)
    actions.mockClear(); origins.mockClear(); issued.mockClear()
    expect(() => sources.planSupplySourceReveal(base, { ...req, sourceId: 'missing' }, auth)).toThrow()
    expect(brokenDraw).not.toHaveBeenCalled()
    const before = structuredClone(base)
    expect(() => sources.planSupplySourceReveal(base, req, auth)).toThrow('injected entropy producer failure')
    expect([brokenDraw.mock.calls.length, actions.mock.calls.length, origins.mock.calls.length, issued.mock.calls.length]).toEqual([1, 0, 1, 0])
    expect(base).toEqual(before)
  })
})
