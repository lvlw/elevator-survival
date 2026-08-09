import {
  createWorldThreatCatalog,
  createWorldThreatDefinition,
} from '../../core/world-threat'
import { hospitalSliceV01RuleConfig } from './rule-config'

export const hospitalWorldThreatDefinition = createWorldThreatDefinition(
  hospitalSliceV01RuleConfig.worldThreat,
)

export const hospitalWorldThreatCatalog = createWorldThreatCatalog([
  hospitalWorldThreatDefinition,
])
