import { hospitalItemDefinitions } from '../hospital-v0.1/items/hospital-item-definitions'
import type { LocationCatalogData } from '../../core/residence-location/catalog'
import type { SupplyConfig } from '../../core/residence-supply/config'
import { numberValue, vectorValue } from '../../core/residence-supply/config'
import type { TaskCatalog } from '../../core/residence-task/catalog'

export const supplyGear = {
  pipe: { id: 'weapon_metal_pipe', kind: 'durability', slot: 'weapon' },
  coat: { id: 'armor_heavy_coat', kind: 'integrity', slot: 'armor' },
  crow: { id: 'utility_crowbar', kind: 'durability', slot: 'utility' },
  lamp: { id: 'utility_flashlight', kind: 'charge', slot: 'utility' },
  toolbox: { id: 'utility_toolkit', kind: 'durability', slot: 'utility' },
} as const
/** Reuses real physical definitions, not hospital resource/medical values. */
export function buildInfectedSupplyItems(c: SupplyConfig, tasks: TaskCatalog): LocationCatalogData['items'] {
  const items: LocationCatalogData['items'] = Object.entries(supplyGear).map(([alias, gear]) => {
    const physical = hospitalItemDefinitions.find(i => i.id === gear.id)!
    return { physical: { ...physical, stacking: { ...physical.stacking } },
      resource: { definitionId: gear.id, kind: gear.kind, maximum: numberValue(c, 'capacity.' + alias) },
      equipment: { definitionId: gear.id, kind: 'equippable', eligibleSlots: [gear.slot] },
      quickSlot: { definitionId: gear.id, kind: 'not-eligible' }, ordinary: true }
  })
  for (const item of tasks.data.items) {
    const [width, height, unitWeight, maximum] = vectorValue(c, item.profile, 4)
    const existing = hospitalItemDefinitions.find(d => d.id === item.id)
    items.push({ physical: { id: item.id, name: existing?.name ?? item.alias, width, height, unitWeight,
      canRotate: existing?.canRotate ?? true, stacking: maximum === 1 ? { kind: 'none' } : { kind: 'stackable', maxQuantity: maximum } },
      resource: { definitionId: item.id, kind: 'none' }, equipment: { definitionId: item.id, kind: 'not-equippable' },
      quickSlot: { definitionId: item.id, kind: item.quickEligible ? 'eligible' : 'not-eligible' }, ordinary: item.ordinary })
  }
  return items
}
