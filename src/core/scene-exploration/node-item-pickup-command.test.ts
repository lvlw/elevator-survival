import { describe, expect, it } from 'vitest'
import type { FrozenRuleConfig } from '../config'
import { createPlayerCondition } from '../condition'
import { createEquipmentProfileCatalog } from '../equipment'
import {
  createBackpackSnapshot,
  createItemCatalog,
  type ItemInstance,
} from '../inventory'
import {
  createFullItemState,
  createItemResourceCatalog,
} from '../item-state'
import { createQuickSlotProfileCatalog } from '../quick-slot'
import { createSceneGraph } from '../scene-graph'
import {
  addSceneItems,
  createEmptySceneItemsSnapshot,
  getSceneNodeItems,
} from '../scene-items'
import {
  createMainSearchDefinitionCatalog,
  createSceneSearchState,
  revealPreparedMainSearchOutcome,
} from '../scene-search'
import {
  applySceneExplorationEffects,
  createSceneExplorationSnapshot,
  previewNodeItemPickupCommand,
  resolveNodeItemPickupCommand,
  type PickUpRevealedNodeItemCommand,
  type SceneExplorationEffect,
  type SceneExplorationSnapshot,
} from '.'

const config = {
  combat: { player: { maxHealth: 12 } },
  backpack: {
    width: 6,
    height: 4,
    quickSlotCount: 2,
    weightBands: {
      normal: { min: 0, max: 16, timeIncreasePercent: 0 },
      loaded: { min: 17, max: 24, timeIncreasePercent: 10 },
      overloaded: { min: 25, max: 28, timeIncreasePercent: 25 },
      cannotCarryFrom: 29,
    },
  },
  medical: {
    disinfectant: { maxUsesPerDay: 1 },
  },
} as unknown as FrozenRuleConfig

const graph = createSceneGraph({
  nodes: [
    { id: 'safe', name: '安全点', isReturnSafetyNode: true },
    { id: 'current', name: '当前点', isReturnSafetyNode: false },
    { id: 'other', name: '其他点', isReturnSafetyNode: false },
  ],
  edges: [],
})
const physicalCatalog = createItemCatalog([
  {
    id: 'stack',
    name: '堆叠物',
    width: 1,
    height: 1,
    unitWeight: 1,
    canRotate: true,
    stacking: { kind: 'stackable', maxQuantity: 30 },
  },
  {
    id: 'single',
    name: '单件物',
    width: 2,
    height: 1,
    unitWeight: 2,
    canRotate: false,
    stacking: { kind: 'none' },
  },
  {
    id: 'resource',
    name: '资源物',
    width: 1,
    height: 1,
    unitWeight: 1,
    canRotate: true,
    stacking: { kind: 'stackable', maxQuantity: 3 },
  },
  {
    id: 'heavy-weapon',
    name: '重武器',
    width: 1,
    height: 1,
    unitWeight: 28,
    canRotate: true,
    stacking: { kind: 'none' },
  },
  {
    id: 'heavy-quick',
    name: '重快捷物',
    width: 1,
    height: 1,
    unitWeight: 28,
    canRotate: true,
    stacking: { kind: 'none' },
  },
])
const resourceCatalog = createItemResourceCatalog(
  [
    { definitionId: 'stack', kind: 'none' },
    { definitionId: 'single', kind: 'none' },
    { definitionId: 'resource', kind: 'durability', maximum: 3 },
    { definitionId: 'heavy-weapon', kind: 'none' },
    { definitionId: 'heavy-quick', kind: 'none' },
  ],
  physicalCatalog.definitionIds,
)
const equipmentCatalog = createEquipmentProfileCatalog(
  physicalCatalog.definitionIds.map((definitionId) =>
    definitionId === 'heavy-weapon'
      ? {
          definitionId,
          kind: 'equippable' as const,
          eligibleSlots: ['weapon' as const],
        }
      : { definitionId, kind: 'not-equippable' as const },
  ),
  physicalCatalog.definitionIds,
)
const quickSlotCatalog = createQuickSlotProfileCatalog(
  physicalCatalog.definitionIds.map((definitionId) => ({
    definitionId,
    kind:
      definitionId === 'heavy-quick'
        ? 'eligible' as const
        : 'not-eligible' as const,
  })),
  physicalCatalog.definitionIds,
)
const searchCatalog = createMainSearchDefinitionCatalog(
  [
    {
      nodeId: 'current',
      searchOrdinal: 0,
      fixedItemGrants: [
        {
          definitionId: 'stack',
          quantity: 3,
          initialState: { kind: 'none' },
        },
        {
          definitionId: 'single',
          quantity: 1,
          initialState: { kind: 'none' },
        },
      ],
      weightedItemChoice: null,
      fixedIntelIds: ['intel-current'],
    },
    {
      nodeId: 'other',
      searchOrdinal: 0,
      fixedItemGrants: [
        {
          definitionId: 'resource',
          quantity: 3,
          initialState: { kind: 'explicit', current: 2 },
        },
        {
          definitionId: 'stack',
          quantity: 1,
          initialState: { kind: 'none' },
        },
      ],
      weightedItemChoice: null,
      fixedIntelIds: [],
    },
  ],
  graph,
  physicalCatalog,
  resourceCatalog,
)
const dependencies = {
  graph,
  physicalCatalog,
  equipmentCatalog,
  quickSlotCatalog,
  itemResourceCatalog: resourceCatalog,
  config,
}

interface SnapshotOptions {
  readonly searchedCurrent?: boolean
  readonly searchedOther?: boolean
  readonly currentNodeId?: string
  readonly backpackWeight?: number
  readonly status?: SceneExplorationSnapshot['status']
  readonly remainingTime?: number
  readonly bleeding?: boolean
  readonly withHeavyContainers?: boolean
}

function snapshot(options: SnapshotOptions = {}): SceneExplorationSnapshot {
  const {
    searchedCurrent = true,
    searchedOther = false,
    currentNodeId = 'current',
    backpackWeight = 0,
    status = 'active',
    remainingTime = 100,
    bleeding = false,
    withHeavyContainers = false,
  } = options
  const backpackItems: ItemInstance[] =
    backpackWeight === 0
      ? []
      : [
          {
            instanceId: 'backpack-weight',
            definitionId: 'stack',
            quantity: backpackWeight,
          },
        ]
  const backpack = createBackpackSnapshot(
    {
      width: 6,
      height: 4,
      items: backpackItems,
      placements: backpackItems.map((item) => ({
        instanceId: item.instanceId,
        x: 5,
        y: 3,
        rotated: false,
      })),
    },
    physicalCatalog,
  )
  const weapon = withHeavyContainers
    ? {
        instanceId: 'equipped-heavy',
        definitionId: 'heavy-weapon',
        quantity: 1,
      }
    : null
  const quick = withHeavyContainers
    ? {
        instanceId: 'quick-heavy',
        definitionId: 'heavy-quick',
        quantity: 1,
      }
    : null
  const carried = [
    ...backpack.items,
    ...(weapon ? [weapon] : []),
    ...(quick ? [quick] : []),
  ]
  let searchState = createSceneSearchState({
    runSeed: 'pickup-seed',
    sceneInstanceId: 'pickup-scene',
    graph,
    searchCatalog,
    itemCatalog: physicalCatalog,
    itemResourceCatalog: resourceCatalog,
  })
  let sceneItems = createEmptySceneItemsSnapshot({
    graph,
    itemCatalog: physicalCatalog,
    itemResourceCatalog: resourceCatalog,
  })
  if (searchedCurrent) {
    const prepared = searchState.nodeStates.find((node) => node.nodeId === 'current')
    if (!prepared || prepared.kind !== 'unsearched') throw new Error('缺少预定结果')
    sceneItems = addSceneItems(sceneItems, 'current', prepared.preparedOutcome.revealedItems, {
      graph,
      itemCatalog: physicalCatalog,
      itemResourceCatalog: resourceCatalog,
    })
    searchState = revealPreparedMainSearchOutcome(searchState, 'current')
  }
  if (searchedOther) {
    const prepared = searchState.nodeStates.find((node) => node.nodeId === 'other')
    if (!prepared || prepared.kind !== 'unsearched') throw new Error('缺少预定结果')
    sceneItems = addSceneItems(sceneItems, 'other', prepared.preparedOutcome.revealedItems, {
      graph,
      itemCatalog: physicalCatalog,
      itemResourceCatalog: resourceCatalog,
    })
    searchState = revealPreparedMainSearchOutcome(searchState, 'other')
  }
  return createSceneExplorationSnapshot(
    {
      sceneInstanceId: 'pickup-scene',
      searchState,
      sceneItems,
      alertState: 'unalerted',
      combatState: { encounters: [], usage: { metalPipeChargedStrikeUses: 0 } },
      status,
      currentNodeId,
      remainingTime,
      enabledEdgeIds: [],
      backpack,
      equipment: { weapon, armor: null, utility: null },
      quickSlots: { slots: [quick, null] },
      itemStates: {
        states: carried.map((item) =>
          createFullItemState(item, resourceCatalog),
        ),
      },
      dailyMedicalUsage: { disinfectantUsesToday: 0 },
      runIntelLog: { intelIds: [] },
      taskEvents: { entries: [] },
      condition: createPlayerCondition(
        {
          currentHealth: status === 'dead' ? 0 : 12,
          bleeding,
          openWounds: bleeding
          ? [{ id: 'fixture-wound', kind: 'laceration', treatment: 'untreated' }]
          : [],
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

function searchedNode(
  state: SceneExplorationSnapshot,
  nodeId = 'current',
) {
  const node = state.searchState.nodeStates.find(
    (candidate) => candidate.nodeId === nodeId,
  )
  if (!node || node.kind !== 'searched') {
    throw new Error('测试节点必须已搜索')
  }
  return node
}

function sourceId(
  state: SceneExplorationSnapshot,
  definitionId = 'stack',
  nodeId = state.currentNodeId,
) {
  const entity = getSceneNodeItems(state.sceneItems, nodeId).find(
    (candidate) => candidate.item.definitionId === definitionId,
  )
  if (!entity) throw new Error('测试源物品不存在')
  return entity.item.instanceId
}

const command = (
  state: SceneExplorationSnapshot,
  overrides: Partial<PickUpRevealedNodeItemCommand> = {},
): PickUpRevealedNodeItemCommand => ({
  nodeItemInstanceId:
    overrides.nodeItemInstanceId ?? sourceId(state),
  quantity: 3,
  placement: { x: 0, y: 0, rotated: false },
  ...overrides,
})

function replaceEffect(
  effect: SceneExplorationEffect,
  patch: Record<string, unknown>,
): SceneExplorationEffect {
  return { ...effect, ...patch } as SceneExplorationEffect
}

describe('node item pickup eligibility and identity', () => {
  it('rejects the same instance across a node and carried containers', () => {
    const start = snapshot()
    const duplicateId = sourceId(start)
    const duplicate = {
      instanceId: duplicateId,
      definitionId: 'stack',
      quantity: 1,
    }
    expect(() =>
      createSceneExplorationSnapshot(
        {
          ...start,
          backpack: createBackpackSnapshot(
            {
              width: 6,
              height: 4,
              items: [duplicate],
              placements: [
                {
                  instanceId: duplicateId,
                  x: 0,
                  y: 0,
                  rotated: false,
                },
              ],
            },
            physicalCatalog,
          ),
          itemStates: {
            states: [createFullItemState(duplicate, resourceCatalog)],
          },
        },
        dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }))
  })

  it('rejects duplicate scene item identities across nodes', () => {
    const start = snapshot({ searchedOther: true })
    const currentId = sourceId(start)
    const invalidSceneItems = {
      nodeStates: start.sceneItems.nodeStates.map((node) =>
        node.nodeId === 'other'
          ? {
              ...node,
              items: node.items.map((entity, index) =>
                index === 0
                  ? {
                      item: { ...entity.item, instanceId: currentId },
                      state: { ...entity.state, instanceId: currentId },
                    }
                  : entity,
              ),
            }
          : node,
      ),
    }
    expect(() =>
      createSceneExplorationSnapshot(
        { ...start, sceneItems: invalidSceneItems },
        dependencies,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'DUPLICATE_INSTANCE_ID' }),
    )
  })

  it('fully picks up a searched current-node item and preserves identity', () => {
    const start = snapshot()
    const result = resolveNodeItemPickupCommand(
      start,
      command(start),
      dependencies,
    )
    expect(result.result).toMatchObject({
      pickupKind: 'full',
      quantityPicked: 3,
      quantityRemaining: 0,
      backpackWeightBefore: 0,
      backpackWeightAfter: 3,
      loadTierAfter: 'normal',
    })
    expect(result.snapshot.backpack.items[0].instanceId).toBe(sourceId(start))
    expect(getSceneNodeItems(result.snapshot.sceneItems, 'current')).toHaveLength(1)
    expect(result.snapshot.itemStates.states).toContainEqual(
      expect.objectContaining({ instanceId: sourceId(start) }),
    )
  })

  it('keeps searched intel and searched state when the last item leaves', () => {
    let state = snapshot()
    for (const definitionId of ['stack', 'single']) {
      state = resolveNodeItemPickupCommand(
        state,
        command(state, {
          nodeItemInstanceId: sourceId(state, definitionId),
          quantity: definitionId === 'stack' ? 3 : 1,
          placement:
            definitionId === 'stack'
              ? { x: 0, y: 0, rotated: false }
              : { x: 1, y: 0, rotated: false },
        }),
        dependencies,
      ).snapshot
    }
    expect(searchedNode(state)).toMatchObject({
      kind: 'searched',
      revealedIntelIds: ['intel-current'],
    })
    expect(getSceneNodeItems(state.sceneItems, 'current')).toEqual([])
  })

  it('partially picks up stackable none-state items with caller identity', () => {
    const start = snapshot()
    const result = resolveNodeItemPickupCommand(
      start,
      command(start, {
        quantity: 1,
        extractedInstanceId: 'caller-new-stack',
      }),
      dependencies,
    )
    expect(result.result.pickupKind).toBe('partial')
    expect(result.snapshot.backpack.items).toContainEqual({
      instanceId: 'caller-new-stack',
      definitionId: 'stack',
      quantity: 1,
    })
    expect(
      getSceneNodeItems(result.snapshot.sceneItems, 'current').find(
        (entity) => entity.item.instanceId === sourceId(start),
      )?.item,
    ).toMatchObject({ instanceId: sourceId(start), quantity: 2 })
    expect(
      getSceneNodeItems(result.snapshot.sceneItems, 'current').find(
        (entity) => entity.item.instanceId === sourceId(start),
      )?.state.resource,
    ).toEqual({ kind: 'none' })
  })

  it.each([
    [0, 'INVALID_PICKUP_QUANTITY'],
    [-1, 'INVALID_PICKUP_QUANTITY'],
    [4, 'INVALID_PICKUP_QUANTITY'],
    [1.5, 'INVALID_PICKUP_QUANTITY'],
  ])('rejects invalid quantity %s', (quantity, rejectionCode) => {
    const start = snapshot()
    expect(
      previewNodeItemPickupCommand(
        start,
        command(start, { quantity }),
        dependencies,
      ),
    ).toEqual({ canExecute: false, rejectionCode })
  })

  it('requires and validates the caller-provided partial instance id', () => {
    const start = snapshot()
    expect(
      previewNodeItemPickupCommand(
        start,
        command(start, { quantity: 1 }),
        dependencies,
      ),
    ).toEqual({
      canExecute: false,
      rejectionCode: 'INVALID_EXTRACTED_INSTANCE_ID',
    })
    expect(
      previewNodeItemPickupCommand(
        start,
        command(start, {
          quantity: 1,
          extractedInstanceId: sourceId(start),
        }),
        dependencies,
      ),
    ).toEqual({
      canExecute: false,
      rejectionCode: 'DUPLICATE_DESTINATION_INSTANCE',
    })
  })

  it('rejects an unnecessary new id for full pickup', () => {
    const start = snapshot()
    expect(
      previewNodeItemPickupCommand(
        start,
        command(start, { extractedInstanceId: 'unused' }),
        dependencies,
      ),
    ).toEqual({
      canExecute: false,
      rejectionCode: 'INVALID_EXTRACTED_INSTANCE_ID',
    })
  })

  it('rejects partial pickup for an item with a non-none resource', () => {
    const start = snapshot({
      currentNodeId: 'other',
      searchedCurrent: false,
      searchedOther: true,
    })
    expect(
      previewNodeItemPickupCommand(
        start,
        {
          nodeItemInstanceId: sourceId(start, 'resource'),
          quantity: 1,
          extractedInstanceId: 'split-resource',
          placement: { x: 0, y: 0, rotated: false },
        },
        dependencies,
      ),
    ).toEqual({
      canExecute: false,
      rejectionCode: 'PARTIAL_PICKUP_NOT_ALLOWED',
    })
  })

  it('fully transfers a resource-bearing scene item without changing its state', () => {
    const start = snapshot({
      currentNodeId: 'other',
      searchedCurrent: false,
      searchedOther: true,
    })
    const resourceId = sourceId(start, 'resource')
    const result = resolveNodeItemPickupCommand(
      start,
      {
        nodeItemInstanceId: resourceId,
        quantity: 3,
        placement: { x: 0, y: 0, rotated: false },
      },
      dependencies,
    )
    expect(result.snapshot.itemStates.states).toContainEqual({
      instanceId: resourceId,
      definitionId: 'resource',
      resource: { kind: 'durability', current: 2 },
    })
  })

  it('rejects unsearched, remote, and unknown node items without remote pickup', () => {
    const unsearched = snapshot({ searchedCurrent: false })
    expect(
      previewNodeItemPickupCommand(
        unsearched,
        {
          nodeItemInstanceId: 'guessed',
          quantity: 1,
          placement: { x: 0, y: 0, rotated: false },
        },
        dependencies,
      ),
    ).toEqual({ canExecute: false, rejectionCode: 'UNKNOWN_NODE_ITEM' })

    const both = snapshot({ searchedOther: true })
    const otherId = getSceneNodeItems(both.sceneItems, 'other').find(
      (entity) => entity.item.definitionId === 'stack',
    )!.item.instanceId
    expect(
      previewNodeItemPickupCommand(
        both,
        {
          nodeItemInstanceId: otherId,
          quantity: 1,
          placement: { x: 0, y: 0, rotated: false },
        },
        dependencies,
      ),
    ).toEqual({
      canExecute: false,
      rejectionCode: 'NODE_ITEM_NOT_AT_CURRENT_NODE',
    })
    expect(
      previewNodeItemPickupCommand(
        both,
        {
          nodeItemInstanceId: 'unknown',
          quantity: 1,
          placement: { x: 0, y: 0, rotated: false },
        },
        dependencies,
      ),
    ).toEqual({ canExecute: false, rejectionCode: 'UNKNOWN_NODE_ITEM' })
  })

  it('rejects a not-available current node', () => {
    const start = snapshot({
      currentNodeId: 'safe',
      searchedCurrent: false,
    })
    expect(
      previewNodeItemPickupCommand(
        start,
        {
          nodeItemInstanceId: 'guessed',
          quantity: 1,
          placement: { x: 0, y: 0, rotated: false },
        },
        dependencies,
      ),
    ).toEqual({ canExecute: false, rejectionCode: 'UNKNOWN_NODE_ITEM' })
  })

  it('allows pickup at zero remaining time while the scene is active', () => {
    const start = snapshot({ remainingTime: 0 })
    expect(
      previewNodeItemPickupCommand(start, command(start), dependencies)
        .canExecute,
    ).toBe(true)
  })

  it.each([
    ['backpack', 'backpack-weight', { backpackWeight: 1 }],
    ['equipment', 'equipped-heavy', { withHeavyContainers: true }],
    ['quick slot', 'quick-heavy', { withHeavyContainers: true }],
    ['another node', 'other-node-id', { searchedOther: true }],
  ])(
    'rejects a partial destination id already used by %s',
    (location, fixedId, options) => {
      const start = snapshot(options)
      const duplicateId =
        location === 'another node'
          ? getSceneNodeItems(start.sceneItems, 'other')[0].item.instanceId
          : fixedId
      expect(
        previewNodeItemPickupCommand(
          start,
          command(start, {
            quantity: 1,
            extractedInstanceId: duplicateId,
          }),
          dependencies,
        ),
      ).toEqual({
        canExecute: false,
        rejectionCode: 'DUPLICATE_DESTINATION_INSTANCE',
      })
    },
  )

  it.each(['safe-returned', 'forced-returned', 'dead'] as const)(
    'rejects terminal status %s',
    (status) => {
      const start = snapshot({ status })
      expect(
        previewNodeItemPickupCommand(
          start,
          {
            nodeItemInstanceId: 'anything',
            quantity: 1,
            placement: { x: 0, y: 0, rotated: false },
          },
          dependencies,
        ),
      ).toEqual({ canExecute: false, rejectionCode: 'SCENE_NOT_ACTIVE' })
    },
  )
})

describe('node item pickup backpack and load boundaries', () => {
  it.each([
    [16, 'loaded'],
    [24, 'overloaded'],
  ] as const)('allows weight %i plus one as %s', (weight, tier) => {
    const start = snapshot({ backpackWeight: weight })
    const preview = previewNodeItemPickupCommand(
      start,
      command(start, {
        quantity: 1,
        extractedInstanceId: `picked-at-${weight}`,
      }),
      dependencies,
    )
    expect(preview.canExecute).toBe(true)
    if (preview.canExecute) expect(preview.result.loadTierAfter).toBe(tier)
  })

  it.each([
    [{ x: -1, y: 0, rotated: false }, 'negative x'],
    [{ x: 0, y: -1, rotated: false }, 'negative y'],
    [{ x: 0.5, y: 0, rotated: false }, 'fractional x'],
    [{ x: 0, y: 0.5, rotated: false }, 'fractional y'],
    [{ x: 0, y: 0, rotated: 1 }, 'non-boolean rotation'],
  ])('rejects structurally invalid placement: %s', (placement, _label) => {
    const start = snapshot()
    expect(
      previewNodeItemPickupCommand(
        start,
        command(start, { placement: placement as never }),
        dependencies,
      ),
    ).toEqual({
      canExecute: false,
      rejectionCode: 'INVALID_BACKPACK_PLACEMENT',
    })
  })

  it('rejects 28 plus one atomically at cannot-carry', () => {
    const start = snapshot({ backpackWeight: 28 })
    const before = structuredClone(start)
    expect(
      previewNodeItemPickupCommand(
        start,
        command(start, {
          quantity: 1,
          extractedInstanceId: 'too-heavy',
        }),
        dependencies,
      ),
    ).toEqual({ canExecute: false, rejectionCode: 'CANNOT_CARRY' })
    expect(start).toEqual(before)
  })

  it.each([
    [{ x: 6, y: 0, rotated: false }, 'out of bounds'],
    [{ x: 5, y: 3, rotated: false }, 'overlap'],
  ])('rejects %s placement without changing the node', (placement) => {
    const start = snapshot({ backpackWeight: 1 })
    const before = structuredClone(start)
    expect(
      previewNodeItemPickupCommand(
        start,
        command(start, {
          quantity: 1,
          extractedInstanceId: 'bad-placement',
          placement,
        }),
        dependencies,
      ),
    ).toEqual({
      canExecute: false,
      rejectionCode: 'INVALID_BACKPACK_PLACEMENT',
    })
    expect(start).toEqual(before)
  })

  it('rejects illegal rotation and does not auto-find another position', () => {
    const start = snapshot()
    expect(
      previewNodeItemPickupCommand(
        start,
        command(start, {
          nodeItemInstanceId: sourceId(start, 'single'),
          quantity: 1,
          placement: { x: 0, y: 0, rotated: true },
        }),
        dependencies,
      ),
    ).toEqual({
      canExecute: false,
      rejectionCode: 'INVALID_BACKPACK_PLACEMENT',
    })
  })

  it('does not include equipment or quick slots in backpack load', () => {
    const start = snapshot({ withHeavyContainers: true })
    const result = resolveNodeItemPickupCommand(
      start,
      command(start, {
        quantity: 1,
        extractedInstanceId: 'light-pickup',
      }),
      dependencies,
    )
    expect(result.result).toMatchObject({
      backpackWeightBefore: 0,
      backpackWeightAfter: 1,
      loadTierAfter: 'normal',
    })
  })

  it('does not auto-merge with an existing same-definition stack', () => {
    const start = snapshot({ backpackWeight: 1 })
    const result = resolveNodeItemPickupCommand(
      start,
      command(start, {
        quantity: 1,
        extractedInstanceId: 'separate-stack',
        placement: { x: 0, y: 0, rotated: false },
      }),
      dependencies,
    )
    expect(result.snapshot.backpack.items).toHaveLength(2)
    expect(result.snapshot.backpack.items.map((item) => item.instanceId)).toContain(
      'separate-stack',
    )
  })
})

describe('node item pickup Effect replay and side effects', () => {
  it('uses one pickup Effect for identical preview and resolution', () => {
    const start = snapshot()
    const input = command(start)
    const preview = previewNodeItemPickupCommand(start, input, dependencies)
    expect(preview.canExecute).toBe(true)
    if (!preview.canExecute) throw new Error('预览必须成功')
    const resolution = resolveNodeItemPickupCommand(
      start,
      input,
      dependencies,
    )
    expect(preview.result.effects).toEqual(resolution.result.effects)
    expect(preview.result.effects).toHaveLength(1)
    expect(preview.result.effects[0].kind).toBe('scene-item-picked-up')
    expect(preview.result.snapshot).toEqual(resolution.snapshot)
    expect(
      applySceneExplorationEffects(
        start,
        resolution.result.effects,
        dependencies,
      ),
    ).toEqual(resolution.snapshot)
  })

  it.each([
    ['nodeId', 'other'],
    ['sourceInstanceId', 'missing-source'],
    ['definitionId', 'single'],
    ['quantityBefore', 99],
    ['quantityPicked', 2],
    ['quantityRemaining', 99],
    ['pickupKind', 'partial'],
    ['destinationInstanceId', 'tampered'],
    [
      'destinationPlacement',
      { x: 99, y: 99, rotated: false },
    ],
    [
      'destinationItemState',
      {
        instanceId: 'tampered',
        definitionId: 'stack',
        resource: { kind: 'none' },
      },
    ],
  ])('rejects tampered Effect field %s atomically', (field, value) => {
    const start = snapshot()
    const result = resolveNodeItemPickupCommand(
      start,
      command(start),
      dependencies,
    )
    const before = structuredClone(start)
    expect(() =>
      applySceneExplorationEffects(
        start,
        [replaceEffect(result.result.effects[0], { [field]: value })],
        dependencies,
      ),
    ).toThrow()
    expect(start).toEqual(before)
  })

  it.each([
    'scene-node-changed',
    'scene-main-search-revealed',
  ])('rejects an appended non-pickup primary Effect: %s', (kind) => {
    const start = snapshot()
    const pickup = resolveNodeItemPickupCommand(
      start,
      command(start),
      dependencies,
    ).result.effects[0]
    const invalid =
      kind === 'scene-node-changed'
        ? {
            kind,
            reason: 'movement' as const,
            fromNodeId: 'current',
            toNodeId: 'other',
            edgeId: 'none',
          }
        : {
            kind,
            nodeId: 'current',
            searchOrdinal: 0,
            revealedItemInstanceIds: [],
            revealedItemSummary: [],
            revealedIntelIds: [],
          }
    expect(() =>
      applySceneExplorationEffects(
        start,
        [pickup, invalid] as readonly SceneExplorationEffect[],
        dependencies,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'INVALID_EFFECT_ORDER' }),
    )
  })

  it('rejects empty plans and any appended time Effect', () => {
    const start = snapshot()
    const effect = resolveNodeItemPickupCommand(
      start,
      command(start),
      dependencies,
    ).result.effects[0]
    expect(() =>
      applySceneExplorationEffects(start, [], dependencies),
    ).toThrowError(expect.objectContaining({ code: 'EMPTY_EFFECTS' }))
    expect(() =>
      applySceneExplorationEffects(
        start,
        [
          effect,
          {
            kind: 'scene-time-resolved',
            remainingTimeBefore: 100,
            actionTimeCost: 1,
            remainingTimeAfter: 99,
            overtimeDebt: 0,
          },
        ],
        dependencies,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'INVALID_EFFECT_ORDER' }),
    )
  })

  it('does not change time, bleeding health, location, status, equipment, or quick slots', () => {
    const start = snapshot({ remainingTime: 0, bleeding: true })
    const result = resolveNodeItemPickupCommand(
      start,
      command(start),
      dependencies,
    )
    expect(result.snapshot).toMatchObject({
      remainingTime: 0,
      currentNodeId: 'current',
      status: 'active',
      condition: { currentHealth: 12, bleeding: true },
      equipment: start.equipment,
      quickSlots: start.quickSlots,
    })
    expect(
      result.result.effects.some(
        (effect) =>
          effect.kind === 'scene-time-resolved' ||
          effect.kind === 'health-lost' ||
          effect.kind === 'scene-node-changed' ||
          effect.kind === 'scene-status-changed',
      ),
    ).toBe(false)
  })

  it('is deterministic for identical inputs', () => {
    const start = snapshot()
    const input = command(start, {
      quantity: 1,
      extractedInstanceId: 'stable-new-id',
    })
    expect(resolveNodeItemPickupCommand(start, input, dependencies)).toEqual(
      resolveNodeItemPickupCommand(start, input, dependencies),
    )
  })

  it('deeply freezes the result without mutating command input', () => {
    const start = snapshot()
    const input = command(start, {
      quantity: 1,
      extractedInstanceId: 'frozen-id',
    })
    const before = structuredClone(input)
    const result = resolveNodeItemPickupCommand(
      start,
      input,
      dependencies,
    )
    expect(input).toEqual(before)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.snapshot)).toBe(true)
    expect(Object.isFrozen(result.snapshot.backpack.items)).toBe(true)
    expect(Object.isFrozen(result.result.effects[0])).toBe(true)
  })
})
