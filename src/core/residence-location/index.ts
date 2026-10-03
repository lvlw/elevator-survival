// Ordinary headless boundary. Controlled catalog/init/restore/rest are separate.
export { createLocationCommand } from './validation'
export { queryActiveResidencePosition, queryPlayerResidenceKnowledge } from './knowledge'
export { planResidenceMove, assertResidenceLocationPlanCurrent } from './movement'
export { planResidenceSourceReveal } from './sources'
export { planResidenceItemTransfer } from './items'
export { LocationError } from './types'
export type { LocationAuthority, LocationBinding, LocationCatalog, LocationCommand, LocationDependencies,
  LocationKnowledge, LocationPlan, ResidenceLocationSnapshot, ResidenceSite } from './types'
