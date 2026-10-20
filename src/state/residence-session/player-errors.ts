import { ResidenceError } from '../../core/residence-config'
import { SupplyError } from '../../core/residence-supply/types'
import { LocationError } from '../../core/residence-location/types'
import { InventoryError } from '../../core/inventory'
import { ItemStateError } from '../../core/item-state'
import { ResidenceSessionError } from './types'
export class PlayerSelectionError extends Error {
  constructor() { super('Selection is not valid in this context'); this.name = 'PlayerSelectionError' }
}
/** A code-shaped arbitrary Error is not a business rejection. */
export function isPlayerBusinessError(e: unknown) {
  return e instanceof PlayerSelectionError || e instanceof ResidenceError || e instanceof SupplyError ||
    e instanceof LocationError || e instanceof InventoryError || e instanceof ItemStateError || e instanceof ResidenceSessionError
}
