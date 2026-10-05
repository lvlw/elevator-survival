import { z } from 'zod'
import { countSchema as n, idSchema as id, positiveSchema as pos } from '../residence-config/validation'
import { sharedSupplySchema, supplyReceiptSchema } from '../residence-supply/shared-validation'
import { locationBindingSchema } from '../residence-location/identity'
import { stepSchema } from '../residence-terminal/validation'
export const actionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('metal-pipe-basic-attack') }),
  z.strictObject({ kind: z.literal('metal-pipe-charged-strike') }),
  z.strictObject({ kind: z.literal('defend') }),
  z.strictObject({ kind: z.literal('temporary-attack') }),
  z.strictObject({ kind: z.literal('escape') }),
  z.strictObject({ kind: z.literal('use-quick-slot-item'), quickSlotIndex: n, targetOpenWoundId: id.optional() }),
])
export const traceSchema = z.strictObject({ kind: z.enum(['heal', 'direct-damage', 'post-action-bleeding', 'injury', 'exposure', 'treatment']),
  actionId: id, ctb: n, requested: n, actual: n, healthBefore: n, healthAfter: n, reference: id.nullable() })
export const entrySchema = z.strictObject({ id, binding: locationBindingSchema, revision: pos, baseRevision: n,
  edgeId: id, from: id, to: id, enemyId: id, enemyInstanceId: id, definitionId: id,
  previouslyEncountered: z.boolean(), enemyHealth: pos, intent: id, nextCycleIndex: n, actionCount: n, riskIndex: n,
  healthBefore: pos, healthAfter: n, steps: z.array(stepSchema).min(1) })
export const decisionSchema = z.strictObject({ battleId: id, revision: pos, baseRevision: n, command: actionSchema,
  ctbBefore: n, ctbAfter: n, playerNext: n, enemyNext: n, healthBefore: pos, healthAfter: n, enemyHealthBefore: pos, enemyHealthAfter: n,
  actionCountBefore: n, actionCountAfter: n, enemyResponses: n, riskBefore: n, riskAfter: n,
  trace: z.array(traceSchema), uses: z.array(z.strictObject({ instanceId: id, definitionId: id, slot: n,
    dispositionIds: z.array(id).min(1), kind: z.enum(['bandage', 'painkiller']), quantity: z.literal(1) })),
  resources: z.array(z.strictObject({ instanceId: id, before: n, requested: n, consumed: n, after: n })),
  quotaBefore: n, quotaAfter: n, queue: z.array(z.strictObject({
    reason: z.enum(['player-action-scheduled','escape-preparation-scheduled','enemy-action-resolved','enemy-action-terminal','escape-completed','player-decision-point']),
    currentBefore:n,currentAfter:n,playerBefore:n,playerAfter:n,enemyBefore:n,enemyAfter:n })) })
export const combatValueSchema = sharedSupplySchema.extend({
  protocol: z.literal('residence-combat-pure-v1'),
  receipts: z.array(z.union([supplyReceiptSchema, supplyReceiptSchema.omit({ source: true })
    .extend({ source: z.literal('combat-death'), combatDeathReceiptId: id })])),
  battle: z.strictObject({ entry: entrySchema, currentCtb: n, playerNext: n, enemyNext: n,
    temporaryDefense: z.null(), decision: decisionSchema.nullable() }).nullable(),
  battles: z.array(z.strictObject({ entry: entrySchema, decision: decisionSchema, outcome: z.enum(['victory', 'escaped']),
    exitRevision: pos, elapsed: n, requestedEnergy: n, energyBefore: n, energyAfter: n, nodeId: id })).max(4096),
  combatDeaths: z.array(z.strictObject({ id, entry: entrySchema, decision: decisionSchema, revision: pos })).max(4096),
})
