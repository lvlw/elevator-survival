import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import {
  calculateBackpackWeightSubtotal,
  createBackpackSnapshot,
  type ItemInstance,
} from '../../core/inventory'
import { createFullItemState } from '../../core/item-state'
import {
  addSceneItems,
  createEmptySceneItemsSnapshot,
  getSceneNodeItems,
} from '../../core/scene-items'
import {
  createSceneExplorationSnapshot,
  previewNodeItemPickupCommand,
  resolveNodeItemPickupCommand,
  type SceneExplorationSnapshot,
} from '../../core/scene-exploration'
import {
  createSceneSearchState,
  revealPreparedMainSearchOutcome,
} from '../../core/scene-search'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_NODE_IDS,
  hospitalSliceV01SceneGraph,
} from './hospital-scene-graph'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
} from './items'
import { hospitalSliceV01RuleConfig as config } from './rule-config'
import { hospitalMainSearchCatalog } from './search'

const dependencies = {
  graph: hospitalSliceV01SceneGraph,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  config,
}
const sceneInstanceId = 'hospital-pickup-scene'

function weightItems(total: number): ItemInstance[] {
  const items: ItemInstance[] = []
  let remaining = total
  let index = 0
  while (remaining > 0) {
    const quantity = Math.min(5, remaining)
    items.push({
      instanceId: `weight-${index}`,
      definitionId: HOSPITAL_ITEM_IDS.metalParts,
      quantity,
    })
    remaining -= quantity
    index += 1
  }
  return items
}

function searchedSnapshot(
  nodeId: string,
  backpackWeight = 0,
  status: SceneExplorationSnapshot['status'] = 'active',
) {
  const items = weightItems(backpackWeight)
  const backpack = createBackpackSnapshot(
    {
      width: config.backpack.width,
      height: config.backpack.height,
      items,
      placements: items.map((item, index) => ({
        instanceId: item.instanceId,
        x: index,
        y: 3,
        rotated: false,
      })),
    },
    hospitalItemCatalog,
  )
  const prepared = createSceneSearchState({
    runSeed: 'hospital-search-golden-seed',
    sceneInstanceId,
    graph: hospitalSliceV01SceneGraph,
    searchCatalog: hospitalMainSearchCatalog,
    itemCatalog: hospitalItemCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
  })
  const preparedNode = prepared.nodeStates.find((node) => node.nodeId === nodeId)
  if (!preparedNode || preparedNode.kind !== 'unsearched') throw new Error('节点缺少预定结果')
  const sceneItems = addSceneItems(
    createEmptySceneItemsSnapshot({
      graph: hospitalSliceV01SceneGraph,
      itemCatalog: hospitalItemCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
    }),
    nodeId,
    preparedNode.preparedOutcome.revealedItems,
    {
      graph: hospitalSliceV01SceneGraph,
      itemCatalog: hospitalItemCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
    },
  )
  return createSceneExplorationSnapshot(
    {
      sceneInstanceId,
      searchState: revealPreparedMainSearchOutcome(prepared, nodeId),
      sceneItems,
      alertState: 'unalerted',
      combatState: { encounters: [], usage: { metalPipeChargedStrikeUses: 0 } },
      status,
      currentNodeId: nodeId,
      remainingTime: 137,
      enabledEdgeIds: HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
      backpack,
      equipment: { weapon: null, armor: null, utility: null },
      quickSlots: { slots: [null, null] },
      itemStates: {
        states: items.map((item) =>
          createFullItemState(item, hospitalItemResourceCatalog),
        ),
      },
      dailyMedicalUsage: { disinfectantUsesToday: 0 },
      condition: createPlayerCondition(
        {
          currentHealth: status === 'dead' ? 0 : config.combat.player.maxHealth,
          bleeding: false,
          openWounds: [],
          pendingInfectionExposures: 0,
          minorContusions: 0,
          painkillerActive: false,
        },
        config.combat.player,
      ),
    },
    dependencies,
  )
}

function source(
  snapshot: SceneExplorationSnapshot,
  definitionId: string,
) {
  const entity = getSceneNodeItems(snapshot.sceneItems, snapshot.currentNodeId).find(
    (candidate) => candidate.item.definitionId === definitionId,
  )
  if (!entity) throw new Error('搜索物品不存在')
  return entity
}

describe('hospital formal node item pickup', () => {
  it('fully picks up emergency metal parts with the same id and weight +1', () => {
    const start = searchedSnapshot(HOSPITAL_NODE_IDS.emergencyHall)
    const metal = source(start, HOSPITAL_ITEM_IDS.metalParts)
    const result = resolveNodeItemPickupCommand(
      start,
      {
        nodeItemInstanceId: metal.item.instanceId,
        quantity: 1,
        placement: { x: 0, y: 0, rotated: false },
      },
      dependencies,
    )
    expect(result.snapshot.backpack.items).toContainEqual(metal.item)
    expect(result.result).toMatchObject({
      sourceInstanceId: metal.item.instanceId,
      destinationInstanceId: metal.item.instanceId,
      backpackWeightBefore: 0,
      backpackWeightAfter: 1,
    })
    expect(result.snapshot.remainingTime).toBe(137)
    expect(result.snapshot.itemStates.states).toContainEqual(metal.state)
  })

  it('picks up pharmacy bandage without auto-merging or entering quick slots', () => {
    const start = searchedSnapshot(HOSPITAL_NODE_IDS.pharmacy, 1)
    const bandage = source(start, HOSPITAL_ITEM_IDS.bandage)
    const result = resolveNodeItemPickupCommand(
      start,
      {
        nodeItemInstanceId: bandage.item.instanceId,
        quantity: 1,
        placement: { x: 0, y: 0, rotated: false },
      },
      dependencies,
    )
    expect(result.snapshot.backpack.items).toHaveLength(2)
    expect(result.snapshot.quickSlots.slots).toEqual([null, null])
    expect(result.snapshot.backpack.items.find(
      (item) => item.instanceId === 'weight-0',
    )?.quantity).toBe(1)
  })

  it('picks up the access card as 1x1 weight zero without opening a door', () => {
    const start = searchedSnapshot(HOSPITAL_NODE_IDS.securityOffice)
    const card = source(start, HOSPITAL_ITEM_IDS.isolationWardAccessCard)
    const result = resolveNodeItemPickupCommand(
      start,
      {
        nodeItemInstanceId: card.item.instanceId,
        quantity: 1,
        placement: { x: 0, y: 0, rotated: false },
      },
      dependencies,
    )
    expect(calculateBackpackWeightSubtotal(
      result.snapshot.backpack,
      hospitalItemCatalog,
    )).toBe(0)
    expect(result.snapshot.backpack.placements).toContainEqual({
      instanceId: card.item.instanceId,
      x: 0,
      y: 0,
      rotated: false,
    })
    expect(result.snapshot.enabledEdgeIds).toEqual(start.enabledEdgeIds)
  })

  it('does not obtain the sample case through the search pickup command', () => {
    const start = searchedSnapshot(HOSPITAL_NODE_IDS.securityOffice)
    expect(
      previewNodeItemPickupCommand(
        start,
        {
          nodeItemInstanceId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
          quantity: 1,
          placement: { x: 0, y: 0, rotated: false },
        },
        dependencies,
      ),
    ).toEqual({ canExecute: false, rejectionCode: 'UNKNOWN_NODE_ITEM' })
  })

  it.each([
    [16, 'loaded', true],
    [24, 'overloaded', true],
    [28, 'cannot-carry', false],
  ] as const)(
    'applies the formal load boundary from %i to %s',
    (weight, tier, allowed) => {
      const start = searchedSnapshot(HOSPITAL_NODE_IDS.emergencyHall, weight)
      const metal = source(start, HOSPITAL_ITEM_IDS.metalParts)
      const preview = previewNodeItemPickupCommand(
        start,
        {
          nodeItemInstanceId: metal.item.instanceId,
          quantity: 1,
          placement: { x: 0, y: 0, rotated: false },
        },
        dependencies,
      )
      expect(preview.canExecute).toBe(allowed)
      if (preview.canExecute) {
        expect(preview.result.loadTierAfter).toBe(tier)
      } else {
        expect(preview.rejectionCode).toBe('CANNOT_CARRY')
      }
    },
  )

  it.each(['safe-returned', 'forced-returned', 'dead'] as const)(
    'rejects pickup after hospital scene status %s',
    (status) => {
      const start = searchedSnapshot(
        HOSPITAL_NODE_IDS.emergencyHall,
        0,
        status,
      )
      expect(
        previewNodeItemPickupCommand(
          start,
          {
            nodeItemInstanceId: 'any',
            quantity: 1,
            placement: { x: 0, y: 0, rotated: false },
          },
          dependencies,
        ),
      ).toEqual({ canExecute: false, rejectionCode: 'SCENE_NOT_ACTIVE' })
    },
  )
})
