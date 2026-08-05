import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../../core/condition'
import { createBackpackSnapshot } from '../../../core/inventory'
import { createItemState } from '../../../core/item-state'
import { createEmptyQuickSlots } from '../../../core/quick-slot'
import {
  applySceneExplorationEffects,
  createInitialSceneExplorationSnapshot,
  createSceneExplorationSnapshot,
  getPlayerVisibleSceneCombatState,
  previewMainSearchCommand,
  resolveSceneCombatPlayerAction,
  resolveSceneMoveCommand,
} from '../../../core/scene-exploration'
import { SceneCombatError } from '../../../core/scene-combat'
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
    expect(active.entryEdgeId).toBe(
      HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
    )
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
    expect(active.entryEdgeId).toBe(
      HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
    )
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
    expect(createSceneExplorationSnapshot(victory.snapshot, dependencies))
      .toEqual(victory.snapshot)
    const withoutCombatState = { ...victory.snapshot } as Record<string, unknown>
    delete withoutCombatState.combatState
    expect(() => createSceneExplorationSnapshot(
      withoutCombatState as never,
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
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

  it('rejects every tampered movement-to-combat source fact atomically', () => {
    const start = scene()
    const resolved = resolveSceneMoveCommand(start, {
      edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
    }, dependencies)
    const mutations: ((effects: typeof resolved.result.effects extends readonly (infer E)[] ? E[] : never) => void)[] = [
      (effects) => Object.assign(effects[0], {
        edgeId: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy,
      }),
      (effects) => Object.assign(effects[0], {
        edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
      }),
      (effects) => Object.assign(effects[0], { fromNodeId: HOSPITAL_NODE_IDS.securityOffice }),
      (effects) => Object.assign(effects[0], { toNodeId: HOSPITAL_NODE_IDS.pharmacy }),
      (effects) => Object.assign(effects[1], { actionTimeCost: 1 }),
      (effects) => Object.assign(effects.find(({ kind }) => kind === 'scene-combat-started')!, {
        returnNodeId: HOSPITAL_NODE_IDS.securityOffice,
      }),
      (effects) => Object.assign(effects.find(({ kind }) => kind === 'scene-combat-started')!, {
        entryEdgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
      }),
      (effects) => Object.assign(effects.find(({ kind }) => kind === 'scene-combat-started')!, {
        encounterId: 'tampered-encounter',
      }),
      (effects) => Object.assign(effects.find(({ kind }) => kind === 'scene-combat-started')!, {
        eventId: 'tampered-event',
      }),
      (effects) => Object.assign(effects.find(({ kind }) => kind === 'scene-combat-started')!, {
        enemyInstanceId: 'tampered-enemy',
      }),
      (effects) => Object.assign(effects.find(({ kind }) => kind === 'scene-combat-started')!, {
        engagement: 'reentry',
      }),
      (effects) => {
        const started = effects.find(({ kind }) => kind === 'scene-combat-started')
        if (started?.kind === 'scene-combat-started') {
          Object.assign(started.combat, { enemyNextActionCtb: 1 })
        }
      },
      (effects) => effects.splice(effects.findIndex(({ kind }) => kind === 'scene-combat-started'), 1),
      (effects) => effects.splice(effects.findIndex(
        (effect) => effect.kind === 'scene-status-changed' && effect.reason === 'combat-started',
      ), 1),
    ]
    for (const mutate of mutations) {
      const effects = structuredClone(resolved.result.effects) as never
      const before = structuredClone(start)
      mutate(effects)
      expect(() => applySceneExplorationEffects(start, effects, dependencies))
        .toThrow()
      expect(start).toEqual(before)
    }
  })

  it('rejects combat suffixes added to ordinary, movement-death, or forced-return plans', () => {
    const entered = resolveSceneMoveCommand(scene(), {
      edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
    }, dependencies)
    const combatSuffix = entered.result.effects.filter((effect) =>
      effect.kind === 'scene-combat-started' ||
      (effect.kind === 'scene-status-changed' && effect.reason === 'combat-started'))
    const cases = [
      {
        start: scene(),
        edgeId: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy,
      },
      {
        start: scene({ health: 1, bleeding: true }),
        edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
      },
      {
        start: scene({ remainingTime: 5 }),
        edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
      },
    ] as const
    for (const { start, edgeId } of cases) {
      const formal = resolveSceneMoveCommand(start, { edgeId }, dependencies)
      const before = structuredClone(start)
      expect(() => applySceneExplorationEffects(
        start,
        [...formal.result.effects, ...combatSuffix],
        dependencies,
      )).toThrowError(expect.objectContaining({ code: 'INCOMPLETE_EFFECT_PLAN' }))
      expect(start).toEqual(before)
    }
  })

  it('strictly restores active entry edges and rejects unrelated or unauthorized sources', () => {
    const emergency = enter()
    expect(createSceneExplorationSnapshot(emergency, dependencies)).toEqual(emergency)
    const changeActive = (
      snapshot: typeof emergency,
      changes: Record<string, unknown>,
    ) => {
      const copy = structuredClone(snapshot)
      const index = copy.combatState.encounters.findIndex(({ kind }) => kind === 'active')
      return {
        ...copy,
        combatState: {
          ...copy.combatState,
          encounters: copy.combatState.encounters.map((encounter, encounterIndex) =>
            encounterIndex === index
              ? { ...encounter, ...changes } as never
              : encounter),
        },
      }
    }
    for (const changes of [
      { returnNodeId: HOSPITAL_NODE_IDS.pharmacy },
      { returnNodeId: HOSPITAL_NODE_IDS.isolationCorridor },
      { entryEdgeId: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy },
      { entryEdgeId: '' },
      { unexpected: true },
    ]) {
      expect(() => createSceneExplorationSnapshot(
        changeActive(emergency, changes),
        dependencies,
      )).toThrow()
    }
    expect(() => createSceneExplorationSnapshot({
      ...emergency,
      enabledEdgeIds: HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))

    const staff = resolveSceneMoveCommand(scene({
      currentNodeId: HOSPITAL_NODE_IDS.securityOffice,
      accessCard: true,
    }), {
      edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
    }, dependencies).snapshot
    expect(createSceneExplorationSnapshot(staff, dependencies)).toEqual(staff)
    const noCardBackpack = createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: [],
      placements: [],
    }, hospitalItemCatalog)
    const noCardStates = {
      states: staff.itemStates.states.filter(
        ({ instanceId }) => instanceId !== 'staff-route-card',
      ),
    }
    const activeIndex = staff.combatState.encounters.findIndex(({ kind }) => kind === 'active')
    const active = staff.combatState.encounters[activeIndex]
    if (active.kind !== 'active') throw new Error('encounter must be active')
    const noCard = {
      ...staff,
      backpack: noCardBackpack,
      itemStates: noCardStates,
      combatState: {
        ...staff.combatState,
        encounters: staff.combatState.encounters.map((encounter, index) =>
          index === activeIndex
            ? {
                ...active,
                combat: {
                  ...active.combat,
                  backpack: noCardBackpack,
                  itemStates: noCardStates,
                },
              }
            : encounter,
        ),
      },
    }
    expect(() => createSceneExplorationSnapshot(noCard, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('rejects hidden-state omission, invalid encounter elements and impossible encounter statuses', () => {
    const started = enter()
    for (const field of ['alertState', 'sceneItems', 'combatState'] as const) {
      const incomplete = { ...started } as Record<string, unknown>
      delete incomplete[field]
      expect(() => createSceneExplorationSnapshot(incomplete as never, dependencies))
        .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    }
    expect(() => createSceneExplorationSnapshot({
      ...started,
      remainingTime: 0,
    }, dependencies)).toThrowError(expect.objectContaining({
      code: 'INVALID_REMAINING_TIME',
    }))
    for (const value of [null, [], 1, { kind: 'unknown' }]) {
      expect(() => createSceneExplorationSnapshot({
        ...started,
        combatState: {
          ...started.combatState,
          encounters: [value] as never,
        },
      }, dependencies)).toThrowError(SceneCombatError)
    }

    expect(() => createSceneExplorationSnapshot({
      ...started,
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    expect(() => createSceneExplorationSnapshot({
      ...started,
      status: 'forced-returned',
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))

    const dormantAtHall = scene()
    expect(createSceneExplorationSnapshot(dormantAtHall, dependencies))
      .toEqual(dormantAtHall)
    expect(() => createSceneExplorationSnapshot({
      ...dormantAtHall,
      currentNodeId: HOSPITAL_NODE_IDS.isolationCorridor,
    }, dependencies)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
    const deadAtEncounter = createSceneExplorationSnapshot({
      ...dormantAtHall,
      status: 'dead',
      currentNodeId: HOSPITAL_NODE_IDS.isolationCorridor,
      condition: createPlayerCondition({
        ...dormantAtHall.condition,
        currentHealth: 0,
      }, config.combat.player),
    }, dependencies)
    expect(deadAtEncounter.status).toBe('dead')
  })

  it('cannot reset escaped enemy state or exploration usage by omitting combatState', () => {
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
    ).snapshot
    expect(escaped.combatState.usage.metalPipeChargedStrikeUses).toBe(1)
    const incomplete = { ...escaped } as Record<string, unknown>
    delete incomplete.combatState
    expect(() => createSceneExplorationSnapshot(incomplete as never, dependencies))
      .toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })
})
