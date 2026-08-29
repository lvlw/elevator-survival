import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_OPTION_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  HOSPITAL_OBSTACLE_IDS,
  HOSPITAL_TASK_EVENT_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalSliceV01RuleConfig as config,
} from '../content'
import { createPlayerCondition } from '../core/condition'
import { createCurrentDayHubSnapshot } from '../core/current-day-hub'
import {
  createBackpackSnapshot,
  deriveStableSplitInstanceId,
  type ItemInstance,
} from '../core/inventory'
import { createFullItemState, getItemState } from '../core/item-state'
import { createQuickSlotSnapshot } from '../core/quick-slot'
import { createRunLoadoutSnapshot } from '../core/run-loadout'
import {
  createRunSceneSessionSnapshot,
  getRunSceneRuntime,
  resolveRunSceneSessionWithdrawal,
  resolveSceneLaunch,
} from '../core/scene-launch'
import {
  createWithdrawFromSceneCommand,
  createSceneExplorationSnapshot,
  previewSceneWithdrawalCommand,
  resolveSceneMoveCommand,
} from '../core/scene-exploration'
import { addSceneItems } from '../core/scene-items'
import { getSceneNodeItems } from '../core/scene-items'
import { createSceneItemSnapshot } from '../core/scene-search'
import {
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
  hospitalSceneLaunchDependencies,
  type RunSaveStorage,
} from '../state/run-save'
import { createStableRunStore, type StableRunStore } from '../state/run-store'
import { hospitalV01UiLabels } from './hospital-v0.1'
import { StableRunUiApp } from './stable-run-ui-app'
import { createHospitalDevelopmentPreviewScenario } from './dev-preview/hospital-preview-scenarios'
import {
  createStableRunUiInteractionModel,
  previewStableRunUiHubLoadoutDraft,
  previewStableRunUiSceneInventoryDraft,
  previewStableRunUiTaskEventDraft,
} from './interaction'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

class MemoryStorage implements RunSaveStorage {
  public writes = 0
  private value: string | null = null
  read(): string | null { return this.value }
  write(value: string): void { this.writes += 1; this.value = value }
  clear(): void { this.value = null }
}

class FailingStorage extends MemoryStorage {
  write(value: string): void {
    this.writes += 1
    void value
    throw new Error('simulated storage failure')
  }
}

const item = (instanceId: string, definitionId: string): ItemInstance => ({ instanceId, definitionId, quantity: 1 })

function createHubPhase(options: Readonly<{ combatReady?: boolean; seed?: string }> = {}) {
  const flashlight = item('react-flashlight', HOSPITAL_ITEM_IDS.flashlight)
  const ration = item('react-ration', HOSPITAL_ITEM_IDS.ration)
  const pipe = item('react-metal-pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const coat = item('react-heavy-coat', HOSPITAL_ITEM_IDS.heavyCoat)
  const owned = options.combatReady
    ? [flashlight, ration, pipe, coat]
    : [flashlight, ration]
  return {
    kind: 'current-day-hub' as const,
    payload: createCurrentDayHubSnapshot({
      continuity: { runIdentity: { runId: 'react-ui-run', seed: options.seed ?? 'react-ui-seed', rulesVersion: config.metadata.rulesVersion }, currentDay: 2, sceneInstanceId: 'returned-before-react-ui' },
      runLoadout: createRunLoadoutSnapshot({
        warehouse: { items: [ration] }, taskStorage: { items: [] },
        backpack: createBackpackSnapshot({ width: config.backpack.width, height: config.backpack.height, items: [], placements: [] }, hospitalItemCatalog),
        equipment: {
          weapon: options.combatReady ? pipe : null,
          armor: options.combatReady ? coat : null,
          utility: flashlight,
        },
        quickSlots: createQuickSlotSnapshot([null, null], config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog),
        itemStates: { states: owned.map((candidate) => createFullItemState(candidate, hospitalItemResourceCatalog)) },
      }, { physicalCatalog: hospitalItemCatalog, equipmentCatalog: hospitalItemEquipmentCatalog, quickSlotCatalog: hospitalItemQuickSlotCatalog, itemResourceCatalog: hospitalItemResourceCatalog, lifecycleCatalog: hospitalItemReturnLifecycleCatalog, backpackRules: config.backpack }),
      playerCondition: createPlayerCondition({ currentHealth: config.combat.player.maxHealth, bleeding: false, openWounds: [], minorContusions: 0, painkillerActive: false, pendingInfectionExposures: 0 }, config.combat.player),
      runIntelLog: { intelIds: [] },
      dailyState: { medicalUsage: { disinfectantUsesToday: 0 }, threatSuppression: { usesToday: 0, suppressionAmountToday: 0 }, maintenanceLaborRemaining: config.maintenance.dailyBaseLabor.points, mainSceneUsedToday: false },
      worldThreat: { definitionId: config.worldThreat.definitionId, progress: 0 }, satiety: { current: 4 }, returnLedger: { sceneInstanceIds: ['returned-before-react-ui'] },
    }, hospitalCurrentDayHubDependencies),
  }
}

function createHubLoadoutPhase(options: Readonly<{ bothQuickSlots?: boolean }> = {}) {
  const warehouseBandage = { ...item('hub-ui-warehouse-bandage', HOSPITAL_ITEM_IDS.bandage), quantity: 3 }
  const warehousePipe = item('hub-ui-warehouse-pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const backpackBandage = { ...item('hub-ui-backpack-bandage', HOSPITAL_ITEM_IDS.bandage), quantity: 2 }
  const backpackPainkiller = item('hub-ui-backpack-painkiller', HOSPITAL_ITEM_IDS.painkiller)
  const backpackPipe = item('hub-ui-backpack-pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const backpackBandageTarget = item('hub-ui-backpack-bandage-target', HOSPITAL_ITEM_IDS.bandage)
  const backpackCoat = item('hub-ui-backpack-coat', HOSPITAL_ITEM_IDS.heavyCoat)
  const backpackCoatSecond = item('hub-ui-backpack-coat-second', HOSPITAL_ITEM_IDS.heavyCoat)
  const equippedPipe = item('hub-ui-equipped-pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const quickBandage = item('hub-ui-quick-bandage', HOSPITAL_ITEM_IDS.bandage)
  const quickPainkiller = item('hub-ui-quick-painkiller', HOSPITAL_ITEM_IDS.painkiller)
  const taskItem = item('hub-ui-task-case', HOSPITAL_ITEM_IDS.sealedPathogenCase)
  const owned = [warehouseBandage, warehousePipe, backpackBandage, backpackPainkiller, backpackPipe, backpackBandageTarget, backpackCoat, backpackCoatSecond, equippedPipe, quickBandage, taskItem, ...(options.bothQuickSlots ? [quickPainkiller] : [])]
  return {
    kind: 'current-day-hub' as const,
    payload: createCurrentDayHubSnapshot({
      continuity: { runIdentity: { runId: 'hub-loadout-ui-run', seed: 'hub-loadout-ui-seed', rulesVersion: config.metadata.rulesVersion }, currentDay: 2, sceneInstanceId: 'hub-loadout-returned-scene' },
      runLoadout: createRunLoadoutSnapshot({
        warehouse: { items: [warehouseBandage, warehousePipe] }, taskStorage: { items: [taskItem] },
        backpack: createBackpackSnapshot({ width: config.backpack.width, height: config.backpack.height, items: [backpackBandage, backpackPainkiller, backpackPipe, backpackBandageTarget, backpackCoat, backpackCoatSecond], placements: [
          { instanceId: backpackBandage.instanceId, x: 0, y: 0, rotated: false },
          { instanceId: backpackPainkiller.instanceId, x: 1, y: 0, rotated: false },
          { instanceId: backpackPipe.instanceId, x: 2, y: 0, rotated: false },
          { instanceId: backpackBandageTarget.instanceId, x: 3, y: 0, rotated: false },
          { instanceId: backpackCoat.instanceId, x: 4, y: 0, rotated: false },
          { instanceId: backpackCoatSecond.instanceId, x: 3, y: 2, rotated: false },
        ] }, hospitalItemCatalog),
        equipment: { weapon: equippedPipe, armor: null, utility: null },
        quickSlots: createQuickSlotSnapshot([quickBandage, options.bothQuickSlots ? quickPainkiller : null], config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog),
        itemStates: { states: owned.map((candidate) => createFullItemState(candidate, hospitalItemResourceCatalog)) },
      }, { physicalCatalog: hospitalItemCatalog, equipmentCatalog: hospitalItemEquipmentCatalog, quickSlotCatalog: hospitalItemQuickSlotCatalog, itemResourceCatalog: hospitalItemResourceCatalog, lifecycleCatalog: hospitalItemReturnLifecycleCatalog, backpackRules: config.backpack }),
      playerCondition: createPlayerCondition({ currentHealth: config.combat.player.maxHealth, bleeding: false, openWounds: [], minorContusions: 0, painkillerActive: false, pendingInfectionExposures: 0 }, config.combat.player),
      runIntelLog: { intelIds: [] },
      dailyState: { medicalUsage: { disinfectantUsesToday: 0 }, threatSuppression: { usesToday: 0, suppressionAmountToday: 0 }, maintenanceLaborRemaining: config.maintenance.dailyBaseLabor.points, mainSceneUsedToday: false },
      worldThreat: { definitionId: config.worldThreat.definitionId, progress: 0 }, satiety: { current: 4 }, returnLedger: { sceneInstanceIds: ['hub-loadout-returned-scene'] },
    }, hospitalCurrentDayHubDependencies),
  }
}

function createHubLoadoutLaunchPhase() {
  const pipe = item('hub-launch-pipe', HOSPITAL_ITEM_IDS.metalPipe)
  const bandage = { ...item('hub-launch-bandage', HOSPITAL_ITEM_IDS.bandage), quantity: 2 }
  return {
    kind: 'current-day-hub' as const,
    payload: createCurrentDayHubSnapshot({
      continuity: { runIdentity: { runId: 'hub-launch-run', seed: 'hub-launch-seed', rulesVersion: config.metadata.rulesVersion }, currentDay: 2, sceneInstanceId: 'hub-launch-returned' },
      runLoadout: createRunLoadoutSnapshot({
        warehouse: { items: [pipe, bandage] }, taskStorage: { items: [] },
        backpack: createBackpackSnapshot({ width: config.backpack.width, height: config.backpack.height, items: [], placements: [] }, hospitalItemCatalog),
        equipment: { weapon: null, armor: null, utility: null },
        quickSlots: createQuickSlotSnapshot([null, null], config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog),
        itemStates: { states: [pipe, bandage].map((candidate) => createFullItemState(candidate, hospitalItemResourceCatalog)) },
      }, { physicalCatalog: hospitalItemCatalog, equipmentCatalog: hospitalItemEquipmentCatalog, quickSlotCatalog: hospitalItemQuickSlotCatalog, itemResourceCatalog: hospitalItemResourceCatalog, lifecycleCatalog: hospitalItemReturnLifecycleCatalog, backpackRules: config.backpack }),
      playerCondition: createPlayerCondition({ currentHealth: config.combat.player.maxHealth, bleeding: false, openWounds: [], minorContusions: 0, painkillerActive: false, pendingInfectionExposures: 0 }, config.combat.player),
      runIntelLog: { intelIds: [] }, dailyState: { medicalUsage: { disinfectantUsesToday: 0 }, threatSuppression: { usesToday: 0, suppressionAmountToday: 0 }, maintenanceLaborRemaining: config.maintenance.dailyBaseLabor.points, mainSceneUsedToday: false },
      worldThreat: { definitionId: config.worldThreat.definitionId, progress: 0 }, satiety: { current: 4 }, returnLedger: { sceneInstanceIds: ['hub-launch-returned'] },
    }, hospitalCurrentDayHubDependencies),
  }
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const result = [...container.querySelectorAll('button')]
    .find((candidate) => candidate.textContent === label)
  if (!result) throw new Error(`expected button: ${label}`)
  return result
}

function buttonContaining(container: HTMLElement, label: string): HTMLButtonElement {
  const result = [...container.querySelectorAll('button')]
    .find((candidate) => candidate.textContent?.includes(label))
  if (!result) throw new Error(`expected button containing: ${label}; found ${container.textContent}`)
  return result
}

function input(container: HTMLElement, label: string): HTMLInputElement {
  const result = container.querySelector(`input[aria-label="${label}"]`)
  if (!(result instanceof HTMLInputElement)) throw new Error(`expected input: ${label}`)
  return result
}

function setInputValue(element: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

function sceneSessionAtEmergencyHall() {
  const launched = resolveSceneLaunch(
    createHubPhase().payload,
    { kind: 'launch-main-scene' },
    hospitalSceneLaunchDependencies,
  ).session
  const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
  const scene = resolveSceneMoveCommand(launched.scene, {
    edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
  }, runtime.dependencies).snapshot
  return createRunSceneSessionSnapshot({ context: launched.context, scene }, hospitalSceneLaunchDependencies)
}

function withGroundItem(session: ReturnType<typeof sceneSessionAtEmergencyHall>, groundItem: ItemInstance) {
  const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
  const sceneItems = addSceneItems(
    session.scene.sceneItems,
    session.scene.currentNodeId,
    [createSceneItemSnapshot({
      item: groundItem,
      state: createFullItemState(groundItem, hospitalItemResourceCatalog),
    }, hospitalItemCatalog, hospitalItemResourceCatalog)],
    {
      graph: runtime.dependencies.graph,
      itemCatalog: runtime.dependencies.physicalCatalog,
      itemResourceCatalog: runtime.dependencies.itemResourceCatalog,
    },
  )
  const scene = createSceneExplorationSnapshot({ ...session.scene, sceneItems }, runtime.dependencies)
  return createRunSceneSessionSnapshot({ context: session.context, scene }, hospitalSceneLaunchDependencies)
}

function withBackpackItem(session: ReturnType<typeof sceneSessionAtEmergencyHall>, carriedItem: ItemInstance, x = 0, y = 0) {
  const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
  const backpack = createBackpackSnapshot({
    ...session.scene.backpack,
    items: [...session.scene.backpack.items, carriedItem],
    placements: [...session.scene.backpack.placements, {
      instanceId: carriedItem.instanceId,
      x,
      y,
      rotated: false,
    }],
  }, hospitalItemCatalog)
  const scene = createSceneExplorationSnapshot({
    ...session.scene,
    backpack,
    itemStates: {
      states: [...session.scene.itemStates.states, createFullItemState(
        carriedItem,
        hospitalItemResourceCatalog,
      )],
    },
  }, runtime.dependencies)
  return createRunSceneSessionSnapshot({ context: session.context, scene }, hospitalSceneLaunchDependencies)
}

function withEquippedItem(
  session: ReturnType<typeof sceneSessionAtEmergencyHall>,
  slot: 'weapon' | 'armor' | 'utility',
  equippedItem: ItemInstance,
) {
  const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
  const replaced = session.scene.equipment[slot]
  const scene = createSceneExplorationSnapshot({
    ...session.scene,
    equipment: { ...session.scene.equipment, [slot]: equippedItem },
    itemStates: {
      states: [
        ...session.scene.itemStates.states.filter(
          ({ instanceId }) => instanceId !== replaced?.instanceId,
        ),
        createFullItemState(equippedItem, hospitalItemResourceCatalog),
      ],
    },
  }, runtime.dependencies)
  return createRunSceneSessionSnapshot({ context: session.context, scene }, hospitalSceneLaunchDependencies)
}

function withRemainingTime(
  session: ReturnType<typeof sceneSessionAtEmergencyHall>,
  remainingTime: number,
) {
  const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
  const scene = createSceneExplorationSnapshot({
    ...session.scene,
    remainingTime,
  }, runtime.dependencies)
  return createRunSceneSessionSnapshot({ context: session.context, scene }, hospitalSceneLaunchDependencies)
}

function sceneMedicalPhase(options: Readonly<{
  backpack?: readonly Readonly<{
    item: ItemInstance
    x: number
    y: number
  }>[]
  quickSlots?: readonly (ItemInstance | null)[]
  currentHealth?: number
  bleeding?: boolean
  openWounds?: readonly Readonly<{
    id: string
    kind: 'laceration' | 'puncture' | 'bite'
    treatment: 'untreated' | 'treated'
  }>[]
  minorContusions?: number
  painkillerActive?: boolean
  pendingInfectionExposures?: number
  disinfectantUsesToday?: number
  remainingTime?: number
  currentNodeId?: string
}> = {}) {
  const session = sceneSessionAtEmergencyHall()
  const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
  const backpackEntries = options.backpack ?? []
  const quickSlots = options.quickSlots ?? [null, null]
  const backpack = createBackpackSnapshot({
    width: config.backpack.width,
    height: config.backpack.height,
    items: backpackEntries.map(({ item: carried }) => carried),
    placements: backpackEntries.map(({ item: carried, x, y }) => ({
      instanceId: carried.instanceId,
      x,
      y,
      rotated: false,
    })),
  }, hospitalItemCatalog)
  const quick = createQuickSlotSnapshot(
    quickSlots,
    config.backpack.quickSlotCount,
    hospitalItemCatalog,
    hospitalItemQuickSlotCatalog,
  )
  const equipmentIds = new Set(Object.values(session.scene.equipment)
    .filter((candidate): candidate is ItemInstance => candidate !== null)
    .map(({ instanceId }) => instanceId))
  const newItems = [
    ...backpack.items,
    ...quick.slots.filter((candidate): candidate is ItemInstance => candidate !== null),
  ]
  const condition = createPlayerCondition({
    currentHealth: options.currentHealth ?? config.combat.player.maxHealth,
    bleeding: options.bleeding ?? false,
    openWounds: options.openWounds ?? [],
    minorContusions: options.minorContusions ?? 0,
    painkillerActive: options.painkillerActive ?? false,
    pendingInfectionExposures: options.pendingInfectionExposures ?? 0,
  }, config.combat.player)
  const scene = createSceneExplorationSnapshot({
    ...session.scene,
    currentNodeId: options.currentNodeId ?? session.scene.currentNodeId,
    remainingTime: options.remainingTime ?? session.scene.remainingTime,
    backpack,
    quickSlots: quick,
    condition,
    dailyMedicalUsage: {
      disinfectantUsesToday: options.disinfectantUsesToday ?? 0,
    },
    itemStates: {
      states: [
        ...session.scene.itemStates.states.filter(({ instanceId }) => equipmentIds.has(instanceId)),
        ...newItems.map((carried) => createFullItemState(
          carried,
          hospitalItemResourceCatalog,
        )),
      ],
    },
  }, runtime.dependencies)
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({
      context: session.context,
      scene,
    }, hospitalSceneLaunchDependencies),
  }
}

function sceneBatteryPhase(options: Readonly<{
  batteries?: readonly Readonly<{ item: ItemInstance; x: number; y: number }>[]
  backpackFlashlight?: Readonly<{ item: ItemInstance; x: number; y: number }> | null
  extraBackpack?: readonly Readonly<{ item: ItemInstance; x: number; y: number }>[]
  charge?: number
  currentHealth?: number
  bleeding?: boolean
  remainingTime?: number
  currentNodeId?: string
}> = {}) {
  const batteries = options.batteries ?? [{
    item: item('react-scene-battery', HOSPITAL_ITEM_IDS.standardBattery),
    x: 0,
    y: 0,
  }]
  const backpackFlashlight = options.backpackFlashlight ?? null
  const phase = sceneMedicalPhase({
    backpack: [
      ...batteries,
      ...(backpackFlashlight ? [backpackFlashlight] : []),
      ...(options.extraBackpack ?? []),
    ],
    currentHealth: options.currentHealth,
    bleeding: options.bleeding,
    remainingTime: options.remainingTime,
    currentNodeId: options.currentNodeId,
  })
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const targetId = backpackFlashlight?.item.instanceId ?? phase.payload.scene.equipment.utility?.instanceId
  if (!targetId) throw new Error('expected Scene battery target')
  const scene = createSceneExplorationSnapshot({
    ...phase.payload.scene,
    itemStates: {
      states: phase.payload.scene.itemStates.states.map((state) =>
        state.definitionId === HOSPITAL_ITEM_IDS.flashlight
          ? { ...state, resource: { kind: 'charge' as const, current: options.charge ?? 0 } }
          : state),
    },
  }, runtime.dependencies)
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({ context: phase.payload.context, scene }, hospitalSceneLaunchDependencies),
  }
}

function sceneInventoryPhase(options: Readonly<{
  backpack?: readonly Readonly<{ item: ItemInstance; x: number; y: number; rotated?: boolean }>[]
  quickSlots?: readonly (ItemInstance | null)[]
  resourceCurrent?: Readonly<Record<string, number>>
  currentHealth?: number
  bleeding?: boolean
  remainingTime?: number
  currentNodeId?: string
}> = {}) {
  const base = sceneMedicalPhase({
    backpack: (options.backpack ?? []).map(({ item: carried, x, y }) => ({
      item: carried,
      x,
      y,
    })),
    quickSlots: options.quickSlots,
    currentHealth: options.currentHealth,
    bleeding: options.bleeding,
    remainingTime: options.remainingTime,
    currentNodeId: options.currentNodeId,
  })
  const runtime = getRunSceneRuntime(base.payload, hospitalSceneLaunchDependencies)
  const rotatedById = new Map((options.backpack ?? []).map(
    ({ item: carried, rotated }) => [carried.instanceId, rotated ?? false],
  ))
  const backpack = createBackpackSnapshot({
    ...base.payload.scene.backpack,
    placements: base.payload.scene.backpack.placements.map((placement) => ({
      ...placement,
      rotated: rotatedById.get(placement.instanceId) ?? placement.rotated,
    })),
  }, hospitalItemCatalog)
  const scene = createSceneExplorationSnapshot({
    ...base.payload.scene,
    backpack,
    itemStates: {
      states: base.payload.scene.itemStates.states.map((state) => {
        const current = options.resourceCurrent?.[state.instanceId]
        return current === undefined || state.resource.kind === 'none'
          ? state
          : { ...state, resource: { ...state.resource, current } }
      }),
    },
  }, runtime.dependencies)
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({
      context: base.payload.context,
      scene,
    }, hospitalSceneLaunchDependencies),
  }
}

function terminalSafeSession() {
  const launched = resolveSceneLaunch(
    createHubPhase().payload,
    { kind: 'launch-main-scene' },
    hospitalSceneLaunchDependencies,
  ).session
  return resolveRunSceneSessionWithdrawal(
    launched,
    { kind: 'withdraw-from-scene' },
    hospitalSceneLaunchDependencies,
  ).session
}

function terminalDeadSession() {
  const launched = resolveSceneLaunch(
    createHubPhase().payload,
    { kind: 'launch-main-scene' },
    hospitalSceneLaunchDependencies,
  ).session
  const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
  const scene = createSceneExplorationSnapshot({
    ...launched.scene,
    status: 'dead',
    condition: createPlayerCondition({
      ...launched.scene.condition,
      currentHealth: 0,
    }, config.combat.player),
  }, runtime.dependencies)
  return createRunSceneSessionSnapshot({ context: launched.context, scene }, hospitalSceneLaunchDependencies)
}

function trackedStore(store: StableRunStore) {
  const commands: unknown[] = []
  return {
    commands,
    store: Object.freeze({
      getState: store.getState,
      getInitialState: store.getInitialState,
      subscribe: store.subscribe,
      dispatch: (command: unknown) => {
        commands.push(command)
        return store.dispatch(command)
      },
    } satisfies StableRunStore),
  }
}

function combatPhase(options: Readonly<{
  remainingTime?: number
  currentHealth?: number
  weaponDurability?: number
  armorIntegrity?: number | null
  backpackBandage?: boolean
  backpackSparePipe?: boolean
  quickPainkiller?: boolean
  alerted?: boolean
  healthy?: boolean
  bleeding?: boolean
  openWounds?: readonly Readonly<{
    id: string
    kind: 'laceration' | 'puncture' | 'bite'
    treatment: 'untreated' | 'treated'
  }>[]
  enemyNextActionCtb?: number
  enemyHealth?: number
}> = {}) {
  const scenario = createHospitalDevelopmentPreviewScenario('combat')
  const phase = scenario.store.getState().phase
  if (phase.kind !== 'scene-session') throw new Error('expected combat Scene')
  const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
  const active = phase.payload.scene.combatState.encounters.find(({ kind }) => kind === 'active')
  if (active?.kind !== 'active') throw new Error('expected active combat')
  const extras = [
    ...(options.backpackBandage ? [item('react-combat-backpack-bandage', HOSPITAL_ITEM_IDS.bandage)] : []),
    ...(options.backpackSparePipe ? [item('react-combat-backpack-pipe', HOSPITAL_ITEM_IDS.metalPipe)] : []),
  ]
  const backpack = extras.length === 0
    ? phase.payload.scene.backpack
    : createBackpackSnapshot({
        width: config.backpack.width,
        height: config.backpack.height,
        items: extras,
        placements: extras.map(({ instanceId }, index) => ({
          instanceId,
          x: index * 2,
          y: 0,
          rotated: false,
        })),
      }, hospitalItemCatalog)
  const weaponId = phase.payload.scene.equipment.weapon?.instanceId
  const armorId = phase.payload.scene.equipment.armor?.instanceId
  const painkiller = item('react-combat-painkiller', HOSPITAL_ITEM_IDS.painkiller)
  const previousQuick = phase.payload.scene.quickSlots.slots[0]
  const quickSlots = options.quickPainkiller
    ? createQuickSlotSnapshot(
        [painkiller, null],
        config.backpack.quickSlotCount,
        hospitalItemCatalog,
        hospitalItemQuickSlotCatalog,
      )
    : phase.payload.scene.quickSlots
  const states = phase.payload.scene.itemStates.states
    .filter((state) => options.armorIntegrity !== null || state.instanceId !== armorId)
    .filter((state) => !options.quickPainkiller || state.instanceId !== previousQuick?.instanceId)
    .map((state) =>
      state.instanceId === weaponId && options.weaponDurability !== undefined
        ? { ...state, resource: { kind: 'durability' as const, current: options.weaponDurability } }
        : state.instanceId === armorId && typeof options.armorIntegrity === 'number'
          ? { ...state, resource: { kind: 'integrity' as const, current: options.armorIntegrity } }
          : state)
  states.push(...extras.map((candidate) => createFullItemState(candidate, hospitalItemResourceCatalog)))
  if (options.quickPainkiller) {
    states.push(createFullItemState(painkiller, hospitalItemResourceCatalog))
  }
  const condition = options.healthy || options.bleeding !== undefined || options.openWounds
    ? createPlayerCondition({
        currentHealth: options.currentHealth ?? config.combat.player.maxHealth,
        bleeding: options.bleeding ?? false,
        openWounds: options.openWounds ?? [],
        minorContusions: 0,
        painkillerActive: false,
        pendingInfectionExposures: 0,
      }, config.combat.player)
    : options.currentHealth === undefined
    ? phase.payload.scene.condition
    : createPlayerCondition({
        ...phase.payload.scene.condition,
        currentHealth: options.currentHealth,
      }, config.combat.player)
  const equipment = options.armorIntegrity === null
    ? { ...phase.payload.scene.equipment, armor: null }
    : phase.payload.scene.equipment
  const combat = {
    ...active.combat,
    enemy: options.enemyHealth === undefined
      ? active.combat.enemy
      : {
          ...active.combat.enemy,
          currentHealth: options.enemyHealth,
          defeated: false,
        },
    enemyNextActionCtb: options.enemyNextActionCtb ??
      (options.alerted ? 50 : active.combat.enemyNextActionCtb),
    playerCondition: condition,
    backpack,
    equipment,
    quickSlots,
    itemStates: { states },
  }
  const scene = createSceneExplorationSnapshot({
    ...phase.payload.scene,
    alertState: options.alerted ? 'alerted' : phase.payload.scene.alertState,
    remainingTime: options.remainingTime ?? phase.payload.scene.remainingTime,
    condition,
    backpack,
    equipment,
    quickSlots,
    itemStates: { states },
    combatState: {
      ...phase.payload.scene.combatState,
      encounters: phase.payload.scene.combatState.encounters.map((encounter) =>
        encounter.kind === 'active' ? { ...encounter, combat } : encounter),
    },
  }, runtime.dependencies)
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({
      context: phase.payload.context,
      scene,
    }, hospitalSceneLaunchDependencies),
  }
}

function taskEventPhase(options: Readonly<{
  seed?: string
  remainingTime?: number
  currentHealth?: number
  bleeding?: boolean
  coatIntegrity?: number | null
  materialWeight?: number
}> = {}) {
  const launched = resolveSceneLaunch(
    createHubPhase({ combatReady: true, seed: options.seed }).payload,
    { kind: 'launch-main-scene' },
    hospitalSceneLaunchDependencies,
  ).session
  const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
  const encounter = launched.scene.combatState.encounters[0]
  if (!encounter || encounter.kind !== 'dormant') throw new Error('expected dormant orderly encounter')
  const coat = options.coatIntegrity === null ? null : launched.scene.equipment.armor
  const materialItems: ItemInstance[] = []
  let remainingWeight = options.materialWeight ?? 0
  while (remainingWeight > 0) {
    const quantity = Math.min(remainingWeight, 5)
    materialItems.push({
      instanceId: `react-task-material-${materialItems.length}`,
      definitionId: HOSPITAL_ITEM_IDS.metalParts,
      quantity,
    })
    remainingWeight -= quantity
  }
  const backpack = createBackpackSnapshot({
    width: config.backpack.width,
    height: config.backpack.height,
    items: materialItems,
    placements: materialItems.map(({ instanceId }, index) => ({
      instanceId,
      x: index,
      y: 0,
      rotated: false,
    })),
  }, hospitalItemCatalog)
  const retainedIds = new Set([
    ...Object.values({ ...launched.scene.equipment, armor: coat })
      .filter((candidate): candidate is ItemInstance => candidate !== null)
      .map(({ instanceId }) => instanceId),
    ...launched.scene.quickSlots.slots
      .filter((candidate): candidate is ItemInstance => candidate !== null)
      .map(({ instanceId }) => instanceId),
  ])
  const itemStates = [
    ...launched.scene.itemStates.states
      .filter(({ instanceId }) => retainedIds.has(instanceId))
      .map((state) => state.instanceId === coat?.instanceId && options.coatIntegrity !== undefined
        ? { ...state, resource: { kind: 'integrity' as const, current: options.coatIntegrity ?? 0 } }
        : state),
    ...materialItems.map((candidate) => createFullItemState(candidate, hospitalItemResourceCatalog)),
  ]
  const condition = createPlayerCondition({
    ...launched.scene.condition,
    currentHealth: options.currentHealth ?? launched.scene.condition.currentHealth,
    bleeding: options.bleeding ?? launched.scene.condition.bleeding,
  }, config.combat.player)
  const scene = createSceneExplorationSnapshot({
    ...launched.scene,
    status: 'active',
    currentNodeId: HOSPITAL_NODE_IDS.specimenColdRoom,
    enabledEdgeIds: HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
    remainingTime: options.remainingTime ?? launched.scene.remainingTime,
    condition,
    backpack,
    equipment: { ...launched.scene.equipment, armor: coat },
    itemStates: { states: itemStates },
    combatState: {
      ...launched.scene.combatState,
      encounters: [{
        ...encounter,
        enemy: {
          ...encounter.enemy,
          currentHealth: 0,
          defeated: true,
          hasBeenEncountered: true,
        },
      }],
    },
  }, runtime.dependencies)
  return {
    kind: 'scene-session' as const,
    payload: createRunSceneSessionSnapshot({
      context: launched.context,
      scene,
    }, hospitalSceneLaunchDependencies),
  }
}

const uiDependencies = {
  rulesRegistry: hospitalRunSaveRulesRegistry,
  labels: hospitalV01UiLabels,
}

const roots: ReturnType<typeof createRoot>[] = []
afterEach(() => {
  act(() => { while (roots.length > 0) roots.pop()!.unmount() })
})

describe('StableRunUiApp', () => {
  it('rerenders real React output when the real Store phase changes', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: createHubPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    expect(container.textContent).toContain('电梯中枢')
    act(() => { store.dispatch({ kind: 'lifecycle', command: { kind: 'launch-main-scene' } }) })
    expect(container.textContent).toContain('场景导航')
    expect(storage.writes).toBe(1)
  })

  it('does not dispatch, save, randomize, or mutate the Store during StrictMode mount', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: createHubPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const before = store.getState()
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StrictMode><StableRunUiApp store={store} presentationDependencies={uiDependencies} /></StrictMode>) })
    expect(store.getState()).toBe(before)
    expect(storage.writes).toBe(0)
    expect(container.textContent).toContain('电梯中枢')
  })

  it('does not dispatch or save while StrictMode renders Scene Move and Search availability', () => {
    const session = resolveSceneLaunch(
      createHubPhase().payload,
      { kind: 'launch-main-scene' },
      hospitalSceneLaunchDependencies,
    ).session
    const runtime = getRunSceneRuntime(session, hospitalSceneLaunchDependencies)
    const moved = resolveSceneMoveCommand(session.scene, {
      edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
    }, runtime.dependencies).snapshot
    const phase = createRunSceneSessionSnapshot({ context: session.context, scene: moved }, hospitalSceneLaunchDependencies)
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: { kind: 'scene-session', payload: phase }, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const before = store.getState()
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StrictMode><StableRunUiApp store={store} presentationDependencies={uiDependencies} /></StrictMode>) })
    expect(store.getState()).toBe(before)
    expect(storage.writes).toBe(0)
    expect(container.textContent).toContain('前往 药房')
    expect(container.textContent).toContain('主要搜索 · 使用手电筒')
  })

  it('keeps unresolved fire-door rendering and Preview opening side-effect free in StrictMode', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: sceneSessionAtEmergencyHall() },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    const before = inner.getState()
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StrictMode><StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} /></StrictMode>) })
    expect(container.textContent).toContain('当前明显障碍')
    expect(container.textContent).toContain('隔离区防火门')
    expect(container.textContent).toContain('隔离区防火门 · 强行撞门')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(inner.getState()).toBe(before)
    act(() => { button(container, '隔离区防火门 · 强行撞门').click() })
    expect(container.textContent).toContain('若未产生轻度挫伤')
    expect(container.textContent).toContain('若产生轻度挫伤')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(inner.getState()).toBe(before)
  })

  it('renders every formal multi-cell backpack footprint and lets a pickup draft select a non-anchor cell', () => {
    const fireAxe = item('ui-grid-fire-axe', HOSPITAL_ITEM_IDS.fireAxe)
    const ground = item('ui-grid-metal-parts', HOSPITAL_ITEM_IDS.metalParts)
    const session = withGroundItem(
      withBackpackItem(sceneSessionAtEmergencyHall(), fireAxe, 0, 0),
      ground,
    )
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    expect(container.querySelectorAll('[data-occupied="true"]')).toHaveLength(6)
    expect(container.querySelectorAll('[data-occupied="false"]')).not.toHaveLength(0)
    expect(container.textContent).toContain('消防斧 · 占用')

    act(() => { button(container, '拾取 金属零件').click() })
    const dialog = container.querySelector('[role="dialog"]')
    if (!(dialog instanceof HTMLElement)) throw new Error('expected pickup dialog')
    const occupiedCells = dialog.querySelectorAll<HTMLButtonElement>('button[data-occupied="true"]')
    act(() => { occupiedCells[3]!.click() })
    expect(container.textContent).toContain('目标格：2, 2')
    expect(button(container, '确认拾取').disabled).toBe(true)
    expect(storage.writes).toBe(0)
  })

  it('wires Hub launch, Scene move, and flashlight main search through exactly one Store dispatch each', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: createHubPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })

    act(() => { button(container, '进入 封锁医院·急诊楼一层').click() })
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
    expect(container.textContent).toContain('今日主要场景')
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
    act(() => { button(container, '取消').click() })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)

    act(() => { button(container, '进入 封锁医院·急诊楼一层').click() })
    act(() => { button(container, '确认执行').click() })
    expect(store.getState().phase.kind).toBe('scene-session')
    expect(container.textContent).toContain('电梯前室')
    expect(storage.writes).toBe(1)

    act(() => { button(container, '前往 急诊大厅').click() })
    expect(container.textContent).toContain('本次移动耗时')
    expect(storage.writes).toBe(1)
    act(() => { button(container, '确认执行').click() })
    expect(container.textContent).toContain('急诊大厅')
    expect(storage.writes).toBe(2)

    act(() => { button(container, '主要搜索 · 使用手电筒').click() })
    expect(container.textContent).toContain('照明资源')
    expect(container.textContent).not.toContain('金属零件')
    expect(storage.writes).toBe(2)
    act(() => { button(container, '确认执行').click() })

    expect(storage.writes).toBe(3)
    expect(notifications).toBe(3)
    expect(container.textContent).toContain('金属零件')
    const phase = store.getState().phase
    expect(phase.kind).toBe('scene-session')
    if (phase.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(phase.payload.scene.currentNodeId).toBe(HOSPITAL_NODE_IDS.emergencyHall)
    expect(phase.payload.scene.searchState.nodeStates.find((entry) => entry.nodeId === HOSPITAL_NODE_IDS.emergencyHall)?.kind).toBe('searched')
    expect(phase.payload.scene.equipment.utility?.definitionId).toBe(HOSPITAL_ITEM_IDS.flashlight)
    expect(phase.payload.scene.itemStates.states.find((state) => state.instanceId === phase.payload.scene.equipment.utility?.instanceId)?.resource).toMatchObject({ kind: 'charge', current: 2 })
    expect(phase.payload.scene.backpack.items).toHaveLength(0)
  })

  it('completes the explicit Hub → fire door → orderly victory → cold-room extraction UI chain', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: createHubPhase({ combatReady: true }), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    for (const label of ['进入 封锁医院·急诊楼一层', '前往 急诊大厅']) {
      act(() => { button(container, label).click() })
      act(() => { button(container, '确认执行').click() })
    }
    expect(container.textContent).toContain('隔离区防火门')
    expect(container.textContent).not.toContain('前往 隔离走廊')

    act(() => { button(container, '隔离区防火门 · 强行撞门').click() })
    const forcePreview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(forcePreview).toContain('轻度挫伤风险低')
    expect(forcePreview).toContain('若未产生轻度挫伤')
    expect(forcePreview).toContain('若产生轻度挫伤')
    for (const hidden of ['riskPercent', 'riskTrace', 'roll', 'streamId', 'drawIndex', 'causedMinorContusion']) {
      expect(container.innerHTML).not.toContain(hidden)
    }
    act(() => { button(container, '确认执行').click() })
    expect(container.textContent).not.toContain('隔离区防火门 · 强行撞门')
    expect(container.textContent).toContain('前往 隔离走廊')

    act(() => { button(container, '前往 隔离走廊').click() })
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(4)
    expect(storage.writes).toBe(4)
    const phase = inner.getState().phase
    expect(phase.kind).toBe('scene-session')
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(phase.payload.scene.status).toBe('combat')
    const active = phase.payload.scene.combatState.encounters.find(({ kind }) => kind === 'active')
    expect(active?.kind === 'active' && active.combat.enemyNextActionCtb).toBe(50)
    expect(container.textContent).toContain('感染护工')
    expect(container.textContent).toContain('抓挠')
    expect(container.textContent).toContain('敌人下次行动 CTB 50')
    expect(container.textContent).toContain('类别基础攻击')
    expect(container.textContent).toContain('相对速度普通')
    expect(container.textContent).toContain('主要危险中等直接伤害')
    expect(container.textContent).toContain('挥击')
    expect(container.textContent).toContain('蓄力击打')
    expect(container.textContent).not.toContain('背包网格')
    expect(container.textContent).not.toContain('场景终局状态')

    for (const label of ['挥击', '蓄力击打', '挥击']) {
      act(() => { button(container, label).click() })
      const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
      expect(preview).toContain('行动 CTB')
      expect(preview).toContain('请求伤害')
      for (const hidden of ['riskPercent', 'roll', 'streamId', 'drawIndex', 'succeeded', 'enemyInstanceId', 'sceneInstanceId', 'nextCycleIndex', 'resolvedActionCount']) {
        expect(container.innerHTML).not.toContain(hidden)
      }
      act(() => { button(container, '确认执行').click() })
      expect(container.textContent).toContain('战斗行动结果')
      act(() => { button(container, '关闭结果').click() })
    }
    expect(tracked.commands).toHaveLength(7)
    expect(storage.writes).toBe(7)
    expect(notifications).toBe(7)
    const victory = inner.getState().phase
    if (victory.kind !== 'scene-session') throw new Error('expected Scene after victory')
    expect(victory.payload.scene.status).toBe('active')
    expect(container.textContent).not.toContain('战斗行动结果')
    expect(container.textContent).not.toContain('感染护工')
    expect(container.textContent).toContain('前往 标本冷藏室')
    expect(container.textContent).not.toContain('提取样本箱')

    act(() => { button(container, '前往 标本冷藏室').click() })
    act(() => { button(container, '确认执行').click() })
    expect(container.textContent).toContain('谨慎检查并提取')
    expect(container.textContent).toContain('直接取出')
    expect(container.textContent).toContain('放弃提取')
    act(() => { button(container, '谨慎检查并提取').click() })
    act(() => { button(container, '格子 1,1').click() })
    expect(container.textContent).toContain('样本箱尺寸2×2')
    expect(container.textContent).toContain('污染风险无')
    expect(tracked.commands).toHaveLength(8)
    expect(storage.writes).toBe(8)
    act(() => { button(container, '确认提取').click() })
    expect(tracked.commands).toHaveLength(9)
    expect(storage.writes).toBe(9)
    expect(notifications).toBe(9)
    const extracted = inner.getState().phase
    if (extracted.kind !== 'scene-session') throw new Error('expected extracted Scene')
    expect(extracted.payload.scene.status).toBe('active')
    expect(extracted.payload.scene.currentNodeId).toBe(HOSPITAL_NODE_IDS.specimenColdRoom)
    expect(extracted.payload.scene.backpack.items).toContainEqual(expect.objectContaining({
      definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
      quantity: 1,
    }))
    expect(extracted.payload.context.runReturnCarryForward.storedInventory.taskStorage.items).toEqual([])
    expect(container.textContent).not.toContain('电梯中枢')
  })

  it('uses a real backpack access card without consuming it or setting alert', () => {
    const card = item('ui-fire-door-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard)
    const session = withBackpackItem(sceneSessionAtEmergencyHall(), card)
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '隔离区防火门 · 使用门禁卡').click() })
    expect(container.textContent).toContain('行动耗时10')
    expect(container.textContent).toContain('是否触发警觉否')
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(1)
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(phase.payload.scene.backpack.items).toContainEqual(card)
    expect(phase.payload.scene.equipment.weapon?.instanceId).not.toBe(card.instanceId)
    expect(phase.payload.scene.quickSlots.slots).not.toContainEqual(card)
    expect(phase.payload.scene.alertState).toBe('unalerted')
    expect(phase.payload.scene.enabledEdgeIds).toContain(HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor)

    act(() => { button(container, '前往 隔离走廊').click() })
    act(() => { button(container, '确认执行').click() })
    const combatPhase = store.getState().phase
    if (combatPhase.kind !== 'scene-session') throw new Error('expected combat Scene')
    const active = combatPhase.payload.scene.combatState.encounters.find(({ kind }) => kind === 'active')
    expect(active?.kind === 'active' && active.combat.enemyNextActionCtb).toBe(70)
  })

  it('keeps toolkit output on the current ground until a separate explicit Pickup', () => {
    const toolkit = item('ui-fire-door-toolkit', HOSPITAL_ITEM_IDS.toolkit)
    const session = withEquippedItem(sceneSessionAtEmergencyHall(), 'utility', toolkit)
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '隔离区防火门 · 使用工具箱').click() })
    expect(container.textContent).toContain('工具箱2 → 1')
    expect(container.textContent).toContain('节点地面产物电子元件 ×1')
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(1)
    let phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(phase.payload.scene.backpack.items.some(({ definitionId }) => definitionId === HOSPITAL_ITEM_IDS.electronicComponents)).toBe(false)
    expect(phase.payload.scene.quickSlots.slots.some((candidate) => candidate?.definitionId === HOSPITAL_ITEM_IDS.electronicComponents)).toBe(false)
    expect(container.textContent).toContain('拾取 电子元件')
    expect(getItemState(phase.payload.scene.itemStates, toolkit.instanceId).resource).toEqual({ kind: 'durability', current: 1 })
    act(() => { button(container, '拾取 电子元件').click() })
    act(() => { button(container, '确认拾取').click() })
    expect(storage.writes).toBe(2)
    phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(phase.payload.scene.backpack.items.some(({ definitionId }) => definitionId === HOSPITAL_ITEM_IDS.electronicComponents)).toBe(true)
  })

  it.each([
    ['utility' as const, HOSPITAL_ITEM_IDS.crowbar, '使用撬棍', 2, 'unalerted' as const],
    ['weapon' as const, HOSPITAL_ITEM_IDS.fireAxe, '使用消防斧', 1, 'alerted' as const],
  ])('commits the equipped %s fire-door route with formal resource and alert results', (
    slot,
    definitionId,
    optionName,
    resourceAfter,
    alertState,
  ) => {
    const equipped = item(`ui-fire-door-${slot}`, definitionId)
    const session = withEquippedItem(sceneSessionAtEmergencyHall(), slot, equipped)
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, `隔离区防火门 · ${optionName}`).click() })
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(1)
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(phase.payload.scene.alertState).toBe(alertState)
    expect(phase.payload.scene.enabledEdgeIds).toContain(HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor)
    expect(getItemState(phase.payload.scene.itemStates, equipped.instanceId).resource).toMatchObject({
      kind: 'durability',
      current: resourceAfter,
    })
  })

  it('executes formal decline as one persisted command while Cancel remains presentation-only', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: sceneSessionAtEmergencyHall() },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    const before = inner.getState().phase
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '隔离区防火门 · 放弃处理').click() })
    act(() => { button(container, '取消').click() })
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    act(() => { button(container, '隔离区防火门 · 放弃处理').click() })
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    const phase = inner.getState().phase
    if (phase.kind !== 'scene-session' || before.kind !== 'scene-session') throw new Error('expected Scene')
    expect(phase.payload.scene.remainingTime).toBe(before.payload.scene.remainingTime)
    expect(phase.payload.scene.enabledEdgeIds).not.toContain(HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor)
    expect(phase.payload.scene.alertState).toBe('unalerted')
    expect(container.textContent).toContain('隔离区防火门 · 放弃处理')
  })

  it('keeps the committed Scene after a launch save failure without retrying or rolling back', () => {
    const storage = new FailingStorage()
    const store = createStableRunStore({ initialPhase: createHubPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '进入 封锁医院·急诊楼一层').click() })
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(1)
    expect(store.getState().phase.kind).toBe('scene-session')
    expect(container.textContent).toContain('场景导航')
    expect(container.textContent).toContain('保存失败')
  })

  it('stops a near-zero movement in a terminal Scene session without automatic lifecycle settlement', () => {
    const launched = resolveSceneLaunch(
      createHubPhase().payload,
      { kind: 'launch-main-scene' },
      hospitalSceneLaunchDependencies,
    ).session
    const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
    const nearZeroScene = createSceneExplorationSnapshot({
      ...launched.scene,
      remainingTime: 5,
    }, runtime.dependencies)
    const session = createRunSceneSessionSnapshot({
      context: launched.context,
      scene: nearZeroScene,
    }, hospitalSceneLaunchDependencies)
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '前往 急诊大厅').click() })
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(1)
    expect(store.getState().phase.kind).toBe('scene-session')
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected terminal Scene session')
    expect(phase.payload.scene.status).toBe('forced-returned')
    expect(container.textContent).toContain('场景终局状态')
    expect(container.textContent).not.toContain('电梯中枢')
  })

  it('shows formal return risk and full over-time Search preview facts without automatic settlement', () => {
    const launched = resolveSceneLaunch(
      createHubPhase().payload,
      { kind: 'launch-main-scene' },
      hospitalSceneLaunchDependencies,
    ).session
    const runtime = getRunSceneRuntime(launched, hospitalSceneLaunchDependencies)
    const hall = resolveSceneMoveCommand(launched.scene, {
      edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
    }, runtime.dependencies).snapshot
    const nearZeroScene = createSceneExplorationSnapshot({
      ...hall,
      remainingTime: 5,
    }, runtime.dependencies)
    const session = createRunSceneSessionSnapshot({
      context: launched.context,
      scene: nearZeroScene,
    }, hospitalSceneLaunchDependencies)
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })

    expect(container.textContent).toContain('剩余时间：5')
    expect(container.textContent).toContain('预计返程：')
    expect(container.textContent).toContain('返程后预计剩余：0')
    expect(container.textContent).toContain('当前返程将进入强制返程。')

    act(() => { button(container, '主要搜索 · 使用手电筒').click() })
    for (const fact of ['超时债务', '有效紧急撤离时间', '强制返程基础损耗', '强制返程流血追加', '强制返程总损耗', '行动后生命', '死亡风险']) {
      expect(container.textContent).toContain(fact)
    }
    expect(container.textContent).not.toContain('金属零件')
    expect(storage.writes).toBe(0)

    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(1)
    const phase = store.getState().phase
    expect(phase.kind).toBe('scene-session')
    if (phase.kind !== 'scene-session') throw new Error('expected terminal Scene session')
    expect(phase.payload.scene.status).toBe('forced-returned')
    expect(container.textContent).not.toContain('电梯中枢')
  })

  it('completes the explicit Hub → Search → Pickup → Withdraw → Settle return chain without auto-pickup or auto-settlement', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: createHubPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })

    act(() => { button(container, '进入 封锁医院·急诊楼一层').click() })
    act(() => { button(container, '确认执行').click() })
    act(() => { button(container, '前往 急诊大厅').click() })
    act(() => { button(container, '确认执行').click() })
    act(() => { button(container, '主要搜索 · 使用手电筒').click() })
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(3)
    expect(container.textContent).toContain('金属零件')
    let phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected searched Scene')
    const ground = phase.payload.scene.sceneItems.nodeStates.find((entry) => entry.nodeId === HOSPITAL_NODE_IDS.emergencyHall)?.items.find((item) => item.item.definitionId === HOSPITAL_ITEM_IDS.metalParts)
    if (!ground) throw new Error('expected revealed ground item')
    const sourceInstanceId = ground.item.instanceId
    const timeBeforePickup = phase.payload.scene.remainingTime

    act(() => { button(container, '拾取 金属零件').click() })
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('背包负重')
    expect(storage.writes).toBe(3)
    act(() => { button(container, '确认拾取').click() })
    expect(storage.writes).toBe(4)
    phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected pickup Scene')
    expect(phase.payload.scene.remainingTime).toBe(timeBeforePickup)
    expect(phase.payload.scene.backpack.items).toContainEqual(expect.objectContaining({ instanceId: sourceInstanceId, definitionId: HOSPITAL_ITEM_IDS.metalParts }))
    const remainingGround = phase.payload.scene.sceneItems.nodeStates.find(
      (entry) => entry.nodeId === HOSPITAL_NODE_IDS.emergencyHall,
    )?.items ?? []
    expect(remainingGround.some(({ item }) => item.instanceId === sourceInstanceId)).toBe(false)

    act(() => { button(container, '主动撤离').click() })
    expect(container.textContent).toContain('返程路线')
    expect(container.textContent).toContain('预计返程时间')
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(5)
    phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected terminal Scene')
    expect(phase.payload.scene.status).toBe('safe-returned')
    expect(container.textContent).not.toContain('电梯中枢')

    act(() => { button(container, '完成返程结算').click() })
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(6)
    expect(notifications).toBe(6)
    phase = store.getState().phase
    expect(phase.kind).toBe('current-day-hub')
    if (phase.kind !== 'current-day-hub') throw new Error('expected returned Hub')
    expect(phase.payload.continuity.currentDay).toBe(2)
    expect(phase.payload.dailyState.mainSceneUsedToday).toBe(true)
    expect(phase.payload.runLoadout.warehouse.items).toContainEqual(expect.objectContaining({ instanceId: sourceInstanceId, definitionId: HOSPITAL_ITEM_IDS.metalParts }))
    expect(container.textContent).toContain('返回摘要')
    expect(container.textContent).toContain('金属零件 ×1')
    act(() => { button(container, '关闭摘要').click() })
    expect(store.getState().phase).toBe(phase)
    expect(storage.writes).toBe(6)
    expect(notifications).toBe(6)
  })

  it('routes an explicit partial ground-stack pickup without allowing the UI to create the split identity', () => {
    const source: ItemInstance = {
      instanceId: 'ui-partial-ration-source',
      definitionId: HOSPITAL_ITEM_IDS.ration,
      quantity: 2,
    }
    const session = withGroundItem(sceneSessionAtEmergencyHall(), source)
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    act(() => { button(container, '拾取 压缩口粮').click() })
    act(() => { setInputValue(input(container, '本次拾取数量'), '1') })
    expect(container.textContent).toContain('地面剩余数量')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)

    act(() => { button(container, '确认拾取').click() })
    expect(tracked.commands).toEqual([{
      kind: 'scene',
      command: {
        kind: 'scene-node-item-pickup',
        command: {
          nodeItemInstanceId: source.instanceId,
          quantity: 1,
          placement: { x: 0, y: 0, rotated: false },
        },
      },
    }])
    expect(JSON.stringify(tracked.commands)).not.toContain('splitInstanceId')
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const phase = inner.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected pickup Scene')
    const expectedSplitId = deriveStableSplitInstanceId({
      scope: `scene-node-pickup-split:${phase.payload.scene.sceneInstanceId}`,
      sourceInstanceId: source.instanceId,
      sourceQuantityBeforeSplit: 2,
      quantity: 1,
    })
    expect(phase.payload.scene.backpack.items).toContainEqual({
      instanceId: expectedSplitId,
      definitionId: source.definitionId,
      quantity: 1,
    })
    expect(phase.payload.scene.sceneItems.nodeStates.find(
      ({ nodeId }) => nodeId === phase.payload.scene.currentNodeId,
    )?.items).toContainEqual(expect.objectContaining({
      item: { instanceId: source.instanceId, definitionId: source.definitionId, quantity: 1 },
    }))
  })

  it('preserves a resource-bearing ground item identity and resource state through full UI pickup', () => {
    const source = item('ui-ground-fire-axe', HOSPITAL_ITEM_IDS.fireAxe)
    const session = withGroundItem(sceneSessionAtEmergencyHall(), source)
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const before = session.scene.sceneItems.nodeStates.flatMap(({ items }) => items).find(
      ({ item: candidate }) => candidate.instanceId === source.instanceId,
    )
    if (!before || before.state.resource.kind === 'none') throw new Error('expected resource-bearing source')
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '拾取 消防斧').click() })
    act(() => { button(container, '确认拾取').click() })

    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected pickup Scene')
    expect(phase.payload.scene.backpack.items).toContainEqual(source)
    const after = getItemState(phase.payload.scene.itemStates, source.instanceId)
    expect(after.definitionId).toBe(source.definitionId)
    expect(after.resource).toEqual(before.state.resource)
  })

  it('keeps invalid Pickup drafts presentation-only and never searches for a replacement placement', () => {
    const carried = item('ui-overlap-ration', HOSPITAL_ITEM_IDS.ration)
    const source = item('ui-overlap-fire-axe', HOSPITAL_ITEM_IDS.fireAxe)
    const session = withGroundItem(
      withBackpackItem(sceneSessionAtEmergencyHall(), carried),
      source,
    )
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const before = store.getState()
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '拾取 消防斧').click() })

    act(() => { setInputValue(input(container, '本次拾取数量'), '0') })
    expect(container.textContent).toContain('拾取参数无效')
    expect(button(container, '确认拾取').disabled).toBe(true)
    act(() => { setInputValue(input(container, '本次拾取数量'), '1') })
    act(() => { button(container, '压缩口粮 ×1').click() })
    expect(container.textContent).toContain('目标格：1, 1')
    expect(container.textContent).toContain('该数量或摆放无法执行')
    expect(input(container, '本次拾取数量').value).toBe('1')
    expect(input(container, '旋转物品').checked).toBe(false)
    expect(button(container, '确认拾取').disabled).toBe(true)
    expect(store.getState()).toBe(before)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
  })

  it('keeps Pickup dialog edits and cancellation free of gameplay side effects', () => {
    const source = item('ui-presentation-fire-axe', HOSPITAL_ITEM_IDS.fireAxe)
    const session = withGroundItem(sceneSessionAtEmergencyHall(), source)
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const before = store.getState()
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '拾取 消防斧').click() })
    act(() => { setInputValue(input(container, '本次拾取数量'), '1') })
    act(() => { input(container, '旋转物品').click() })
    act(() => { button(container, '格子 2,1').click() })
    act(() => { button(container, '取消').click() })
    expect(container.querySelector('[aria-labelledby="pickup-title"]')).toBeNull()
    expect(store.getState()).toBe(before)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
  })

  it('closes a stale Pickup dialog after an external formal Scene mutation without submitting its old command', () => {
    const source = item('ui-stale-pickup-fire-axe', HOSPITAL_ITEM_IDS.fireAxe)
    const session = withGroundItem(sceneSessionAtEmergencyHall(), source)
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '拾取 消防斧').click() })
    expect(container.querySelector('[aria-labelledby="pickup-title"]')).not.toBeNull()
    act(() => {
      store.dispatch({ kind: 'scene', command: { kind: 'scene-withdraw', command: { kind: 'withdraw-from-scene' } } })
    })
    expect(storage.writes).toBe(1)
    expect(container.querySelector('[aria-labelledby="pickup-title"]')).toBeNull()
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0)
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected terminal Scene')
    expect(phase.payload.scene.status).toBe('safe-returned')
  })

  it('closes a stale Withdrawal preview after an external formal withdrawal without replaying it', () => {
    const session = sceneSessionAtEmergencyHall()
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '主动撤离').click() })
    expect(container.querySelector('[aria-labelledby="action-preview-title"]')).not.toBeNull()
    act(() => {
      store.dispatch({ kind: 'scene', command: { kind: 'scene-withdraw', command: { kind: 'withdraw-from-scene' } } })
    })
    expect(storage.writes).toBe(1)
    expect(container.querySelector('[aria-labelledby="action-preview-title"]')).toBeNull()
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected terminal Scene')
    expect(phase.payload.scene.status).toBe('safe-returned')
  })

  it('closes a stale fire-door Preview after an external formal obstacle command resolves it', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: sceneSessionAtEmergencyHall() },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '隔离区防火门 · 强行撞门').click() })
    expect(container.querySelector('[aria-labelledby="action-preview-title"]')).not.toBeNull()
    act(() => {
      store.dispatch({
        kind: 'scene',
        command: {
          kind: 'scene-obstacle',
          command: {
            obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor,
            optionId: HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry,
          },
        },
      })
    })
    expect(storage.writes).toBe(1)
    expect(container.querySelector('[aria-labelledby="action-preview-title"]')).toBeNull()
    expect(container.textContent).not.toContain('隔离区防火门 · 强行撞门')
    expect(container.textContent).toContain('前往 隔离走廊')
  })

  it('keeps the committed obstacle Scene after one failed save without retry, rollback, or reload', () => {
    const storage = new FailingStorage()
    const inner = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: sceneSessionAtEmergencyHall() },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '隔离区防火门 · 强行撞门').click() })
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    const phase = inner.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(phase.payload.scene.enabledEdgeIds).toContain(HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor)
    expect(phase.payload.scene.alertState).toBe('alerted')
    expect(container.textContent).toContain('保存失败')
    expect(container.textContent).toContain('前往 隔离走廊')
  })

  it('previews and commits a near-zero card option as one terminal Scene without auto-settlement', () => {
    const card = item('ui-near-zero-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard)
    const session = withRemainingTime(
      withBackpackItem(sceneSessionAtEmergencyHall(), card),
      5,
    )
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '隔离区防火门 · 使用门禁卡').click() })
    for (const fact of ['行动后剩余时间0', '超时债务5', '强制返程基础损耗', '强制返程流血追加', '强制返程总损耗', '行动后生命', '预计结果强制返回']) {
      expect(container.textContent).toContain(fact)
    }
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    const phase = inner.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(['forced-returned', 'dead']).toContain(phase.payload.scene.status)
    expect(container.textContent).not.toContain('电梯中枢')
    expect(container.textContent).toContain('场景终局状态')
  })

  it('refreshes formal return facts from the canonical post-pickup Scene', () => {
    const carrying = [
      item('ui-load-fire-axe', HOSPITAL_ITEM_IDS.fireAxe),
      item('ui-load-pipe-a', HOSPITAL_ITEM_IDS.metalPipe),
      item('ui-load-pipe-b', HOSPITAL_ITEM_IDS.metalPipe),
      item('ui-load-pipe-c', HOSPITAL_ITEM_IDS.metalPipe),
      { instanceId: 'ui-load-ration', definitionId: HOSPITAL_ITEM_IDS.ration, quantity: 2 },
    ]
    let session = sceneSessionAtEmergencyHall()
    for (const [index, carried] of carrying.entries()) {
      session = withBackpackItem(session, carried, index === 0 ? 0 : index + 1, 0)
    }
    const source = item('ui-load-metal-parts', HOSPITAL_ITEM_IDS.metalParts)
    session = withGroundItem(session, source)
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    const beforeReturn = container.textContent
    act(() => { button(container, '拾取 金属零件').click() })
    act(() => { button(container, '格子 1,4').click() })
    act(() => { button(container, '确认拾取').click() })
    expect(storage.writes).toBe(1)
    expect(container.textContent).toContain('负重状态：负载')
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected pickup Scene')
    const runtime = getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies)
    const formalReturn = previewSceneWithdrawalCommand(
      phase.payload.scene,
      createWithdrawFromSceneCommand({ kind: 'withdraw-from-scene' }),
      runtime.dependencies,
    )
    if (!formalReturn.canExecute) throw new Error('expected formal withdrawal preview')
    expect(container.textContent).toContain(`预计返程：${formalReturn.result.returnRoute.estimatedReturnTime}`)
    act(() => { button(container, '主动撤离').click() })
    expect(container.textContent).toContain(`预计返程时间${formalReturn.result.returnRoute.estimatedReturnTime}`)
    expect(container.textContent).not.toBe(beforeReturn)
  })

  it('keeps a committed Hub and Return Summary visible when terminal settlement persistence fails', () => {
    const storage = new FailingStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: terminalSafeSession() },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '完成返程结算').click() })
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    expect(store.getState().phase.kind).toBe('current-day-hub')
    expect(container.textContent).toContain('保存失败')
    expect(container.textContent).toContain('返回摘要')
  })

  it('settles a dead Scene through RunFailure in the UI without ordinary Return extraction', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: terminalDeadSession() },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    expect(container.textContent).toContain('结算战败')
    expect(container.textContent).not.toContain('完成返程结算')
    act(() => { button(container, '结算战败').click() })
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    expect(store.getState().phase.kind).toBe('run-failure')
    expect(container.textContent).toContain('失败')
    expect(container.textContent).not.toContain('返回摘要')
  })

  it('performs zero-distance safety-node withdrawal as one explicit terminal Scene mutation', () => {
    const launched = resolveSceneLaunch(
      createHubPhase().payload,
      { kind: 'launch-main-scene' },
      hospitalSceneLaunchDependencies,
    ).session
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: launched },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const before = launched.scene.remainingTime
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '主动撤离').click() })
    expect(container.textContent).toContain('预计返程时间0')
    expect(container.textContent).toContain('安全返回')
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(1)
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected terminal Scene')
    expect(phase.payload.scene.status).toBe('safe-returned')
    expect(phase.payload.scene.remainingTime).toBe(before)
    expect(container.textContent).not.toContain('电梯中枢')
  })

  it('renders Pickup, Withdrawal, and terminal settlement opportunities in StrictMode without mutation', () => {
    const ground = item('ui-strict-ground-fire-axe', HOSPITAL_ITEM_IDS.fireAxe)
    const activeStorage = new MemoryStorage()
    const activeStore = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: withGroundItem(sceneSessionAtEmergencyHall(), ground) },
      storage: activeStorage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const activeBefore = activeStore.getState()
    const activeContainer = document.createElement('div')
    const activeRoot = createRoot(activeContainer); roots.push(activeRoot)
    act(() => { activeRoot.render(<StrictMode><StableRunUiApp store={activeStore} presentationDependencies={uiDependencies} /></StrictMode>) })
    expect(activeContainer.textContent).toContain('拾取 消防斧')
    expect(activeContainer.textContent).toContain('主动撤离')
    expect(activeStore.getState()).toBe(activeBefore)
    expect(activeStorage.writes).toBe(0)
    act(() => { button(activeContainer, '拾取 消防斧').click() })
    expect(activeStorage.writes).toBe(0)
    expect(activeStore.getState()).toBe(activeBefore)

    const terminalStorage = new MemoryStorage()
    const terminalStore = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: terminalSafeSession() },
      storage: terminalStorage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const terminalBefore = terminalStore.getState()
    const terminalContainer = document.createElement('div')
    const terminalRoot = createRoot(terminalContainer); roots.push(terminalRoot)
    act(() => { terminalRoot.render(<StrictMode><StableRunUiApp store={terminalStore} presentationDependencies={uiDependencies} /></StrictMode>) })
    expect(terminalContainer.textContent).toContain('完成返程结算')
    expect(terminalStore.getState()).toBe(terminalBefore)
    expect(terminalStorage.writes).toBe(0)
  })

  it('does not leak internal identities or hidden rule facts through Pickup, Withdrawal, or Return Summary UI', () => {
    const source = item('ui-hidden-fire-axe', HOSPITAL_ITEM_IDS.fireAxe)
    const session = withGroundItem(sceneSessionAtEmergencyHall(), source)
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: { kind: 'scene-session', payload: session },
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    const assertHidden = () => {
      const visible = container.innerHTML
      for (const hidden of [
        'react-ui-run',
        'react-ui-seed',
        config.metadata.rulesVersion,
        session.scene.sceneInstanceId,
        source.instanceId,
        source.definitionId,
        'scene-item-picked-up',
        'effects',
        'preparedOutcome',
        'randomTrace',
        'riskPercent',
      ]) expect(visible).not.toContain(hidden)
    }
    act(() => { button(container, '拾取 消防斧').click() })
    assertHidden()
    act(() => { button(container, '取消').click() })
    act(() => { button(container, '主动撤离').click() })
    assertHidden()
    act(() => { button(container, '确认执行').click() })
    act(() => { button(container, '完成返程结算').click() })
    act(() => { button(container, '确认执行').click() })
    expect(container.textContent).toContain('返回摘要')
    assertHidden()
  })

  it('keeps Combat StrictMode mount and Preview opening free of gameplay side effects', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: combatPhase(),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    const before = store.getState()
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StrictMode><StableRunUiApp store={store} presentationDependencies={uiDependencies} /></StrictMode>) })
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
    expect(store.getState()).toBe(before)
    act(() => { button(container, '挥击').click() })
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
    expect(store.getState()).toBe(before)
  })

  it('keeps every Combat Preview and the post-confirm result free of internal combat facts', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: combatPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    const hidden = [
      'riskPercent', 'roll', 'streamId', 'drawIndex', 'succeeded',
      'resolvedActionCount', 'nextCycleIndex', 'enemyInstanceId',
      'sceneInstanceId', 'rulesVersion', 'woundId', 'raw Effects', 'raw snapshot',
    ]
    for (const label of ['挥击', '蓄力击打', '防御', '逃跑', '使用绷带 · 处理撕裂伤 1']) {
      act(() => { button(container, label).click() })
      const preview = container.querySelector('[role="dialog"]')?.innerHTML ?? ''
      for (const value of hidden) expect(preview).not.toContain(value)
      act(() => { button(container, '取消').click() })
    }
    expect(storage.writes).toBe(0)
    act(() => { button(container, '挥击').click() })
    act(() => { button(container, '确认执行').click() })
    const result = container.querySelector('[role="dialog"]')?.innerHTML ?? ''
    for (const value of hidden) expect(result).not.toContain(value)
    expect(storage.writes).toBe(1)
  })

  it('refreshes a stale Combat Preview from the new canonical Scene', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: combatPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '挥击').click() })
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('6 → 5')
    const external = createStableRunUiInteractionModel(store.getState().phase, uiDependencies)
      .actions.find(({ label }) => label === '挥击')!
    act(() => { store.dispatch(external.command) })
    expect(storage.writes).toBe(1)
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('5 → 4')
    expect(container.querySelector('[role="dialog"]')?.textContent).not.toContain('6 → 5')
  })

  it('drops a stale bandage wound target after an external formal action consumes it', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: combatPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    const label = '使用绷带 · 处理撕裂伤 1'
    act(() => { button(container, label).click() })
    const external = createStableRunUiInteractionModel(store.getState().phase, uiDependencies)
      .actions.find((action) => action.label === label)!
    act(() => { store.dispatch(external.command) })
    expect(storage.writes).toBe(1)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(container.textContent).not.toContain(label)
  })

  it('uses one shared same-kind wound ordinal in status and the bandage target label', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: combatPhase({
        bleeding: true,
        openWounds: [
          { id: 'treated-laceration-a', kind: 'laceration', treatment: 'treated' },
          { id: 'untreated-laceration-b', kind: 'laceration', treatment: 'untreated' },
        ],
      }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    expect(container.textContent).toContain('撕裂伤 1 · 已处理')
    expect(container.textContent).toContain('撕裂伤 2 · 未处理')
    expect(container.textContent).toContain('使用绷带 · 处理撕裂伤 2')
    expect(container.innerHTML).not.toContain('treated-laceration-a')
    expect(container.innerHTML).not.toContain('untreated-laceration-b')
  })

  it('previews zero actual bandage healing at full health while keeping wound treatment legal', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: combatPhase({
        bleeding: true,
        openWounds: [{ id: 'full-health-wound', kind: 'laceration', treatment: 'untreated' }],
      }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用绷带 · 处理撕裂伤 1').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('生命恢复0')
    expect(preview).not.toContain('生命恢复1')
    act(() => { button(container, '确认执行').click() })
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(phase.payload.scene.condition.currentHealth)
      .toBeLessThanOrEqual(config.combat.player.maxHealth)
    expect(phase.payload.scene.condition.openWounds[0]?.treatment).toBe('treated')
  })

  it('uses only the real quick-slot bandage and never refills it from the backpack', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: combatPhase({ backpackBandage: true }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用绷带 · 处理撕裂伤 1').click() })
    act(() => { button(container, '确认执行').click() })
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(storage.writes).toBe(1)
    expect(phase.payload.scene.quickSlots.slots[0]).toBeNull()
    expect(phase.payload.scene.backpack.items).toContainEqual(expect.objectContaining({
      instanceId: 'react-combat-backpack-bandage',
      definitionId: HOSPITAL_ITEM_IDS.bandage,
    }))
    expect(phase.payload.scene.condition.bleeding).toBe(false)
  })

  it('uses the real quick-slot painkiller without presenting healing or wound treatment', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: combatPhase({ quickPainkiller: true }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用止痛药').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('行动 CTB80')
    expect(preview).toContain('镇痛生效')
    expect(preview).not.toContain('生命恢复')
    expect(preview).not.toContain('处理伤口')
    expect(preview).not.toContain('止血是')
    act(() => { button(container, '确认执行').click() })
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(storage.writes).toBe(1)
    expect(phase.payload.scene.quickSlots.slots[0]).toBeNull()
    expect(phase.payload.scene.condition.painkillerActive).toBe(true)
    expect(phase.payload.scene.condition.bleeding).toBe(true)
  })

  it('uses temporary attack from a broken weapon slot without touching the backpack spare', () => {
    const storage = new MemoryStorage()
    const phaseBefore = combatPhase({ weaponDurability: 0, backpackSparePipe: true })
    const spareBefore = phaseBefore.payload.scene.backpack.items[0]
    const spareStateBefore = phaseBefore.payload.scene.itemStates.states.find(
      ({ instanceId }) => instanceId === spareBefore.instanceId,
    )
    const store = createStableRunStore({ initialPhase: phaseBefore, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    expect(container.textContent).toContain('临时攻击')
    expect(container.textContent).not.toContain('挥击')
    act(() => { button(container, '临时攻击').click() })
    act(() => { button(container, '确认执行').click() })
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(storage.writes).toBe(1)
    expect(phase.payload.scene.backpack.items[0]).toEqual(spareBefore)
    expect(phase.payload.scene.itemStates.states.find(
      ({ instanceId }) => instanceId === spareBefore.instanceId,
    )).toEqual(spareStateBefore)
  })

  it('fully resolves a durability-one charged strike before refreshing to temporary attack', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: combatPhase({ weaponDurability: 1 }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '蓄力击打').click() })
    expect(container.textContent).toContain('本次行动后武器将损坏')
    act(() => { button(container, '确认执行').click() })
    act(() => { button(container, '关闭结果').click() })
    expect(storage.writes).toBe(1)
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected combat Scene')
    const active = phase.payload.scene.combatState.encounters.find(({ kind }) => kind === 'active')
    expect(active?.kind === 'active' && active.combat.enemy.currentHealth).toBe(8)
    expect(active?.kind === 'active' && active.combat.enemyNextActionCtb).toBe(270)
    expect(container.textContent).not.toContain('蓄力击打')
    expect(container.textContent).not.toContain('挥击')
    expect(container.textContent).toContain('临时攻击')
  })

  it.each([
    ['unalerted', false, 2],
    ['alerted', true, 3],
  ] as const)('keeps the %s four-basic UI route aligned with formal enemy action counts', (_label, alerted, expectedEnemyActions) => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: combatPhase({ alerted, healthy: true }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    for (let index = 0; index < 4; index += 1) {
      act(() => { button(container, '挥击').click() })
      act(() => { button(container, '确认执行').click() })
      act(() => { button(container, '关闭结果').click() })
    }
    expect(storage.writes).toBe(4)
    expect(notifications).toBe(4)
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene after victory')
    expect(phase.payload.scene.status).toBe('active')
    const dormant = phase.payload.scene.combatState.encounters.find(({ kind }) => kind === 'dormant')
    expect(dormant?.kind === 'dormant' && dormant.enemy.resolvedActionCount).toBe(expectedEnemyActions)
  })

  it('escapes, saves once, and re-enters with the persistent enemy at CTB 50', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: combatPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '逃跑').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('基础准备 CTB80')
    expect(preview).toContain('最终准备 CTB90')
    expect(preview).toContain('生还结果继续 active Scene')
    expect(preview).toContain('后续流程继续当前 active Scene')
    expect(preview).not.toContain('settle-terminal-scene')
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    expect(container.textContent).toContain('实际 Scene 时间结算10')
    let phase = inner.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(phase.payload.scene.status).toBe('active')
    expect(phase.payload.scene.currentNodeId).toBe(HOSPITAL_NODE_IDS.emergencyHall)
    act(() => { button(container, '关闭结果').click() })
    act(() => { button(container, '前往 隔离走廊').click() })
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(2)
    expect(storage.writes).toBe(2)
    expect(notifications).toBe(2)
    phase = inner.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected reentry Scene')
    const active = phase.payload.scene.combatState.encounters.find(({ kind }) => kind === 'active')
    expect(active?.kind === 'active' && active.combat.enemyNextActionCtb).toBe(50)
    expect(active?.kind === 'active' && active.engagement).toBe('reentry')
  })

  it('persists Combat defeat as a dead Scene without automatic settlement', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: combatPhase({ currentHealth: 1 }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '防御').click() })
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(1)
    const phase = store.getState().phase
    expect(phase.kind).toBe('scene-session')
    if (phase.kind !== 'scene-session') throw new Error('expected dead Scene')
    expect(phase.payload.scene.status).toBe('dead')
    expect(container.textContent).toContain('结算战败')
    expect(container.textContent).not.toContain('Run 已终止')
  })

  it('keeps one committed Combat mutation after a save failure without retry or rollback', () => {
    const storage = new FailingStorage()
    const store = createStableRunStore({ initialPhase: combatPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    let notifications = 0
    store.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '挥击').click() })
    act(() => { button(container, '确认执行').click() })
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    expect(container.textContent).toContain('保存失败')
    const phase = store.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected committed Scene')
    const active = phase.payload.scene.combatState.encounters.find(({ kind }) => kind === 'active')
    expect(active?.kind === 'active' && active.combat.currentCtb).toBe(100)
  })

  it('keeps a normal potential victory in active Scene without terminal settlement text', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: combatPhase({ enemyHealth: 4, healthy: true, remainingTime: 100 }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    act(() => { button(container, '挥击').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('若本次攻击使敌人失去能力')
    expect(preview).toContain('生还结果继续 active Scene')
    expect(preview).toContain('后续流程继续当前 active Scene')
    expect(preview).not.toContain('settle-terminal-scene')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)

    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const phase = inner.getState().phase
    expect(phase.kind).toBe('scene-session')
    if (phase.kind !== 'scene-session') throw new Error('expected active Scene')
    expect(phase.payload.scene.status).toBe('active')
  })

  it('keeps near-zero Combat terminal resolution in one terminal Scene session', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: combatPhase({ remainingTime: 5 }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '逃跑').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('战斗场景时间10')
    expect(preview).toContain('完成节点急诊大厅')
    expect(preview).toContain('当前剩余 Scene 时间5')
    expect(preview).toContain('结算后剩余时间0')
    expect(preview).toContain('超时债务5')
    expect(preview).toContain('预计返程时间11')
    expect(preview).toContain('有效紧急撤离时间16')
    expect(preview).toContain('强制返程基础损耗1')
    expect(preview).toContain('强制返程流血追加1')
    expect(preview).toContain('强制返程总损耗2')
    expect(preview).toContain('强制返程后生命4')
    expect(preview).toContain('死亡风险未发现')
    expect(preview).toContain('生还结果forced-returned Scene')
    expect(preview).toContain('强制返程目标电梯前室')
    expect(preview).toContain('后续由独立 settle-terminal-scene 命令处理')
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const phase = inner.getState().phase
    expect(phase.kind).toBe('scene-session')
    if (phase.kind !== 'scene-session') throw new Error('expected terminal Scene')
    expect(['forced-returned', 'dead']).toContain(phase.payload.scene.status)
    expect(container.textContent).toContain('实际 Scene 时间结算10')
    expect(container.textContent).not.toContain('电梯中枢')
    expect(container.textContent).not.toContain('Run 已终止')
  })

  it('shows the seed-independent new-bleeding escape range without a false death warning', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: combatPhase({ healthy: true, remainingTime: 5 }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '逃跑').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('脱离完成流血损失0–1')
    expect(preview).toContain('脱离完成后生命')
    expect(preview).toContain('强制返程流血追加0–')
    expect(preview).toContain('强制返程后生命7–9')
    expect(preview).toContain('死亡风险未发现')
    expect(preview).not.toContain('riskPercent')
    expect(storage.writes).toBe(0)
  })

  it('separates possible completion-checkpoint bleeding death from pre-completion defeat', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({
      initialPhase: combatPhase({
        currentHealth: 3,
        bleeding: false,
        openWounds: [],
        remainingTime: 5,
      }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '逃跑').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('若成功完成脱离')
    expect(preview).toContain('若在脱离完成检查点因流血战败')
    expect(preview).toContain('死亡风险将死亡')
    expect(preview).toContain('不返回脱离节点')
    expect(preview).toContain('不进入强制返程')
    expect(preview).toContain('玩家死亡优先，不提交逃跑成功')
    expect(preview).not.toContain('若在脱离完成前战败')
    expect(preview).not.toContain('生还结果forced-returned Scene')
    expect(storage.writes).toBe(0)
  })

  it('shows existing-bleeding death at escape completion CTB 80 and saves one dead Scene', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: combatPhase({
        currentHealth: 4,
        bleeding: true,
        armorIntegrity: null,
        remainingTime: 100,
      }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    act(() => { button(container, '逃跑').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('脱离完成 CTB80')
    expect(preview).toContain('脱离完成流血损失1')
    expect(preview).toContain('脱离完成后生命0')
    expect(preview).toContain('战斗结束累计 CTB80')
    expect(preview).toContain('战斗场景时间10')
    expect(preview).toContain('脱离完成主要效果后，行动后流血将使生命归零')
    expect(preview).toContain('玩家死亡优先于逃跑成功')
    expect(preview).toContain('本次仅保存 dead Scene Session')
    expect(preview).toContain('settle-terminal-scene 命令进入 Run Failure')
    expect(preview).not.toContain('脱离完成前战败')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)

    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const phase = inner.getState().phase
    expect(phase.kind).toBe('scene-session')
    if (phase.kind !== 'scene-session') throw new Error('expected dead Scene')
    expect(phase.payload.scene.status).toBe('dead')
    expect(container.textContent).toContain('实际 Scene 时间结算10')
    expect(container.textContent).not.toContain('Run 已终止')
  })

  it('keeps true direct-damage defeat labeled before escape completion at CTB 70', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: combatPhase({
        currentHealth: 1,
        healthy: true,
        armorIntegrity: null,
        remainingTime: 100,
      }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    act(() => { button(container, '逃跑').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('玩家将在脱离完成前战败')
    expect(preview).toContain('战败节点隔离走廊')
    expect(preview).toContain('战斗结束累计 CTB70')
    expect(preview).toContain('战斗场景时间10')
    expect(preview).toContain('本次仅保存 dead Scene Session')
    expect(preview).not.toContain('若成功完成脱离')
    expect(preview).not.toContain('脱离完成 CTB80')
    expect(preview).not.toContain('脱离完成主要效果后')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)

    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const phase = inner.getState().phase
    expect(phase.kind).toBe('scene-session')
    if (phase.kind !== 'scene-session') throw new Error('expected dead Scene')
    expect(phase.payload.scene.status).toBe('dead')
  })

  it('makes last-hit bleeding death override a hidden potential victory and saves one dead Scene', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: combatPhase({
        currentHealth: 1,
        bleeding: true,
        enemyHealth: 4,
        remainingTime: 100,
      }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    act(() => { button(container, '挥击').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('自身行动阶段后生命0')
    expect(preview).toContain('死亡风险将死亡')
    expect(preview).toContain('玩家死亡优先于任何潜在胜利')
    expect(preview).toContain('本次仅保存 dead Scene Session')
    expect(preview).toContain('settle-terminal-scene 命令进入 Run Failure')
    expect(preview).not.toContain('若本次攻击使敌人失去能力')
    expect(preview).not.toContain('敌人剩余生命')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)

    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const phase = inner.getState().phase
    expect(phase.kind).toBe('scene-session')
    if (phase.kind !== 'scene-session') throw new Error('expected dead Scene')
    expect(phase.payload.scene.status).toBe('dead')
    expect(container.textContent).toContain('实际 Scene 时间结算10')
    expect(container.textContent).toContain('结算战败')
    expect(container.textContent).not.toContain('Run 已终止')
  })

  it('previews and confirms cautious sample extraction with explicit 2×2 placement and no hidden risk leak', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: taskEventPhase({ coatIntegrity: 1 }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const before = inner.getState()
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StrictMode><StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} /></StrictMode>) })
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
    expect(inner.getState()).toBe(before)
    expect(container.textContent).toContain('谨慎检查并提取')
    expect(container.textContent).toContain('直接取出')
    expect(container.textContent).toContain('放弃提取')

    act(() => { button(container, '谨慎检查并提取').click() })
    expect(container.textContent).toContain('请在背包网格中明确选择样本箱放置位置')
    expect(button(container, '确认提取').disabled).toBe(true)
    act(() => { button(container, '格子 1,1').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('污染风险无')
    expect(preview).toContain('厚实外套保护生效')
    expect(preview).toContain('外套完整度1 → 0')
    expect(preview).toContain('密封病原样本箱 ×1')
    expect(preview).toContain('样本箱尺寸2×2')
    expect(preview).toContain('样本箱重量4')
    expect(preview).toContain('可能感染暴露无')
    expect(preview).toContain('取得样本箱不等于安全提取或主任务完成')
    expect(preview).not.toMatch(/riskPercent|roll|streamId|drawIndex|succeeded|sceneInstanceId|runSeed|runId|rulesVersion|instanceId|RANDOM_ALGORITHM_VERSION|20%|40%|60%/i)
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)

    act(() => { button(container, '确认提取').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const phase = inner.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(phase.payload.scene.status).toBe('active')
    expect(phase.payload.scene.currentNodeId).toBe(HOSPITAL_NODE_IDS.specimenColdRoom)
    expect(phase.payload.scene.backpack.items).toContainEqual(expect.objectContaining({
      definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
      quantity: 1,
    }))
    expect(phase.payload.context.runReturnCarryForward.storedInventory.taskStorage.items).toEqual([])
    expect(phase.payload.scene.taskEvents.entries).toContainEqual({
      eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval,
      status: 'completed',
    })
    expect(getItemState(phase.payload.scene.itemStates, phase.payload.scene.equipment.armor!.instanceId).resource)
      .toEqual({ kind: 'integrity', current: 0 })
    expect(phase.payload.scene.condition.pendingInfectionExposures).toBe(0)
    expect(container.textContent).toContain('实际新增感染暴露0')
    expect(container.textContent).toContain('安全入库否；仍需安全返回并显式结算')
    expect(container.textContent).not.toContain('任务完成')
    act(() => { button(container, '关闭结果').click() })
    expect(container.querySelectorAll('.backpack-grid [data-occupied="true"]')).toHaveLength(4)
    expect(container.textContent).not.toContain('谨慎检查并提取')
    expect(container.textContent).not.toContain('直接取出')
    expect(container.textContent).toContain('主动撤离')
  })

  it('keeps opposite-seed direct extraction previews identical while committed exposure may differ', () => {
    const render = (seed: string) => {
      const storage = new MemoryStorage()
      const store = createStableRunStore({
        initialPhase: taskEventPhase({ seed, coatIntegrity: null }),
        storage,
        rulesRegistry: hospitalRunSaveRulesRegistry,
      })
      const container = document.createElement('div')
      const root = createRoot(container); roots.push(root)
      act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
      act(() => { button(container, '直接取出').click() })
      act(() => { button(container, '格子 1,1').click() })
      const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
      return { storage, store, container, preview }
    }
    const first = render('pathogen-case-seed')
    const second = render('beta')
    expect(first.preview).toBe(second.preview)
    expect(first.preview).toContain('污染风险高')
    expect(first.preview).toContain('可能感染暴露未结算感染暴露 +1')
    expect(first.preview).not.toMatch(/20%|40%|60%|roll|stream|draw|succeeded|exposureAdded/i)
    act(() => { button(first.container, '确认提取').click() })
    act(() => { button(second.container, '确认提取').click() })
    const exposures = [first.store, second.store].map((store) => {
      const phase = store.getState().phase
      if (phase.kind !== 'scene-session') throw new Error('expected Scene')
      return phase.payload.scene.condition.pendingInfectionExposures
    })
    expect(new Set(exposures)).toEqual(new Set([0, 1]))
    expect(first.storage.writes).toBe(1)
    expect(second.storage.writes).toBe(1)
  })

  it('keeps decline repeatable with one formal dispatch and no extraction side effects', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: taskEventPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '放弃提取').click() })
    expect(container.textContent).toContain('任务事件仍可稍后重新选择')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const phase = inner.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected Scene')
    expect(phase.payload.scene.status).toBe('active')
    expect(phase.payload.scene.remainingTime).toBe(config.scene.totalTime)
    expect(phase.payload.scene.backpack.items).toEqual([])
    expect(phase.payload.scene.condition.pendingInfectionExposures).toBe(0)
    expect(phase.payload.scene.taskEvents.entries).toContainEqual({
      eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval,
      status: 'available',
    })
    act(() => { button(container, '关闭结果').click() })
    expect(container.textContent).toContain('放弃提取')
  })

  it('rejects overlapping, out-of-bounds, and over-carry task placement without dispatch or save', () => {
    const cases = [
      { phase: taskEventPhase({ materialWeight: 1 }), anchor: '金属零件 ×1' },
      { phase: taskEventPhase(), anchor: '格子 6,4' },
      { phase: taskEventPhase({ materialWeight: 25 }), anchor: '格子 1,2' },
    ] as const
    for (const entry of cases) {
      const storage = new MemoryStorage()
      const inner = createStableRunStore({ initialPhase: entry.phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
      const tracked = trackedStore(inner)
      let notifications = 0
      inner.subscribe(() => { notifications += 1 })
      const before = inner.getState()
      const container = document.createElement('div')
      const root = createRoot(container); roots.push(root)
      act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
      act(() => { button(container, '直接取出').click() })
      if (entry.anchor !== null) act(() => { button(container, entry.anchor).click() })
      expect(container.textContent).toContain('当前背包布局、位置或负重无法放置样本箱')
      expect(button(container, '确认提取').disabled).toBe(true)
      expect(tracked.commands).toHaveLength(0)
      expect(storage.writes).toBe(0)
      expect(notifications).toBe(0)
      expect(inner.getState()).toBe(before)
    }
  })

  it('keeps a near-zero extraction as one terminal Scene before explicit task-storage settlement', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: taskEventPhase({ remainingTime: 5, coatIntegrity: null }), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '直接取出').click() })
    act(() => { button(container, '格子 1,1').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('行动前剩余时间5')
    expect(preview).toContain('行动耗时10')
    expect(preview).toContain('行动后剩余时间0')
    expect(preview).toContain('超时债务5')
    expect(preview).toContain('完成节点标本冷藏室')
    expect(preview).toContain('有效紧急撤离时间')
    expect(preview).toContain('强制返程基础损耗')
    expect(preview).toContain('强制返程流血追加')
    expect(preview).toContain('强制返程总损耗')
    expect(preview).toContain('强制返程后生命')
    expect(preview).toContain('死亡风险')
    expect(preview).toContain('后续显式返程结算才会安全转入任务储存区')
    act(() => { button(container, '确认提取').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    let phase = inner.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected terminal Scene')
    expect(phase.payload.scene.status).toBe('forced-returned')
    const caseBeforeReturn = phase.payload.scene.backpack.items.find(
      ({ definitionId }) => definitionId === HOSPITAL_ITEM_IDS.sealedPathogenCase,
    )
    expect(caseBeforeReturn).toBeDefined()
    expect(phase.payload.context.runReturnCarryForward.storedInventory.taskStorage.items).toEqual([])
    expect(container.textContent).not.toContain('电梯中枢')
    act(() => { button(container, '关闭结果').click() })
    act(() => { button(container, '完成返程结算').click() })
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(2)
    expect(storage.writes).toBe(2)
    expect(notifications).toBe(2)
    phase = inner.getState().phase
    if (phase.kind !== 'current-day-hub') throw new Error('expected Hub')
    const stored = phase.payload.runLoadout.taskStorage.items.find(
      ({ definitionId }) => definitionId === HOSPITAL_ITEM_IDS.sealedPathogenCase,
    )
    expect(stored?.instanceId).toBe(caseBeforeReturn?.instanceId)
    expect(phase.payload.runLoadout.warehouse.items).not.toContainEqual(expect.objectContaining({
      definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
    }))
    expect(container.textContent).toContain('带回任务物品密封病原样本箱 ×1')
    expect(container.textContent).toContain('任务储存区')
  })

  it('retains an acquired case in a dead Scene after post-action bleeding without safe extraction', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: taskEventPhase({ currentHealth: 1, bleeding: true, remainingTime: 20, coatIntegrity: null }), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '直接取出').click() })
    act(() => { button(container, '格子 1,1').click() })
    expect(container.textContent).toContain('本次行动后玩家将死亡')
    expect(container.textContent).toContain('样本箱不会安全入库')
    act(() => { button(container, '确认提取').click() })
    const phase = inner.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected dead Scene')
    expect(phase.payload.scene.status).toBe('dead')
    expect(phase.payload.scene.backpack.items).toContainEqual(expect.objectContaining({
      definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
    }))
    expect(phase.payload.context.runReturnCarryForward.storedInventory.taskStorage.items).toEqual([])
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(container.textContent).toContain('玩家已经死亡，样本箱不会安全入库')
    expect(container.textContent).not.toContain('电梯中枢')
  })

  it('shows broken-coat direct risk and keeps overtime forced-return death in the terminal Scene', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: taskEventPhase({
        currentHealth: 2,
        remainingTime: 5,
        coatIntegrity: 0,
      }),
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '直接取出').click() })
    act(() => { button(container, '格子 1,1').click() })
    const preview = container.querySelector('[role="dialog"]')?.textContent ?? ''
    expect(preview).toContain('污染风险高')
    expect(preview).toContain('厚实外套保护未生效')
    expect(preview).not.toContain('外套完整度0 →')
    expect(preview).toContain('强制返程后生命0')
    expect(preview).toContain('死亡风险将死亡')
    act(() => { button(container, '确认提取').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    const phase = inner.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected dead Scene')
    expect(phase.payload.scene.status).toBe('dead')
    expect(phase.payload.scene.backpack.items).toContainEqual(expect.objectContaining({
      definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
    }))
    expect(phase.payload.context.runReturnCarryForward.storedInventory.taskStorage.items).toEqual([])
    expect(container.textContent).toContain('玩家已经死亡，样本箱不会安全入库')
  })

  it('closes a stale extraction preview after another formal command completes the event', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: taskEventPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={inner} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '直接取出').click() })
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
    const interaction = createStableRunUiInteractionModel(inner.getState().phase, uiDependencies)
    const opportunity = interaction.taskEventOpportunities.find(({ label }) => label === '谨慎检查并提取')
    if (!opportunity) throw new Error('expected cautious task event')
    const safe = previewStableRunUiTaskEventDraft(inner.getState().phase, {
      opportunityId: opportunity.id,
      x: 0,
      y: 0,
      rotated: false,
    }, uiDependencies)
    if (!safe?.canExecute || !safe.command) throw new Error('expected formal task event command')
    act(() => { inner.dispatch(safe.command!) })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(container.textContent).not.toContain('确认提取')
    expect(container.textContent).not.toContain('直接取出')
    expect(storage.writes).toBe(1)
  })

  it('keeps one committed task-event random outcome after save failure without retry or reroll', () => {
    const storage = new FailingStorage()
    const inner = createStableRunStore({ initialPhase: taskEventPhase({ coatIntegrity: null }), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '直接取出').click() })
    act(() => { button(container, '格子 1,1').click() })
    act(() => { button(container, '确认提取').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    expect(container.textContent).toContain('保存失败')
    const phase = inner.getState().phase
    if (phase.kind !== 'scene-session') throw new Error('expected committed Scene')
    expect(phase.payload.scene.taskEvents.entries).toContainEqual({
      eventId: HOSPITAL_TASK_EVENT_IDS.pathogenCaseRetrieval,
      status: 'completed',
    })
    expect(phase.payload.scene.backpack.items).toContainEqual(expect.objectContaining({
      definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
    }))
    expect(phase.payload.scene.condition.pendingInfectionExposures).toBeGreaterThanOrEqual(0)
  })

  it('maps every formal non-combat medical source and target to identity-safe player actions', () => {
    const phase = sceneMedicalPhase({
      backpack: [
        { item: { ...item('hidden-bandage-a', HOSPITAL_ITEM_IDS.bandage), quantity: 2 }, x: 0, y: 0 },
        { item: item('hidden-bandage-b', HOSPITAL_ITEM_IDS.bandage), x: 3, y: 1 },
      ],
      quickSlots: [item('hidden-quick-bandage', HOSPITAL_ITEM_IDS.bandage), null],
      bleeding: true,
      openWounds: [
        { id: 'hidden-a-treated-wound', kind: 'laceration', treatment: 'treated' },
        { id: 'hidden-b-target-wound', kind: 'laceration', treatment: 'untreated' },
      ],
    })
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    const labels = [
      '使用绷带 · 背包格 1,1 · 处理撕裂伤 2',
      '使用绷带 · 背包格 4,2 · 处理撕裂伤 2',
      '使用绷带 · 快捷栏1 · 处理撕裂伤 2',
    ]
    for (const label of labels) expect(button(container, label)).toBeInstanceOf(HTMLButtonElement)
    act(() => { button(container, labels[1]!).click() })
    expect(container.textContent).toContain('实际生命恢复0')
    expect(container.textContent).toContain('流血（主要效果）是 → 否')
    expect(container.textContent).toContain('处理伤口撕裂伤 2')
    expect(container.textContent).toContain('行动后流血损失0')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    const html = container.innerHTML
    for (const hidden of [
      'hidden-bandage-a',
      'hidden-bandage-b',
      'hidden-quick-bandage',
      'hidden-a-treated-wound',
      'hidden-b-target-wound',
      'itemInstanceId',
      'woundId',
      'sceneInstanceId',
      'rulesVersion',
      'transitionPlan',
    ]) expect(html).not.toContain(hidden)
  })

  it('consumes only the selected quick-slot bandage and never refills it from the backpack', () => {
    const phase = sceneMedicalPhase({
      backpack: [{ item: { ...item('scene-backpack-bandage', HOSPITAL_ITEM_IDS.bandage), quantity: 2 }, x: 0, y: 0 }],
      quickSlots: [item('scene-quick-bandage', HOSPITAL_ITEM_IDS.bandage), null],
      currentHealth: 10,
      bleeding: true,
      openWounds: [{ id: 'scene-bandage-wound', kind: 'puncture', treatment: 'untreated' }],
    })
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用绷带 · 快捷栏1 · 处理穿刺伤 1').click() })
    act(() => { button(container, '确认执行').click() })
    const after = store.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.quickSlots.slots[0]).toBeNull()
    expect(after.payload.scene.backpack.items).toContainEqual(expect.objectContaining({
      instanceId: 'scene-backpack-bandage',
      quantity: 2,
    }))
    expect(after.payload.scene.condition).toMatchObject({
      currentHealth: 11,
      bleeding: false,
      openWounds: [expect.objectContaining({ treatment: 'treated' })],
    })
    expect(storage.writes).toBe(1)
    expect(container.textContent).toContain('场景医疗结果')
    expect(container.textContent).toContain('来源快捷栏1')
    expect(container.textContent).toContain('流血：已停止')
  })

  it('consumes one real unit from the selected backpack medical stack', () => {
    const phase = sceneMedicalPhase({
      backpack: [{
        item: { ...item('scene-bandage-stack', HOSPITAL_ITEM_IDS.bandage), quantity: 2 },
        x: 2,
        y: 1,
      }],
      currentHealth: 10,
    })
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用绷带 · 背包格 3,2').click() })
    expect(container.textContent).toContain('物品数量2 → 1')
    act(() => { button(container, '确认执行').click() })
    const after = store.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.backpack.items).toEqual([{
      instanceId: 'scene-bandage-stack',
      definitionId: HOSPITAL_ITEM_IDS.bandage,
      quantity: 1,
    }])
    expect(getItemState(after.payload.scene.itemStates, 'scene-bandage-stack')).toMatchObject({
      definitionId: HOSPITAL_ITEM_IDS.bandage,
      resource: { kind: 'none' },
    })
  })

  it('previews and commits painkiller without healing while using the post-analgesia return route', () => {
    const phase = sceneMedicalPhase({
      backpack: [{ item: item('scene-painkiller', HOSPITAL_ITEM_IDS.painkiller), x: 2, y: 0 }],
      currentHealth: 9,
      minorContusions: 1,
    })
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const beforeReturn = previewSceneWithdrawalCommand(
      phase.payload.scene,
      createWithdrawFromSceneCommand({ kind: 'withdraw-from-scene' }),
      getRunSceneRuntime(phase.payload, hospitalSceneLaunchDependencies).dependencies,
    )
    if (!beforeReturn.canExecute) throw new Error('expected withdrawal preview')
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用止痛药 · 背包格 3,1').click() })
    expect(container.textContent).toContain('实际生命恢复0')
    expect(container.textContent).toContain('镇痛将生效')
    expect(container.textContent).toContain(`行动后预计返程${beforeReturn.result.returnRoute.baseReturnTime}`)
    expect(container.textContent).not.toContain('settle-terminal-scene')
    expect(container.textContent).not.toContain('terminal Scene Session')
    act(() => { button(container, '确认执行').click() })
    const after = store.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.condition).toMatchObject({ currentHealth: 9, painkillerActive: true })
    expect(container.textContent).toContain('镇痛已生效')
    expect(container.textContent).toContain('本次医疗完成后可继续探索')
    expect(container.textContent).not.toContain('settle-terminal-scene')
    expect(container.textContent).not.toContain('terminal Scene Session')
    expect([...container.querySelectorAll('button')].some(
      (candidate) => candidate.textContent === '使用止痛药 · 背包格 3,1',
    )).toBe(false)
  })

  it('separates a non-safety medical completion node from its forced-return destination', () => {
    const phase = sceneMedicalPhase({
      backpack: [{ item: item('forced-hall-bandage', HOSPITAL_ITEM_IDS.bandage), x: 0, y: 0 }],
      currentHealth: 10,
      remainingTime: 5,
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
    })
    const storage = new MemoryStorage()
    const tracked = trackedStore(createStableRunStore({
      initialPhase: phase,
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    }))
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用绷带 · 背包格 1,1').click() })
    const preview = container.textContent ?? ''
    expect(preview).toContain('完成节点急诊大厅')
    expect(preview).toContain('强制返程目标电梯前室')
    expect(preview).toContain('最终 Scene 状态forced-returned')
    expect(preview).toContain('后续需要显式完成返程结算')
    for (const hidden of [
      'forced-hall-bandage',
      'sceneInstanceId',
      'runId',
      'runSeed',
      'rulesVersion',
      'effects',
      'snapshot',
    ]) expect(container.innerHTML).not.toContain(hidden)
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    const after = tracked.store.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected forced-returned Scene session')
    expect(after.payload.scene).toMatchObject({
      status: 'forced-returned',
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
    })
    const result = container.textContent ?? ''
    expect(result).toContain('完成节点急诊大厅')
    expect(result).toContain('当前节点电梯前室')
    expect(result).toContain('当前为 forced-returned Scene Session')
    for (const hidden of [
      'forced-hall-bandage',
      'sceneInstanceId',
      'runId',
      'runSeed',
      'rulesVersion',
      'effects',
      'snapshot',
    ]) expect(container.innerHTML).not.toContain(hidden)
  })

  it('commits disinfectant before post-action bleeding death and leaves terminal settlement explicit', () => {
    const phase = sceneMedicalPhase({
      backpack: [{ item: item('scene-disinfectant', HOSPITAL_ITEM_IDS.disinfectant), x: 0, y: 2 }],
      currentHealth: 1,
      bleeding: true,
      openWounds: [{ id: 'scene-fatal-wound', kind: 'bite', treatment: 'untreated' }],
      pendingInfectionExposures: 1,
      remainingTime: 100,
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
    })
    const storage = new MemoryStorage()
    const tracked = trackedStore(createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry }))
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用消毒剂 · 背包格 1,3').click() })
    expect(container.textContent).toContain('未结算感染暴露1 → 0')
    expect(container.textContent).toContain('行动后剩余时间90')
    expect(container.textContent).toContain('行动后流血损失1')
    expect(container.textContent).toContain('行动完成后生命将归零')
    expect(container.textContent).toContain('返程延续行动后流血导致死亡，无法进入返程阶段')
    expect(container.textContent).not.toContain('行动后返程预计剩余90')
    expect(container.textContent).not.toContain('强制返程目标')
    for (const hidden of [
      'scene-disinfectant',
      'scene-fatal-wound',
      'sceneInstanceId',
      'runId',
      'runSeed',
      'rulesVersion',
      'effects',
      'snapshot',
    ]) expect(container.innerHTML).not.toContain(hidden)
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    const after = tracked.store.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected dead Scene session')
    expect(after.payload.scene).toMatchObject({
      status: 'dead',
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
      remainingTime: 90,
      condition: { currentHealth: 0, pendingInfectionExposures: 0 },
      dailyMedicalUsage: { disinfectantUsesToday: 1 },
    })
    expect(after.payload.scene.backpack.items).toEqual([])
    expect(container.textContent).toContain('当前为 dead Scene Session')
    expect(container.textContent).toContain('结算战败')
    expect(container.textContent).toContain('完成节点急诊大厅')
    expect(container.textContent).toContain('当前节点急诊大厅')
    expect(container.textContent).not.toContain('行动后预计返程')
    expect(container.textContent).not.toContain('强制返程目标')
    for (const hidden of [
      'scene-disinfectant',
      'scene-fatal-wound',
      'sceneInstanceId',
      'runId',
      'runSeed',
      'rulesVersion',
      'effects',
      'snapshot',
    ]) expect(container.innerHTML).not.toContain(hidden)
    expect(tracked.commands).toHaveLength(1)
  })

  it('attributes a no-bleed near-zero medical death to formal emergency-return damage', () => {
    const phase = sceneMedicalPhase({
      backpack: [{ item: item('hidden-return-death-painkiller', HOSPITAL_ITEM_IDS.painkiller), x: 1, y: 0 }],
      currentHealth: 1,
      bleeding: false,
      minorContusions: 1,
      remainingTime: 5,
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
    })
    const storage = new MemoryStorage()
    const inner = createStableRunStore({
      initialPhase: phase,
      storage,
      rulesRegistry: hospitalRunSaveRulesRegistry,
    })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    act(() => { button(container, '使用止痛药 · 背包格 2,1').click() })
    const preview = container.textContent ?? ''
    expect(preview).toContain('镇痛将生效')
    expect(preview).toContain('行动后流血损失0')
    expect(preview).toContain('超时债务5')
    expect(preview).toContain('强制返程总损耗1')
    expect(preview).toContain('死亡风险将死亡')
    expect(preview).toContain('完成节点急诊大厅')
    expect(preview).toContain('最终 Scene 状态dead')
    expect(preview).toContain('返程延续紧急返程损耗导致死亡，未能完成安全返程')
    expect(preview).not.toContain('行动后流血致死')
    expect(preview).not.toContain('行动后流血导致死亡')
    expect(preview).not.toContain('强制返程目标电梯前室')
    for (const hidden of [
      'hidden-return-death-painkiller',
      'sceneInstanceId',
      'runId',
      'runSeed',
      'rulesVersion',
      'effects',
      'snapshot',
    ]) expect(container.innerHTML).not.toContain(hidden)

    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected dead Scene session')
    expect(after.payload.scene).toMatchObject({
      status: 'dead',
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
      remainingTime: 0,
      condition: {
        currentHealth: 0,
        bleeding: false,
        painkillerActive: true,
      },
    })
    expect(after.payload.scene.backpack.items).toEqual([])
    expect(container.textContent).toContain('当前为 dead Scene Session')
    expect(container.textContent).toContain('完成节点急诊大厅')
    expect(container.textContent).toContain('当前节点急诊大厅')
    expect(container.textContent).not.toContain('当前节点电梯前室')
    expect(tracked.commands).toHaveLength(1)
    for (const hidden of [
      'hidden-return-death-painkiller',
      'sceneInstanceId',
      'runId',
      'runSeed',
      'rulesVersion',
      'effects',
      'snapshot',
    ]) expect(container.innerHTML).not.toContain(hidden)
  })

  it('commits painkiller activation before post-action bleeding death', () => {
    const phase = sceneMedicalPhase({
      backpack: [{ item: item('fatal-scene-painkiller', HOSPITAL_ITEM_IDS.painkiller), x: 1, y: 0 }],
      currentHealth: 1,
      bleeding: true,
      openWounds: [{ id: 'fatal-painkiller-wound', kind: 'puncture', treatment: 'untreated' }],
    })
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用止痛药 · 背包格 2,1').click() })
    expect(container.textContent).toContain('镇痛将生效')
    expect(container.textContent).toContain('行动后流血损失1')
    act(() => { button(container, '确认执行').click() })
    const after = store.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected dead Scene session')
    expect(after.payload.scene).toMatchObject({
      status: 'dead',
      condition: { currentHealth: 0, painkillerActive: true },
    })
    expect(after.payload.scene.backpack.items).toEqual([])
    expect(storage.writes).toBe(1)
  })

  it('keeps first-aid target truth for treated wounds and contusions without generic auto-stop-bleeding', () => {
    const phase = sceneMedicalPhase({
      backpack: [
        { item: item('scene-first-aid-a', HOSPITAL_ITEM_IDS.firstAidKit), x: 0, y: 0 },
        { item: item('scene-first-aid-b', HOSPITAL_ITEM_IDS.firstAidKit), x: 2, y: 0 },
      ],
      currentHealth: 8,
      bleeding: true,
      openWounds: [
        { id: 'scene-treated-wound', kind: 'laceration', treatment: 'treated' },
        { id: 'scene-untreated-wound', kind: 'bite', treatment: 'untreated' },
      ],
      minorContusions: 1,
    })
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    expect(button(container, '使用急救包 · 背包格 1,1 · 移除撕裂伤 1')).toBeInstanceOf(HTMLButtonElement)
    act(() => { button(container, '使用急救包 · 背包格 3,1 · 移除轻度挫伤').click() })
    expect(container.textContent).toContain('行动后流血损失1')
    act(() => { button(container, '确认执行').click() })
    const after = store.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.condition).toMatchObject({ minorContusions: 0, bleeding: true, currentHealth: 11 })
    expect(container.textContent).toContain('已移除：轻度挫伤')
  })

  it('uses the formal first-aid last-untreated-wound rule before post-action bleeding', () => {
    const phase = sceneMedicalPhase({
      backpack: [{ item: item('scene-last-wound-first-aid', HOSPITAL_ITEM_IDS.firstAidKit), x: 1, y: 1 }],
      currentHealth: config.combat.player.maxHealth,
      bleeding: true,
      openWounds: [{ id: 'scene-last-open-wound', kind: 'bite', treatment: 'untreated' }],
    })
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用急救包 · 背包格 2,2 · 移除咬伤 1').click() })
    expect(container.textContent).toContain('实际生命恢复0')
    expect(container.textContent).toContain('流血（主要效果）是 → 否')
    expect(container.textContent).toContain('行动后流血损失0')
    act(() => { button(container, '确认执行').click() })
    const after = store.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.condition).toMatchObject({
      currentHealth: config.combat.player.maxHealth,
      bleeding: false,
      openWounds: [],
    })
  })

  it('distinguishes exact-zero safety return from near-zero overtime medical return', () => {
    const make = (remainingTime: number) => sceneMedicalPhase({
      backpack: [{ item: item(`scene-exact-bandage-${remainingTime}`, HOSPITAL_ITEM_IDS.bandage), x: 0, y: 0 }],
      currentHealth: 10,
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      remainingTime,
    })
    for (const [remainingTime, expectedStatus] of [[10, 'safe-returned'], [5, 'forced-returned']] as const) {
      const storage = new MemoryStorage()
      const store = createStableRunStore({ initialPhase: make(remainingTime), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
      const container = document.createElement('div')
      const root = createRoot(container); roots.push(root)
      act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
      act(() => { button(container, '使用绷带 · 背包格 1,1').click() })
      if (remainingTime === 10) {
        expect(container.textContent).toContain('最终 Scene 状态safe-returned')
        expect(container.textContent).toContain('本次只保存 safe-returned Scene Session')
        expect(container.textContent).toContain('settle-terminal-scene')
        expect(container.textContent).not.toContain('超时债务')
      } else {
        expect(container.textContent).toContain('超时债务5')
        expect(container.textContent).toContain('有效紧急撤离时间5')
        expect(container.textContent).toContain('强制返程总损耗1')
        expect(container.textContent).toContain('本次只保存 forced-returned Scene Session')
      }
      act(() => { button(container, '确认执行').click() })
      const after = store.getState().phase
      if (after.kind !== 'scene-session') throw new Error('expected terminal Scene')
      expect(after.payload.scene.status).toBe(expectedStatus)
      expect(storage.writes).toBe(1)
      expect(container.textContent).toContain('完成返程结算')
      expect(container.textContent).toContain(
        remainingTime === 10
          ? '当前为 safe-returned Scene Session；下一步需要显式完成返程结算'
          : '当前为 forced-returned Scene Session；下一步需要显式完成返程结算',
      )
    }
  })

  it('invalidates stale medical source, target, and daily-state previews after canonical changes', () => {
    const cases = [
      {
        phase: sceneMedicalPhase({
          backpack: [{ item: item('stale-source-bandage', HOSPITAL_ITEM_IDS.bandage), x: 0, y: 0 }],
          currentHealth: 10,
        }),
        openLabel: '使用绷带 · 背包格 1,1',
        externalLabel: '使用绷带 · 背包格 1,1',
      },
      {
        phase: sceneMedicalPhase({
          backpack: [
            { item: item('stale-target-bandage-a', HOSPITAL_ITEM_IDS.bandage), x: 0, y: 0 },
            { item: item('stale-target-bandage-b', HOSPITAL_ITEM_IDS.bandage), x: 2, y: 0 },
          ],
          bleeding: true,
          openWounds: [{ id: 'stale-target-wound', kind: 'laceration', treatment: 'untreated' }],
        }),
        openLabel: '使用绷带 · 背包格 1,1 · 处理撕裂伤 1',
        externalLabel: '使用绷带 · 背包格 3,1 · 处理撕裂伤 1',
      },
      {
        phase: sceneMedicalPhase({
          backpack: [
            { item: item('stale-daily-disinfectant-a', HOSPITAL_ITEM_IDS.disinfectant), x: 0, y: 0 },
            { item: item('stale-daily-disinfectant-b', HOSPITAL_ITEM_IDS.disinfectant), x: 2, y: 0 },
          ],
          pendingInfectionExposures: 2,
        }),
        openLabel: '使用消毒剂 · 背包格 1,1',
        externalLabel: '使用消毒剂 · 背包格 3,1',
      },
      {
        phase: sceneMedicalPhase({
          backpack: [
            { item: item('stale-analgesia-painkiller-a', HOSPITAL_ITEM_IDS.painkiller), x: 0, y: 0 },
            { item: item('stale-analgesia-painkiller-b', HOSPITAL_ITEM_IDS.painkiller), x: 2, y: 0 },
          ],
          minorContusions: 1,
        }),
        openLabel: '使用止痛药 · 背包格 1,1',
        externalLabel: '使用止痛药 · 背包格 3,1',
      },
    ]
    for (const { phase, openLabel, externalLabel } of cases) {
      const storage = new MemoryStorage()
      const store = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
      const interaction = createStableRunUiInteractionModel(store.getState().phase, uiDependencies)
      const external = interaction.actions.find(({ label }) => label === externalLabel)
      if (!external) throw new Error('expected external medical action')
      const container = document.createElement('div')
      const root = createRoot(container); roots.push(root)
      act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
      act(() => { button(container, openLabel).click() })
      expect(container.querySelector('[role="dialog"]')).not.toBeNull()
      act(() => { store.dispatch(external.command) })
      expect(container.querySelector('[role="dialog"]')).toBeNull()
      expect(storage.writes).toBe(1)
    }
  })

  it('retains committed disinfectant effects after one failed save without retry or rollback', () => {
    const phase = sceneMedicalPhase({
      backpack: [{ item: item('failed-save-disinfectant', HOSPITAL_ITEM_IDS.disinfectant), x: 0, y: 0 }],
      pendingInfectionExposures: 2,
    })
    const storage = new FailingStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用消毒剂 · 背包格 1,1').click() })
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected committed Scene')
    expect(after.payload.scene.condition.pendingInfectionExposures).toBe(1)
    expect(after.payload.scene.dailyMedicalUsage.disinfectantUsesToday).toBe(1)
    expect(after.payload.scene.backpack.items).toEqual([])
    expect(container.textContent).toContain('保存失败')
  })

  it('keeps Scene Medical StrictMode mount and Preview side-effect free', () => {
    const phase = sceneMedicalPhase({
      backpack: [{ item: item('strict-medical-bandage', HOSPITAL_ITEM_IDS.bandage), x: 0, y: 0 }],
      currentHealth: 10,
    })
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    const before = inner.getState()
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StrictMode><StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} /></StrictMode>) })
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
    expect(inner.getState()).toBe(before)
    act(() => { button(container, '使用绷带 · 背包格 1,1').click() })
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(inner.getState()).toBe(before)
  })

  it('maps every formal Scene Battery pair to explicit identity-safe actions and previews without side effects', () => {
    const phase = sceneBatteryPhase({
      batteries: [
        { item: { ...item('hidden-battery-a', HOSPITAL_ITEM_IDS.standardBattery), quantity: 2 }, x: 0, y: 0 },
        { item: item('hidden-battery-b', HOSPITAL_ITEM_IDS.standardBattery), x: 1, y: 0 },
      ],
      backpackFlashlight: {
        item: item('hidden-pack-flashlight', HOSPITAL_ITEM_IDS.flashlight),
        x: 2,
        y: 0,
      },
      charge: 2,
    })
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    const before = inner.getState()
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    const labels = [
      '使用通用电池 · 背包格 1,1 → 手电筒 · 背包格 3,1',
      '使用通用电池 · 背包格 1,1 → 手电筒 · 实用装备位',
      '使用通用电池 · 背包格 2,1 → 手电筒 · 背包格 3,1',
      '使用通用电池 · 背包格 2,1 → 手电筒 · 实用装备位',
    ]
    for (const label of labels) expect(button(container, label)).toBeInstanceOf(HTMLButtonElement)
    act(() => { button(container, labels[1]!).click() })
    expect(container.textContent).toContain('电池数量2 → 1')
    expect(container.textContent).toContain('电量2 → 3')
    expect(container.textContent).toContain('实际恢复1')
    expect(container.textContent).toContain('未使用恢复量2')
    expect(container.textContent).toContain('行动时间10')
    expect(container.textContent).toContain('完成节点急诊大厅')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
    expect(inner.getState()).toBe(before)
    for (const hidden of [
      'hidden-battery-a',
      'hidden-battery-b',
      'hidden-pack-flashlight',
      'batteryInstanceId',
      'targetInstanceId',
      'effects',
      'snapshot',
      'sceneInstanceId',
      'runSeed',
      'rulesVersion',
    ]) expect(container.innerHTML).not.toContain(hidden)

    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    const after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.backpack.items).toContainEqual({
      instanceId: 'hidden-battery-a',
      definitionId: HOSPITAL_ITEM_IDS.standardBattery,
      quantity: 1,
    })
    expect(getItemState(after.payload.scene.itemStates, 'hidden-battery-a').resource).toEqual({ kind: 'none' })
    expect(getItemState(after.payload.scene.itemStates, after.payload.scene.equipment.utility!.instanceId).resource).toEqual({ kind: 'charge', current: 3 })
    expect(container.textContent).toContain('场景充能结果')
    expect(container.textContent).toContain('本次充能完成后可继续探索')
    expect(notifications).toBe(1)
    for (const hidden of [
      'hidden-battery-a',
      'hidden-battery-b',
      'hidden-pack-flashlight',
      'batteryInstanceId',
      'targetInstanceId',
      'effects',
      'snapshot',
    ]) expect(container.innerHTML).not.toContain(hidden)
  })

  it('uses the post-consumption backpack truth for load and return Preview', () => {
    const metal = [5, 5, 5, 1].map((quantity, index) => ({
      item: { ...item(`battery-load-metal-${index}`, HOSPITAL_ITEM_IDS.metalParts), quantity },
      x: index + 1,
      y: 0,
    }))
    const phase = sceneBatteryPhase({
      batteries: [{ item: item('battery-load-source', HOSPITAL_ITEM_IDS.standardBattery), x: 0, y: 0 }],
      extraBackpack: metal,
      charge: 0,
    })
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用通用电池 · 背包格 1,1 → 手电筒 · 实用装备位').click() })
    expect(container.textContent).toContain('背包负重17 → 16')
    expect(container.textContent).toContain('行动后负重状态正常')
    expect(container.textContent).toContain('行动时间10')
    expect(container.textContent).toContain('行动后预计返程10')
  })

  it('keeps exact-zero, overtime, and death Scene Battery terminal semantics explicit', () => {
    const cases = [
      {
        phase: sceneBatteryPhase({ remainingTime: 10, currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom }),
        status: 'safe-returned',
        preview: ['最终 Scene 状态safe-returned', '本次只保存 safe-returned Scene Session'],
      },
      {
        phase: sceneBatteryPhase({ remainingTime: 5, currentNodeId: HOSPITAL_NODE_IDS.emergencyHall }),
        status: 'forced-returned',
        preview: ['超时债务5', '强制返程目标电梯前室', '本次只保存 forced-returned Scene Session'],
      },
      {
        phase: sceneBatteryPhase({ remainingTime: 5, currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom }),
        status: 'forced-returned',
        preview: ['超时债务5', '有效紧急撤离时间5', '本次只保存 forced-returned Scene Session'],
      },
      {
        phase: sceneBatteryPhase({ currentHealth: 1, bleeding: true, remainingTime: 50 }),
        status: 'dead',
        preview: ['行动后流血损失1', '返程延续行动后流血导致死亡，无法进入返程阶段'],
      },
      {
        phase: sceneBatteryPhase({ currentHealth: 1, bleeding: false, remainingTime: 5 }),
        status: 'dead',
        preview: ['强制返程总损耗1', '返程延续紧急返程损耗导致死亡，未能完成安全返程'],
      },
    ] as const
    for (const entry of cases) {
      const storage = new MemoryStorage()
      const tracked = trackedStore(createStableRunStore({ initialPhase: entry.phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry }))
      const container = document.createElement('div')
      const root = createRoot(container); roots.push(root)
      act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
      act(() => { button(container, '使用通用电池 · 背包格 1,1 → 手电筒 · 实用装备位').click() })
      for (const text of entry.preview) expect(container.textContent).toContain(text)
      if (entry.status === 'dead') expect(container.textContent).not.toContain('强制返程目标电梯前室')
      act(() => { button(container, '确认执行').click() })
      expect(tracked.commands).toHaveLength(1)
      expect(storage.writes).toBe(1)
      const after = tracked.store.getState().phase
      if (after.kind !== 'scene-session') throw new Error('expected terminal Scene')
      expect(after.payload.scene.status).toBe(entry.status)
      expect(container.textContent).toContain(entry.status === 'dead' ? '结算战败' : '完成返程结算')
      expect(tracked.commands).toHaveLength(1)
    }
  })

  it('does not offer Scene Battery actions for full targets or unavailable Scene states', () => {
    const full = sceneBatteryPhase({ charge: 3 })
    expect(createStableRunUiInteractionModel(full, uiDependencies).actions.some(
      ({ kind }) => kind === 'scene-battery',
    )).toBe(false)
    const noBattery = sceneMedicalPhase()
    expect(createStableRunUiInteractionModel(noBattery, uiDependencies).actions.some(
      ({ kind }) => kind === 'scene-battery',
    )).toBe(false)
    const timeZero = sceneBatteryPhase({ remainingTime: 0, currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom })
    expect(createStableRunUiInteractionModel(timeZero, uiDependencies).actions.some(
      ({ kind }) => kind === 'scene-battery',
    )).toBe(false)
    expect(createStableRunUiInteractionModel(combatPhase(), uiDependencies).actions.some(
      ({ kind }) => kind === 'scene-battery',
    )).toBe(false)
    for (const terminal of [terminalSafeSession(), terminalDeadSession()]) {
      expect(createStableRunUiInteractionModel({ kind: 'scene-session', payload: terminal }, uiDependencies).actions.some(
        ({ kind }) => kind === 'scene-battery',
      )).toBe(false)
    }
  })

  it('invalidates stale Scene Battery source and full-target Previews', () => {
    const phase = sceneBatteryPhase({
      batteries: [
        { item: item('stale-battery-a', HOSPITAL_ITEM_IDS.standardBattery), x: 0, y: 0 },
        { item: item('stale-battery-b', HOSPITAL_ITEM_IDS.standardBattery), x: 1, y: 0 },
      ],
      charge: 0,
    })
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const interaction = createStableRunUiInteractionModel(phase, uiDependencies)
    const external = interaction.actions.find(({ label }) => label.startsWith('使用通用电池 · 背包格 2,1'))
    if (!external) throw new Error('expected second battery action')
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用通用电池 · 背包格 1,1 → 手电筒 · 实用装备位').click() })
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
    act(() => { store.dispatch(external.command) })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(storage.writes).toBe(1)
    expect(createStableRunUiInteractionModel(store.getState().phase, uiDependencies).actions.some(
      ({ kind }) => kind === 'scene-battery',
    )).toBe(false)

    const sourcePhase = sceneBatteryPhase({
      batteries: [{ item: item('stale-single-battery', HOSPITAL_ITEM_IDS.standardBattery), x: 0, y: 0 }],
      backpackFlashlight: {
        item: item('stale-source-pack-flashlight', HOSPITAL_ITEM_IDS.flashlight),
        x: 2,
        y: 0,
      },
      charge: 0,
    })
    const sourceStorage = new MemoryStorage()
    const sourceStore = createStableRunStore({ initialPhase: sourcePhase, storage: sourceStorage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const sourceInteraction = createStableRunUiInteractionModel(sourcePhase, uiDependencies)
    const sourceExternal = sourceInteraction.actions.find(({ label }) =>
      label.endsWith('手电筒 · 背包格 3,1'))
    if (!sourceExternal) throw new Error('expected alternate target action')
    const sourceContainer = document.createElement('div')
    const sourceRoot = createRoot(sourceContainer); roots.push(sourceRoot)
    act(() => { sourceRoot.render(<StableRunUiApp store={sourceStore} presentationDependencies={uiDependencies} />) })
    act(() => { button(sourceContainer, '使用通用电池 · 背包格 1,1 → 手电筒 · 实用装备位').click() })
    expect(sourceContainer.querySelector('[role="dialog"]')).not.toBeNull()
    act(() => { sourceStore.dispatch(sourceExternal.command) })
    expect(sourceContainer.querySelector('[role="dialog"]')).toBeNull()
    expect(sourceStorage.writes).toBe(1)
    const sourceAfter = sourceStore.getState().phase
    if (sourceAfter.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(sourceAfter.payload.scene.backpack.items.some(
      ({ instanceId }) => instanceId === 'stale-single-battery',
    )).toBe(false)
    expect(getItemState(sourceAfter.payload.scene.itemStates, sourceAfter.payload.scene.equipment.utility!.instanceId).resource).toEqual({ kind: 'charge', current: 0 })
  })

  it('retains committed Scene Battery effects after one failed save without retry or rollback', () => {
    const phase = sceneBatteryPhase({ charge: 0 })
    const storage = new FailingStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '使用通用电池 · 背包格 1,1 → 手电筒 · 实用装备位').click() })
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected committed Scene')
    expect(after.payload.scene.backpack.items).toEqual([])
    expect(getItemState(after.payload.scene.itemStates, after.payload.scene.equipment.utility!.instanceId).resource).toEqual({ kind: 'charge', current: 3 })
    expect(container.textContent).toContain('保存失败')
  })

  it('keeps Scene Battery StrictMode mount and Preview side-effect free', () => {
    const phase = sceneBatteryPhase()
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    const before = inner.getState()
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StrictMode><StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} /></StrictMode>) })
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
    expect(inner.getState()).toBe(before)
    act(() => { button(container, '使用通用电池 · 背包格 1,1 → 手电筒 · 实用装备位').click() })
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
    expect(inner.getState()).toBe(before)
  })

  it('moves and rotates the same resource item at zero time without post-action bleeding', () => {
    const flashlight = item('inventory-hidden-flashlight', HOSPITAL_ITEM_IDS.flashlight)
    const phase = sceneInventoryPhase({
      backpack: [{ item: flashlight, x: 0, y: 0 }],
      resourceCurrent: { [flashlight.instanceId]: 1 },
      currentHealth: 1,
      bleeding: true,
      remainingTime: 50,
    })
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    act(() => { button(container, '整理 手电筒 · 背包格 1,1').click() })
    act(() => { button(container, '移动／旋转').click() })
    act(() => { input(container, '旋转整理物品').click() })
    act(() => { button(container, '格子 3,2').click() })
    expect(container.textContent).toContain('背包负重1 → 1')
    expect(container.textContent).toContain('Scene 时间50 → 50（不消耗）')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)

    act(() => { button(container, '确认整理').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.backpack.items).toContainEqual(flashlight)
    expect(after.payload.scene.backpack.placements).toContainEqual({
      instanceId: flashlight.instanceId,
      x: 2,
      y: 1,
      rotated: true,
    })
    expect(getItemState(after.payload.scene.itemStates, flashlight.instanceId).resource)
      .toEqual({ kind: 'charge', current: 1 })
    expect(after.payload.scene).toMatchObject({
      status: 'active',
      remainingTime: 50,
      condition: { currentHealth: 1, bleeding: true },
    })
    expect(container.textContent).toContain('场景整理结果')
    for (const hidden of [
      flashlight.instanceId,
      'instanceId',
      'sourceInstanceId',
      'targetInstanceId',
      'splitInstanceId',
      'SceneInventoryAudit',
      'effects',
      'snapshot',
      'sceneInstanceId',
      'runSeed',
      'rulesVersion',
    ]) expect(container.innerHTML).not.toContain(hidden)
  })

  it('executes explicit split, partial merge, and full merge as three separate transactions', () => {
    const source = { ...item('inventory-merge-source', HOSPITAL_ITEM_IDS.bandage), quantity: 3 }
    const target = item('inventory-merge-target', HOSPITAL_ITEM_IDS.bandage)
    const phase = sceneInventoryPhase({ backpack: [
      { item: source, x: 0, y: 0 },
      { item: target, x: 2, y: 0 },
    ] })
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    act(() => { button(container, '整理 绷带 ×3 · 背包格 1,1').click() })
    act(() => { button(container, '拆分堆叠').click() })
    act(() => { setInputValue(input(container, '整理数量'), '1') })
    act(() => { button(container, '格子 2,1').click() })
    act(() => { button(container, '确认整理').click() })
    act(() => { button(container, '关闭结果').click() })
    let after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    const split = after.payload.scene.backpack.items.find(
      ({ instanceId }) => instanceId !== source.instanceId && instanceId !== target.instanceId,
    )!
    expect(split).toMatchObject({ definitionId: HOSPITAL_ITEM_IDS.bandage, quantity: 1 })
    expect(split.instanceId).toContain('scene-backpack-split:')
    expect(after.payload.scene.backpack.items.find(({ instanceId }) => instanceId === source.instanceId)?.quantity).toBe(2)

    act(() => { button(container, '整理 绷带 ×2 · 背包格 1,1').click() })
    act(() => { button(container, '合并堆叠').click() })
    act(() => { setInputValue(input(container, '整理数量'), '1') })
    act(() => { button(container, '绷带 · 背包格 3,1').click() })
    act(() => { button(container, '确认整理').click() })
    act(() => { button(container, '关闭结果').click() })
    after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.backpack.items.find(({ instanceId }) => instanceId === source.instanceId)?.quantity).toBe(1)
    expect(after.payload.scene.backpack.items.find(({ instanceId }) => instanceId === target.instanceId)?.quantity).toBe(2)

    act(() => { button(container, '整理 绷带 · 背包格 1,1').click() })
    act(() => { button(container, '合并堆叠').click() })
    act(() => { setInputValue(input(container, '整理数量'), '1') })
    act(() => { button(container, '绷带 ×2 · 背包格 3,1').click() })
    act(() => { button(container, '确认整理').click() })
    after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.backpack.items.some(({ instanceId }) => instanceId === source.instanceId)).toBe(false)
    expect(after.payload.scene.itemStates.states.some(({ instanceId }) => instanceId === source.instanceId)).toBe(false)
    expect(after.payload.scene.backpack.items.find(({ instanceId }) => instanceId === target.instanceId)?.quantity).toBe(3)
    expect(after.payload.scene.backpack.items).toContainEqual(split)
    expect(after.payload.scene.remainingTime).toBe(phase.payload.scene.remainingTime)
    expect(tracked.commands).toHaveLength(3)
    expect(storage.writes).toBe(3)
  })

  it('moves one real stack unit through an explicit quick slot and refreshes load and return facts', () => {
    const metal = [0, 1, 2].map((index) => ({
      item: { ...item(`inventory-weight-metal-${index}`, HOSPITAL_ITEM_IDS.metalParts), quantity: 5 },
      x: index,
      y: 0,
    }))
    const bandage = { ...item('inventory-weight-bandage', HOSPITAL_ITEM_IDS.bandage), quantity: 2 }
    const phase = sceneInventoryPhase({ backpack: [
      ...metal,
      { item: bandage, x: 3, y: 0 },
    ] })
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })

    act(() => { button(container, '整理 绷带 ×2 · 背包格 4,1').click() })
    act(() => { button(container, '放入快捷栏').click() })
    act(() => { button(container, '快捷栏2 · 空').click() })
    expect(container.textContent).toContain('背包负重17 → 16')
    expect(container.textContent).toContain('负重状态负载 → 正常')
    act(() => { button(container, '确认整理').click() })
    act(() => { button(container, '关闭结果').click() })
    let after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    const quick = after.payload.scene.quickSlots.slots[1]!
    expect(quick.instanceId).not.toBe(bandage.instanceId)
    expect(after.payload.scene.backpack.items.find(({ instanceId }) => instanceId === bandage.instanceId)?.quantity).toBe(1)

    act(() => { button(container, '整理 快捷栏2 · 绷带').click() })
    act(() => { button(container, '放回背包').click() })
    act(() => { button(container, '格子 1,2').click() })
    expect(container.textContent).toContain('背包负重16 → 17')
    expect(container.textContent).toContain('负重状态正常 → 负载')
    act(() => { button(container, '确认整理').click() })
    after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.quickSlots.slots[1]).toBeNull()
    expect(after.payload.scene.backpack.items).toContainEqual(quick)
    expect(getItemState(after.payload.scene.itemStates, quick.instanceId).instanceId).toBe(quick.instanceId)
    expect(tracked.commands).toHaveLength(2)
    expect(storage.writes).toBe(2)
  })

  it('preserves a resource item identity through ordinary node drop and explicit Pickup', () => {
    const flashlight = item('inventory-drop-flashlight', HOSPITAL_ITEM_IDS.flashlight)
    const phase = sceneInventoryPhase({
      backpack: [{ item: flashlight, x: 0, y: 0 }],
      resourceCurrent: { [flashlight.instanceId]: 1 },
    })
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '整理 手电筒 · 背包格 1,1').click() })
    act(() => { button(container, '放到当前节点').click() })
    expect(container.textContent).toContain('整个物品实例／整个堆叠')
    act(() => { button(container, '确认整理').click() })
    act(() => { button(container, '关闭结果').click() })
    let after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    const ground = getSceneNodeItems(after.payload.scene.sceneItems, after.payload.scene.currentNodeId)
    expect(ground).toContainEqual({
      item: flashlight,
      state: expect.objectContaining({
        instanceId: flashlight.instanceId,
        resource: { kind: 'charge', current: 1 },
      }),
    })
    act(() => { button(container, '拾取 手电筒').click() })
    act(() => { button(container, '格子 1,1').click() })
    act(() => { button(container, '确认拾取').click() })
    after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.backpack.items).toContainEqual(flashlight)
    expect(getItemState(after.payload.scene.itemStates, flashlight.instanceId).resource)
      .toEqual({ kind: 'charge', current: 1 })
    expect(tracked.commands).toHaveLength(2)
    expect(storage.writes).toBe(2)
  })

  it('requires the formal quest warning and preserves the same task item through drop and re-pickup', () => {
    const sample = item('inventory-hidden-sample', HOSPITAL_ITEM_IDS.sealedPathogenCase)
    const phase = sceneInventoryPhase({ backpack: [{ item: sample, x: 0, y: 0 }] })
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '整理 密封病原样本箱 · 背包格 1,1').click() })
    act(() => { button(container, '放到当前节点').click() })
    expect(container.textContent).toContain('这是任务物品。')
    expect(container.textContent).toContain('只有重新拾取并安全返回后')
    act(() => { button(container, '确认整理').click() })
    act(() => { button(container, '关闭结果').click() })
    let after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.backpack.items).not.toContainEqual(sample)
    expect(getSceneNodeItems(after.payload.scene.sceneItems, after.payload.scene.currentNodeId))
      .toContainEqual(expect.objectContaining({ item: sample }))
    expect(after.payload.context.runReturnCarryForward.storedInventory.taskStorage.items).toEqual([])
    act(() => { button(container, '拾取 密封病原样本箱').click() })
    act(() => { button(container, '格子 1,1').click() })
    act(() => { button(container, '确认拾取').click() })
    after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.backpack.items).toContainEqual(sample)
    expect(after.payload.context.runReturnCarryForward.storedInventory.taskStorage.items).toEqual([])
    expect(tracked.commands).toHaveLength(2)
    expect(storage.writes).toBe(2)
    expect(container.innerHTML).not.toContain(sample.instanceId)
  })

  it('drops a permission card as a physical item and immediately refreshes access truth', () => {
    const card = item('inventory-permission-card', HOSPITAL_ITEM_IDS.isolationWardAccessCard)
    const phase = sceneInventoryPhase({
      backpack: [{ item: card, x: 0, y: 0 }],
      currentNodeId: HOSPITAL_NODE_IDS.securityOffice,
    })
    expect(createStableRunUiInteractionModel(phase, uiDependencies).actions.map(({ label }) => label))
      .toContain('前往 隔离走廊')
    const intelBefore = phase.payload.scene.runIntelLog
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '整理 隔离区门禁卡 · 背包格 1,1').click() })
    act(() => { button(container, '放到当前节点').click() })
    expect(container.textContent).not.toContain('这是任务物品。')
    act(() => { button(container, '确认整理').click() })
    const after = store.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(getSceneNodeItems(after.payload.scene.sceneItems, after.payload.scene.currentNodeId))
      .toContainEqual(expect.objectContaining({ item: card }))
    expect(after.payload.scene.runIntelLog).toEqual(intelBefore)
    expect(createStableRunUiInteractionModel(after, uiDependencies).actions.map(({ label }) => label))
      .not.toContain('前往 隔离走廊')
  })

  it('keeps the formal 28-to-29 quick-slot rejection presentation-only', () => {
    const heavy = [5, 5, 5, 5, 5, 3].map((quantity, index) => ({
      item: { ...item(`inventory-carry-${index}`, HOSPITAL_ITEM_IDS.metalParts), quantity },
      x: index,
      y: 0,
    }))
    const quick = item('inventory-carry-quick', HOSPITAL_ITEM_IDS.bandage)
    const phase = sceneInventoryPhase({ backpack: heavy, quickSlots: [quick, null] })
    const storage = new MemoryStorage()
    const tracked = trackedStore(createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry }))
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '整理 快捷栏1 · 绷带').click() })
    act(() => { button(container, '放回背包').click() })
    act(() => { button(container, '格子 1,2').click() })
    expect(container.textContent).toContain('无法携带状态')
    expect(button(container, '确认整理').disabled).toBe(true)
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
  })

  it('retains one committed quick-slot split after save failure without retry or duplication', () => {
    const bandage = { ...item('inventory-failed-bandage', HOSPITAL_ITEM_IDS.bandage), quantity: 2 }
    const phase = sceneInventoryPhase({ backpack: [{ item: bandage, x: 0, y: 0 }] })
    const storage = new FailingStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '整理 绷带 ×2 · 背包格 1,1').click() })
    act(() => { button(container, '放入快捷栏').click() })
    act(() => { button(container, '快捷栏1 · 空').click() })
    act(() => { button(container, '确认整理').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const after = inner.getState().phase
    if (after.kind !== 'scene-session') throw new Error('expected Scene session')
    expect(after.payload.scene.backpack.items).toContainEqual({ ...bandage, quantity: 1 })
    const quick = after.payload.scene.quickSlots.slots[0]!
    expect(quick).toMatchObject({ definitionId: HOSPITAL_ITEM_IDS.bandage, quantity: 1 })
    expect(quick.instanceId).not.toBe(bandage.instanceId)
    expect(after.payload.scene.itemStates.states.filter(
      ({ instanceId }) => instanceId === quick.instanceId,
    )).toHaveLength(1)
    expect(container.textContent).toContain('保存失败')
  })

  it('keeps StrictMode Inventory selection side-effect free and closes a stale source', () => {
    const flashlight = item('inventory-stale-flashlight', HOSPITAL_ITEM_IDS.flashlight)
    const phase = sceneInventoryPhase({ backpack: [{ item: flashlight, x: 0, y: 0 }] })
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const before = inner.getState()
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StrictMode><StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} /></StrictMode>) })
    act(() => { button(container, '整理 手电筒 · 背包格 1,1').click() })
    act(() => { button(container, '放到当前节点').click() })
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
    expect(inner.getState()).toBe(before)

    const opportunity = createStableRunUiInteractionModel(phase, uiDependencies)
      .inventoryOpportunities.find(({ sourceInstanceId }) => sourceInstanceId === flashlight.instanceId)!
    const external = previewStableRunUiSceneInventoryDraft(phase, {
      opportunityId: opportunity.id,
      operation: 'drop',
      quantity: null,
      targetOpportunityId: null,
      targetSlotIndex: null,
      x: null,
      y: null,
      rotated: false,
    }, uiDependencies)
    if (!external?.canExecute || !external.command) throw new Error('expected formal external drop')
    act(() => { inner.dispatch(external.command) })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
  })

  it('projects all twelve formal Hub loadout operations without task-storage actions', () => {
    const phase = createHubLoadoutPhase()
    const opportunities = createStableRunUiInteractionModel(phase, uiDependencies).hubLoadoutOpportunities
    const operations = new Set(opportunities.flatMap(({ operations }) => operations))
    expect([...operations].sort()).toEqual([
      'backpack-to-quick-slot', 'backpack-to-warehouse', 'equip-from-backpack',
      'merge-backpack-stacks', 'move-backpack-item', 'move-quick-slot-item',
      'quick-slot-to-backpack', 'split-backpack-stack', 'swap-backpack-equipped',
      'swap-quick-slot-items', 'unequip-to-backpack', 'warehouse-to-backpack',
    ])
    expect(opportunities.some(({ sourceInstanceId }) => sourceInstanceId === 'hub-ui-task-case')).toBe(false)
    expect(createStableRunUiInteractionModel({ kind: 'scene-session', payload: sceneSessionAtEmergencyHall() }, uiDependencies).hubLoadoutOpportunities).toEqual([])
  })

  it('forms a formal hub-loadout application command for every one of the twelve UI operations', () => {
    const base = createHubLoadoutPhase()
    const opportunities = createStableRunUiInteractionModel(base, uiDependencies).hubLoadoutOpportunities
    const byId = (instanceId: string) => opportunities.find((candidate) => candidate.sourceInstanceId === instanceId)!
    const targetBandage = byId('hub-ui-backpack-bandage-target')
    const equipped = byId('hub-ui-equipped-pipe')
    const drafts = [
      { source: byId('hub-ui-warehouse-bandage'), operation: 'warehouse-to-backpack', x: 0, y: 2 },
      { source: byId('hub-ui-backpack-painkiller'), operation: 'backpack-to-warehouse' },
      { source: byId('hub-ui-backpack-painkiller'), operation: 'move-backpack-item', x: 1, y: 2 },
      { source: byId('hub-ui-backpack-bandage'), operation: 'split-backpack-stack', quantity: 1, x: 3, y: 1 },
      { source: byId('hub-ui-backpack-bandage'), operation: 'merge-backpack-stacks', quantity: 1, targetOpportunityId: targetBandage.id },
      { source: byId('hub-ui-backpack-coat'), operation: 'equip-from-backpack', targetEquipmentSlot: 'armor' },
      { source: equipped, operation: 'unequip-to-backpack', x: 0, y: 1 },
      { source: byId('hub-ui-backpack-pipe'), operation: 'swap-backpack-equipped', targetOpportunityId: equipped.id, x: 0, y: 1 },
      { source: byId('hub-ui-backpack-painkiller'), operation: 'backpack-to-quick-slot', targetQuickSlotIndex: 1 },
      { source: byId('hub-ui-quick-bandage'), operation: 'quick-slot-to-backpack', x: 0, y: 2 },
      { source: byId('hub-ui-quick-bandage'), operation: 'move-quick-slot-item', targetQuickSlotIndex: 1 },
    ] as const
    const commandKinds: string[] = []
    for (const candidate of drafts) {
      const preview = previewStableRunUiHubLoadoutDraft(base, {
        opportunityId: candidate.source.id,
        operation: candidate.operation,
        quantity: 'quantity' in candidate ? candidate.quantity : null,
        targetOpportunityId: 'targetOpportunityId' in candidate ? candidate.targetOpportunityId : null,
        targetEquipmentSlot: 'targetEquipmentSlot' in candidate ? candidate.targetEquipmentSlot : null,
        targetQuickSlotIndex: 'targetQuickSlotIndex' in candidate ? candidate.targetQuickSlotIndex : null,
        x: 'x' in candidate ? candidate.x : null,
        y: 'y' in candidate ? candidate.y : null,
        rotated: false,
      }, uiDependencies)
      expect(preview?.canExecute, candidate.operation).toBe(true)
      if (!preview?.command || preview.command.kind !== 'hub' || preview.command.command.kind !== 'hub-loadout') throw new Error(`missing ${candidate.operation}`)
      commandKinds.push(preview.command.command.command.kind)
    }
    const swapPhase = createHubLoadoutPhase({ bothQuickSlots: true })
    const swapOpportunities = createStableRunUiInteractionModel(swapPhase, uiDependencies).hubLoadoutOpportunities
    const quick = swapOpportunities.find(({ sourceInstanceId }) => sourceInstanceId === 'hub-ui-quick-bandage')!
    const swap = previewStableRunUiHubLoadoutDraft(swapPhase, {
      opportunityId: quick.id, operation: 'swap-quick-slot-items', quantity: null,
      targetOpportunityId: null, targetEquipmentSlot: null, targetQuickSlotIndex: 1,
      x: null, y: null, rotated: false,
    }, uiDependencies)
    expect(swap?.canExecute).toBe(true)
    if (!swap?.command || swap.command.kind !== 'hub' || swap.command.command.kind !== 'hub-loadout') throw new Error('missing quick swap')
    commandKinds.push(swap.command.command.command.kind)
    expect(commandKinds.sort()).toEqual([
      'backpack-to-quick-slot', 'backpack-to-warehouse', 'equip-from-backpack',
      'merge-backpack-stacks', 'move-backpack-item', 'move-quick-slot-item',
      'quick-slot-to-backpack', 'split-backpack-stack', 'swap-backpack-equipped',
      'swap-quick-slot-items', 'unequip-to-backpack', 'warehouse-to-backpack',
    ])
  })

  it('runs one explicit warehouse-to-backpack Hub command with preview, one dispatch, and one save', () => {
    const phase = createHubLoadoutPhase()
    const storage = new MemoryStorage()
    const tracked = trackedStore(createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry }))
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    expect(container.textContent).toContain('任务储存区（只读）')
    expect(container.innerHTML).not.toContain('hub-ui-task-case')
    act(() => { button(container, '整备 仓库条目1 · 绷带 ×3').click() })
    act(() => { button(container, '取出至背包').click() })
    act(() => { button(container, '格子 1,2').click() })
    expect(container.textContent).toContain('场景时间')
    expect(container.textContent).toContain('0（电梯中枢整备）')
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    act(() => { button(container, '取消').click() })
    expect(tracked.commands).toHaveLength(0)
    act(() => { button(container, '整备 仓库条目1 · 绷带 ×3').click() })
    act(() => { button(container, '取出至背包').click() })
    act(() => { button(container, '格子 1,2').click() })
    act(() => { button(container, '确认整备').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(tracked.commands[0]).toMatchObject({ kind: 'hub', command: { kind: 'hub-loadout', command: { kind: 'warehouse-to-backpack' } } })
    expect(storage.writes).toBe(1)
    const after = tracked.store.getState().phase
    if (after.kind !== 'current-day-hub') throw new Error('expected Hub')
    expect(after.payload.runLoadout.backpack.items).toContainEqual(expect.objectContaining({ instanceId: 'hub-ui-warehouse-bandage', quantity: 3 }))
    expect(after.payload.runLoadout.warehouse.items.some(({ instanceId }) => instanceId === 'hub-ui-warehouse-bandage')).toBe(false)
    expect(container.textContent).toContain('中枢整备结果')
    for (const hidden of [
      'hub-ui-warehouse-bandage', 'hub-ui-backpack-painkiller', 'hub-loadout-ui-run',
      'hub-loadout-ui-seed', config.metadata.rulesVersion, 'instanceId', 'effects',
      'snapshot', 'transitionPlan', 'RunLoadoutOperation',
    ]) expect(container.innerHTML).not.toContain(hidden)
  })

  it.each([
    ['backpack-to-warehouse', false, ['整备 止痛药 · 背包格 2,1', '存入仓库']],
    ['move-backpack-item', false, ['整备 止痛药 · 背包格 2,1', '移动／旋转', '格子 1,2']],
    ['split-backpack-stack', false, ['整备 绷带 ×2 · 背包格 1,1', '拆分堆叠', 'quantity:1', '格子 4,2']],
    ['merge-backpack-stacks', false, ['整备 绷带 ×2 · 背包格 1,1', '合并堆叠', 'quantity:1', '绷带 · 背包格 4,1']],
    ['equip-from-backpack', false, ['整备 厚实外套 · 背包格 5,1', '装备', '防具位']],
    ['unequip-to-backpack', false, ['整备 武器位 · 金属管', '卸下至背包', '格子 1,2']],
    ['swap-backpack-equipped', false, ['整备 金属管 · 背包格 3,1', '交换装备', '武器位 · 金属管', '格子 1,2']],
    ['backpack-to-quick-slot', false, ['整备 止痛药 · 背包格 2,1', '放入快捷栏', '快捷栏2 · 空']],
    ['quick-slot-to-backpack', false, ['整备 快捷栏1 · 绷带', '放回背包', '格子 1,2']],
    ['move-quick-slot-item', false, ['整备 快捷栏1 · 绷带', '移动快捷栏物品', '快捷栏2 · 空']],
    ['swap-quick-slot-items', true, ['整备 快捷栏1 · 绷带', '交换快捷栏物品', '快捷栏2 · 止痛药']],
  ] as const)('routes the %s representative DOM flow through one formal command', (kind, bothQuickSlots, steps) => {
    const storage = new MemoryStorage()
    const tracked = trackedStore(createStableRunStore({ initialPhase: createHubLoadoutPhase({ bothQuickSlots }), storage, rulesRegistry: hospitalRunSaveRulesRegistry }))
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    for (const step of steps) {
      if (step.startsWith('quantity:')) {
        act(() => { setInputValue(input(container, '中枢整备数量'), step.slice('quantity:'.length)) })
      } else {
        act(() => { button(container, step).click() })
      }
    }
    expect(button(container, '确认整备').disabled, kind).toBe(false)
    act(() => { button(container, '确认整备').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(tracked.commands[0]).toMatchObject({ kind: 'hub', command: { kind: 'hub-loadout', command: { kind } } })
    expect(storage.writes).toBe(1)
    expect(tracked.store.getState().phase.kind).toBe('current-day-hub')
  })

  it('keeps Hub loadout StrictMode previews side-effect free and preserves committed state on save failure', () => {
    const storage = new FailingStorage()
    const inner = createStableRunStore({ initialPhase: createHubLoadoutPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StrictMode><StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} /></StrictMode>) })
    act(() => { button(container, '整备 止痛药 · 背包格 2,1').click() })
    act(() => { button(container, '放入快捷栏').click() })
    expect(tracked.commands).toHaveLength(0)
    expect(storage.writes).toBe(0)
    expect(notifications).toBe(0)
    act(() => { button(container, '快捷栏1 · 绷带').click() })
    expect(container.textContent).toContain('当前来源、目标、资格、数量或摆放无法执行')
    expect(button(container, '确认整备').disabled).toBe(true)
    act(() => { button(container, '取消').click() })
    act(() => { button(container, '整备 止痛药 · 背包格 2,1').click() })
    act(() => { button(container, '存入仓库').click() })
    act(() => { button(container, '确认整备').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const after = inner.getState().phase
    if (after.kind !== 'current-day-hub') throw new Error('expected Hub')
    expect(after.payload.runLoadout.warehouse.items).toContainEqual(expect.objectContaining({ instanceId: 'hub-ui-backpack-painkiller' }))
    expect(container.textContent).toContain('保存失败')
  })

  it('retains one formal Hub backpack split and ItemState after a failed save without retry', () => {
    const storage = new FailingStorage()
    const inner = createStableRunStore({ initialPhase: createHubLoadoutPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
    let notifications = 0
    inner.subscribe(() => { notifications += 1 })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '整备 绷带 ×2 · 背包格 1,1').click() })
    act(() => { button(container, '拆分堆叠').click() })
    act(() => { setInputValue(input(container, '中枢整备数量'), '1') })
    act(() => { button(container, '格子 4,2').click() })
    act(() => { button(container, '确认整备').click() })
    expect(tracked.commands).toHaveLength(1)
    expect(storage.writes).toBe(1)
    expect(notifications).toBe(1)
    const after = inner.getState().phase
    if (after.kind !== 'current-day-hub') throw new Error('expected Hub')
    expect(after.payload.runLoadout.backpack.items.find(({ instanceId }) => instanceId === 'hub-ui-backpack-bandage')?.quantity).toBe(1)
    const splits = after.payload.runLoadout.backpack.items.filter(({ definitionId, instanceId }) => definitionId === HOSPITAL_ITEM_IDS.bandage && instanceId !== 'hub-ui-backpack-bandage' && instanceId !== 'hub-ui-backpack-bandage-target')
    expect(splits).toHaveLength(1)
    expect(splits[0].quantity).toBe(1)
    expect(after.payload.runLoadout.itemStates.states.filter(({ instanceId }) => instanceId === splits[0].instanceId)).toHaveLength(1)
    expect(container.textContent).toContain('保存失败')
  })

  it('keeps Hub loadout identities through four explicit saves and the following Scene Launch', () => {
    const storage = new MemoryStorage()
    const tracked = trackedStore(createStableRunStore({ initialPhase: createHubLoadoutLaunchPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry }))
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={tracked.store} presentationDependencies={uiDependencies} />) })
    const perform = (steps: readonly string[]) => {
      for (const step of steps) act(() => { buttonContaining(container, step).click() })
      act(() => { button(container, '确认整备').click() })
      act(() => { button(container, '关闭结果').click() })
    }
    perform(['整备 仓库条目2 · 金属管', '取出至背包', '格子 1,1'])
    perform(['整备 金属管 · 背包格 1,1', '装备', '武器位'])
    perform(['整备 仓库条目1 · 绷带 ×2', '取出至背包', '格子 2,1'])
    perform(['整备 绷带 ×2 · 背包格 2,1', '放入快捷栏', '快捷栏1 · 空'])
    expect(tracked.commands).toHaveLength(4)
    expect(storage.writes).toBe(4)
    act(() => { button(container, '进入 封锁医院·急诊楼一层').click() })
    act(() => { button(container, '确认执行').click() })
    expect(tracked.commands).toHaveLength(5)
    expect(storage.writes).toBe(5)
    const scene = tracked.store.getState().phase
    if (scene.kind !== 'scene-session') throw new Error('expected Scene')
    expect(scene.payload.scene.equipment.weapon?.instanceId).toBe('hub-launch-pipe')
    const quick = scene.payload.scene.quickSlots.slots[0]
    expect(quick?.definitionId).toBe(HOSPITAL_ITEM_IDS.bandage)
    expect(quick?.quantity).toBe(1)
    expect(scene.payload.scene.itemStates.states.some(({ instanceId }) => instanceId === 'hub-launch-pipe')).toBe(true)
    expect(quick && scene.payload.scene.itemStates.states.some(({ instanceId }) => instanceId === quick.instanceId)).toBe(true)
    expect(createStableRunUiInteractionModel(scene, uiDependencies).hubLoadoutOpportunities).toEqual([])
  })

  it('rebuilds Hub drafts from the latest canonical phase and closes a removed source', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: createHubLoadoutPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={inner} presentationDependencies={uiDependencies} />) })
    act(() => { button(container, '整备 仓库条目1 · 绷带 ×3').click() })
    act(() => { button(container, '取出至背包').click() })
    act(() => { button(container, '格子 1,2').click() })
    expect(button(container, '确认整备').disabled).toBe(false)
    const phase = inner.getState().phase
    const opportunities = createStableRunUiInteractionModel(phase, uiDependencies).hubLoadoutOpportunities
    const painkiller = opportunities.find(({ sourceInstanceId }) => sourceInstanceId === 'hub-ui-backpack-painkiller')!
    const occupy = previewStableRunUiHubLoadoutDraft(phase, {
      opportunityId: painkiller.id, operation: 'move-backpack-item', quantity: null,
      targetOpportunityId: null, targetEquipmentSlot: null, targetQuickSlotIndex: null,
      x: 0, y: 1, rotated: false,
    }, uiDependencies)
    if (!occupy?.command) throw new Error('expected external move')
    act(() => { inner.dispatch(occupy.command!) })
    expect(container.textContent).toContain('当前来源、目标、资格、数量或摆放无法执行')
    expect(button(container, '确认整备').disabled).toBe(true)
    act(() => { button(container, '取消').click() })
    act(() => { button(container, '整备 仓库条目2 · 金属管').click() })
    act(() => { button(container, '取出至背包').click() })
    const latest = inner.getState().phase
    const pipe = createStableRunUiInteractionModel(latest, uiDependencies).hubLoadoutOpportunities.find(({ sourceInstanceId }) => sourceInstanceId === 'hub-ui-warehouse-pipe')!
    const remove = previewStableRunUiHubLoadoutDraft(latest, {
      opportunityId: pipe.id, operation: 'warehouse-to-backpack', quantity: null,
      targetOpportunityId: null, targetEquipmentSlot: null, targetQuickSlotIndex: null,
      x: 1, y: 1, rotated: false,
    }, uiDependencies)
    if (!remove?.command) throw new Error('expected external warehouse transfer')
    act(() => { inner.dispatch(remove.command!) })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(storage.writes).toBe(2)
  })

  it('invalidates stale merge, equipment, and quick-slot targets against the latest Hub', () => {
    const executeExternal = (phase: ReturnType<typeof createHubLoadoutPhase>, draft: Parameters<typeof previewStableRunUiHubLoadoutDraft>[1]) => {
      const storage = new MemoryStorage()
      const store = createStableRunStore({ initialPhase: phase, storage, rulesRegistry: hospitalRunSaveRulesRegistry })
      const preview = previewStableRunUiHubLoadoutDraft(phase, draft, uiDependencies)
      if (!preview?.command) throw new Error('expected external Hub command')
      store.dispatch(preview.command)
      return store.getState().phase
    }

    const mergePhase = createHubLoadoutPhase()
    const mergeOpportunities = createStableRunUiInteractionModel(mergePhase, uiDependencies).hubLoadoutOpportunities
    const mergeSource = mergeOpportunities.find(({ sourceInstanceId }) => sourceInstanceId === 'hub-ui-backpack-bandage')!
    const mergeTarget = mergeOpportunities.find(({ sourceInstanceId }) => sourceInstanceId === 'hub-ui-backpack-bandage-target')!
    const mergeDraft = { opportunityId: mergeSource.id, operation: 'merge-backpack-stacks' as const, quantity: 1, targetOpportunityId: mergeTarget.id, targetEquipmentSlot: null, targetQuickSlotIndex: null, x: null, y: null, rotated: false }
    expect(previewStableRunUiHubLoadoutDraft(mergePhase, mergeDraft, uiDependencies)?.canExecute).toBe(true)
    const afterTargetRemoved = executeExternal(mergePhase, { opportunityId: mergeTarget.id, operation: 'backpack-to-warehouse', quantity: null, targetOpportunityId: null, targetEquipmentSlot: null, targetQuickSlotIndex: null, x: null, y: null, rotated: false })
    expect(previewStableRunUiHubLoadoutDraft(afterTargetRemoved, mergeDraft, uiDependencies)?.canExecute).toBe(false)

    const equipmentPhase = createHubLoadoutPhase()
    const equipmentOpportunities = createStableRunUiInteractionModel(equipmentPhase, uiDependencies).hubLoadoutOpportunities
    const firstCoat = equipmentOpportunities.find(({ sourceInstanceId }) => sourceInstanceId === 'hub-ui-backpack-coat')!
    const secondCoat = equipmentOpportunities.find(({ sourceInstanceId }) => sourceInstanceId === 'hub-ui-backpack-coat-second')!
    const equipDraft = { opportunityId: firstCoat.id, operation: 'equip-from-backpack' as const, quantity: null, targetOpportunityId: null, targetEquipmentSlot: 'armor' as const, targetQuickSlotIndex: null, x: null, y: null, rotated: false }
    expect(previewStableRunUiHubLoadoutDraft(equipmentPhase, equipDraft, uiDependencies)?.canExecute).toBe(true)
    const afterArmorOccupied = executeExternal(equipmentPhase, { ...equipDraft, opportunityId: secondCoat.id })
    expect(previewStableRunUiHubLoadoutDraft(afterArmorOccupied, equipDraft, uiDependencies)?.canExecute).toBe(false)

    const quickPhase = createHubLoadoutPhase()
    const quickOpportunities = createStableRunUiInteractionModel(quickPhase, uiDependencies).hubLoadoutOpportunities
    const quickSource = quickOpportunities.find(({ sourceInstanceId }) => sourceInstanceId === 'hub-ui-quick-bandage')!
    const painkiller = quickOpportunities.find(({ sourceInstanceId }) => sourceInstanceId === 'hub-ui-backpack-painkiller')!
    const moveDraft = { opportunityId: quickSource.id, operation: 'move-quick-slot-item' as const, quantity: null, targetOpportunityId: null, targetEquipmentSlot: null, targetQuickSlotIndex: 1, x: null, y: null, rotated: false }
    expect(previewStableRunUiHubLoadoutDraft(quickPhase, moveDraft, uiDependencies)?.canExecute).toBe(true)
    const afterQuickOccupied = executeExternal(quickPhase, { ...moveDraft, opportunityId: painkiller.id, operation: 'backpack-to-quick-slot' })
    expect(previewStableRunUiHubLoadoutDraft(afterQuickOccupied, moveDraft, uiDependencies)?.canExecute).toBe(false)
  })
})
