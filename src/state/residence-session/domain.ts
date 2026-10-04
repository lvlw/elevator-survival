import { ResidenceSessionError, type ResidenceDomain } from './types'

// Shared technical capability registry only: no current, reset or cross-tab claim.
const domains = new WeakSet<object>()
const claimed = new WeakSet<object>()
export function issueResidenceDomain(): ResidenceDomain {
  const domain = Object.freeze({}) as ResidenceDomain
  domains.add(domain)
  return domain
}
export function assertResidenceDomainAvailable(domain: ResidenceDomain): void {
  if (!domain || !domains.has(domain)) throw new ResidenceSessionError('INVALID_DOMAIN', 'Composition-issued domain required')
  if (claimed.has(domain)) throw new ResidenceSessionError('DOMAIN_CLAIMED', 'This application domain already owns a writer')
}
export function claimResidenceDomain(domain: ResidenceDomain): void {
  assertResidenceDomainAvailable(domain)
  claimed.add(domain)
}
