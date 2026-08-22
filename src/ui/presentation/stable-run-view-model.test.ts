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
import { createSceneExplorationSnapshot } from '../../core/scene-exploration'
import { resolveSceneLaunch } from '../../core/scene-launch'
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
    for (const hidden of ['ui-run', 'ui-seed', 'rulesVersion', 'instanceId', 'definitionId']) expect(JSON.stringify(model)).not.toContain(hidden)
  })

  it('projects Scene navigation and formal return estimate without hidden search outcomes', () => {
    const model = createStableRunPlayerViewModel(scenePhase(), dependencies)
    expect(model.kind).toBe('scene-session')
    if (model.kind !== 'scene-session') throw new Error('expected Scene')
    expect(model.scene.currentNodeName).toBe('电梯前室')
    expect(model.scene.returnEstimate).toBe(0)
    expect(model.scene.currentNodeSearchState).toBe('not-available')
    expect(JSON.stringify(model)).not.toContain('preparedOutcome')
    expect(JSON.stringify(model)).not.toContain('randomTrace')
  })

  it('projects combat as relative enemy information without exact enemy health or risk traces', () => {
    const model = createStableRunPlayerViewModel(combatPhase(), dependencies)
    if (model.kind !== 'scene-session' || model.scene.combat === null) throw new Error('expected combat model')
    expect(model.scene.combat.enemyName).toBe('感染护工')
    expect(model.scene.combat.enemyHealthStage).toBe('healthy')
    for (const hidden of ['currentHealth', 'riskPercent', 'enemyInstanceId']) expect(JSON.stringify(model.scene.combat)).not.toContain(hidden)
  })

  it('projects Run failure as a read-only terminal summary', () => {
    expect(createStableRunPlayerViewModel(failurePhase(), dependencies)).toMatchObject({ kind: 'run-failure', failure: { currentDay: 2, reason: '生命耗尽' } })
  })
})
