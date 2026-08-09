import { deepFreeze, type FrozenRuleConfig } from '../config'
import {
  activatePainkiller,
  getUntreatedOpenWounds,
  reducePendingInfectionExposure,
  removeOneMinorContusion,
  removeOpenWound,
  restoreHealth,
  setBleeding,
  treatOpenWound,
  type PlayerConditionSnapshot,
} from '../condition'
import type { DailyMedicalUsageSnapshot } from '../daily-state'
import type { ItemCatalog } from '../inventory'
import type { ItemResourceCatalog } from '../item-state'

export type MedicalItemKind =
  | 'bandage'
  | 'painkiller'
  | 'disinfectant'
  | 'first-aid-kit'

export interface MedicalContentBindings {
  readonly bandageDefinitionId: string
  readonly painkillerDefinitionId: string
  readonly disinfectantDefinitionId: string
  readonly firstAidKitDefinitionId: string
}

export type MedicalTarget =
  | Readonly<{ kind: 'open-wound'; woundId: string }>
  | Readonly<{ kind: 'minor-contusion' }>

export interface MedicalContentBindingDependencies {
  readonly physicalCatalog: ItemCatalog
  readonly itemResourceCatalog: ItemResourceCatalog
  readonly lifecycleCatalog?: Readonly<{
    get(definitionId: string): Readonly<{ kind: string }>
  }>
}

export type MedicalPrimaryEffect =
  | Readonly<{
      kind: 'health-restored'
      item: 'bandage' | 'first-aid-kit'
      healthBefore: number
      requestedRecovery: number
      actualRecovery: number
      healthAfter: number
      unusedRecovery: number
    }>
  | Readonly<{
      kind: 'bleeding-changed'
      item: 'bandage' | 'first-aid-kit'
      before: boolean
      after: boolean
    }>
  | Readonly<{
      kind: 'open-wound-treated'
      woundId: string
      woundKind: 'laceration' | 'puncture' | 'bite'
    }>
  | Readonly<{
      kind: 'open-wound-removed'
      woundId: string
      woundKind: 'laceration' | 'puncture' | 'bite'
    }>
  | Readonly<{
      kind: 'minor-contusion-removed'
      countBefore: number
      removed: 1
      countAfter: number
    }>
  | Readonly<{ kind: 'painkiller-changed'; before: false; after: true }>
  | Readonly<{
      kind: 'infection-exposure-reduced'
      exposuresBefore: number
      requestedReduction: number
      actualReduction: number
      exposuresAfter: number
      unusedReduction: number
    }>
  | Readonly<{
      kind: 'daily-medical-usage-changed'
      usage: 'disinfectant'
      usesBefore: number
      usesAfter: number
    }>

export interface MedicalPrimaryPlan {
  readonly item: MedicalItemKind
  readonly effects: readonly MedicalPrimaryEffect[]
  readonly condition: PlayerConditionSnapshot
  readonly dailyMedicalUsage: DailyMedicalUsageSnapshot
}

export class MedicalContentError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'MedicalContentError'
  }
}

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    return false
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

export function validateMedicalContentBindings(
  bindings: MedicalContentBindings,
  dependencies: MedicalContentBindingDependencies,
): void {
  const keys = [
    'bandageDefinitionId',
    'disinfectantDefinitionId',
    'firstAidKitDefinitionId',
    'painkillerDefinitionId',
  ] as const
  if (!exact(bindings, keys)) {
    throw new MedicalContentError('医疗内容绑定结构无效')
  }
  const ids = keys.map((key) => bindings[key])
  if (ids.some((id) => typeof id !== 'string' || id.trim().length === 0) || new Set(ids).size !== ids.length) {
    throw new MedicalContentError('医疗内容绑定无效或重复')
  }
  for (const definitionId of ids) {
    if (!dependencies.physicalCatalog.has(definitionId) || !dependencies.itemResourceCatalog.has(definitionId)) {
      throw new MedicalContentError(`医疗绑定物品不存在：${definitionId}`)
    }
    if (dependencies.itemResourceCatalog.get(definitionId).kind !== 'none') {
      throw new MedicalContentError(`医疗绑定物品必须使用单位资源：${definitionId}`)
    }
    if (dependencies.lifecycleCatalog?.get(definitionId).kind === 'quest') {
      throw new MedicalContentError(`任务物品不能绑定为医疗物品：${definitionId}`)
    }
  }
}

export function getMedicalItemKind(
  definitionId: string,
  bindings: MedicalContentBindings,
): MedicalItemKind | null {
  if (definitionId === bindings.bandageDefinitionId) return 'bandage'
  if (definitionId === bindings.painkillerDefinitionId) return 'painkiller'
  if (definitionId === bindings.disinfectantDefinitionId) return 'disinfectant'
  if (definitionId === bindings.firstAidKitDefinitionId) return 'first-aid-kit'
  return null
}

function targetEquals(left: MedicalTarget | undefined, right: MedicalTarget | undefined): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function getAvailableMedicalTargets(
  condition: PlayerConditionSnapshot,
  dailyMedicalUsage: DailyMedicalUsageSnapshot,
  item: MedicalItemKind,
  config: Pick<FrozenRuleConfig, 'combat' | 'medical'>,
): readonly (MedicalTarget | undefined)[] {
  const untreatedWounds = getUntreatedOpenWounds(condition)
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
  if (item === 'bandage') {
    const canUse =
      condition.currentHealth < config.combat.player.maxHealth ||
      condition.bleeding ||
      untreatedWounds.length > 0
    if (!canUse) return deepFreeze([])
    if (untreatedWounds.length === 0) return deepFreeze([undefined])
    return deepFreeze(untreatedWounds.map(({ id }) => ({ kind: 'open-wound' as const, woundId: id })))
  }
  if (item === 'painkiller') {
    return !condition.painkillerActive && (condition.minorContusions > 0 || untreatedWounds.length > 0)
      ? deepFreeze([undefined])
      : deepFreeze([])
  }
  if (item === 'disinfectant') {
    return condition.pendingInfectionExposures > 0 &&
      dailyMedicalUsage.disinfectantUsesToday < config.medical.disinfectant.maxUsesPerDay
      ? deepFreeze([undefined])
      : deepFreeze([])
  }
  const hasInjury = condition.minorContusions > 0 || condition.openWounds.length > 0
  const canUse = condition.currentHealth < config.combat.player.maxHealth || hasInjury
  if (!canUse) return deepFreeze([])
  const targets: Array<MedicalTarget | undefined> = []
  if (condition.minorContusions > 0) targets.push({ kind: 'minor-contusion' })
  for (const wound of condition.openWounds.slice().sort((left, right) => left.id.localeCompare(right.id))) {
    targets.push({ kind: 'open-wound', woundId: wound.id })
  }
  if (!hasInjury) targets.push(undefined)
  return deepFreeze(targets)
}

export function buildMedicalPrimaryPlan(
  conditionInput: PlayerConditionSnapshot,
  usageInput: DailyMedicalUsageSnapshot,
  item: MedicalItemKind,
  target: MedicalTarget | undefined,
  config: Pick<FrozenRuleConfig, 'combat' | 'medical'>,
): MedicalPrimaryPlan {
  const availableTargets = getAvailableMedicalTargets(conditionInput, usageInput, item, config)
  if (!availableTargets.some((candidate) => targetEquals(candidate, target))) {
    throw new MedicalContentError('医疗物品、目标或当前状态不符合正式规则')
  }
  const effects: MedicalPrimaryEffect[] = []
  let condition = conditionInput
  let dailyMedicalUsage = usageInput
  if (item === 'bandage') {
    const recovery = restoreHealth(condition, config.medical.bandage.healthRecovery, config.combat.player)
    effects.push({
      kind: 'health-restored',
      item,
      healthBefore: recovery.healthBefore,
      requestedRecovery: recovery.requestedRecovery,
      actualRecovery: recovery.actualRecovery,
      healthAfter: recovery.healthAfter,
      unusedRecovery: recovery.unusedRecovery,
    })
    condition = recovery.state
    if (condition.bleeding && config.medical.bandage.stopsBleeding) {
      effects.push({ kind: 'bleeding-changed', item, before: true, after: false })
      condition = setBleeding(condition, false)
    }
    if (target?.kind === 'open-wound') {
      const wound = condition.openWounds.find(({ id }) => id === target.woundId)
      if (!wound) throw new MedicalContentError('指定开放伤口不存在')
      effects.push({ kind: 'open-wound-treated', woundId: wound.id, woundKind: wound.kind })
      condition = treatOpenWound(condition, wound.id)
    }
  } else if (item === 'painkiller') {
    effects.push({ kind: 'painkiller-changed', before: false, after: true })
    condition = activatePainkiller(condition)
  } else if (item === 'disinfectant') {
    const reduction = reducePendingInfectionExposure(
      condition,
      config.medical.disinfectant.pendingExposureReduction,
    )
    effects.push({
      kind: 'infection-exposure-reduced',
      exposuresBefore: reduction.exposuresBefore,
      requestedReduction: reduction.requestedReduction,
      actualReduction: reduction.actualReduction,
      exposuresAfter: reduction.exposuresAfter,
      unusedReduction: reduction.unusedReduction,
    })
    condition = reduction.state
    effects.push({
      kind: 'daily-medical-usage-changed',
      usage: 'disinfectant',
      usesBefore: dailyMedicalUsage.disinfectantUsesToday,
      usesAfter: dailyMedicalUsage.disinfectantUsesToday + 1,
    })
    dailyMedicalUsage = deepFreeze({ disinfectantUsesToday: dailyMedicalUsage.disinfectantUsesToday + 1 })
  } else {
    const recovery = restoreHealth(condition, config.medical.firstAidKit.healthRecovery, config.combat.player)
    effects.push({
      kind: 'health-restored',
      item,
      healthBefore: recovery.healthBefore,
      requestedRecovery: recovery.requestedRecovery,
      actualRecovery: recovery.actualRecovery,
      healthAfter: recovery.healthAfter,
      unusedRecovery: recovery.unusedRecovery,
    })
    condition = recovery.state
    if (target?.kind === 'minor-contusion') {
      effects.push({
        kind: 'minor-contusion-removed',
        countBefore: condition.minorContusions,
        removed: 1,
        countAfter: condition.minorContusions - 1,
      })
      condition = removeOneMinorContusion(condition)
    } else if (target?.kind === 'open-wound') {
      const wound = condition.openWounds.find(({ id }) => id === target.woundId)
      if (!wound) throw new MedicalContentError('指定轻伤不存在')
      effects.push({ kind: 'open-wound-removed', woundId: wound.id, woundKind: wound.kind })
      condition = removeOpenWound(condition, wound.id)
      if (
        condition.bleeding &&
        config.medical.firstAidKit.stopsBleedingWhenRemovingLastOpenWound &&
        getUntreatedOpenWounds(condition).length === 0
      ) {
        effects.push({ kind: 'bleeding-changed', item, before: true, after: false })
        condition = setBleeding(condition, false)
      }
    }
  }
  return deepFreeze({ item, effects, condition, dailyMedicalUsage })
}
