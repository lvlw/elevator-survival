import { z } from 'zod'
import { deepFreeze } from '../../core/config'
import { identitySchema } from '../../core/character-cycle/validation'
import { countSchema, idSchema, parseResidence } from '../../core/residence-config/validation'
import { createLocationCommand } from '../../core/residence-location'
import { locationBindingSchema } from '../../core/residence-location/identity'
import type { ResidenceSessionCommand } from './types'

const tag = z.object({ kind: z.enum(['launch', 'move', 'reveal', 'pickup', 'drop', 'rest']) })
const launch = z.strictObject({ kind: z.literal('launch'), identity: identitySchema,
  expectedRevision: countSchema, commissionId: idSchema })
const rest = z.strictObject({ kind: z.literal('rest'), binding: locationBindingSchema, expectedRevision: countSchema })

export function createResidenceSessionCommand(input: unknown): ResidenceSessionCommand {
  // The shared parser checks plain acyclic data before inspecting the routing tag.
  const { kind } = parseResidence(tag, input)
  if (kind === 'launch') return deepFreeze(parseResidence(launch, input))
  if (kind === 'rest') return deepFreeze(parseResidence(rest, input))
  return createLocationCommand(input)
}
