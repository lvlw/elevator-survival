import { z } from 'zod'
import { identitySchema } from '../../core/character-cycle/validation'
import { bindingSchema, executionSchema, expectationSchema } from '../../core/mission-lifecycle/validation'
import { countSchema, positiveSchema } from '../../core/residence-config/validation'

export const supplyPhaseSchema = z.enum(['first-hub', 'active-world', 'living-hub', 'dead'])
export const supplyExpectationSchema = z.strictObject({
  identity: identitySchema, phase: supplyPhaseSchema, revision: countSchema, cycle: positiveSchema,
  missions: z.array(expectationSchema).min(1),
  initial: z.strictObject({ binding: bindingSchema, execution: executionSchema }),
})
export const supplyEnvelopeSchema = z.strictObject({
  format: z.string(), formatVersion: countSchema, state: z.unknown(),
})
