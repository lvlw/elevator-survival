import { deepFreeze } from '../config'
import { ConditionError } from './condition-errors'
import { cloneCondition } from './player-condition'
import type {
  InfectionExposureReductionResult,
  OpenWoundSnapshot,
  PlayerConditionSnapshot,
} from './condition-types'

function positive(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ConditionError('INVALID_AMOUNT', '变化量必须是正安全整数')
  }
}

function addCount(current: number, amount: number): number {
  positive(amount)
  const result = current + amount
  if (!Number.isSafeInteger(result)) {
    throw new ConditionError('COUNT_OVERFLOW', '数量超出安全整数范围')
  }
  return result
}

export const setBleeding = (state: PlayerConditionSnapshot, bleeding: boolean) =>
  cloneCondition(state, { bleeding })
export const startBleeding = (state: PlayerConditionSnapshot) => setBleeding(state, true)
export const stopBleeding = (state: PlayerConditionSnapshot) => setBleeding(state, false)

export function addOpenWound(
  state: PlayerConditionSnapshot,
  wound: OpenWoundSnapshot,
): PlayerConditionSnapshot {
  if (state.openWounds.some(({ id }) => id === wound.id)) {
    throw new ConditionError('DUPLICATE_OPEN_WOUND_ID', `开放伤口ID重复：${wound.id}`)
  }
  return cloneCondition(state, { openWounds: [...state.openWounds, wound] })
}

export function getOpenWound(state: PlayerConditionSnapshot, woundId: string): OpenWoundSnapshot {
  const wound = state.openWounds.find(({ id }) => id === woundId)
  if (!wound) throw new ConditionError('UNKNOWN_OPEN_WOUND', `开放伤口不存在：${woundId}`)
  return wound
}

export function treatOpenWound(state: PlayerConditionSnapshot, woundId: string): PlayerConditionSnapshot {
  const wound = getOpenWound(state, woundId)
  if (wound.treatment === 'treated') {
    throw new ConditionError('OPEN_WOUND_ALREADY_TREATED', `开放伤口已经处理：${woundId}`)
  }
  return cloneCondition(state, {
    openWounds: state.openWounds.map((candidate) =>
      candidate.id === woundId ? { ...candidate, treatment: 'treated' as const } : candidate,
    ),
  })
}

export function removeOpenWound(state: PlayerConditionSnapshot, woundId: string): PlayerConditionSnapshot {
  getOpenWound(state, woundId)
  return cloneCondition(state, { openWounds: state.openWounds.filter(({ id }) => id !== woundId) })
}

export function addPendingInfectionExposure(state: PlayerConditionSnapshot, amount = 1): PlayerConditionSnapshot {
  return cloneCondition(state, {
    pendingInfectionExposures: addCount(state.pendingInfectionExposures, amount),
  })
}

export function reducePendingInfectionExposure(
  state: PlayerConditionSnapshot,
  requestedReduction: number,
): InfectionExposureReductionResult {
  positive(requestedReduction)
  const actualReduction = Math.min(requestedReduction, state.pendingInfectionExposures)
  const exposuresAfter = state.pendingInfectionExposures - actualReduction
  return deepFreeze({
    state: cloneCondition(state, { pendingInfectionExposures: exposuresAfter }),
    requestedReduction,
    actualReduction,
    unusedReduction: requestedReduction - actualReduction,
    exposuresBefore: state.pendingInfectionExposures,
    exposuresAfter,
  })
}

export function addMinorContusion(state: PlayerConditionSnapshot, amount = 1): PlayerConditionSnapshot {
  return cloneCondition(state, { minorContusions: addCount(state.minorContusions, amount) })
}

export function removeOneMinorContusion(state: PlayerConditionSnapshot): PlayerConditionSnapshot {
  if (state.minorContusions === 0) {
    throw new ConditionError('NO_MINOR_CONTUSION', '没有可恢复移除的轻微挫伤')
  }
  return cloneCondition(state, { minorContusions: state.minorContusions - 1 })
}

export const activatePainkiller = (state: PlayerConditionSnapshot) =>
  cloneCondition(state, { painkillerActive: true })
export const clearPainkiller = (state: PlayerConditionSnapshot) =>
  cloneCondition(state, { painkillerActive: false })
