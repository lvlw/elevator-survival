import { describe, it, expect } from 'vitest'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
const fixture = (options: Parameters<typeof makeFixture>[1] = {}) => makeFixture(createInfectedSupplyDependencies('test-character'), options)
import { fixture as makeFixture, atNode, resolvedDanger } from './test-fixtures'
import { planSupplyTaskAction } from './actions'
import { planSupplyTaskTransfer } from './transfer'
import { planSupplyRest } from '../residence-supply/controlled'
import { readSupplyValue } from '../residence-supply/validation'
describe('P04 original task transport and cross-day persistence', () => {
  it('real sample drops, rests without healing, returns same instance/state', () => {
    const f = fixture(), here = atNode(f, resolvedDanger(f), 'H5')
    let v = planSupplyTaskAction(here, { kind: 'task', expectedRevision: here.character.revision, actionId: 'sample',
      method: 'cautious', placement: { x: 0, y: 0, rotated: false } }, f.authorize(here)).snapshot
    const item = v.carried.backpack.items[0], state = v.itemStates.states.find(s => s.instanceId === item.instanceId)
    v = planSupplyTaskTransfer(v, { kind: 'task-drop', expectedRevision: v.character.revision, instanceId: item.instanceId }, f.authorize(v)).snapshot
    const hp = v.character.body.condition.currentHealth
    v = planSupplyRest(v, { kind: 'rest', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
    expect(v.character.cycle).toBe(2)
    expect(v.character.body.condition.currentHealth).toBe(hp)
    expect(v.site!.ground.find(g => g.nodeId === 'H5')!.items).toContainEqual(item)
    v = planSupplyTaskTransfer(v, { kind: 'task-pickup', expectedRevision: v.character.revision, instanceId: item.instanceId,
      placement: { x: 0, y: 0, rotated: false } }, f.authorize(v)).snapshot
    expect(v.carried.backpack.items[0]).toEqual(item)
    expect(v.itemStates.states.find(s => s.instanceId === item.instanceId)).toEqual(state)
    expect(() => readSupplyValue({ ...v, origins: v.origins.map(o => o.kind === 'task' ? { ...o, ordinal: 1 } : o) }, f.dependencies)).toThrow()
    expect(() => readSupplyValue({ ...v, origins: v.origins.map(o => o.kind === 'task' ? { ...o, binding: { ...o.binding, execution: { ...o.binding.execution, runId: 'foreign' } } } : o) }, f.dependencies)).toThrow()
  })
})
