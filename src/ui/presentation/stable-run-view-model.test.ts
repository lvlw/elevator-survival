import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalSliceV01RuleConfig as config,
} from '../../content'
import { createPlayerCondition } from '../../core/condition'
import { createFirstCombatEncounter } from '../../core/combat'
import { createCurrentDayHubSnapshot } from '../../core/current-day-hub'
import { resolveDailySettlement } from '../../core/daily-settlement'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import { resolveRunFailure } from '../../core/run-termination'
import { createSceneExplorationSnapshot, resolveSceneMoveCommand } from '../../core/scene-exploration'
import { createRunSceneSessionSnapshot, getRunSceneRuntime, resolveSceneLaunch } from '../../core/scene-launch'
import {
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
  hospitalRunTerminationDependencies,
  hospitalSceneLaunchDependencies,
  type StableRunPhase,
} from '../../state/run-save'
import { hospitalV01UiLabels } from '../hospital-v0.1'
import { createStableRunPlayerViewModel } from './stable-run-view-model'

const item = (instanceId: string, definitionId: string, quantity = 1): ItemInstance => ({ instanceId, definitionId, quantity })
const flashlight = item('ui-flashlight', HOSPITAL_ITEM_IDS.flashlight)
const ration = item('ui-ration', HOSPITAL_ITEM_IDS.ration)

function hub() {
  const owned = [ration, flashlight]
  return createCurrentDayHubSnapshot({
    continuity: { runIdentity: { runId: 'ui-run', seed: 'ui-seed', rulesVersion: config.metadata.rulesVersion }, currentDay: 2, sceneInstanceId: 'returned-before-ui' },
    runLoadout: createRunLoadoutSnapshot({
      warehouse: { items: [ration] }, taskStorage: { items: [] },
      backpack: createBackpackSnapshot({ width: config.backpack.width, height: config.backpack.height, items: [], placements: [] }, hospitalItemCatalog),
      equipment: { weapon: null, armor: null, utility: flashlight },
      quickSlots: createQuickSlotSnapshot([null, null], config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog),
      itemStates: { states: owned.map((candidate) => createFullItemState(candidate, hospitalItemResourceCatalog)) },
    }, { physicalCatalog: hospitalItemCatalog, equipmentCatalog: hospitalItemEquipmentCatalog, quickSlotCatalog: hospitalItemQuickSlotCatalog, itemResourceCatalog: hospitalItemResourceCatalog, lifecycleCatalog: hospitalItemReturnLifecycleCatalog, backpackRules: config.backpack }),
    playerCondition: createPlayerCondition({ currentHealth: 9, bleeding: true, openWounds: [{ id: 'ui-wound', kind: 'laceration', treatment: 'untreated' }], minorContusions: 1, painkillerActive: false, pendingInfectionExposures: 0 }, config.combat.player),
    runIntelLog: { intelIds: [] },
    dailyState: { medicalUsage: { disinfectantUsesToday: 0 }, threatSuppression: { usesToday: 0, suppressionAmountToday: 0 }, maintenanceLaborRemaining: config.maintenance.dailyBaseLabor.points, mainSceneUsedToday: false },
    worldThreat: { definitionId: config.worldThreat.definitionId, progress: 0 }, satiety: { current: 4 }, returnLedger: { sceneInstanceIds: ['returned-before-ui'] },
  }, hospitalCurrentDayHubDependencies)
}

function scenePhase(): StableRunPhase {
  return { kind: 'scene-session', payload: resolveSceneLaunch(hub(), { kind: 'launch-main-scene' }, hospitalSceneLaunchDependencies).session }
}

function emergencyHallScenePhase(): StableRunPhase {
  const session = resolveSceneLaunch(hub(), { kind: 'launch-main-scene' }, hospitalSceneLaunchDependencies).session
  const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
  const moved = resolveSceneMoveCommand(
    session.scene,
    { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
    runtime.dependencies,
  )
  return {
    kind: 'scene-session',
    payload: createRunSceneSessionSnapshot({
      context: session.context,
      scene: moved.snapshot,
    }, hospitalSceneLaunchDependencies),
  }
}

function nearZeroEmergencyHallScenePhase(): StableRunPhase {
  const phase = emergencyHallScenePhase()
  if (phase.kind !== 'scene-session') throw new Error('expected Scene')
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const scene = createSceneExplorationSnapshot({
    ...phase.payload.scene,
    remainingTime: 5,
  }, runtime.dependencies)
  return {
    kind: 'scene-session',
    payload: createRunSceneSessionSnapshot({
      context: phase.payload.context,
      scene,
    }, hospitalSceneLaunchDependencies),
  }
}

function fireAxeBackpackScenePhase(): StableRunPhase {
  const phase = scenePhase()
  if (phase.kind !== 'scene-session') throw new Error('expected Scene')
  const fireAxe = item('ui-fire-axe', HOSPITAL_ITEM_IDS.fireAxe)
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const backpack = createBackpackSnapshot({
    ...phase.payload.scene.backpack,
    items: [...phase.payload.scene.backpack.items, fireAxe],
    placements: [...phase.payload.scene.backpack.placements, {
      instanceId: fireAxe.instanceId,
      x: 0,
      y: 0,
      rotated: false,
    }],
  }, hospitalItemCatalog)
  const scene = createSceneExplorationSnapshot({
    ...phase.payload.scene,
    backpack,
    itemStates: {
      states: [...phase.payload.scene.itemStates.states, createFullItemState(
        fireAxe,
        hospitalItemResourceCatalog,
      )],
    },
  }, runtime.dependencies)
  return {
    kind: 'scene-session',
    payload: createRunSceneSessionSnapshot({
      context: phase.payload.context,
      scene,
    }, hospitalSceneLaunchDependencies),
  }
}

function combatPhase(): StableRunPhase {
  const session = resolveSceneLaunch(hub(), { kind: 'launch-main-scene' }, hospitalSceneLaunchDependencies).session
  const runtime = hospitalSceneLaunchDependencies.content.createRuntime(session.context.runReturnCarryForward.continuity.runIdentity.seed, session.scene.sceneInstanceId)
  const dormant = session.scene.combatState.encounters[0]
  if (!dormant || dormant.kind !== 'dormant') throw new Error('expected dormant encounter')
  const combat = createFirstCombatEncounter({ playerCondition: session.scene.condition, backpack: session.scene.backpack, equipment: session.scene.equipment, quickSlots: session.scene.quickSlots, itemStates: session.scene.itemStates, usage: session.scene.combatState.usage, enemy: dormant.enemy }, 'unalerted', runtime.dependencies.sceneCombat!.combat)
  const scene = createSceneExplorationSnapshot({
    ...session.scene,
    status: 'combat', currentNodeId: HOSPITAL_NODE_IDS.isolationCorridor,
    enabledEdgeIds: [...session.scene.enabledEdgeIds, HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor],
    combatState: { usage: session.scene.combatState.usage, encounters: [{ kind: 'active', encounterId: dormant.encounterId, eventId: dormant.eventId, nodeId: dormant.nodeId, returnNodeId: HOSPITAL_NODE_IDS.emergencyHall, entryEdgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor, engagement: 'first-entry', combat }] },
  }, runtime.dependencies)
  return { kind: 'scene-session', payload: { context: session.context, scene } }
}

function failurePhase(): StableRunPhase {
  const base = hub()
  const terminalHub = createCurrentDayHubSnapshot({ ...base, dailyState: { ...base.dailyState, mainSceneUsedToday: true }, playerCondition: { ...base.playerCondition, currentHealth: 1, bleeding: true } }, hospitalCurrentDayHubDependencies)
  const settlement = resolveDailySettlement(terminalHub, { kind: 'end-day' }, hospitalCurrentDayHubDependencies)
  if (settlement.outcome.kind !== 'terminal') throw new Error('expected terminal')
  return { kind: 'run-failure', payload: resolveRunFailure({ kind: 'daily-settlement-terminal', terminalSnapshot: settlement.outcome.snapshot }, hospitalRunTerminationDependencies).snapshot }
}

const dependencies = { rulesRegistry: hospitalRunSaveRulesRegistry, labels: hospitalV01UiLabels }

describe('stable Run player-visible ViewModel', () => {
  it('projects Hub facts through an explicit player-visible allow-list', () => {
    const model = createStableRunPlayerViewModel({ kind: 'current-day-hub', payload: hub() }, dependencies)
    expect(model.kind).toBe('current-day-hub')
    if (model.kind !== 'current-day-hub') throw new Error('expected Hub')
    expect(model.status.condition.currentHealth).toBe(9)
    expect(model.status.maximumSatiety).toBe(config.dailySettlement.maxSatiety)
    expect(model.loadout.equipment.utility?.help).toEqual({
      role: '照明实用装备',
      summary: '让低照明搜索更快、信息更清楚，不提高掉落数量或稀有度。',
      usageHints: ['照明搜索消耗电量。', '标准电池可以为手电筒补充电量。'],
    })
    for (const hidden of ['ui-run', 'ui-seed', 'rulesVersion', 'instanceId', 'definitionId']) expect(JSON.stringify(model)).not.toContain(hidden)
  })

  it('projects current traversable adjacency and formal return preview without hidden search outcomes', () => {
    const model = createStableRunPlayerViewModel(scenePhase(), dependencies)
    expect(model.kind).toBe('scene-session')
    if (model.kind !== 'scene-session') throw new Error('expected Scene')
    expect(model.scene.currentNodeName).toBe('电梯前室')
    expect(model.scene.traversableAdjacentNodeNames).toEqual(['急诊大厅'])
    expect(model.scene.returnEstimate).toBe(0)
    expect(model.scene.returnAfterWithdrawalTime).toBe(200)
    expect(model.scene.returnRisk).toBe('safe-returned')
    expect(model.scene.timeBudget).toEqual({
      totalTime: config.scene.totalTime,
      remainingTime: model.scene.remainingTime,
      usedTime: 0,
      returnReserve: model.scene.returnEstimate,
      returnAfterWithdrawalTime: model.scene.returnAfterWithdrawalTime,
      safeMargin: model.scene.remainingTime - model.scene.returnEstimate!,
      returnRisk: model.scene.returnRisk,
      unavailableReason: null,
    })
    const canonical = scenePhase()
    if (canonical.kind !== 'scene-session') throw new Error('expected Scene')
    expect('timeBudget' in canonical.payload.scene).toBe(false)
    expect(model.scene.currentNodeSearchState).toBe('not-available')
    expect(model.scene.currentObstacles).toEqual([])
    expect(JSON.stringify(model)).not.toContain('preparedOutcome')
    expect(JSON.stringify(model)).not.toContain('randomTrace')
  })

  it('projects only the labelled current obvious obstacle without internal identities', () => {
    const model = createStableRunPlayerViewModel(emergencyHallScenePhase(), dependencies)
    if (model.kind !== 'scene-session') throw new Error('expected Scene')
    expect(model.scene.currentObstacles).toEqual([{ name: '隔离区防火门' }])
    const visible = JSON.stringify(model.scene.currentObstacles)
    for (const hidden of ['obstacle_isolation_fire_door', 'option_', 'obstacleId', 'optionId']) {
      expect(visible).not.toContain(hidden)
    }
  })

  it('projects formal forced-return risk from the current withdrawal preview', () => {
    const model = createStableRunPlayerViewModel(nearZeroEmergencyHallScenePhase(), dependencies)
    if (model.kind !== 'scene-session') throw new Error('expected Scene')
    expect(model.scene.remainingTime).toBe(5)
    expect(model.scene.returnEstimate).toBeGreaterThan(0)
    expect(model.scene.returnAfterWithdrawalTime).toBe(0)
    expect(model.scene.returnRisk).toBe('forced-returned')
    expect(model.scene.timeBudget.safeMargin).toBe(
      model.scene.remainingTime - model.scene.returnEstimate!,
    )
    expect(model.scene.timeBudget.safeMargin).toBeLessThan(0)
  })

  it('projects every formal 2×3 fire-axe footprint cell without internal item identity', () => {
    const model = createStableRunPlayerViewModel(fireAxeBackpackScenePhase(), dependencies)
    if (model.kind !== 'scene-session') throw new Error('expected Scene')
    expect(model.scene.loadout.backpackGrid.occupiedCells).toEqual([
      { x: 0, y: 0, name: '消防斧', quantity: 1, isAnchor: true },
      { x: 1, y: 0, name: '消防斧', quantity: 1, isAnchor: false },
      { x: 0, y: 1, name: '消防斧', quantity: 1, isAnchor: false },
      { x: 1, y: 1, name: '消防斧', quantity: 1, isAnchor: false },
      { x: 0, y: 2, name: '消防斧', quantity: 1, isAnchor: false },
      { x: 1, y: 2, name: '消防斧', quantity: 1, isAnchor: false },
    ])
    expect(JSON.stringify(model.scene.loadout.backpackGrid)).not.toContain('ui-fire-axe')
    expect(JSON.stringify(model.scene.loadout.backpackGrid)).not.toContain(HOSPITAL_ITEM_IDS.fireAxe)
  })

  it('only presents currently traversable emergency-hall edges, not a player-known map', () => {
    const model = createStableRunPlayerViewModel(emergencyHallScenePhase(), dependencies)
    if (model.kind !== 'scene-session') throw new Error('expected Scene')

    expect(model.scene.currentNodeName).toBe('急诊大厅')
    expect(model.scene.traversableAdjacentNodeNames).toEqual([
      '保安值班室',
      '电梯前室',
      '药房',
    ])
    // The unopened Fire Door means the isolation corridor is not traversable.
    // Its absence does not declare it unknown, hidden, or nonexistent.
    expect(model.scene.traversableAdjacentNodeNames).not.toContain('隔离走廊')
    expect('accessibleNodeNames' in model.scene).toBe(false)
    expect('knownNavigation' in model.scene).toBe(false)
  })

  it('projects combat as relative enemy information without exact enemy health or risk traces', () => {
    const phase = combatPhase()
    const model = createStableRunPlayerViewModel(phase, dependencies)
    if (model.kind !== 'scene-session' || model.scene.combat === null) throw new Error('expected combat model')
    expect(model.scene.combat.enemyName).toBe('感染护工')
    expect(model.scene.combat.enemyHealthStage).toBe('healthy')
    expect(model.scene.combat).toMatchObject({
      currentIntentCategory: 'basic-attack',
      currentIntentRelativeSpeed: 'normal',
      currentIntentDirectDamageSeverity: 'medium',
      currentIntentMayCauseInjury: true,
      currentIntentMayCauseInfectionExposure: false,
      currentIntentMayCauseControl: false,
      currentCtb: 0,
      sceneTimeIfCombatEndedNow: 10,
      minimumSceneTime: 10,
    })
    expect(model.scene.timeBudget).toMatchObject({
      remainingTime: phase.kind === 'scene-session' ? phase.payload.scene.remainingTime : -1,
      returnReserve: null,
      returnAfterWithdrawalTime: null,
      safeMargin: null,
      unavailableReason: 'combat-recalculate',
    })
    expect(model.status.condition.wounds).toEqual([
      { kind: 'laceration', treatment: 'untreated', ordinal: 1 },
    ])
    for (const hidden of ['currentHealth', 'riskPercent', 'enemyInstanceId', 'woundId', 'ui-wound', 'nextCycleIndex']) expect(JSON.stringify(model.scene.combat)).not.toContain(hidden)
  })

  it('projects Run failure as a read-only terminal summary', () => {
    expect(createStableRunPlayerViewModel(failurePhase(), dependencies)).toMatchObject({ kind: 'run-failure', failure: { currentDay: 2, reason: '生命耗尽' } })
  })
})
