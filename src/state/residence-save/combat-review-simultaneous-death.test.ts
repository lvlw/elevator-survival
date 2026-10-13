// WebGPT native regression template; NOT RUN in the mainline container.
// Copy byte-exact for the first run to:
// src/state/residence-save/combat-review-simultaneous-death.test.ts
// Only the pre-entry low-HP/bleeding boundary is explicitly TEST material.
// Enemy damage, CTB, death, resource consumption, archive and lifecycle are real P producers.
import { describe, expect, it } from 'vitest'
import { fixture, entered, bodyBoundary, context, mutable, wire } from './combat-test-fixtures'
import { readCombatValue } from '../../core/residence-combat/validation'
import { validateCombatResidenceAggregate } from './combat-validation'
import { serializeCombatResidenceSave, deserializeCombatResidenceSave } from './combat-codec'
import { restoreCombatResidenceCandidate } from './combat-expected'
import { CombatResidenceSaveError } from './combat-types'
import type { CombatResidenceExpectation, CombatResidencePolicy } from './combat-types'
import type { CombatValue } from '../../core/residence-combat/types'

type Api = 'aggregate' | 'encode' | 'decode' | 'same-progress'
const apis: readonly Api[] = ['aggregate', 'encode', 'decode', 'same-progress']
function invoke(api: Api, value: unknown, e: CombatResidenceExpectation, policy: CombatResidencePolicy,
  committed: CombatValue) {
  if (api === 'aggregate') return validateCombatResidenceAggregate(value, e, policy)
  if (api === 'encode') return serializeCombatResidenceSave(value, e, policy)
  if (api === 'decode') return deserializeCombatResidenceSave(wire(value), e, policy)
  return restoreCombatResidenceCandidate(value, committed, e, policy)
}
function finished(healthBeforeEntry: 6 | 7 = 6) {
  const h = fixture()
  let v = h.move(h.value, 'H1').snapshot
  v = h.task(v, 'fire-door', { method: 'crow', toolInstanceId: v.carried.equipment.utility!.instanceId }).snapshot
  v = bodyBoundary(v, h.deps, { condition: { ...v.character.body.condition,
    currentHealth: healthBeforeEntry, bleeding: true } })
  v = h.move(v, 'H4').snapshot
  // Real G1 arrival bleeding before real battle; no hand-written enemy or battle receipt.
  expect(v.character.body.condition.currentHealth).toBe(healthBeforeEntry - 1)
  v = h.action(v, { kind: 'metal-pipe-charged-strike' }).snapshot
  expect(v.battle!.decision!.enemyHealthAfter).toBe(8)
  v = h.action(v, { kind: 'metal-pipe-basic-attack' }).snapshot
  expect(v.battle!.decision!.enemyHealthAfter).toBe(4)
  expect(v.character.body.condition.currentHealth).toBe(healthBeforeEntry - 5)
  const beforeLast = v
  const end = h.action(v, { kind: 'metal-pipe-basic-attack' }).snapshot
  expect(readCombatValue(end, h.deps)).toEqual(end)
  return { h, end, beforeLast }
}
function assertSame(api: Api, end: CombatValue, e: CombatResidenceExpectation, policy: CombatResidencePolicy) {
  const raw = mutable(end), saved = structuredClone(raw), expectedSaved = structuredClone(e)
  const result = invoke(api, raw, e, policy, end)
  if (api === 'encode') expect(JSON.parse(result as string).state).toEqual(end)
  else if (api === 'aggregate') expect(result).toEqual(end)
  else expect(result).toMatchObject({ kind: 'combat-residence-candidate', value: end })
  expect(raw).toEqual(saved); expect(e).toEqual(expectedSaved)
  expect(Object.isFrozen(raw)).toBe(false); expect(Object.isFrozen(e)).toBe(false)
}
describe('E02-R R-F01 final player death preserves actual enemy kill', () => {
  it('genuine P simultaneous-zero result is dead, not victory, and retains cleared pending', () => {
    const { end, beforeLast } = finished()
    expect(end.phase).toBe('dead'); expect(end.site).toBeNull(); expect(end.battle).toBeNull()
    expect(end.battles).toHaveLength(0); expect(end.combatDeaths).toHaveLength(1)
    expect(end.character.revision).toBe(beforeLast.character.revision + 1)
    expect(end.character.body.condition.currentHealth).toBe(0)
    expect(end.character.body.energy).toBe(beforeLast.character.body.energy)
    expect(end.receipts[0]).toMatchObject({ outcome: 'death', source: 'combat-death', reward: 0, penalty: 0, steps: [] })
    expect(end.combatDeaths[0].decision).toMatchObject({ healthAfter: 0, enemyHealthAfter: 0 })
    expect(end.combatDeaths[0].decision.trace.at(-1)).toMatchObject({ kind: 'post-action-bleeding', healthAfter: 0 })
    expect(end.archives[0].site.pending).toEqual({ kind: 'none' })
    expect(end.archives[0].site.enemies.find(e => e.id === 'orderly')!.state)
      .toMatchObject({ currentHealth: 0, defeated: true })
  })
  it.each(apis)('%s accepts real simultaneous-zero final death without repairing it', api => {
    const { h, end } = finished()
    // Independent expected is fixed from the real producer output before candidate copying/wire preparation.
    const { e, policy } = context(h, end)
    assertSame(api, end, e, policy)
  })
  it('ordinary enemy-alive death still requires its real encounter and roundtrips', () => {
    const h = entered('orderly', { hp: 1 }), end = h.action(h.value, { kind: 'defend' }).snapshot
    expect(end.phase).toBe('dead')
    expect(end.archives[0].site.pending).toEqual({ kind: 'combat-required', enemyId: 'orderly' })
    const { e, policy } = context(h, end)
    for (const api of apis) assertSame(api, end, e, policy)
  })
  it('one extra original HP remains an ordinary living victory with one fee', () => {
    const { h, end } = finished(7)
    expect(end.phase).toBe('active-world'); expect(end.battles.at(-1)?.outcome).toBe('victory')
    expect(end.combatDeaths).toHaveLength(0)
    const { e, policy } = context(h, end)
    for (const api of apis) assertSame(api, end, e, policy)
  })
  it.each(['dead-enemy-pending-resurrected', 'alive-enemy-pending-discarded', 'enemy-state-revived',
    'wrong-death-outcome', 'foreign-external-battle'] as const)('rejects %s, not a blanket pending waiver', fault => {
    const pair = fault === 'alive-enemy-pending-discarded' ? (() => {
      const h = entered('orderly', { hp: 1 }); return { h, end: h.action(h.value, { kind: 'defend' }).snapshot }
    })() : finished()
    const { h, end } = pair, { e, policy } = context(h, end), raw = mutable(end)
    if (fault === 'dead-enemy-pending-resurrected') raw.archives[0].site.pending = { kind: 'combat-required', enemyId: 'orderly' }
    if (fault === 'alive-enemy-pending-discarded') raw.archives[0].site.pending = { kind: 'none' }
    if (fault === 'enemy-state-revived') {
      const enemy = raw.archives[0].site.enemies.find(x => x.id === 'orderly')!
      enemy.state.currentHealth = 1; enemy.state.defeated = false
    }
    if (fault === 'wrong-death-outcome') raw.receipts[0].outcome = 'success'
    if (fault === 'foreign-external-battle') e.closure!.combat!.battleId = 'wrong-independent-battle'
    for (const api of apis) expect(() => invoke(api, raw, e, policy, end)).toThrowError(CombatResidenceSaveError)
  })
})

import { simultaneous, livingEnemyDeath, laterDeath, callApi, apiNames } from './combat-review-simultaneous-fixtures'

describe('R-F01 adjacent real terminal checkpoints and independent records', () => {
  it.each(['first-basic', 'first-charged', 'reentry-basic'] as const)('%s real kill and bleeding death roundtrips without fees', mode => {
    const { h, end, beforeLast } = simultaneous(mode)
    expect(end.phase).toBe('dead'); expect(end.character.body.condition.currentHealth).toBe(0)
    expect(end.character.body.energy).toBe(beforeLast.character.body.energy)
    expect(end.character.revision).toBe(beforeLast.character.revision + 1)
    expect(end.balance).toBe(0); expect(end.receipts.at(-1)).toMatchObject({ outcome: 'death', reward: 0, penalty: 0, steps: [] })
    expect(end.battles).toHaveLength(mode === 'reentry-basic' ? 1 : 0)
    const death = end.combatDeaths.at(-1)!
    expect(death.decision).toMatchObject({ enemyHealthAfter: 0, healthAfter: 0 })
    expect(death.decision.trace.at(-1)).toMatchObject({ kind: 'post-action-bleeding', healthAfter: 0 })
    expect(death.entry.previouslyEncountered).toBe(mode === 'reentry-basic')
    expect(end.archives.at(-1)!.site.pending).toEqual({ kind: 'none' })
    const { e, policy } = context(h, end), original = structuredClone({ end, e })
    const text = serializeCombatResidenceSave(end, e, policy), candidate = deserializeCombatResidenceSave(text, e, policy)
    expect(candidate.value).toEqual(end); expect(serializeCombatResidenceSave(candidate.value, e, policy)).toBe(text)
    expect(restoreCombatResidenceCandidate(candidate.value, end, e, policy).value).toEqual(end)
    expect({ end, e }).toEqual(original)
    const frozen = (v: unknown) => { if (v && typeof v === 'object') {
      expect(Object.isFrozen(v)).toBe(true); Object.values(v).forEach(frozen)
    } }; frozen(candidate)
  })
  it.each(['direct', 'bleeding', 'heal'] as const)('actual %s death with living enemy retains pending through all APIs', kind => {
    const { h, end } = livingEnemyDeath(kind), { e, policy } = context(h, end)
    expect(end.phase).toBe('dead'); expect(end.combatDeaths[0].decision.enemyHealthAfter).toBeGreaterThan(0)
    expect(end.archives[0].site.pending).toEqual({ kind: 'combat-required', enemyId: 'orderly' })
    if (kind === 'heal') expect(end.combatDeaths[0].decision.trace[0].kind).toBe('heal')
    for (const api of apiNames) expect(callApi(api, end, e, policy, end)).toBeDefined()
  })
  it('later actual technician death is bound to C2 and its own revision, not the first orderly battle', () => {
    const { h, end } = laterDeath(), { e, policy } = context(h, end), death = end.combatDeaths[0]
    expect(end.phase).toBe('dead'); expect(death.entry.enemyId).toBe('technician'); expect(death.entry.to).toBe('C2')
    expect(death.entry.revision).toBeGreaterThan(end.battles[0].exitRevision)
    expect(end.archives[0].site.pending).toEqual({ kind: 'combat-required', enemyId: 'technician' })
    expect(e.closure!.combat!.battleId).toBe(death.entry.id)
    for (const api of apiNames) expect(callApi(api, end, e, policy, end)).toBeDefined()
    const stale = structuredClone(e); stale.closure!.combat!.battleId = end.battles[0].entry.id
    expect(() => deserializeCombatResidenceSave(wire(end), stale, policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
  })
  it('same progress compares full independent committed facts, not just the known death anchor', () => {
    const { h, end } = simultaneous(), { e, policy } = context(h, end), bad = mutable(end)
    bad.character.body.infectionProgress++
    expect(validateCombatResidenceAggregate(bad, e, policy)).toEqual(bad)
    const before = structuredClone({ bad, end, e })
    expect(() => restoreCombatResidenceCandidate(bad, end, e, policy)).toThrowError(expect.objectContaining({ code: 'EXPECTED_MISMATCH' }))
    expect({ bad, end, e }).toEqual(before)
  })
  it.each(['missing-live-pending', 'foreign-pending-enemy', 'dead-live-pending', 'wrong-node', 'wrong-battle',
    'wrong-enemy-instance', 'revived-enemy', 'empty-trace', 'wrong-trace-end', 'wrong-trace-source', 'wrong-reward',
    'missing-disposition', 'missing-receipt', 'changed-phase', 'extra-field'] as const)('cold APIs reject %s without candidate repair', fault => {
      const { h, end } = fault === 'missing-live-pending' || fault === 'foreign-pending-enemy' ? livingEnemyDeath() : simultaneous()
      const { e, policy } = context(h, end), bad = mutable(end), death = bad.combatDeaths[0], site = bad.archives[0].site
      if (fault === 'missing-live-pending') site.pending = { kind: 'none' }
      if (fault === 'foreign-pending-enemy') site.pending = { kind: 'combat-required', enemyId: 'porter' }
      if (fault === 'dead-live-pending') site.pending = { kind: 'combat-required', enemyId: 'orderly' }
      if (fault === 'wrong-node') site.nodeId = 'H1'
      if (fault === 'wrong-battle') death.entry.id = 'foreign-battle'
      if (fault === 'wrong-enemy-instance') death.entry.enemyInstanceId = 'foreign-enemy'
      if (fault === 'revived-enemy') { const enemy = site.enemies.find(x => x.id === 'orderly')!; enemy.state.currentHealth = 1; enemy.state.defeated = false }
      if (fault === 'empty-trace') death.decision.trace = []
      if (fault === 'wrong-trace-end') death.decision.trace.at(-1)!.healthAfter = 1
      if (fault === 'wrong-trace-source') death.decision.trace.at(-1)!.actionId = 'orderly-basic'
      if (fault === 'wrong-reward') bad.receipts[0].reward = 120
      if (fault === 'missing-disposition') bad.receipts[0].dispositionIds.pop()
      if (fault === 'missing-receipt') bad.receipts = []
      if (fault === 'changed-phase') bad.phase = 'living-hub'
      if (fault === 'extra-field') Object.assign(bad, { repaired: true })
      const before = structuredClone({ bad, e, end })
      // This paired witness is valid to P; rejection must come from the new R pending constraint.
      if (fault === 'missing-live-pending') expect(readCombatValue(bad, h.deps)).toEqual(bad)
      for (const api of apiNames) expect(() => callApi(api, bad, e, policy, end)).toThrowError(CombatResidenceSaveError)
      expect({ bad, e, end }).toEqual(before); expect(Object.isFrozen(bad)).toBe(false)
    })
})
