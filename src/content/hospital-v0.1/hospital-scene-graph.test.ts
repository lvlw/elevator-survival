import { describe, expect, it } from 'vitest'
import { findReturnRoute } from '../../core/scene-graph'
import {
  HOSPITAL_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
  HOSPITAL_NODE_IDS,
  HOSPITAL_SECURITY_ROUTE_EDGE_IDS,
  hospitalSliceV01SceneGraph,
} from './hospital-scene-graph'
import { hospitalSliceV01RuleConfig } from './rule-config'

const normalReturn = (
  enabledEdgeIds: readonly string[],
  currentNodeId: string = HOSPITAL_NODE_IDS.specimenColdRoom,
) =>
  findReturnRoute(
    {
      graph: hospitalSliceV01SceneGraph,
      currentNodeId,
      availability: { enabledEdgeIds },
      totalWeight: 0,
      hasMinorContusion: false,
      analgesiaActive: false,
    },
    hospitalSliceV01RuleConfig,
  )

describe('hospital scene graph content', () => {
  it('has the six formal unique node ids', () => {
    expect(hospitalSliceV01SceneGraph.nodes.map((node) => node.id)).toEqual(
      Object.values(HOSPITAL_NODE_IDS),
    )
    expect(new Set(Object.values(HOSPITAL_NODE_IDS))).toHaveLength(6)
  })

  it('has the six formal unique edge ids', () => {
    expect(hospitalSliceV01SceneGraph.edges.map((edge) => edge.id)).toEqual(
      Object.values(HOSPITAL_EDGE_IDS),
    )
    expect(new Set(Object.values(HOSPITAL_EDGE_IDS))).toHaveLength(6)
  })

  it('marks only the elevator anteroom as return safety', () => {
    expect(
      hospitalSliceV01SceneGraph.nodes
        .filter((node) => node.isReturnSafetyNode)
        .map((node) => node.id),
    ).toEqual([HOSPITAL_NODE_IDS.elevatorAnteroom])
  })

  it('reads every formal edge time from the registered rule config', () => {
    expect(
      hospitalSliceV01SceneGraph.edges.every(
        (edge) =>
          edge.baseTravelTime ===
          hospitalSliceV01RuleConfig.scene.movementEdgeTime,
      ),
    ).toBe(true)
  })

  it('uses the opened fire-door route for the formal base return of 30', () => {
    const result = normalReturn(HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS)
    expect(result).toMatchObject({
      baseReturnTime: 30,
      estimatedReturnTime: 30,
      nodeIds: [
        HOSPITAL_NODE_IDS.specimenColdRoom,
        HOSPITAL_NODE_IDS.isolationCorridor,
        HOSPITAL_NODE_IDS.emergencyHall,
        HOSPITAL_NODE_IDS.elevatorAnteroom,
      ],
      edgeIds: [
        HOSPITAL_EDGE_IDS.isolationCorridorToSpecimenColdRoom,
        HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
        HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
      ],
    })
  })

  it('cannot traverse the fire door when its edge is not enabled', () => {
    expect(() =>
      normalReturn([
        HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
        HOSPITAL_EDGE_IDS.isolationCorridorToSpecimenColdRoom,
      ]),
    ).toThrowError(expect.objectContaining({ code: 'NO_RETURN_ROUTE' }))
  })

  it('uses the formal security route for the base return of 40', () => {
    const result = normalReturn(HOSPITAL_SECURITY_ROUTE_EDGE_IDS)
    expect(result).toMatchObject({
      baseReturnTime: 40,
      edgeIds: [
        HOSPITAL_EDGE_IDS.isolationCorridorToSpecimenColdRoom,
        HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
        HOSPITAL_EDGE_IDS.emergencyHallToSecurityOffice,
        HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
      ],
    })
  })

  it('returns zero from the elevator safety node', () => {
    expect(
      normalReturn([], HOSPITAL_NODE_IDS.elevatorAnteroom),
    ).toMatchObject({ baseReturnTime: 0, estimatedReturnTime: 0, edgeIds: [] })
  })

  it('keeps the formal return route stable when enabled-edge order changes', () => {
    const forward = normalReturn(HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS)
    const reversed = normalReturn([...HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS].reverse())
    expect(reversed).toEqual(forward)
  })
})
