import { describe, expect, it } from 'vitest'
import { createItemCatalog } from '../inventory'
import { createRandomCursor, createStreamId, drawIntInclusive } from '../random'
import { createSceneGraph } from '../scene-graph'
import {
  createMainSearchDefinitionCatalog,
  createSearchIlluminationProfileCatalog,
  createSceneSearchState,
  getPlayerVisibleNodeSearchState,
  materializeMainSearchOutcome,
  revealPreparedMainSearchOutcome,
  SceneSearchError,
  type MainSearchDefinition,
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
const definition = (nodeId = 'a'): MainSearchDefinition => ({
  nodeId,
  searchOrdinal: 0,
  fixedItemGrants: [{ definitionId: 'single', quantity: 1 }],
  weightedItemChoice: {
    entries: [
      { grant: { definitionId: 'stack-b', quantity: 1 }, weight: 30 },
      { grant: { definitionId: 'stack-a', quantity: 2 }, weight: 70 },
    ],
  },
  fixedIntelIds: ['intel-b', 'intel-a'],
})

describe('main search definition catalog', () => {
  it('normalizes and deeply freezes valid definitions without mutating input', () => {
    const input = definition()
    const before = structuredClone(input)
    const catalog = createMainSearchDefinitionCatalog([input], graph, items)
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
    [[{ ...definition(), fixedItemGrants: [{ definitionId: '', quantity: 1 }] }], 'INVALID_GRANT'],
    [[{ ...definition(), fixedItemGrants: [{ definitionId: 'missing', quantity: 1 }] }], 'INVALID_GRANT'],
    [[{ ...definition(), fixedItemGrants: [{ definitionId: 'stack-a', quantity: 0 }] }], 'INVALID_GRANT'],
    [[{ ...definition(), fixedItemGrants: [{ definitionId: 'single', quantity: 2 }] }], 'INVALID_GRANT'],
    [[{ ...definition(), fixedItemGrants: [{ definitionId: 'stack-a', quantity: 4 }] }], 'INVALID_GRANT'],
    [[{ ...definition(), weightedItemChoice: { entries: [{ grant: { definitionId: 'stack-a', quantity: 1 }, weight: 1 }] } }], 'INVALID_WEIGHTED_POOL'],
    [[{ ...definition(), weightedItemChoice: { entries: [{ grant: { definitionId: 'stack-a', quantity: 1 }, weight: 0 }, { grant: { definitionId: 'stack-b', quantity: 1 }, weight: 1 }] } }], 'INVALID_WEIGHT'],
    [[{ ...definition(), weightedItemChoice: { entries: [{ grant: { definitionId: 'stack-a', quantity: 1 }, weight: 1 }, { grant: { definitionId: 'stack-a', quantity: 2 }, weight: 1 }] } }], 'DUPLICATE_WEIGHTED_DEFINITION'],
    [[{ ...definition(), fixedIntelIds: ['same', 'same'] }], 'DUPLICATE_INTEL_ID'],
  ])('rejects invalid definition %# as %s', (definitions, code) => {
    expect(() =>
      createMainSearchDefinitionCatalog(
        definitions as MainSearchDefinition[],
        graph,
        items,
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
              { grant: { definitionId: 'stack-a', quantity: 1 }, weight: Number.MAX_SAFE_INTEGER },
              { grant: { definitionId: 'stack-b', quantity: 1 }, weight: 1 },
            ],
          },
        }],
        graph,
        items,
      ),
    ).toThrowError(expect.objectContaining({ code: 'WEIGHT_OVERFLOW' }))
  })
})

describe('deterministic search materialization', () => {
  it('does not draw random values for a fixed-only definition', () => {
    const fixed = {
      ...definition(),
      fixedItemGrants: [
        { definitionId: 'stack-b', quantity: 1 },
        { definitionId: 'single', quantity: 1 },
      ],
      weightedItemChoice: null,
    }
    const catalog = createMainSearchDefinitionCatalog([fixed], graph, items)
    const outcome = materializeMainSearchOutcome('seed', 'scene-1', catalog.get('a'), items)
    expect(outcome.randomTrace).toBeNull()
    expect(outcome.revealedItems.map((item) => item.definitionId)).toEqual([
      'single',
      'stack-b',
    ])
    expect(outcome.revealedItems.map((item) => item.instanceId)).toEqual([
      'search:scene-1:a:0:fixed:0',
      'search:scene-1:a:0:fixed:1',
    ])
  })

  it('is identical across repeats and normalized candidate input order', () => {
    const firstCatalog = createMainSearchDefinitionCatalog([definition()], graph, items)
    const reversed = definition()
    const secondCatalog = createMainSearchDefinitionCatalog([{
      ...reversed,
      weightedItemChoice: {
        entries: [...reversed.weightedItemChoice!.entries].reverse(),
      },
    }], graph, items)
    const first = materializeMainSearchOutcome('seed', 'scene-1', firstCatalog.get('a'), items)
    expect(materializeMainSearchOutcome('seed', 'scene-1', firstCatalog.get('a'), items)).toEqual(first)
    expect(materializeMainSearchOutcome('seed', 'scene-1', secondCatalog.get('a'), items)).toEqual(first)
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
    const catalog = createMainSearchDefinitionCatalog([definition('a'), definition('b')], graph, items)
    const a = materializeMainSearchOutcome('seed', 'scene-1', catalog.get('a'), items)
    const b = materializeMainSearchOutcome('seed', 'scene-1', catalog.get('b'), items)
    const anotherScene = materializeMainSearchOutcome('seed', 'scene-2', catalog.get('a'), items)
    expect(a.randomTrace?.streamId).not.toBe(b.randomTrace?.streamId)
    expect(new Set(a.revealedItems.map((item) => item.instanceId)).size).toBe(a.revealedItems.length)
    expect(a.revealedItems.map((item) => item.instanceId)).not.toEqual(anotherScene.revealedItems.map((item) => item.instanceId))
    const unrelated = createRandomCursor('seed', createStreamId('combat'))
    drawIntInclusive(unrelated, 1, 100)
    expect(materializeMainSearchOutcome('seed', 'scene-1', catalog.get('a'), items)).toEqual(a)
  })
})

describe('scene search state', () => {
  const catalog = createMainSearchDefinitionCatalog([definition('a'), { ...definition('b'), weightedItemChoice: null }], graph, items)
  const create = () => createSceneSearchState({
    runSeed: 'seed',
    sceneInstanceId: 'scene-1',
    graph,
    searchCatalog: catalog,
    itemCatalog: items,
  })

  it('prepares every node at scene creation and keeps instance ids globally unique', () => {
    const state = create()
    expect(state.nodeStates.map((node) => [node.nodeId, node.kind])).toEqual([
      ['a', 'unsearched'],
      ['b', 'unsearched'],
      ['c', 'not-available'],
    ])
    const ids = state.nodeStates.flatMap((node) =>
      node.kind === 'unsearched'
        ? node.preparedOutcome.revealedItems.map((item) => item.instanceId)
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
    expect(searched.revealedItems).toEqual(hidden.preparedOutcome.revealedItems)
    expect(searched.revealedIntelIds).toEqual(hidden.preparedOutcome.revealedIntelIds)
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
    expect(visible.revealedItems).toHaveLength(2)
    expect(visible.revealedIntelIds).toEqual(['intel-a', 'intel-b'])
    expect(Object.isFrozen(visible)).toBe(true)
    expect(Object.isFrozen(visible.revealedItems)).toBe(true)
    expect(getPlayerVisibleNodeSearchState(create(), 'c')).toEqual({
      kind: 'not-available',
      nodeId: 'c',
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
