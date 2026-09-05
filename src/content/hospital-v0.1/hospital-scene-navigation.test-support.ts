import {
  applyPlayerNavigationArrival,
  createInitialPlayerNavigationKnowledge,
} from '../../core/scene-navigation'
import {
  createInitialSceneExplorationSnapshot,
  createSceneExplorationSnapshot,
} from '../../core/scene-exploration'
import type {
  SceneExplorationInitialSnapshotInput,
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
} from '../../core/scene-exploration'
import { HOSPITAL_NODE_IDS, hospitalSliceV01SceneGraph } from './hospital-scene-graph'
import { hospitalSceneSurfaceObservationCatalog } from './hospital-scene-navigation'

const arrivalPaths: Readonly<Record<string, readonly string[]>> = {
  [HOSPITAL_NODE_IDS.elevatorAnteroom]: [HOSPITAL_NODE_IDS.elevatorAnteroom],
  [HOSPITAL_NODE_IDS.emergencyHall]: [
    HOSPITAL_NODE_IDS.elevatorAnteroom,
    HOSPITAL_NODE_IDS.emergencyHall,
  ],
  [HOSPITAL_NODE_IDS.pharmacy]: [
    HOSPITAL_NODE_IDS.elevatorAnteroom,
    HOSPITAL_NODE_IDS.emergencyHall,
    HOSPITAL_NODE_IDS.pharmacy,
  ],
  [HOSPITAL_NODE_IDS.securityOffice]: [
    HOSPITAL_NODE_IDS.elevatorAnteroom,
    HOSPITAL_NODE_IDS.emergencyHall,
    HOSPITAL_NODE_IDS.securityOffice,
  ],
  [HOSPITAL_NODE_IDS.isolationCorridor]: [
    HOSPITAL_NODE_IDS.elevatorAnteroom,
    HOSPITAL_NODE_IDS.emergencyHall,
    HOSPITAL_NODE_IDS.isolationCorridor,
  ],
  [HOSPITAL_NODE_IDS.specimenColdRoom]: [
    HOSPITAL_NODE_IDS.elevatorAnteroom,
    HOSPITAL_NODE_IDS.emergencyHall,
    HOSPITAL_NODE_IDS.isolationCorridor,
    HOSPITAL_NODE_IDS.specimenColdRoom,
  ],
}

/** Builds hospital test fixtures as if the player really arrived from the elevator anteroom. */
export function createHospitalTestSceneExplorationSnapshot(
  input: SceneExplorationInitialSnapshotInput,
  dependencies: SceneExplorationDependencies,
): SceneExplorationSnapshot {
  const base = createInitialSceneExplorationSnapshot(input, dependencies)
  const knowledge = createHospitalTestNavigationKnowledge(input.currentNodeId)
  return createSceneExplorationSnapshot({
    ...base,
    navigationKnowledge: knowledge,
  }, dependencies)
}

export function createHospitalTestNavigationKnowledge(currentNodeId: string) {
  const path = arrivalPaths[currentNodeId]
  if (!path) throw new Error(`No hospital arrival path for ${currentNodeId}`)
  return createHospitalTestNavigationKnowledgeAlongPath(path)
}

export function createHospitalTestNavigationKnowledgeAlongPath(path: readonly string[]) {
  if (path[0] !== HOSPITAL_NODE_IDS.elevatorAnteroom) {
    throw new Error('Hospital test navigation paths must start at the elevator anteroom')
  }
  let knowledge = createInitialPlayerNavigationKnowledge(
    HOSPITAL_NODE_IDS.elevatorAnteroom,
    hospitalSliceV01SceneGraph,
    hospitalSceneSurfaceObservationCatalog,
  )
  for (const nodeId of path.slice(1)) {
    knowledge = applyPlayerNavigationArrival(
      knowledge,
      nodeId,
      hospitalSliceV01SceneGraph,
      hospitalSceneSurfaceObservationCatalog,
    ).knowledge
  }
  return knowledge
}
