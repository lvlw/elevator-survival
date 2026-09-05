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
import { createCurrentDayHubSnapshot } from '../../core/current-day-hub'
import { resolveDailySettlement } from '../../core/daily-settlement'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState, createItemState } from '../../core/item-state'
import { createQuickSlotSnapshot } from '../../core/quick-slot'
import { createRunLoadoutSnapshot } from '../../core/run-loadout'
import { resolveRunFailure } from '../../core/run-termination'
import { createSceneExplorationSnapshot, resolveSceneMoveCommand } from '../../core/scene-exploration'
import { resolveSceneLaunch } from '../../core/scene-launch'
import {
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
  hospitalRunTerminationDependencies,
  hospitalSceneLaunchDependencies,
  type StableRunPhase,
} from '../../state/run-save'
import { createStableRunStore, type StableRunStore } from '../../state/run-store'
import { MemoryPreviewStorage } from './memory-preview-storage'

export type DevelopmentPreviewScenarioKind = 'hub' | 'hub-returned' | 'hub-maintenance' | 'scene' | 'combat' | 'failure'

export interface DevelopmentPreviewScenario {
  readonly kind: DevelopmentPreviewScenarioKind
  readonly label: string
  readonly store: StableRunStore
  readonly storage: MemoryPreviewStorage
}

const item = (
  instanceId: string,
  definitionId: string,
  quantity = 1,
): ItemInstance => ({ instanceId, definitionId, quantity })

const flashlight = item('dev-ui-preview-flashlight', HOSPITAL_ITEM_IDS.flashlight)
const metalPipe = item('dev-ui-preview-metal-pipe', HOSPITAL_ITEM_IDS.metalPipe)
const heavyCoat = item('dev-ui-preview-heavy-coat', HOSPITAL_ITEM_IDS.heavyCoat)
const ration = item('dev-ui-preview-ration', HOSPITAL_ITEM_IDS.ration)
const bandage = item('dev-ui-preview-bandage', HOSPITAL_ITEM_IDS.bandage)
const toolkit = item('dev-ui-preview-toolkit', HOSPITAL_ITEM_IDS.toolkit)
const metalParts = item('dev-ui-preview-metal-parts', HOSPITAL_ITEM_IDS.metalParts, 2)
const electronicComponents = item('dev-ui-preview-electronic-components', HOSPITAL_ITEM_IDS.electronicComponents)
const fabric = item('dev-ui-preview-fabric', HOSPITAL_ITEM_IDS.fabric)
const battery = item('dev-ui-preview-battery', HOSPITAL_ITEM_IDS.standardBattery)

function createMaintenancePreviewHub() {
  const owned = [flashlight, metalPipe, heavyCoat, ration, bandage, toolkit, metalParts, electronicComponents, fabric, battery]
  const resourceCurrent: Readonly<Record<string, number>> = {
    [flashlight.instanceId]: 0,
    [metalPipe.instanceId]: 5,
    [heavyCoat.instanceId]: 2,
    [toolkit.instanceId]: 0,
  }
  return createCurrentDayHubSnapshot({
    continuity: {
      runIdentity: {
        runId: 'dev-ui-preview',
        seed: 'dev-ui-preview-seed',
        rulesVersion: config.metadata.rulesVersion,
      },
      currentDay: 2,
      sceneInstanceId: 'returned-before-dev-ui-preview',
    },
    runLoadout: createRunLoadoutSnapshot({
      warehouse: { items: [ration, toolkit, metalParts, electronicComponents, fabric, battery] },
      taskStorage: { items: [] },
      backpack: createBackpackSnapshot({
        width: config.backpack.width,
        height: config.backpack.height,
        items: [],
        placements: [],
      }, hospitalItemCatalog),
      equipment: { weapon: metalPipe, armor: heavyCoat, utility: flashlight },
      quickSlots: createQuickSlotSnapshot(
        [bandage, null],
        config.backpack.quickSlotCount,
        hospitalItemCatalog,
        hospitalItemQuickSlotCatalog,
      ),
      itemStates: {
        states: owned.map((candidate) => {
          const current = resourceCurrent[candidate.instanceId]
          if (current === undefined) return createFullItemState(candidate, hospitalItemResourceCatalog)
          const profile = hospitalItemResourceCatalog.get(candidate.definitionId)
          if (profile.kind === 'none') throw new Error('维护预览资源物品配置错误')
          return createItemState({
            instanceId: candidate.instanceId,
            definitionId: candidate.definitionId,
            resource: { kind: profile.kind, current },
          }, hospitalItemResourceCatalog)
        }),
      },
    }, {
      physicalCatalog: hospitalItemCatalog,
      equipmentCatalog: hospitalItemEquipmentCatalog,
      quickSlotCatalog: hospitalItemQuickSlotCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
      lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
      backpackRules: config.backpack,
    }),
    playerCondition: createPlayerCondition({
      currentHealth: 9,
      bleeding: true,
      openWounds: [{ id: 'dev-ui-preview-wound', kind: 'laceration', treatment: 'untreated' }],
      minorContusions: 1,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    }, config.combat.player),
    runIntelLog: { intelIds: [] },
    dailyState: {
      medicalUsage: { disinfectantUsesToday: 0 },
      threatSuppression: { usesToday: 0, suppressionAmountToday: 0 },
      maintenanceLaborRemaining: config.maintenance.dailyBaseLabor.points,
      mainSceneUsedToday: false,
    },
    worldThreat: { definitionId: config.worldThreat.definitionId, progress: 0 },
    satiety: { current: 4 },
    returnLedger: { sceneInstanceIds: ['returned-before-dev-ui-preview'] },
  }, hospitalCurrentDayHubDependencies)
}

function createPreviewHub() {
  const owned = [flashlight, metalPipe, heavyCoat, ration, bandage]
  return createCurrentDayHubSnapshot({
    continuity: {
      runIdentity: { runId: 'dev-ui-preview', seed: 'dev-ui-preview-seed', rulesVersion: config.metadata.rulesVersion },
      currentDay: 2,
      sceneInstanceId: 'returned-before-dev-ui-preview',
    },
    runLoadout: createRunLoadoutSnapshot({
      warehouse: { items: [ration] },
      taskStorage: { items: [] },
      backpack: createBackpackSnapshot({ width: config.backpack.width, height: config.backpack.height, items: [], placements: [] }, hospitalItemCatalog),
      equipment: { weapon: metalPipe, armor: heavyCoat, utility: flashlight },
      quickSlots: createQuickSlotSnapshot([bandage, null], config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog),
      itemStates: { states: owned.map((candidate) => createFullItemState(candidate, hospitalItemResourceCatalog)) },
    }, {
      physicalCatalog: hospitalItemCatalog,
      equipmentCatalog: hospitalItemEquipmentCatalog,
      quickSlotCatalog: hospitalItemQuickSlotCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
      lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
      backpackRules: config.backpack,
    }),
    playerCondition: createPlayerCondition({ currentHealth: 9, bleeding: true, openWounds: [{ id: 'dev-ui-preview-wound', kind: 'laceration', treatment: 'untreated' }], minorContusions: 1, painkillerActive: false, pendingInfectionExposures: 0 }, config.combat.player),
    runIntelLog: { intelIds: [] },
    dailyState: { medicalUsage: { disinfectantUsesToday: 0 }, threatSuppression: { usesToday: 0, suppressionAmountToday: 0 }, maintenanceLaborRemaining: config.maintenance.dailyBaseLabor.points, mainSceneUsedToday: false },
    worldThreat: { definitionId: config.worldThreat.definitionId, progress: 0 },
    satiety: { current: 4 },
    returnLedger: { sceneInstanceIds: ['returned-before-dev-ui-preview'] },
  }, hospitalCurrentDayHubDependencies)
}

function createReturnedPreviewHub() {
  const hub = createPreviewHub()
  return createCurrentDayHubSnapshot({
    ...hub,
    playerCondition: {
      ...hub.playerCondition,
      pendingInfectionExposures: 1,
    },
    dailyState: {
      ...hub.dailyState,
      medicalUsage: { disinfectantUsesToday: 1 },
      threatSuppression: { usesToday: 1, suppressionAmountToday: 15 },
      maintenanceLaborRemaining: 1,
      mainSceneUsedToday: true,
    },
    worldThreat: { ...hub.worldThreat, progress: 10 },
  }, hospitalCurrentDayHubDependencies)
}

function createPreviewScene(): StableRunPhase {
  return {
    kind: 'scene-session',
    payload: resolveSceneLaunch(
      createPreviewHub(),
      { kind: 'launch-main-scene' },
      hospitalSceneLaunchDependencies,
    ).session,
  }
}

function createPreviewCombat(): StableRunPhase {
  const session = resolveSceneLaunch(
    createPreviewHub(),
    { kind: 'launch-main-scene' },
    hospitalSceneLaunchDependencies,
  ).session
  const runtime = hospitalSceneLaunchDependencies.content.createRuntime(
    session.context.runReturnCarryForward.continuity.runIdentity.seed,
    session.scene.sceneInstanceId,
  )
  const prepared = createSceneExplorationSnapshot({
    ...session.scene,
    enabledEdgeIds: [
      ...session.scene.enabledEdgeIds,
      HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
    ],
  }, runtime.dependencies)
  const hall = resolveSceneMoveCommand(prepared, {
    edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
  }, runtime.dependencies).snapshot
  const scene = resolveSceneMoveCommand(hall, {
    edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
  }, runtime.dependencies).snapshot
  return { kind: 'scene-session', payload: { context: session.context, scene } }
}

function createPreviewFailure(): StableRunPhase {
  const hub = createPreviewHub()
  const terminalHub = createCurrentDayHubSnapshot({
    ...hub,
    dailyState: { ...hub.dailyState, mainSceneUsedToday: true },
    playerCondition: { ...hub.playerCondition, currentHealth: 1, bleeding: true },
  }, hospitalCurrentDayHubDependencies)
  const settlement = resolveDailySettlement(
    terminalHub,
    { kind: 'end-day' },
    hospitalCurrentDayHubDependencies,
  )
  if (settlement.outcome.kind !== 'terminal') throw new Error('预览失败状态未终止')
  return {
    kind: 'run-failure',
    payload: resolveRunFailure({
      kind: 'daily-settlement-terminal',
      terminalSnapshot: settlement.outcome.snapshot,
    }, hospitalRunTerminationDependencies).snapshot,
  }
}

function phaseFor(kind: DevelopmentPreviewScenarioKind): StableRunPhase {
  if (kind === 'hub') return { kind: 'current-day-hub', payload: createPreviewHub() }
  if (kind === 'hub-returned') return { kind: 'current-day-hub', payload: createReturnedPreviewHub() }
  if (kind === 'hub-maintenance') return { kind: 'current-day-hub', payload: createMaintenancePreviewHub() }
  if (kind === 'scene') return createPreviewScene()
  if (kind === 'combat') return createPreviewCombat()
  return createPreviewFailure()
}

const labels: Readonly<Record<DevelopmentPreviewScenarioKind, string>> = Object.freeze({
  hub: '查看 Hub 示例',
  'hub-returned': '查看已返程 Hub 示例',
  'hub-maintenance': '查看 Hub 维护示例',
  scene: '查看 Scene 示例',
  combat: '查看 Combat 示例',
  failure: '查看 Failure 示例',
})

/** Every development scenario is independently strict-restored by a real Store. */
export function createHospitalDevelopmentPreviewScenario(
  kind: DevelopmentPreviewScenarioKind,
): DevelopmentPreviewScenario {
  const storage = new MemoryPreviewStorage()
  const store = createStableRunStore({
    initialPhase: phaseFor(kind),
    storage,
    rulesRegistry: hospitalRunSaveRulesRegistry,
  })
  return Object.freeze({ kind, label: labels[kind], store, storage })
}
