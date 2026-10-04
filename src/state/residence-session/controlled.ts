import { buildResidenceSession, issueResidenceDomain } from './session'
import type { ResidenceDomain, ResidenceSessionComposition } from './types'
export { createResidenceSavePolicy } from '../residence-save/validation'

/** Composition-only application domain; not an absence-of-history proof or a browser lock. */
export function createResidenceSessionDomain(): ResidenceDomain { return issueResidenceDomain() }
export function createResidenceSession(domain: ResidenceDomain, composition: ResidenceSessionComposition) {
  return buildResidenceSession(domain, composition)
}
