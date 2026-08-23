import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_OPTION_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  HOSPITAL_OBSTACLE_IDS,
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

function createHubPhase() {
  const flashlight = item('react-flashlight', HOSPITAL_ITEM_IDS.flashlight)
  const ration = item('react-ration', HOSPITAL_ITEM_IDS.ration)
  return {
    kind: 'current-day-hub' as const,
    payload: createCurrentDayHubSnapshot({
      continuity: { runIdentity: { runId: 'react-ui-run', seed: 'react-ui-seed', rulesVersion: config.metadata.rulesVersion }, currentDay: 2, sceneInstanceId: 'returned-before-react-ui' },
      runLoadout: createRunLoadoutSnapshot({
        warehouse: { items: [ration] }, taskStorage: { items: [] },
        backpack: createBackpackSnapshot({ width: config.backpack.width, height: config.backpack.height, items: [], placements: [] }, hospitalItemCatalog),
        equipment: { weapon: null, armor: null, utility: flashlight },
        quickSlots: createQuickSlotSnapshot([null, null], config.backpack.quickSlotCount, hospitalItemCatalog, hospitalItemQuickSlotCatalog),
        itemStates: { states: [flashlight, ration].map((candidate) => createFullItemState(candidate, hospitalItemResourceCatalog)) },
      }, { physicalCatalog: hospitalItemCatalog, equipmentCatalog: hospitalItemEquipmentCatalog, quickSlotCatalog: hospitalItemQuickSlotCatalog, itemResourceCatalog: hospitalItemResourceCatalog, lifecycleCatalog: hospitalItemReturnLifecycleCatalog, backpackRules: config.backpack }),
      playerCondition: createPlayerCondition({ currentHealth: config.combat.player.maxHealth, bleeding: false, openWounds: [], minorContusions: 0, painkillerActive: false, pendingInfectionExposures: 0 }, config.combat.player),
      runIntelLog: { intelIds: [] },
      dailyState: { medicalUsage: { disinfectantUsesToday: 0 }, threatSuppression: { usesToday: 0, suppressionAmountToday: 0 }, maintenanceLaborRemaining: config.maintenance.dailyBaseLabor.points, mainSceneUsedToday: false },
      worldThreat: { definitionId: config.worldThreat.definitionId, progress: 0 }, satiety: { current: 4 }, returnLedger: { sceneInstanceIds: ['returned-before-react-ui'] },
    }, hospitalCurrentDayHubDependencies),
  }
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const result = [...container.querySelectorAll('button')]
    .find((candidate) => candidate.textContent === label)
  if (!result) throw new Error(`expected button: ${label}`)
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

  it('completes Hub → fire door → alerted isolation combat through four explicit commands', () => {
    const storage = new MemoryStorage()
    const inner = createStableRunStore({ initialPhase: createHubPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const tracked = trackedStore(inner)
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
    expect(forcePreview).toContain('轻度挫伤风险高')
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
    expect(container.textContent).toContain('敌人 CTB 50')
    expect(container.textContent).toContain('战斗命令尚未接入此展示层')
    expect(container.textContent).not.toContain('场景终局状态')
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
})
