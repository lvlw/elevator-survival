import { describe, expect, it } from 'vitest'
import {
  consumeCommittedResource,
  createFullItemState,
  createItemResourceCatalog,
  createItemState,
  createItemStateCollectionSnapshot,
  getItemState,
  ItemStateError,
  previewCommittedResourceAction,
  restoreItemResource,
  replaceItemState,
  type ItemResourceProfile,
} from '.'
import type { ItemInstance } from '../inventory'

const profiles = [
  { definitionId: 'pipe', kind: 'durability', maximum: 6 },
  { definitionId: 'coat', kind: 'integrity', maximum: 4 },
  { definitionId: 'lamp', kind: 'charge', maximum: 3 },
  { definitionId: 'card', kind: 'none' },
] as const satisfies readonly ItemResourceProfile[]

const ids = ['pipe', 'coat', 'lamp', 'card'] as const
const catalog = createItemResourceCatalog(profiles, ids)

function state(definitionId: string, kind: 'durability' | 'integrity' | 'charge', current: number) {
  return createItemState({
    instanceId: `instance-${definitionId}`,
    definitionId,
    resource: { kind, current },
  }, catalog)
}

describe('createItemResourceCatalog', () => {
  it('sorts definition IDs', () => {
    expect(catalog.definitionIds).toEqual(['card', 'coat', 'lamp', 'pipe'])
  })

  it.each(profiles)('returns the $definitionId profile', (profile) => {
    expect(catalog.get(profile.definitionId)).toEqual(profile)
  })

  it('reports known and unknown definitions', () => {
    expect(catalog.has('pipe')).toBe(true)
    expect(catalog.has('missing')).toBe(false)
  })

  it('rejects an unknown lookup', () => {
    expect(() => catalog.get('missing')).toThrowError(ItemStateError)
  })

  it.each([
    ['empty profile ID', [{ definitionId: '', kind: 'none' }], ['']],
    ['duplicate profile', [profiles[0], profiles[0]], ['pipe']],
    ['missing profile', [profiles[0]], ['pipe', 'coat']],
    ['unknown physical definition', [profiles[0]], ['coat']],
    ['duplicate physical definition', [profiles[0]], ['pipe', 'pipe']],
    ['zero maximum', [{ definitionId: 'pipe', kind: 'durability', maximum: 0 }], ['pipe']],
    ['fractional maximum', [{ definitionId: 'pipe', kind: 'durability', maximum: 1.5 }], ['pipe']],
    ['maximum on none', [{ definitionId: 'card', kind: 'none', maximum: 1 }], ['card']],
  ])('rejects %s', (_name, inputProfiles, inputIds) => {
    expect(() =>
      createItemResourceCatalog(
        inputProfiles as readonly ItemResourceProfile[],
        inputIds as readonly string[],
      ),
    ).toThrowError(ItemStateError)
  })

  it('deep-freezes the catalog and profiles', () => {
    expect(Object.isFrozen(catalog)).toBe(true)
    expect(Object.isFrozen(catalog.definitionIds)).toBe(true)
    expect(Object.isFrozen(catalog.get('pipe'))).toBe(true)
  })
})

describe('item state creation', () => {
  it.each([
    ['pipe', { kind: 'durability', current: 6 }],
    ['coat', { kind: 'integrity', current: 4 }],
    ['lamp', { kind: 'charge', current: 3 }],
    ['card', { kind: 'none' }],
  ] as const)('creates full state for %s', (definitionId, resource) => {
    expect(
      createFullItemState({ instanceId: `i-${definitionId}`, definitionId }, catalog)
        .resource,
    ).toEqual(resource)
  })

  it.each([0, 1, 5, 6])('accepts durability current %s', (current) => {
    expect(state('pipe', 'durability', current).resource).toEqual({
      kind: 'durability',
      current,
    })
  })

  it.each([-1, 7, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid current %s',
    (current) => {
      expect(() => state('pipe', 'durability', current)).toThrowError(
        ItemStateError,
      )
    },
  )

  it('rejects a resource kind mismatch', () => {
    expect(() => state('pipe', 'charge', 1)).toThrowError(ItemStateError)
  })

  it('rejects empty instance identity', () => {
    expect(() =>
      createFullItemState({ instanceId: ' ', definitionId: 'pipe' }, catalog),
    ).toThrowError(ItemStateError)
  })

  it('freezes state recursively', () => {
    const result = state('pipe', 'durability', 3)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.resource)).toBe(true)
  })
})

describe('committed resource consumption', () => {
  it.each([
    ['durability', 'pipe', 6, 2, 2, 4],
    ['durability', 'pipe', 1, 3, 1, 0],
    ['integrity', 'coat', 4, 2, 2, 2],
    ['integrity', 'coat', 1, 2, 1, 0],
    ['charge', 'lamp', 3, 2, 2, 1],
  ] as const)(
    '%s current %s pays requested cost %s',
    (kind, definitionId, current, cost, consumed, remaining) => {
      const input = state(definitionId, kind, current)
      const preview = previewCommittedResourceAction(input, cost)
      expect(preview).toMatchObject({
        allowed: true,
        consumed,
        currentAfter: remaining,
        depleted: remaining === 0,
      })
      const result = consumeCommittedResource(input, cost)
      expect(result.consumed).toBe(consumed)
      expect(result.state.resource).toEqual({ kind, current: remaining })
      expect(input.resource).toEqual({ kind, current })
    },
  )

  it.each([
    ['pipe', 'durability', 0, 1],
    ['coat', 'integrity', 0, 1],
    ['lamp', 'charge', 0, 1],
    ['lamp', 'charge', 1, 2],
  ] as const)('rejects unavailable action for %s', (id, kind, current, cost) => {
    const input = state(id, kind, current)
    expect(previewCommittedResourceAction(input, cost).allowed).toBe(false)
    expect(() => consumeCommittedResource(input, cost)).toThrowError(
      ItemStateError,
    )
  })

  it('rejects actions for a no-resource item', () => {
    const card = createFullItemState(
      { instanceId: 'card-1', definitionId: 'card' },
      catalog,
    )
    expect(previewCommittedResourceAction(card, 1)).toEqual({
      allowed: false,
      kind: 'none',
      currentBefore: null,
      requestedCost: 1,
      reason: 'NO_RESOURCE',
    })
  })

  it.each([0, -1, 1.5])('rejects invalid cost %s', (cost) => {
    expect(() =>
      previewCommittedResourceAction(state('pipe', 'durability', 6), cost),
    ).toThrowError(ItemStateError)
  })

  it('freezes action output recursively and preserves identity', () => {
    const result = consumeCommittedResource(state('pipe', 'durability', 6), 1)
    expect(result.state).toMatchObject({
      instanceId: 'instance-pipe',
      definitionId: 'pipe',
    })
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.state.resource)).toBe(true)
  })
})

describe('resource restoration', () => {
  it.each([
    ['pipe', 'durability', 1, 3, 4, 3, 0],
    ['coat', 'integrity', 3, 3, 4, 1, 2],
    ['lamp', 'charge', 0, 5, 3, 3, 2],
  ] as const)(
    'restores and caps %s',
    (id, kind, current, amount, final, restored, unused) => {
      const input = state(id, kind, current)
      const result = restoreItemResource(input, amount, catalog)
      expect(result.state.resource).toEqual({ kind, current: final })
      expect(result).toMatchObject({ restored, unused })
      expect(input.resource).toEqual({ kind, current })
    },
  )

  it('returns all requested points unused at maximum', () => {
    expect(
      restoreItemResource(state('pipe', 'durability', 6), 2, catalog),
    ).toMatchObject({ restored: 0, unused: 2 })
  })

  it('rejects restoration for no-resource items', () => {
    const card = createFullItemState(
      { instanceId: 'card-1', definitionId: 'card' },
      catalog,
    )
    expect(() => restoreItemResource(card, 1, catalog)).toThrowError(
      ItemStateError,
    )
  })

  it.each([0, -1, 1.5])('rejects invalid restoration %s', (amount) => {
    expect(() =>
      restoreItemResource(state('pipe', 'durability', 1), amount, catalog),
    ).toThrowError(ItemStateError)
  })

  it('freezes restoration output and preserves identity', () => {
    const result = restoreItemResource(
      state('coat', 'integrity', 1),
      1,
      catalog,
    )
    expect(result.state.instanceId).toBe('instance-coat')
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.state)).toBe(true)
  })
})

describe('item state collection', () => {
  const carried = [
    { instanceId: 'pipe-1', definitionId: 'pipe', quantity: 1 },
    { instanceId: 'lamp-1', definitionId: 'lamp', quantity: 1 },
  ] satisfies readonly ItemInstance[]
  const states = [
    createFullItemState(carried[1], catalog),
    createFullItemState(carried[0], catalog),
  ]

  it('validates complete coverage, sorts, freezes, and preserves input', () => {
    const before = structuredClone(states)
    const collection = createItemStateCollectionSnapshot(
      states,
      carried,
      catalog,
    )
    expect(collection.states.map((item) => item.instanceId)).toEqual([
      'lamp-1',
      'pipe-1',
    ])
    expect(states).toEqual(before)
    expect(Object.isFrozen(collection)).toBe(true)
    expect(Object.isFrozen(collection.states)).toBe(true)
  })

  it.each([
    [
      'duplicate state',
      [states[0], states[0]],
      carried,
      'DUPLICATE_ITEM_STATE',
    ],
    [
      'missing state',
      [states[0]],
      carried,
      'MISSING_ITEM_STATE',
    ],
    [
      'extra state',
      [
        ...states,
        createFullItemState(
          { instanceId: 'card-1', definitionId: 'card' },
          catalog,
        ),
      ],
      carried,
      'EXTRA_ITEM_STATE',
    ],
    [
      'definition mismatch',
      [
        states[0],
        {
          ...states[1],
          definitionId: 'coat',
          resource: { kind: 'integrity' as const, current: 4 },
        },
      ],
      carried,
      'ITEM_STATE_IDENTITY_MISMATCH',
    ],
  ])('rejects %s', (_name, inputStates, inputItems, code) => {
    expect(() =>
      createItemStateCollectionSnapshot(
        inputStates,
        inputItems,
        catalog,
      ),
    ).toThrowError(expect.objectContaining({ code }))
  })

  it('queries and atomically replaces one state without changing identity', () => {
    const collection = createItemStateCollectionSnapshot(
      states,
      carried,
      catalog,
    )
    const consumed = consumeCommittedResource(
      getItemState(collection, 'lamp-1'),
      1,
    )
    const replaced = replaceItemState(collection, consumed.state)
    expect(getItemState(replaced, 'lamp-1').resource).toEqual({
      kind: 'charge',
      current: 2,
    })
    expect(getItemState(collection, 'lamp-1').resource).toEqual({
      kind: 'charge',
      current: 3,
    })
    expect(() => getItemState(collection, 'missing')).toThrowError(
      expect.objectContaining({ code: 'UNKNOWN_ITEM_STATE' }),
    )
  })
})
