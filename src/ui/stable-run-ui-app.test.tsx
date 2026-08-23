import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
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
} from '../content'
import { createPlayerCondition } from '../core/condition'
import { createCurrentDayHubSnapshot } from '../core/current-day-hub'
import { createBackpackSnapshot, type ItemInstance } from '../core/inventory'
import { createFullItemState } from '../core/item-state'
import { createQuickSlotSnapshot } from '../core/quick-slot'
import { createRunLoadoutSnapshot } from '../core/run-loadout'
import {
  createRunSceneSessionSnapshot,
  getRunSceneRuntime,
  resolveSceneLaunch,
} from '../core/scene-launch'
import {
  createSceneExplorationSnapshot,
  resolveSceneMoveCommand,
} from '../core/scene-exploration'
import {
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
  hospitalSceneLaunchDependencies,
  type RunSaveStorage,
} from '../state/run-save'
import { createStableRunStore } from '../state/run-store'
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
})
