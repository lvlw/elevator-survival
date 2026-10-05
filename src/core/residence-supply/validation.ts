import { z } from 'zod'
import { parseResidence } from '../residence-config/validation'
import { sharedSupplySchema, validateSupplyFacts } from './shared-validation'
import type { SupplyDependencies, SupplyValue } from './types'
export { ensure, cycleContext, liveSupplyItems, supplyCharacterSchema, rangeSchema } from './shared-validation'
const schema = sharedSupplySchema.extend({ protocol: z.literal('residence-supply-pure-v1') })
/** Strict old protocol remains exact and rejects combat fields and receipts. */
export function readSupplyValue(input: unknown, deps: SupplyDependencies): SupplyValue {
  return validateSupplyFacts(parseResidence(schema, input), deps)
}
