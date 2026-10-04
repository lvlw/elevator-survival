import { describe, expect, it, vi } from 'vitest'
import * as random from '../../core/random'
import { activateMission, terminateMission } from '../../core/mission-lifecycle/controlled'
import { planCharacterCycle } from '../../core/character-cycle'
import { planResidenceLocationRest } from '../../core/residence-location/controlled'
import { fixture, mutable, reveal, move } from '../residence-session/test-fixtures'
import { validateResidenceAggregate } from './index'

describe('G3 S03 aggregate cross-binding and real containers', () => {
  it.each(['success', 'voluntary-failure', 'deadline-failure'] as const)('actual G1 %s closed clock stays unsupported, not a fresh hub', (outcome) => {
    const f = fixture(); let s = f.state
    if (outcome === 'deadline-failure') {
      for (let day = 1; day < 7; day++) s = planResidenceLocationRest(s, { binding: s.site.binding, expectedRevision: s.character.revision, kind: 'rest' }, f.authorityFor(s), f.dependencies).snapshot
    }
    const result = planCharacterCycle(s.character, { identity: s.character.identity, expectedRevision: s.character.revision,
      kind: outcome === 'deadline-failure' ? 'deadline' : 'normal-return' },
    { ...f.authorityFor(s).cycle, normalReturn: outcome === 'deadline-failure' ? null : outcome }, f.dependencies.residence)
    const raw = mutable(f.active(s))
    raw.character = mutable(result.snapshot)
    raw.missions[0] = mutable(terminateMission(f.lifecycle, { binding: f.lifecycle.binding, execution: s.site.binding.execution, outcome }, f.fullScope))
    expect(raw.character.clock.kind).toBe(outcome === 'deadline-failure' ? 'deadline-ready' : 'return-due')
    expect(() => validateResidenceAggregate(raw, f.policy)).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_STAGE' }))
  })
  it('D7 current from six real G1 rests remains supported with D=T and startCycle1', () => {
    const f = fixture(); let s = f.state
    for (let day = 1; day < 7; day++) s = planResidenceLocationRest(s, { binding: s.site.binding, expectedRevision: s.character.revision, kind: 'rest' }, f.authorityFor(s), f.dependencies).snapshot
    expect(f.active(s).character).toMatchObject({ cycle: 7, clock: { taskDay: 7, startCycle: 1 } })
  })
  it('duplicate run ID in distinct active/closed facts is invalid, not merely unsupported history', () => {
    const f = fixture(); const raw = mutable(f.active())
    const second = activateMission(raw.missions[1], { binding: raw.missions[1].binding, execution: raw.site.binding.execution }, f.fullScope)
    raw.missions[1] = mutable(terminateMission(second, { binding: second.binding, execution: raw.site.binding.execution, outcome: 'success' }, f.fullScope))
    expect(() => validateResidenceAggregate(raw, f.policy)).toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }))
  })
  it.each(['missing-fact', 'duplicate-fact', 'extra-fact', 'cross-character', 'cross-world', 'two-active', 'run-reuse',
    'clock-execution', 'site-seed', 'site-revision', 'cycle', 'task-day', 'body-extra', 'missing-quota', 'missing-site',
    'missing-state', 'unknown-node', 'knowledge', 'enemy', 'source-cursor', 'infinity', 'fraction', 'negative', 'sparse'])('rejects %s', (mode) => {
    const f = fixture(); const raw = mutable(f.active())
    if (mode === 'missing-fact') raw.missions.pop()
    if (mode === 'duplicate-fact') raw.missions[1] = raw.missions[0]
    if (mode === 'extra-fact') raw.missions.push(raw.missions[0])
    if (mode === 'cross-character') raw.missions[0].binding.characterId = 'other'
    if (mode === 'cross-world') raw.missions[0].binding.mission.worldId = 'other'
    if (mode === 'two-active' || mode === 'run-reuse') {
      raw.missions[1] = mutable(activateMission(raw.missions[1], { binding: raw.missions[1].binding,
        execution: { ...raw.site.binding.execution, runId: mode === 'two-active' ? 'different' : raw.site.binding.execution.runId } }, f.fullScope))
    }
    if (raw.character.clock.kind === 'active') {
      if (mode === 'clock-execution') raw.character.clock.execution.runId = 'other'
      if (mode === 'task-day') raw.character.clock.taskDay = 8
    }
    if (mode === 'site-seed') raw.site.binding.execution.seed = 'other'
    if (mode === 'site-revision') Reflect.set(raw.site, 'revision', 0)
    if (mode === 'cycle') raw.character.cycle = 2
    if (mode === 'body-extra') Reflect.set(raw.character.body, 'hp', 12)
    if (mode === 'missing-quota') Reflect.deleteProperty(raw.character.body, 'quotasRemaining')
    if (mode === 'missing-site') Reflect.deleteProperty(raw, 'site')
    if (mode === 'missing-state') Reflect.deleteProperty(raw, 'itemStates')
    if (mode === 'unknown-node') raw.site.nodeId = 'unknown'
    if (mode === 'knowledge') raw.site.knowledge.visitedNodeIds = []
    if (mode === 'enemy') raw.site.enemies[0].state.currentHealth = 1000
    if (mode === 'source-cursor') raw.site.sources[0].drawIndex = 1
    if (mode === 'infinity') raw.character.body.energy = Infinity
    if (mode === 'fraction') raw.character.revision = 0.1
    if (mode === 'negative') raw.character.body.satiety = -1
    if (mode === 'sparse') raw.missions.length++
    expect(() => validateResidenceAggregate(raw, f.policy)).toThrow()
  })
  it.each(['null', 'array', 'class', 'extra', 'getter', 'symbol'])('rejects non-data/forged root %s without getter execution', (mode) => {
    const f = fixture(); const raw = mutable(f.active()); const getter = vi.fn(() => raw.character)
    if (mode === 'extra') Reflect.set(raw, 'nextState', {})
    if (mode === 'getter') Object.defineProperty(raw, 'character', { get: getter, enumerable: true })
    if (mode === 'symbol') Reflect.set(raw, Symbol('extra'), true)
    expect(() => validateResidenceAggregate(mode === 'null' ? null : mode === 'array' ? [] : mode === 'class' ? new (class {})() : raw, f.policy)).toThrow()
    expect(getter).not.toHaveBeenCalled()
  })
  it.each(['fresh', 'active'] as const)('validates %s actual containers and keeps state bindings', (phase) => {
    const f = fixture(); const raw = mutable(phase === 'fresh' ? f.fresh() : f.active())
    raw.carried.equipment.weapon = { instanceId: 'pipe', definitionId: 'pipe', quantity: 1 }
    raw.carried.quickSlots.slots[0] = { instanceId: 'supply', definitionId: 'supply', quantity: 1 }
    raw.carried.backpack.items.push({ instanceId: 'lamp', definitionId: 'lamp', quantity: 1 })
    raw.carried.backpack.placements.push({ instanceId: 'lamp', x: 0, y: 0, rotated: false })
    raw.itemStates.states.push({ instanceId: 'pipe', definitionId: 'pipe', resource: { kind: 'durability', current: 2 } },
      { instanceId: 'supply', definitionId: 'supply', resource: { kind: 'none' } }, { instanceId: 'lamp', definitionId: 'lamp', resource: { kind: 'charge', current: 1 } })
    const result = validateResidenceAggregate(raw, f.policy)
    expect(result.carried).toEqual(raw.carried)
    // The existing core collection canonicalizes order; verify every identity-bound resource.
    expect(result.itemStates.states).toEqual([...raw.itemStates.states].sort((a, b) => a.instanceId.localeCompare(b.instanceId)))
    expect(Object.isFrozen(raw.carried)).toBe(false)
    for (const mode of ['duplicate', 'missing-state', 'resource', 'overlap', 'bounds', 'carry', 'missing-quick']) {
      const bad = mutable(raw)
      if (mode === 'duplicate') bad.carried.quickSlots.slots[1] = bad.carried.quickSlots.slots[0]
      if (mode === 'missing-state') bad.itemStates.states.pop()
      if (mode === 'resource') bad.itemStates.states[0].resource = { kind: 'durability', current: 99 }
      if (mode === 'bounds') bad.carried.backpack.placements[0].x = 4
      if (mode === 'overlap' || mode === 'carry') {
        bad.carried.backpack.items.push({ instanceId: 'extra', definitionId: mode === 'carry' ? 'heavy' : 'lamp', quantity: 1 })
        bad.carried.backpack.placements.push({ instanceId: 'extra', x: mode === 'carry' ? 2 : 0, y: 0, rotated: false })
        bad.itemStates.states.push({ instanceId: 'extra', definitionId: mode === 'carry' ? 'heavy' : 'lamp', resource: mode === 'carry' ? { kind: 'none' } : { kind: 'charge', current: 1 } })
      }
      if (mode === 'missing-quick') Reflect.deleteProperty(bad.carried, 'quickSlots')
      expect(() => validateResidenceAggregate(bad, f.policy)).toThrow()
    }
  })
  it('rejects duplicate ground/carried and unclaimed source outputs without RNG', () => {
    const f = fixture(); const raw = mutable(f.active(reveal(f, f.state, 'fixed').snapshot))
    const duplicate = mutable(raw); duplicate.site.ground[1].items.push(duplicate.site.ground[0].items[0])
    expect(() => validateResidenceAggregate(duplicate, f.policy)).toThrow()
    raw.site.sources[0].claimed = false
    const draw = vi.spyOn(random, 'drawIntInclusive')
    try { expect(() => validateResidenceAggregate(raw, f.policy)).toThrow(); expect(draw).not.toHaveBeenCalled() }
    finally { vi.restoreAllMocks() }
  })
  it.each(['success', 'voluntary-failure', 'deadline-failure', 'death'] as const)('retains narrow %s but refuses whole closed-history installation', (outcome) => {
    const f = fixture(); const raw = mutable(f.fresh())
    raw.missions[0] = mutable(terminateMission(f.lifecycle, { binding: f.lifecycle.binding, execution: f.state.site.binding.execution, outcome }, f.fullScope))
    expect(() => validateResidenceAggregate(raw, f.policy)).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_STAGE' }))
    expect(raw.missions[0]).toHaveProperty('outcome', outcome)
  })
  it.each(['dead', 'later', 'pending'])('refuses known unsupported %s', (mode) => {
    const f = fixture(); const raw = mutable(f.active())
    if (mode === 'dead') raw.character.body.condition.currentHealth = 0
    if (mode === 'later' && raw.character.clock.kind === 'active') { raw.character.clock.startCycle = 2; raw.character.cycle = 2 }
    if (mode === 'pending') {
      const b = move(f, f.state, 'ab').snapshot; const r = mutable(b); r.site.facts[0].value = true
      const c = move(f, r, 'bc').snapshot
      Object.assign(raw, c)
    }
    expect(() => validateResidenceAggregate(raw, f.policy)).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_STAGE' }))
  })
})
