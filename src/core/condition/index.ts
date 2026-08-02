export {
  calculateEscapeWoundCtbModifier,
  getTotalOpenWoundCount,
  getTreatedOpenWoundCount,
  getUntreatedOpenWoundCount,
  getUntreatedOpenWounds,
  getTreatedOpenWounds,
  hasActiveMinorContusionTravelPenalty,
  hasMinorContusions,
  hasUntreatedOpenWounds,
  isDead,
  isPainkillerSuppressingMinorContusion,
} from './condition-selectors'
export { ConditionError, type ConditionErrorCode } from './condition-errors'
export { applyHealthLoss, restoreHealth } from './health-operations'
export {
  activatePainkiller,
  addMinorContusion,
  addOpenWound,
  addPendingInfectionExposure,
  clearPainkiller,
  removeOneMinorContusion,
  reducePendingInfectionExposure,
  removeOpenWound,
  setBleeding,
  startBleeding,
  stopBleeding,
  treatOpenWound,
  getOpenWound,
} from './injury-operations'
export {
  createInitialPlayerCondition,
  createPlayerCondition,
} from './player-condition'
export type {
  EscapeWoundCtbModifier,
  EscapeWoundCtbRules,
  HealthLossResult,
  HealthRestoreResult,
  InfectionExposureReductionResult,
  OpenWoundKind,
  OpenWoundSnapshot,
  OpenWoundTreatment,
  PlayerConditionSnapshot,
  PlayerHealthRules,
} from './condition-types'
