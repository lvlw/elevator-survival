import { describe, expect, it } from 'vitest'
import {
  consumeCommittedResource,
  createFullItemState,
  createItemState,
  previewCommittedResourceAction,
  restoreItemResource,
} from '../../../core/item-state'
import { hospitalSliceV01RuleConfig } from '../rule-config'
import { hospitalItemCatalog } from './hospital-item-catalog'
import { hospitalItemResourceCatalog } from './hospital-item-resource-catalog'
import { HOSPITAL_ITEM_IDS, HOSPITAL_SLICE_ITEM_IDS } from './hospital-item-ids'
import { hospitalItemResourceProfiles } from './hospital-item-resource-profiles'

describe('hospital item resource catalog', () => {
  it('covers all 18 physical definitions exactly once', () => {
    expect(hospitalItemResourceProfiles).toHaveLength(18)
    expect(hospitalItemResourceCatalog.definitionIds).toEqual(
      hospitalItemCatalog.definitionIds,
    )
    expect(new Set(hospitalItemResourceCatalog.definitionIds).size).toBe(18)
  })

  it.each([
    [HOSPITAL_ITEM_IDS.metalPipe, 'durability', 6],
    [HOSPITAL_ITEM_IDS.fireAxe, 'durability', 2],
    [HOSPITAL_ITEM_IDS.heavyCoat, 'integrity', 4],
    [HOSPITAL_ITEM_IDS.crowbar, 'durability', 3],
    [HOSPITAL_ITEM_IDS.flashlight, 'charge', 3],
    [HOSPITAL_ITEM_IDS.toolkit, 'durability', 2],
  ] as const)('records confirmed resource profile for %s', (id, kind, maximum) => {
    expect(hospitalItemResourceCatalog.get(id)).toEqual({
      definitionId: id,
      kind,
      maximum,
    })
  })

  it('reads the fire axe maximum from the versioned rule config', () => {
    const profile = hospitalItemResourceCatalog.get(HOSPITAL_ITEM_IDS.fireAxe)
    expect(profile.kind).toBe('durability')
    expect(
      hospitalSliceV01RuleConfig.maintenance.itemResourceMaximums
        .fireAxeDurability,
    ).toBe(2)
    expect(profile).toMatchObject({
      maximum:
        hospitalSliceV01RuleConfig.maintenance.itemResourceMaximums
          .fireAxeDurability,
    })
  })

  it('records four durability, one integrity, one charge and twelve none profiles', () => {
    const counts = { durability: 0, integrity: 0, charge: 0, none: 0 }
    for (const id of hospitalItemResourceCatalog.definitionIds) {
      counts[hospitalItemResourceCatalog.get(id).kind] += 1
    }
    expect(counts).toEqual({
      durability: 4,
      integrity: 1,
      charge: 1,
      none: 12,
    })
  })

  it('uses the same ID set as the stable slice list', () => {
    expect(hospitalItemResourceCatalog.definitionIds).toEqual(
      [...HOSPITAL_SLICE_ITEM_IDS].sort(),
    )
  })

  it('freezes the catalog, IDs and every profile', () => {
    expect(Object.isFrozen(hospitalItemResourceCatalog)).toBe(true)
    expect(Object.isFrozen(hospitalItemResourceCatalog.definitionIds)).toBe(true)
    expect(Object.isFrozen(hospitalItemResourceProfiles)).toBe(true)
    for (const profile of hospitalItemResourceProfiles) {
      expect(Object.isFrozen(profile)).toBe(true)
    }
  })
})

describe('hospital fire axe resource integration', () => {
  const identity = {
    instanceId: 'fire-axe-instance',
    definitionId: HOSPITAL_ITEM_IDS.fireAxe,
  }

  it('creates a full fire axe at durability 2 and preserves identity', () => {
    expect(createFullItemState(identity, hospitalItemResourceCatalog)).toEqual({
      ...identity,
      resource: { kind: 'durability', current: 2 },
    })
  })

  it('consumes one point normally', () => {
    const full = createFullItemState(identity, hospitalItemResourceCatalog)
    expect(consumeCommittedResource(full, 1)).toMatchObject({
      consumed: 1,
      currentAfter: 1,
      state: { ...identity, resource: { kind: 'durability', current: 1 } },
    })
  })

  it('follows durability committed-consumption semantics on its last point', () => {
    const atOne = createItemState(
      { ...identity, resource: { kind: 'durability', current: 1 } },
      hospitalItemResourceCatalog,
    )
    expect(consumeCommittedResource(atOne, 3)).toMatchObject({
      consumed: 1,
      currentAfter: 0,
      depleted: true,
      state: { ...identity, resource: { kind: 'durability', current: 0 } },
    })
  })

  it('cannot begin resource consumption at durability zero', () => {
    const broken = createItemState(
      { ...identity, resource: { kind: 'durability', current: 0 } },
      hospitalItemResourceCatalog,
    )
    expect(previewCommittedResourceAction(broken, 1)).toMatchObject({
      allowed: false,
      reason: 'INSUFFICIENT_RESOURCE',
    })
  })

  it('restores to 2, returns one unused point and preserves identity', () => {
    const broken = createItemState(
      { ...identity, resource: { kind: 'durability', current: 0 } },
      hospitalItemResourceCatalog,
    )
    expect(restoreItemResource(broken, 3, hospitalItemResourceCatalog)).toMatchObject({
      restored: 2,
      unused: 1,
      currentAfter: 2,
      atMaximum: true,
      state: { ...identity, resource: { kind: 'durability', current: 2 } },
    })
  })
})

describe('existing hospital resource regressions', () => {
  it('keeps the metal-pipe last-use rule', () => {
    const pipe = createItemState(
      {
        instanceId: 'pipe-1',
        definitionId: HOSPITAL_ITEM_IDS.metalPipe,
        resource: { kind: 'durability', current: 1 },
      },
      hospitalItemResourceCatalog,
    )
    expect(consumeCommittedResource(pipe, 3)).toMatchObject({
      consumed: 1,
      state: { resource: { current: 0 } },
    })
  })

  it('keeps charge from overdrawing', () => {
    const flashlight = createItemState(
      {
        instanceId: 'flashlight-1',
        definitionId: HOSPITAL_ITEM_IDS.flashlight,
        resource: { kind: 'charge', current: 1 },
      },
      hospitalItemResourceCatalog,
    )
    expect(previewCommittedResourceAction(flashlight, 2)).toMatchObject({
      allowed: false,
      reason: 'INSUFFICIENT_RESOURCE',
    })
  })
})
