import { deriveStableSplitInstanceId } from '../inventory'
import { RunLoadoutError } from './run-loadout-errors'

export function createStableRunLoadoutSplitInstanceId(
  sourceInstanceId: string,
  sourceQuantityBeforeSplit: number,
): string {
  if (typeof sourceInstanceId !== 'string' || sourceInstanceId.trim().length === 0) {
    throw new RunLoadoutError('INVALID_INPUT', '拆分来源实例ID不能为空')
  }
  if (!Number.isSafeInteger(sourceQuantityBeforeSplit) || sourceQuantityBeforeSplit <= 1) {
    throw new RunLoadoutError('INVALID_INPUT', '拆分前数量必须大于1')
  }
  try {
    return deriveStableSplitInstanceId({
      scope: 'run-loadout-split',
      sourceInstanceId,
      sourceQuantityBeforeSplit,
      quantity: 1,
    })
  } catch {
    throw new RunLoadoutError('INVALID_INPUT', '拆分身份输入无效')
  }
}

export function createStableRunLoadoutBackpackSplitInstanceId(
  sourceInstanceId: string,
  sourceQuantityBeforeSplit: number,
  quantity: number,
): string {
  if (typeof sourceInstanceId !== 'string' || sourceInstanceId.trim().length === 0) {
    throw new RunLoadoutError('INVALID_INPUT', '背包拆分来源实例ID不能为空')
  }
  try {
    return deriveStableSplitInstanceId({
      scope: 'run-loadout-backpack-split',
      sourceInstanceId,
      sourceQuantityBeforeSplit,
      quantity,
    })
  } catch {
    throw new RunLoadoutError('INVALID_INPUT', '背包拆分身份输入无效')
  }
}
