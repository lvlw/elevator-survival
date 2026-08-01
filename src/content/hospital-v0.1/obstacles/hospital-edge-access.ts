import { createSceneEdgeAccessCatalog } from '../../../core/scene-access'
import { HOSPITAL_EDGE_IDS, hospitalSliceV01SceneGraph } from '../hospital-scene-graph'
import { HOSPITAL_ITEM_IDS, hospitalItemCatalog } from '../items'

export const hospitalSceneEdgeAccessCatalog = createSceneEdgeAccessCatalog(
  [{
    edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
    kind: 'backpack-item-permission',
    requiredDefinitionId: HOSPITAL_ITEM_IDS.isolationWardAccessCard,
  }],
  hospitalSliceV01SceneGraph,
  hospitalItemCatalog,
)
