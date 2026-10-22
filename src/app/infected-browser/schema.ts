import { z } from 'zod'
import { deepFreeze } from '../../core/config'
import { idSchema } from '../../core/residence-config/validation'
import { combatExpectationSchema, combatVersionsSchema } from '../../state/residence-save/combat-schema'
import { declarationSchema, executionSchema } from '../../core/mission-lifecycle/validation'
import { BrowserOwnerError } from './errors'
import { assertCombatData } from '../../state/residence-session/combat-composition'
export const NAMESPACE = 'elevator-survival.infected-preplay.v1'
export const SLOT = 'primary'
export const RESERVATION_KEY = NAMESPACE + '.' + SLOT + '.reservation'
export const CHECKPOINT_KEY = NAMESPACE + '.' + SLOT + '.checkpoint'
export const LOCK_NAME = NAMESPACE + '.' + SLOT + '.writer'
export const choicesSchema = z.strictObject({ tool: z.enum(['crow', 'lamp', 'toolbox']), specialty: z.enum(['scout', 'engineer', 'survival']) })
export const identityMaterialsSchema = z.strictObject({ characterId: idSchema, runId: idSchema, seed: idSchema, generation: idSchema })
export const reservationSchema = z.strictObject({ format: z.literal('elevator-survival.infected-reservation'), formatVersion: z.literal(1),
  slot: z.literal(SLOT), generation: idSchema, characterId: idSchema, execution: executionSchema,
  mission: declarationSchema, choices: choicesSchema, versions: combatVersionsSchema })
export const checkpointSchema = z.strictObject({ format: z.literal('elevator-survival.infected-checkpoint'), formatVersion: z.literal(1),
  slot: z.literal(SLOT), generation: idSchema, expected: combatExpectationSchema, v4Text: z.string().min(1) })
export type Reservation = z.infer<typeof reservationSchema>
export type Checkpoint = z.infer<typeof checkpointSchema>
export function readRecord<T>(schema: z.ZodType<T>, input: unknown): Readonly<T> {
  try { assertCombatData(input) } catch { throw new BrowserOwnerError('INVALID_RECORD') }
  const result = schema.safeParse(input)
  if (!result.success) throw new BrowserOwnerError('INVALID_RECORD')
  deepFreeze(result.data)
  return result.data
}
export function readJSON<T>(schema: z.ZodType<T>, text: string): Readonly<T> {
  try { return readRecord(schema, JSON.parse(text)) } catch { throw new BrowserOwnerError('INVALID_RECORD') }
}
