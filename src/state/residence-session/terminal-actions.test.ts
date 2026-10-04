import { afterEach, describe, expect, it, vi } from 'vitest'
import * as g2 from '../../core/residence-location'
import * as controlled from '../../core/residence-location/controlled'
import * as cycle from '../../core/character-cycle'
import * as random from '../../core/random'
import { firstHarness, fixture, cold, start, request, active, rejectUnchanged, savedEqualsCurrent, mutable, withAssets } from './terminal-test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('C03 native living actions and persistent site', () => {
  it('single-edge cross-place travel consumes G1 once and keeps all non-location owners', () => {
    const f = fixture({ balance: 47 }); const h = cold(withAssets(f), f.policy)
    const before = active(h); const move = vi.spyOn(g2, 'planResidenceMove')
    const body = vi.spyOn(cycle, 'planCharacterCycle')
    h.owner.dispatch(request(h, 'move', { edgeId: 'ab' })); const after = active(h)
    expect(after.site.nodeId).toBe('b'); expect(after.site.binding).toEqual(before.site.binding)
    expect(after.character.body.energy).toBe(92); expect(after.character.revision).toBe(before.character.revision + 1)
    for (const key of ['balance', 'warehouse', 'missions', 'receipts', 'archives', 'dispositions', 'carried', 'itemStates'] as const) expect(after[key]).toEqual(before[key])
    expect(move).toHaveBeenCalledTimes(1); expect(body).not.toHaveBeenCalled(); savedEqualsCurrent(h)
  })
  it.each(['fixed', 'lottery-a'])('source %s reveals once; complete instances/resources survive cold restore without redrawing', (sourceId) => {
    const h = firstHarness(); start(h); const draw = vi.spyOn(random, 'drawIntInclusive')
    h.owner.dispatch(request(h, 'reveal', { sourceId })); const before = active(h)
    expect(before.carried.backpack.items).toEqual([]); expect(before.site.ground[0].items.length).toBeGreaterThan(0)
    expect(draw).toHaveBeenCalledTimes(sourceId === 'fixed' ? 0 : 1)
    rejectUnchanged(h, request(h, 'reveal', { sourceId }), 'NOT_AVAILABLE')
    const reload = cold(before, h.policy)
    expect(reload.owner.getState().current).toEqual(h.owner.getState().current)
    expect(draw).toHaveBeenCalledTimes(sourceId === 'fixed' ? 0 : 1); savedEqualsCurrent(h)
  })
  it.each(['pipe', 'lamp', 'supply'])('E0 pickup/drop transfers whole %s identity/resource with no bleeding, merge or hidden replacement', (definitionId) => {
    const h = firstHarness({ catalog: (c) => {
      c.sources[0].contents = { kind: 'fixed', grants: [{ definitionId, quantity: definitionId === 'supply' ? 3 : 1,
        resource: definitionId === 'pipe' ? { kind: 'durability', current: 2 } : definitionId === 'lamp' ? { kind: 'charge', current: 1 } : { kind: 'none' } }] }
    }, fresh: (s) => { s.character.body.energy = 1; s.character.body.condition.bleeding = true } })
    start(h); h.owner.dispatch(request(h, 'reveal', { sourceId: 'fixed' }))
    const before = active(h); const item = before.site.ground[0].items[0]; const resource = before.itemStates.states[0]
    expect(before.character.body.energy).toBe(0)
    h.owner.dispatch(request(h, 'pickup', { instanceId: item.instanceId, placement: { x: 0, y: 0, rotated: false } }))
    expect(active(h).carried.backpack.items).toEqual([item]); expect(active(h).itemStates.states).toEqual([resource])
    expect(active(h).character.body).toEqual(before.character.body)
    h.owner.dispatch(request(h, 'drop', { instanceId: item.instanceId }))
    expect(active(h).site.ground[0].items).toEqual([item]); expect(active(h).carried.backpack.items).toEqual([])
    expect(active(h).character.body).toEqual(before.character.body); savedEqualsCurrent(h)
  })
  it.each(['A', 'C'] as const)('actual %s rest runs ordered cycle once and preserves source, enemies, knowledge and carry', (rest) => {
    const h = firstHarness({ catalog: (c) => { c.entryNodeId = rest === 'A' ? 'a' : 'b' },
      fresh: (s) => {
        Object.assign(s.character.body, { energy: 95, infectionProgress: 59, satiety: 2, suppression: 15 })
        s.character.body.quotasRemaining.suppressant = 0
        Object.assign(s.character.body.condition, { currentHealth: 11, bleeding: true, pendingInfectionExposures: 1, painkillerActive: true })
      } })
    start(h); const before = active(h)
    const producer = vi.spyOn(controlled, 'planResidenceLocationRest'); const body = vi.spyOn(cycle, 'planCharacterCycle')
    h.owner.dispatch(request(h, 'rest')); const next = active(h)
    expect(producer).toHaveBeenCalledTimes(1); expect(body).toHaveBeenCalledTimes(1)
    expect(body.mock.results[0].value.steps.map((s: { kind: string }) => s.kind)).toEqual(['cycle-bleeding', 'infection', 'hunger', 'end-cycle'])
    expect(next.character).toMatchObject({ cycle: 2, revision: 2, clock: { taskDay: 2, startCycle: 1 },
      body: { energy: rest === 'A' ? 100 : 85, infectionProgress: 74, satiety: 0, suppression: 0, condition: { currentHealth: 7 } } })
    expect(next.site).toEqual(before.site); expect(next.carried).toEqual(before.carried); expect(next.itemStates).toEqual(before.itemStates)
    savedEqualsCurrent(h)
  })
  it.each(['health', 'exposure'])('C supports real nonzero arrival %s without the old v1 blanket refusal', (kind) => {
    const h = firstHarness({ catalog: (c) => { c.edges[0].arrival = { healthLoss: kind === 'health' ? 1 : 0, exposuresAdded: kind === 'exposure' ? 1 : 0 } } })
    start(h); h.owner.dispatch(request(h, 'move', { edgeId: 'ab' }))
    expect(active(h).character.body.condition).toMatchObject({ currentHealth: kind === 'health' ? 11 : 12, pendingInfectionExposures: kind === 'exposure' ? 1 : 0 })
    savedEqualsCurrent(h)
  })
  it('supported live encounter is rejected whole, never clears pending or installs the arrival', () => {
    const h = firstHarness({ catalog: (c) => { c.enemies[0].nodeId = 'b' } })
    start(h); const plan = vi.spyOn(g2, 'planResidenceMove')
    rejectUnchanged(h, request(h, 'move', { edgeId: 'ab' }), 'UNSUPPORTED_RESULT')
    expect(plan).toHaveBeenCalledTimes(1)
    expect(plan.mock.results[0].value).toMatchObject({ coordination: 'combat-required', snapshot: { site: { nodeId: 'b', pending: { kind: 'combat-required' } } } })
    expect(active(h).site.nodeId).toBe('a')
  })
  it.each(['overlap', 'bounds', 'carry', 'task', 'partial', 'remote'])('illegal %s pickup has zero additional commit/write/notice', (kind) => {
    const h = firstHarness({ catalog: (c) => {
      if (kind === 'carry' || kind === 'task') c.sources[0].contents = { kind: 'fixed', grants: [{ definitionId: kind === 'carry' ? 'heavy' : 'quest', quantity: 1, resource: { kind: 'none' } }] }
    } })
    start(h); h.owner.dispatch(request(h, 'reveal', { sourceId: 'fixed' }))
    const item = active(h).site.ground[0].items[0]
    if (kind === 'overlap') h.owner.dispatch(request(h, 'pickup', { instanceId: item.instanceId, placement: { x: 0, y: 0, rotated: false } }))
    if (kind === 'remote') h.owner.dispatch(request(h, 'move', { edgeId: 'ab' }))
    const target = kind === 'overlap' ? active(h).site.ground[0].items[0] : item
    rejectUnchanged(h, request(h, 'pickup', { instanceId: target.instanceId, placement: { x: kind === 'bounds' ? 4 : 0, y: 0, rotated: false },
      ...(kind === 'partial' ? { quantity: 1 } : {}) }))
  })
  it.each(['unknown', 'secret', 'stale', 'foreign', 'E0'])('invalid move %s preserves full canonical current', (kind) => {
    const h = firstHarness({ fresh: (s) => { if (kind === 'E0') s.character.body.energy = 0 } }); start(h)
    const c = mutable(request(h, 'move', { edgeId: ['unknown', 'secret'].includes(kind) ? kind : 'ab' }))
    if (kind === 'stale') c.expectedRevision--
    if (kind === 'foreign') c.binding.execution.seed = 'wrong'
    rejectUnchanged(h, c)
  })
  it('rest cannot replace Day7 deadline or create Day8', () => {
    const f = fixture({ day: 7, node: 'b' }); const h = cold(f.value, f.policy)
    rejectUnchanged(h, request(h, 'rest')); expect(active(h).character.clock).toMatchObject({ taskDay: 7 })
    expect(h.owner.queryTerminalEligibility().deadline).toBe(true)
  })
})
