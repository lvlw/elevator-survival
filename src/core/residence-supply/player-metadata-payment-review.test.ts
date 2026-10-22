import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCombatTestFactory } from '../residence-combat/test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { drawIntInclusive } from '../random'
import { readCombatValue } from '../residence-combat/validation'
import { addItemToBackpack } from '../inventory'
import { previewCommittedResourceAction } from '../item-state'
import { planCombatMaintenance, planCombatTransfer } from '../residence-combat/controlled'
import { maintenanceReady } from '../../state/residence-session/combat-test-fixtures'
import { queryPlayerActionMetadata } from './player-metadata'
import { qualifyPlayerCommand } from './player-query'
import { numberValue } from './config'
import type { PlayerCoreCommand } from '../residence-combat/player-query-types'
const { fixture, entered, win } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
const miss = (c: Parameters<typeof drawIntInclusive>[0], min: number, max: number) => ({ ...drawIntInclusive(c, min, max), value: max })
afterEach(() => vi.restoreAllMocks())

describe('R-M01 native public payment parity and adjacent mapping', () => {
  for (const method of ['cautious', 'direct'] as const) it.each(['normal', 1, 0, 'unequipped'] as const)(`${method} sample payment matches native result for %s`, boundary => {
    const h = entered('orderly', { draw: miss }); let v = h.move(win(h, h.value), 'H5').snapshot
    const armor = v.carried.equipment.armor!
    if (typeof boundary === 'number') v = readCombatValue({ ...v, itemStates: { states: v.itemStates.states.map(s => s.instanceId === armor.instanceId
      ? { ...s, resource: { kind: 'integrity', current: boundary } } : s) } }, h.deps)
    // Legal aggregate TEST boundary: preserve the actual coat, state and origin in the backpack.
    // This is not a claim that a player equipment-swap action exists.
    if (boundary === 'unequipped') v = readCombatValue({ ...v, carried: { ...v.carried, equipment: { ...v.carried.equipment, armor: null },
      backpack: addItemToBackpack(v.carried.backpack, armor, { instanceId: armor.instanceId, x: 4, y: 0, rotated: false }, h.deps.supply.catalog.physical) } }, h.deps)
    const c: PlayerCoreCommand = { kind: 'task', command: { kind: 'task', actionId: 'sample', method, expectedRevision: v.character.revision, placement: { x: 0, y: 0, rotated: false } } }
    expect(qualifyPlayerCommand(v, c, h.deps).kind).toBe('available')
    const before = JSON.stringify(v)
    // A legal exhausted/no-coat sample request must remain previewable, not become a hard prerequisite.
    expect(() => queryPlayerActionMetadata(v, c, h.deps)).not.toThrow()
    const metadata = queryPlayerActionMetadata(v, c, h.deps)
    const after = h.task(v, 'sample', c.command).snapshot
    const initial = v.itemStates.states.find(s => s.instanceId === armor.instanceId)!, final = after.itemStates.states.find(s => s.instanceId === armor.instanceId)!
    if (initial.resource.kind !== 'integrity' || final.resource.kind !== 'integrity') throw new Error('TEST needs coat integrity')
    const loss = initial.resource.current - final.resource.current, p = previewCommittedResourceAction(initial, numberValue(h.deps.supply.configuration, 'wear.tool'))
    expect(metadata.resources).toEqual(loss && p.allowed ? [{ name: h.deps.supply.catalog.physical.get(armor.definitionId).name, kind: p.kind,
      before: p.currentBefore, requested: p.requestedCost, consumed: p.consumed, after: p.currentAfter }] : [])
    expect(loss).toBe(boundary === 0 || boundary === 'unequipped' ? 0 : 1)
    expect(after.carried.backpack.items.filter(i => i.definitionId === 'quest_sealed_pathogen_case')).toHaveLength(1)
    expect(JSON.stringify(v)).toBe(before)
    expect(JSON.stringify(metadata)).not.toMatch(/instanceId|riskPercent|effectiveRiskPercent|sample\.risks|sample\.coat_risks|pendingInfectionExposures/)
  })

  for (const tool of ['crow', 'toolbox'] as const) it.each(['normal', 1] as const)(`${tool} fire-door payment remains native for %s`, boundary => {
    const h = fixture({ tool }), s = h.deps.supply; let v = h.move(h.value, 'H1').snapshot
    const item = v.carried.equipment.utility!
    if (boundary === 1) v = readCombatValue({ ...v, itemStates: { states: v.itemStates.states.map(i => i.instanceId === item.instanceId ? { ...i, resource: { kind: 'durability', current: 1 } } : i) } }, h.deps)
    const c: PlayerCoreCommand = { kind: 'task', command: { kind: 'task', actionId: 'fire-door', method: tool, toolInstanceId: item.instanceId, expectedRevision: v.character.revision } }
    expect(qualifyPlayerCommand(v, c, h.deps).kind).toBe('available')
    const metadata = queryPlayerActionMetadata(v, c, h.deps), after = h.task(v, 'fire-door', c.command).snapshot
    const resource = after.itemStates.states.find(i => i.instanceId === item.instanceId)!.resource
    expect(metadata.resources).toHaveLength(1); expect(metadata.resources[0].name).toBe(s.catalog.physical.get(item.definitionId).name)
    expect(metadata.resources[0].after).toBe(resource.kind === 'none' ? null : resource.current)
  })

  it('public sample metadata does not mutate or freeze a validated unfrozen caller', () => {
    const h = entered('orderly', { draw: miss }), v = h.move(win(h, h.value), 'H5').snapshot
    const input = JSON.parse(JSON.stringify(v)) as typeof v, before = JSON.stringify(input)
    expect(readCombatValue(input, h.deps)).toEqual(v)
    const c: PlayerCoreCommand = { kind: 'task', command: { kind: 'task', actionId: 'sample', method: 'cautious', expectedRevision: input.character.revision, placement: { x: 0, y: 0, rotated: false } } }
    expect(queryPlayerActionMetadata(input, c, h.deps).resources).toHaveLength(1)
    expect(JSON.stringify(input)).toBe(before); expect(Object.isFrozen(input)).toBe(false)
    expect(Object.isFrozen(input.carried.equipment.armor)).toBe(false)
    expect(input.itemStates.states.every(s => !Object.isFrozen(s))).toBe(true)
  })

  it('lit source reports only its actual flashlight charge', () => {
    const h = fixture({ tool: 'lamp', draw: miss }), v = h.move(h.value, 'H1').snapshot, lamp = v.carried.equipment.utility!
    const c: PlayerCoreCommand = { kind: 'source', command: { kind: 'reveal', sourceId: 'H1-search', method: 'lit', toolInstanceId: lamp.instanceId, expectedRevision: v.character.revision } }
    expect(qualifyPlayerCommand(v, c, h.deps).kind).toBe('available')
    const metadata = queryPlayerActionMetadata(v, c, h.deps), after = h.source(v, 'H1-search', c.command).snapshot
    expect(metadata.resources).toHaveLength(1); expect(metadata.resources[0].kind).toBe('charge')
    const state = after.itemStates.states.find(i => i.instanceId === lamp.instanceId)!.resource
    expect(state.kind === 'charge' && state.current).toBe(metadata.resources[0].after)
  })

  it('real access card is not consumed or described as durability payment', () => {
    const h = fixture({ draw: miss }); let v = h.value
    for (const n of ['H1', 'H3']) v = h.move(v, n).snapshot
    v = h.source(v, 'H3-search', { method: 'dark' }).snapshot
    const cardId = h.deps.supply.tasks.data.items.find(i => i.alias === 'card')!.id
    const card = v.site!.ground.find(g => g.nodeId === 'H3')!.items.find(i => i.definitionId === cardId)!
    expect(card).toBeDefined()
    v = planCombatTransfer(v, { kind: 'task-pickup', expectedRevision: v.character.revision, instanceId: card.instanceId,
      placement: { x: 0, y: 0, rotated: false } }, h.authorize(v)).snapshot
    v = h.move(v, 'H1').snapshot
    const c: PlayerCoreCommand = { kind: 'task', command: { kind: 'task', actionId: 'fire-door', method: 'card', toolInstanceId: card.instanceId, expectedRevision: v.character.revision } }
    expect(qualifyPlayerCommand(v, c, h.deps).kind).toBe('available'); expect(queryPlayerActionMetadata(v, c, h.deps).resources).toEqual([])
    const after = h.task(v, 'fire-door', c.command).snapshot
    expect(after.carried.backpack.items.find(i => i.instanceId === card.instanceId)).toEqual(card)
    expect(after.itemStates.states.find(i => i.instanceId === card.instanceId)).toEqual(v.itemStates.states.find(i => i.instanceId === card.instanceId))
  })

  it('mechanical repair keeps one pool, explicit material payment and native resource results', () => {
    const { h, v } = maintenanceReady(), metalId = h.deps.supply.tasks.data.items.find(i => i.alias === 'metal')!.id
    const metal = v.carried.backpack.items.find(i => i.definitionId === metalId)!
    expect(metal).toBeDefined()
    const c: PlayerCoreCommand = { kind: 'maintenance', command: { kind: 'mechanical', expectedRevision: v.character.revision,
      inputs: [{ instanceId: metal.instanceId, quantity: 1 }], allocations: [{ instanceId: v.carried.equipment.weapon!.instanceId, amount: 7 }, { instanceId: v.carried.equipment.utility!.instanceId, amount: 8 }] } }
    expect(qualifyPlayerCommand(v, c, h.deps).kind).toBe('available')
    const metadata = queryPlayerActionMetadata(v, c, h.deps), after = planCombatMaintenance(v, c.command, h.authorize(v)).plan.snapshot
    expect(metadata.resources).toEqual([]); expect(metadata.materials).toEqual([{ name: '金属零件', quantity: 1 }])
    expect(metadata.maintenance!.totalPool).toBe(15)
    for (const [n, instanceId] of [v.carried.equipment.weapon!.instanceId, v.carried.equipment.utility!.instanceId].entries()) {
      const s = after.itemStates.states.find(i => i.instanceId === instanceId)!.resource
      expect(s.kind !== 'none' && s.current).toBe(metadata.maintenance!.allocations[n].after)
    }
    expect(after.carried.backpack.items.find(i => i.instanceId === metal.instanceId)?.quantity ?? 0).toBe(metal.quantity - 1)
  })

  it('recharge consumes one real battery and reports the native capped restore rather than armor payment', () => {
    const h = fixture({ tool: 'lamp', draw: miss }); let v = h.move(h.value, 'H1').snapshot
    const lamp = v.carried.equipment.utility!
    v = h.source(v, 'H1-search', { method: 'lit', toolInstanceId: lamp.instanceId }).snapshot
    v = h.move(v, 'H3').snapshot
    v = h.source(v, 'H3-search', { method: 'dark' }).snapshot
    const batteryId = h.deps.supply.tasks.data.items.find(i => i.alias === 'battery')!.id
    const battery = v.site!.ground.find(g => g.nodeId === 'H3')!.items.find(i => i.definitionId === batteryId)!
    expect(battery).toBeDefined()
    v = h.inventory(v, 'pickup', { instanceId: battery.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
    const c: PlayerCoreCommand = { kind: 'maintenance', command: { kind: 'recharge', expectedRevision: v.character.revision, instanceId: lamp.instanceId, inputs: [{ instanceId: battery.instanceId, quantity: 1 }] } }
    expect(qualifyPlayerCommand(v, c, h.deps).kind).toBe('available')
    const metadata = queryPlayerActionMetadata(v, c, h.deps), after = planCombatMaintenance(v, c.command, h.authorize(v)).plan.snapshot
    expect(metadata.resources).toEqual([]); expect(metadata.materials).toEqual([{ name: h.deps.supply.catalog.physical.get(battery.definitionId).name, quantity: 1 }])
    const state = after.itemStates.states.find(i => i.instanceId === lamp.instanceId)!.resource
    expect(state.kind === 'charge' && state.current).toBe(metadata.maintenance!.allocations[0].after)
    expect(after.carried.backpack.items.find(i => i.instanceId === battery.instanceId)?.quantity ?? 0).toBe(battery.quantity - 1)
  })

  it('known combat weapon payment is unchanged and matches the real primary', () => {
    const h = entered('orderly', { draw: miss }), v = h.value, pipe = v.carried.equipment.weapon!
    const c: PlayerCoreCommand = { kind: 'combat', command: { kind: 'combat-action', expectedRevision: v.character.revision, expectedBattleId: v.battle!.entry.id, command: { kind: 'metal-pipe-basic-attack' } } }
    expect(qualifyPlayerCommand(v, c, h.deps).kind).toBe('available')
    const metadata = queryPlayerActionMetadata(v, c, h.deps), after = h.action(v, c.command.command).snapshot
    expect(metadata.resources).toHaveLength(1)
    const state = after.itemStates.states.find(i => i.instanceId === pipe.instanceId)!.resource
    expect(state.kind === 'durability' && state.current).toBe(metadata.resources[0].after)
  })
})
