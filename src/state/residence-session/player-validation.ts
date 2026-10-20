import { z } from 'zod'
import { countSchema, positiveSchema, parseResidence } from '../../core/residence-config/validation'
import { assertCombatData } from './combat-composition'
import type { PlayerHandle } from './player-types'
const handle = z.custom<PlayerHandle>(v => v !== null && typeof v === 'object' && !Array.isArray(v))
const placement = z.strictObject({ x: countSchema, y: countSchema, rotated: z.boolean() })
const schema = z.strictObject({ action: handle, item: handle.optional(), targetItem: handle.optional(), wound: handle.optional(),
  quantity: positiveSchema.optional(), placement: placement.optional(), placements: z.array(placement).min(1).optional(), slot: countSchema.optional(),
  target: z.enum(['contusion', 'wound']).optional(),
  materials: z.array(z.strictObject({ item: handle, quantity: positiveSchema })).min(1).optional(),
  allocations: z.array(z.strictObject({ item: handle, amount: positiveSchema })).min(1).optional() })
export function readPlayerRequest(input: unknown) {
  assertCombatData(input)
  return parseResidence(schema, input)
}
