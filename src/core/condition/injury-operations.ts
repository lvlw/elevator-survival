import { ConditionError } from './condition-errors'
import { cloneCondition } from './player-condition'
import type { PlayerConditionSnapshot } from './condition-types'

function assertPositiveAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new ConditionError('INVALID_AMOUNT', '伤势变化量必须是正安全整数')
  }
}

function addCount(current: number, amount: number): number {
  assertPositiveAmount(amount)
  const result = current + amount
  if (!Number.isSafeInteger(result)) {
    throw new ConditionError('COUNT_OVERFLOW', '伤势数量超出安全整数范围')
  }
  return result
}

export function setBleeding(
  state: PlayerConditionSnapshot,
  bleeding: boolean,
): PlayerConditionSnapshot {
  return cloneCondition(state, { bleeding })
}

export function startBleeding(
  state: PlayerConditionSnapshot,
): PlayerConditionSnapshot {
  return setBleeding(state, true)
}

export function stopBleeding(
  state: PlayerConditionSnapshot,
): PlayerConditionSnapshot {
  return setBleeding(state, false)
}

export function addUntreatedOpenWound(
  state: PlayerConditionSnapshot,
  amount = 1,
): PlayerConditionSnapshot {
  return cloneCondition(state, {
    untreatedOpenWounds: addCount(state.untreatedOpenWounds, amount),
  })
}

export function treatOneOpenWound(
  state: PlayerConditionSnapshot,
): PlayerConditionSnapshot {
  if (state.untreatedOpenWounds === 0) {
    throw new ConditionError(
      'NO_UNTREATED_OPEN_WOUND',
      '没有可处理的未处理开放伤口',
    )
  }
  return cloneCondition(state, {
    untreatedOpenWounds: state.untreatedOpenWounds - 1,
    treatedOpenWounds: addCount(state.treatedOpenWounds, 1),
  })
}

export function removeOneTreatedOpenWound(
  state: PlayerConditionSnapshot,
): PlayerConditionSnapshot {
  if (state.treatedOpenWounds === 0) {
    throw new ConditionError(
      'NO_TREATED_OPEN_WOUND',
      '没有可恢复移除的已处理开放伤口',
    )
  }
  return cloneCondition(state, {
    treatedOpenWounds: state.treatedOpenWounds - 1,
  })
}

export function addMinorContusion(
  state: PlayerConditionSnapshot,
  amount = 1,
): PlayerConditionSnapshot {
  return cloneCondition(state, {
    minorContusions: addCount(state.minorContusions, amount),
  })
}

export function removeOneMinorContusion(
  state: PlayerConditionSnapshot,
): PlayerConditionSnapshot {
  if (state.minorContusions === 0) {
    throw new ConditionError(
      'NO_MINOR_CONTUSION',
      '没有可恢复移除的轻微挫伤',
    )
  }
  return cloneCondition(state, {
    minorContusions: state.minorContusions - 1,
  })
}

export function activatePainkiller(
  state: PlayerConditionSnapshot,
): PlayerConditionSnapshot {
  return cloneCondition(state, { painkillerActive: true })
}

export function clearPainkiller(
  state: PlayerConditionSnapshot,
): PlayerConditionSnapshot {
  return cloneCondition(state, { painkillerActive: false })
}
