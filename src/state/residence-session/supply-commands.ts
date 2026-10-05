import { z } from 'zod'
import { deepFreeze } from '../../core/config'
import { countSchema, idSchema, positiveSchema, parseResidence } from '../../core/residence-config/validation'
import { supplyPlacementSchema as placement } from '../../core/residence-supply/inventory'
import { materialInputsSchema as inputs, createTaskCommand } from '../../core/residence-task/validation'
import type { TaskCatalog } from '../../core/residence-task/catalog'

const rev = { expectedRevision: countSchema }
const inventory = z.discriminatedUnion('kind', [
  z.strictObject({ ...rev, kind: z.literal('move'), instanceId: idSchema, placement }),
  z.strictObject({ ...rev, kind: z.literal('split'), instanceId: idSchema, quantity: positiveSchema, placement }),
  z.strictObject({ ...rev, kind: z.literal('merge'), instanceId: idSchema, targetId: idSchema, quantity: positiveSchema }),
  z.strictObject({ ...rev, kind: z.literal('to-quick'), instanceId: idSchema, slot: countSchema }),
  z.strictObject({ ...rev, kind: z.literal('to-backpack'), slot: countSchema, placement }),
  z.strictObject({ ...rev, kind: z.literal('pickup'), instanceId: idSchema, placement }),
  z.strictObject({ ...rev, kind: z.literal('drop'), instanceId: idSchema }),
])
const transfer = z.discriminatedUnion('kind', [
  z.strictObject({ ...rev, kind: z.literal('task-pickup'), instanceId: idSchema, placement }),
  z.strictObject({ ...rev, kind: z.literal('task-drop'), instanceId: idSchema }),
])
const maintenance = z.discriminatedUnion('kind', [
  z.strictObject({ ...rev, kind: z.literal('mechanical'), inputs,
    allocations: z.array(z.strictObject({ instanceId: idSchema, amount: positiveSchema })).min(1) }),
  z.strictObject({ ...rev, kind: z.enum(['coat', 'toolbox', 'recharge']), inputs, instanceId: idSchema }),
])
const schema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('depart'), command: z.strictObject({ ...rev, kind: z.literal('depart'), commissionId: idSchema }) }),
  z.strictObject({ kind: z.literal('move'), command: z.strictObject({ ...rev, kind: z.literal('move'), edgeId: idSchema }) }),
  z.strictObject({ kind: z.literal('rest'), command: z.strictObject({ ...rev, kind: z.literal('rest') }) }),
  z.strictObject({ kind: z.literal('source'), command: z.strictObject({ ...rev, kind: z.literal('reveal'), sourceId: idSchema,
    method: z.enum(['dark', 'lit', 'manual', 'crow']).optional(), toolInstanceId: idSchema.optional(),
    inputs: inputs.optional(), placements: z.array(placement).min(1).optional() }) }),
  z.strictObject({ kind: z.literal('inventory'), command: inventory }),
  z.strictObject({ kind: z.literal('task-transfer'), command: transfer }),
  z.strictObject({ kind: z.literal('medical'), command: z.strictObject({ ...rev, kind: z.literal('medical'), instanceId: idSchema,
    quantity: z.literal(1).optional(), woundId: idSchema.optional(), target: z.enum(['contusion', 'wound']).optional() }) }),
  z.strictObject({ kind: z.literal('maintenance'), command: maintenance }),
  z.strictObject({ kind: z.literal('terminal'), command: z.strictObject({ ...rev, kind: z.enum(['deliver', 'withdraw', 'deadline']) }) }),
])
/** Shape-only application envelope. Target legality and costs remain with P. */
export function createSupplySessionCommand(input: unknown, catalog: TaskCatalog) {
  const outer = parseResidence(z.strictObject({ kind: z.string(), command: z.unknown() }), input)
  if (outer.kind === 'task') return deepFreeze({ kind: 'task' as const, command: createTaskCommand(outer.command, catalog) })
  return deepFreeze(parseResidence(schema, input))
}
export type SupplySessionCommand = ReturnType<typeof createSupplySessionCommand>
