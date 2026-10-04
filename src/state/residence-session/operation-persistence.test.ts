import { afterEach, describe, expect, it, vi } from 'vitest'
import * as mission from '../../core/mission-lifecycle/controlled'
import * as cycle from '../../core/character-cycle'
import * as energy from '../../core/residence-energy'
import * as g2 from '../../core/residence-location'
import * as controlled from '../../core/residence-location/controlled'
import * as knowledge from '../../core/residence-location/knowledge'
import * as random from '../../core/random'
import { deserializeResidenceSave } from '../residence-save'
import { binding, command, currentActive, firstHarness, launchCommand, startFirst, type FirstHarness } from './test-fixtures'
afterEach(() => vi.restoreAllMocks())

const reveal = (h: FirstHarness) => ({ kind: 'reveal' as const, ...binding(currentActive(h)), sourceId: 'lottery-a' })
const rest = (h: FirstHarness) => ({ kind: 'rest' as const, ...binding(currentActive(h)) })
const pickup = (h: FirstHarness) => ({ kind: 'pickup' as const, ...binding(currentActive(h)),
  instanceId: currentActive(h).site.ground[0].items[0].instanceId, placement: { x: 0, y: 0, rotated: false } })

/** Observe real core calls; no mock results or bypass of plan provenance. */
function observe(h: FirstHarness) {
  const activate = vi.spyOn(mission, 'activateMission'); const establish = vi.spyOn(controlled, 'establishResidenceLocation')
  const bodyCycle = vi.spyOn(cycle, 'planCharacterCycle'); const action = vi.spyOn(energy, 'planResidenceAction')
  const source = vi.spyOn(g2, 'planResidenceSourceReveal'); const transfer = vi.spyOn(g2, 'planResidenceItemTransfer')
  const resting = vi.spyOn(controlled, 'planResidenceLocationRest'); const move = vi.spyOn(g2, 'planResidenceMove')
  const draw = vi.spyOn(random, 'drawIntInclusive')
  const replacements = new Set<object>()
  h.storage.hooks.write = () => { replacements.add(h.owner.getState().current!) }
  const plans = () => ({ activation: activate.mock.calls.length, establishment: establish.mock.calls.length,
    cycle: bodyCycle.mock.calls.length, action: action.mock.calls.length, reveal: source.mock.calls.length,
    transfer: transfer.mock.calls.length, rest: resting.mock.calls.length, move: move.mock.calls.length, draw: draw.mock.calls.length })
  const counts = () => ({ ...plans(), read: h.storage.port.read.mock.calls.length, factory: h.factory.mock.calls.length,
    provider: h.provider.mock.calls.length, commits: replacements.size, write: h.storage.port.write.mock.calls.length,
    notification: h.listener.mock.calls.length })
  const successfulReturns = () => [activate, establish, bodyCycle, action, source, transfer, resting, move, draw]
    .map((spy) => spy.mock.results.filter((result) => result.type === 'return').length)
  return { plans, counts, successfulReturns }
}

describe('G4 A09 independent persistence fault chains', () => {
  it('chain 1: first launch write fails -> repeated launch rejects -> reveal -> retry newest; independent exact counters', () => {
    const h = firstHarness(); const evidence = observe(h)
    h.owner.bootstrap(); h.owner.createFirst(); const initialSave = h.storage.value(); const oldLaunch = launchCommand(h)
    h.storage.writeFailure(true); const launch = h.owner.dispatch(oldLaunch)
    expect(launch.persistence).toBe('save-failed'); expect(launch.current).toBe(h.owner.getState().current)
    expect(currentActive(h).character.revision).toBe(1); expect(h.storage.value()).toBe(initialSave)
    expect(() => h.owner.dispatch(oldLaunch)).toThrowError(expect.objectContaining({ code: 'STALE_COMMAND' }))
    expect(() => h.owner.dispatch(launchCommand(h))).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    h.storage.writeFailure(false); h.owner.dispatch(reveal(h)); const latest = h.owner.getState().current
    const plansBeforeRetry = evidence.plans(); expect(h.owner.retrySave().persistence).toBe('saved')
    expect(h.owner.getState().current).toBe(latest); expect(evidence.plans()).toEqual(plansBeforeRetry)
    expect(deserializeResidenceSave(h.storage.value()!, h.policy)).toEqual(latest)
    expect(evidence.counts()).toEqual({ activation: 1, establishment: 1, cycle: 1, action: 1, reveal: 1, transfer: 0, rest: 0, move: 0,
      draw: 1, read: 1, factory: 1, provider: 1, commits: 3, write: 4, notification: 3 })
    expect(evidence.successfulReturns()).toEqual([1, 1, 1, 1, 1, 0, 0, 0, 1])
  })
  it('chain 2: reveal failure -> pickup -> rest failure -> stale rest -> retry -> isolated cold restore; exact counters', () => {
    const h = firstHarness(); const evidence = observe(h); startFirst(h)
    const launchSave = h.storage.value(); h.storage.writeFailure(true)
    expect(h.owner.dispatch(reveal(h)).persistence).toBe('save-failed'); expect(h.storage.value()).toBe(launchSave)
    const entity = currentActive(h).site.ground[0].items[0]
    const resource = currentActive(h).itemStates.states.find((v) => v.instanceId === entity.instanceId)
    h.storage.writeFailure(false); h.owner.dispatch(pickup(h)); const pickupSave = h.storage.value()
    h.storage.writeFailure(true); const oldRest = rest(h)
    expect(h.owner.dispatch(oldRest).persistence).toBe('save-failed'); expect(h.storage.value()).toBe(pickupSave)
    const latest = currentActive(h)
    expect(() => h.owner.dispatch(oldRest)).toThrowError(expect.objectContaining({ code: 'STALE_COMMAND' }))
    h.storage.writeFailure(false); const plans = evidence.plans(); h.owner.retrySave(); expect(evidence.plans()).toEqual(plans)
    expect(h.owner.getState().current).toBe(latest)
    expect(latest.character).toMatchObject({ revision: 4, cycle: 2, clock: { taskDay: 2, startCycle: 1 }, body: { energy: 100 } })
    expect(latest.site.sources[1]).toMatchObject({ claimed: true, drawIndex: 1 })
    expect(latest.carried.backpack.items).toEqual([entity]); expect(latest.itemStates.states).toEqual([resource]); expect(latest.site.ground[0].items).toEqual([])
    expect(evidence.counts()).toEqual({ activation: 1, establishment: 1, cycle: 2, action: 2, reveal: 1, transfer: 1, rest: 1, move: 0,
      draw: 1, read: 1, factory: 1, provider: 1, commits: 5, write: 6, notification: 5 })
    expect(evidence.successfulReturns()).toEqual([1, 1, 2, 2, 1, 1, 1, 0, 1])
    const cold = firstHarness({ initial: h.storage.value() }); expect(cold.owner.bootstrap().current).toEqual(latest)
    expect(cold.storage.port.read).toHaveBeenCalledTimes(1); expect(cold.storage.port.write).not.toHaveBeenCalled()
    expect(cold.factory).not.toHaveBeenCalled(); expect(cold.provider).not.toHaveBeenCalled(); expect(cold.listener).not.toHaveBeenCalled()
    expect(evidence.plans()).toEqual(plans)
  })
  it.each(['launch', 'reveal', 'pickup', 'drop', 'rest'] as const)('%s failure retains full committed state and retry never reruns rules', (kind) => {
    const h = firstHarness(); h.owner.bootstrap(); h.owner.createFirst()
    if (kind !== 'launch') h.owner.dispatch(launchCommand(h))
    if (kind === 'pickup' || kind === 'drop') h.owner.dispatch(reveal(h))
    if (kind === 'drop') h.owner.dispatch(pickup(h))
    const evidence = observe(h)
    const request = kind === 'launch' ? launchCommand(h) : kind === 'reveal' ? reveal(h) : kind === 'pickup' ? pickup(h)
      : kind === 'rest' ? rest(h) : { kind: 'drop', ...binding(currentActive(h)), instanceId: currentActive(h).carried.backpack.items[0].instanceId }
    const old = h.owner.getState().current!; const saved = h.storage.value()
    const writeCount = h.storage.port.write.mock.calls.length; const notifyCount = h.listener.mock.calls.length
    h.storage.writeFailure(true); const result = h.owner.dispatch(request)
    expect(result.persistence).toBe('save-failed'); expect(result.current.character.revision).toBe(old.character.revision + 1)
    expect(result.current).toBe(h.owner.getState().current); expect(h.storage.value()).toBe(saved)
    expect(() => h.owner.dispatch(request)).toThrowError(expect.objectContaining({ code: 'STALE_COMMAND' }))
    const plans = evidence.plans(); const providerCalls = h.provider.mock.calls.length
    expect(h.owner.retrySave().persistence).toBe('save-failed'); expect(h.storage.value()).toBe(saved)
    h.storage.writeFailure(false); expect(h.owner.retrySave().persistence).toBe('saved')
    expect(evidence.plans()).toEqual(plans); expect(h.provider).toHaveBeenCalledTimes(providerCalls)
    expect(h.owner.getState().current).toBe(result.current); expect(deserializeResidenceSave(h.storage.value()!, h.policy)).toEqual(result.current)
    expect(h.storage.port.write).toHaveBeenCalledTimes(writeCount + 3); expect(h.listener).toHaveBeenCalledTimes(notifyCount + 1)
    expect(evidence.counts().commits).toBe(1); expect(h.storage.port.read).toHaveBeenCalledTimes(1)
  })
})

describe('G4 A08 cold checkpoints and A10 reentry', () => {
  it.each(['launch', 'reveal', 'pickup', 'drop', 'rest'] as const)('%s checkpoint reloads exactly with no arrival/draw/save and continues from restored revision', (checkpoint) => {
    const h = firstHarness(); startFirst(h)
    if (checkpoint !== 'launch') h.owner.dispatch(reveal(h))
    if (checkpoint === 'pickup' || checkpoint === 'drop' || checkpoint === 'rest') h.owner.dispatch(pickup(h))
    if (checkpoint === 'drop') h.owner.dispatch({ kind: 'drop', ...binding(currentActive(h)), instanceId: currentActive(h).carried.backpack.items[0].instanceId })
    if (checkpoint === 'rest') h.owner.dispatch(rest(h))
    const expected = currentActive(h); const cold = firstHarness({ initial: h.storage.value() })
    const evidence = observe(cold); const observation = vi.spyOn(knowledge, 'observeLocationArrival')
    expect(cold.owner.bootstrap().current).toEqual(expected); expect(cold.owner.queryKnowledge()).toEqual(h.owner.queryKnowledge())
    expect(evidence.counts()).toEqual({ activation: 0, establishment: 0, cycle: 0, action: 0, reveal: 0, transfer: 0, rest: 0, move: 0,
      draw: 0, read: 1, factory: 0, provider: 0, commits: 0, write: 0, notification: 0 })
    expect(observation).not.toHaveBeenCalled()
    if (checkpoint === 'drop') cold.owner.dispatch(pickup(cold))
    else cold.owner.dispatch(command(currentActive(cold)))
    expect(currentActive(cold).character.revision).toBe(expected.character.revision + 1)
    expect(currentActive(cold).site.sources).toEqual(expected.site.sources)
    if (checkpoint === 'drop') {
      expect(currentActive(cold).carried.backpack.items).toEqual(expected.site.ground[0].items)
      expect(currentActive(cold).site.ground[0].items).toEqual([])
    } else expect(currentActive(cold).carried).toEqual(expected.carried)
    expect(currentActive(cold).itemStates).toEqual(expected.itemStates)
    expect(cold.storage.port.write).toHaveBeenCalledTimes(1); expect(cold.listener).toHaveBeenCalledTimes(1)
  })
  it.each(['read', 'factory', 'provider', 'write', 'notify'] as const)('%s callback blocks every mutating API while allowing immutable reads', (stage) => {
    const h = firstHarness(); const codes: unknown[] = []; const observations: unknown[] = []
    const verify = () => {
      observations.push(h.owner.getState().current)
      h.owner.queryKnowledge()
      const unused = vi.fn(); h.owner.subscribe(unused)(); expect(unused).not.toHaveBeenCalled()
      for (const op of [h.owner.bootstrap, h.owner.retryRead, h.owner.createFirst, h.owner.retrySave, () => h.owner.dispatch({ kind: 'view' })]) {
        try { op(); codes.push('unexpected-success') } catch (e) { codes.push(e && typeof e === 'object' && 'code' in e ? e.code : 'unknown') }
      }
    }
    if (stage === 'read') h.storage.hooks.read = verify
    if (stage === 'factory') h.factory.mockImplementation(() => { verify(); return h.raw })
    h.owner.bootstrap(); h.owner.createFirst()
    if (stage === 'provider') { const material = h.provider(); h.provider.mockClear(); h.provider.mockImplementation(() => { verify(); return material }) }
    if (stage === 'write') h.storage.hooks.write = verify
    if (stage === 'notify') h.owner.subscribe(verify)
    const result = h.owner.dispatch(launchCommand(h))
    expect(result.persistence).toBe('saved'); expect(result.notificationErrors).toEqual([])
    expect(codes).toEqual(Array.from({ length: 5 }, () => 'BUSY'))
    expect(observations).toHaveLength(1)
    if (stage === 'read' || stage === 'factory') expect(observations[0]).toBeNull()
    else expect(observations[0]).toMatchObject({ phase: stage === 'provider' ? 'fresh-hub' : 'active-world' })
    expect(h.provider).toHaveBeenCalledTimes(1); expect(h.storage.port.read).toHaveBeenCalledTimes(1)
    expect(h.storage.port.write).toHaveBeenCalledTimes(2); expect(h.listener).toHaveBeenCalledTimes(2)
  })
  it('throwing subscriber cannot hide committed reveal from later listeners or cause replay', () => {
    const h = firstHarness(); startFirst(h); const raw = new Error('secret callback')
    h.owner.subscribe(() => { throw raw }); const last = vi.fn(); h.owner.subscribe(last)
    const plan = vi.spyOn(g2, 'planResidenceSourceReveal')
    const result = h.owner.dispatch(reveal(h))
    expect(result.notificationErrors).toEqual([{ code: 'LISTENER_FAILED' }]); expect(result.persistence).toBe('saved')
    expect(last).toHaveBeenCalledTimes(1); expect(last.mock.calls[0][0].current).toBe(result.current)
    expect(Object.isFrozen(raw)).toBe(false); expect(JSON.stringify(result)).not.toContain('secret callback')
    expect(plan).toHaveBeenCalledTimes(1); expect(h.storage.port.write).toHaveBeenCalledTimes(3); expect(h.listener).toHaveBeenCalledTimes(3)
  })
})
