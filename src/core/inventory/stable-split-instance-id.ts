import { InventoryError } from './inventory-errors'

/**
 * Deterministically derives a new physical identity when one stack is split.
 * A scope keeps independent transactions distinct without introducing entropy.
 */
export function deriveStableSplitInstanceId(input: Readonly<{
  scope: string
  sourceInstanceId: string
  sourceQuantityBeforeSplit: number
  quantity: number
}>): string {
  if (!input || typeof input.scope !== 'string' || !input.scope.trim() ||
    typeof input.sourceInstanceId !== 'string' || !input.sourceInstanceId.trim() ||
    !Number.isSafeInteger(input.sourceQuantityBeforeSplit) || input.sourceQuantityBeforeSplit <= 1 ||
    !Number.isSafeInteger(input.quantity) || input.quantity <= 0 || input.quantity >= input.sourceQuantityBeforeSplit) {
    throw new InventoryError('INVALID_INSTANCE_ID', '稳定拆分身份的输入无效')
  }
  const prefix = `${input.scope}:${input.sourceInstanceId.length}:${input.sourceInstanceId}:${input.sourceQuantityBeforeSplit}`
  return input.quantity === 1 ? prefix : `${prefix}:${input.quantity}`
}
