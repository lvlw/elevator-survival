import { describe, expect, it, vi } from 'vitest'
import { queryPlayerActionInputs } from './player-inputs'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { createCombatTestFactory } from '../residence-combat/test-fixtures'
import { maintenanceReady } from '../../state/residence-save/combat-test-fixtures'
import { numberValue, tableValue } from './config'
import { quietDraw } from '../../state/residence-save/combat-test-fixtures'
import { drawIntInclusive } from '../random'
import { qualifyPlayerCommand } from './player-query'
import { planCombatRest } from '../residence-combat/controlled'

const factory = createCombatTestFactory(() => createInfectedCombatDependencies('input-test-character'))
describe('public action input shapes from formal declarations', () => {
  it.each(['dark', 'lit'])('%s search describes no unknown output or random table', method => {
    const h = factory.fixture({ tool: 'lamp' }), v = h.move(h.value, 'H1').snapshot
    const d = queryPlayerActionInputs(v, { family: 'source', key: 'H1-search', method }, h.deps)
    expect(d.fields).toEqual(method === 'lit' ? ['item'] : [])
    expect(d.outputs).toEqual([]); expect(d.materials).toEqual([])
    expect(d.items.map(i => i.name)).toEqual(method === 'lit' ? ['手电筒'] : [])
    expect(JSON.stringify(d)).not.toMatch(/random|risk|percent|roll|drawIndex/)
  })
  it.each(['crow', 'toolbox', 'card'])('%s door requires an explicit matching real tool', method => {
    const h = factory.fixture({ tool: method === 'toolbox' ? 'toolbox' : 'crow' }), v = h.move(h.value, 'H1').snapshot
    const d = queryPlayerActionInputs(v, { family: 'task', key: 'fire-door', method }, h.deps)
    expect(d.fields).toEqual(['item'])
    expect(d.items.map(i => i.name)).toEqual(method === 'card' ? [] : [method === 'crow' ? '撬棍' : '工具箱'])
    expect(d.outputs).toEqual([])
  })
  it('fixed public exchange describes exact materials and each fixed output placement', () => {
    const h = factory.fixture(); let v = h.move(h.value, 'T0').snapshot; v = h.move(v, 'T1').snapshot
    const d = queryPlayerActionInputs(v, { family: 'source', key: 'T1-exchange' }, h.deps)
    expect(d.fields).toEqual(['materials', 'placements'])
    expect(d.materials.map(m => m.quantity)).toEqual(Object.values(tableValue(h.deps.supply.configuration, 'exchange.inputs')))
    expect(d.materials.map(m => m.name)).toEqual(['绷带', '消毒剂'])
    expect(d.outputs).toMatchObject([{ name: '压缩口粮', quantity: 2, width: 1, height: 1 }])
  })
  it('installation inputs come from the current public action and the exact formal recipe', () => {
    const h = factory.fixture(); let v = h.value
    for (const n of ['H1', 'H7', 'L0', 'P0', 'P1']) v = h.move(v, n).snapshot
    v = h.task(v, 'power-survey').snapshot; v = h.task(v, 'power').snapshot
    v = planCombatRest(v, { kind: 'rest', expectedRevision: v.character.revision }, h.authorize(v)).snapshot
    for (const n of ['P0', 'L0', 'H7', 'H8']) v = h.move(v, n).snapshot
    const d = queryPlayerActionInputs(v, { family: 'task', key: 'install' }, h.deps)
    const declaration = h.deps.supply.tasks.data.actions.find(a => a.id === 'install')!
    expect(d.fields).toEqual(['materials']); expect(d.outputs).toEqual([])
    expect(d.materials.map(m => m.quantity)).toEqual(Object.values(tableValue(h.deps.supply.configuration, declaration.consume!)))
    expect(d.materials.map(m => m.name)).toEqual(['component', 'module', '金属零件', '电子元件'])
    expect(d.materials.every(m => m.choices.length === 0)).toBe(true)
  })
  it.each([
    ['move', ['item', 'placement']], ['split', ['item', 'placement', 'quantity']],
    ['merge', ['item', 'quantity', 'targetItem']], ['to-quick', ['item', 'slot']],
    ['to-backpack', ['item', 'placement']], ['pickup', ['item', 'placement']], ['drop', ['item']],
  ] as const)('%s inventory exposes its explicit request fields, without choosing a target', (key, fields) => {
    const h = factory.fixture(), d = queryPlayerActionInputs(h.value, { family: 'inventory', key }, h.deps)
    expect(d.fields).toEqual(fields); expect(d.outputs).toEqual([])
    expect(Object.keys(d)).not.toContain('selected'); expect(Object.keys(d)).not.toContain('default')
  })
  it('sample geometry is declared and neither method requires a coat', () => {
    const h = factory.entered('orderly', { draw: quietDraw }), v = h.move(factory.win(h, h.value), 'H5').snapshot
    for (const method of ['cautious', 'direct']) {
      const d = queryPlayerActionInputs(v, { family: 'task', key: 'sample', method }, h.deps)
      expect(d.fields).toEqual(['placement']); expect(d.items).toEqual([])
      expect(d.outputs).toEqual([{ name: '密封病原样本箱', width: 2, height: 2, unitWeight: 4, quantity: 1, canRotate: true }])
    }
  })
  it.each(['mechanical', 'coat'] as const)('%s maintenance uses the formal single pool and recipe', kind => {
    const { h, v } = maintenanceReady(), d = queryPlayerActionInputs(v, { family: 'maintenance', key: kind }, h.deps)
    expect(d.fields).toEqual(['materials', kind === 'mechanical' ? 'allocations' : 'item'])
    expect(d.allocation!.pool).toBe(numberValue(h.deps.supply.configuration, kind === 'mechanical' ? 'restore.metal_pool' : 'restore.coat'))
    expect(d.materials).toMatchObject([{ quantity: 1, name: kind === 'mechanical' ? '金属零件' : '织物材料' }])
    expect(d.allocation!.targets.length).toBeGreaterThan(0)
  })
  it('description is read-only and does not freeze unfrozen input', () => {
    const draw = vi.fn(quietDraw), h = factory.fixture({ draw }), v = JSON.parse(JSON.stringify(h.value)), before = JSON.stringify(v)
    draw.mockClear()
    const d = queryPlayerActionInputs(v, { family: 'inventory', key: 'to-backpack' }, h.deps)
    expect(d.fields).toEqual(['item', 'placement']); expect(d.items).toHaveLength(1)
    expect(JSON.stringify(v)).toBe(before); expect(Object.isFrozen(v.carried.quickSlots.slots[0])).toBe(false); expect(draw).not.toHaveBeenCalled()
  })
  it.each([['disinfect', 1], ['painkiller', 36], ['firstaid', 66], ['suppressant', 86]] as const)('%s describes only public clinical inputs from a real random source', (alias, roll) => {
    const h = factory.fixture({ draw: (c, min, max) => ({ ...drawIntInclusive(c, min, max), value: roll }) })
    let v = h.move(h.value, 'H1').snapshot; v = h.move(v, 'H2').snapshot
    v = h.source(v, 'H2-search', { method: 'dark' }).snapshot
    const definition = h.deps.supply.tasks.data.items.find(d => d.alias === alias)!.id
    const item = v.site!.ground.find(g => g.nodeId === 'H2')!.items.find(i => i.definitionId === definition)!
    v = h.inventory(v, 'pickup', { instanceId: item.instanceId, placement: { x: 0, y: 0, rotated: false } }).snapshot
    v = factory.bodyBoundary(v, h.deps, { condition: { ...v.character.body.condition, currentHealth: 8, minorContusions: 1,
      openWounds: [{ id: 'TEST-public-wound', kind: 'laceration', treatment: 'untreated' }] } })
    const d = queryPlayerActionInputs(v, { family: 'medical', key: 'medical' }, h.deps)
    const selected = d.items.find(i => i.key === item.instanceId)!
    expect(selected).toBeDefined()
    expect(d.wounds).toMatchObject([{ ordinal: 1, kind: 'laceration', treatment: 'untreated' }])
    if (alias === 'firstaid') {
      expect(selected.clinical).toEqual({ wound: 'any', targets: ['contusion', 'wound'], allowNoTarget: false })
      expect(qualifyPlayerCommand(v, { kind: 'medical', command: { kind: 'medical', expectedRevision: v.character.revision,
        instanceId: item.instanceId, target: 'contusion' } }, h.deps).kind).toBe('available')
    } else {
      expect(selected.clinical).toEqual({ wound: 'none', targets: [], allowNoTarget: true })
      if (alias === 'disinfect' || alias === 'suppressant') expect(qualifyPlayerCommand(v, { kind: 'medical', command: {
        kind: 'medical', expectedRevision: v.character.revision, instanceId: item.instanceId } }, h.deps).kind).toBe('unknown')
    }
  })
  it('bandage only exposes a required untreated wound and later no-injury healing needs no target', () => {
    const h = factory.fixture({ hp: 8 }), injured = factory.bodyBoundary(h.value, h.deps, {
      condition: { ...h.value.character.body.condition, openWounds: [{ id: 'TEST-wound', kind: 'bite', treatment: 'untreated' }] } })
    const d = queryPlayerActionInputs(injured, { family: 'medical', key: 'medical' }, h.deps)
    expect(d.items[0].clinical).toEqual({ wound: 'untreated', targets: [], allowNoTarget: false })
    const healthyWounds = queryPlayerActionInputs(h.value, { family: 'medical', key: 'medical' }, h.deps)
    expect(healthyWounds.items[0].clinical).toEqual({ wound: 'none', targets: [], allowNoTarget: true })
  })
  it.each(['toolbox', 'recharge'] as const)('%s input pool and material requirements use configuration even without an eligible target', kind => {
    const h = factory.fixture({ tool: kind === 'toolbox' ? 'toolbox' : 'lamp' })
    const d = queryPlayerActionInputs(h.value, { family: 'maintenance', key: kind }, h.deps)
    expect(d.items).toEqual([]); expect(d.allocation!.targets).toEqual([])
    expect(d.allocation!.pool).toBe(numberValue(h.deps.supply.configuration, kind === 'toolbox' ? 'restore.toolbox' : 'restore.lamp'))
    expect(d.materials.map(m => m.quantity)).toEqual(kind === 'toolbox' ? [1, 1] : [1])
  })
})
