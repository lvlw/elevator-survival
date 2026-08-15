import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import { createBackpackSnapshot } from '../../core/inventory'
import { createItemState, createFullItemState, getItemState } from '../../core/item-state'
import {
  applySceneExplorationEffects,
  createInitialSceneExplorationSnapshot,
  getAvailableSceneBatteryCommands,
  previewSceneBatteryCommand,
  resolveSceneBatteryCommand,
  type SceneExplorationSnapshot,
} from '../../core/scene-exploration'
import { createSceneSearchState } from '../../core/scene-search'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  hospitalDeviceRechargeCatalog,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalMainSearchCatalog,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
} from '..'

const dependencies = {
  graph: hospitalSliceV01SceneGraph,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  config,
  deviceRechargeCatalog: hospitalDeviceRechargeCatalog,
}

type Definition = typeof HOSPITAL_ITEM_IDS.standardBattery | typeof HOSPITAL_ITEM_IDS.flashlight
function item(instanceId: string, definitionId: Definition, quantity = 1) { return { instanceId, definitionId, quantity } }

function snapshot(input: Readonly<{
  backpack?: readonly ReturnType<typeof item>[]
  equippedFlashlight?: boolean
  charge?: number
  remainingTime?: number
  health?: number
  bleeding?: boolean
  nodeId?: string
}> = {}): SceneExplorationSnapshot {
  const backpack = input.backpack ?? []
  const equipped = input.equippedFlashlight ? item('equipped-flashlight', HOSPITAL_ITEM_IDS.flashlight) : null
  const carried = [...backpack, ...(equipped ? [equipped] : [])]
  const states = carried.map((candidate) => candidate.definitionId === HOSPITAL_ITEM_IDS.flashlight
    ? createItemState({ ...candidate, resource: { kind: 'charge', current: input.charge ?? 0 } }, hospitalItemResourceCatalog)
    : createFullItemState(candidate, hospitalItemResourceCatalog))
  return createInitialSceneExplorationSnapshot({
    sceneInstanceId: 'scene-battery',
    searchState: createSceneSearchState({ runSeed: 'scene-battery-seed', sceneInstanceId: 'scene-battery', graph: hospitalSliceV01SceneGraph, searchCatalog: hospitalMainSearchCatalog, itemCatalog: hospitalItemCatalog, itemResourceCatalog: hospitalItemResourceCatalog }),
    currentNodeId: input.nodeId ?? HOSPITAL_NODE_IDS.emergencyHall,
    remainingTime: input.remainingTime ?? 50,
    enabledEdgeIds: HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
    backpack: createBackpackSnapshot({ width: config.backpack.width, height: config.backpack.height, items: backpack, placements: backpack.map((candidate, index) => ({ instanceId: candidate.instanceId, x: index % config.backpack.width, y: Math.floor(index / config.backpack.width), rotated: false })) }, hospitalItemCatalog),
    equipment: { weapon: null, armor: null, utility: equipped }, quickSlots: { slots: [null, null] }, itemStates: { states },
    dailyMedicalUsage: { disinfectantUsesToday: 0 }, runIntelLog: { intelIds: [] },
    condition: createPlayerCondition({ currentHealth: input.health ?? config.combat.player.maxHealth, bleeding: input.bleeding ?? false, openWounds: [], minorContusions: 0, painkillerActive: false, pendingInfectionExposures: 0 }, config.combat.player),
  }, dependencies)
}

const command = (batteryInstanceId = 'battery', targetInstanceId = 'equipped-flashlight') => ({ batteryInstanceId, targetInstanceId })

describe('hospital scene battery recharge', () => {
  it('consumes a real backpack battery, restores an equipped flashlight, and spends the configured scene time', () => {
    const start = snapshot({ backpack: [item('battery', HOSPITAL_ITEM_IDS.standardBattery)], equippedFlashlight: true, charge: 0 })
    const result = resolveSceneBatteryCommand(start, command(), dependencies)
    expect(result.snapshot.backpack.items).toEqual([])
    expect(() => getItemState(result.snapshot.itemStates, 'battery')).toThrow()
    expect(getItemState(result.snapshot.itemStates, 'equipped-flashlight').resource).toEqual({ kind: 'charge', current: 3 })
    expect(result.snapshot.remainingTime).toBe(40)
    expect(result.result.effects.map(({ kind }) => kind)).toEqual(['scene-battery-consumed', 'scene-device-resource-restored', 'scene-time-resolved'])
  })

  it('keeps a stack instance and reports capped recovery without moving the target', () => {
    const start = snapshot({ backpack: [item('battery', HOSPITAL_ITEM_IDS.standardBattery, 2), item('pack-flashlight', HOSPITAL_ITEM_IDS.flashlight)], charge: 2 })
    const result = resolveSceneBatteryCommand(start, command('battery', 'pack-flashlight'), dependencies)
    expect(result.snapshot.backpack.items.find(({ instanceId }) => instanceId === 'battery')?.quantity).toBe(1)
    expect(getItemState(result.snapshot.itemStates, 'pack-flashlight').resource).toEqual({ kind: 'charge', current: 3 })
    expect(result.result.effects[1]).toMatchObject({ actualRecovery: 1, unusedRecovery: 2, targetContainer: 'backpack' })
  })

  it('does not offer a full target and rejects invalid sources or unknown command fields without changes', () => {
    const start = snapshot({ backpack: [item('battery', HOSPITAL_ITEM_IDS.standardBattery)], equippedFlashlight: true, charge: 3 })
    expect(getAvailableSceneBatteryCommands(start, dependencies)).toEqual([])
    expect(previewSceneBatteryCommand(start, command(), dependencies)).toEqual({ canExecute: false, rejectionCode: 'SCENE_BATTERY_NOT_AVAILABLE' })
    expect(previewSceneBatteryCommand(start, { ...command(), extra: true } as never, dependencies)).toEqual({ canExecute: false, rejectionCode: 'INVALID_SCENE_BATTERY_COMMAND' })
    expect(start.backpack.items).toHaveLength(1)
  })

  it('applies post-action bleeding once and keeps the completed recharge when it causes death', () => {
    const result = resolveSceneBatteryCommand(snapshot({ backpack: [item('battery', HOSPITAL_ITEM_IDS.standardBattery)], equippedFlashlight: true, health: 1, bleeding: true }), command(), dependencies)
    expect(result.snapshot.status).toBe('dead')
    expect(result.snapshot.condition.currentHealth).toBe(0)
    expect(getItemState(result.snapshot.itemStates, 'equipped-flashlight').resource).toEqual({ kind: 'charge', current: 3 })
    expect(result.snapshot.backpack.items).toEqual([])
  })

  it('uses the existing overtime forced-return path after the medical-style action order', () => {
    const result = resolveSceneBatteryCommand(snapshot({ backpack: [item('battery', HOSPITAL_ITEM_IDS.standardBattery)], equippedFlashlight: true, remainingTime: 5, nodeId: HOSPITAL_NODE_IDS.emergencyHall }), command(), dependencies)
    expect(result.result.effects.find(({ kind }) => kind === 'scene-time-resolved')).toMatchObject({ overtimeDebt: 5 })
    expect(result.snapshot.status).toBe('forced-returned')
  })

  it('uses the post-consumption backpack for forced-return load classification', () => {
    const batteries = Array.from({ length: 17 }, (_, index) => item(`battery-${index}`, HOSPITAL_ITEM_IDS.standardBattery))
    const result = resolveSceneBatteryCommand(snapshot({ backpack: batteries, equippedFlashlight: true, remainingTime: 5 }), command('battery-0'), dependencies)
    expect(result.snapshot.status).toBe('forced-returned')
    expect(result.result.returnRoute.loadTier).toBe('normal')
  })

  it('replays only the exact frozen effect plan atomically', () => {
    const start = snapshot({ backpack: [item('battery', HOSPITAL_ITEM_IDS.standardBattery)], equippedFlashlight: true })
    const result = resolveSceneBatteryCommand(start, command(), dependencies)
    const tampered = structuredClone(result.result.effects)
    ;(tampered[1] as { actualRecovery: number }).actualRecovery = 1
    expect(() => applySceneExplorationEffects(start, tampered, dependencies)).toThrow(/Effect/)
    expect(start.backpack.items).toHaveLength(1)
  })
})
