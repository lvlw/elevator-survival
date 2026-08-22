import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import {
  HOSPITAL_ITEM_IDS,
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
  hospitalCurrentDayHubDependencies,
  hospitalRunSaveRulesRegistry,
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

const roots: ReturnType<typeof createRoot>[] = []
afterEach(() => {
  act(() => { while (roots.length > 0) roots.pop()!.unmount() })
})

describe('StableRunUiApp', () => {
  it('rerenders real React output when the real Store phase changes', () => {
    const storage = new MemoryStorage()
    const store = createStableRunStore({ initialPhase: createHubPhase(), storage, rulesRegistry: hospitalRunSaveRulesRegistry })
    const container = document.createElement('div')
    const root = createRoot(container); roots.push(root)
    act(() => { root.render(<StableRunUiApp store={store} presentationDependencies={{ rulesRegistry: hospitalRunSaveRulesRegistry, labels: hospitalV01UiLabels }} />) })
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
    act(() => { root.render(<StrictMode><StableRunUiApp store={store} presentationDependencies={{ rulesRegistry: hospitalRunSaveRulesRegistry, labels: hospitalV01UiLabels }} /></StrictMode>) })
    expect(store.getState()).toBe(before)
    expect(storage.writes).toBe(0)
    expect(container.textContent).toContain('电梯中枢')
  })
})
