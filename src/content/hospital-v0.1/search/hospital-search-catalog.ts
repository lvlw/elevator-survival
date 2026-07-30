import { createMainSearchDefinitionCatalog } from '../../../core/scene-search'
import { hospitalSliceV01SceneGraph } from '../hospital-scene-graph'
import {
  hospitalItemCatalog,
  hospitalItemResourceCatalog,
} from '../items'
import { hospitalMainSearchDefinitions } from './hospital-search-definitions'

export const hospitalMainSearchCatalog = createMainSearchDefinitionCatalog(
  hospitalMainSearchDefinitions,
  hospitalSliceV01SceneGraph,
  hospitalItemCatalog,
  hospitalItemResourceCatalog,
)
