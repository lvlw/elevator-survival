import { describe, expect, it } from 'vitest'
import { type FrozenRuleConfig } from '../config'
import { createPlayerCondition } from '../condition'
import { createEmptySceneItemsSnapshot } from '../scene-items'
import { createEquipmentProfileCatalog } from '../equipment'
import { createBackpackSnapshot, createItemCatalog } from '../inventory'
import {
  createFullItemState,
  createItemResourceCatalog,
  createItemState,
  getItemState,
} from '../item-state'
import { createQuickSlotProfileCatalog } from '../quick-slot'
import { createSceneGraph } from '../scene-graph'
import {
  createMainSearchDefinitionCatalog,
  createSceneSearchState,
  createSearchIlluminationProfileCatalog,
  revealPreparedMainSearchOutcome,
} from '../scene-search'
import {
  applySceneExplorationEffects,
  createSceneExplorationSnapshot,
  previewMainSearchCommand,
  resolveMainSearchCommand,
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
  scene: {
    postActionBleedingDamage: 1,
    searchTime: {
      withFlashlight: 20,
      withoutFlashlight: 30,
      flashlightChargeCost: 1,
    },
    travelTimeModifiers: { minorContusionTimeIncreasePercent: 10 },
  },
  medical: {
    painkiller: { suppressesMinorContusionMovementPenalty: true },
  },
  forcedReturn: {
    effectiveTimePerBaseDamage: 20,
    baseDamageCap: 4,
    bleedingExtraDamage: 1,
    bleedingExtraDamageCountsTowardBaseCap: false,
  },
} as unknown as FrozenRuleConfig

const graph = createSceneGraph({
  nodes: [
    { id: 'safe', name: '安全点', isReturnSafetyNode: true },
    { id: 'search', name: '搜索点', isReturnSafetyNode: false },
  ],
  edges: [
    {
      id: 'safe-search',
      from: 'safe',
      to: 'search',
      baseTravelTime: 10,
      bidirectional: true,
    },
  ],
})
const physicalCatalog = createItemCatalog([
  {
    id: 'flashlight',
    name: '手电筒',
    width: 1,
    height: 2,
    unitWeight: 2,
    canRotate: true,
    stacking: { kind: 'none' },
  },
  {
    id: 'crowbar',
    name: '撬棍',
    width: 1,
    height: 3,
    unitWeight: 4,
    canRotate: true,
    stacking: { kind: 'none' },
  },
  {
    id: 'weight',
    name: '负重',
    width: 1,
    height: 1,
    unitWeight: 1,
    canRotate: true,
    stacking: { kind: 'stackable', maxQuantity: 30 },
  },
  {
    id: 'bandage',
    name: '绷带',
    width: 1,
    height: 1,
    unitWeight: 1,
    canRotate: true,
    stacking: { kind: 'stackable', maxQuantity: 3 },
  },
])
const equipmentCatalog = createEquipmentProfileCatalog(
  [
    {
      definitionId: 'flashlight',
      kind: 'equippable',
      eligibleSlots: ['utility'],
    },
    {
      definitionId: 'crowbar',
      kind: 'equippable',
      eligibleSlots: ['utility'],
    },
    { definitionId: 'weight', kind: 'not-equippable' },
    { definitionId: 'bandage', kind: 'not-equippable' },
  ],
  physicalCatalog.definitionIds,
)
const quickSlotCatalog = createQuickSlotProfileCatalog(
  physicalCatalog.definitionIds.map((definitionId) => ({
    definitionId,
    kind:
      definitionId === 'bandage' || definitionId === 'flashlight'
        ? 'eligible' as const
        : 'not-eligible' as const,
  })),
  physicalCatalog.definitionIds,
)
const itemResourceCatalog = createItemResourceCatalog(
  [
    { definitionId: 'flashlight', kind: 'charge', maximum: 3 },
    { definitionId: 'crowbar', kind: 'durability', maximum: 3 },
    { definitionId: 'weight', kind: 'none' },
    { definitionId: 'bandage', kind: 'none' },
  ],
  physicalCatalog.definitionIds,
)
const searchCatalog = createMainSearchDefinitionCatalog(
  [
    {
      nodeId: 'search',
      searchOrdinal: 0,
      fixedItemGrants: [
        {
          definitionId: 'bandage',
          quantity: 1,
          initialState: { kind: 'none' },
        },
      ],
      weightedItemChoice: null,
      fixedIntelIds: ['intel-search'],
    },
  ],
  graph,
  physicalCatalog,
  itemResourceCatalog,
)
const searchIlluminationCatalog =
  createSearchIlluminationProfileCatalog(
    physicalCatalog.definitionIds.map((definitionId) => ({
      definitionId,
      kind:
        definitionId === 'flashlight'
          ? 'low-light-provider' as const
          : 'not-provider' as const,
    })),
    physicalCatalog.definitionIds,
  )
const dependencies = {
  graph,
  physicalCatalog,
  equipmentCatalog,
  quickSlotCatalog,
  itemResourceCatalog,
  searchCatalog,
  searchIlluminationCatalog,
  config,
}

interface SnapshotOptions {
  readonly nodeId?: 'safe' | 'search'
  readonly remainingTime?: number
  readonly status?: SceneExplorationSnapshot['status']
  readonly currentHealth?: number
  readonly bleeding?: boolean
  readonly minorContusions?: number
  readonly painkillerActive?: boolean
  readonly utility?: 'flashlight' | 'crowbar' | null
  readonly flashlightCharge?: number
  readonly backpackWeight?: number
  readonly flashlightInBackpack?: boolean
  readonly flashlightInQuickSlot?: boolean
  readonly searched?: boolean
}

function snapshot(options: SnapshotOptions = {}): SceneExplorationSnapshot {
  const {
    nodeId = 'search',
    remainingTime = 100,
    status = 'active',
    currentHealth = status === 'dead' ? 0 : 12,
    bleeding = false,
    minorContusions = 0,
    painkillerActive = false,
    utility = null,
    flashlightCharge = 3,
    backpackWeight = 0,
    flashlightInBackpack = false,
    flashlightInQuickSlot = false,
    searched = false,
  } = options
  const backpackItems = [
    ...(backpackWeight > 0
      ? [
          {
            instanceId: 'weight-1',
            definitionId: 'weight',
            quantity: backpackWeight,
          },
        ]
      : []),
    ...(flashlightInBackpack
      ? [
          {
            instanceId: 'flashlight-backpack',
            definitionId: 'flashlight',
            quantity: 1,
          },
        ]
      : []),
  ]
  const backpack = createBackpackSnapshot(
    {
      width: 6,
      height: 4,
      items: backpackItems,
      placements: backpackItems.map((item, index) => ({
        instanceId: item.instanceId,
        x: index,
        y: 0,
        rotated: false,
      })),
    },
    physicalCatalog,
  )
  const utilityItem =
    utility === null
      ? null
      : {
          instanceId: `equipped-${utility}`,
          definitionId: utility,
          quantity: 1,
        }
  const quickItem = flashlightInQuickSlot
    ? {
        instanceId: 'flashlight-quick',
        definitionId: 'flashlight',
        quantity: 1,
      }
    : null
  const carriedItems = [
    ...backpack.items,
    ...(utilityItem ? [utilityItem] : []),
    ...(quickItem ? [quickItem] : []),
  ]
  const itemStates = carriedItems.map((item) =>
    item.definitionId === 'flashlight'
      ? createItemState(
          {
            instanceId: item.instanceId,
            definitionId: item.definitionId,
            resource: { kind: 'charge', current: flashlightCharge },
          },
          itemResourceCatalog,
        )
      : createFullItemState(item, itemResourceCatalog),
  )
  let searchState = createSceneSearchState({
    runSeed: 'search-command-seed',
    sceneInstanceId: 'scene-command',
    graph,
    searchCatalog,
    itemCatalog: physicalCatalog,
    itemResourceCatalog,
  })
  if (searched) {
    searchState = revealPreparedMainSearchOutcome(searchState, 'search')
  }
  return createSceneExplorationSnapshot(
    {
      sceneInstanceId: 'scene-command',
      searchState,
      sceneItems: createEmptySceneItemsSnapshot({
        graph,
        itemCatalog: physicalCatalog,
        itemResourceCatalog,
      }),
      alertState: 'unalerted',
      combatState: { encounters: [], usage: { metalPipeChargedStrikeUses: 0 } },
      status,
      currentNodeId: nodeId,
      remainingTime,
      enabledEdgeIds: ['safe-search'],
      backpack,
      equipment: {
        weapon: null,
        armor: null,
        utility: utilityItem,
      },
      quickSlots: { slots: [quickItem, null] },
      itemStates: { states: itemStates },
      condition: createPlayerCondition(
        {
          currentHealth,
          bleeding,
          openWounds: bleeding
          ? [{ id: 'fixture-wound', kind: 'laceration', treatment: 'untreated' }]
          : [],
        pendingInfectionExposures: 0,
          minorContusions,
          painkillerActive,
        },
        config.combat.player,
      ),
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

function replaceEffect(
  effects: readonly SceneExplorationEffect[],
  kind: SceneExplorationEffect['kind'],
  changes: Record<string, unknown>,
): readonly SceneExplorationEffect[] {
  return effects.map((effect) =>
    effect.kind === kind ? { ...effect, ...changes } : effect,
  ) as readonly SceneExplorationEffect[]
}

describe('main search command eligibility and timing', () => {
  it('creates a frozen carried-state snapshot with complete instance states', () => {
    const input = snapshot({
      utility: 'flashlight',
      flashlightInQuickSlot: true,
      backpackWeight: 1,
    })
    expect(Object.isFrozen(input.equipment)).toBe(true)
    expect(Object.isFrozen(input.quickSlots)).toBe(true)
    expect(Object.isFrozen(input.itemStates)).toBe(true)
    expect(input.itemStates.states).toHaveLength(3)
  })

  it('rejects the same instance across backpack and equipment', () => {
    const input = snapshot({ utility: 'flashlight' })
    const duplicateBackpack = createBackpackSnapshot(
      {
        width: 6,
        height: 4,
        items: [
          {
            instanceId: 'equipped-flashlight',
            definitionId: 'flashlight',
            quantity: 1,
          },
        ],
        placements: [
          {
            instanceId: 'equipped-flashlight',
            x: 0,
            y: 0,
            rotated: false,
          },
        ],
      },
      physicalCatalog,
    )
    expect(() =>
      createSceneExplorationSnapshot(
        { ...input, backpack: duplicateBackpack },
        dependencies,
      ),
    ).toThrow()
  })

  it('uses an explicitly equipped charged provider for configured time', () => {
    const result = resolveMainSearchCommand(
      snapshot({ utility: 'flashlight' }),
      illuminated,
      dependencies,
    )
    expect(result.result).toMatchObject({
      illumination: 'use-equipped-flashlight',
      lightingOutcome: 'illuminated',
      actionTime: config.scene.searchTime.withFlashlight,
      flashlightInstanceId: 'equipped-flashlight',
    })
    expect(result.snapshot.remainingTime).toBe(80)
  })

  it.each([
    ['not equipped', snapshot({ flashlightInBackpack: true }), 'ILLUMINATION_PROVIDER_NOT_EQUIPPED'],
    ['quick slot only', snapshot({ flashlightInQuickSlot: true }), 'ILLUMINATION_PROVIDER_NOT_EQUIPPED'],
    ['wrong utility', snapshot({ utility: 'crowbar' }), 'INVALID_ILLUMINATION_PROVIDER'],
    ['depleted', snapshot({ utility: 'flashlight', flashlightCharge: 0 }), 'INSUFFICIENT_ILLUMINATION_CHARGE'],
  ])('rejects illumination when provider is %s', (_name, input, code) => {
    expect(previewMainSearchCommand(input, illuminated, dependencies)).toEqual({
      canExecute: false,
      rejectionCode: code,
    })
  })

  it('allows explicit low-light search despite an equipped charged provider', () => {
    const input = snapshot({ utility: 'flashlight' })
    const result = resolveMainSearchCommand(input, lowLight, dependencies)
    expect(result.result.actionTime).toBe(
      config.scene.searchTime.withoutFlashlight,
    )
    expect(result.result.lightingOutcome).toBe('low-light')
    expect(result.result.effects.some(
      (effect) => effect.kind === 'item-resource-consumed',
    )).toBe(false)
    expect(result.snapshot.itemStates).toEqual(input.itemStates)
  })

  it('allows low-light search without any flashlight', () => {
    expect(
      resolveMainSearchCommand(snapshot(), lowLight, dependencies).result,
    ).toMatchObject({
      lightingOutcome: 'low-light',
      flashlightInstanceId: null,
      actionTime: config.scene.searchTime.withoutFlashlight,
    })
  })

  it.each([
    ['already searched', snapshot({ searched: true }), 'MAIN_SEARCH_ALREADY_COMPLETED'],
    ['not searchable', snapshot({ nodeId: 'safe' }), 'MAIN_SEARCH_NOT_AVAILABLE'],
    ['inactive', snapshot({ status: 'forced-returned' }), 'SCENE_NOT_ACTIVE'],
    ['time exhausted', snapshot({ remainingTime: 0 }), 'SCENE_TIME_EXHAUSTED'],
    ['dead', snapshot({ status: 'dead' }), 'SCENE_NOT_ACTIVE'],
  ])('rejects %s without partial effects', (_name, input, code) => {
    expect(previewMainSearchCommand(input, lowLight, dependencies)).toEqual({
      canExecute: false,
      rejectionCode: code,
    })
  })

  it('rejects a search definition whose node metadata disagrees before producing effects', () => {
    const input = snapshot({ utility: 'flashlight' })
    const mismatchedSearchCatalog = {
      nodeIds: searchCatalog.nodeIds,
      has: (nodeId: string) => searchCatalog.has(nodeId),
      get: (nodeId: string) => ({
        ...searchCatalog.get(nodeId),
        nodeId: 'safe',
      }),
    }
    expect(previewMainSearchCommand(
      input,
      illuminated,
      { ...dependencies, searchCatalog: mismatchedSearchCatalog },
    )).toEqual({
      canExecute: false,
      rejectionCode: 'INVALID_INPUT',
    })
    expect(input.remainingTime).toBe(100)
    expect(getItemState(input.itemStates, 'equipped-flashlight').resource).toEqual({
      kind: 'charge',
      current: 3,
    })
  })

  it.each([
    [0, false, false, 30, 10],
    [17, false, false, 30, 11],
    [25, false, false, 30, 13],
    [17, true, false, 30, 13],
    [17, true, true, 30, 11],
  ])(
    'keeps search time fixed at weight %i and contusion=%s analgesia=%s',
    (backpackWeight, minorContusions, painkillerActive, actionTime, returnTime) => {
      const result = resolveMainSearchCommand(
        snapshot({
          backpackWeight,
          minorContusions: minorContusions ? 1 : 0,
          painkillerActive,
        }),
        lowLight,
        dependencies,
      )
      expect(result.result.actionTime).toBe(actionTime)
      expect(result.result.returnRoute.estimatedReturnTime).toBe(returnTime)
    },
  )

  it('allows a positive-time search to cross zero', () => {
    const result = resolveMainSearchCommand(
      snapshot({ remainingTime: 5 }),
      lowLight,
      dependencies,
    )
    expect(result.result.sceneOutcome).toMatchObject({
      overtimeDebt: 25,
      kind: 'forced-return',
    })
    expect(result.snapshot.status).toBe('forced-returned')
    expect(result.snapshot.currentNodeId).toBe('safe')
  })
})

describe('main search effects and terminal ordering', () => {
  it('consumes charge, reveals prepared results, then resolves time', () => {
    const result = resolveMainSearchCommand(
      snapshot({ utility: 'flashlight', flashlightCharge: 3 }),
      illuminated,
      dependencies,
    )
    expect(result.result.effects.map((effect) => effect.kind)).toEqual([
      'item-resource-consumed',
      'scene-main-search-revealed',
      'scene-time-resolved',
    ])
    expect(result.snapshot.itemStates.states.find(
      (state) => state.instanceId === 'equipped-flashlight',
    )?.resource).toEqual({ kind: 'charge', current: 2 })
    expect(result.snapshot.equipment.utility?.instanceId).toBe(
      'equipped-flashlight',
    )
    const searched = result.snapshot.searchState.nodeStates.find(
      (node) => node.nodeId === 'search',
    )
    expect(searched?.kind).toBe('searched')
    expect(result.snapshot.backpack).toEqual(
      snapshot({ utility: 'flashlight' }).backpack,
    )
  })

  it('allows the final charge and keeps the depleted item equipped', () => {
    const result = resolveMainSearchCommand(
      snapshot({ utility: 'flashlight', flashlightCharge: 1 }),
      illuminated,
      dependencies,
    )
    expect(result.snapshot.itemStates.states[0]?.resource).toEqual({
      kind: 'charge',
      current: 0,
    })
    expect(result.snapshot.equipment.utility?.definitionId).toBe('flashlight')
  })

  it('reveals identical items and intel with or without illumination', () => {
    const withLight = resolveMainSearchCommand(
      snapshot({ utility: 'flashlight' }),
      illuminated,
      dependencies,
    )
    const withoutLight = resolveMainSearchCommand(
      snapshot({ utility: 'flashlight' }),
      lowLight,
      dependencies,
    )
    const node = (state: SceneExplorationSnapshot) =>
      state.searchState.nodeStates.find(
        (candidate) => candidate.nodeId === 'search',
      )
    expect(node(withLight.snapshot)).toEqual(node(withoutLight.snapshot))
  })

  it('rejects tampered resource and reveal declarations atomically', () => {
    const start = snapshot({ utility: 'flashlight' })
    const resolved = resolveMainSearchCommand(
      start,
      illuminated,
      dependencies,
    )
    const badResource = replaceEffect(
      resolved.result.effects,
      'item-resource-consumed',
      { currentBefore: 2 },
    )
    const badReveal = replaceEffect(
      resolved.result.effects,
      'scene-main-search-revealed',
      { revealedIntelIds: ['forged-intel'] },
    )
    expect(() =>
      applySceneExplorationEffects(
        start,
        badResource,
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'EFFECT_RESOURCE_MISMATCH' }))
    expect(() =>
      applySceneExplorationEffects(
        start,
        badReveal,
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'EFFECT_SEARCH_MISMATCH' }))
    expect(start).toEqual(snapshot({ utility: 'flashlight' }))
  })

  it('rejects a search plan against an already searched state', () => {
    const plan = resolveMainSearchCommand(
      snapshot(),
      lowLight,
      dependencies,
    ).result.effects
    expect(() =>
      applySceneExplorationEffects(
        snapshot({ searched: true }),
        plan,
        config.combat.player,
      ),
    ).toThrowError(expect.objectContaining({ code: 'EFFECT_SEARCH_MISMATCH' }))
  })

  it('uses identical preview/resolve effects and deterministic replay', () => {
    const start = snapshot({ utility: 'flashlight' })
    const preview = previewMainSearchCommand(
      start,
      illuminated,
      dependencies,
    )
    const resolved = resolveMainSearchCommand(
      start,
      illuminated,
      dependencies,
    )
    expect(preview.canExecute).toBe(true)
    if (!preview.canExecute) throw new Error('搜索预览必须成功')
    expect(preview.result.effects).toEqual(resolved.result.effects)
    expect(
      applySceneExplorationEffects(
        start,
        resolved.result.effects,
        dependencies,
      ),
    ).toEqual(resolved.snapshot)
    expect(
      applySceneExplorationEffects(
        snapshot({ utility: 'flashlight' }),
        resolved.result.effects,
        dependencies,
      ),
    ).toEqual(resolved.snapshot)
  })

  it('keeps revealed results and charge consumption after forced return', () => {
    const result = resolveMainSearchCommand(
      snapshot({
        utility: 'flashlight',
        flashlightCharge: 3,
        remainingTime: 5,
      }),
      illuminated,
      dependencies,
    )
    expect(result.snapshot.status).toBe('forced-returned')
    expect(result.snapshot.searchState.nodeStates.find(
      (node) => node.nodeId === 'search',
    )?.kind).toBe('searched')
    expect(result.snapshot.itemStates.states[0]?.resource).toEqual({
      kind: 'charge',
      current: 2,
    })
  })

  it('keeps primary effects when post-action bleeding kills before return', () => {
    const result = resolveMainSearchCommand(
      snapshot({
        utility: 'flashlight',
        flashlightCharge: 3,
        remainingTime: 5,
        currentHealth: 1,
        bleeding: true,
      }),
      illuminated,
      dependencies,
    )
    expect(result.snapshot.status).toBe('dead')
    expect(result.snapshot.currentNodeId).toBe('search')
    expect(result.snapshot.searchState.nodeStates.find(
      (node) => node.nodeId === 'search',
    )?.kind).toBe('searched')
    expect(result.snapshot.itemStates.states[0]?.resource).toEqual({
      kind: 'charge',
      current: 2,
    })
    expect(result.result.effects.some(
      (effect) =>
        effect.kind === 'scene-node-changed' &&
        effect.reason === 'forced-return',
    )).toBe(false)
  })
})
