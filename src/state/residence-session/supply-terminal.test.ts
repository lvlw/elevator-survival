import { afterEach, describe, expect, it, vi } from 'vitest'
import { planSupplyTaskAction } from '../../core/residence-task/actions'
import { cold, current, fixture, atNode, searchAt, pickAlias, readSupplyValue, request, reject, coldLatest, observe, recordCounts } from './supply-test-fixtures'
afterEach(() => vi.restoreAllMocks())
describe('S06 S08 real terminal fault chains', () => {
  it.each([1, 7])('H0 day %s is an empty real G1 cycle and commits once despite write failure', day => {
    const f = fixture(), v = f.value
    if (v.character.clock.kind !== 'active') throw new Error('TEST clock')
    const h = cold({ ...v, character: { ...v.character, cycle: day, clock: { ...v.character.clock, taskDay: day } } }, f.policy)
    const e = observe(h); vi.clearAllMocks(); h.faults.write = true
    const result = h.owner.dispatch(request(h, 'terminal', { kind: 'withdraw' }))
    expect(result.persistence).toBe('save-failed'); expect(result.current.phase).toBe('living-hub')
    expect(result.current.character.body).toEqual(v.character.body)
    expect(e.spies.terminal.mock.results[0].value.steps).toEqual([])
    expect(e.counts()).toMatchObject({ terminal: 1, cycle: 1, action: 0, consume: 0, terminate: 1, plan: 1,
      write: 1, read: 0, current: 1, batches: 1, draw: 0, origin: 0 })
    reject(h, request(h, 'depart', { commissionId: f.dependencies.catalog.data.mission.commissionId }), 'NOT_AVAILABLE')
    reject(h, request(h, 'terminal', { kind: 'withdraw' }), 'NOT_AVAILABLE')
    const counts = e.counts(); h.faults.write = false; h.owner.retrySave()
    expect(e.counts()).toEqual({ ...counts, encode: counts.encode + 1, write: counts.write + 1 })
    recordCounts('H0:day' + day, counts)
    coldLatest(h)
  })
  it.each([false, true])('remote day7 deadline dead=%s retains actual ordered steps and one close', dead => {
    const f = fixture(), v = atNode(f, f.value, 'H1')
    if (v.character.clock.kind !== 'active') throw new Error('TEST clock')
    const base = { ...v, character: { ...v.character, cycle: 7, clock: { ...v.character.clock, taskDay: 7 },
      body: { ...v.character.body, condition: { ...v.character.body.condition, currentHealth: dead ? 1 : 12, bleeding: dead } } } }
    const h = cold(base, f.policy), e = observe(h); vi.clearAllMocks(); h.faults.write = true
    const result = h.owner.dispatch(request(h, 'terminal', { kind: 'deadline' }))
    expect(result.current.phase).toBe(dead ? 'dead' : 'living-hub')
    expect(result.current.character.cycle).toBe(dead ? 7 : 8)
    expect(e.spies.terminal.mock.results[0].value.steps.map((s: { kind: string }) => s.kind))
      .toEqual(dead ? ['cycle-bleeding'] : ['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
    expect(e.counts()).toMatchObject({ cycle: 1, action: 0, terminal: 1, consume: 0, terminate: 1, plan: 1, write: 1, current: 1, batches: 1 })
    if (dead) expect(current(h).character.body.condition.currentHealth).toBe(0)
    const counts = e.counts(); h.faults.write = false; h.owner.retrySave()
    expect(e.counts()).toEqual({ ...counts, encode: counts.encode + 1, write: counts.write + 1 })
    recordCounts('deadline:dead=' + dead, counts)
    coldLatest(h)
  })
  it.each(['move', 'source', 'task', 'maintenance', 'rest'] as const)
  ('%s death consumes the original plan once, never installs HP0 active, then retries/cold-loads', family => {
    const f = fixture()
    let v = f.value
    if (family === 'source' || family === 'task') v = atNode(f, v, 'H1')
    if (family === 'maintenance') {
      v = pickAlias(f, searchAt(f, v, 'H1-search'), 'metal', 0)
      v = readSupplyValue({ ...v, itemStates: { states: v.itemStates.states.map(s =>
        s.instanceId === v.carried.equipment.weapon!.instanceId ? { ...s, resource: { kind: 'durability', current: 0 } } : s) } }, f.dependencies)
    }
    if (family === 'rest') v = atNode(f, v, 'L1')
    if (v.character.clock.kind !== 'active') throw new Error('TEST clock')
    v = readSupplyValue({ ...v, character: { ...v.character, cycle: family === 'rest' ? 6 : 7,
      clock: { ...v.character.clock, taskDay: family === 'rest' ? 6 : 7 },
      body: { ...v.character.body, condition: { ...v.character.body.condition, currentHealth: 1, bleeding: true } } } }, f.dependencies)
    const h = cold(v, f.policy), e = observe(h); vi.clearAllMocks(); h.faults.write = true
    const observed: string[] = []; h.owner.subscribe(s => observed.push(s.current!.phase))
    const fields = family === 'move' ? { edgeId: 'H0-H1:forward' } : family === 'source' ?
      { sourceId: 'H1-search', method: 'dark' } : family === 'task' ?
        { actionId: 'fire-door', method: 'toolbox', toolInstanceId: v.carried.equipment.utility!.instanceId } :
        family === 'maintenance' ? { kind: 'mechanical', inputs: [{ instanceId: v.carried.backpack.items[0].instanceId, quantity: 1 }],
          allocations: [{ instanceId: v.carried.equipment.weapon!.instanceId, amount: 15 }] } : {}
    const result = h.owner.dispatch(request(h, family, fields))
    expect(result.persistence).toBe('save-failed'); expect(observed).toEqual(['dead'])
    expect(current(h).character.revision).toBe(v.character.revision + 1)
    expect(current(h).character.body.condition.currentHealth).toBe(0)
    expect(current(h).missions[0].status).toBe('closed'); expect(current(h).receipts).toHaveLength(1)
    expect(e.counts()).toMatchObject({ action: family === 'rest' ? 0 : 1, cycle: family === 'rest' ? 1 : 0,
      consume: 1, terminal: 0, terminate: 1, plan: 2, write: 1, read: 0, current: 1, batches: 1,
      g2Move: family === 'move' ? 1 : 0, g2Rest: family === 'rest' ? 1 : 0 })
    expect(e.spies.consume.mock.calls[0][1].outcome).toBe('death')
    expect(e.spies.consume.mock.results[0].value.steps).toEqual(e.spies.consume.mock.calls[0][1].steps)
    reject(h, request(h, family, fields), 'NOT_AVAILABLE')
    reject(h, request(h, 'terminal', { kind: 'withdraw' }), 'NOT_AVAILABLE')
    const counts = e.counts(); h.faults.write = false; h.owner.retrySave()
    expect(e.counts()).toEqual({ ...counts, encode: counts.encode + 1, write: counts.write + 1 })
    recordCounts('death:' + family, counts)
    coldLatest(h)
  })
  it.each([false, true])('live pending rejects atomically but genuine HP0 pending closes, dead=%s', dead => {
    const f = fixture(), here = atNode(f, f.value, 'H1')
    const base = planSupplyTaskAction(here, { kind: 'task', expectedRevision: here.character.revision,
      actionId: 'fire-door', method: 'toolbox', toolInstanceId: here.carried.equipment.utility!.instanceId }, f.authorize(here)).snapshot
    const v = readSupplyValue({ ...base, character: { ...base.character, body: { ...base.character.body,
      condition: { ...base.character.body.condition, currentHealth: dead ? 1 : 12, bleeding: dead } } } }, f.dependencies)
    const h = cold(v, f.policy), e = observe(h); vi.clearAllMocks()
    if (dead) {
      h.owner.dispatch(request(h, 'move', { edgeId: 'H1-H4:forward' }))
      expect(current(h).phase).toBe('dead'); expect(current(h).archives[0].site.pending.kind).toBe('combat-required')
      expect(e.spies.consume).toHaveBeenCalledTimes(1); expect(h.storage.write).toHaveBeenCalledTimes(1); coldLatest(h)
    } else {
      reject(h, request(h, 'move', { edgeId: 'H1-H4:forward' }), 'UNSUPPORTED_STAGE')
      expect(e.spies.move).toHaveBeenCalledTimes(1); expect(e.spies.action).toHaveBeenCalledTimes(1)
      expect(e.spies.consume).not.toHaveBeenCalled(); expect(e.spies.encode).not.toHaveBeenCalled()
    }
  })
})
