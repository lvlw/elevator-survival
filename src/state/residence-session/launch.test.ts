import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import * as lifecycle from '../../core/mission-lifecycle/controlled'
import * as cycle from '../../core/character-cycle'
import * as location from '../../core/residence-location/controlled'
import * as random from '../../core/random'
import { execution } from '../../core/residence-location/test-fixtures'
import { sourceItemId } from '../../core/residence-location/identity'
import { deserializeResidenceSave, serializeResidenceSave } from '../residence-save'
import { createResidenceSessionCommand } from './commands'
import type { ResidenceSessionCommand, ResidenceLaunchCommand, ResidenceRestCommand, ResidenceMoveCommand } from './types'
import { binding, catalogInput, command, currentActive, firstHarness, launchCommand, mutable, startFirst } from './test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('G4 A01/A02 controlled real first launch', () => {
  it('read-null -> creation -> three real core APIs -> one complete active commit without resource refresh', () => {
    const h = firstHarness({ mutateFresh: (s) => {
      Object.assign(s.character.body, { energy: 0, infectionProgress: 35, satiety: 1, suppression: 15,
        quotasRemaining: { suppressant: 0, disinfectant: 0, pipe_signature: 0 } })
      Object.assign(s.character.body.condition, { currentHealth: 3, bleeding: true, minorContusions: 1,
        painkillerActive: true, pendingInfectionExposures: 2 })
      s.carried.equipment.weapon = { instanceId: 'owned-pipe', definitionId: 'pipe', quantity: 1 }
      s.carried.backpack.items.push({ instanceId: 'owned-lamp', definitionId: 'lamp', quantity: 1 })
      s.carried.backpack.placements.push({ instanceId: 'owned-lamp', x: 2, y: 2, rotated: false })
      s.carried.quickSlots.slots[0] = { instanceId: 'owned-supply', definitionId: 'supply', quantity: 1 }
      s.itemStates.states.push({ instanceId: 'owned-pipe', definitionId: 'pipe', resource: { kind: 'durability', current: 2 } },
        { instanceId: 'owned-lamp', definitionId: 'lamp', resource: { kind: 'charge', current: 1 } },
        { instanceId: 'owned-supply', definitionId: 'supply', resource: { kind: 'none' } })
    } })
    const activate = vi.spyOn(lifecycle, 'activateMission'); const depart = vi.spyOn(cycle, 'planCharacterCycle')
    const establish = vi.spyOn(location, 'establishResidenceLocation'); const draw = vi.spyOn(random, 'drawIntInclusive')
    expect(h.owner.bootstrap().status).toBe('no-save'); h.owner.createFirst()
    const before = h.owner.getState().current!
    expect(before.phase).toBe('fresh-hub'); expect(h.owner.queryKnowledge()).toBeNull()
    const result = h.owner.dispatch(launchCommand(h)); const s = currentActive(h)
    expect(s.character.body).toEqual(before.character.body); expect(s.carried).toEqual(before.carried); expect(s.itemStates).toEqual(before.itemStates)
    expect(s.character).toMatchObject({ revision: 1, cycle: 1, clock: { kind: 'active', taskDay: 1, startCycle: 1, execution } })
    expect(s.missions[0]).toMatchObject({ status: 'active', execution }); expect(s.missions[1]).toEqual(before.missions[1])
    expect(s.site).toMatchObject({ nodeId: 'a', pending: { kind: 'none' }, binding: { identity: before.character.identity,
      mission: before.missions[0].binding.mission, execution, catalogId: h.catalog.data.id, catalogVersion: h.catalog.data.version } })
    expect(s.site.knowledge.visitedNodeIds).toEqual(['a']); expect(s.site.knowledge.knownEdgeIds).not.toContain('secret')
    expect(s.site.sources.every((v) => !v.claimed && v.drawIndex === 0)).toBe(true)
    expect(s.site.enemies[0].state).toMatchObject({ currentHealth: 10, hasBeenEncountered: false, defeated: false })
    expect(activate).toHaveBeenCalledTimes(1); expect(depart).toHaveBeenCalledTimes(1); expect(establish).toHaveBeenCalledTimes(1)
    expect(h.provider).toHaveBeenCalledTimes(1); expect(draw).not.toHaveBeenCalled()
    expect(h.storage.port.read).toHaveBeenCalledTimes(1); expect(h.storage.port.write).toHaveBeenCalledTimes(2); expect(h.listener).toHaveBeenCalledTimes(2)
    expect(deserializeResidenceSave(h.storage.value()!, h.policy)).toEqual(result.current)
  })
  it.each(['unbootstrapped', 'no-save', 'stale', 'identity', 'spare', 'unknown', 'active', 'missing-provider', 'extra', 'overflow'])
  ('rejects %s before provider and without partial commit', (mode) => {
    const h = firstHarness({ omitProvider: mode === 'missing-provider' })
    if (mode !== 'unbootstrapped') h.owner.bootstrap()
    if (!['unbootstrapped', 'no-save'].includes(mode)) h.owner.createFirst()
    if (mode === 'active') h.owner.dispatch(launchCommand(h))
    // A cold-valid fresh can have a large revision; overflow must precede provider.
    const owner = mode === 'overflow' ? firstHarness({ initial: serializeResidenceSave({ ...h.raw,
      character: { ...h.raw.character, revision: Number.MAX_SAFE_INTEGER } }, h.policy) }) : h
    if (mode === 'overflow') owner.owner.bootstrap()
    const request = { kind: 'launch', identity: { ...h.raw.character.identity }, expectedRevision: owner.owner.getState().current?.character.revision ?? 0,
      commissionId: mode === 'spare' ? 'spare' : mode === 'unknown' ? 'missing' : 'commission' }
    if (mode === 'stale') request.expectedRevision++
    if (mode === 'identity') request.identity.characterId = 'other'
    const before = owner.owner.getState(); const saved = owner.storage.value()
    const writes = owner.storage.port.write.mock.calls.length; const notifications = owner.listener.mock.calls.length
    const calls = owner.provider.mock.calls.length
    const code = mode === 'stale' ? 'STALE_COMMAND' : mode === 'identity' ? 'BINDING_MISMATCH'
      : mode === 'extra' ? 'INVALID_INPUT' : mode === 'overflow' ? 'SAFE_INTEGER_OVERFLOW' : 'NOT_AVAILABLE'
    expect(() => owner.owner.dispatch(mode === 'extra' ? { ...request, seed: 'injected' } : request))
      .toThrowError(expect.objectContaining({ code }))
    expect(owner.provider).toHaveBeenCalledTimes(calls); expect(owner.owner.getState()).toEqual(before); expect(owner.storage.value()).toBe(saved)
    expect(owner.storage.port.write).toHaveBeenCalledTimes(writes); expect(owner.listener).toHaveBeenCalledTimes(notifications)
  })
  it('cold fresh nonzero revision launches without inventing a revision-zero eligibility rule', () => {
    const base = firstHarness(); const h = firstHarness({ initial: serializeResidenceSave({ ...base.raw,
      character: { ...base.raw.character, revision: 4 } }, base.policy) })
    h.owner.bootstrap(); h.owner.dispatch(launchCommand(h))
    expect(currentActive(h).character.revision).toBe(5); expect(h.factory).not.toHaveBeenCalled()
  })
  it('only the canonical catalog commission may launch even when both declared facts are unaccepted', () => {
    const catalog = catalogInput(); catalog.mission.commissionId = 'spare'
    const h = firstHarness({ catalog }); h.owner.bootstrap(); h.owner.createFirst()
    expect(() => h.owner.dispatch(launchCommand(h))).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(h.provider).not.toHaveBeenCalled(); expect(h.owner.getState().current?.phase).toBe('fresh-hub')
    h.owner.dispatch({ ...launchCommand(h), commissionId: 'spare' })
    expect(currentActive(h).missions.map((m) => m.status)).toEqual(['unaccepted', 'active'])
  })
  it.each(['throw', 'null', 'array', 'class', 'promise', 'missing', 'extra', 'space', 'control', 'version', 'accessor', 'symbol'])
  ('invalid execution material %s never activates or writes', (mode) => {
    const getter = vi.fn(() => 'bad')
    const raw: unknown = mode === 'null' ? null : mode === 'array' ? [] : mode === 'class' ? new (class { runId = 'r' })()
      : mode === 'promise' ? Promise.resolve(execution) : mode === 'missing' ? { runId: 'r', rulesVersion: execution.rulesVersion }
        : mode === 'extra' ? { ...execution, nextState: {} } : mode === 'space' ? { ...execution, seed: ' padded ' }
          : mode === 'control' ? { ...execution, runId: 'bad\nvalue' } : mode === 'version' ? { ...execution, rulesVersion: 'unknown' }
            : mode === 'accessor' ? Object.defineProperty({ ...execution }, 'seed', { enumerable: true, get: getter })
              : mode === 'symbol' ? { ...execution, [Symbol('hidden')]: 1 } : execution
    const h = firstHarness({ provider: () => { if (mode === 'throw') throw new Error('private'); return raw } })
    h.owner.bootstrap(); h.owner.createFirst(); const before = h.owner.getState().current; const saved = h.storage.value()
    const activate = vi.spyOn(lifecycle, 'activateMission')
    expect(() => h.owner.dispatch(launchCommand(h))).toThrowError(expect.objectContaining({ code: mode === 'throw' ? 'EXECUTION_PROVIDER_FAILED' : mode === 'version' ? 'EXECUTION_MISMATCH' : 'INVALID_INPUT' }))
    expect(h.provider).toHaveBeenCalledTimes(1); expect(activate).not.toHaveBeenCalled(); expect(getter).not.toHaveBeenCalled()
    expect(h.owner.getState().current).toBe(before); expect(h.storage.value()).toBe(saved)
    expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
  })
  it('copies provider material and captures composition port; never freezes caller material', () => {
    const material = { ...execution }; const h = firstHarness({ provider: () => material })
    h.composition.provideFirstExecution = vi.fn(() => { throw new Error('replacement must not run') })
    startFirst(h); material.seed = 'changed'
    expect(currentActive(h).site.binding.execution).toEqual(execution); expect(Object.isFrozen(material)).toBe(false)
    expect(Object.isFrozen(currentActive(h).site.binding.execution)).toBe(true)
  })
  it('entry enemy produces genuine unsupported proposal, not a pending-cleared active save', () => {
    const catalog = catalogInput(); catalog.entryNodeId = 'c'
    const h = firstHarness({ catalog }); h.owner.bootstrap(); h.owner.createFirst()
    const before = h.owner.getState().current; const saved = h.storage.value()
    const establish = vi.spyOn(location, 'establishResidenceLocation')
    expect(() => h.owner.dispatch(launchCommand(h))).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_RESULT' }))
    expect(establish.mock.results[0].value.site.pending.kind).toBe('combat-required')
    expect(h.owner.getState().current).toBe(before); expect(h.storage.value()).toBe(saved)
    expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
  })
  it('late aggregate rejection after all three core proposals leaves the current fresh and original save untouched', () => {
    const h = firstHarness({ mutateFresh: (s) => {
      const instanceId = sourceItemId({ identity: s.character.identity, mission: s.missions[0].binding.mission, execution,
        catalogId: s.catalogRef.catalogId, catalogVersion: s.catalogRef.catalogVersion }, 'east', 'a', 'fixed', 0)
      s.carried.backpack.items.push({ instanceId, definitionId: 'pipe', quantity: 1 })
      s.carried.backpack.placements.push({ instanceId, x: 0, y: 0, rotated: false })
      s.itemStates.states.push({ instanceId, definitionId: 'pipe', resource: { kind: 'durability', current: 2 } })
    } }); h.owner.bootstrap(); h.owner.createFirst()
    const before = h.owner.getState().current; const saved = h.storage.value()
    const activate = vi.spyOn(lifecycle, 'activateMission'); const depart = vi.spyOn(cycle, 'planCharacterCycle')
    const establish = vi.spyOn(location, 'establishResidenceLocation')
    expect(() => h.owner.dispatch(launchCommand(h))).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }))
    for (const spy of [activate, depart, establish]) { expect(spy).toHaveBeenCalledTimes(1); expect(spy.mock.results[0].type).toBe('return') }
    expect(h.owner.getState().current).toBe(before); expect(h.storage.value()).toBe(saved)
    expect(h.provider).toHaveBeenCalledTimes(1); expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
  })
  it('provider callback is busy for all writers and remains read-only until one complete commit', () => {
    const h = firstHarness(); h.owner.bootstrap(); h.owner.createFirst()
    const before = h.owner.getState().current
    h.provider.mockImplementation(() => {
      for (const op of [h.owner.bootstrap, h.owner.retryRead, h.owner.createFirst, h.owner.retrySave,
        () => h.owner.dispatch(launchCommand(h))]) expect(op).toThrowError(expect.objectContaining({ code: 'BUSY' }))
      expect(h.owner.getState().current).toBe(before); expect(h.owner.queryKnowledge()).toBeNull()
      const listener = vi.fn(); h.owner.subscribe(listener)(); expect(listener).not.toHaveBeenCalled()
      return execution
    })
    h.owner.dispatch(launchCommand(h)); expect(h.provider).toHaveBeenCalledTimes(1)
  })
})

describe('G4 A11 command and stage contracts', () => {
  function validCommands() {
    const h = firstHarness(); const launch = { kind: 'launch' as const, identity: h.raw.character.identity, expectedRevision: 0, commissionId: 'commission' }
    startFirst(h); const b = binding(currentActive(h))
    return [launch, { ...b, kind: 'move' as const, edgeId: 'ab' }, { ...b, kind: 'reveal' as const, sourceId: 'fixed' },
      { ...b, kind: 'pickup' as const, instanceId: 'real-instance', placement: { x: 0, y: 0, rotated: false } },
      { ...b, kind: 'drop' as const, instanceId: 'real-instance' }, { ...b, kind: 'rest' as const }]
  }
  it('six runtime variants strictly copy/freeze and agree with the public discriminated union', () => {
    expectTypeOf<ResidenceSessionCommand['kind']>().toEqualTypeOf<'launch' | 'move' | 'reveal' | 'pickup' | 'drop' | 'rest'>()
    expectTypeOf<Extract<ResidenceSessionCommand, { kind: 'move' }>>().toEqualTypeOf<ResidenceMoveCommand>()
    expectTypeOf<ResidenceLaunchCommand>().not.toHaveProperty('execution')
    expectTypeOf<ResidenceRestCommand>().not.toHaveProperty('rest')
    for (const input of validCommands()) {
      const raw = mutable(input); const parsed = createResidenceSessionCommand(raw)
      expect(parsed).toEqual(raw); expect(parsed).not.toBe(raw); expect(Object.isFrozen(parsed)).toBe(true); expect(Object.isFrozen(raw)).toBe(false)
      expect(Object.isFrozen('binding' in parsed ? parsed.binding : parsed.identity)).toBe(true)
    }
  })
  it.each(['null', 'array', 'class', 'unknown', 'missing-kind', 'fraction', 'negative', 'unsafe', 'missing-placement', 'rest-choice'])
  ('strict constructor rejects %s at the intended boundary', (mode) => {
    const commands = validCommands(); const move = commands[1]
    const input = mode === 'null' ? null : mode === 'array' ? [] : mode === 'class' ? new (class {})()
      : mode === 'unknown' ? { kind: 'view' } : mode === 'missing-kind' ? {} : mode === 'missing-placement'
        ? { ...commands[3], placement: undefined } : mode === 'rest-choice' ? { ...commands[5], rest: 'A' }
          : { ...move, expectedRevision: mode === 'fraction' ? 0.5 : mode === 'negative' ? -1 : Number.MAX_SAFE_INTEGER + 1 }
    expect(() => createResidenceSessionCommand(input)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })
  it.each(['cost', 'nextState', 'snapshot', 'seed', 'runId', 'plan', 'effects', 'business_supported', 'edgeIds', 'quantity'])
  ('all six commands reject injected %s', (key) => {
    for (const command of validCommands()) expect(() => createResidenceSessionCommand({ ...command, [key]: true }))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })
  it.each(['move', 'reveal', 'pickup', 'drop', 'rest'] as const)('fresh phase rejects correctly shaped %s without invoking rules', (kind) => {
    const requests = validCommands(); const raw = requests.find((v) => v.kind === kind)!
    const h = firstHarness(); h.owner.bootstrap(); h.owner.createFirst()
    expect(() => h.owner.dispatch({ ...raw, expectedRevision: 0 })).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(h.provider).not.toHaveBeenCalled(); expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
  })
  it('optional provider does not prevent G3 cold bootstrap or ordinary move', () => {
    const source = firstHarness(); startFirst(source)
    const h = firstHarness({ omitProvider: true, initial: source.storage.value() }); h.owner.bootstrap()
    h.owner.dispatch(command(currentActive(h))); expect(currentActive(h).site.nodeId).toBe('b'); expect(h.provider).not.toHaveBeenCalled()
  })
})
