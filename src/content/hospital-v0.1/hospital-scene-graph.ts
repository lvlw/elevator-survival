import { createSceneGraph } from '../../core/scene-graph'
import { hospitalSliceV01RuleConfig } from './rule-config'

export const HOSPITAL_NODE_IDS = Object.freeze({
  elevatorAnteroom: 'hospital_elevator_anteroom',
  emergencyHall: 'hospital_emergency_hall',
  pharmacy: 'hospital_pharmacy',
  securityOffice: 'hospital_security_office',
  isolationCorridor: 'hospital_isolation_corridor',
  specimenColdRoom: 'hospital_specimen_cold_room',
} as const)

export const HOSPITAL_EDGE_IDS = Object.freeze({
  elevatorToEmergencyHall: 'elevator-to-emergency-hall',
  emergencyHallToPharmacy: 'emergency-hall-to-pharmacy',
  emergencyHallToSecurityOffice: 'emergency-hall-to-security-office',
  emergencyHallToIsolationCorridor: 'emergency-hall-to-isolation-corridor',
  securityOfficeToIsolationCorridor: 'security-office-to-isolation-corridor',
  isolationCorridorToSpecimenColdRoom:
    'isolation-corridor-to-specimen-cold-room',
} as const)

const baseTravelTime = hospitalSliceV01RuleConfig.scene.movementEdgeTime

export const hospitalSliceV01SceneGraph = createSceneGraph({
  nodes: [
    {
      id: HOSPITAL_NODE_IDS.elevatorAnteroom,
      name: '电梯前室',
      isReturnSafetyNode: true,
    },
    {
      id: HOSPITAL_NODE_IDS.emergencyHall,
      name: '急诊大厅',
      isReturnSafetyNode: false,
    },
    {
      id: HOSPITAL_NODE_IDS.pharmacy,
      name: '药房',
      isReturnSafetyNode: false,
    },
    {
      id: HOSPITAL_NODE_IDS.securityOffice,
      name: '保安值班室',
      isReturnSafetyNode: false,
    },
    {
      id: HOSPITAL_NODE_IDS.isolationCorridor,
      name: '隔离走廊',
      isReturnSafetyNode: false,
    },
    {
      id: HOSPITAL_NODE_IDS.specimenColdRoom,
      name: '标本冷藏室',
      isReturnSafetyNode: false,
    },
  ],
  edges: [
    {
      id: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
      from: HOSPITAL_NODE_IDS.elevatorAnteroom,
      to: HOSPITAL_NODE_IDS.emergencyHall,
      baseTravelTime,
      bidirectional: true,
    },
    {
      id: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy,
      from: HOSPITAL_NODE_IDS.emergencyHall,
      to: HOSPITAL_NODE_IDS.pharmacy,
      baseTravelTime,
      bidirectional: true,
    },
    {
      id: HOSPITAL_EDGE_IDS.emergencyHallToSecurityOffice,
      from: HOSPITAL_NODE_IDS.emergencyHall,
      to: HOSPITAL_NODE_IDS.securityOffice,
      baseTravelTime,
      bidirectional: true,
    },
    {
      id: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
      from: HOSPITAL_NODE_IDS.emergencyHall,
      to: HOSPITAL_NODE_IDS.isolationCorridor,
      baseTravelTime,
      bidirectional: true,
    },
    {
      id: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
      from: HOSPITAL_NODE_IDS.securityOffice,
      to: HOSPITAL_NODE_IDS.isolationCorridor,
      baseTravelTime,
      bidirectional: true,
    },
    {
      id: HOSPITAL_EDGE_IDS.isolationCorridorToSpecimenColdRoom,
      from: HOSPITAL_NODE_IDS.isolationCorridor,
      to: HOSPITAL_NODE_IDS.specimenColdRoom,
      baseTravelTime,
      bidirectional: true,
    },
  ],
})

export const HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS = Object.freeze([
  HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
  HOSPITAL_EDGE_IDS.emergencyHallToPharmacy,
  HOSPITAL_EDGE_IDS.emergencyHallToSecurityOffice,
  HOSPITAL_EDGE_IDS.isolationCorridorToSpecimenColdRoom,
])

export const HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS = Object.freeze([
  ...HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
])

export const HOSPITAL_SECURITY_ROUTE_EDGE_IDS = Object.freeze([
  ...HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
])
