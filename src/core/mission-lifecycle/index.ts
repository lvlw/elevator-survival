// Read-only boundary: controlled creation and transitions require a separate import.
export {
  queryFirstMissionEligibility,
  queryMissionContinuation,
  listFirstEligibleMissions,
  restoreMissionCandidate,
} from './queries'
export { MissionLifecycleError } from './types'
export type {
  MissionBinding,
  MissionCandidate,
  MissionDeclaration,
  MissionExecutionRequest,
  MissionExpectation,
  MissionLifecycleErrorCode,
  MissionLifecycleValue,
  MissionOutcome,
  MissionScope,
  MissionTerminationResult,
} from './types'
