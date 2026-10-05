import { afterEach, describe, expect, it, vi } from 'vitest'
import * as encoder from '../residence-save/supply-codec'
import * as validator from '../residence-save/supply-validation'
import { SupplyResidenceSaveError } from '../residence-save/supply-types'
import { harness, start, current, request, coldLatest, reject, observe, initialMaterials, recordCounts } from './supply-test-fixtures'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
afterEach(() => vi.restoreAllMocks())
describe('S07 S08 persistence transaction and semantic negative controls', () => {
  it('read-null source/real split-merge/quick/self-rescue/rest write-failure chain retains units, draw and first-bandage use', () => {
    const deps = createInfectedSupplyDependencies('session-test-character'), materials = initialMaterials(deps, 'toolbox', 'survival')
    materials.character.body.condition.currentHealth = 8
    const h = harness({ materials }); start(h)
    const e = observe(h); vi.clearAllMocks()
    const send = (family: string, fields = {}) => h.owner.dispatch(request(h, family, fields))
    const move = (edgeId: string) => send('move', { edgeId })
    move('H0-H1:forward'); h.faults.write = true
    const diskBefore = h.disk()
    send('source', { sourceId: 'H1-search', method: 'dark' })
    expect(h.disk()).toBe(diskBefore); expect(h.owner.getState().persistence).toBe('save-failed')
    reject(h, request(h, 'source', { sourceId: 'H1-search', method: 'dark' }), 'NOT_AVAILABLE')
    expect(h.draw).toHaveBeenCalledTimes(1)
    h.faults.write = false
    const metal = current(h).site!.ground.find(g => g.nodeId === 'H1')!.items.find(i =>
      i.definitionId === h.deps.tasks.data.items.find(d => d.alias === 'metal')!.id)!
    send('inventory', { kind: 'pickup', instanceId: metal.instanceId, placement: { x: 4, y: 0, rotated: false } })
    move('H1-H7:forward'); move('H7-L0:forward'); move('L0-L1:forward')
    send('task', { actionId: 'l1-open', method: 'manual' }); send('source', { sourceId: 'L1-cabinet' })
    const food = current(h).site!.ground.find(g => g.nodeId === 'L1')!.items.find(i =>
      i.definitionId === h.deps.tasks.data.items.find(d => d.alias === 'food')!.id)!
    send('inventory', { kind: 'pickup', instanceId: food.instanceId, placement: { x: 0, y: 0, rotated: false } })
    send('inventory', { kind: 'split', instanceId: food.instanceId, quantity: 1, placement: { x: 1, y: 0, rotated: false } })
    const child = current(h).carried.backpack.items.find(i => i.definitionId === food.definitionId && i.instanceId !== food.instanceId)!
    send('inventory', { kind: 'merge', instanceId: child.instanceId, targetId: food.instanceId, quantity: 1 })
    const bandage = current(h).carried.quickSlots.slots[0]!
    send('inventory', { kind: 'to-backpack', slot: 0, placement: { x: 2, y: 0, rotated: false } })
    send('inventory', { kind: 'to-quick', instanceId: bandage.instanceId, slot: 1 })
    h.faults.write = true
    send('medical', { instanceId: bandage.instanceId })
    expect(current(h).character.body.condition.currentHealth).toBe(10)
    expect(current(h).choices.firstBandageUsed).toBe(true)
    expect(current(h).carried.quickSlots.slots[1]).toBe(null)
    reject(h, request(h, 'medical', { instanceId: bandage.instanceId }), 'NOT_AVAILABLE')
    h.faults.write = false; send('rest')
    expect(current(h).choices.firstBandageUsed).toBe(true)
    expect(current(h).carried.backpack.items.find(i => i.instanceId === food.instanceId)?.quantity).toBe(2)
    const counts = e.counts()
    expect(counts).toMatchObject({ initial: 0, depart: 0, activate: 0, move: 4, reveal: 3, task: 1, rest: 1,
      inventory: 6, medical: 2, action: 14, cycle: 1, draw: 1, write: 15, current: 15, batches: 15, read: 0, materials: 0 })
    h.owner.retrySave()
    expect(e.counts()).toEqual({ ...counts, encode: counts.encode + 1, write: counts.write + 1 })
    recordCounts('source/consumption', counts)
    coldLatest(h)
  })
  it('negative control: actual R aggregate rejects a corrupted prepared value before current/write/notice', () => {
    const h = harness(); start(h); const e = observe(h); vi.clearAllMocks()
    const real = validator.validateSupplyResidenceAggregate
    vi.spyOn(validator, 'validateSupplyResidenceAggregate').mockImplementationOnce((v, expected, policy) => {
      const corrupt = structuredClone(v) as Record<string, unknown>
      corrupt.balance = 1
      return real(corrupt, expected, policy)
    })
    reject(h, request(h, 'move', { edgeId: 'H0-H1:forward' }), 'INVALID_STATE')
    expect(e.spies.move).toHaveBeenCalledTimes(1); expect(e.spies.action).toHaveBeenCalledTimes(1)
    expect(e.spies.encode).not.toHaveBeenCalled()
    h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    expect(h.storage.write).toHaveBeenCalledTimes(1)
  })
  it.each(['first', 'action', 'terminal'] as const)('%s encoder failure occurs before any installation and busy is released', point => {
    const h = harness(); h.owner.bootstrap()
    if (point !== 'first') { h.owner.createFirst(); h.owner.dispatch(request(h, 'depart', { commissionId: h.deps.catalog.data.mission.commissionId })) }
    const before = h.owner.getState().current, disk = h.disk(), writes = h.storage.write.mock.calls.length, notices = h.listener.mock.calls.length
    const real = encoder.serializeSupplyResidenceSave
    vi.spyOn(encoder, 'serializeSupplyResidenceSave').mockImplementationOnce((...args) => {
      real(...args)
      throw new SupplyResidenceSaveError('INVALID_STATE', 'TEST encoding failure after full R validation')
    })
    const execute = () => point === 'first' ? h.owner.createFirst() : h.owner.dispatch(request(h,
      point === 'terminal' ? 'terminal' : 'move', point === 'terminal' ? { kind: 'withdraw' } : { edgeId: 'H0-H1:forward' }))
    expect(execute).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }))
    expect(h.owner.getState().current).toBe(before); expect(h.disk()).toBe(disk)
    expect(h.storage.write).toHaveBeenCalledTimes(writes); expect(h.listener).toHaveBeenCalledTimes(notices)
    execute(); expect(h.storage.write).toHaveBeenCalledTimes(writes + 1)
  })
  it('negative control: retry is successful while every gameplay producer is an armed replay trap', () => {
    const h = harness(); start(h); const e = observe(h); vi.clearAllMocks(); h.faults.write = true
    h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    const latest = current(h), before = e.counts()
    for (const [key, spy] of Object.entries(e.spies)) {
      if (key !== 'encode' && key !== 'decode') spy.mockImplementation(() => { throw new Error('GAMEPLAY_REPLAY_TRAP:' + key) })
    }
    h.draw.mockImplementation(() => { throw new Error('RANDOM_REPLAY_TRAP') })
    h.factory.mockImplementation(() => { throw new Error('INITIAL_REPLAY_TRAP') })
    h.coldProvider.mockImplementation(() => { throw new Error('EXPECTED_REPLAY_TRAP') })
    h.faults.write = false
    expect(h.owner.retrySave().persistence).toBe('saved')
    expect(current(h)).toBe(latest)
    expect(e.counts()).toEqual({ ...before, encode: before.encode + 1, write: before.write + 1 })
  })
})
