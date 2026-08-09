import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import { createBackpackSnapshot } from '../../core/inventory'
import { createItemState, getItemState } from '../../core/item-state'
import { getSceneNodeItems } from '../../core/scene-items'
import {
  applySceneExplorationEffects,
  createInitialSceneExplorationSnapshot,
  previewMainSearchCommand,
  previewNodeItemPickupCommand,
  previewSceneMoveCommand,
  resolveMainSearchCommand,
  resolveNodeItemPickupCommand,
  resolveSceneMoveCommand,
  type SceneExplorationEffect,
  type SceneExplorationSnapshot,
} from '../../core/scene-exploration'
import { createSceneSearchState } from '../../core/scene-search'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_EDGE_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemSearchIlluminationCatalog,
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
  searchCatalog: hospitalMainSearchCatalog,
  searchIlluminationCatalog: hospitalItemSearchIlluminationCatalog,
  config,
}

type SuccessfulEvaluation = Readonly<{
  effects: readonly SceneExplorationEffect[]
  snapshot: SceneExplorationSnapshot
}>

function executeChecked(
  start: SceneExplorationSnapshot,
  preview: Readonly<
    | { canExecute: true; result: SuccessfulEvaluation }
    | { canExecute: false; rejectionCode: string }
  >,
  resolution: Readonly<{
    result: SuccessfulEvaluation
    snapshot: SceneExplorationSnapshot
  }>,
): SceneExplorationSnapshot {
  expect(preview.canExecute).toBe(true)
  if (!preview.canExecute) {
    throw new Error(`正式命令预览失败：${preview.rejectionCode}`)
  }
  expect(preview.result.effects).toEqual(resolution.result.effects)
  expect(preview.result.snapshot).toEqual(resolution.snapshot)
  expect(
    applySceneExplorationEffects(
      start,
      preview.result.effects,
      dependencies,
    ),
  ).toEqual(resolution.snapshot)
  return resolution.snapshot
}

function node(
  snapshot: SceneExplorationSnapshot,
  nodeId: string,
) {
  const result = snapshot.searchState.nodeStates.find(
    (candidate) => candidate.nodeId === nodeId,
  )
  if (!result) throw new Error(`医院节点不存在：${nodeId}`)
  return result
}

function revealedItem(
  snapshot: SceneExplorationSnapshot,
  nodeId: string,
  definitionId: string,
) {
  const result = getSceneNodeItems(snapshot.sceneItems, nodeId).find(
    ({ item }) => item.definitionId === definitionId,
  )
  if (!result) throw new Error(`节点缺少正式物品：${definitionId}`)
  return result
}

function initialSnapshot(): SceneExplorationSnapshot {
  const flashlight = {
    instanceId: 'command-chain-flashlight',
    definitionId: HOSPITAL_ITEM_IDS.flashlight,
    quantity: 1,
  }
  return createInitialSceneExplorationSnapshot(
    {
      sceneInstanceId: 'hospital-command-chain-scene',
      searchState: createSceneSearchState({
        runSeed: 'hospital-search-golden-seed',
        sceneInstanceId: 'hospital-command-chain-scene',
        graph: hospitalSliceV01SceneGraph,
        searchCatalog: hospitalMainSearchCatalog,
        itemCatalog: hospitalItemCatalog,
        itemResourceCatalog: hospitalItemResourceCatalog,
      }),
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      remainingTime: config.scene.totalTime,
      enabledEdgeIds: HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
      backpack: createBackpackSnapshot(
        {
          width: config.backpack.width,
          height: config.backpack.height,
          items: [],
          placements: [],
        },
        hospitalItemCatalog,
      ),
      equipment: { weapon: null, armor: null, utility: flashlight },
      quickSlots: { slots: [null, null] },
      itemStates: {
        states: [
          createItemState(
            {
              instanceId: flashlight.instanceId,
              definitionId: flashlight.definitionId,
              resource: { kind: 'charge', current: 3 },
            },
            hospitalItemResourceCatalog,
          ),
        ],
      },
      condition: createPlayerCondition(
        {
          currentHealth: config.combat.player.maxHealth,
          bleeding: false,
          openWounds: [],
          pendingInfectionExposures: 0,
          minorContusions: 0,
          painkillerActive: false,
        },
        config.combat.player,
      ),
      dailyMedicalUsage: { disinfectantUsesToday: 0 },
      runIntelLog: { intelIds: [] },
    },
    dependencies,
  )
}

describe('hospital formal command chain', () => {
  it('moves, searches, explicitly picks up, and safely returns through one replayable Effect path', () => {
    let current = initialSnapshot()
    const hallPrepared = node(current, HOSPITAL_NODE_IDS.emergencyHall)
    expect(hallPrepared.kind).toBe('unsearched')

    let preview = previewSceneMoveCommand(
      current,
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      dependencies,
    )
    let resolved = resolveSceneMoveCommand(
      current,
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      dependencies,
    )
    current = executeChecked(current, preview, resolved)
    expect(current.currentNodeId).toBe(HOSPITAL_NODE_IDS.emergencyHall)
    expect(node(current, HOSPITAL_NODE_IDS.emergencyHall)).toEqual(hallPrepared)
    expect(resolved.result.effects.map(({ kind }) => kind)).toEqual([
      'scene-node-changed',
      'scene-time-resolved',
    ])

    const searchPreview = previewMainSearchCommand(
      current,
      { illumination: 'use-equipped-flashlight' },
      dependencies,
    )
    const searchResolved = resolveMainSearchCommand(
      current,
      { illumination: 'use-equipped-flashlight' },
      dependencies,
    )
    current = executeChecked(current, searchPreview, searchResolved)
    expect(searchResolved.result.effects.map(({ kind }) => kind)).toEqual([
      'item-resource-consumed',
      'scene-main-search-revealed',
      'run-intel-added',
      'scene-time-resolved',
    ])
    expect(getItemState(
      current.itemStates,
      'command-chain-flashlight',
    ).resource).toEqual({ kind: 'charge', current: 2 })
    const searchedHall = node(current, HOSPITAL_NODE_IDS.emergencyHall)
    expect(searchedHall.kind).toBe('searched')
    if (
      hallPrepared.kind !== 'unsearched' ||
      searchedHall.kind !== 'searched'
    ) {
      throw new Error('大厅搜索状态不符合命令链前提')
    }
    expect(getSceneNodeItems(current.sceneItems, HOSPITAL_NODE_IDS.emergencyHall)).toEqual(
      hallPrepared.preparedOutcome.revealedItems,
    )
    expect(current.backpack.items).toEqual([])

    const metal = revealedItem(
      current,
      HOSPITAL_NODE_IDS.emergencyHall,
      HOSPITAL_ITEM_IDS.metalParts,
    )
    const hallIntel = searchedHall.revealedIntelIds
    const hallOtherItemIds = getSceneNodeItems(current.sceneItems, HOSPITAL_NODE_IDS.emergencyHall)
      .filter(({ item }) => item.instanceId !== metal.item.instanceId)
      .map(({ item }) => item.instanceId)
    const timeBeforeMetalPickup = current.remainingTime
    const metalPreview = previewNodeItemPickupCommand(
      current,
      {
        nodeItemInstanceId: metal.item.instanceId,
        quantity: 1,
        placement: { x: 0, y: 0, rotated: false },
      },
      dependencies,
    )
    const metalResolved = resolveNodeItemPickupCommand(
      current,
      {
        nodeItemInstanceId: metal.item.instanceId,
        quantity: 1,
        placement: { x: 0, y: 0, rotated: false },
      },
      dependencies,
    )
    current = executeChecked(current, metalPreview, metalResolved)
    expect(metalResolved.result.effects.map(({ kind }) => kind)).toEqual([
      'scene-item-picked-up',
    ])
    expect(current.remainingTime).toBe(timeBeforeMetalPickup)
    expect(current.backpack.items).toContainEqual(metal.item)
    expect(getItemState(current.itemStates, metal.item.instanceId)).toEqual(
      metal.state,
    )
    const hallAfterPickup = node(current, HOSPITAL_NODE_IDS.emergencyHall)
    if (hallAfterPickup.kind !== 'searched') {
      throw new Error('大厅拾取后必须保持已搜索')
    }
    expect(getSceneNodeItems(current.sceneItems, HOSPITAL_NODE_IDS.emergencyHall).map(({ item }) => item.instanceId)).toEqual(
      hallOtherItemIds,
    )
    expect(hallAfterPickup.revealedIntelIds).toEqual(hallIntel)

    preview = previewSceneMoveCommand(
      current,
      { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy },
      dependencies,
    )
    resolved = resolveSceneMoveCommand(
      current,
      { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy },
      dependencies,
    )
    current = executeChecked(current, preview, resolved)
    expect(current.currentNodeId).toBe(HOSPITAL_NODE_IDS.pharmacy)
    expect(current.backpack.items).toContainEqual(metal.item)
    expect(node(current, HOSPITAL_NODE_IDS.emergencyHall)).toEqual(
      hallAfterPickup,
    )

    const pharmacyPrepared = node(current, HOSPITAL_NODE_IDS.pharmacy)
    const pharmacySearchPreview = previewMainSearchCommand(
      current,
      { illumination: 'search-without-flashlight' },
      dependencies,
    )
    const pharmacySearchResolved = resolveMainSearchCommand(
      current,
      { illumination: 'search-without-flashlight' },
      dependencies,
    )
    current = executeChecked(
      current,
      pharmacySearchPreview,
      pharmacySearchResolved,
    )
    expect(pharmacySearchResolved.result.effects.map(({ kind }) => kind)).toEqual([
      'scene-main-search-revealed',
      'scene-time-resolved',
    ])
    expect(getItemState(
      current.itemStates,
      'command-chain-flashlight',
    ).resource).toEqual({ kind: 'charge', current: 2 })
    expect(node(current, HOSPITAL_NODE_IDS.emergencyHall)).toEqual(
      hallAfterPickup,
    )
    const searchedPharmacy = node(current, HOSPITAL_NODE_IDS.pharmacy)
    if (
      pharmacyPrepared.kind !== 'unsearched' ||
      searchedPharmacy.kind !== 'searched'
    ) {
      throw new Error('药房搜索状态不符合命令链前提')
    }
    expect(getSceneNodeItems(current.sceneItems, HOSPITAL_NODE_IDS.pharmacy)).toEqual(
      pharmacyPrepared.preparedOutcome.revealedItems,
    )

    const bandage = revealedItem(
      current,
      HOSPITAL_NODE_IDS.pharmacy,
      HOSPITAL_ITEM_IDS.bandage,
    )
    const timeBeforeBandagePickup = current.remainingTime
    const bandagePreview = previewNodeItemPickupCommand(
      current,
      {
        nodeItemInstanceId: bandage.item.instanceId,
        quantity: 1,
        placement: { x: 1, y: 0, rotated: false },
      },
      dependencies,
    )
    const bandageResolved = resolveNodeItemPickupCommand(
      current,
      {
        nodeItemInstanceId: bandage.item.instanceId,
        quantity: 1,
        placement: { x: 1, y: 0, rotated: false },
      },
      dependencies,
    )
    current = executeChecked(current, bandagePreview, bandageResolved)
    expect(current.remainingTime).toBe(timeBeforeBandagePickup)
    expect(current.quickSlots.slots).toEqual([null, null])
    expect(current.backpack.items).toHaveLength(2)
    expect(current.backpack.items.map(({ instanceId }) => instanceId)).toEqual(
      [bandage.item.instanceId, metal.item.instanceId].sort(),
    )
    expect(current.itemStates.states).toHaveLength(3)

    preview = previewSceneMoveCommand(
      current,
      { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy },
      dependencies,
    )
    resolved = resolveSceneMoveCommand(
      current,
      { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy },
      dependencies,
    )
    current = executeChecked(current, preview, resolved)
    preview = previewSceneMoveCommand(
      current,
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      dependencies,
    )
    resolved = resolveSceneMoveCommand(
      current,
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      dependencies,
    )
    current = executeChecked(current, preview, resolved)

    expect(current).toMatchObject({
      status: 'safe-returned',
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      remainingTime: 110,
    })
    expect(current.backpack.items.map(({ instanceId }) => instanceId)).toEqual(
      [bandage.item.instanceId, metal.item.instanceId].sort(),
    )
    expect(current.equipment.utility?.instanceId).toBe(
      'command-chain-flashlight',
    )
    expect(current.quickSlots.slots).toEqual([null, null])
    expect(getItemState(
      current.itemStates,
      'command-chain-flashlight',
    ).resource).toEqual({ kind: 'charge', current: 2 })
    expect(node(current, HOSPITAL_NODE_IDS.emergencyHall)).toEqual(
      hallAfterPickup,
    )
    const knownInstanceIds = [
      ...current.backpack.items.map(({ instanceId }) => instanceId),
      ...Object.values(current.equipment)
        .filter((item) => item !== null)
        .map((item) => item.instanceId),
      ...current.searchState.nodeStates.flatMap((searchState) =>
        searchState.kind === 'unsearched'
          ? searchState.preparedOutcome.revealedItems.map(
              ({ item }) => item.instanceId,
            )
          : [],
      ),
      ...current.sceneItems.nodeStates.flatMap(({ items }) =>
        items.map(({ item }) => item.instanceId),
      ),
    ]
    expect(new Set(knownInstanceIds).size).toBe(knownInstanceIds.length)
  })
})
