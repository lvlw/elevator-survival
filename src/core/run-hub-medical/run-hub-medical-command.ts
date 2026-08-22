import { deepFreeze } from '../config'
import {
  getAvailableMedicalTargets,
  getMedicalItemKind,
  buildMedicalPrimaryPlan,
  MedicalContentError,
} from '../medical'
import {
  HubInventoryError,
  consumeOneHubItem,
  createHubItemSource,
  getAvailableHubItemSources,
  resolveHubItemSource,
} from '../hub-inventory'
import { RunHubMedicalError } from './run-hub-medical-errors'
import {
  createRunHubMedicalSnapshot,
  validateRunHubMedicalDependencies,
} from './run-hub-medical-snapshot'
import type {
  ResolvedRunHubMedicalSource,
  RunHubMedicalDependencies,
  RunHubMedicalEffect,
  RunHubMedicalItemSource,
  RunHubMedicalResolution,
  RunHubMedicalSnapshot,
  RunHubMedicalTransitionPlan,
  UseRunHubMedicalItemCommand,
} from './run-hub-medical-types'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function invalid(message: string): never {
  throw new RunHubMedicalError('INVALID_INPUT', message)
}

function unavailable(message: string): never {
  throw new RunHubMedicalError('ACTION_NOT_AVAILABLE', message)
}

function nonEmptyId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) invalid(`${label}必须是非空字符串`)
  return value
}

function normalizeSource(value: unknown): RunHubMedicalItemSource {
  try { return createHubItemSource(value) } catch { invalid('中枢医疗物品来源无效') }
}

function normalizeTarget(value: unknown) {
  if (exact(value, ['kind', 'woundId']) && value.kind === 'open-wound') {
    return deepFreeze({ kind: 'open-wound' as const, woundId: nonEmptyId(value.woundId, '开放伤口ID') })
  }
  if (exact(value, ['kind']) && value.kind === 'minor-contusion') {
    return deepFreeze({ kind: 'minor-contusion' as const })
  }
  invalid('中枢医疗目标无效')
}

export function createUseRunHubMedicalItemCommand(
  input: unknown,
): UseRunHubMedicalItemCommand {
  const hasTarget = Boolean(isPlainObject(input) && Object.prototype.hasOwnProperty.call(input, 'target'))
  if (!exact(input, hasTarget ? ['kind', 'source', 'target'] : ['kind', 'source']) || input.kind !== 'use-run-hub-medical-item') {
    invalid('中枢医疗命令结构无效')
  }
  const source = normalizeSource(input.source)
  return hasTarget
    ? deepFreeze({ kind: 'use-run-hub-medical-item', source, target: normalizeTarget(input.target) })
    : deepFreeze({ kind: 'use-run-hub-medical-item', source })
}

function resolveSource(
  snapshot: RunHubMedicalSnapshot,
  command: UseRunHubMedicalItemCommand,
  dependencies: RunHubMedicalDependencies,
): ResolvedRunHubMedicalSource {
  let resolved
  try { resolved = resolveHubItemSource(snapshot.runLoadout, command.source) }
  catch (error) {
    if (error instanceof HubInventoryError) unavailable(error.message)
    throw error
  }
  const { source, item } = resolved
  const medicalItem = getMedicalItemKind(item.definitionId, dependencies.medicalBindings)
  if (!medicalItem) {
    unavailable('指定物品不是可用的中枢医疗物品')
  }
  return deepFreeze({
    source,
    sourceContainer: source.container,
    sourceSlotIndex: resolved.sourceSlotIndex,
    item,
    medicalItem,
  })
}

function consumeOne(
  snapshot: RunHubMedicalSnapshot,
  source: ResolvedRunHubMedicalSource,
  dependencies: RunHubMedicalDependencies,
): RunHubMedicalSnapshot['runLoadout'] {
  try {
    return consumeOneHubItem(snapshot.runLoadout, source, dependencies.runLoadout).snapshot
  } catch (error) {
    if (error instanceof HubInventoryError) unavailable(error.message)
    throw error
  }
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function sourceSortKey(source: RunHubMedicalItemSource): string {
  return source.container === 'quick-slot'
    ? `quick-slot:${source.quickSlotIndex}`
    : `${source.container}:${source.itemInstanceId}`
}

function commandSortKey(command: UseRunHubMedicalItemCommand): string {
  const target = command.target?.kind === 'open-wound'
    ? `open-wound:${command.target.woundId}`
    : command.target?.kind ?? ''
  return `${sourceSortKey(command.source)}:${target}`
}

function candidateSources(
  snapshot: RunHubMedicalSnapshot,
  dependencies: RunHubMedicalDependencies,
): readonly ResolvedRunHubMedicalSource[] {
  const commands: UseRunHubMedicalItemCommand[] = getAvailableHubItemSources(snapshot.runLoadout)
    .map((source) => ({ kind: 'use-run-hub-medical-item', source }))
  const result: ResolvedRunHubMedicalSource[] = []
  for (const command of commands) {
    try {
      result.push(resolveSource(snapshot, command, dependencies))
    } catch (error) {
      if (!(error instanceof RunHubMedicalError) || error.code !== 'ACTION_NOT_AVAILABLE') throw error
    }
  }
  return result
}

export function getAvailableRunHubMedicalCommands(
  snapshotInput: RunHubMedicalSnapshot,
  dependencies: RunHubMedicalDependencies,
): readonly UseRunHubMedicalItemCommand[] {
  validateRunHubMedicalDependencies(dependencies)
  const snapshot = createRunHubMedicalSnapshot(snapshotInput, dependencies)
  if (snapshot.playerCondition.currentHealth === 0) return deepFreeze([])
  const result: UseRunHubMedicalItemCommand[] = []
  for (const source of candidateSources(snapshot, dependencies)) {
    for (const target of getAvailableMedicalTargets(
      snapshot.playerCondition,
      snapshot.dailyMedicalUsage,
      source.medicalItem,
      dependencies.config,
    )) {
      result.push(target
        ? { kind: 'use-run-hub-medical-item', source: source.source, target }
        : { kind: 'use-run-hub-medical-item', source: source.source })
    }
  }
  return deepFreeze(result.sort((left, right) => commandSortKey(left).localeCompare(commandSortKey(right))))
}

export function buildRunHubMedicalTransitionPlan(
  snapshotInput: RunHubMedicalSnapshot,
  commandInput: unknown,
  dependencies: RunHubMedicalDependencies,
): RunHubMedicalTransitionPlan {
  validateRunHubMedicalDependencies(dependencies)
  const snapshot = createRunHubMedicalSnapshot(snapshotInput, dependencies)
  const command = createUseRunHubMedicalItemCommand(commandInput)
  if (snapshot.playerCondition.currentHealth === 0) unavailable('生命为零时不能进行中枢医疗')
  const available = getAvailableRunHubMedicalCommands(snapshot, dependencies)
  if (!available.some((candidate) => sameValue(candidate, command))) {
    unavailable('中枢医疗物品、来源、目标或当前状态不符合正式规则')
  }
  const source = resolveSource(snapshot, command, dependencies)
  let primary
  try {
    primary = buildMedicalPrimaryPlan(
      snapshot.playerCondition,
      snapshot.dailyMedicalUsage,
      source.medicalItem,
      command.target,
      dependencies.config,
    )
  } catch (error) {
    if (error instanceof MedicalContentError) unavailable(error.message)
    throw error
  }
  const runLoadout = consumeOne(snapshot, source, dependencies)
  const finalSnapshot = createRunHubMedicalSnapshot({
    runLoadout,
    playerCondition: primary.condition,
    dailyMedicalUsage: primary.dailyMedicalUsage,
  }, dependencies)
  const hubSceneTime = source.medicalItem === 'bandage'
    ? dependencies.config.medical.bandage.hubSceneTime
    : source.medicalItem === 'painkiller'
      ? dependencies.config.medical.painkiller.hubSceneTime
      : source.medicalItem === 'disinfectant'
        ? dependencies.config.medical.disinfectant.hubSceneTime
        : dependencies.config.medical.firstAidKit.hubSceneTime
  if (hubSceneTime !== 0) {
    throw new RunHubMedicalError('INVALID_INPUT', '中枢医疗时间必须由正式配置确认为0')
  }
  const effects: RunHubMedicalEffect[] = [
    {
      kind: 'run-hub-medical-item-consumed',
      source: source.source,
      sourceContainer: source.sourceContainer,
      sourceSlotIndex: source.sourceSlotIndex,
      medicalItem: source.medicalItem,
      instanceId: source.item.instanceId,
      definitionId: source.item.definitionId,
      quantityBefore: source.item.quantity,
      quantityConsumed: 1,
      quantityAfter: source.item.quantity - 1,
    },
    ...primary.effects.map((effect) => ({ kind: 'run-hub-medical-primary-effect-applied' as const, effect })),
    { kind: 'run-hub-medical-zero-time-confirmed', medicalItem: source.medicalItem, hubSceneTime: 0 },
    { kind: 'run-hub-medical-state-committed', snapshot: finalSnapshot },
  ]
  return deepFreeze({
    command,
    metadata: {
      medicalItem: source.medicalItem,
      sourceContainer: source.sourceContainer,
      sourceInstanceId: source.item.instanceId,
      hubSceneTime: 0,
    },
    effects,
    snapshot: finalSnapshot,
  })
}

export function applyRunHubMedicalEffects(
  snapshot: RunHubMedicalSnapshot,
  command: unknown,
  effects: readonly RunHubMedicalEffect[],
  dependencies: RunHubMedicalDependencies,
): RunHubMedicalResolution {
  const expected = buildRunHubMedicalTransitionPlan(snapshot, command, dependencies)
  if (!sameValue(effects, expected.effects)) {
    throw new RunHubMedicalError('EFFECT_MISMATCH', '中枢医疗Effect与冻结正式计划不一致')
  }
  return deepFreeze({ effects: expected.effects, snapshot: expected.snapshot })
}

export function resolveRunHubMedicalCommand(
  snapshot: RunHubMedicalSnapshot,
  command: unknown,
  dependencies: RunHubMedicalDependencies,
): RunHubMedicalResolution {
  const plan = buildRunHubMedicalTransitionPlan(snapshot, command, dependencies)
  return applyRunHubMedicalEffects(snapshot, plan.command, plan.effects, dependencies)
}
