// TEST ONLY. No production entry imports this module. Default RNG is never replaced.
import { expect, vi } from 'vitest'
import { createInfectedCombatDependencies } from '../combat-initial'
import { createResidenceCombatDependencies } from '../../../core/residence-combat/dependencies'
import { createCombatResidencePolicy } from '../../../state/residence-save/combat-policy'
import { expectation } from '../../../state/residence-save/combat-test-fixtures'
import { initialMaterials } from '../../../state/residence-session/supply-test-fixtures'
import { createCombatSession, createResidenceSessionDomain } from '../../../state/residence-session/combat-controlled'
import { RANDOM_ALGORITHM_VERSION, drawIntInclusive } from '../../../core/random'
import { calculateBackpackWeightSubtotal } from '../../../core/inventory'
import { readCombatValue } from '../../../core/residence-combat/validation'
import { serializeCombatResidenceSave } from '../../../state/residence-save/combat-codec'
import type { CombatValue } from '../../../core/residence-combat/types'
import type { CombatSession, CombatSessionExpectation } from '../../../state/residence-session/combat-types'

export type Tool = 'crow' | 'lamp' | 'toolbox'
export type Specialty = 'scout' | 'engineer' | 'survival'
export type Ledger = ReturnType<typeof diagnostic>
export function diagnostic(v: CombatValue, physical: ReturnType<typeof createInfectedCombatDependencies>['supply']['catalog']['physical']) {
  return { phase: v.phase, revision: v.character.revision, node: v.site?.nodeId ?? null,
    cycle: v.character.cycle, taskDay: v.character.clock.kind === 'active' ? v.character.clock.taskDay : v.receipts.at(-1)?.taskDay,
    body: v.character.body, backpack: v.carried.backpack, quick: v.carried.quickSlots,
    weight: calculateBackpackWeightSubtotal(v.carried.backpack, physical), itemStates: v.itemStates,
    facts: v.site?.facts ?? v.archives.at(-1)?.site.facts, enemies: v.site?.enemies ?? v.archives.at(-1)?.site.enemies,
    productions: v.productions, dispositions: v.dispositions, origins: v.origins,
    battles: v.battles, combatDeaths: v.combatDeaths, receipts: v.receipts, balance: v.balance }
}
export function makeHarness(seed: string, tool: Tool = 'crow', specialty: Specialty = 'engineer') {
  const base = createInfectedCombatDependencies('E03-A-character')
  const draw = vi.fn(drawIntInclusive)
  const deps = createResidenceCombatDependencies(Object.freeze({ ...base.supply, draw }), base.profiles)
  const policy = createCombatResidencePolicy({ dependencies: deps, randomAlgorithmVersion: RANDOM_ALGORITHM_VERSION })
  const materials = initialMaterials(deps.supply, tool, specialty)
  materials.execution.runId = 'E03-A-execution'; materials.execution.seed = seed
  const initial = { ...materials.execution, tool, specialty }
  let disk: string | null = null
  let saved: { text: string; expected: CombatSessionExpectation; value: CombatValue } | null = null
  const checkpoints: { text: string; expected: CombatSessionExpectation; value: CombatValue }[] = []
  let owner: CombatSession
  const faults = { write: false }
  const storage = { read: vi.fn(() => disk), write: vi.fn((text: string) => {
    if (faults.write) throw new Error('TEST storage failure')
    const value = owner.getState().current!
    // Separate record captured from authenticated current BEFORE any cold candidate read.
    saved = { text, expected: expectation(value, deps, initial), value }; checkpoints.push(saved); disk = text
  }) }
  owner = createCombatSession(createResidenceSessionDomain(), { policy, storage, startup: 'first', provideInitialMaterials: () => materials })
  const notify = vi.fn(); owner.subscribe(notify)
  const ledger: { family: string; command: unknown; before: Ledger | null; after: Ledger; saved: boolean }[] = []
  const current = () => { const v = owner.getState().current; if (!v) throw new Error('No TEST current'); return v }
  function send(family: string, fields: Record<string, unknown> = {}) {
    const before = current(), writes = storage.write.mock.calls.length, notices = notify.mock.calls.length
    const inner = family === 'source' ? 'reveal' : family === 'combat' ? 'combat-action' : family
    const command = { kind: family, command: { kind: inner, expectedRevision: before.character.revision,
      ...(family === 'combat' ? { expectedBattleId: before.battle!.entry.id } : {}), ...fields } }
    const result = owner.dispatch(command)
    expect(result.current.character.revision).toBe(before.character.revision + 1)
    expect(storage.write).toHaveBeenCalledTimes(writes + 1); expect(notify).toHaveBeenCalledTimes(notices + 1)
    ledger.push({ family, command, before: diagnostic(before, deps.supply.catalog.physical),
      after: diagnostic(result.current, deps.supply.catalog.physical), saved: result.persistence === 'saved' })
    return result
  }
  function begin() {
    expect(owner.bootstrap().status).toBe('no-save'); expect(storage.read).toHaveBeenCalledTimes(1)
    expect(storage.write).not.toHaveBeenCalled(); expect(draw).not.toHaveBeenCalled()
    const result = owner.createFirst()
    expect(result.current.carried.backpack.items).toEqual([])
    expect(result.current.warehouse.items).toEqual([]); expect(result.current.origins).toHaveLength(4)
    ledger.push({ family: 'createFirst', command: { tool, specialty }, before: null,
      after: diagnostic(result.current, deps.supply.catalog.physical), saved: result.persistence === 'saved' })
    send('depart', { commissionId: deps.supply.catalog.data.mission.commissionId })
  }
  function cold(checkpoint = saved) {
    if (!checkpoint) throw new Error('No actually saved checkpoint')
    const read = vi.fn(() => checkpoint.text), coldExpected = vi.fn(() => checkpoint.expected), writes = vi.fn()
    const next = createCombatSession(createResidenceSessionDomain(), { policy, storage: { read, write: writes },
      startup: 'existing', provideColdExpectation: coldExpected })
    const drawBefore = draw.mock.calls.length
    expect(next.bootstrap().current).toEqual(checkpoint.value)
    expect(coldExpected.mock.invocationCallOrder[0]).toBeLessThan(read.mock.invocationCallOrder[0])
    expect(writes).not.toHaveBeenCalled(); expect(draw).toHaveBeenCalledTimes(drawBefore)
    return { owner: next, checkpoint, read, writes, coldExpected }
  }
  return { seed, tool, specialty, deps, policy, materials, initial, owner, current, send, begin, cold,
    draw, storage, notify, faults, ledger, checkpoints, saved: () => saved, disk: () => disk }
}
export type Harness = ReturnType<typeof makeHarness>
/** Isolated local boundary ONLY. Never used by a full route or the 72 seed experiments. */
export function boundaryOwner(h: Harness, body: Partial<CombatValue['character']['body']>, day?: number) {
  const v = h.current(), character = { ...v.character, body: { ...v.character.body, ...body } }
  if (day !== undefined) {
    if (character.clock.kind !== 'active') throw new Error('Boundary requires active clock')
    character.cycle = day; character.clock = { ...character.clock, taskDay: day }
  }
  const value = readCombatValue({ ...v, character }, h.deps)
  const expected = expectation(value, h.deps, h.initial)
  const text = serializeCombatResidenceSave(value, expected, h.policy)
  return h.cold({ value, expected, text })
}
/** TEST-only public-fact adapter; missing production query is explicitly recorded in W3.
 * No infection progress, seed, enemy HP, cursor or unrevealed ground drives route decisions.
 * IDs below are technical command selectors, not a proposed serializable player ViewModel. */
export function publicFacts(h: Harness) {
  const v = h.current(), c = v.character.body.condition
  return { phase: v.phase, node: v.site?.nodeId, energy: v.character.body.energy, hp: c.currentHealth,
    satiety: v.character.body.satiety, bleeding: c.bleeding, wounds: c.openWounds, minorContusions: c.minorContusions,
    bag: v.carried.backpack.items, quick: v.carried.quickSlots.slots, gear: v.carried.equipment,
    resources: v.itemStates.states, ground: v.site?.ground.find(g => g.nodeId === v.site!.nodeId)?.items ?? [],
    completed: v.productions.map(p => p.producerId), known: v.site?.knowledge.knownEdgeIds ?? [],
    combat: v.battle ? h.owner.queryCombat() : null }
}
export function rejectUnchanged(h: Harness, family: string, fields: Record<string, unknown>, code?: string) {
  const before = h.current(), disk = h.disk(), writes = h.storage.write.mock.calls.length, notices = h.notify.mock.calls.length
  expect(() => h.send(family, fields)).toThrowError(code ? expect.objectContaining({ code }) : undefined)
  expect(h.current()).toBe(before); expect(h.disk()).toBe(disk)
  expect(h.storage.write).toHaveBeenCalledTimes(writes); expect(h.notify).toHaveBeenCalledTimes(notices)
}
