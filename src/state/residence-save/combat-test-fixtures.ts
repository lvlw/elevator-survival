// TEST ONLY: expected facts come from a separate producer record BEFORE any candidate is prepared.
import { createCombatTestFactory } from '../../core/residence-combat/test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { createCombatResidencePolicy } from './combat-policy'
import { RANDOM_ALGORITHM_VERSION, drawIntInclusive } from '../../core/random'
import type { CombatDependencies, CombatValue } from '../../core/residence-combat/types'
import type { CombatResidenceExpectation } from './combat-types'
import { deserializeCombatResidenceSave, serializeCombatResidenceSave } from './combat-codec'
import { validateCombatResidenceAggregate } from './combat-validation'
import { planCombatMaintenance, planCombatTerminal, planCombatRest } from '../../core/residence-combat/controlled'

export type Mutable<T> = T extends readonly (infer U)[] ? Mutable<U>[] :
  T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T
export const mutable = <T>(v: T): Mutable<T> => structuredClone(v) as Mutable<T>
export const quietDraw: typeof drawIntInclusive = (c, min, max) => ({ ...drawIntInclusive(c, min, max), value: max })
const factory = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
export const fixture = (options: Parameters<typeof factory.fixture>[0] = {}) => factory.fixture({ draw: quietDraw, ...options })
export const entered = (enemy: Parameters<typeof factory.entered>[0] = 'orderly', options: Parameters<typeof factory.fixture>[0] = {}) =>
  factory.entered(enemy, { draw: quietDraw, ...options })
export const win = factory.win
export const bodyBoundary = factory.bodyBoundary
export type Harness = ReturnType<typeof fixture>

export function expectation(committedRecord: CombatValue, d: CombatDependencies,
  initialMaterial = { runId: 'combat-test-execution', seed: 'combat-seed', tool: 'crow', specialty: 'engineer' }) {
  const v = committedRecord, s = d.supply, b = v.battle, r = v.receipts.at(-1)
  const enemy = b ? v.site!.enemies.find(x => x.id === b.entry.enemyId)! : null
  const death = r?.source === 'combat-death' ? v.combatDeaths.find(x => x.id === r.combatDeathReceiptId)! : null
  const a = death?.entry
  // The initial execution uses the independent bootstrap arguments, NEVER candidate origins.
  const e = { identity: v.character.identity, phase: v.phase, revision: v.character.revision, cycle: v.character.cycle,
    versions: { rulesVersion: s.residence.rulesVersion, residenceConfigurationId: s.residence.configuration.configurationId,
      terminalConfigurationId: s.terminal.configurationId, supplyConfigurationId: s.configuration.configurationId,
      contentId: s.tasks.contentId, randomAlgorithmVersion: RANDOM_ALGORITHM_VERSION, profileIds: d.profiles.map(p => p.definitionId),
      catalogs: s.catalogs.map(c => ({ catalogId: c.data.id, catalogVersion: c.data.version, mission: c.data.mission })) },
    missions: v.missions.map(({ formatVersion: _, ...fact }) => fact),
    initial: { binding: { characterId: s.residence.scope.characterId, mission: s.residence.scope.declarations[0] },
      execution: { runId: initialMaterial.runId, seed: initialMaterial.seed, rulesVersion: s.residence.rulesVersion },
      choices: { tool: initialMaterial.tool, specialty: initialMaterial.specialty } },
    battle: b && enemy ? { binding: b.entry.binding, battleId: b.entry.id, entryRevision: b.entry.revision,
      from: b.entry.from, to: b.entry.to, edgeId: b.entry.edgeId, enemyId: b.entry.enemyId,
      enemyInstanceId: b.entry.enemyInstanceId, definitionId: b.entry.definitionId,
      currentCtb: b.currentCtb, playerNext: b.playerNext, enemyNext: b.enemyNext,
      intent: enemy.state.currentIntentActionId, nextCycleIndex: enemy.state.nextCycleIndex,
      actionCount: enemy.state.resolvedActionCount, riskIndex: enemy.riskDrawIndex } : null,
    closure: r ? { binding: r.binding, outcome: r.outcome, source: r.source, revision: r.revision,
      startCycle: r.startCycle, endCycle: r.endCycle, taskDay: r.taskDay,
      combat: a && death ? { battleId: a.id, entryRevision: a.revision, edgeId: a.edgeId, from: a.from, to: a.to,
        enemyId: a.enemyId, enemyInstanceId: a.enemyInstanceId, definitionId: a.definitionId, trace: death.decision.trace } : null } : null }
  return structuredClone(e) as CombatResidenceExpectation
}
export function context(h: Pick<Harness, 'deps'>, v: CombatValue, initialMaterial?: Parameters<typeof expectation>[2]) {
  return { e: expectation(v, h.deps, initialMaterial), policy: createCombatResidencePolicy({
    dependencies: h.deps, randomAlgorithmVersion: RANDOM_ALGORITHM_VERSION }) }
}
export function roundtrip(h: Pick<Harness, 'deps'>, v: CombatValue, initialMaterial?: Parameters<typeof expectation>[2]) {
  const { e, policy } = context(h, v, initialMaterial)
  const text = serializeCombatResidenceSave(v, e, policy)
  return { e, policy, text, candidate: deserializeCombatResidenceSave(text, e, policy) }
}
export function wire(v: unknown) { return JSON.stringify({ format: 'elevator-survival.residence-headless', formatVersion: 4, state: v }) }
export function rejection(run: () => unknown) {
  try { run(); return 'ACCEPTED' } catch (e) {
    if (!(e instanceof Error) || e instanceof TypeError || e instanceof RangeError || !('code' in e)) throw e
    return e.code
  }
}
export function rejectAll(h: Pick<Harness, 'deps'>, original: CombatValue, bad: unknown, initialMaterial?: Parameters<typeof expectation>[2]) {
  const { e, policy } = context(h, original, initialMaterial)
  return [rejection(() => validateCombatResidenceAggregate(bad, e, policy)),
    rejection(() => serializeCombatResidenceSave(bad, e, policy)),
    rejection(() => deserializeCombatResidenceSave(wire(bad), e, policy))]
}
/** Materials really acquired before entry; no cleared enemy or fabricated source. */
export function maintenanceReady(outcome: 'escaped' | 'victory' = 'escaped') {
  const h = fixture({ draw: (c, min, max) => ({ ...drawIntInclusive(c, min, max),
    value: c.streamId.includes('H1-random') ? 41 : max }) })
  let v = h.move(h.value, 'H1').snapshot
  v = h.source(v, 'H1-search', { method: 'dark' }).snapshot
  for (const [alias, x] of [['metal', 0], ['cloth', 1]] as const) {
    const def = h.deps.supply.tasks.data.items.find(i => i.alias === alias)!.id
    const item = v.site!.ground.find(g => g.nodeId === 'H1')!.items.find(i => i.definitionId === def)!
    v = h.inventory(v, 'pickup', { instanceId: item.instanceId, placement: { x, y: 0, rotated: false } }).snapshot
  }
  v = h.task(v, 'fire-door', { method: 'crow', toolInstanceId: v.carried.equipment.utility!.instanceId }).snapshot
  v = h.move(v, 'H4').snapshot
  v = outcome === 'victory' ? win(h, v) : h.action(h.action(v, { kind: 'metal-pipe-basic-attack' }).snapshot, { kind: 'escape' }).snapshot
  return { h, v }
}
export function maintain(h: Harness, v: CombatValue, target: 'mechanical' | 'coat') {
  const alias = target === 'mechanical' ? 'metal' : 'cloth'
  const definitionId = h.deps.supply.tasks.data.items.find(i => i.alias === alias)!.id
  const material = v.carried.backpack.items.find(i => i.definitionId === definitionId)!
  const input = { kind: target, expectedRevision: v.character.revision,
    inputs: [{ instanceId: material.instanceId, quantity: 1 }] }
  return planCombatMaintenance(v, target === 'mechanical' ? { ...input,
    allocations: [{ instanceId: v.carried.equipment.weapon!.instanceId, amount: 15 }] } :
    { ...input, instanceId: v.carried.equipment.armor!.instanceId }, h.authorize(v)).plan.snapshot
}
export function h0Return(h: Harness, v = h.value) {
  return planCombatTerminal(v, { kind: 'withdraw', expectedRevision: v.character.revision }, h.authorize(v)).snapshot
}
export function atDay(v: CombatValue, h: Harness, day: number) {
  if (v.character.clock.kind !== 'active') throw new Error('TEST day boundary requires active clock')
  return bodyBoundary({ ...v, character: { ...v.character, cycle: day, clock: { ...v.character.clock, taskDay: day } } }, h.deps, {})
}
export function rest(h: Harness, v: CombatValue) {
  return planCombatRest(v, { kind: 'rest', expectedRevision: v.character.revision }, h.authorize(v)).snapshot
}

/** Real three-enemy CTB plus tasks, transport, installation and sample delivery. */
export function completeSuccess() {
    const h=fixture({tool:'toolbox',draw:quietDraw})
    let v:CombatValue=h.value
    const move=(to:string)=>{v=h.move(v,to).snapshot}
    const task=(id:string,extra={})=>{v=h.task(v,id,extra).snapshot}
    const rest=()=>{v=planCombatRest(v,{kind:'rest',expectedRevision:v.character.revision},h.authorize(v)).snapshot}
    const pick=(alias:string,x:number,y=0)=>{
      const id=h.deps.supply.tasks.data.items.find(i=>i.alias===alias)!.id
      const item=v.site!.ground.find(g=>g.nodeId===v.site!.nodeId)!.items.find(i=>i.definitionId===id)!
      v=h.inventory(v,'pickup',{instanceId:item.instanceId,placement:{x,y,rotated:false}}).snapshot
    }
    move('H1');v=h.source(v,'H1-search',{method:'dark'}).snapshot;pick('metal',4)
    task('fire-door',{method:'toolbox',toolInstanceId:v.carried.equipment.utility!.instanceId});pick('electronic',5)
    move('H4');v=win(h,v)
    for(const n of ['H1','H7','L0','L1'])move(n)
    task('l1-open',{method:'manual'});v=h.source(v,'L1-cabinet').snapshot;pick('food',4,1);pick('bandage',5,1)
    rest();v=h.medical(v,v.carried.backpack.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='food')!.id)!.instanceId).snapshot
    move('L2');v=win(h,v)
    v=h.medical(v,v.carried.quickSlots.slots[0]!.instanceId).snapshot
    const bandage=v.carried.backpack.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='bandage')!.id)!
    v=h.medical(v,bandage.instanceId).snapshot
    task('verify',{method:'full'});task('fix',{method:'manual'});task('component',{placement:{x:0,y:0,rotated:false}})
    for(const n of ['L1','L0','C0','C1'])move(n)
    task('match',{method:'fast'});task('c-gate',{method:'manual'});rest()
    const food=v.carried.backpack.items.find(i=>i.definitionId===h.deps.supply.tasks.data.items.find(i=>i.alias==='food')!.id)!
    v=h.medical(v,food.instanceId).snapshot
    move('C2');v=win(h,v);move('C3');task('module',{placement:{x:2,y:0,rotated:false}})
    for(const n of ['C2','C1','C0','H0','H1','H4','H5'])move(n)
    task('sample',{method:'cautious',placement:{x:0,y:2,rotated:false}})
    const sample=v.carried.backpack.items.find(i=>i.definitionId==='quest_sealed_pathogen_case')!
    for(const n of ['H4','H1','H7','L0','P0','P1'])move(n)
    rest();task('power-survey');task('power')
    for(const n of ['P0','L0','H7','H8'])move(n)
    task('install',{inputs:['component','module','metal','electronic'].map(alias=>({instanceId:v.carried.backpack.items.find(i=>
      i.definitionId===h.deps.supply.tasks.data.items.find(d=>d.alias===alias)!.id)!.instanceId,quantity:1}))})
    for(const n of ['H7','H1','H0'])move(n)
    const end=planCombatTerminal(v,{kind:'deliver',expectedRevision:v.character.revision},h.authorize(v)).snapshot
    return { h, end, sample }
}
