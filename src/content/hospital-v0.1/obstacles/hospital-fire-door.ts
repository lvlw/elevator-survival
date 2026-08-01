import { createSceneObstacleCatalog, type SceneObstacleDefinition } from '../../../core/scene-obstacle'
import { HOSPITAL_EDGE_IDS, HOSPITAL_NODE_IDS, hospitalSliceV01SceneGraph } from '../hospital-scene-graph'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemResourceCatalog,
} from '../items'
import { HOSPITAL_EVENT_IDS, HOSPITAL_FIRE_DOOR_OPTION_IDS, HOSPITAL_OBSTACLE_IDS } from './hospital-obstacle-ids'

export const hospitalFireDoorDefinition = {
  id: HOSPITAL_OBSTACLE_IDS.isolationFireDoor,
  eventId: HOSPITAL_EVENT_IDS.isolationFireDoor,
  edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
  endpointNodeIds: [
    HOSPITAL_NODE_IDS.emergencyHall,
    HOSPITAL_NODE_IDS.isolationCorridor,
  ],
  options: [
    {
      id: HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard,
      kind: 'backpack-item',
      timeKey: 'accessCardTime',
      requiredDefinitionId: HOSPITAL_ITEM_IDS.isolationWardAccessCard,
    },
    {
      id: HOSPITAL_FIRE_DOOR_OPTION_IDS.crowbar,
      kind: 'equipped-resource',
      timeKey: 'crowbarTime',
      equipmentSlot: 'utility',
      requiredDefinitionId: HOSPITAL_ITEM_IDS.crowbar,
      resourceKind: 'durability',
      resourceSource: 'fire-door-crowbar',
      setsAlert: false,
      spawnGrants: [],
    },
    {
      id: HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit,
      kind: 'equipped-resource',
      timeKey: 'toolkitTime',
      equipmentSlot: 'utility',
      requiredDefinitionId: HOSPITAL_ITEM_IDS.toolkit,
      resourceKind: 'durability',
      resourceSource: 'fire-door-toolkit',
      setsAlert: false,
      spawnGrants: [{
        definitionId: HOSPITAL_ITEM_IDS.electronicComponents,
        quantity: 1,
        initialState: { kind: 'none' },
      }],
    },
    {
      id: HOSPITAL_FIRE_DOOR_OPTION_IDS.fireAxe,
      kind: 'equipped-resource',
      timeKey: 'fireAxeTime',
      equipmentSlot: 'weapon',
      requiredDefinitionId: HOSPITAL_ITEM_IDS.fireAxe,
      resourceKind: 'durability',
      resourceSource: 'fire-door-fire-axe',
      setsAlert: true,
      spawnGrants: [],
    },
    {
      id: HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry,
      kind: 'force-entry',
      timeKey: 'forceEntryTime',
      protectionDefinitionId: HOSPITAL_ITEM_IDS.heavyCoat,
      protectionResourceKind: 'integrity',
    },
    { id: HOSPITAL_FIRE_DOOR_OPTION_IDS.decline, kind: 'decline' },
  ],
} satisfies SceneObstacleDefinition

export const hospitalSceneObstacleCatalog = createSceneObstacleCatalog(
  [hospitalFireDoorDefinition],
  {
    graph: hospitalSliceV01SceneGraph,
    itemCatalog: hospitalItemCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
    equipmentCatalog: hospitalItemEquipmentCatalog,
  },
)
