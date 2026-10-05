import { z } from 'zod'
import { deepFreeze } from '../config'
import { countSchema, positiveSchema, idSchema, parseResidence } from '../residence-config/validation'
import { supplyPlacementSchema } from '../residence-supply/inventory'
import { ensure } from '../residence-supply/validation'
import type { TaskCatalog } from './catalog'
export const materialInputsSchema = z.array(z.strictObject({ instanceId: idSchema, quantity: positiveSchema })).min(1)
export type TaskCommand = { kind: 'task'; expectedRevision: number; actionId: string;
  method?: 'manual' | 'crow' | 'card' | 'toolbox' | 'method' | 'full' | 'fast' | 'cautious' | 'direct';
  toolInstanceId?: string; placement?: { x: number; y: number; rotated: boolean };
  inputs?: readonly { readonly instanceId: string; readonly quantity: number }[] }
export function createTaskCommand(input: unknown, catalog: TaskCatalog): TaskCommand {
  return deepFreeze(readTaskCommand(input, catalog))
}
function readTaskCommand(input: unknown, catalog: TaskCatalog): TaskCommand {
  const selector = parseResidence(z.object({ actionId: idSchema }).passthrough(), input).actionId
  ensure(catalog.data.actions.some(a => a.id === selector), 'Unknown task selector')
  const base = { kind: z.literal('task'), expectedRevision: countSchema, actionId: z.literal(selector) }
  if (['l1-open', 'l3-open', 'c-gate', 'fire-door', 'fix', 'bypass'].includes(selector))
    return parseResidence(z.strictObject({ ...base, method: z.enum(['manual', 'crow', 'card', 'toolbox', 'method']),
      toolInstanceId: idSchema.optional() }), input)
  if (selector === 'verify' || selector === 'match')
    return parseResidence(z.strictObject({ ...base, method: z.enum(['full', 'fast']) }), input)
  if (selector === 'sample')
    return parseResidence(z.strictObject({ ...base, method: z.enum(['cautious', 'direct']), placement: supplyPlacementSchema }), input)
  if (selector === 'component' || selector === 'module')
    return parseResidence(z.strictObject({ ...base, placement: supplyPlacementSchema }), input)
  if (selector === 'install')
    return parseResidence(z.strictObject({ ...base, inputs: materialInputsSchema }), input)
  return parseResidence(z.strictObject(base), input)
}
