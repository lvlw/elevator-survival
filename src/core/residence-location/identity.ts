import { z } from 'zod'
import { identitySchema } from '../character-cycle/validation'
import { declarationSchema, executionSchema } from '../mission-lifecycle/validation'
import { createRandomCursor, createStreamId } from '../random'
import { countSchema, idSchema, parseResidence } from '../residence-config/validation'
import type { LocationBinding } from './types'

export const locationBindingSchema = z.strictObject({ identity: identitySchema, mission: declarationSchema,
  execution: executionSchema, catalogId: idSchema, catalogVersion: idSchema })

/** Internal stable identity encoding. Not a player-visible random preview. */
export function locationRandomCursor(bindingInput: LocationBinding, placeId: string, nodeId: string,
  entity: 'source' | 'enemy', entityId: string, purpose: 'contents' | 'risk', drawIndex: number) {
  const b = parseResidence(locationBindingSchema, bindingInput)
  const keys = parseResidence(z.strictObject({ placeId: idSchema, nodeId: idSchema,
    entity: z.enum(['source', 'enemy']), entityId: idSchema, purpose: z.enum(['contents', 'risk']), drawIndex: countSchema }),
  { placeId, nodeId, entity, entityId, purpose, drawIndex })
  const stream = createStreamId('residence-location-v1', b.identity.characterId, b.identity.rulesVersion,
    b.identity.configurationId, b.mission.worldId, b.mission.templateId, b.mission.commissionId,
    b.mission.contractVersion, b.execution.runId, b.execution.rulesVersion, b.catalogId, b.catalogVersion,
    keys.placeId, keys.nodeId, keys.entity, keys.entityId, keys.purpose)
  return createRandomCursor(b.execution.seed, stream, keys.drawIndex)
}

export function sourceItemId(binding: LocationBinding, place: string, node: string, source: string, ordinal: number) {
  const cursor = locationRandomCursor(binding, place, node, 'source', source, 'contents', 0)
  // Include seed as well as stream identity: all components of the execution are bound.
  return createStreamId(cursor.seed, cursor.streamId, 'item', String(parseResidence(countSchema, ordinal)))
}
