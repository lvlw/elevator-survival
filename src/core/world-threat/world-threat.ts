import { deepFreeze } from '../config'

export interface WorldThreatStageDefinition {
  readonly id: string
  readonly minProgress: number
  readonly dailyBaseIncrease: number
  readonly dailyRecoveryModifier: DailyHealthRecoveryModifier
}

export type DailyHealthRecoveryModifier =
  | Readonly<{ kind: 'fixed-penalty'; amount: number }>
  | Readonly<{ kind: 'blocked' }>

export interface WorldThreatDefinition {
  readonly definitionId: string
  readonly progressPerPendingExposure: number
  readonly stages: readonly WorldThreatStageDefinition[]
  readonly terminal: Readonly<{ stageId: string; minProgress: number }>
  readonly suppressant: Readonly<{
    dailyReduction: number
    maxUsesPerDay: number
    hubSceneTime: number
  }>
}

export type WorldThreatCatalog = Readonly<Record<string, WorldThreatDefinition>>

export interface WorldThreatSnapshot {
  readonly definitionId: string
  readonly progress: number
}

export class WorldThreatError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'WorldThreatError'
  }
}

function plain(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!plain(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function nonNegative(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

export function createWorldThreatDefinition(input: unknown): WorldThreatDefinition {
  if (!exact(input, ['definitionId', 'progressPerPendingExposure', 'stages', 'suppressant', 'terminal']) ||
    !nonEmpty(input.definitionId) || !nonNegative(input.progressPerPendingExposure) ||
    !Array.isArray(input.stages) || input.stages.length === 0 ||
    !exact(input.terminal, ['minProgress', 'stageId']) ||
    !nonEmpty(input.terminal.stageId) || !nonNegative(input.terminal.minProgress) ||
    !exact(input.suppressant, ['dailyReduction', 'hubSceneTime', 'maxUsesPerDay']) ||
    !nonNegative(input.suppressant.dailyReduction) || !nonNegative(input.suppressant.hubSceneTime) ||
    !Number.isSafeInteger(input.suppressant.maxUsesPerDay) || (input.suppressant.maxUsesPerDay as number) < 1) {
    throw new WorldThreatError('世界威胁定义结构无效')
  }
  const stages: WorldThreatStageDefinition[] = []
  const ids = new Set<string>()
  for (const candidate of input.stages) {
    if (!exact(candidate, ['dailyBaseIncrease', 'dailyRecoveryModifier', 'id', 'minProgress']) ||
      !nonEmpty(candidate.id) || !nonNegative(candidate.minProgress) ||
      !nonNegative(candidate.dailyBaseIncrease) || ids.has(candidate.id) ||
      !plain(candidate.dailyRecoveryModifier) ||
      (candidate.dailyRecoveryModifier.kind !== 'blocked' &&
        candidate.dailyRecoveryModifier.kind !== 'fixed-penalty') ||
      (candidate.dailyRecoveryModifier.kind === 'blocked'
        ? !exact(candidate.dailyRecoveryModifier, ['kind'])
        : !exact(candidate.dailyRecoveryModifier, ['amount', 'kind']) ||
          !nonNegative(candidate.dailyRecoveryModifier.amount))) {
      throw new WorldThreatError('世界威胁阶段定义无效')
    }
    ids.add(candidate.id)
    stages.push({
      id: candidate.id,
      minProgress: candidate.minProgress,
      dailyBaseIncrease: candidate.dailyBaseIncrease,
      dailyRecoveryModifier: candidate.dailyRecoveryModifier.kind === 'blocked'
        ? { kind: 'blocked' as const }
        : { kind: 'fixed-penalty' as const, amount: candidate.dailyRecoveryModifier.amount as number },
    })
  }
  if (stages[0].minProgress !== 0 ||
    stages.some((stage, index) => index > 0 && stage.minProgress <= stages[index - 1].minProgress) ||
    ids.has(input.terminal.stageId) || input.terminal.minProgress <= stages[stages.length - 1].minProgress) {
    throw new WorldThreatError('世界威胁阶段边界无效')
  }
  return deepFreeze({
    definitionId: input.definitionId,
    progressPerPendingExposure: input.progressPerPendingExposure,
    stages,
    terminal: { stageId: input.terminal.stageId, minProgress: input.terminal.minProgress },
    suppressant: {
      dailyReduction: input.suppressant.dailyReduction,
      maxUsesPerDay: input.suppressant.maxUsesPerDay as number,
      hubSceneTime: input.suppressant.hubSceneTime,
    },
  })
}

export function createWorldThreatCatalog(definitions: readonly unknown[]): WorldThreatCatalog {
  if (!Array.isArray(definitions)) throw new WorldThreatError('世界威胁目录无效')
  const catalog: Record<string, WorldThreatDefinition> = {}
  for (const input of definitions) {
    const definition = createWorldThreatDefinition(input)
    if (catalog[definition.definitionId]) throw new WorldThreatError('世界威胁定义ID重复')
    catalog[definition.definitionId] = definition
  }
  return deepFreeze(catalog)
}

export function createWorldThreatSnapshot(
  input: unknown,
  catalog: WorldThreatCatalog,
): WorldThreatSnapshot {
  if (!exact(input, ['definitionId', 'progress']) ||
    !nonEmpty(input.definitionId) || !nonNegative(input.progress) || !catalog[input.definitionId]) {
    throw new WorldThreatError('世界威胁快照无效')
  }
  return deepFreeze({ definitionId: input.definitionId, progress: input.progress })
}

export function getWorldThreatStage(
  snapshotInput: WorldThreatSnapshot,
  catalog: WorldThreatCatalog,
): Readonly<{ id: string; terminal: boolean; dailyBaseIncrease: number }> {
  const snapshot = createWorldThreatSnapshot(snapshotInput, catalog)
  const definition = catalog[snapshot.definitionId]
  if (snapshot.progress >= definition.terminal.minProgress) {
    return deepFreeze({ id: definition.terminal.stageId, terminal: true, dailyBaseIncrease: 0 })
  }
  const stage = [...definition.stages].reverse().find(({ minProgress }) => snapshot.progress >= minProgress)!
  return deepFreeze({ id: stage.id, terminal: false, dailyBaseIncrease: stage.dailyBaseIncrease })
}

export function getWorldThreatDailyRecoveryModifier(
  snapshotInput: WorldThreatSnapshot,
  catalog: WorldThreatCatalog,
): DailyHealthRecoveryModifier {
  const snapshot = createWorldThreatSnapshot(snapshotInput, catalog)
  const definition = catalog[snapshot.definitionId]
  if (snapshot.progress >= definition.terminal.minProgress) {
    throw new WorldThreatError('终末世界威胁没有普通日恢复修正')
  }
  const stage = [...definition.stages].reverse().find(({ minProgress }) => snapshot.progress >= minProgress)!
  return deepFreeze(stage.dailyRecoveryModifier)
}
