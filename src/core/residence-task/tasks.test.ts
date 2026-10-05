import { describe, expect, it } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { fixture as makeFixture, atNode, resolvedDanger } from './test-fixtures'
import { planSupplyTaskAction } from './actions'
import { planSupplySourceReveal } from './sources'
import { planSupplyInventory } from '../residence-supply/inventory'
import { planSupplyTaskTransfer } from './transfer'
import { querySupplyKnownObjects } from '../residence-supply/queries'
const act = (f: ReturnType<typeof fixture>, v: typeof f.value, actionId: string, extra = {}) =>
  planSupplyTaskAction(v, { kind: 'task', expectedRevision: v.character.revision, actionId, ...extra }, f.authorize(v))
describe('P03 formal task producers and methods', () => {
  it.each(['scout', 'engineer', 'survival'] as const)('specialty %s preserves full/fast qualification and method reductions without stacking', specialty => {
    const f = fixture({ specialty })
    let v = atNode(f, resolvedDanger(f), 'C1')
    expect(() => act(f, v, 'match', { method: 'fast' })).toThrow()
    const matched = act(f, v, 'match', { method: 'full' })
    expect(matched.energyCost).toBe(specialty === 'scout' ? 4 : 6)
    v = atNode(f, matched.snapshot, 'L2')
    expect(act(f, v, 'verify', { method: 'fast' }).energyCost).toBe(4)
    v = act(f, v, 'verify', { method: 'full' }).snapshot
    const manual = act(f, v, 'fix', { method: 'manual' })
    expect(manual.energyCost).toBe(specialty === 'engineer' ? 10 : 14)
    v = atNode(f, v, 'L5'); v = act(f, v, 'method').snapshot; v = atNode(f, v, 'L2')
    expect(act(f, v, 'fix', { method: 'method' }).energyCost).toBe(10)
    expect(() => act(f, v, 'fix', { method: 'manual', toolInstanceId: 'unused' })).toThrow()
  })
  it('real power, component, module, original transport and installation', () => {
    const f = fixture()
    let v = atNode(f, resolvedDanger(f), 'P1')
    expect(() => act(f, v, 'power')).toThrow()
    v = act(f, v, 'power-survey').snapshot; v = act(f, v, 'power').snapshot
    v = atNode(f, v, 'L2')
    expect(() => act(f, v, 'component', { placement: { x: 0, y: 0, rotated: false } })).toThrow()
    v = act(f, v, 'verify', { method: 'full' }).snapshot
    const fixed = act(f, v, 'fix', { method: 'manual' })
    expect(fixed.energyCost).toBe(10); v = fixed.snapshot
    v = act(f, v, 'component', { placement: { x: 0, y: 0, rotated: false } }).snapshot
    const component = v.carried.backpack.items.find(i => i.definitionId === 'draft_transfer_control_component')!
    v = planSupplyTaskTransfer(v, { kind: 'task-drop', expectedRevision: v.character.revision, instanceId: component.instanceId }, f.authorize(v)).snapshot
    expect(() => planSupplyInventory(v, { kind: 'pickup', expectedRevision: v.character.revision, instanceId: component.instanceId,
      placement: { x: 0, y: 0, rotated: false } }, f.authorize(v))).toThrow()
    v = planSupplyTaskTransfer(v, { kind: 'task-pickup', expectedRevision: v.character.revision, instanceId: component.instanceId,
      placement: { x: 0, y: 0, rotated: false } }, f.authorize(v)).snapshot
    expect(v.carried.backpack.items.find(i => i.instanceId === component.instanceId)).toEqual(component)
    v = atNode(f, v, 'C1')
    v = act(f, v, 'match', { method: 'fast' }).snapshot
    v = atNode(f, v, 'C3')
    v = act(f, v, 'module', { placement: { x: 2, y: 0, rotated: false } }).snapshot
    v = atNode(f, v, 'C4')
    v = planSupplySourceReveal(v, { kind: 'reveal', expectedRevision: v.character.revision, sourceId: 'C4-cabinet', method: 'manual' }, f.authorize(v)).snapshot
    for (const alias of ['metal', 'electronic']) {
      const id = f.dependencies.tasks.data.items.find(i => i.alias === alias)!.id
      const item = v.site!.ground.find(g => g.nodeId === 'C4')!.items.find(i => i.definitionId === id)!
      v = planSupplyInventory(v, { kind: 'pickup', expectedRevision: v.character.revision, instanceId: item.instanceId,
        placement: { x: alias === 'metal' ? 3 : 4, y: 0, rotated: false } }, f.authorize(v)).snapshot
    }
    v = atNode(f, v, 'H8')
    const inputs = v.carried.backpack.items.map(i => ({ instanceId: i.instanceId, quantity: 1 }))
    v = act(f, v, 'install', { inputs }).snapshot
    expect(v.site!.facts.find(f => f.id === 'transfer')!.value).toBe(true)
    expect(v.dispositions.filter(d => d.kind === 'installed')).toHaveLength(4)
    expect(v.carried.backpack.items).toHaveLength(0)
    expect(() => act(f, v, 'install', { inputs })).toThrow()
  })
  it.each(['crow', 'card', 'toolbox'] as const)('fire door %s only grants professional electronic on toolbox', method => {
    const f = fixture({ tool: method === 'card' ? 'lamp' : method })
    let v = atNode(f, f.value, method === 'card' ? 'H3' : 'H1')
    let toolInstanceId = v.carried.equipment.utility!.instanceId
    if (method === 'card') {
      v = planSupplySourceReveal(v, { kind: 'reveal', expectedRevision: v.character.revision, sourceId: 'H3-search', method: 'dark' }, f.authorize(v)).snapshot
      const card = v.site!.ground.find(g => g.nodeId === 'H3')!.items.find(i => i.definitionId === 'access_card_isolation_ward')!
      v = planSupplyTaskTransfer(v, { kind: 'task-pickup', expectedRevision: v.character.revision, instanceId: card.instanceId,
        placement: { x: 0, y: 0, rotated: false } }, f.authorize(v)).snapshot
      toolInstanceId = card.instanceId; v = atNode(f, v, 'H1')
    }
    const p = act(f, v, 'fire-door', { method, toolInstanceId })
    expect(p.snapshot.origins.filter(o => o.producerId === 'H1-toolbox')).toHaveLength(method === 'toolbox' ? 1 : 0)
    expect(() => act(f, p.snapshot, 'fire-door', { method, toolInstanceId })).toThrow()
    expect(v.site!.facts.find(f => f.id === 'fire-door')!.value).toBe(false)
  })
  it('only real C5 investigation reveals the hidden route, unlock is separate', () => {
    const f = fixture()
    let v = atNode(f, f.value, 'C5')
    expect(querySupplyKnownObjects(v, f.dependencies).routes.some(r => r.id.startsWith('C5-H7'))).toBe(false)
    v = act(f, v, 'side-survey').snapshot
    expect(querySupplyKnownObjects(v, f.dependencies).routes.find(r => r.id === 'C5-H7:forward')!.passable).toBe(false)
    expect(v.site!.knowledge.knownEdgeIds.some(id => id.startsWith('C5-H7'))).toBe(false)
    v = act(f, v, 'side-door').snapshot
    expect(querySupplyKnownObjects(v, f.dependencies).routes.find(r => r.id === 'C5-H7:forward')!.passable).toBe(true)
  })
})
