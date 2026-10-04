// Pure codec/candidate operations; none grant installation or replacement authority.
export { createResidenceEnvelope, serializeResidenceSave, deserializeResidenceSave } from './codec'
export { validateResidenceAggregate } from './validation'
export { ResidenceSaveError, RESIDENCE_FORMAT, RESIDENCE_FORMAT_VERSION } from './types'
export type { ResidenceAggregate, ActiveResidenceWorld, FreshResidenceHub, ResidenceEnvelope, ResidenceSavePolicy } from './types'
