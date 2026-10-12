import { z } from 'zod'
import { identitySchema } from '../../core/character-cycle/validation'
import { bindingSchema, declarationSchema, executionSchema, expectationSchema } from '../../core/mission-lifecycle/validation'
import { locationBindingSchema } from '../../core/residence-location/identity'
import { traceSchema } from '../../core/residence-combat/schema'
import { countSchema as n, idSchema as id, positiveSchema as pos } from '../../core/residence-config/validation'

export const combatVersionsSchema = z.strictObject({
  rulesVersion: id, residenceConfigurationId: id, terminalConfigurationId: id, supplyConfigurationId: id,
  contentId: id, randomAlgorithmVersion: id, profileIds: z.array(id).min(1),
  catalogs: z.array(z.strictObject({ catalogId: id, catalogVersion: id, mission: declarationSchema })).min(1),
})
export const combatBattleAnchorSchema = z.strictObject({
  binding: locationBindingSchema, battleId: id, entryRevision: pos, from: id, to: id, edgeId: id,
  enemyId: id, enemyInstanceId: id, definitionId: id, currentCtb: n, playerNext: n, enemyNext: n,
  intent: id, nextCycleIndex: n, actionCount: n, riskIndex: n,
})
export const combatClosureAnchorSchema = z.strictObject({
  binding: locationBindingSchema, outcome: z.enum(['success', 'voluntary-failure', 'deadline-failure', 'death']),
  source: z.enum(['normal-return', 'deadline', 'location-death', 'supply-death', 'combat-death']),
  revision: pos, startCycle: pos, endCycle: pos, taskDay: pos,
  combat: z.strictObject({ battleId: id, entryRevision: pos, edgeId: id, from: id, to: id,
    enemyId: id, enemyInstanceId: id, definitionId: id, trace: z.array(traceSchema).min(1) }).nullable(),
})
export const combatExpectationSchema = z.strictObject({
  identity: identitySchema, phase: z.enum(['first-hub', 'active-world', 'living-hub', 'dead']),
  revision: n, cycle: pos, versions: combatVersionsSchema, missions: z.array(expectationSchema).min(1),
  initial: z.strictObject({ binding: bindingSchema, execution: executionSchema,
    choices: z.strictObject({ tool: z.enum(['crow', 'lamp', 'toolbox']), specialty: z.enum(['scout', 'engineer', 'survival']) }) }),
  battle: combatBattleAnchorSchema.nullable(), closure: combatClosureAnchorSchema.nullable(),
})
export const combatEnvelopeSchema = z.strictObject({ format: z.string(), formatVersion: n, state: z.unknown() })
