// TEST ONLY: external execution constants and real P/G1/G2/A producers. No runtime imports.
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'
import { fixture as producerFixture, atNode, resolvedDanger, searchAt, pickAlias, twoDeclarationFixture } from '../../core/residence-task/test-fixtures'
import { planSupplyTaskAction } from '../../core/residence-task/actions'
import { planSupplyRest, planSupplyMove } from '../../core/residence-supply/controlled'
import { planSupplyInventory } from '../../core/residence-supply/inventory'
import { planSupplyMedical } from '../../core/residence-supply/medical'
import { readSupplyValue } from '../../core/residence-supply/validation'
import { consumeSupplyDeath, planSupplyTerminal } from '../../core/residence-terminal/supply-terminal'
import type { SupplyDependencies, SupplyValue } from '../../core/residence-supply/types'
import { createSupplyResidencePolicy } from './supply-policy'
import type { SupplyResidenceExpectation } from './supply-types'

export { atNode, resolvedDanger, searchAt, pickAlias, readSupplyValue }
export function fixture(options: Parameters<typeof producerFixture>[1] = {}) {
  const dependencies = createInfectedSupplyDependencies('restore-test-character')
  const initialExecution = { runId: 'test-execution', seed: options.seed ?? 'test-seed', rulesVersion: dependencies.residence.rulesVersion }
  const f = producerFixture(dependencies, options)
  return { ...f, initialExecution, policy: createSupplyResidencePolicy(dependencies) }
}
/** Only call on independent producer results held BEFORE corrupting any candidate. */
export function expectation(committed: SupplyValue, deps: SupplyDependencies, seed = 'test-seed'): SupplyResidenceExpectation {
  return { identity: { characterId: deps.residence.scope.characterId, rulesVersion: deps.residence.rulesVersion,
    configurationId: deps.residence.configuration.configurationId },
  phase: committed.phase, revision: committed.character.revision, cycle: committed.character.cycle,
  missions: committed.missions.map(m => m.status === 'unaccepted' ? { binding: m.binding, status: m.status } :
    m.status === 'active' ? { binding: m.binding, status: m.status, execution: m.execution } :
      { binding: m.binding, status: m.status, execution: m.execution, outcome: m.outcome }),
  initial: { binding: { characterId: deps.residence.scope.characterId, mission: deps.residence.scope.declarations[0] },
    execution: { runId: 'test-execution', seed, rulesVersion: deps.residence.rulesVersion } } }
}
export type Mutable<T> = T extends readonly (infer U)[] ? Mutable<U>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T
export function mutable<T>(input: T): Mutable<T> { return structuredClone(input) as Mutable<T> }

export function states() {
  const f = fixture()
  const living = planSupplyTerminal(f.value, { kind: 'withdraw', expectedRevision: f.value.character.revision }, f.authorize(f.value)).snapshot
  const d = fixture({ hp: 1, bleeding: true })
  const move = planSupplyMove(d.value, { kind: 'move', expectedRevision: d.value.character.revision, edgeId: 'H0-H1:forward' }, d.authorize(d.value))
  const dead = consumeSupplyDeath(d.value, move, d.authorize(d.value)).snapshot
  return { f, rows: [f.initial, f.value, living, dead] }
}
export function organized() {
  const f = fixture({ hp: 8, bleeding: true })
  let v = atNode(f, f.value, 'L1')
  v = planSupplyTaskAction(v, { kind: 'task', expectedRevision: v.character.revision, actionId: 'l1-open', method: 'manual' }, f.authorize(v)).snapshot
  v = pickAlias(f, searchAt(f, v, 'L1-cabinet'), 'food', 0)
  const original = v.carried.backpack.items[0]
  v = planSupplyInventory(v, { kind: 'split', expectedRevision: v.character.revision, instanceId: original.instanceId,
    quantity: 1, placement: { x: 1, y: 0, rotated: false } }, f.authorize(v)).snapshot
  const child = v.carried.backpack.items.find(i => i.instanceId !== original.instanceId)!
  v = planSupplyInventory(v, { kind: 'merge', expectedRevision: v.character.revision, instanceId: child.instanceId,
    targetId: original.instanceId, quantity: 1 }, f.authorize(v)).snapshot
  v = planSupplyMedical(v, { kind: 'medical', expectedRevision: v.character.revision,
    instanceId: v.carried.quickSlots.slots[0]!.instanceId }, f.authorize(v)).snapshot
  return { f, value: v }
}
/** Isolated danger-cleared TEST prestate retains enemy definitions, not CTB victory evidence. */
export function successful(f: ReturnType<typeof producerFixture>) {
  let v = resolvedDanger(f)
  const act = (actionId: string, extra = {}) => { v = planSupplyTaskAction(v,
    { kind: 'task', expectedRevision: v.character.revision, actionId, ...extra }, f.authorize(v)).snapshot }
  v = atNode(f, v, 'P1'); act('power-survey'); act('power')
  v = atNode(f, v, 'L2'); act('verify', { method: 'full' }); act('fix', { method: 'manual' })
  act('component', { placement: { x: 0, y: 0, rotated: false } })
  v = atNode(f, v, 'C1'); act('match', { method: 'fast' })
  v = atNode(f, v, 'C3'); act('module', { placement: { x: 2, y: 0, rotated: false } })
  v = searchAt(f, v, 'C4-cabinet'); v = pickAlias(f, v, 'metal', 4); v = pickAlias(f, v, 'electronic', 5)
  v = atNode(f, v, 'H8')
  act('install', { inputs: v.carried.backpack.items.map(i => ({ instanceId: i.instanceId, quantity: 1 })) })
  v = planSupplyRest(v, { kind: 'rest', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
  v = atNode(f, v, 'H5'); act('sample', { method: 'cautious', placement: { x: 0, y: 0, rotated: false } })
  v = atNode(f, v, 'H0')
  return planSupplyTerminal(v, { kind: 'deliver', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
}
export function history(outcome: 'success' | 'voluntary-failure') {
  const { f, next } = twoDeclarationFixture(fixture())
  const old = outcome === 'success' ? successful(f) :
    planSupplyTerminal(f.value, { kind: 'withdraw', expectedRevision: f.value.character.revision }, f.authorize(f.value)).snapshot
  const second = next(old)
  let v = searchAt(second, second.value, 'H1-search')
  v = readSupplyValue({ ...v, character: { ...v.character, body: { ...v.character.body,
    condition: { ...v.character.body.condition, currentHealth: 1, bleeding: true } } } }, second.dependencies)
  const p = planSupplyTaskAction(v, { kind: 'task', expectedRevision: v.character.revision,
    actionId: 'fire-door', method: 'toolbox', toolInstanceId: v.carried.equipment.utility!.instanceId }, second.authorize(v))
  const dead = consumeSupplyDeath(v, p, second.authorize(v)).snapshot
  return { old, active: second.value, dead, f: second, policy: createSupplyResidencePolicy(second.dependencies) }
}
