import { afterEach, describe, expect, it, vi } from 'vitest'
import { history } from '../residence-save/supply-test-fixtures'
import { cold, coldLatest, current, fixture, harness, start, request, reject, resolvedDanger, observe, recordCounts } from './supply-test-fixtures'
afterEach(() => vi.restoreAllMocks())
describe('S04 S08 S10 native headless long chains', () => {
  it('real read-null, initial, depart, safe movement/source and return never use an active fixture', () => {
    const h = harness(), e = observe(h)
    start(h)
    h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    h.owner.dispatch(request(h, 'source', { sourceId: 'H1-search', method: 'dark' }))
    h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:reverse' }))
    h.owner.dispatch(request(h, 'terminal', { kind: 'withdraw' }))
    expect(current(h).phase).toBe('living-hub')
    expect(e.counts()).toMatchObject({ initial: 1, depart: 1, activate: 1, move: 2, reveal: 1, terminal: 1,
      consume: 0, terminate: 1, action: 3, cycle: 2, g2Move: 2, g2Initial: 1, draw: 1,
      read: 1, write: 6, current: 6, batches: 6, materials: 1 })
    coldLatest(h)
  })
  it.each(['success', 'voluntary-failure'] as const)
  ('danger-cleared TEST cold prestate, ALL actual tasks/moves, failed install/save and %s', outcome => {
    const f = fixture(), h = cold(resolvedDanger(f), f.policy), e = observe(h)
    vi.clearAllMocks()
    const send = (family: string, fields = {}) => h.owner.dispatch(request(h, family, fields))
    const move = (edgeId: string) => send('move', { edgeId })
    const act = (actionId: string, fields = {}) => send('task', { actionId, ...fields })
    const rest = () => send('rest')
    const item = (alias: string) => current(h).carried.backpack.items.find(i =>
      i.definitionId === h.deps.tasks.data.items.find(d => d.alias === alias)!.id)!
    const pick = (alias: string, x: number, y = 0) => {
      const v = current(h), ground = v.site!.ground.find(g => g.nodeId === v.site!.nodeId)!
      const found = ground.items.find(i => i.definitionId === h.deps.tasks.data.items.find(d => d.alias === alias)!.id)!
      send('inventory', { kind: 'pickup', instanceId: found.instanceId, placement: { x, y, rotated: false } })
    }
    move('H0-H1:forward'); send('source', { sourceId: 'H1-search', method: 'dark' }); pick('metal', 4)
    act('fire-door', { method: 'toolbox', toolInstanceId: current(h).carried.equipment.utility!.instanceId }); pick('electronic', 5)
    move('H1-H7:forward'); move('H7-L0:forward'); move('L0-L1:forward')
    act('l1-open', { method: 'manual' }); send('source', { sourceId: 'L1-cabinet' }); pick('food', 4, 1); pick('bandage', 5, 1); rest()
    move('L1-L2:forward'); act('verify', { method: 'full' }); act('fix', { method: 'manual' })
    act('component', { placement: { x: 0, y: 0, rotated: false } })
    const component = item('component'), state = current(h).itemStates.states.find(s => s.instanceId === component.instanceId)
    send('task-transfer', { kind: 'task-drop', instanceId: component.instanceId }); rest()
    send('task-transfer', { kind: 'task-pickup', instanceId: component.instanceId, placement: { x: 0, y: 0, rotated: false } })
    expect(item('component')).toEqual(component)
    expect(current(h).itemStates.states.find(s => s.instanceId === component.instanceId)).toEqual(state)
    move('L1-L2:reverse'); move('L0-L1:reverse'); move('L0-C0:forward'); move('C0-C1:forward')
    act('match', { method: 'fast' }); act('c-gate', { method: 'manual' })
    move('C1-C2:forward'); move('C2-C3:forward'); act('module', { placement: { x: 2, y: 0, rotated: false } })
    move('C2-C3:reverse'); move('C1-C2:reverse'); send('medical', { instanceId: item('food').instanceId }); rest()
    move('C0-C1:reverse'); move('C0-H0:forward'); move('H0-H1:forward')
    let sampleId: string | null = null
    if (outcome === 'success') {
      move('H1-H4:forward'); move('H4-H5:forward')
      act('sample', { method: 'cautious', placement: { x: 0, y: 2, rotated: false } }); sampleId = item('sample').instanceId
      move('H4-H5:reverse'); move('H1-H4:reverse')
    }
    move('H1-H7:forward'); move('H7-H8:forward'); move('H7-H8:reverse'); move('H7-L0:forward')
    move('P0-L0:reverse'); move('P0-P1:forward'); act('power-survey'); act('power'); rest()
    move('P0-P1:reverse'); move('P0-L0:forward'); move('H7-L0:reverse'); move('H7-H8:forward')
    const inputs = ['component', 'module', 'metal', 'electronic'].map(alias => ({ instanceId: item(alias).instanceId, quantity: 1 }))
    h.faults.write = true
    const installed = act('install', { inputs })
    expect(installed.persistence).toBe('save-failed')
    expect(current(h).dispositions.filter(d => d.kind === 'installed')).toHaveLength(4)
    reject(h, request(h, 'task', { actionId: 'install', inputs }), 'NOT_AVAILABLE')
    reject(h, request(h, 'maintenance', { kind: 'mechanical', inputs: [inputs[2]],
      allocations: [{ instanceId: current(h).carried.equipment.weapon!.instanceId, amount: 1 }] }), 'NOT_AVAILABLE')
    h.faults.write = false
    move('H7-H8:reverse'); move('H1-H7:reverse'); move('H0-H1:reverse')
    h.faults.write = true
    const result = send('terminal', { kind: outcome === 'success' ? 'deliver' : 'withdraw' })
    expect(result.persistence).toBe('save-failed'); expect(current(h).phase).toBe('living-hub')
    expect(current(h).receipts.at(-1)?.outcome).toBe(outcome)
    expect(current(h).archives[0].site.enemies).toHaveLength(3)
    if (sampleId) expect(current(h).dispositions.find(d => d.kind === 'delivered')!.item.instanceId).toBe(sampleId)
    expect(e.spies.terminal.mock.results[0].value.steps).toEqual([])
    const counts = e.counts()
    expect(counts).toMatchObject({ initial: 0, depart: 0, activate: 0, terminate: 1, terminal: 1, consume: 0,
      rest: 4, reveal: 2, taskTransfer: 2, medical: 1, maintenance: 1, read: 0, materials: 0 })
    expect(counts.write).toBe(current(h).character.revision - f.value.character.revision)
    expect(counts.current).toBe(counts.write); expect(counts.batches).toBe(counts.write)
    h.faults.write = false; h.owner.retrySave()
    expect(e.counts()).toEqual({ ...counts, encode: counts.encode + 1, write: counts.write + 1 })
    recordCounts('install/terminal:' + outcome, counts)
    coldLatest(h)
    reject(h, request(h, 'depart', { commissionId: f.dependencies.catalog.data.mission.commissionId }), 'NOT_AVAILABLE')
  })
  it.each(['success', 'voluntary-failure'] as const)('two TEST declarations retain old %s through new actions/save/cold', outcome => {
    const prepared = history(outcome), h = cold(prepared.active, prepared.policy)
    // Second declaration is made only by the existing TEST producer; no session continue-next command.
    const old = current(h), preserved = { receipts: old.receipts, dispositions: old.dispositions, archives: old.archives, missions: old.missions[0] }
    h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    h.owner.dispatch(request(h, 'source', { sourceId: 'H1-search', method: 'dark' }))
    h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:reverse' }))
    h.owner.dispatch(request(h, 'terminal', { kind: 'withdraw' }))
    const v = current(h)
    expect(v.receipts.slice(0, preserved.receipts.length)).toEqual(preserved.receipts)
    expect(v.dispositions.slice(0, preserved.dispositions.length)).toEqual(preserved.dispositions)
    expect(v.archives.slice(0, preserved.archives.length)).toEqual(preserved.archives)
    expect(v.missions[0]).toEqual(preserved.missions)
    expect(v.missions[1].status).toBe('closed'); expect(v.receipts).toHaveLength(2)
    coldLatest(h)
    reject(h, request(h, 'depart', { commissionId: v.missions[1].binding.mission.commissionId }), 'NOT_AVAILABLE')
  })
})
