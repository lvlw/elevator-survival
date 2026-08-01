import { describe, expect, it } from 'vitest'
import { createItemCatalog } from '../inventory'
import { createItemResourceCatalog } from '../item-state'
import { createRandomCursor, createStreamId, drawIntInclusive } from '../random'
import { createSceneGraph } from '../scene-graph'
import {
  createMainSearchDefinitionCatalog,
  createSceneItemSnapshot,
  createSearchIlluminationProfileCatalog,
  createSceneSearchState,
  getPlayerVisibleNodeSearchState,
  materializeMainSearchOutcome,
  revealPreparedMainSearchOutcome,
  SceneSearchError,
  validateSceneSearchState,
  type MainSearchDefinition,
  type SceneSearchStateSnapshot,
} from '.'

const graph = createSceneGraph({
  nodes: [
    { id: 'a', name: 'A', isReturnSafetyNode: true },
    { id: 'b', name: 'B', isReturnSafetyNode: false },
    { id: 'c', name: 'C', isReturnSafetyNode: false },
  ],
  edges: [],
})
const items = createItemCatalog([
  { id: 'stack-a', name: 'A', width: 1, height: 1, unitWeight: 1, canRotate: true, stacking: { kind: 'stackable', maxQuantity: 3 } },
  { id: 'stack-b', name: 'B', width: 1, height: 1, unitWeight: 1, canRotate: true, stacking: { kind: 'stackable', maxQuantity: 4 } },
  { id: 'single', name: 'S', width: 1, height: 2, unitWeight: 2, canRotate: true, stacking: { kind: 'none' } },
])
const resources = createItemResourceCatalog(
  items.definitionIds.map((definitionId) => ({
    definitionId,
    kind: 'none' as const,
  })),
  items.definitionIds,
)
const definition = (nodeId = 'a'): MainSearchDefinition => ({
  nodeId,
  searchOrdinal: 0,
  fixedItemGrants: [
    {
      definitionId: 'single',
      quantity: 1,
      initialState: { kind: 'none' },
    },
  ],
  weightedItemChoice: {
    entries: [
      { grant: { definitionId: 'stack-b', quantity: 1, initialState: { kind: 'none' } }, weight: 30 },
      { grant: { definitionId: 'stack-a', quantity: 2, initialState: { kind: 'none' } }, weight: 70 },
    ],
  },
  fixedIntelIds: ['intel-b', 'intel-a'],
})

describe('main search definition catalog', () => {
  it('normalizes and deeply freezes valid definitions without mutating input', () => {
    const input = definition()
    const before = structuredClone(input)
    const catalog = createMainSearchDefinitionCatalog(
      [input],
      graph,
      items,
      resources,
    )
    expect(catalog.nodeIds).toEqual(['a'])
    expect(catalog.get('a').weightedItemChoice?.entries.map((entry) => entry.grant.definitionId)).toEqual(['stack-a', 'stack-b'])
    expect(catalog.get('a').fixedIntelIds).toEqual(['intel-a', 'intel-b'])
    expect(input).toEqual(before)
    expect(Object.isFrozen(catalog)).toBe(true)
    expect(Object.isFrozen(catalog.get('a').weightedItemChoice?.entries)).toBe(true)
  })

  it.each([
    [[definition('a'), definition('a')], 'DUPLICATE_NODE_DEFINITION'],
    [[definition('missing')], 'UNKNOWN_NODE'],
    [[{ ...definition(), nodeId: '' }], 'INVALID_NODE_ID'],
    [[{ ...definition(), fixedItemGrants: [{ definitionId: '', quantity: 1, initialState: { kind: 'none' } }] }], 'INVALID_GRANT'],
    [[{ ...definition(), fixedItemGrants: [{ definitionId: 'missing', quantity: 1, initialState: { kind: 'none' } }] }], 'INVALID_GRANT'],
    [[{ ...definition(), fixedItemGrants: [{ definitionId: 'stack-a', quantity: 0, initialState: { kind: 'none' } }] }], 'INVALID_GRANT'],
    [[{ ...definition(), fixedItemGrants: [{ definitionId: 'single', quantity: 2, initialState: { kind: 'none' } }] }], 'INVALID_GRANT'],
    [[{ ...definition(), fixedItemGrants: [{ definitionId: 'stack-a', quantity: 4, initialState: { kind: 'none' } }] }], 'INVALID_GRANT'],
    [[{ ...definition(), fixedItemGrants: [{ definitionId: 'stack-a', quantity: 1 }] }], 'INVALID_INITIAL_STATE'],
    [[{ ...definition(), weightedItemChoice: { entries: [{ grant: { definitionId: 'stack-a', quantity: 1, initialState: { kind: 'none' } }, weight: 1 }] } }], 'INVALID_WEIGHTED_POOL'],
    [[{ ...definition(), weightedItemChoice: { entries: [{ grant: { definitionId: 'stack-a', quantity: 1, initialState: { kind: 'none' } }, weight: 0 }, { grant: { definitionId: 'stack-b', quantity: 1, initialState: { kind: 'none' } }, weight: 1 }] } }], 'INVALID_WEIGHT'],
    [[{ ...definition(), weightedItemChoice: { entries: [{ grant: { definitionId: 'stack-a', quantity: 1, initialState: { kind: 'none' } }, weight: 1 }, { grant: { definitionId: 'stack-a', quantity: 2, initialState: { kind: 'none' } }, weight: 1 }] } }], 'DUPLICATE_WEIGHTED_DEFINITION'],
    [[{ ...definition(), fixedIntelIds: ['same', 'same'] }], 'DUPLICATE_INTEL_ID'],
  ])('rejects invalid definition %# as %s', (definitions, code) => {
    expect(() =>
      createMainSearchDefinitionCatalog(
        definitions as MainSearchDefinition[],
        graph,
        items,
        resources,
      ),
    ).toThrowError(expect.objectContaining({ code }))
  })

  it('rejects safe-integer weight sum overflow', () => {
    const invalid = definition()
    expect(() =>
      createMainSearchDefinitionCatalog(
        [{
          ...invalid,
          weightedItemChoice: {
            entries: [
              { grant: { definitionId: 'stack-a', quantity: 1, initialState: { kind: 'none' } }, weight: Number.MAX_SAFE_INTEGER },
              { grant: { definitionId: 'stack-b', quantity: 1, initialState: { kind: 'none' } }, weight: 1 },
            ],
          },
        }],
        graph,
        items,
        resources,
      ),
    ).toThrowError(expect.objectContaining({ code: 'WEIGHT_OVERFLOW' }))
  })
})

describe('scene item snapshots and explicit initial resources', () => {
  const resourceItems = createItemCatalog([
    {
      id: 'none-item',
      name: '无资源',
      width: 1,
      height: 1,
      unitWeight: 1,
      canRotate: true,
      stacking: { kind: 'stackable', maxQuantity: 3 },
    },
    {
      id: 'durable-item',
      name: '耐久物',
      width: 1,
      height: 1,
      unitWeight: 1,
      canRotate: true,
      stacking: { kind: 'none' },
    },
  ])
  const resourceProfiles = createItemResourceCatalog(
    [
      { definitionId: 'none-item', kind: 'none' },
      { definitionId: 'durable-item', kind: 'durability', maximum: 3 },
    ],
    resourceItems.definitionIds,
  )

  it('creates a deeply frozen entity without mutating input', () => {
    const input = {
      item: {
        instanceId: 'entity-1',
        definitionId: 'none-item',
        quantity: 1,
      },
      state: {
        instanceId: 'entity-1',
        definitionId: 'none-item',
        resource: { kind: 'none' as const },
      },
    }
    const before = structuredClone(input)
    const entity = createSceneItemSnapshot(
      input,
      resourceItems,
      resourceProfiles,
    )
    expect(entity).toEqual(before)
    expect(input).toEqual(before)
    expect(Object.isFrozen(entity)).toBe(true)
    expect(Object.isFrozen(entity.item)).toBe(true)
    expect(Object.isFrozen(entity.state.resource)).toBe(true)
  })

  it.each([
    [
      {
        item: { instanceId: 'a', definitionId: 'none-item', quantity: 1 },
        state: { instanceId: 'b', definitionId: 'none-item', resource: { kind: 'none' } },
      },
      'ITEM_IDENTITY_MISMATCH',
    ],
    [
      {
        item: { instanceId: 'a', definitionId: 'none-item', quantity: 1 },
        state: { instanceId: 'a', definitionId: 'durable-item', resource: { kind: 'durability', current: 1 } },
      },
      'ITEM_IDENTITY_MISMATCH',
    ],
    [
      {
        item: { instanceId: 'a', definitionId: 'none-item', quantity: 1 },
        state: { instanceId: 'a', definitionId: 'none-item', resource: { kind: 'charge', current: 1 } },
      },
      'RESOURCE_KIND_MISMATCH',
    ],
  ])('rejects mismatched scene entity %#', (input, code) => {
    expect(() =>
      createSceneItemSnapshot(
        input as never,
        resourceItems,
        resourceProfiles,
      ),
    ).toThrowError(expect.objectContaining({ code }))
  })

  it('requires none for none profiles and explicit for resource profiles', () => {
    const valid = createMainSearchDefinitionCatalog(
      [
        {
          nodeId: 'a',
          searchOrdinal: 0,
          fixedItemGrants: [
            {
              definitionId: 'durable-item',
              quantity: 1,
              initialState: { kind: 'explicit', current: 2 },
            },
          ],
          weightedItemChoice: null,
          fixedIntelIds: [],
        },
      ],
      graph,
      resourceItems,
      resourceProfiles,
    )
    const outcome = materializeMainSearchOutcome(
      'seed',
      'resource-scene',
      valid.get('a'),
      resourceItems,
      resourceProfiles,
    )
    expect(outcome.revealedItems[0].state.resource).toEqual({
      kind: 'durability',
      current: 2,
    })
    expect(outcome.revealedItems[0].item.instanceId).toBe(
      outcome.revealedItems[0].state.instanceId,
    )
  })

  it.each([
    ['none-item', { kind: 'explicit', current: 1 }],
    ['durable-item', { kind: 'none' }],
    ['durable-item', { kind: 'explicit', current: 4 }],
    ['durable-item', { kind: 'explicit', current: -1 }],
    ['durable-item', { kind: 'explicit', current: 1.5 }],
  ])('rejects invalid explicit initial state for %s', (definitionId, initialState) => {
    expect(() =>
      createMainSearchDefinitionCatalog(
        [
          {
            nodeId: 'a',
            searchOrdinal: 0,
            fixedItemGrants: [
              { definitionId, quantity: 1, initialState },
            ],
            weightedItemChoice: null,
            fixedIntelIds: [],
          },
        ] as never,
        graph,
        resourceItems,
        resourceProfiles,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'INVALID_INITIAL_STATE' }),
    )
  })

  it.each([
    { kind: 'none', current: 0 },
    { kind: 'explicit', current: 1, maximum: 3 },
  ])('strictly rejects extra initial-state fields %#', (initialState) => {
    const definitionId =
      initialState.kind === 'none' ? 'none-item' : 'durable-item'
    expect(() =>
      createMainSearchDefinitionCatalog(
        [
          {
            nodeId: 'a',
            searchOrdinal: 0,
            fixedItemGrants: [
              { definitionId, quantity: 1, initialState },
            ],
            weightedItemChoice: null,
            fixedIntelIds: [],
          },
        ] as never,
        graph,
        resourceItems,
        resourceProfiles,
      ),
    ).toThrowError(
      expect.objectContaining({ code: 'INVALID_INITIAL_STATE' }),
    )
  })

  it('keeps resource state out of the current player-visible item projection', () => {
    const catalog = createMainSearchDefinitionCatalog(
      [
        {
          nodeId: 'a',
          searchOrdinal: 0,
          fixedItemGrants: [
            {
              definitionId: 'durable-item',
              quantity: 1,
              initialState: { kind: 'explicit', current: 2 },
            },
          ],
          weightedItemChoice: null,
          fixedIntelIds: [],
        },
      ],
      graph,
      resourceItems,
      resourceProfiles,
    )
    const state = revealPreparedMainSearchOutcome(
      createSceneSearchState({
        runSeed: 'seed',
        sceneInstanceId: 'visible-resource',
        graph,
        searchCatalog: catalog,
        itemCatalog: resourceItems,
        itemResourceCatalog: resourceProfiles,
      }),
      'a',
    )
    const visible = getPlayerVisibleNodeSearchState(state, 'a')
    expect(visible.kind).toBe('searched')
    expect(JSON.stringify(visible)).not.toContain('"resource"')
    expect(JSON.stringify(visible)).not.toContain('"current":2')
  })
})

describe('deterministic search materialization', () => {
  it('does not draw random values for a fixed-only definition', () => {
    const fixed: MainSearchDefinition = {
      ...definition(),
      fixedItemGrants: [
        { definitionId: 'stack-b', quantity: 1, initialState: { kind: 'none' } },
        { definitionId: 'single', quantity: 1, initialState: { kind: 'none' } },
      ],
      weightedItemChoice: null,
    }
    const catalog = createMainSearchDefinitionCatalog(
      [fixed],
      graph,
      items,
      resources,
    )
    const outcome = materializeMainSearchOutcome(
      'seed',
      'scene-1',
      catalog.get('a'),
      items,
      resources,
    )
    expect(outcome.randomTrace).toBeNull()
    expect(outcome.revealedItems.map(({ item }) => item.definitionId)).toEqual([
      'single',
      'stack-b',
    ])
    expect(outcome.revealedItems.map(({ item }) => item.instanceId)).toEqual([
      'search:scene-1:a:0:fixed:0',
      'search:scene-1:a:0:fixed:1',
    ])
  })

  it('is identical across repeats and normalized candidate input order', () => {
    const firstCatalog = createMainSearchDefinitionCatalog([definition()], graph, items, resources)
    const reversed = definition()
    const secondCatalog = createMainSearchDefinitionCatalog([{
      ...reversed,
      weightedItemChoice: {
        entries: [...reversed.weightedItemChoice!.entries].reverse(),
      },
    }], graph, items, resources)
    const first = materializeMainSearchOutcome('seed', 'scene-1', firstCatalog.get('a'), items, resources)
    expect(materializeMainSearchOutcome('seed', 'scene-1', firstCatalog.get('a'), items, resources)).toEqual(first)
    expect(materializeMainSearchOutcome('seed', 'scene-1', secondCatalog.get('a'), items, resources)).toEqual(first)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.randomTrace)).toBe(true)
    expect(Object.isFrozen(first.revealedItems[0])).toBe(true)

    const streamId = createStreamId(
      'scene-main-search',
      'scene-1',
      'a',
      '0',
      'weighted-loot',
    )
    const draw = drawIntInclusive(createRandomCursor('seed', streamId), 1, 100)
    expect(first.randomTrace).toMatchObject({
      streamId,
      drawIndex: 0,
      selectedDefinitionId: draw.value <= 70 ? 'stack-a' : 'stack-b',
    })
  })

  it('uses isolated named streams and stable non-colliding instance ids', () => {
    const catalog = createMainSearchDefinitionCatalog([definition('a'), definition('b')], graph, items, resources)
    const a = materializeMainSearchOutcome('seed', 'scene-1', catalog.get('a'), items, resources)
    const b = materializeMainSearchOutcome('seed', 'scene-1', catalog.get('b'), items, resources)
    const anotherScene = materializeMainSearchOutcome('seed', 'scene-2', catalog.get('a'), items, resources)
    expect(a.randomTrace?.streamId).not.toBe(b.randomTrace?.streamId)
    expect(new Set(a.revealedItems.map(({ item }) => item.instanceId)).size).toBe(a.revealedItems.length)
    expect(a.revealedItems.map(({ item }) => item.instanceId)).not.toEqual(anotherScene.revealedItems.map(({ item }) => item.instanceId))
    const unrelated = createRandomCursor('seed', createStreamId('combat'))
    drawIntInclusive(unrelated, 1, 100)
    expect(materializeMainSearchOutcome('seed', 'scene-1', catalog.get('a'), items, resources)).toEqual(a)
  })

  it('records the accepted underlying draw index after deterministic rejection sampling', () => {
    const rejectedThenAccepted = definition()
    const catalog = createMainSearchDefinitionCatalog(
      [{
        ...rejectedThenAccepted,
        weightedItemChoice: {
          entries: [
            {
              grant: {
                definitionId: 'stack-a',
                quantity: 1,
                initialState: { kind: 'none' },
              },
              weight: 2_147_483_648,
            },
            {
              grant: {
                definitionId: 'stack-b',
                quantity: 1,
                initialState: { kind: 'none' },
              },
              weight: 1,
            },
          ],
        },
      }],
      graph,
      items,
      resources,
    )
    const result = materializeMainSearchOutcome(
      'trace-rejection-0',
      'scene-rejection',
      catalog.get('a'),
      items,
      resources,
    )
    expect(result.randomTrace).toMatchObject({
      drawIndex: 1,
      selectedDefinitionId: 'stack-a',
    })
  })
})

describe('scene search state', () => {
  const catalog = createMainSearchDefinitionCatalog([definition('a'), { ...definition('b'), weightedItemChoice: null }], graph, items, resources)
  const create = () => createSceneSearchState({
    runSeed: 'seed',
    sceneInstanceId: 'scene-1',
    graph,
    searchCatalog: catalog,
    itemCatalog: items,
    itemResourceCatalog: resources,
  })
  const validate = (input: unknown) =>
    validateSceneSearchState(
      input as SceneSearchStateSnapshot,
      graph,
      items,
      resources,
    )
  const replaceNode = (
    state: SceneSearchStateSnapshot,
    nodeId: string,
    replacement: unknown,
  ) => ({
    sceneInstanceId: state.sceneInstanceId,
    nodeStates: state.nodeStates.map((node) =>
      node.nodeId === nodeId ? replacement : node,
    ),
  })
  const preparedNode = (state: SceneSearchStateSnapshot, nodeId = 'a') => {
    const node = state.nodeStates.find((candidate) => candidate.nodeId === nodeId)
    if (!node || node.kind !== 'unsearched') {
      throw new Error('测试节点必须是未搜索状态')
    }
    return node
  }

  it('prepares every node at scene creation and keeps instance ids globally unique', () => {
    const state = create()
    expect(state.nodeStates.map((node) => [node.nodeId, node.kind])).toEqual([
      ['a', 'unsearched'],
      ['b', 'unsearched'],
      ['c', 'not-available'],
    ])
    const ids = state.nodeStates.flatMap((node) =>
      node.kind === 'unsearched'
        ? node.preparedOutcome.revealedItems.map(({ item }) => item.instanceId)
        : [],
    )
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.isFrozen(state)).toBe(true)
    expect(Object.isFrozen(state.nodeStates)).toBe(true)
    const hidden = state.nodeStates[0]
    expect(hidden.kind).toBe('unsearched')
    if (hidden.kind !== 'unsearched') throw new Error('测试节点必须未搜索')
    expect(hidden.preparedOutcome.revealedItems).toHaveLength(2)
  })

  it('reveals the prepared result without regenerating or mutating input', () => {
    const state = create()
    const hidden = state.nodeStates[0]
    if (hidden.kind !== 'unsearched') throw new Error('测试节点必须未搜索')
    const revealed = revealPreparedMainSearchOutcome(state, 'a')
    const searched = revealed.nodeStates[0]
    expect(searched.kind).toBe('searched')
    if (searched.kind !== 'searched') throw new Error('测试节点必须已搜索')
    expect(searched.revealedIntelIds).toEqual(hidden.preparedOutcome.revealedIntelIds)
    expect('revealedItems' in searched).toBe(false)
    expect(state.nodeStates[0].kind).toBe('unsearched')
  })

  it('rejects repeated, unavailable, and unknown reveals', () => {
    const state = create()
    expect(() => revealPreparedMainSearchOutcome(revealPreparedMainSearchOutcome(state, 'a'), 'a')).toThrowError(expect.objectContaining({ code: 'ALREADY_SEARCHED' }))
    expect(() => revealPreparedMainSearchOutcome(state, 'c')).toThrowError(expect.objectContaining({ code: 'NODE_NOT_SEARCHABLE' }))
    expect(() => revealPreparedMainSearchOutcome(state, 'missing')).toThrowError(expect.objectContaining({ code: 'UNKNOWN_NODE' }))
  })

  it('keeps prepared results hidden until the node is searched', () => {
    const hidden = getPlayerVisibleNodeSearchState(create(), 'a')
    expect(hidden).toEqual({ kind: 'available-unsearched', nodeId: 'a' })
    expect('preparedOutcome' in hidden).toBe(false)
    expect(JSON.stringify(hidden)).not.toContain('instanceId')
    expect(JSON.stringify(hidden)).not.toContain('intel-a')

    const visible = getPlayerVisibleNodeSearchState(
      revealPreparedMainSearchOutcome(create(), 'a'),
      'a',
    )
    expect(visible.kind).toBe('searched')
    if (visible.kind !== 'searched') throw new Error('节点必须已搜索')
    expect(visible.revealedIntelIds).toEqual(['intel-a', 'intel-b'])
    expect(Object.isFrozen(visible)).toBe(true)
    expect(getPlayerVisibleNodeSearchState(create(), 'c')).toEqual({
      kind: 'not-available',
      nodeId: 'c',
    })
  })

  it('rejects an unknown discriminant with a scene-search domain error', () => {
    const state = create()
    expect(() => validate(replaceNode(state, 'c', {
      kind: 'unknown',
      nodeId: 'c',
    }))).toThrowError(
      expect.objectContaining({
        name: 'SceneSearchError',
        code: 'INVALID_SEARCH_STATE',
      }),
    )
  })

  it('strictly rejects contradictory or incomplete node-state fields', () => {
    const state = create()
    const prepared = preparedNode(state).preparedOutcome
    expect(() => validate(replaceNode(state, 'c', {
      kind: 'not-available',
      nodeId: 'c',
      preparedOutcome: prepared,
    }))).toThrowError(expect.objectContaining({ code: 'INVALID_SEARCH_STATE' }))
    expect(() => validate(replaceNode(state, 'a', {
      kind: 'unsearched',
      nodeId: 'a',
    }))).toThrowError(expect.objectContaining({ code: 'INVALID_SEARCH_STATE' }))
    const searched = revealPreparedMainSearchOutcome(state, 'a')
    const searchedNode = searched.nodeStates.find((node) => node.nodeId === 'a')
    expect(() => validate(replaceNode(searched, 'a', {
      ...searchedNode,
      preparedOutcome: prepared,
    }))).toThrowError(expect.objectContaining({ code: 'INVALID_SEARCH_STATE' }))
  })

  it('rejects mismatched prepared node ids and invalid search ordinals', () => {
    const state = create()
    const node = preparedNode(state)
    expect(() => validate(replaceNode(state, 'a', {
      ...node,
      preparedOutcome: { ...node.preparedOutcome, nodeId: 'b' },
    }))).toThrowError(expect.objectContaining({ code: 'INVALID_SEARCH_STATE' }))
    expect(() => validate(replaceNode(state, 'a', {
      ...node,
      preparedOutcome: { ...node.preparedOutcome, searchOrdinal: 0.5 },
    }))).toThrowError(expect.objectContaining({ code: 'INVALID_SEARCH_STATE' }))
  })

  it('rejects duplicate and empty intel ids', () => {
    const state = create()
    const node = preparedNode(state)
    for (const revealedIntelIds of [['intel-a', 'intel-a'], ['']]) {
      expect(() => validate(replaceNode(state, 'a', {
        ...node,
        preparedOutcome: { ...node.preparedOutcome, revealedIntelIds },
      }))).toThrowError(expect.objectContaining({ code: 'INVALID_SEARCH_STATE' }))
    }
  })

  it('rejects malformed random traces and selections absent from the outcome', () => {
    const state = create()
    const node = preparedNode(state)
    expect(() => validate(replaceNode(state, 'a', {
      ...node,
      preparedOutcome: {
        ...node.preparedOutcome,
        randomTrace: { ...node.preparedOutcome.randomTrace, drawIndex: -1 },
      },
    }))).toThrowError(expect.objectContaining({ code: 'INVALID_SEARCH_STATE' }))
    expect(() => validate(replaceNode(state, 'a', {
      ...node,
      preparedOutcome: {
        ...node.preparedOutcome,
        randomTrace: {
          algorithmVersion: 'counter32-v1',
          streamId: 'stable-stream',
          drawIndex: 0,
          selectedDefinitionId: 'missing-definition',
        },
      },
    }))).toThrowError(expect.objectContaining({ code: 'INVALID_SEARCH_STATE' }))
  })

  it('normalizes new entity copies, intel order, and node order without touching input', () => {
    const cloned = structuredClone(create())
    const input = {
      ...cloned,
      nodeStates: [...cloned.nodeStates].reverse().map((candidate) =>
        candidate.kind === 'unsearched'
          ? {
              ...candidate,
              preparedOutcome: {
                ...candidate.preparedOutcome,
                revealedIntelIds: [
                  ...candidate.preparedOutcome.revealedIntelIds,
                ].reverse(),
              },
            }
          : candidate,
      ),
    }
    const node = preparedNode(input)
    const before = structuredClone(input)
    const result = validate(input)
    const normalizedNode = preparedNode(result)
    expect(result.nodeStates.map(({ nodeId }) => nodeId)).toEqual(['a', 'b', 'c'])
    expect(normalizedNode.preparedOutcome.revealedIntelIds).toEqual([
      'intel-a',
      'intel-b',
    ])
    expect(normalizedNode.preparedOutcome.revealedItems[0]).not.toBe(
      node.preparedOutcome.revealedItems[0],
    )
    expect(input).toEqual(before)
    expect(Object.isFrozen(input)).toBe(false)
    expect(Object.isFrozen(node.preparedOutcome.revealedItems[0])).toBe(false)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(normalizedNode.preparedOutcome)).toBe(true)
  })

  it('keeps hidden item instances globally unique across nodes', () => {
    const state = create()
    const first = preparedNode(state, 'a')
    const second = preparedNode(state, 'b')
    expect(() => validate(replaceNode(state, 'b', {
      ...second,
      preparedOutcome: {
        ...second.preparedOutcome,
        revealedItems: [first.preparedOutcome.revealedItems[0]],
      },
    }))).toThrowError(expect.objectContaining({ code: 'DUPLICATE_INSTANCE_ID' }))
  })

  it('keeps searched state limited to lifecycle and revealed intel', () => {
    const searched = revealPreparedMainSearchOutcome(create(), 'a')
    const node = searched.nodeStates.find((candidate) => candidate.nodeId === 'a')
    expect(validate(replaceNode(searched, 'a', {
      ...node,
    })).nodeStates.find((candidate) => candidate.nodeId === 'a')).toMatchObject({
      kind: 'searched',
    })
  })
})

describe('search illumination profiles', () => {
  it('validates complete definitions and exposes a frozen provider catalog', () => {
    const catalog = createSearchIlluminationProfileCatalog(
      [
        { definitionId: 'single', kind: 'low-light-provider' },
        { definitionId: 'stack-a', kind: 'not-provider' },
        { definitionId: 'stack-b', kind: 'not-provider' },
      ],
      items.definitionIds,
    )
    expect(catalog.definitionIds).toEqual([
      'single',
      'stack-a',
      'stack-b',
    ])
    expect(catalog.get('single').kind).toBe('low-light-provider')
    expect(Object.isFrozen(catalog)).toBe(true)
  })

  it.each([
    [
      'missing profile',
      [{ definitionId: 'single', kind: 'low-light-provider' }],
      'MISSING_ILLUMINATION_PROFILE',
    ],
    [
      'duplicate profile',
      [
        { definitionId: 'single', kind: 'low-light-provider' },
        { definitionId: 'single', kind: 'not-provider' },
      ],
      'DUPLICATE_ILLUMINATION_PROFILE',
    ],
    [
      'unknown definition',
      [
        { definitionId: 'single', kind: 'low-light-provider' },
        { definitionId: 'stack-a', kind: 'not-provider' },
        { definitionId: 'stack-b', kind: 'not-provider' },
        { definitionId: 'missing', kind: 'not-provider' },
      ],
      'INVALID_ILLUMINATION_PROFILE',
    ],
  ])('rejects %s', (_name, profiles, code) => {
    expect(() =>
      createSearchIlluminationProfileCatalog(
        profiles as never,
        items.definitionIds,
      ),
    ).toThrowError(expect.objectContaining({ code }))
  })
})
