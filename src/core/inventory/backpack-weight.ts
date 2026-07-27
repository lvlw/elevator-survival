import { InventoryError } from './inventory-errors'
import type { BackpackSnapshot } from './backpack-types'
import type { ItemCatalog } from './item-types'

const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER)

export function calculateBackpackWeightSubtotal(
  snapshot: BackpackSnapshot,
  catalog: ItemCatalog,
): number {
  let subtotal = 0n

  for (const item of snapshot.items) {
    const definition = catalog.get(item.definitionId)
    const itemWeight = BigInt(definition.unitWeight) * BigInt(item.quantity)
    if (itemWeight > MAX_SAFE_INTEGER) {
      throw new InventoryError(
        'WEIGHT_OVERFLOW',
        `实例${item.instanceId}的重量乘法超出安全整数范围`,
      )
    }
    subtotal += itemWeight
    if (subtotal > MAX_SAFE_INTEGER) {
      throw new InventoryError('WEIGHT_OVERFLOW', '背包重量小计超出安全整数范围')
    }
  }

  return Number(subtotal)
}
