// Isolated observations; hospital fixture adapted from the existing integration test.
// TEST conditions and old hospital parameters are not new-world CTB implementation.
import { describe, expect, it } from 'vitest'
import {
  applyCombatEffects,
  CombatError,
  createCombatEncounterSnapshot,
  createEnemyDefinitionCatalog,
  createEnemyPersistentCombatState,
  createExplorationCombatUsage,
  createFirstCombatEncounter,
  createReentryCombatEncounter,
  getAvailableCombatPlayerActions,
  previewCombatPlayerAction,
  previewPlayerVisibleCombatAction,
  resolveCombatPlayerAction,
  selectEnemyHealthPhase,
  validateCombatDependencies,
  type CombatDependencies,
  type CombatEncounterSnapshot,
  type CombatPlayerActionCommand,
  type EnemyPersistentCombatState,
} from '../../../../../src/core/combat'
import { createPlayerCondition } from '../../../../../src/core/condition'
import { calculateEscapeWoundCtbModifier } from '../../../../../src/core/condition'
import { createBackpackSnapshot, type ItemInstance } from '../../../../../src/core/inventory'
import { createFullItemState, createItemState, getItemState } from '../../../../../src/core/item-state'
import {
  HOSPITAL_ENEMY_ACTION_IDS,
  HOSPITAL_ENEMY_IDS,
  hospitalCombatContentBindings,
  hospitalEnemyCatalog,
  hospitalInfectedOrderlyDefinition,
} from '../../../../../src/content/hospital-v0.1/combat/hospital-infected-orderly'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
} from '../../../../../src/content/hospital-v0.1/items'
import { hospitalSliceV01RuleConfig as config } from '../../../../../src/content/hospital-v0.1/rule-config'

const baseDependencies = {
  sceneInstanceId: 'hospital-combat-scene',
  config,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
  enemyCatalog: hospitalEnemyCatalog,
  bindings: hospitalCombatContentBindings,
}

function persistent(changes: Partial<EnemyPersistentCombatState> = {}) {
  return createEnemyPersistentCombatState({
    enemyInstanceId: 'orderly-1',
    definitionId: HOSPITAL_ENEMY_IDS.infectedOrderly,
    currentHealth: 14,
    currentIntentActionId: HOSPITAL_ENEMY_ACTION_IDS.orderlyScratch,
    nextCycleIndex: 1,
    resolvedActionCount: 0,
    hasBeenEncountered: false,
    defeated: false,
    ...changes,
  }, hospitalEnemyCatalog.get(HOSPITAL_ENEMY_IDS.infectedOrderly))
}

type Setup = Readonly<{
  runSeed?: string
  alertState?: 'unalerted' | 'alerted'
  pipeDurability?: number | null
  coatIntegrity?: number | null
  health?: number
  bleeding?: boolean
  enemy?: EnemyPersistentCombatState
  backpackSparePipe?: boolean
  quickBandage?: boolean
  pendingExposures?: number
}>

function encounter(setup: Setup = {}) {
  const pipe = setup.pipeDurability === null ? null : {
    instanceId: 'pipe-equipped', definitionId: HOSPITAL_ITEM_IDS.metalPipe, quantity: 1,
  }
  const coat = setup.coatIntegrity === null ? null : {
    instanceId: 'coat-equipped', definitionId: HOSPITAL_ITEM_IDS.heavyCoat, quantity: 1,
  }
  const bandage = setup.quickBandage
    ? { instanceId: 'bandage-quick', definitionId: HOSPITAL_ITEM_IDS.bandage, quantity: 1 }
    : null
  const backpackItems: ItemInstance[] = setup.backpackSparePipe
    ? [{ instanceId: 'pipe-spare', definitionId: HOSPITAL_ITEM_IDS.metalPipe, quantity: 1 }]
    : []
  const carried = [...backpackItems, ...(pipe ? [pipe] : []), ...(coat ? [coat] : []), ...(bandage ? [bandage] : [])]
  const dependencies = { ...baseDependencies, runSeed: setup.runSeed ?? 'combat-seed-0' }
  const input = {
    playerCondition: createPlayerCondition({
      currentHealth: setup.health ?? 12,
      bleeding: setup.bleeding ?? false,
      openWounds: [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: setup.pendingExposures ?? 0,
    }, config.combat.player),
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpackItems,
      placements: backpackItems.map(({ instanceId }) => ({ instanceId, x: 0, y: 0, rotated: false })),
    }, hospitalItemCatalog),
    equipment: { weapon: pipe, armor: coat, utility: null },
    quickSlots: { slots: [bandage, null] },
    itemStates: { states: carried.map((item) => {
      if (item.instanceId === 'pipe-equipped') return createItemState({ ...item, resource: { kind: 'durability', current: setup.pipeDurability ?? 6 } }, hospitalItemResourceCatalog)
      if (item.instanceId === 'coat-equipped') return createItemState({ ...item, resource: { kind: 'integrity', current: setup.coatIntegrity ?? 4 } }, hospitalItemResourceCatalog)
      return createFullItemState(item, hospitalItemResourceCatalog)
    }) },
    enemy: setup.enemy ?? persistent(),
    usage: createExplorationCombatUsage({ metalPipeChargedStrikeUses: 0 }, config),
  }
  return {
    snapshot: createFirstCombatEncounter(input, setup.alertState ?? 'unalerted', dependencies),
    dependencies,
  }
}


import { fixture, expectation, states } from '../../../../../src/state/residence-save/supply-test-fixtures'
import { harness, start, current, request, reject } from '../../../../../src/state/residence-session/supply-test-fixtures'
import { planSupplyMove, planSupplyRest } from '../../../../../src/core/residence-supply/controlled'
import { planSupplyMedical } from '../../../../../src/core/residence-supply/medical'
import { planSupplyTaskAction } from '../../../../../src/core/residence-task/actions'
import { planSupplyTerminal } from '../../../../../src/core/residence-terminal/supply-terminal'
import { serializeSupplyResidenceSave, deserializeSupplyResidenceSave } from '../../../../../src/state/residence-save/supply-codec'
import { validateSupplyResidenceAggregate } from '../../../../../src/state/residence-save/supply-validation'
import { restoreSupplyResidenceCandidate } from '../../../../../src/state/residence-save/supply-expected'
import { createPlayerVisibleCombatSnapshot } from '../../../../../src/core/combat/player-visible-combat'
const action = (x: ReturnType<typeof encounter>, kind: string) => resolveCombatPlayerAction(x.snapshot, { kind }, x.dependencies)
const code = (fn: () => unknown, value: string) => expect(fn).toThrowError(expect.objectContaining({ code: value }))
describe('WORLD-ENTRY-005 native observations; no production test registration', () => {
  it('N01 old hospital reentry preserves damaged enemy, intent and usage', () => {
    const x = encounter(); expect(x.snapshot.enemyNextActionCtb).toBe(70)
    const enemy = { ...x.snapshot.enemy, currentHealth: 9, currentIntentActionId: HOSPITAL_ENEMY_ACTION_IDS.orderlyLungeBite, nextCycleIndex: 0, resolvedActionCount: 1 }
    const next = createReentryCombatEncounter({ ...x.snapshot, enemy, usage: { metalPipeChargedStrikeUses: 1 } }, x.dependencies)
    expect(next).toMatchObject({ currentCtb: 0, playerNextActionCtb: 0, enemyNextActionCtb: 50, enemy, usage: { metalPipeChargedStrikeUses: 1 } })
  })
  it('N02 real enemy at70 before next player100 advances intent', () => {
    const out = action(encounter(), 'metal-pipe-basic-attack')
    expect(out.snapshot).toMatchObject({ currentCtb: 100, playerNextActionCtb: 100, enemyNextActionCtb: 170 })
    expect(out.snapshot.enemy).toMatchObject({ currentHealth: 10, resolvedActionCount: 1, currentIntentActionId: HOSPITAL_ENEMY_ACTION_IDS.orderlyLungeBite })
    expect(out.plan.effects.some(e => e.kind === 'combat-risk-resolved')).toBe(true)
  })
  it('N03 player-enemy tie defers enemy', () => {
    const x = encounter(); x.snapshot = createCombatEncounterSnapshot({ ...x.snapshot, enemyNextActionCtb: 100 }, x.dependencies)
    const out = action(x, 'metal-pipe-basic-attack'); expect(out.snapshot.currentCtb).toBe(100); expect(out.snapshot.enemy.resolvedActionCount).toBe(0)
  })
  it('N04 escape completion tie no enemy or extra exit bleeding', () => {
    const x = encounter({ bleeding: true }); x.snapshot = createCombatEncounterSnapshot({ ...x.snapshot, enemyNextActionCtb: 80 }, x.dependencies)
    const out = action(x, 'escape'); expect(out.snapshot).toMatchObject({ status: 'escaped', currentCtb: 80 })
    expect(out.snapshot.enemy.resolvedActionCount).toBe(0); expect(out.snapshot.playerCondition.currentHealth).toBe(11)
    expect(out.plan.effects.filter(e => e.kind === 'player-health-lost')).toHaveLength(1)
  })
  it('N05 defense consumes once and expires before decision', () => {
    const out = action(encounter(), 'defend'); expect(out.snapshot.currentCtb).toBe(80); expect(out.snapshot.temporaryDefense).toBeNull()
    expect(out.plan.effects.filter(e => e.kind === 'temporary-defense-consumed')).toHaveLength(1)
  })
  it('N06 bandage heals then enemy responds and consumes exactly one', () => {
    const x = encounter({ health: 2, bleeding: true, quickBandage: true })
    const out = resolveCombatPlayerAction(x.snapshot, { kind: 'use-quick-slot-item', quickSlotIndex: 0 }, x.dependencies)
    expect(out.snapshot.playerCondition.currentHealth).toBe(1); expect(out.snapshot.quickSlots.slots[0]).toBeNull()
    expect(out.plan.effects.find(e => e.kind === 'player-health-restored')).toMatchObject({ healthBefore: 2, healthAfter: 3 })
    expect(out.plan.effects.filter(e => e.kind === 'combat-quick-slot-item-consumed')).toHaveLength(1)
    expect(out.snapshot).not.toHaveProperty('firstBandageUsed')
  })
  it('N07 healthy target and empty slot reject', () => {
    const x = encounter({ quickBandage: true })
    for (const slot of [0, 1]) code(() => resolveCombatPlayerAction(x.snapshot, { kind: 'use-quick-slot-item', quickSlotIndex: slot }, x.dependencies), 'ACTION_NOT_AVAILABLE')
  })
  it('N08 bleeding death overrides enemy kill', () => {
    const x = encounter({ health: 1, bleeding: true }); x.snapshot = createCombatEncounterSnapshot({ ...x.snapshot, enemy: { ...x.snapshot.enemy, currentHealth: 4 } }, x.dependencies); const out = action(x, 'metal-pipe-basic-attack')
    expect(out.snapshot).toMatchObject({ status: 'defeat', currentCtb: 0 }); expect(out.snapshot.enemy.currentHealth).toBe(0); expect(out.snapshot.playerCondition.currentHealth).toBe(0)
  })
  it('N09 lethal enemy hit clips0 and skips risk and intent', () => {
    const out = action(encounter({ health: 1, coatIntegrity: null, pipeDurability: null }), 'temporary-attack')
    expect(out.snapshot.status).toBe('defeat'); expect(out.snapshot.playerCondition.currentHealth).toBe(0)
    expect(out.plan.effects.filter(e => e.kind === 'combat-risk-resolved')).toHaveLength(0); expect(out.snapshot.enemy.resolvedActionCount).toBe(0)
  })
  it('N10 last insufficient durability legal then no charged action', () => {
    const x = encounter({ pipeDurability: 1 }); const out = action(x, 'metal-pipe-charged-strike')
    expect(getItemState(out.snapshot.itemStates, 'pipe-equipped').resource).toMatchObject({ current: 0 }); expect(out.snapshot.usage.metalPipeChargedStrikeUses).toBe(1)
    code(() => resolveCombatPlayerAction(out.snapshot, { kind: 'metal-pipe-charged-strike' }, x.dependencies), 'ACTION_NOT_AVAILABLE')
  })
  it('N11 deterministic real risk uses persistent action identity', () => {
    const x = encounter({ runSeed: 'risk-2', coatIntegrity: null }); const a = action(x, 'metal-pipe-basic-attack')
    expect(a).toEqual(action(x, 'metal-pipe-basic-attack'))
    const trace = a.plan.effects.find(e => e.kind === 'combat-risk-resolved')!; expect(trace).toMatchObject({ drawIndex: 0 }); expect(JSON.stringify(trace)).toContain('orderly-1')
  })
  it('N12 old visible masks HP but exposes CTB; not E03 presentation', () => {
    const x = encounter(); const v = createPlayerVisibleCombatSnapshot(x.snapshot, { encounterId: 'test', nodeId: 'H4', engagement: 'first-entry' }, x.dependencies)
    expect(v.enemy).not.toHaveProperty('currentHealth'); expect(v.enemy.nextActionCtb).toBe(70); expect(v).not.toHaveProperty('runSeed')
  })
  it('N13 G1/P last positive E move clips0 and arrives', () => {
    const f = fixture({ energy: 1 }); const p = planSupplyMove(f.value, { kind: 'move', edgeId: 'H0-H1:forward', expectedRevision: f.value.character.revision }, f.authorize(f.value))
    expect(p.snapshot.character.body.energy).toBe(0); expect(p.snapshot.site!.nodeId).toBe('H1')
  })
  it('N14 G2 arrival already encountered; R living pending unsupported; old first constructor rejects encountered', () => {
    const f = fixture({ energy: 13 }); let v = f.value
    v = planSupplyMove(v, { kind: 'move', edgeId: 'H0-H1:forward', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
    v = planSupplyTaskAction(v, { kind: 'task', actionId: 'fire-door', method: 'toolbox', toolInstanceId: v.carried.equipment.utility!.instanceId, expectedRevision: v.character.revision }, f.authorize(v)).snapshot
    expect(v.site!.nodeId).toBe('H1')
    v = planSupplyMove(v, { kind: 'move', edgeId: 'H1-H4:forward', expectedRevision: v.character.revision }, f.authorize(v)).snapshot
    expect(v.character.body.energy).toBe(0); expect(v.site!.pending.kind).toBe('combat-required'); expect(v.site!.enemies.find(e => e.state.hasBeenEncountered)).toBeDefined()
    code(() => validateSupplyResidenceAggregate(v, expectation(v, f.dependencies), f.policy), 'UNSUPPORTED_STAGE')
    const x = encounter(); code(() => createFirstCombatEncounter({ ...x.snapshot }, 'unalerted', x.dependencies), 'INVALID_ENEMY_STATE')
  })
  it('N15 P E0 survival first bandage real consumption; rest preserves first flag', () => {
    const f = fixture({ hp: 8, bleeding: true, energy: 0, specialty: 'survival' }); const item = f.value.carried.quickSlots.slots[0]!
    const p = planSupplyMedical(f.value, { kind: 'medical', expectedRevision: f.value.character.revision, instanceId: item.instanceId }, f.authorize(f.value))
    expect(p.snapshot.character.body.condition.currentHealth).toBe(10); expect(p.snapshot.character.body.energy).toBe(0); expect(p.snapshot.choices.firstBandageUsed).toBe(true)
    expect(p.snapshot.dispositions.length).toBe(f.value.dispositions.length + 1)
    const rest = planSupplyRest(p.snapshot, { kind: 'rest', expectedRevision: p.snapshot.character.revision }, f.authorize(p.snapshot))
    expect(rest.snapshot.choices.firstBandageUsed).toBe(true); expect(rest.snapshot.character.body.quotasRemaining.pipe_signature).toBe(1)
  })
  it('N16 normal H0 empty steps and actual move death retained', () => {
    const f = fixture(); const p = planSupplyTerminal(f.value, { kind: 'withdraw', expectedRevision: f.value.character.revision }, f.authorize(f.value))
    expect(p.steps).toEqual([]); expect(p.snapshot.phase).toBe('living-hub')
    expect(states().rows.at(-1)!.phase).toBe('dead')
  })
  it('N17 R four states external cold anchors and strict version4 rejection', () => {
    const { f, rows } = states()
    for (const v of rows) {
      const expected = expectation(v, f.dependencies); const text = serializeSupplyResidenceSave(v, expected, f.policy)
      expect(deserializeSupplyResidenceSave(text, expected, f.policy).value).toEqual(v)
      const raw = JSON.parse(text); raw.formatVersion = 4; code(() => deserializeSupplyResidenceSave(JSON.stringify(raw), expected, f.policy), 'UNKNOWN_VERSION')
    }
  })
  it('N18 R full before equality and wrong independent execution reject', () => {
    const f = fixture(); const expected = expectation(f.value, f.dependencies); const changed = structuredClone(f.value); changed.character.body.energy -= 1
    code(() => restoreSupplyResidenceCandidate(changed, f.value, expected, f.policy), 'EXPECTED_MISMATCH')
    const wrong = structuredClone(expected); wrong.initial.execution.runId = 'another-execution'; code(() => validateSupplyResidenceAggregate(f.value, wrong, f.policy), 'EXPECTED_MISMATCH')
  })
  it('N19 S live pending zero commit/write/notify', () => {
    const h = harness(); start(h); h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    h.owner.dispatch(request(h, 'task', { actionId: 'fire-door', method: 'toolbox', toolInstanceId: current(h).carried.equipment.utility!.instanceId }))
    reject(h, request(h, 'move', { edgeId: 'H1-H4:forward' }), 'UNSUPPORTED_STAGE')
  })
  it('N20 S failed save retains result; retry write only; callback busy', () => {
    const h = harness(); start(h); const before = current(h); h.faults.write = true; h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    const next = current(h); expect(next.character.revision).toBe(before.character.revision + 1)
    const notices = h.listener.mock.calls.length, draws = h.draw.mock.calls.length; h.faults.write = false
    h.hooks.write = () => { expect(() => h.owner.retrySave()).toThrowError(expect.objectContaining({ code: 'BUSY' })) }
    h.owner.retrySave(); expect(current(h)).toBe(next); expect(h.listener).toHaveBeenCalledTimes(notices); expect(h.draw).toHaveBeenCalledTimes(draws)
  })
  it('N21 S HP0 arrival pending consumes original move death and installs final dead once', () => {
    // TEST initial health, real move/door/move pipeline; no artificial CTB victory.
    const template = harness(); const materials = structuredClone(template.materials) as ReturnType<typeof import('../../../../../src/state/residence-session/supply-test-fixtures').initialMaterials>
    materials.character.body.condition.currentHealth = 3; materials.character.body.condition.bleeding = true
    const h = harness({ materials }); start(h)
    h.owner.dispatch(request(h, 'move', { edgeId: 'H0-H1:forward' }))
    h.owner.dispatch(request(h, 'task', { actionId: 'fire-door', method: 'toolbox', toolInstanceId: current(h).carried.equipment.utility!.instanceId }))
    const before = current(h), writes = h.storage.write.mock.calls.length
    expect(before.character.body.condition.currentHealth).toBe(1)
    h.owner.dispatch(request(h, 'move', { edgeId: 'H1-H4:forward' }))
    expect(current(h).phase).toBe('dead'); expect(current(h).site).toBeNull()
    expect(current(h).character.revision).toBe(before.character.revision + 1)
    expect(h.storage.write).toHaveBeenCalledTimes(writes + 1)
    expect(current(h).receipts.at(-1)!.outcome).toBe('death')
  })
  it('N22 new content declares three distinct persistent enemies but no CTB action profile', () => {
    const f = fixture()
    expect(f.dependencies.catalog.data.enemies.map(e => [e.id, e.nodeId, e.definition.maxHealth])).toEqual([
      ['orderly', 'H4', 14], ['porter', 'L2', 16], ['technician', 'C2', 16]])
    for (const e of f.dependencies.catalog.data.enemies) {
      expect(e.definition.actions.map(a => a.kind)).toEqual(['scratch', 'lunge-bite'])
      expect(e.definition.actions[0]).not.toHaveProperty('woundKind')
      expect(e.definition.actions[0]).not.toHaveProperty('ctb')
    }
  })
  it('N23 real quick painkiller consumes one, does not heal or stop existing bleeding', () => {
    const x = encounter({ bleeding: true })
    const pill = { instanceId: 'test-pill', definitionId: HOSPITAL_ITEM_IDS.painkiller, quantity: 1 }
    x.snapshot = createCombatEncounterSnapshot({ ...x.snapshot, enemyNextActionCtb: 100,
      playerCondition: { ...x.snapshot.playerCondition, minorContusions: 1 }, quickSlots: { slots: [pill, null] },
      itemStates: { states: [...x.snapshot.itemStates.states, createFullItemState(pill, hospitalItemResourceCatalog)] } }, x.dependencies)
    const out = resolveCombatPlayerAction(x.snapshot, { kind: 'use-quick-slot-item', quickSlotIndex: 0 }, x.dependencies)
    expect(out.snapshot.playerCondition).toMatchObject({ currentHealth: 11, bleeding: true, minorContusions: 1, painkillerActive: true })
    expect(out.snapshot.quickSlots.slots[0]).toBeNull(); expect(out.snapshot.currentCtb).toBe(80)
  })
})
