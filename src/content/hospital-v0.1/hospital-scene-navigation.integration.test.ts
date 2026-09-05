import { describe, expect, it } from 'vitest'
import {
  applyPlayerNavigationArrival,
  createInitialPlayerNavigationKnowledge,
} from '../../core/scene-navigation'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_NODE_IDS,
  hospitalSliceV01SceneGraph,
} from './hospital-scene-graph'
import { hospitalSceneSurfaceObservationCatalog } from './hospital-scene-navigation'

function arrive(nodeIds: readonly string[]) {
  let knowledge = createInitialPlayerNavigationKnowledge(
    HOSPITAL_NODE_IDS.elevatorAnteroom,
    hospitalSliceV01SceneGraph,
    hospitalSceneSurfaceObservationCatalog,
  )
  for (const nodeId of nodeIds) {
    knowledge = applyPlayerNavigationArrival(
      knowledge,
      nodeId,
      hospitalSliceV01SceneGraph,
      hospitalSceneSurfaceObservationCatalog,
    ).knowledge
  }
  return knowledge
}

describe('hospital v0.1 surface-visible navigation content', () => {
  it('starts with only the elevator anteroom and its hall route known', () => {
    expect(arrive([])).toEqual({
      discoveredNodeIds: [
        HOSPITAL_NODE_IDS.elevatorAnteroom,
        HOSPITAL_NODE_IDS.emergencyHall,
      ].sort(),
      visitedNodeIds: [HOSPITAL_NODE_IDS.elevatorAnteroom],
      knownEdgeIds: [HOSPITAL_EDGE_IDS.elevatorToEmergencyHall],
    })
  })

  it('reveals exactly the three hall branches on first hall arrival', () => {
    expect(arrive([HOSPITAL_NODE_IDS.emergencyHall])).toEqual({
      discoveredNodeIds: [
        HOSPITAL_NODE_IDS.elevatorAnteroom,
        HOSPITAL_NODE_IDS.emergencyHall,
        HOSPITAL_NODE_IDS.pharmacy,
        HOSPITAL_NODE_IDS.securityOffice,
        HOSPITAL_NODE_IDS.isolationCorridor,
      ].sort(),
      visitedNodeIds: [
        HOSPITAL_NODE_IDS.elevatorAnteroom,
        HOSPITAL_NODE_IDS.emergencyHall,
      ].sort(),
      knownEdgeIds: [
        HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
        HOSPITAL_EDGE_IDS.emergencyHallToPharmacy,
        HOSPITAL_EDGE_IDS.emergencyHallToSecurityOffice,
        HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
      ].sort(),
    })
  })

  it('adds no route at the pharmacy and remains idempotent on repeated arrival', () => {
    const first = arrive([
      HOSPITAL_NODE_IDS.emergencyHall,
      HOSPITAL_NODE_IDS.pharmacy,
    ])
    const repeated = applyPlayerNavigationArrival(
      first,
      HOSPITAL_NODE_IDS.pharmacy,
      hospitalSliceV01SceneGraph,
      hospitalSceneSurfaceObservationCatalog,
    )
    expect(repeated.knowledge).toEqual(first)
    expect(repeated.delta.addedDiscoveredNodeIds).toEqual([])
    expect(repeated.delta.addedVisitedNodeIds).toEqual([])
    expect(repeated.delta.addedKnownEdgeIds).toEqual([])
  })

  it('reveals the staff passage only after visiting security', () => {
    const before = arrive([HOSPITAL_NODE_IDS.emergencyHall])
    expect(before.knownEdgeIds).not.toContain(HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor)
    const after = arrive([
      HOSPITAL_NODE_IDS.emergencyHall,
      HOSPITAL_NODE_IDS.securityOffice,
    ])
    expect(after.knownEdgeIds).toContain(HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor)
    expect(after.visitedNodeIds).toContain(HOSPITAL_NODE_IDS.securityOffice)
  })

  it('reveals only the cold-room route on first isolation-corridor arrival', () => {
    const knowledge = arrive([
      HOSPITAL_NODE_IDS.emergencyHall,
      HOSPITAL_NODE_IDS.isolationCorridor,
    ])
    expect(knowledge.knownEdgeIds).toContain(HOSPITAL_EDGE_IDS.isolationCorridorToSpecimenColdRoom)
    expect(knowledge.discoveredNodeIds).toContain(HOSPITAL_NODE_IDS.specimenColdRoom)
    expect(knowledge.knownEdgeIds).not.toContain(HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor)
  })

  it('adds no route on first cold-room arrival', () => {
    const corridor = arrive([
      HOSPITAL_NODE_IDS.emergencyHall,
      HOSPITAL_NODE_IDS.isolationCorridor,
    ])
    const coldRoom = applyPlayerNavigationArrival(
      corridor,
      HOSPITAL_NODE_IDS.specimenColdRoom,
      hospitalSliceV01SceneGraph,
      hospitalSceneSurfaceObservationCatalog,
    )
    expect(coldRoom.delta.addedKnownEdgeIds).toEqual([])
    expect(coldRoom.delta.addedDiscoveredNodeIds).toEqual([])
    expect(coldRoom.delta.addedVisitedNodeIds).toEqual([HOSPITAL_NODE_IDS.specimenColdRoom])
  })
})
