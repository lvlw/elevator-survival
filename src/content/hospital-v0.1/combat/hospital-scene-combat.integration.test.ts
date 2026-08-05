import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../../core/condition'
import { createBackpackSnapshot } from '../../../core/inventory'
import { createItemState } from '../../../core/item-state'
import { createEmptyQuickSlots } from '../../../core/quick-slot'
import {
  applySceneExplorationEffects,
  createInitialSceneExplorationSnapshot,
  getPlayerVisibleSceneCombatState,
  previewMainSearchCommand,
  resolveSceneCombatPlayerAction,
  resolveSceneMoveCommand,
} from '../../../core/scene-exploration'
import { createSceneSearchState } from '../../../core/scene-search'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
  HOSPITAL_NODE_IDS,
  hospitalSliceV01SceneGraph,
} from '../hospital-scene-graph'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
} from '../items'
import { hospitalSliceV01RuleConfig as config } from '../rule-config'
import { hospitalMainSearchCatalog } from '../search'
import { hospitalItemSearchIlluminationCatalog } from '../items'
import { hospitalSceneEdgeAccessCatalog } from '../obstacles'
import {
  createHospitalSceneCombatDependencies,
  HOSPITAL_COMBAT_ENCOUNTER_IDS,
} from './hospital-scene-combat'

const sceneInstanceId = 'hospital-scene-combat-integration'
const sceneCombat = createHospitalSceneCombatDependencies('scene-combat-seed', sceneInstanceId)
const dependencies = {
  graph: hospitalSliceV01SceneGraph,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  config,
  sceneCombat,
  edgeAccessCatalog: hospitalSceneEdgeAccessCatalog,
}
const searchState = createSceneSearchState({
  runSeed: 'scene-combat-seed',
  sceneInstanceId,
  graph: hospitalSliceV01SceneGraph,
  searchCatalog: hospitalMainSearchCatalog,
  itemCatalog: hospitalItemCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
})
const pipe = { instanceId: 'equipped-pipe', definitionId: HOSPITAL_ITEM_IDS.metalPipe, quantity: 1 }

function scene(options: {
  health?: number
  bleeding?: boolean
  remainingTime?: number
  alertState?: 'unalerted' | 'alerted'
  currentNodeId?: string
  accessCard?: boolean
} = {}) {
  const bleeding = options.bleeding ?? false
  const card = options.accessCard
    ? { instanceId: 'staff-route-card', definitionId: HOSPITAL_ITEM_IDS.isolationWardAccessCard, quantity: 1 }
    : null
  return createInitialSceneExplorationSnapshot({
    sceneInstanceId,
    searchState,
    alertState: options.alertState,
    currentNodeId: options.currentNodeId ?? HOSPITAL_NODE_IDS.emergencyHall,
    remainingTime: options.remainingTime ?? 200,
    enabledEdgeIds: HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: card ? [card] : [],
      placements: card ? [{ instanceId: card.instanceId, x: 0, y: 0, rotated: false }] : [],
    }, hospitalItemCatalog),
    equipment: { weapon: pipe, armor: null, utility: null },
    quickSlots: createEmptyQuickSlots(
      config.backpack.quickSlotCount,
      hospitalItemCatalog,
      hospitalItemQuickSlotCatalog,
    ),
    itemStates: { states: [
      createItemState({
        ...pipe,
        resource: { kind: 'durability', current: 6 },
      }, hospitalItemResourceCatalog),
      ...(card ? [createItemState({ ...card, resource: { kind: 'none' } }, hospitalItemResourceCatalog)] : []),
    ] },
    condition: createPlayerCondition({
      currentHealth: options.health ?? 12,
      bleeding,
      openWounds: bleeding
        ? [{ id: 'existing-wound', kind: 'laceration', treatment: 'untreated' }]
        : [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    }, config.combat.player),
  }, dependencies)
}

function enter(start = scene()) {
  return resolveSceneMoveCommand(start, {
    edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
  }, dependencies).snapshot
}

describe('hospital scene combat encounter lifecycle', () => {
  it('atomically starts the orderly encounter after movement and blocks non-combat commands', () => {
    const result = resolveSceneMoveCommand(scene(), {
      edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
    }, dependencies)
    expect(result.result.effects.map(({ kind }) => kind)).toEqual([
      'scene-node-changed',
      'scene-time-resolved',
      'scene-combat-started',
      'scene-status-changed',
    ])
    expect(result.snapshot.status).toBe('combat')
    const active = result.snapshot.combatState.encounters[0]
    expect(active.kind).toBe('active')
    if (active.kind !== 'active') throw new Error('encounter must be active')
    expect(active.returnNodeId).toBe(HOSPITAL_NODE_IDS.emergencyHall)
    expect(active.combat.enemyNextActionCtb).toBe(70)
    expect(previewMainSearchCommand(result.snapshot, {
      illumination: 'search-without-flashlight',
    }, {
      ...dependencies,
      searchCatalog: hospitalMainSearchCatalog,
      searchIlluminationCatalog: hospitalItemSearchIlluminationCatalog,
    })).toMatchObject({ canExecute: false, rejectionCode: 'SCENE_NOT_ACTIVE' })
  })

  it('escapes at CTB 80 after the strictly earlier enemy action and persists reentry state', () => {
    const started = enter()
    const active = started.combatState.encounters[0]
    if (active.kind !== 'active') throw new Error('encounter must be active')
    const enemyInstanceId = active.combat.enemy.enemyInstanceId
    const escaped = resolveSceneCombatPlayerAction(started, { kind: 'escape' }, dependencies)
    expect(escaped.snapshot.status).toBe('active')
    expect(escaped.snapshot.currentNodeId).toBe(HOSPITAL_NODE_IDS.emergencyHall)
    expect(escaped.snapshot.remainingTime).toBe(180)
    const dormant = escaped.snapshot.combatState.encounters[0]
    expect(dormant.kind).toBe('dormant')
    if (dormant.kind !== 'dormant') throw new Error('encounter must be dormant')
    expect(dormant.enemy).toMatchObject({
      enemyInstanceId,
      currentHealth: 14,
      hasBeenEncountered: true,
      defeated: false,
      resolvedActionCount: 1,
    })
    expect(escaped.result.effects.some(
      (effect) => effect.kind === 'scene-node-changed' && effect.reason === 'combat-escape',
    )).toBe(true)

    const reentered = enter(escaped.snapshot)
    const reentry = reentered.combatState.encounters[0]
    if (reentry.kind !== 'active') throw new Error('encounter must be active')
    expect(reentry.combat.enemy.enemyInstanceId).toBe(enemyInstanceId)
    expect(reentry.combat.enemyNextActionCtb).toBe(50)
    expect(reentry.combat.enemy.resolvedActionCount).toBe(1)
  })

  it('uses the actual security-office origin through real-time backpack card access', () => {
    const start = scene({
      currentNodeId: HOSPITAL_NODE_IDS.securityOffice,
      accessCard: true,
    })
    const entered = resolveSceneMoveCommand(start, {
      edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
    }, dependencies).snapshot
    const active = entered.combatState.encounters[0]
    if (active.kind !== 'active') throw new Error('encounter must be active')
    expect(active.returnNodeId).toBe(HOSPITAL_NODE_IDS.securityOffice)
    expect(entered.backpack.items).toContainEqual(expect.objectContaining({
      instanceId: 'staff-route-card',
      quantity: 1,
    }))
    const escaped = resolveSceneCombatPlayerAction(entered, { kind: 'escape' }, dependencies)
    expect(escaped.snapshot.currentNodeId).toBe(HOSPITAL_NODE_IDS.securityOffice)
  })

  it('writes victory back once and does not retrigger a defeated enemy', () => {
    let current = enter()
    current = resolveSceneCombatPlayerAction(current, { kind: 'metal-pipe-basic-attack' }, dependencies).snapshot
    current = resolveSceneCombatPlayerAction(current, { kind: 'metal-pipe-charged-strike' }, dependencies).snapshot
    const victory = resolveSceneCombatPlayerAction(current, { kind: 'metal-pipe-basic-attack' }, dependencies)
    expect(victory.snapshot).toMatchObject({
      status: 'active',
      currentNodeId: HOSPITAL_NODE_IDS.isolationCorridor,
      remainingTime: 160,
    })
    const dormant = victory.snapshot.combatState.encounters[0]
    expect(dormant.kind === 'dormant' && dormant.enemy.defeated).toBe(true)
    expect(victory.result.effects.filter(({ kind }) => kind === 'scene-combat-time-resolved')).toHaveLength(1)
    const left = resolveSceneMoveCommand(victory.snapshot, {
      edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
    }, dependencies).snapshot
    const returned = resolveSceneMoveCommand(left, {
      edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
    }, dependencies).snapshot
    expect(returned.status).toBe('active')
  })

  it('preserves the formal basic, charged strike, then escape route across reentry', () => {
    const started = enter()
    const afterBasic = resolveSceneCombatPlayerAction(
      started,
      { kind: 'metal-pipe-basic-attack' },
      dependencies,
    ).snapshot
    const afterCharged = resolveSceneCombatPlayerAction(
      afterBasic,
      { kind: 'metal-pipe-charged-strike' },
      dependencies,
    ).snapshot
    const escaped = resolveSceneCombatPlayerAction(
      afterCharged,
      { kind: 'escape' },
      dependencies,
    )
    expect(escaped.snapshot.remainingTime).toBe(150)
    const dormant = escaped.snapshot.combatState.encounters[0]
    if (dormant.kind !== 'dormant') throw new Error('encounter must be dormant')
    expect(dormant.enemy).toMatchObject({
      currentHealth: 4,
      currentIntentActionId: expect.stringContaining('lunge'),
      resolvedActionCount: 1,
      defeated: false,
    })
    expect(escaped.snapshot.combatState.usage.metalPipeChargedStrikeUses).toBe(1)
    const pipeState = escaped.snapshot.itemStates.states.find(
      ({ instanceId }) => instanceId === pipe.instanceId,
    )
    expect(pipeState?.resource).toEqual({ kind: 'durability', current: 2 })
    const time = escaped.result.effects.find(({ kind }) => kind === 'scene-combat-time-resolved')
    expect(time).toMatchObject({ elapsedCtb: 360, sceneTimeCost: 40 })

    const reentered = enter(escaped.snapshot)
    const active = reentered.combatState.encounters[0]
    if (active.kind !== 'active') throw new Error('encounter must be active')
    expect(active.combat).toMatchObject({
      currentCtb: 0,
      playerNextActionCtb: 0,
      enemyNextActionCtb: 50,
      enemy: { currentHealth: 4, resolvedActionCount: 1 },
    })
  })

  it('makes enemy death during escape preparation terminal at the actual CTB', () => {
    const defeated = resolveSceneCombatPlayerAction(
      enter(scene({ health: 1 })),
      { kind: 'escape' },
      dependencies,
    )
    expect(defeated.snapshot.status).toBe('dead')
    expect(defeated.snapshot.currentNodeId).toBe(HOSPITAL_NODE_IDS.isolationCorridor)
    const time = defeated.result.effects.find(({ kind }) => kind === 'scene-combat-time-resolved')
    expect(time).toMatchObject({ elapsedCtb: 70, sceneTimeCost: 10 })
    expect(defeated.result.effects.some(
      (effect) => effect.kind === 'scene-node-changed' && effect.reason === 'combat-escape',
    )).toBe(false)
  })

  it('does not trigger after movement death and immediately forces return after an escaped timeout', () => {
    const movementDeath = resolveSceneMoveCommand(scene({ health: 1, bleeding: true }), {
      edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
    }, dependencies)
    expect(movementDeath.snapshot.status).toBe('dead')
    expect(movementDeath.result.effects.some(({ kind }) => kind === 'scene-combat-started')).toBe(false)

    const forced = resolveSceneCombatPlayerAction(
      enter(scene({ remainingTime: 20 })),
      { kind: 'escape' },
      dependencies,
    )
    expect(forced.snapshot.status).toBe('forced-returned')
    expect(forced.snapshot.currentNodeId).toBe(HOSPITAL_NODE_IDS.elevatorAnteroom)
    expect(forced.snapshot.remainingTime).toBe(0)
  })

  it('uses alerted first timing and exposes only a player-safe combat projection', () => {
    const started = enter(scene({ alertState: 'alerted' }))
    const active = started.combatState.encounters[0]
    if (active.kind !== 'active') throw new Error('encounter must be active')
    expect(active.combat.enemyNextActionCtb).toBe(50)
    const projection = getPlayerVisibleSceneCombatState(started, dependencies)
    expect(projection.enemy).toMatchObject({ healthPhase: 'healthy' })
    expect(projection.enemy.currentIntentId).toContain('scratch')
    expect(projection.legalActions).toContain('escape')
    expect(JSON.stringify(projection)).not.toContain('currentHealth\":14')
    expect(JSON.stringify(projection)).not.toContain('runSeed')
    expect(JSON.stringify(projection)).not.toContain('streamId')
  })

  it('rejects tampered scene combat plans atomically', () => {
    const started = enter()
    const resolved = resolveSceneCombatPlayerAction(started, { kind: 'defend' }, dependencies)
    const tampered = resolved.result.effects.map((effect, index) => index === 0 && effect.kind === 'scene-combat-advanced'
      ? { ...effect, combatPlan: { ...effect.combatPlan, effects: effect.combatPlan.effects.slice(1) } }
      : effect)
    expect(() => applySceneExplorationEffects(started, tampered, dependencies)).toThrow()
    expect(started.status).toBe('combat')
  })
})
