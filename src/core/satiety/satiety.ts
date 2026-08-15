import { deepFreeze, type FrozenRuleConfig } from '../config'

export interface SatietySnapshot { readonly current: number }
export type SatietyConfig = Pick<FrozenRuleConfig, 'dailySettlement'>

export interface SatietyRestoreResult {
  readonly before: number
  readonly requested: number
  readonly restored: number
  readonly after: number
}

export interface SatietyConsumptionResult {
  readonly before: number
  readonly requested: number
  readonly consumed: number
  readonly after: number
}

export type SatietyRecoveryBand = FrozenRuleConfig['dailySettlement']['satietyRecoveryCaps'][number]

export class SatietyError extends Error {
  public constructor(message: string) { super(message); this.name = 'SatietyError' }
}

function exact(value: unknown): value is Record<'current', unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).length === 1 && Object.prototype.hasOwnProperty.call(value, 'current')
}

export function createSatietySnapshot(input: unknown, config: SatietyConfig): SatietySnapshot {
  if (!exact(input) || !Number.isSafeInteger(input.current) ||
    (input.current as number) < 0 || (input.current as number) > config.dailySettlement.maxSatiety) {
    throw new SatietyError('饱食状态无效')
  }
  return deepFreeze({ current: input.current as number })
}

export function createInitialSatietySnapshot(config: SatietyConfig): SatietySnapshot {
  return createSatietySnapshot({ current: config.dailySettlement.newRunInitialSatiety }, config)
}

export function restoreSatiety(
  snapshotInput: SatietySnapshot,
  requested: number,
  config: SatietyConfig,
): Readonly<{ snapshot: SatietySnapshot; result: SatietyRestoreResult }> {
  const snapshot = createSatietySnapshot(snapshotInput, config)
  if (!Number.isSafeInteger(requested) || requested <= 0) throw new SatietyError('饱食恢复量无效')
  const after = Math.min(config.dailySettlement.maxSatiety, snapshot.current + requested)
  return deepFreeze({
    snapshot: createSatietySnapshot({ current: after }, config),
    result: { before: snapshot.current, requested, restored: after - snapshot.current, after },
  })
}

export function consumeSatiety(
  snapshotInput: SatietySnapshot,
  requested: number,
  config: SatietyConfig,
): Readonly<{ snapshot: SatietySnapshot; result: SatietyConsumptionResult }> {
  const snapshot = createSatietySnapshot(snapshotInput, config)
  if (!Number.isSafeInteger(requested) || requested < 0) {
    throw new SatietyError('饱食消耗量无效')
  }
  const consumed = Math.min(snapshot.current, requested)
  const after = snapshot.current - consumed
  return deepFreeze({
    snapshot: createSatietySnapshot({ current: after }, config),
    result: { before: snapshot.current, requested, consumed, after },
  })
}

export function getSatietyRecoveryBand(
  snapshotInput: SatietySnapshot,
  config: SatietyConfig,
): SatietyRecoveryBand {
  const snapshot = createSatietySnapshot(snapshotInput, config)
  const band = config.dailySettlement.satietyRecoveryCaps.find(
    ({ min, max }) => snapshot.current >= min && snapshot.current <= max,
  )
  if (!band) throw new SatietyError('饱食恢复区间未覆盖当前饱食值')
  return deepFreeze(band)
}
