import { createSceneSurfaceObservationCatalog } from '../../core/scene-navigation'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_NODE_IDS,
  hospitalSliceV01SceneGraph,
} from './hospital-scene-graph'

export const hospitalSceneSurfaceObservationCatalog =
  createSceneSurfaceObservationCatalog([
    {
      nodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      surfaceVisibleEdgeIds: [HOSPITAL_EDGE_IDS.elevatorToEmergencyHall],
    },
    {
      nodeId: HOSPITAL_NODE_IDS.emergencyHall,
      surfaceVisibleEdgeIds: [
        HOSPITAL_EDGE_IDS.emergencyHallToPharmacy,
        HOSPITAL_EDGE_IDS.emergencyHallToSecurityOffice,
        HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
      ],
    },
    { nodeId: HOSPITAL_NODE_IDS.pharmacy, surfaceVisibleEdgeIds: [] },
    {
      nodeId: HOSPITAL_NODE_IDS.securityOffice,
      surfaceVisibleEdgeIds: [HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor],
    },
    {
      nodeId: HOSPITAL_NODE_IDS.isolationCorridor,
      surfaceVisibleEdgeIds: [HOSPITAL_EDGE_IDS.isolationCorridorToSpecimenColdRoom],
    },
    { nodeId: HOSPITAL_NODE_IDS.specimenColdRoom, surfaceVisibleEdgeIds: [] },
  ], hospitalSliceV01SceneGraph)
