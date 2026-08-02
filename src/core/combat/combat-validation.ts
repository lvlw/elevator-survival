import { deepFreeze } from '../config'
import { CombatError } from './combat-errors'
import type {
  CombatPlayerActionCommand,
  TemporaryDefenseSnapshot,
} from './combat-types'

export function hasExactObjectKeys(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...expectedKeys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

export function createCombatPlayerActionCommand(
  input: CombatPlayerActionCommand,
): CombatPlayerActionCommand {
  if (!hasExactObjectKeys(input, ['kind'])) {
    throw new CombatError('INVALID_COMBAT_COMMAND', '玩家战斗命令结构无效')
  }
  if (
    input.kind !== 'metal-pipe-basic-attack' &&
    input.kind !== 'metal-pipe-charged-strike' &&
    input.kind !== 'defend' &&
    input.kind !== 'temporary-attack'
  ) {
    throw new CombatError('INVALID_COMBAT_COMMAND', '未知玩家战斗命令')
  }
  return deepFreeze({ kind: input.kind })
}

export function createTemporaryDefenseSnapshot(
  input: TemporaryDefenseSnapshot,
): TemporaryDefenseSnapshot {
  if (
    !hasExactObjectKeys(input, [
      'activatedAtCtb',
      'availableDirectAttackUses',
      'expiresAtPlayerActionCtb',
    ]) ||
    !Number.isSafeInteger(input.activatedAtCtb) ||
    input.activatedAtCtb < 0 ||
    !Number.isSafeInteger(input.expiresAtPlayerActionCtb) ||
    input.expiresAtPlayerActionCtb <= input.activatedAtCtb ||
    input.availableDirectAttackUses !== 1
  ) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '临时防御状态无效')
  }
  return deepFreeze({
    activatedAtCtb: input.activatedAtCtb,
    expiresAtPlayerActionCtb: input.expiresAtPlayerActionCtb,
    availableDirectAttackUses: 1,
  })
}
