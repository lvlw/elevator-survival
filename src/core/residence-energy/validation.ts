import { z } from 'zod'
import { deepFreeze } from '../config'
import { executionSchema } from '../mission-lifecycle/validation'
import { identitySchema, requestBindingShape } from '../character-cycle/validation'
import { countSchema, idSchema, parseResidence, positiveSchema, safeInteger, safeMultiply } from '../residence-config/validation'
import type { ResidenceActionRequest, ResidenceCost } from './types'

const free = z.strictObject({ kind: z.literal('free'), amount: z.literal(0) })
const paid = z.strictObject({ kind: z.literal('paid'), base: positiveSchema,
  factors: z.array(z.strictObject({ numerator: positiveSchema, denominator: positiveSchema })) })
const costSchema = z.discriminatedUnion('kind', [free, paid])
export const actionSchema = z.union([
  z.strictObject({ ...requestBindingShape, action: z.enum(['view', 'organize', 'revealed-pickup', 'medical', 'food']), cost: free }),
  z.strictObject({ ...requestBindingShape, action: z.enum(['move', 'search', 'extraction', 'repair', 'recharge', 'npc-handover', 'install']), cost: paid }),
])
export const primarySchema = z.strictObject({ healthLoss: countSchema, exposuresAdded: countSchema })
const completionSchema = z.strictObject({ identity: identitySchema, revision: countSchema, execution: executionSchema.nullable(),
  request: actionSchema, energyBefore: countSchema, energyAfter: countSchema })
export const providedSchema = z.strictObject({ completion: completionSchema, effects: primarySchema })
export const triggerSchema = z.strictObject({ identity: identitySchema, revision: countSchema, execution: executionSchema,
  triggerId: idSchema, kind: z.enum(['combat-action-completed', 'bleeding-checkpoint', 'immediate-result']), effects: primarySchema })
export const triggeredRequestSchema = z.strictObject({ ...requestBindingShape, triggerId: idSchema })

export function createResidenceActionRequest(input: unknown): ResidenceActionRequest {
  const result = parseResidence(actionSchema, input)
  calculateResidenceActionCost(result.cost)
  return deepFreeze(result)
}

export function calculateResidenceActionCost(input: unknown): number {
  const cost: ResidenceCost = parseResidence(costSchema, input)
  if (cost.kind === 'free') return 0
  let numerator = cost.base
  let denominator = 1
  for (const factor of cost.factors) {
    numerator = safeMultiply(numerator, factor.numerator)
    denominator = safeMultiply(denominator, factor.denominator)
  }
  // One ceiling, after all factors. BigInt avoids a spurious numerator+d-1 overflow.
  const n = BigInt(numerator)
  const d = BigInt(denominator)
  return safeInteger(n / d + (n % d === 0n ? 0n : 1n))
}
