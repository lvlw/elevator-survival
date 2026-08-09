import { deepFreeze } from '../config'
import type { RunIntelLogSnapshot } from './run-intel-types'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

/** Strict restoration boundary for the run-owned intel log. */
export function createRunIntelLogSnapshot(input: RunIntelLogSnapshot): RunIntelLogSnapshot {
  if (!isPlainObject(input) || Object.keys(input).length !== 1 || !('intelIds' in input) || !Array.isArray(input.intelIds)) {
    throw new Error('Run intel log must contain only intelIds.')
  }
  const ids = input.intelIds
  if (ids.some((id) => typeof id !== 'string' || id.trim().length === 0) || new Set(ids).size !== ids.length) {
    throw new Error('Run intel IDs must be non-empty and unique.')
  }
  return deepFreeze({ intelIds: [...ids] })
}

export function createInitialRunIntelLogSnapshot(): RunIntelLogSnapshot {
  return createRunIntelLogSnapshot({ intelIds: [] })
}

/** Stable de-duplication preserves the first acquisition order. */
export function addRunIntel(
  snapshot: RunIntelLogSnapshot,
  intelId: string,
): RunIntelLogSnapshot {
  const current = createRunIntelLogSnapshot(snapshot)
  if (typeof intelId !== 'string' || intelId.trim().length === 0) {
    throw new Error('Run intel ID must be non-empty.')
  }
  if (current.intelIds.includes(intelId)) return current
  return createRunIntelLogSnapshot({ intelIds: [...current.intelIds, intelId] })
}
