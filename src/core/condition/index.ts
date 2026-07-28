export {
  calculateEscapeWoundCtbModifier,
  getTotalOpenWoundCount,
  getTreatedOpenWoundCount,
  getUntreatedOpenWoundCount,
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
  addUntreatedOpenWound,
  clearPainkiller,
  removeOneMinorContusion,
  removeOneTreatedOpenWound,
  setBleeding,
  startBleeding,
  stopBleeding,
  treatOneOpenWound,
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
  PlayerConditionSnapshot,
  PlayerHealthRules,
} from './condition-types'
