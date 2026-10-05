// TEST ONLY. Real initial/departure/movement producers; never imported by production.
import { establishMissionFact } from '../mission-lifecycle/controlled'
import { createResidenceCombatDependencies } from './dependencies'
import { cycleContext } from '../residence-supply/shared-validation'
import { readCombatValue } from './validation'
import * as api from './controlled'
import type { CombatValue, CombatDependencies } from './types'
import type { CombatPlayerActionCommand } from '../combat/combat-types'
export function createCombatTestFactory(createDependencies: () => CombatDependencies) {
function fixture(options: { hp?: number; energy?: number; bleeding?: boolean; seed?: string;
  tool?: 'crow' | 'lamp' | 'toolbox'; specialty?: 'scout' | 'engineer' | 'survival';
  draw?: CombatDependencies['supply']['draw'] } = {}) {
  const original = createDependencies()
  const deps = options.draw ? createResidenceCombatDependencies(Object.freeze({ ...original.supply, draw: options.draw }), original.profiles) : original
  const s = deps.supply, cfg = s.residence.configuration.config
  const character = { identity: { characterId: s.residence.scope.characterId, rulesVersion: s.residence.rulesVersion,
    configurationId: s.residence.configuration.configurationId }, revision: 0, cycle: 1, clock: { kind: 'first-ready' },
    body: { energy: options.energy ?? cfg.limits.energy, infectionProgress: 0, satiety: cfg.limits.satiety, suppression: 0,
      quotasRemaining: { ...cfg.quota }, condition: { currentHealth: options.hp ?? cfg.limits.hp, bleeding: options.bleeding ?? false,
        minorContusions: 0, painkillerActive: false, pendingInfectionExposures: 0, openWounds: [] } } }
  const initial = api.establishCombatInitial({ character, mission: establishMissionFact({ characterId: s.residence.scope.characterId,
    mission: s.catalog.data.mission }, s.residence.scope), execution: { runId: 'combat-test-execution',
    seed: options.seed ?? 'combat-seed', rulesVersion: s.residence.rulesVersion },
    tool: options.tool ?? 'crow', specialty: options.specialty ?? 'engineer' }, deps)
  const authorize = (v: CombatValue) => api.createCombatAuthority(v, { cycle: cycleContext(v.character, s, v.site?.nodeId ?? null), missions: v.missions }, deps)
  const departed = api.planCombatDeparture(initial, { kind: 'depart', expectedRevision: 0,
    commissionId: s.catalog.data.mission.commissionId }, authorize(initial))
  const move = (v: CombatValue, to: string) => {
    const edge = s.catalog.data.edges.find(e => e.from === v.site!.nodeId && e.to === to)!
    return api.planCombatMove(v, { kind: 'move', edgeId: edge.id, expectedRevision: v.character.revision }, authorize(v))
  }
  const task = (v: CombatValue, actionId: string, more = {}) => api.planCombatTask(v,
    { kind: 'task', actionId, expectedRevision: v.character.revision, ...more }, authorize(v))
  const action = (v: CombatValue, command: CombatPlayerActionCommand, more = {}) => api.resolveResidenceCombatAction(v,
    { kind: 'combat-action', command, expectedRevision: v.character.revision, ...more }, authorize(v))
  const source = (v: CombatValue, sourceId: string, more = {}) => api.planCombatSource(v,
    { kind: 'reveal', sourceId, expectedRevision: v.character.revision, ...more }, authorize(v))
  const inventory = (v: CombatValue, kind: string, more = {}) => api.planCombatInventory(v,
    { kind, expectedRevision: v.character.revision, ...more }, authorize(v))
  const medical = (v: CombatValue, instanceId: string, more = {}) => api.planCombatMedical(v,
    { kind: 'medical', instanceId, expectedRevision: v.character.revision, ...more }, authorize(v))
  return { deps, initial, departed, value: departed.snapshot, authorize, move, task, action, source, inventory, medical }
}
function entered(enemy: 'orderly' | 'porter' | 'technician' = 'orderly', options: Parameters<typeof fixture>[0] = {}) {
  const h = fixture(options)
  let value = h.value
  if (enemy === 'orderly') {
    value = h.move(value, 'H1').snapshot
    value = h.task(value, 'fire-door', { method: 'crow', toolInstanceId: value.carried.equipment.utility!.instanceId }).snapshot
    value = h.move(value, 'H4').snapshot
  } else if (enemy === 'porter') {
    for (const n of ['H1', 'H7', 'L0', 'L1', 'L2']) value = h.move(value, n).snapshot
  } else {
    for (const n of ['C0', 'C1']) value = h.move(value, n).snapshot
    value = h.task(value, 'c-gate', { method: 'manual' }).snapshot
    value = h.move(value, 'C2').snapshot
  }
  return { ...h, value }
}
/** Explicit TEST-only valid boundary state; never erases enemies or marks tasks complete. */
function bodyBoundary(v: CombatValue, deps: CombatDependencies, changes: Partial<CombatValue['character']['body']>) {
  return readCombatValue({ ...v, character: { ...v.character, body: { ...v.character.body, ...changes } } }, deps)
}
/** All victory helpers execute real CTB until the actual enemy is defeated. */
function win(h: ReturnType<typeof fixture>, input: CombatValue): CombatValue {
  let v = input
  if (v.character.body.quotasRemaining.pipe_signature > 0) v = h.action(v, { kind: 'metal-pipe-charged-strike' }).snapshot
  for (let i = 0; v.battle && i < 12; i++) v = h.action(v, { kind: 'metal-pipe-basic-attack' }).snapshot
  if (v.battle || v.phase === 'dead') throw new Error('Real victory not reached')
  return v
}
return { fixture, entered, bodyBoundary, win }
}
