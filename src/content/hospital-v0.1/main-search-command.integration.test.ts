import { describe, expect, it } from 'vitest'
import {
  createPlayerCondition,
} from '../../core/condition'
import {
  createBackpackSnapshot,
  type BackpackPlacement,
  type ItemInstance,
} from '../../core/inventory'
import {
  createFullItemState,
  createItemState,
  getItemState,
} from '../../core/item-state'
import { getSceneNodeItems } from '../../core/scene-items'
import {
  previewMainSearchCommand,
  resolveMainSearchCommand,
  resolveSceneMoveCommand,
} from '../../core/scene-exploration'
import {
  createSceneSearchState,
  getPlayerVisibleNodeSearchState,
} from '../../core/scene-search'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_EDGE_IDS,
  HOSPITAL_NODE_IDS,
  hospitalSliceV01SceneGraph,
} from './hospital-scene-graph'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalItemSearchIlluminationCatalog,
  hospitalItemSearchIlluminationProfiles,
} from './items'
import { hospitalSliceV01RuleConfig as config } from './rule-config'
import { hospitalMainSearchCatalog } from './search'
import { hospitalSceneSurfaceObservationCatalog } from './hospital-scene-navigation'
import { createHospitalTestSceneExplorationSnapshot } from './hospital-scene-navigation.test-support'

const dependencies = {
  graph: hospitalSliceV01SceneGraph,
  navigationCatalog: hospitalSceneSurfaceObservationCatalog,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  searchCatalog: hospitalMainSearchCatalog,
  searchIlluminationCatalog: hospitalItemSearchIlluminationCatalog,
  config,
}
const sceneInstanceId = 'hospital-scene-instance-001'
const runSeed = 'hospital-search-golden-seed'
const at = (
  instanceId: string,
  x: number,
  y: number,
): BackpackPlacement => ({
  instanceId,
  x,
  y,
  rotated: false,
})

interface HospitalSnapshotOptions {
  readonly nodeId?: string
  readonly utility?: 'flashlight' | 'crowbar' | 'toolkit' | null
  readonly flashlightCharge?: number
  readonly backpackWeight?: 0 | 17
  readonly spareFlashlight?: boolean
  readonly remainingTime?: number
  readonly currentHealth?: number
  readonly bleeding?: boolean
  readonly minorContusions?: number
}

function hospitalSnapshot(
  options: HospitalSnapshotOptions = {},
) {
  const {
    nodeId = HOSPITAL_NODE_IDS.emergencyHall,
    utility = 'flashlight',
    flashlightCharge = 3,
    backpackWeight = 0,
    spareFlashlight = false,
    remainingTime = config.scene.totalTime,
    currentHealth = config.combat.player.maxHealth,
    bleeding = false,
    minorContusions = 0,
  } = options
  const backpackItems: ItemInstance[] =
    backpackWeight === 17
      ? [
          {
            instanceId: 'metal',
            definitionId: HOSPITAL_ITEM_IDS.metalParts,
            quantity: 5,
          },
          {
            instanceId: 'electronics',
            definitionId: HOSPITAL_ITEM_IDS.electronicComponents,
            quantity: 5,
          },
          {
            instanceId: 'fabric',
            definitionId: HOSPITAL_ITEM_IDS.fabric,
            quantity: 5,
          },
          {
            instanceId: 'bandage',
            definitionId: HOSPITAL_ITEM_IDS.bandage,
            quantity: 2,
          },
        ]
      : []
  if (spareFlashlight) {
    backpackItems.push({
      instanceId: 'spare-flashlight',
      definitionId: HOSPITAL_ITEM_IDS.flashlight,
      quantity: 1,
    })
  }
  const placements = backpackItems.map((item, index) =>
    at(item.instanceId, index, 0),
  )
  const backpack = createBackpackSnapshot(
    {
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpackItems,
      placements,
    },
    hospitalItemCatalog,
  )
  const utilityItem =
    utility === null
      ? null
      : {
          instanceId: `equipped-${utility}`,
          definitionId: HOSPITAL_ITEM_IDS[utility],
          quantity: 1,
        }
  const carried = [
    ...backpack.items,
    ...(utilityItem ? [utilityItem] : []),
  ]
  const states = carried.map((item) =>
    item.definitionId === HOSPITAL_ITEM_IDS.flashlight
      ? createItemState(
          {
            instanceId: item.instanceId,
            definitionId: item.definitionId,
            resource: { kind: 'charge', current: flashlightCharge },
          },
          hospitalItemResourceCatalog,
        )
      : createFullItemState(item, hospitalItemResourceCatalog),
  )
  return createHospitalTestSceneExplorationSnapshot(
    {
      sceneInstanceId,
      searchState: createSceneSearchState({
        runSeed,
        sceneInstanceId,
        graph: hospitalSliceV01SceneGraph,
        searchCatalog: hospitalMainSearchCatalog,
        itemCatalog: hospitalItemCatalog,
        itemResourceCatalog: hospitalItemResourceCatalog,
      }),
      currentNodeId: nodeId,
      remainingTime,
      enabledEdgeIds: HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
      backpack,
      equipment: {
        weapon: null,
        armor: null,
        utility: utilityItem,
      },
      quickSlots: { slots: [null, null] },
      itemStates: { states },
      condition: createPlayerCondition(
        {
          currentHealth,
          bleeding,
          openWounds: bleeding
          ? [{ id: 'fixture-wound', kind: 'laceration', treatment: 'untreated' }]
          : [],
        pendingInfectionExposures: 0,
          minorContusions,
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

const illuminated = {
  illumination: 'use-equipped-flashlight',
} as const
const lowLight = {
  illumination: 'search-without-flashlight',
} as const

function searchedNode(
  snapshot: ReturnType<typeof hospitalSnapshot>,
  nodeId: string,
) {
  const node = snapshot.searchState.nodeStates.find(
    (candidate) => candidate.nodeId === nodeId,
  )
  if (!node || node.kind !== 'searched') {
    throw new Error('医院节点应已完成主要搜索')
  }
  return node
}

describe('hospital search illumination catalog', () => {
  it('covers all 18 items and only marks the flashlight as provider', () => {
    expect(hospitalItemSearchIlluminationProfiles).toHaveLength(18)
    expect(
      hospitalItemSearchIlluminationProfiles.filter(
        (profile) => profile.kind === 'low-light-provider',
      ),
    ).toEqual([
      {
        definitionId: HOSPITAL_ITEM_IDS.flashlight,
        kind: 'low-light-provider',
      },
    ])
    expect(hospitalItemSearchIlluminationCatalog.definitionIds).toEqual(
      [...hospitalItemCatalog.definitionIds].sort(),
    )
  })
})

describe('hospital main search command', () => {
  it.each([
    HOSPITAL_NODE_IDS.emergencyHall,
    HOSPITAL_NODE_IDS.pharmacy,
    HOSPITAL_NODE_IDS.securityOffice,
  ])('uses formal 20/30 search times at %s', (nodeId) => {
    expect(
      resolveMainSearchCommand(
        hospitalSnapshot({ nodeId }),
        illuminated,
        dependencies,
      ).result.actionTime,
    ).toBe(config.scene.searchTime.withFlashlight)
    expect(
      resolveMainSearchCommand(
        hospitalSnapshot({ nodeId }),
        lowLight,
        dependencies,
      ).result.actionTime,
    ).toBe(config.scene.searchTime.withoutFlashlight)
  })

  it.each([
    [
      HOSPITAL_NODE_IDS.emergencyHall,
      [HOSPITAL_ITEM_IDS.metalParts, HOSPITAL_ITEM_IDS.standardBattery],
    ],
    [
      HOSPITAL_NODE_IDS.pharmacy,
      [HOSPITAL_ITEM_IDS.bandage, HOSPITAL_ITEM_IDS.disinfectant],
    ],
    [
      HOSPITAL_NODE_IDS.securityOffice,
      [
        HOSPITAL_ITEM_IDS.isolationWardAccessCard,
        HOSPITAL_ITEM_IDS.standardBattery,
      ],
    ],
  ])('reveals the same golden result with or without light at %s', (nodeId, expected) => {
    const before = hospitalSnapshot({ nodeId })
    const withLight = resolveMainSearchCommand(
      before,
      illuminated,
      dependencies,
    )
    const withoutLight = resolveMainSearchCommand(
      hospitalSnapshot({ nodeId }),
      lowLight,
      dependencies,
    )
    const illuminatedNode = searchedNode(withLight.snapshot, nodeId)
    const lowLightNode = searchedNode(withoutLight.snapshot, nodeId)
    expect(
      getSceneNodeItems(withLight.snapshot.sceneItems, nodeId).map(({ item }) => item.definitionId),
    ).toEqual(expected)
    expect(lowLightNode).toEqual(illuminatedNode)
    expect(withLight.snapshot.navigationKnowledge).toEqual(before.navigationKnowledge)
    expect(withoutLight.snapshot.navigationKnowledge).toEqual(before.navigationKnowledge)
  })

  it.each([
    [3, true, 2],
    [1, true, 0],
    [0, false, 0],
  ])('handles flashlight charge %i for illuminated search', (charge, allowed, finalCharge) => {
    const input = hospitalSnapshot({ flashlightCharge: charge })
    const preview = previewMainSearchCommand(
      input,
      illuminated,
      dependencies,
    )
    expect(preview.canExecute).toBe(allowed)
    if (allowed) {
      const result = resolveMainSearchCommand(
        input,
        illuminated,
        dependencies,
      )
      expect(
        getItemState(
          result.snapshot.itemStates,
          'equipped-flashlight',
        ).resource,
      ).toEqual({ kind: 'charge', current: finalCharge })
      expect(result.snapshot.equipment.utility?.instanceId).toBe(
        'equipped-flashlight',
      )
    } else {
      expect(preview).toEqual({
        canExecute: false,
        rejectionCode: 'INSUFFICIENT_ILLUMINATION_CHARGE',
      })
    }
  })

  it('allows low-light search with a depleted flashlight', () => {
    expect(
      resolveMainSearchCommand(
        hospitalSnapshot({ flashlightCharge: 0 }),
        lowLight,
        dependencies,
      ).snapshot.searchState.nodeStates.find(
        (node) => node.nodeId === HOSPITAL_NODE_IDS.emergencyHall,
      )?.kind,
    ).toBe('searched')
  })

  it.each(['crowbar', 'toolkit'] as const)(
    'does not treat equipped %s as an illumination provider',
    (utility) => {
      expect(
        previewMainSearchCommand(
          hospitalSnapshot({ utility }),
          illuminated,
          dependencies,
        ),
      ).toEqual({
        canExecute: false,
        rejectionCode: 'INVALID_ILLUMINATION_PROVIDER',
      })
    },
  )

  it('does not auto-use a spare backpack flashlight', () => {
    expect(
      previewMainSearchCommand(
        hospitalSnapshot({
          utility: null,
          spareFlashlight: true,
        }),
        illuminated,
        dependencies,
      ),
    ).toEqual({
      canExecute: false,
      rejectionCode: 'ILLUMINATION_PROVIDER_NOT_EQUIPPED',
    })
  })

  it('does not pick up results or change backpack weight', () => {
    const input = hospitalSnapshot({ backpackWeight: 17 })
    const result = resolveMainSearchCommand(
      input,
      lowLight,
      dependencies,
    )
    expect(result.snapshot.backpack).toEqual(input.backpack)
    expect(result.result.backpackWeight).toBe(17)
    expect(searchedNode(
      result.snapshot,
      HOSPITAL_NODE_IDS.emergencyHall,
    )).toMatchObject({ kind: 'searched' })
    expect(getSceneNodeItems(result.snapshot.sceneItems, HOSPITAL_NODE_IDS.emergencyHall)).toHaveLength(2)
  })

  it('keeps search at 30 while loaded contusion changes return to 13', () => {
    const result = resolveMainSearchCommand(
      hospitalSnapshot({
        backpackWeight: 17,
        minorContusions: 1,
      }),
      lowLight,
      dependencies,
    )
    expect(result.result.actionTime).toBe(30)
    expect(result.result.returnRoute).toMatchObject({
      baseReturnTime: 10,
      estimatedReturnTime: 13,
    })
  })

  it.each([illuminated, lowLight])(
    'allows remaining time 5 and preserves reveal after forced return',
    (command) => {
      const result = resolveMainSearchCommand(
        hospitalSnapshot({ remainingTime: 5 }),
        command,
        dependencies,
      )
      expect(result.snapshot.status).toBe('forced-returned')
      expect(result.snapshot.currentNodeId).toBe(
        HOSPITAL_NODE_IDS.elevatorAnteroom,
      )
      expect(searchedNode(
        result.snapshot,
        HOSPITAL_NODE_IDS.emergencyHall,
      )).toMatchObject({ kind: 'searched' })
      expect(getSceneNodeItems(result.snapshot.sceneItems, HOSPITAL_NODE_IDS.emergencyHall)).toHaveLength(2)
    },
  )

  it('preserves reveal and charge when bleeding death outranks return', () => {
    const result = resolveMainSearchCommand(
      hospitalSnapshot({
        remainingTime: 5,
        currentHealth: 1,
        bleeding: true,
      }),
      illuminated,
      dependencies,
    )
    expect(result.snapshot).toMatchObject({
      status: 'dead',
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
    })
    expect(searchedNode(
      result.snapshot,
      HOSPITAL_NODE_IDS.emergencyHall,
    )).toMatchObject({ kind: 'searched' })
    expect(getSceneNodeItems(result.snapshot.sceneItems, HOSPITAL_NODE_IDS.emergencyHall)).toHaveLength(2)
    expect(
      getItemState(
        result.snapshot.itemStates,
        'equipped-flashlight',
      ).resource,
    ).toEqual({ kind: 'charge', current: 2 })
  })

  it('rejects repeat search and hides the golden result before search', () => {
    const initial = hospitalSnapshot()
    const visible = getPlayerVisibleNodeSearchState(
      initial.searchState,
      HOSPITAL_NODE_IDS.emergencyHall,
    )
    expect(visible).toEqual({
      kind: 'available-unsearched',
      nodeId: HOSPITAL_NODE_IDS.emergencyHall,
    })
    expect(JSON.stringify(visible)).not.toContain('instanceId')
    const searched = resolveMainSearchCommand(
      initial,
      lowLight,
      dependencies,
    ).snapshot
    expect(
      previewMainSearchCommand(searched, lowLight, dependencies),
    ).toEqual({
      canExecute: false,
      rejectionCode: 'MAIN_SEARCH_ALREADY_COMPLETED',
    })
  })

  it('keeps carried and search state unchanged through movement', () => {
    const start = hospitalSnapshot({
      nodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
    })
    const result = resolveSceneMoveCommand(
      start,
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      dependencies,
    )
    expect(result.snapshot.equipment).toEqual(start.equipment)
    expect(result.snapshot.quickSlots).toEqual(start.quickSlots)
    expect(result.snapshot.itemStates).toEqual(start.itemStates)
    expect(result.snapshot.searchState).toEqual(start.searchState)
    expect(result.result).toMatchObject({
      backpackWeight: 0,
      loadTier: 'normal',
    })
  })
})
