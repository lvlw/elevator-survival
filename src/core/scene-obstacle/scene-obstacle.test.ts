import { describe, expect, it } from 'vitest'
import { createEquipmentProfileCatalog } from '../equipment'
import { createItemCatalog } from '../inventory'
import { createItemResourceCatalog } from '../item-state'
import { createSceneGraph } from '../scene-graph'
import {
  createSceneObstacleCatalog,
  SceneObstacleError,
} from './scene-obstacle-catalog'
import type { SceneObstacleDefinition } from './scene-obstacle-types'

const graph = createSceneGraph({
  nodes: [
    { id: 'left', name: 'Left', isReturnSafetyNode: true },
    { id: 'right', name: 'Right', isReturnSafetyNode: false },
    { id: 'other', name: 'Other', isReturnSafetyNode: false },
  ],
  edges: [{ id: 'door-edge', from: 'left', to: 'right', baseTravelTime: 10, bidirectional: true }],
})
const itemCatalog = createItemCatalog([
  { id: 'card', name: 'Card', width: 1, height: 1, unitWeight: 0, canRotate: true, stacking: { kind: 'none' } },
  { id: 'crowbar', name: 'Crowbar', width: 1, height: 2, unitWeight: 2, canRotate: true, stacking: { kind: 'none' } },
  { id: 'toolkit', name: 'Toolkit', width: 2, height: 2, unitWeight: 3, canRotate: true, stacking: { kind: 'none' } },
  { id: 'axe', name: 'Axe', width: 2, height: 2, unitWeight: 4, canRotate: true, stacking: { kind: 'none' } },
  { id: 'coat', name: 'Coat', width: 2, height: 2, unitWeight: 2, canRotate: true, stacking: { kind: 'none' } },
  { id: 'loot', name: 'Loot', width: 1, height: 1, unitWeight: 1, canRotate: true, stacking: { kind: 'stackable', maxQuantity: 5 } },
])
const ids = itemCatalog.definitionIds
const itemResourceCatalog = createItemResourceCatalog([
  { definitionId: 'card', kind: 'none' },
  { definitionId: 'crowbar', kind: 'durability', maximum: 3 },
  { definitionId: 'toolkit', kind: 'durability', maximum: 2 },
  { definitionId: 'axe', kind: 'durability', maximum: 2 },
  { definitionId: 'coat', kind: 'integrity', maximum: 4 },
  { definitionId: 'loot', kind: 'none' },
], ids)
const equipmentCatalog = createEquipmentProfileCatalog([
  { definitionId: 'card', kind: 'not-equippable' },
  { definitionId: 'crowbar', kind: 'equippable', eligibleSlots: ['utility'] },
  { definitionId: 'toolkit', kind: 'equippable', eligibleSlots: ['utility'] },
  { definitionId: 'axe', kind: 'equippable', eligibleSlots: ['weapon'] },
  { definitionId: 'coat', kind: 'equippable', eligibleSlots: ['armor'] },
  { definitionId: 'loot', kind: 'not-equippable' },
], ids)
const dependencies = { graph, itemCatalog, itemResourceCatalog, equipmentCatalog }

const BASE = [{
  id: 'door',
  eventId: 'event-door',
  edgeId: 'door-edge',
  endpointNodeIds: ['left', 'right'],
  options: [
    { id: 'card', kind: 'backpack-item', timeKey: 'accessCardTime', requiredDefinitionId: 'card' },
    {
      id: 'toolkit', kind: 'equipped-resource', timeKey: 'toolkitTime', equipmentSlot: 'utility',
      requiredDefinitionId: 'toolkit', resourceKind: 'durability', resourceSource: 'fire-door-toolkit',
      setsAlert: false, spawnGrants: [{ definitionId: 'loot', quantity: 1, initialState: { kind: 'none' } }],
    },
    { id: 'force', kind: 'force-entry', timeKey: 'forceEntryTime', protectionDefinitionId: 'coat', protectionResourceKind: 'integrity' },
    { id: 'decline', kind: 'decline' },
  ],
}]

function definitions(): Record<string, unknown>[] {
  return structuredClone(BASE) as unknown as Record<string, unknown>[]
}

function create(input: unknown = definitions()) {
  return createSceneObstacleCatalog(
    input as readonly SceneObstacleDefinition[],
    dependencies,
  )
}

function option(input: Record<string, unknown>[], index: number): Record<string, unknown> {
  return (input[0].options as Record<string, unknown>[])[index]
}

describe('scene obstacle catalog runtime boundary', () => {
  it('creates the formal structure catalog', () => {
    const catalog = create()
    expect(catalog.obstacleIds).toEqual(['door'])
    expect(catalog.get('door').options).toHaveLength(4)
  })

  it.each([
    ['unknown kind', (input: Record<string, unknown>[]) => { option(input, 0).kind = 'unknown' }],
    ['extra obstacle field', (input: Record<string, unknown>[]) => { input[0].extra = true }],
    ['extra option field', (input: Record<string, unknown>[]) => { option(input, 0).extra = true }],
    ['unknown edge', (input: Record<string, unknown>[]) => { input[0].edgeId = 'missing' }],
    ['unrelated endpoint', (input: Record<string, unknown>[]) => { input[0].endpointNodeIds = ['other'] }],
    ['duplicate endpoint', (input: Record<string, unknown>[]) => { input[0].endpointNodeIds = ['left', 'left'] }],
    ['duplicate option id', (input: Record<string, unknown>[]) => { option(input, 1).id = 'card' }],
    ['invalid time key', (input: Record<string, unknown>[]) => { option(input, 0).timeKey = 'otherTime' }],
    ['invalid equipment slot', (input: Record<string, unknown>[]) => { option(input, 1).equipmentSlot = 'quick-slot' }],
    ['definition incompatible with slot', (input: Record<string, unknown>[]) => { option(input, 1).requiredDefinitionId = 'axe' }],
    ['resource kind mismatch', (input: Record<string, unknown>[]) => { option(input, 1).resourceKind = 'charge' }],
    ['invalid resource source', (input: Record<string, unknown>[]) => { option(input, 1).resourceSource = 'other-source' }],
    ['non-boolean setsAlert', (input: Record<string, unknown>[]) => { option(input, 1).setsAlert = 1 }],
    ['unknown grant', (input: Record<string, unknown>[]) => { ((option(input, 1).spawnGrants as Record<string, unknown>[])[0]).definitionId = 'missing' }],
    ['invalid grant quantity', (input: Record<string, unknown>[]) => { ((option(input, 1).spawnGrants as Record<string, unknown>[])[0]).quantity = 0 }],
    ['grant over stack limit', (input: Record<string, unknown>[]) => { ((option(input, 1).spawnGrants as Record<string, unknown>[])[0]).quantity = 6 }],
    ['invalid initial state', (input: Record<string, unknown>[]) => { ((option(input, 1).spawnGrants as Record<string, unknown>[])[0]).initialState = { kind: 'explicit', current: 1 } }],
    ['missing explicit resource state', (input: Record<string, unknown>[]) => {
      const grant = (option(input, 1).spawnGrants as Record<string, unknown>[])[0]
      grant.definitionId = 'crowbar'
      grant.initialState = { kind: 'none' }
    }],
    ['duplicate grant definition', (input: Record<string, unknown>[]) => {
      const grants = option(input, 1).spawnGrants as Record<string, unknown>[]
      grants.push(structuredClone(grants[0]))
    }],
    ['force protection not armor', (input: Record<string, unknown>[]) => { option(input, 2).protectionDefinitionId = 'axe' }],
    ['force resource not integrity', (input: Record<string, unknown>[]) => { option(input, 2).protectionResourceKind = 'durability' }],
  ])('rejects %s', (_label, mutate) => {
    const input = definitions()
    mutate(input)
    expect(() => create(input)).toThrow(SceneObstacleError)
  })

  it('deep-freezes the catalog and every nested definition', () => {
    const catalog = create()
    const definition = catalog.get('door')
    expect(Object.isFrozen(catalog)).toBe(true)
    expect(Object.isFrozen(definition)).toBe(true)
    expect(Object.isFrozen(definition.endpointNodeIds)).toBe(true)
    expect(Object.isFrozen(definition.options)).toBe(true)
    expect(Object.isFrozen(definition.options[1])).toBe(true)
    if (definition.options[1].kind === 'equipped-resource') {
      expect(Object.isFrozen(definition.options[1].spawnGrants[0].initialState)).toBe(true)
    }
  })

  it('does not mutate runtime input while normalizing the catalog', () => {
    const input = definitions()
    const before = structuredClone(input)
    create(input)
    expect(input).toEqual(before)
  })
})
