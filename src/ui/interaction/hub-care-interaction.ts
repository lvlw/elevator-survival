import {
  getAvailableHubSurvivalCommands,
  previewPlayerVisibleHubSurvivalCommand,
  type PlayerVisibleHubSurvivalResult,
} from '../../core/current-day-hub'
import { resolveHubItemSource } from '../../core/hub-inventory'
import {
  createRunHubMedicalSnapshot,
  getAvailableRunHubMedicalCommands,
  previewPlayerVisibleRunHubMedicalCommand,
  type PlayerVisibleHubMedicalTarget,
  type PlayerVisibleRunHubMedicalResult,
} from '../../core/run-hub-medical'
import { createRunLoadoutDependenciesFromReturn } from '../../core/run-loadout'
import {
  createStableRunApplicationCommand,
  type StableRunApplicationCommand,
} from '../../state/run-application'
import {
  getStableRunPhaseIdentity,
  type StableRunPhase,
} from '../../state/run-save'
import type { StableRunUiPresentationDependencies } from '../presentation'
import type {
  StableRunUiAction,
  StableRunUiActionPreviewFact,
  StableRunUiActionPreviewViewModel,
} from './stable-run-ui-actions'

export type StableRunUiHubCareSafeResult =
  | Readonly<{ kind: 'hub-medical'; result: PlayerVisibleRunHubMedicalResult }>
  | Readonly<{ kind: 'hub-survival'; result: PlayerVisibleHubSurvivalResult }>

function frozenFacts(
  facts: readonly StableRunUiActionPreviewFact[],
): readonly StableRunUiActionPreviewFact[] {
  return Object.freeze(facts.map((fact) => Object.freeze({ ...fact })))
}

function previewModel(
  title: string,
  facts: readonly StableRunUiActionPreviewFact[],
  warnings: readonly string[] = [],
): StableRunUiActionPreviewViewModel {
  return Object.freeze({
    title,
    facts: frozenFacts(facts),
    warnings: Object.freeze([...warnings]),
    branches: Object.freeze([]),
  })
}

function sourceName(source: PlayerVisibleRunHubMedicalResult['source']): string {
  return source.container === 'warehouse'
    ? `仓库条目 ${source.ordinal}`
    : source.container === 'backpack'
      ? `背包格 ${source.column},${source.row}`
      : `快捷栏${source.slotNumber}`
}

function medicalName(item: PlayerVisibleRunHubMedicalResult['medicalItem']): string {
  return item === 'bandage'
    ? '绷带'
    : item === 'painkiller'
      ? '止痛药'
      : item === 'disinfectant'
        ? '消毒剂'
        : '急救包'
}

function woundName(kind: 'laceration' | 'puncture' | 'bite'): string {
  return kind === 'laceration' ? '撕裂伤' : kind === 'puncture' ? '穿刺伤' : '咬伤'
}

function targetName(target: PlayerVisibleHubMedicalTarget): string | null {
  if (!target) return null
  return target.kind === 'minor-contusion'
    ? '轻度挫伤'
    : `${woundName(target.woundKind)} ${target.ordinal}`
}

function loadTierName(
  tier: PlayerVisibleRunHubMedicalResult['loadTierBefore'],
): string {
  return tier === 'normal'
    ? '正常'
    : tier === 'loaded'
      ? '负载'
      : tier === 'overloaded'
        ? '超载'
        : '无法携带'
}

function medicalPreview(result: PlayerVisibleRunHubMedicalResult): StableRunUiActionPreviewViewModel {
  const facts: StableRunUiActionPreviewFact[] = [
    { label: '物品', value: medicalName(result.medicalItem) },
    { label: '明确来源', value: sourceName(result.source) },
    { label: '来源数量', value: `${result.sourceQuantityBefore} → ${result.sourceQuantityAfter}` },
    { label: '中枢场景时间', value: '0' },
  ]
  const target = targetName(result.target)
  if (target) facts.push({ label: '明确目标', value: target })
  if (result.healthBefore !== result.healthAfter || result.medicalItem === 'bandage' || result.medicalItem === 'first-aid-kit') {
    facts.push(
      { label: '生命', value: `${result.healthBefore} → ${result.healthAfter}` },
      { label: '实际恢复', value: String(result.actualHealthRecovery) },
    )
  }
  if (result.bleedingBefore !== result.bleedingAfter || result.medicalItem === 'bandage' || result.medicalItem === 'first-aid-kit') {
    facts.push({ label: '流血', value: `${result.bleedingBefore ? '是' : '否'} → ${result.bleedingAfter ? '是' : '否'}` })
  }
  if (result.woundTreated) facts.push({ label: '伤口处理', value: `${targetName(result.woundTreated)}已处理` })
  if (result.woundRemoved) facts.push({ label: '伤口移除', value: `${targetName(result.woundRemoved)}已移除` })
  if (result.minorContusionsBefore !== result.minorContusionsAfter) {
    facts.push({ label: '轻度挫伤', value: `${result.minorContusionsBefore} → ${result.minorContusionsAfter}` })
  }
  if (result.painkillerBefore !== result.painkillerAfter || result.medicalItem === 'painkiller') {
    facts.push({ label: '镇痛', value: `${result.painkillerBefore ? '生效' : '无'} → ${result.painkillerAfter ? '生效' : '无'}` })
  }
  if (result.infectionExposuresBefore !== result.infectionExposuresAfter || result.medicalItem === 'disinfectant') {
    facts.push(
      { label: '未结算感染暴露', value: `${result.infectionExposuresBefore} → ${result.infectionExposuresAfter}` },
      { label: '当日消毒剂使用', value: `${result.disinfectantUsesBefore} → ${result.disinfectantUsesAfter}` },
    )
  }
  if (result.backpackWeightBefore !== result.backpackWeightAfter) {
    facts.push(
      { label: '背包负重', value: `${result.backpackWeightBefore} → ${result.backpackWeightAfter}` },
      { label: '负重档位', value: `${loadTierName(result.loadTierBefore)} → ${loadTierName(result.loadTierAfter)}` },
    )
  }
  return previewModel(`确认使用${medicalName(result.medicalItem)}`, facts)
}

function survivalName(action: PlayerVisibleHubSurvivalResult['action']): string {
  return action === 'use-hub-ration' ? '压缩口粮' : '感染抑制剂'
}

function survivalPreview(result: PlayerVisibleHubSurvivalResult): StableRunUiActionPreviewViewModel {
  const facts: StableRunUiActionPreviewFact[] = [
    { label: '物品', value: survivalName(result.action) },
    { label: '明确来源', value: sourceName(result.source) },
    { label: '来源数量', value: `${result.sourceQuantityBefore} → ${result.sourceQuantityAfter}` },
    { label: '中枢场景时间', value: '0' },
  ]
  const warnings: string[] = []
  if (result.action === 'use-hub-ration') {
    facts.push(
      { label: '饱食', value: `${result.satietyBefore} → ${result.satietyAfter}` },
      { label: '实际恢复饱食', value: String(result.satietyRestored) },
    )
    warnings.push('口粮只恢复饱食，不恢复生命、不治疗伤势，也不处理感染。')
  } else {
    facts.push(
      { label: '当日抑制剂使用', value: `${result.suppressionUsesBefore} → ${result.suppressionUsesAfter}` },
      { label: '当日威胁抑制量', value: `${result.suppressionAmountBefore} → ${result.suppressionAmountAfter}` },
      { label: '未结算感染暴露', value: `${result.infectionExposuresBefore} → ${result.infectionExposuresAfter}` },
    )
    warnings.push('抑制剂只在每日结算时减少当日感染增加；不会立即降低已有感染进展，也不会清除暴露。')
  }
  return previewModel(`确认使用${survivalName(result.action)}`, facts, warnings)
}

function hubRules(
  phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  dependencies: StableRunUiPresentationDependencies,
) {
  return dependencies.rulesRegistry.get(
    getStableRunPhaseIdentity(phase).rulesVersion,
  ).currentDayHub
}

function medicalSnapshot(
  phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  dependencies: StableRunUiPresentationDependencies,
) {
  const rules = hubRules(phase, dependencies)
  const medicalDependencies = {
    runLoadout: createRunLoadoutDependenciesFromReturn(rules.returnDependencies),
    config: rules.returnDependencies.scene.config,
    medicalBindings: rules.medicalBindings,
  }
  return Object.freeze({
    dependencies: medicalDependencies,
    snapshot: createRunHubMedicalSnapshot({
      runLoadout: phase.payload.runLoadout,
      playerCondition: phase.payload.playerCondition,
      dailyMedicalUsage: phase.payload.dailyState.medicalUsage,
    }, medicalDependencies),
  })
}

function applicationHubCommand(
  kind: 'hub-medical' | 'hub-survival',
  command: unknown,
): StableRunApplicationCommand {
  return createStableRunApplicationCommand({
    kind: 'hub',
    command: { kind, command },
  })
}

function sourceKey(source: Readonly<{
  container: 'warehouse' | 'backpack' | 'quick-slot'
  itemInstanceId?: string
  quickSlotIndex?: number
}>): string {
  return source.container === 'quick-slot'
    ? `quick-slot:${source.quickSlotIndex}`
    : `${source.container}:${source.itemInstanceId}`
}

function medicalActionId(
  command: ReturnType<typeof getAvailableRunHubMedicalCommands>[number],
): string {
  const target = command.target?.kind === 'open-wound'
    ? `wound:${command.target.woundId}`
    : command.target?.kind ?? 'none'
  return `hub-medical:${sourceKey(command.source)}:${target}`
}

export function getStableRunUiHubCareActions(
  phase: StableRunPhase,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiAction[] {
  if (phase.kind !== 'current-day-hub') return Object.freeze([])
  const medical = medicalSnapshot(phase, dependencies)
  const medicalActions = getAvailableRunHubMedicalCommands(
    medical.snapshot,
    medical.dependencies,
  ).map((command): StableRunUiAction => {
    const safe = previewPlayerVisibleRunHubMedicalCommand(
      medical.snapshot,
      command,
      medical.dependencies,
    )
    if (!safe.canExecute) throw new Error('正式中枢医疗 selector 返回了不可预览命令')
    const result = safe.result
    const target = targetName(result.target)
    return Object.freeze({
      id: medicalActionId(command),
      kind: 'hub-medical',
      label: `使用${medicalName(result.medicalItem)} · ${sourceName(result.source)}${target ? ` · ${target}` : ''}`,
      command: applicationHubCommand('hub-medical', command),
      preview: medicalPreview(result),
    })
  })
  const rules = hubRules(phase, dependencies)
  const survivalActions = getAvailableHubSurvivalCommands(
    phase.payload,
    rules,
  ).map((command): StableRunUiAction => {
    const safe = previewPlayerVisibleHubSurvivalCommand(
      phase.payload,
      command,
      rules,
    )
    if (!safe.canExecute) throw new Error('正式中枢生存 selector 返回了不可预览命令')
    return Object.freeze({
      id: `hub-survival:${command.kind}:${sourceKey(command.source)}`,
      kind: 'hub-survival',
      label: `使用${survivalName(safe.result.action)} · ${sourceName(safe.result.source)}`,
      command: applicationHubCommand('hub-survival', command),
      preview: survivalPreview(safe.result),
    })
  })
  return Object.freeze([...medicalActions, ...survivalActions])
}

/** Rebuilds the safe formal preview for result verification at confirmation. */
export function previewStableRunUiHubCareCommand(
  phase: StableRunPhase,
  command: StableRunApplicationCommand,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiHubCareSafeResult | null {
  if (phase.kind !== 'current-day-hub' || command.kind !== 'hub') return null
  if (command.command.kind === 'hub-medical') {
    const medical = medicalSnapshot(phase, dependencies)
    const preview = previewPlayerVisibleRunHubMedicalCommand(
      medical.snapshot,
      command.command.command,
      medical.dependencies,
    )
    return preview.canExecute
      ? Object.freeze({ kind: 'hub-medical', result: preview.result })
      : null
  }
  if (command.command.kind === 'hub-survival') {
    const preview = previewPlayerVisibleHubSurvivalCommand(
      phase.payload,
      command.command.command,
      hubRules(phase, dependencies),
    )
    return preview.canExecute
      ? Object.freeze({ kind: 'hub-survival', result: preview.result })
      : null
  }
  return null
}
