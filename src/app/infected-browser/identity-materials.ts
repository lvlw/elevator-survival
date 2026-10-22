import { identityMaterialsSchema, readRecord } from './schema'
import type { IdentityMaterials } from './types'
/** Environment identity only. Never used as a substitute for the seeded gameplay draw. */
export function generateBrowserIdentity(): IdentityMaterials {
  const cryptoPort = globalThis.crypto
  return readRecord(identityMaterialsSchema, { characterId: cryptoPort.randomUUID(), runId: cryptoPort.randomUUID(),
    seed: cryptoPort.randomUUID(), generation: cryptoPort.randomUUID() })
}
export const readBrowserIdentity = (input: unknown) => readRecord(identityMaterialsSchema, input)
