import { describe, expect, it } from 'vitest'
import {
  createFullySurfaceVisibleNavigationCatalog,
  createTestNavigationKnowledgeAlongPath,
} from '../../test-support/scene-navigation'
import type { FrozenRuleConfig } from '../config'
import { createPlayerCondition } from '../condition'
import { createEquipmentProfileCatalog } from '../equipment'
import {
  calculateBackpackWeightSubtotal,
  createBackpackSnapshot,
  createItemCatalog,
  type ItemInstance,
} from '../inventory'
import {
  createFullItemState,
  createItemState,
  createItemResourceCatalog,
} from '../item-state'
import { createQuickSlotProfileCatalog } from '../quick-slot'
import { createItemReturnLifecycleCatalog } from '../run-return'
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
  applySceneInventoryEffects,
  buildNodeItemPickupTransitionPlan,
  createPickUpRevealedNodeItemCommand,
  buildSceneInventoryTransitionPlan,
  createSceneExplorationSnapshot,
  previewNodeItemPickupCommand,
  previewPlayerVisibleSceneInventoryCommand,
  previewSceneInventoryCommand,
  resolveSceneInventoryCommand,
  resolveNodeItemPickupCommand,
  type PickUpRevealedNodeItemCommand,
  type SceneExplorationEffect,
  type SceneExplorationSnapshot,
} from '.'

describe('strict node pickup command boundary', () => {
  const valid = {
    nodeItemInstanceId: 'ground-item',
    quantity: 1,
    placement: { x: 0, y: 0, rotated: false },
  } as const

  it('creates a new deeply frozen normalized command', () => {
    const command = createPickUpRevealedNodeItemCommand(valid)
    expect(command).toEqual(valid)
    expect(command).not.toBe(valid)
    expect(command.placement).not.toBe(valid.placement)
    expect(Object.isFrozen(command)).toBe(true)
    expect(Object.isFrozen(command.placement)).toBe(true)
  })

  it.each([
    null,
    [],
    { ...valid, extractedInstanceId: 'forged' },
    { ...valid, placement: { ...valid.placement, extra: true } },
    new (class PickupCommand {
      public readonly nodeItemInstanceId = 'ground-item'
      public readonly quantity = 1
      public readonly placement = { x: 0, y: 0, rotated: false }
    })(),
  ])('rejects malformed command %#', (input) => {
    expect(() => createPickUpRevealedNodeItemCommand(input)).toThrow()
  })
})

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
  scene: {
    totalTime: 100,
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

describe('scene inventory organization and node-stack merge', () => {
  it('fills multiple compatible stacks in placement order, then creates one deterministic remainder stack atomically', () => {
    const original = snapshot()
    const first = { instanceId: 'light-first', definitionId: 'light-stack', quantity: 3 }
    const second = { instanceId: 'light-second', definitionId: 'light-stack', quantity: 3 }
    const ground = { instanceId: 'light-ground', definitionId: 'light-stack', quantity: 4 }
    const start = createSceneExplorationSnapshot({
      ...original,
      backpack: createBackpackSnapshot({
        width: 6,
        height: 4,
        items: [second, first],
        placements: [
          { instanceId: second.instanceId, x: 1, y: 0, rotated: false },
          { instanceId: first.instanceId, x: 0, y: 0, rotated: false },
        ],
      }, physicalCatalog),
      itemStates: {
        states: [first, second].map((item) => createFullItemState(item, resourceCatalog)),
      },
      sceneItems: addSceneItems(
        original.sceneItems,
        'current',
        [{ item: ground, state: createFullItemState(ground, resourceCatalog) }],
        { graph, itemCatalog: physicalCatalog, itemResourceCatalog: resourceCatalog },
      ),
    }, dependencies)
    const beforeWeight = calculateBackpackWeightSubtotal(start.backpack, physicalCatalog)
    const resolved = resolveNodeItemPickupCommand(start, {
      nodeItemInstanceId: ground.instanceId,
      quantity: 3,
      placement: { x: 2, y: 0, rotated: false },
    }, dependencies)
    expect(resolved.result.effects[0]).toMatchObject({
      transfers: [
        { kind: 'merge-existing', targetInstanceId: first.instanceId, quantityBefore: 3, quantityMoved: 1, quantityAfter: 4 },
        { kind: 'merge-existing', targetInstanceId: second.instanceId, quantityBefore: 3, quantityMoved: 1, quantityAfter: 4 },
        { kind: 'create-stack', quantityBefore: 0, quantityMoved: 1, quantityAfter: 1 },
      ],
    })
    const remainder = resolved.snapshot.backpack.items.find(
      ({ instanceId }) => instanceId !== first.instanceId && instanceId !== second.instanceId,
    )!
    expect(remainder.instanceId).toContain('scene-node-pickup-split:pickup-scene')
    expect(getSceneNodeItems(resolved.snapshot.sceneItems, 'current')).toContainEqual(
      expect.objectContaining({
        item: expect.objectContaining({ instanceId: ground.instanceId, quantity: 1 }),
      }),
    )
    expect(calculateBackpackWeightSubtotal(resolved.snapshot.backpack, physicalCatalog)).toBe(beforeWeight)
    expect(resolveNodeItemPickupCommand(start, {
      nodeItemInstanceId: ground.instanceId,
      quantity: 3,
      placement: { x: 2, y: 0, rotated: false },
    }, dependencies)).toEqual(resolved)
  })

  it('rejects missing, duplicate, reordered, or mutated multi-stack pickup transfers atomically', () => {
    const original = snapshot()
    const first = { instanceId: 'tamper-first', definitionId: 'light-stack', quantity: 3 }
    const second = { instanceId: 'tamper-second', definitionId: 'light-stack', quantity: 3 }
    const ground = { instanceId: 'tamper-ground', definitionId: 'light-stack', quantity: 3 }
    const start = createSceneExplorationSnapshot({
      ...original,
      backpack: createBackpackSnapshot({
        width: 6,
        height: 4,
        items: [second, first],
        placements: [
          { instanceId: second.instanceId, x: 1, y: 0, rotated: false },
          { instanceId: first.instanceId, x: 0, y: 0, rotated: false },
        ],
      }, physicalCatalog),
      itemStates: { states: [first, second].map((candidate) => createFullItemState(candidate, resourceCatalog)) },
      sceneItems: addSceneItems(
        original.sceneItems,
        'current',
        [{ item: ground, state: createFullItemState(ground, resourceCatalog) }],
        { graph, itemCatalog: physicalCatalog, itemResourceCatalog: resourceCatalog },
      ),
    }, dependencies)
    const resolved = resolveNodeItemPickupCommand(start, {
      nodeItemInstanceId: ground.instanceId,
      quantity: 3,
      placement: { x: 2, y: 0, rotated: false },
    }, dependencies)
    const mutations: readonly ((transfers: Record<string, unknown>[]) => void)[] = [
      (transfers) => { transfers.splice(1, 1) },
      (transfers) => { transfers.push(structuredClone(transfers[0]!)) },
      (transfers) => { transfers.reverse() },
      (transfers) => { transfers[0]!.quantityMoved = 2 },
      (transfers) => { transfers[0]!.targetInstanceId = 'forged-target' },
      (transfers) => { transfers[0]!.placement = { x: 5, y: 3, rotated: false } },
      (transfers) => {
        transfers[0]!.itemState = {
          ...(transfers[0]!.itemState as Record<string, unknown>),
          definitionId: 'single',
        }
      },
    ]
    for (const mutate of mutations) {
      const effects = structuredClone(resolved.result.effects) as SceneExplorationEffect[]
      const pickup = effects[0] as Extract<SceneExplorationEffect, { kind: 'scene-item-picked-up' }>
      const transfers = pickup.transfers as unknown as Record<string, unknown>[]
      mutate(transfers)
      expect(() => applySceneExplorationEffects(
        start,
        effects,
        dependencies,
        {
          kind: 'node-item-pickup',
          command: {
            nodeItemInstanceId: ground.instanceId,
            quantity: 3,
            placement: { x: 2, y: 0, rotated: false },
          },
        },
      )).toThrow()
      expect(getSceneNodeItems(start.sceneItems, 'current')).toContainEqual(
        expect.objectContaining({ item: ground }),
      )
      expect(start.backpack.items).toEqual([first, second])
    }
  })

  it('merges a compatible node stack into the stable first backpack stack', () => {
    const original = snapshot()
    const carried = {
      instanceId: 'carried-stack',
      definitionId: 'stack',
      quantity: 2,
    }
    const start = createSceneExplorationSnapshot(
      {
        ...original,
        backpack: createBackpackSnapshot(
          {
            width: 6,
            height: 4,
            items: [carried],
            placements: [
              { instanceId: carried.instanceId, x: 4, y: 3, rotated: false },
            ],
          },
          physicalCatalog,
        ),
        itemStates: { states: [createFullItemState(carried, resourceCatalog)] },
      },
      dependencies,
    )

    const result = resolveNodeItemPickupCommand(
      start,
      command(start, { quantity: 1, placement: { x: 0, y: 0, rotated: false } }),
      dependencies,
    )

    expect(result.result.destinationInstanceId).toBe('carried-stack')
    expect(result.snapshot.backpack.items).toEqual([
      { ...carried, quantity: 3 },
    ])
    expect(result.snapshot.backpack.placements).toEqual([
      { instanceId: carried.instanceId, x: 4, y: 3, rotated: false },
    ])
  })

  it('never merges node items whose formal ItemState resource facts differ', () => {
    const original = snapshot({ currentNodeId: 'other', searchedCurrent: false, searchedOther: true })
    const carried = { instanceId: 'carried-resource', definitionId: 'resource', quantity: 1 }
    const start = createSceneExplorationSnapshot({
      ...original,
      backpack: createBackpackSnapshot({
        width: 6, height: 4, items: [carried],
        placements: [{ instanceId: carried.instanceId, x: 3, y: 0, rotated: false }],
      }, physicalCatalog),
      itemStates: { states: [createItemState({ ...carried, resource: { kind: 'durability', current: 1 } }, resourceCatalog)] },
    }, dependencies)
    const source = sourceId(start, 'resource')
    const result = resolveNodeItemPickupCommand(start, {
      nodeItemInstanceId: source,
      quantity: 3,
      placement: { x: 0, y: 0, rotated: false },
    }, dependencies)
    expect(result.snapshot.backpack.items.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(['carried-resource', source]),
    )
  })

  it('organizes actual backpack and quick-slot items at zero scene time', () => {
    const start = resolveNodeItemPickupCommand(
      snapshot(),
      command(snapshot()),
      dependencies,
    ).snapshot
    const itemId = start.backpack.items[0]!.instanceId
    const move = resolveSceneInventoryCommand(
      start,
      {
        kind: 'move-scene-backpack-item',
        instanceId: itemId,
        placement: { instanceId: itemId, x: 2, y: 1, rotated: false },
      },
      dependencies,
    ).snapshot
    const quick = resolveSceneInventoryCommand(
      move,
      { kind: 'scene-backpack-to-quick-slot', instanceId: itemId, targetSlotIndex: 0 },
      dependencies,
    ).snapshot
    const returned = resolveSceneInventoryCommand(
      quick,
      {
        kind: 'scene-quick-slot-to-backpack',
        sourceSlotIndex: 0,
        placement: { x: 3, y: 2, rotated: false },
      },
      dependencies,
    ).snapshot

    expect(returned.backpack.items).toEqual(expect.arrayContaining([
      { instanceId: itemId, definitionId: 'stack', quantity: 2 },
      expect.objectContaining({ definitionId: 'stack', quantity: 1 }),
    ]))
    expect(returned.quickSlots.slots).toEqual([null, null])
    expect(returned.remainingTime).toBe(start.remainingTime)
    expect(returned.condition).toEqual(start.condition)
  })

  it('projects formal Scene Inventory facts without raw audit, Effects, snapshots, or identities', () => {
    const picked = resolveNodeItemPickupCommand(
      snapshot({ bleeding: true }),
      command(snapshot({ bleeding: true })),
      dependencies,
    ).snapshot
    const carried = picked.backpack.items[0]!
    const preview = previewPlayerVisibleSceneInventoryCommand(picked, {
      kind: 'move-scene-backpack-item',
      instanceId: carried.instanceId,
      placement: { instanceId: carried.instanceId, x: 2, y: 1, rotated: false },
    }, dependencies)
    expect(preview).toMatchObject({
      canExecute: true,
      result: {
        operationKind: 'move-scene-backpack-item',
        source: { container: 'backpack', column: 1, row: 1 },
        target: { container: 'backpack', column: 3, row: 2 },
        backpackWeightBefore: 3,
        backpackWeightAfter: 3,
        remainingTimeBefore: 100,
        remainingTimeAfter: 100,
        healthBefore: 12,
        healthAfter: 12,
        bleedingBefore: true,
        bleedingAfter: true,
      },
    })
    const visible = JSON.stringify(preview)
    for (const hidden of [
      carried.instanceId,
      'sourceInstanceId',
      'targetInstanceId',
      'splitInstanceId',
      'SceneInventoryAudit',
      'audit',
      'effects',
      'snapshot',
      'sceneInstanceId',
    ]) expect(visible).not.toContain(hidden)
  })

  it('allows zero-time inventory only through an already strict active safety snapshot', () => {
    const initial = snapshot()
    const picked = resolveNodeItemPickupCommand(
      initial,
      command(initial),
      dependencies,
    ).snapshot
    const itemId = picked.backpack.items[0]!.instanceId
    const atSafety = createSceneExplorationSnapshot({
      ...picked,
      currentNodeId: 'safe',
      remainingTime: 0,
    }, dependencies)
    const moved = resolveSceneInventoryCommand(atSafety, {
      kind: 'move-scene-backpack-item',
      instanceId: itemId,
      placement: { instanceId: itemId, x: 2, y: 1, rotated: false },
    }, dependencies).snapshot
    expect(moved).toMatchObject({
      status: 'active',
      currentNodeId: 'safe',
      remainingTime: 0,
    })
  })

  it('splits and merges none-resource stacks with core-derived identities', () => {
    const picked = resolveNodeItemPickupCommand(snapshot(), command(snapshot()), dependencies).snapshot
    const sourceId = picked.backpack.items[0]!.instanceId
    const split = resolveSceneInventoryCommand(
      picked,
      {
        kind: 'split-scene-backpack-stack',
        sourceInstanceId: sourceId,
        quantity: 1,
        placement: { x: 1, y: 0, rotated: false },
      },
      dependencies,
    ).snapshot
    const splitItem = split.backpack.items.find((item) => item.instanceId !== sourceId)!
    expect(splitItem.instanceId).toContain('scene-backpack-split:pickup-scene')
    const merged = resolveSceneInventoryCommand(
      split,
      {
        kind: 'merge-scene-backpack-stacks',
        sourceInstanceId: splitItem.instanceId,
        targetInstanceId: sourceId,
        quantity: 1,
      },
      dependencies,
    ).snapshot
    expect(merged.backpack.items).toEqual([{ instanceId: sourceId, definitionId: 'stack', quantity: 3 }])
    expect(merged.itemStates.states.map(({ instanceId }) => instanceId)).toEqual([sourceId])
  })

  it('drops an ordinary backpack item into the current node and rejects forged Effect snapshots', () => {
    const picked = resolveNodeItemPickupCommand(snapshot(), command(snapshot()), dependencies).snapshot
    const itemId = picked.backpack.items[0]!.instanceId
    const plan = buildSceneInventoryTransitionPlan(
      picked,
      { kind: 'drop-scene-backpack-item', instanceId: itemId },
      dependencies,
    )
    const result = resolveSceneInventoryCommand(picked, plan.command, dependencies).snapshot
    expect(result.backpack.items).toEqual([])
    expect(getSceneNodeItems(result.sceneItems, result.currentNodeId)).toContainEqual(
      expect.objectContaining({ item: expect.objectContaining({ instanceId: itemId }) }),
    )
    expect(result.itemStates.states).toEqual([])
    expect(result.remainingTime).toBe(picked.remainingTime)
    expect(result.condition).toEqual(picked.condition)

    const forged = structuredClone(plan.effects) as SceneExplorationEffect[]
    ;(forged[0] as { snapshot: SceneExplorationSnapshot }).snapshot = picked
    expect(() => applySceneInventoryEffects(
      picked,
      plan.command,
      forged,
      dependencies,
    )).toThrowError(
      expect.objectContaining({ code: 'EFFECT_RESOURCE_MISMATCH' }),
    )
  })

  it('moves one resource ItemState from backpack to ground and back without duplication', () => {
    const original = snapshot({ currentNodeId: 'other', searchedCurrent: false, searchedOther: true })
    const source = sourceId(original, 'resource')
    const sourceQuantity = getSceneNodeItems(original.sceneItems, original.currentNodeId).find(
      ({ item }) => item.instanceId === source,
    )!.item.quantity
    const picked = resolveNodeItemPickupCommand(original, {
      nodeItemInstanceId: source,
      quantity: sourceQuantity,
      placement: { x: 0, y: 0, rotated: false },
    }, dependencies).snapshot
    const carriedState = picked.itemStates.states.find(({ instanceId }) => instanceId === source)!
    const dropped = resolveSceneInventoryCommand(
      picked,
      { kind: 'drop-scene-backpack-item', instanceId: source },
      dependencies,
    ).snapshot
    const ground = getSceneNodeItems(dropped.sceneItems, dropped.currentNodeId).find(
      ({ item }) => item.instanceId === source,
    )!
    expect(dropped.itemStates.states.some(({ instanceId }) => instanceId === source)).toBe(false)
    expect(ground).toEqual({
      item: expect.objectContaining({ instanceId: source }),
      state: carriedState,
    })

    const restored = resolveNodeItemPickupCommand(dropped, {
      nodeItemInstanceId: source,
      quantity: sourceQuantity,
      placement: { x: 1, y: 0, rotated: false },
    }, dependencies).snapshot
    expect(getSceneNodeItems(restored.sceneItems, restored.currentNodeId).some(
      ({ item }) => item.instanceId === source,
    )).toBe(false)
    expect(restored.itemStates.states.filter(({ instanceId }) => instanceId === source))
      .toEqual([carriedState])
    expect(restored.backpack.items).toContainEqual(expect.objectContaining({ instanceId: source }))
  })

  it('atomically rejects every tampered scene-inventory plan shape', () => {
    const picked = resolveNodeItemPickupCommand(snapshot(), command(snapshot()), dependencies).snapshot
    const itemId = picked.backpack.items[0]!.instanceId
    const plan = buildSceneInventoryTransitionPlan(
      picked,
      { kind: 'move-scene-backpack-item', instanceId: itemId, placement: { instanceId: itemId, x: 1, y: 1, rotated: false } },
      dependencies,
    )
    const before = structuredClone(picked)
    const variants: readonly ((effects: SceneExplorationEffect[]) => void)[] = [
      (effects) => effects.splice(0, 1),
      (effects) => effects.push(effects[0]!),
      (effects) => { ;(effects[0] as { command: { instanceId: string } }).command.instanceId = 'forged' },
      (effects) => { ;(effects[0] as { command: { placement: { x: number } } }).command.placement.x = 5 },
      (effects) => { ;(effects[0] as { snapshot: SceneExplorationSnapshot }).snapshot = picked },
    ]
    for (const mutate of variants) {
      const effects = structuredClone(plan.effects) as SceneExplorationEffect[]
      mutate(effects)
      expect(() => applySceneInventoryEffects(
        picked,
        plan.command,
        effects,
        dependencies,
      )).toThrow()
      expect(picked).toEqual(before)
    }
  })

  it('rejects an internally valid move Effect plan when bound to another move command', () => {
    const initial = snapshot()
    const picked = resolveNodeItemPickupCommand(
      initial,
      command(initial),
      dependencies,
    ).snapshot
    const itemId = picked.backpack.items[0]!.instanceId
    const original = buildSceneInventoryTransitionPlan(picked, {
      kind: 'move-scene-backpack-item',
      instanceId: itemId,
      placement: { instanceId: itemId, x: 1, y: 1, rotated: false },
    }, dependencies)
    const forgedAsAnotherLegalMove = buildSceneInventoryTransitionPlan(picked, {
      kind: 'move-scene-backpack-item',
      instanceId: itemId,
      placement: { instanceId: itemId, x: 2, y: 1, rotated: false },
    }, dependencies)
    expect(() => applySceneExplorationEffects(
      picked,
      forgedAsAnotherLegalMove.effects,
      dependencies,
      { kind: 'scene-inventory', command: original.command },
    )).toThrowError(expect.objectContaining({ code: 'EFFECT_RESOURCE_MISMATCH' }))
    expect(() => applySceneExplorationEffects(
      picked,
      original.effects,
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'EFFECT_RESOURCE_MISMATCH' }))
  })

  it('rejects a valid drop-B Effect plan when the independent command is drop-A', () => {
    const initial = snapshot()
    const withStack = resolveNodeItemPickupCommand(
      initial,
      command(initial),
      dependencies,
    ).snapshot
    const withTwoItems = resolveNodeItemPickupCommand(withStack, {
      nodeItemInstanceId: sourceId(withStack, 'single'),
      quantity: 1,
      placement: { x: 2, y: 0, rotated: false },
    }, dependencies).snapshot
    const [itemA, itemB] = withTwoItems.backpack.items
    if (!itemA || !itemB) throw new Error('测试需要两个背包物品')
    const dropA = buildSceneInventoryTransitionPlan(withTwoItems, {
      kind: 'drop-scene-backpack-item',
      instanceId: itemA.instanceId,
    }, dependencies)
    const dropB = buildSceneInventoryTransitionPlan(withTwoItems, {
      kind: 'drop-scene-backpack-item',
      instanceId: itemB.instanceId,
    }, dependencies)
    expect(() => applySceneExplorationEffects(
      withTwoItems,
      dropB.effects,
      dependencies,
      { kind: 'scene-inventory', command: dropA.command },
    )).toThrowError(expect.objectContaining({ code: 'EFFECT_RESOURCE_MISMATCH' }))
  })

  it('audits and rejects tampering of every rule-bearing inventory fact', () => {
    const picked = resolveNodeItemPickupCommand(snapshot(), command(snapshot()), dependencies).snapshot
    const sourceId = picked.backpack.items[0]!.instanceId
    const split = buildSceneInventoryTransitionPlan(picked, {
      kind: 'split-scene-backpack-stack',
      sourceInstanceId: sourceId,
      quantity: 1,
      placement: { x: 1, y: 0, rotated: false },
    }, dependencies)
    const splitItemId = split.snapshot.backpack.items.find(({ instanceId }) => instanceId !== sourceId)!.instanceId
    const merge = buildSceneInventoryTransitionPlan(split.snapshot, {
      kind: 'merge-scene-backpack-stacks',
      sourceInstanceId: splitItemId,
      targetInstanceId: sourceId,
      quantity: 1,
    }, dependencies)
    const quick = buildSceneInventoryTransitionPlan(picked, {
      kind: 'scene-backpack-to-quick-slot',
      instanceId: sourceId,
      targetSlotIndex: 0,
    }, dependencies)
    const dropped = buildSceneInventoryTransitionPlan(picked, {
      kind: 'drop-scene-backpack-item',
      instanceId: sourceId,
    }, dependencies)
    const cases = [
      [split, 'splitInstanceId', 'forged-split'],
      [split, 'quantityMoved', 2],
      [split, 'targetPlacement', { instanceId: splitItemId, x: 5, y: 3, rotated: false }],
      [merge, 'targetInstanceId', splitItemId],
      [merge, 'mergeResult', 'partial'],
      [merge, 'targetItemState', null],
      [quick, 'quickSlotIndex', 1],
      [dropped, 'nodeId', 'other'],
      [dropped, 'dropLifecycleKind', 'quest'],
      [dropped, 'sourceItemState', {
        ...(dropped.effects[0] as Extract<SceneExplorationEffect, { kind: 'scene-inventory-committed' }>).audit.sourceItemState,
        definitionId: 'single',
      }],
    ] as const
    for (const [plan, field, value] of cases) {
      const effects = structuredClone(plan.effects) as SceneExplorationEffect[]
      Object.assign((effects[0] as Extract<SceneExplorationEffect, { kind: 'scene-inventory-committed' }>).audit, {
        [field]: value,
      })
      const initial = plan === split ? picked : plan === merge ? split.snapshot : picked
      expect(() => applySceneInventoryEffects(
        initial,
        plan.command,
        effects,
        dependencies,
      )).toThrowError(
        expect.objectContaining({ code: 'EFFECT_RESOURCE_MISMATCH' }),
      )
    }
  })

  it('strictly rejects unknown inventory command fields and combat or terminal scenes', () => {
    const start = snapshot()
    expect(previewSceneInventoryCommand(
      start,
      { kind: 'drop-scene-backpack-item', instanceId: 'x', ignored: true },
      dependencies,
    )).toEqual({ canExecute: false, rejectionCode: 'INVALID_INPUT' })
    const picked = resolveNodeItemPickupCommand(start, command(start), dependencies).snapshot
    const carried = picked.backpack.items[0]!
    expect(previewSceneInventoryCommand(picked, {
      kind: 'move-scene-backpack-item',
      instanceId: carried.instanceId,
      placement: { instanceId: carried.instanceId, x: 6, y: 4, rotated: false },
    }, dependencies)).toEqual({ canExecute: false, rejectionCode: 'INVALID_INPUT' })
    for (const status of ['safe-returned', 'forced-returned', 'dead'] as const) {
      expect(previewSceneInventoryCommand(
        snapshot({
          status,
          currentNodeId: status === 'dead' ? 'current' : 'safe',
          remainingTime: status === 'forced-returned' ? 0 : 100,
        }),
        { kind: 'drop-scene-backpack-item', instanceId: 'x' },
        dependencies,
      )).toEqual({ canExecute: false, rejectionCode: 'SCENE_NOT_ACTIVE' })
    }
  })
})
const physicalCatalog = createItemCatalog([
  {
    id: 'light-stack',
    name: '零重测试堆叠',
    width: 1,
    height: 1,
    unitWeight: 0,
    canRotate: true,
    stacking: { kind: 'stackable', maxQuantity: 4 },
  },
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
    { definitionId: 'light-stack', kind: 'none' },
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
      definitionId === 'heavy-quick' || definitionId === 'stack'
        ? 'eligible' as const
        : 'not-eligible' as const,
  })),
  physicalCatalog.definitionIds,
)
const lifecycleCatalog = createItemReturnLifecycleCatalog(
  physicalCatalog.definitionIds.map((definitionId) => ({
    definitionId,
    kind: 'ordinary' as const,
  })),
  physicalCatalog,
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
  navigationCatalog: createFullySurfaceVisibleNavigationCatalog(graph),
  physicalCatalog,
  equipmentCatalog,
  quickSlotCatalog,
  itemResourceCatalog: resourceCatalog,
  lifecycleCatalog,
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
  const runIntelIds = searchState.nodeStates.flatMap((node) =>
    node.kind === 'searched' ? node.revealedIntelIds : [],
  )
  return createSceneExplorationSnapshot(
    {
      sceneInstanceId: 'pickup-scene',
      searchState,
      sceneItems,
      alertState: 'unalerted',
      combatState: { encounters: [], usage: { metalPipeChargedStrikeUses: 0 } },
      status,
      currentNodeId,
      navigationKnowledge: createTestNavigationKnowledgeAlongPath(
        currentNodeId === 'safe' ? ['safe'] : ['safe', currentNodeId],
        graph,
        dependencies.navigationCatalog,
      ),
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
      runIntelLog: { intelIds: runIntelIds },
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

function zeroTimeSafetyGroundSnapshot(
  bleeding = false,
): SceneExplorationSnapshot {
  const initial = snapshot({ bleeding })
  const picked = resolveNodeItemPickupCommand(
    initial,
    command(initial),
    dependencies,
  ).snapshot
  const itemId = picked.backpack.items[0]!.instanceId
  const atSafety = createSceneExplorationSnapshot({
    ...picked,
    currentNodeId: 'safe',
  }, dependencies)
  const dropped = resolveSceneInventoryCommand(atSafety, {
    kind: 'drop-scene-backpack-item',
    instanceId: itemId,
  }, dependencies).snapshot
  return createSceneExplorationSnapshot({
    ...dropped,
    remainingTime: 0,
  }, dependencies)
}

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

  it('partially picks up stackable none-state items with a core-derived identity', () => {
    const start = snapshot()
    const result = resolveNodeItemPickupCommand(
      start,
      command(start, {
        quantity: 1,
      }),
      dependencies,
    )
    expect(result.result.pickupKind).toBe('partial')
    expect(result.snapshot.backpack.items).toContainEqual({
      instanceId: result.result.destinationInstanceId,
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

  it('derives partial identities and rejects caller-provided identities', () => {
    const start = snapshot()
    expect(previewNodeItemPickupCommand(start, command(start, { quantity: 1 }), dependencies).canExecute).toBe(true)
    expect(
      previewNodeItemPickupCommand(
        start,
        { ...command(start, {
          quantity: 1,
        }), extractedInstanceId: sourceId(start) } as unknown as PickUpRevealedNodeItemCommand,
        dependencies,
      ),
    ).toEqual({
      canExecute: false,
      rejectionCode: 'INVALID_EXTRACTED_INSTANCE_ID',
    })
  })

  it('rejects an unnecessary new id for full pickup', () => {
    const start = snapshot()
    expect(
      previewNodeItemPickupCommand(
        start,
        { ...command(start), extractedInstanceId: 'unused' } as unknown as PickUpRevealedNodeItemCommand,
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

  it('allows pickup at zero remaining time from a strict active safety node', () => {
    const start = zeroTimeSafetyGroundSnapshot()
    expect(
      previewNodeItemPickupCommand(start, command(start), dependencies)
        .canExecute,
    ).toBe(true)
  })

  it('rejects caller-provided partial identities before accepting a derived identity', () => {
    const start = snapshot()
    expect(previewNodeItemPickupCommand(start, { ...command(start, { quantity: 1 }), extractedInstanceId: 'forged' } as unknown as PickUpRevealedNodeItemCommand, dependencies)).toEqual({ canExecute: false, rejectionCode: 'INVALID_EXTRACTED_INSTANCE_ID' })
  })

  it.each(['safe-returned', 'forced-returned', 'dead'] as const)(
    'rejects terminal status %s',
    (status) => {
      const start = snapshot({
        status,
        currentNodeId: status === 'dead' ? 'current' : 'safe',
        remainingTime: status === 'forced-returned' ? 0 : 100,
      })
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
        }),
        dependencies,
      ),
    ).toEqual({ canExecute: false, rejectionCode: 'CANNOT_CARRY' })
    expect(start).toEqual(before)
  })

  it.each([
    [{ x: 6, y: 0, rotated: false }, 'out of bounds'],
    [{ x: 5, y: 3, rotated: false }, 'overlap'],
  ])('uses an existing compatible stack before considering an invalid requested placement', (placement) => {
    const start = snapshot({ backpackWeight: 1 })
    const before = structuredClone(start)
    expect(
      previewNodeItemPickupCommand(
        start,
        command(start, {
          quantity: 1,
          placement,
        }),
        dependencies,
      ),
    ).toEqual(expect.objectContaining({ canExecute: true }))
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
      }),
      dependencies,
    )
    expect(result.result).toMatchObject({
      backpackWeightBefore: 0,
      backpackWeightAfter: 1,
      loadTierAfter: 'normal',
    })
  })

  it('merges a partial pickup into a compatible existing stack', () => {
    const start = snapshot({ backpackWeight: 1 })
    const result = resolveNodeItemPickupCommand(
      start,
      command(start, {
        quantity: 1,
        placement: { x: 0, y: 0, rotated: false },
      }),
      dependencies,
    )
    expect(result.snapshot.backpack.items).toEqual([
      { instanceId: 'backpack-weight', definitionId: 'stack', quantity: 2 },
    ])
    expect(result.result.destinationInstanceId).toBe('backpack-weight')
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
        { kind: 'node-item-pickup', command: input },
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
    const input = command(start)
    const result = resolveNodeItemPickupCommand(
      start,
      input,
      dependencies,
    )
    const before = structuredClone(start)
    expect(() =>
      applySceneExplorationEffects(
        start,
        [replaceEffect(result.result.effects[0], { [field]: value })],
        dependencies,
        { kind: 'node-item-pickup', command: input },
      ),
    ).toThrow()
    expect(start).toEqual(before)
  })

  it('rejects a coordinated legal quantity and placement rewrite bound to the original pickup command', () => {
    const start = snapshot()
    const original = command(start, {
      quantity: 1,
      placement: { x: 0, y: 0, rotated: false },
    })
    const forgedAsAnotherLegalPickup = buildNodeItemPickupTransitionPlan(
      start,
      command(start, {
        quantity: 2,
        placement: { x: 2, y: 1, rotated: false },
      }),
      dependencies,
    )
    expect(() => applySceneExplorationEffects(
      start,
      forgedAsAnotherLegalPickup.effects,
      dependencies,
      { kind: 'node-item-pickup', command: original },
    )).toThrowError(expect.objectContaining({ code: 'EFFECT_PICKUP_MISMATCH' }))
    expect(() => applySceneExplorationEffects(
      start,
      forgedAsAnotherLegalPickup.effects,
      dependencies,
    )).toThrowError(expect.objectContaining({ code: 'EFFECT_PICKUP_MISMATCH' }))
  })

  it.each([
    'scene-node-changed',
    'scene-main-search-revealed',
  ])('rejects an appended non-pickup primary Effect: %s', (kind) => {
    const start = snapshot()
    const input = command(start)
    const pickup = resolveNodeItemPickupCommand(
      start,
      input,
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
        { kind: 'node-item-pickup', command: input },
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'INVALID_EFFECT_ORDER' }),
    )
  })

  it('rejects empty plans and any appended time Effect', () => {
    const start = snapshot()
    const input = command(start)
    const effect = resolveNodeItemPickupCommand(
      start,
      input,
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
        { kind: 'node-item-pickup', command: input },
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'INVALID_EFFECT_ORDER' }),
    )
  })

  it('does not change time, bleeding health, location, status, equipment, or quick slots', () => {
    const start = zeroTimeSafetyGroundSnapshot(true)
    const result = resolveNodeItemPickupCommand(
      start,
      command(start),
      dependencies,
    )
    expect(result.snapshot).toMatchObject({
      remainingTime: 0,
      currentNodeId: 'safe',
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
    })
    expect(resolveNodeItemPickupCommand(start, input, dependencies)).toEqual(
      resolveNodeItemPickupCommand(start, input, dependencies),
    )
  })

  it('deeply freezes the result without mutating command input', () => {
    const start = snapshot()
    const input = command(start, {
      quantity: 1,
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
