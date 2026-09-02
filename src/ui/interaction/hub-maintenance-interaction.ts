import {
  createHubMaintenanceCommand,
  getAvailableHubMaintenanceActions,
  HubMaintenanceError,
  previewPlayerVisibleHubMaintenance,
  type HubMaintenanceActionCandidate,
  type HubMaintenanceCommand,
  type HubMaintenanceMaterialKind,
  type HubMaintenanceTarget,
  type PlayerVisibleHubMaintenanceResult,
  type PlayerVisibleHubMaintenanceTargetLocation,
} from '../../core/hub-maintenance'
import { getPlayerVisibleHubItemSource, type PlayerVisibleHubItemSource } from '../../core/hub-inventory'
import { createStableRunApplicationCommand, type StableRunApplicationCommand } from '../../state/run-application'
import { getStableRunPhaseIdentity, type StableRunPhase } from '../../state/run-save'
import type { StableRunUiPresentationDependencies } from '../presentation'

export type StableRunUiHubMaintenanceOperation = HubMaintenanceCommand['kind']

export interface StableRunUiHubMaintenanceTarget {
  readonly id: string
  /** Internal formal target; never enters ordinary player ViewModels or DOM. */
  readonly target: HubMaintenanceTarget
  readonly definitionId: string
  readonly name: string
  readonly location: PlayerVisibleHubMaintenanceTargetLocation
  readonly locationLabel: string
  readonly resourceKind: 'durability' | 'integrity' | 'charge'
  readonly current: number
  readonly maximum: number
  readonly missing: number
}

export interface StableRunUiHubMaintenanceSource {
  readonly id: string
  /** Internal formal source; never enters ordinary player ViewModels or DOM. */
  readonly source: HubMaintenanceActionCandidate['materialSources'][number]['source']
  readonly definitionId: string
  readonly material: HubMaintenanceMaterialKind
  readonly name: string
  readonly location: PlayerVisibleHubItemSource
  readonly locationLabel: string
  readonly quantity: number
}

export interface StableRunUiHubMaintenanceOpportunity {
  readonly id: StableRunUiHubMaintenanceOperation
  readonly operation: StableRunUiHubMaintenanceOperation
  readonly label: string
  readonly maintenanceLaborRemaining: number
  readonly generatedRepair: number | null
  readonly targets: readonly StableRunUiHubMaintenanceTarget[]
  readonly sources: readonly StableRunUiHubMaintenanceSource[]
}

export interface StableRunUiHubMaintenanceDraft {
  readonly operation: StableRunUiHubMaintenanceOperation
  readonly allocations: readonly Readonly<{ targetId: string; points: number }>[]
  readonly targetId: string | null
  readonly materialSourceId: string | null
  readonly secondaryMaterialSourceId: string | null
}

export interface StableRunUiHubMaintenancePreview {
  readonly canExecute: boolean
  readonly rejection: string | null
  readonly command: StableRunApplicationCommand | null
  readonly title: string
  readonly facts: readonly Readonly<{ label: string; value: string }>[]
  readonly warnings: readonly string[]
  readonly safeResult: PlayerVisibleHubMaintenanceResult | null
}

function rules(phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>, dependencies: StableRunUiPresentationDependencies) {
  return dependencies.rulesRegistry.get(getStableRunPhaseIdentity(phase).rulesVersion).hubMaintenance
}

function operationLabel(kind: StableRunUiHubMaintenanceOperation): string {
  return kind === 'allocate-base-maintenance-labor'
    ? '使用今日基础维修点'
    : kind === 'repair-with-metal-parts'
      ? '使用金属零件维修'
      : kind === 'repair-with-fabric'
        ? '使用织物维修'
        : kind === 'repair-toolkit'
          ? '维修工具箱'
          : '为手电筒充能'
}

function slotLabel(slot: 'weapon' | 'armor' | 'utility'): string {
  return slot === 'weapon' ? '武器位' : slot === 'armor' ? '防具位' : '实用装备位'
}

function targetLocation(
  phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  target: HubMaintenanceTarget,
): PlayerVisibleHubMaintenanceTargetLocation {
  if (target.container === 'warehouse') {
    const ordinal = phase.payload.runLoadout.warehouse.items.findIndex(({ instanceId }) => instanceId === target.itemInstanceId) + 1
    return Object.freeze({ container: target.container, ordinal })
  }
  if (target.container === 'backpack') {
    const placement = phase.payload.runLoadout.backpack.placements.find(({ instanceId }) => instanceId === target.itemInstanceId)!
    return Object.freeze({ container: target.container, column: placement.x + 1, row: placement.y + 1 })
  }
  return Object.freeze({ container: target.container, slot: target.equipmentSlot })
}

export function hubMaintenanceLocationLabel(location: PlayerVisibleHubMaintenanceTargetLocation | PlayerVisibleHubItemSource): string {
  return location.container === 'warehouse'
    ? `仓库条目 ${location.ordinal}`
    : location.container === 'backpack'
      ? `背包格 ${location.column},${location.row}`
      : location.container === 'equipment'
        ? slotLabel(location.slot)
        : `快捷栏${location.slotNumber}`
}

function targetId(target: HubMaintenanceTarget): string {
  return target.container === 'equipment'
    ? `equipment:${target.equipmentSlot}:${target.itemInstanceId}`
    : `${target.container}:${target.itemInstanceId}`
}

function sourceId(source: HubMaintenanceActionCandidate['materialSources'][number]['source']): string {
  return source.container === 'quick-slot'
    ? `quick-slot:${source.quickSlotIndex}`
    : `${source.container}:${source.itemInstanceId}`
}

export function getStableRunUiHubMaintenanceOpportunities(
  phase: StableRunPhase,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiHubMaintenanceOpportunity[] {
  if (phase.kind !== 'current-day-hub') return Object.freeze([])
  const formal = rules(phase, dependencies)
  return Object.freeze(getAvailableHubMaintenanceActions(phase.payload, formal).map((candidate) => Object.freeze({
    id: candidate.kind,
    operation: candidate.kind,
    label: operationLabel(candidate.kind),
    maintenanceLaborRemaining: candidate.maintenanceLaborRemaining,
    generatedRepair: candidate.generatedRepair,
    targets: Object.freeze(candidate.targets.map((target) => {
      const location = targetLocation(phase, target.target)
      const fallback = formal.currentDayHub.returnDependencies.scene.physicalCatalog.get(target.definitionId).name
      return Object.freeze({
        id: targetId(target.target),
        target: target.target,
        definitionId: target.definitionId,
        name: dependencies.labels.itemName(target.definitionId, fallback),
        location,
        locationLabel: hubMaintenanceLocationLabel(location),
        resourceKind: target.resourceKind,
        current: target.current,
        maximum: target.maximum,
        missing: target.missing,
      })
    })),
    sources: Object.freeze(candidate.materialSources.map((source) => {
      const location = getPlayerVisibleHubItemSource(phase.payload.runLoadout, source.source)
      const fallback = formal.currentDayHub.returnDependencies.scene.physicalCatalog.get(source.definitionId).name
      return Object.freeze({
        id: `${source.material}:${sourceId(source.source)}`,
        source: source.source,
        definitionId: source.definitionId,
        material: source.material,
        name: dependencies.labels.itemName(source.definitionId, fallback),
        location,
        locationLabel: hubMaintenanceLocationLabel(location),
        quantity: source.quantity,
      })
    })),
  })))
}

function buildCommand(
  opportunity: StableRunUiHubMaintenanceOpportunity,
  draft: StableRunUiHubMaintenanceDraft,
): HubMaintenanceCommand | null {
  const target = opportunity.targets.find(({ id }) => id === draft.targetId)
  const source = opportunity.sources.find(({ id }) => id === draft.materialSourceId)
  const secondary = opportunity.sources.find(({ id }) => id === draft.secondaryMaterialSourceId)
  const allocations: { target: HubMaintenanceTarget; points: number }[] = []
  for (const allocation of draft.allocations) {
    if (allocation.points === 0) continue
    const candidate = opportunity.targets.find(({ id }) => id === allocation.targetId)
    if (!candidate || !Number.isSafeInteger(allocation.points) || allocation.points < 1) {
      throw new HubMaintenanceError('INVALID_INPUT', '维护分配必须引用当前目标并使用正安全整数')
    }
    allocations.push({ target: candidate.target, points: allocation.points })
  }
  if (draft.operation === 'allocate-base-maintenance-labor') {
    return allocations.length > 0 ? createHubMaintenanceCommand({ kind: draft.operation, allocations }) : null
  }
  if (draft.operation === 'repair-with-metal-parts') {
    return source && source.material === 'metal-parts' && allocations.length > 0
      ? createHubMaintenanceCommand({ kind: draft.operation, source: source.source, allocations })
      : null
  }
  if (draft.operation === 'repair-with-fabric') {
    return source && source.material === 'fabric' && target
      ? createHubMaintenanceCommand({ kind: draft.operation, source: source.source, target: target.target })
      : null
  }
  if (draft.operation === 'repair-toolkit') {
    const metal = [source, secondary].find((candidate) => candidate?.material === 'metal-parts')
    const electronic = [source, secondary].find((candidate) => candidate?.material === 'electronic-components')
    return target && metal && electronic
      ? createHubMaintenanceCommand({ kind: draft.operation, target: target.target, metalPartsSource: metal.source, electronicComponentsSource: electronic.source })
      : null
  }
  return target && source && source.material === 'standard-battery'
    ? createHubMaintenanceCommand({ kind: draft.operation, target: target.target, batterySource: source.source })
    : null
}

function resourceLabel(kind: PlayerVisibleHubMaintenanceResult['targets'][number]['resourceKind']): string {
  return kind === 'durability' ? '耐久' : kind === 'integrity' ? '完整度' : '电量'
}

function materialLabel(kind: HubMaintenanceMaterialKind): string {
  return kind === 'metal-parts' ? '金属零件' : kind === 'fabric' ? '织物' : kind === 'electronic-components' ? '电子元件' : '标准电池'
}

export function hubMaintenanceResultFacts(
  result: PlayerVisibleHubMaintenanceResult,
  dependencies: StableRunUiPresentationDependencies,
  rulesVersion: string,
): readonly Readonly<{ label: string; value: string }>[] {
  const physical = dependencies.rulesRegistry.get(rulesVersion).currentDayHub.returnDependencies.scene.physicalCatalog
  const facts: { label: string; value: string }[] = [{ label: '操作', value: operationLabel(result.operation) }]
  if (result.labor) facts.push(
    { label: '今日剩余维修点', value: `${result.labor.before} → ${result.labor.after}` },
    { label: '本次使用工时', value: String(result.labor.used) },
  )
  for (const [index, target] of result.targets.entries()) {
    const name = dependencies.labels.itemName(target.definitionId, physical.get(target.definitionId).name)
    facts.push(
      { label: `目标 ${index + 1}`, value: `${name} · ${hubMaintenanceLocationLabel(target.location)}` },
      { label: `${resourceLabel(target.resourceKind)} ${index + 1}`, value: `${target.before} → ${target.after}` },
      { label: `请求／实际／未使用 ${index + 1}`, value: `${target.requested} / ${target.actual} / ${target.unused}` },
    )
  }
  for (const [index, material] of result.materials.entries()) {
    const name = dependencies.labels.itemName(material.definitionId, physical.get(material.definitionId).name)
    facts.push(
      { label: `材料 ${index + 1}`, value: `${materialLabel(material.material)} · ${name}` },
      { label: `材料来源 ${index + 1}`, value: hubMaintenanceLocationLabel(material.source) },
      { label: `材料数量 ${index + 1}`, value: `${material.quantityBefore} → ${material.quantityAfter}` },
    )
  }
  if (result.repair) facts.push(
    { label: '生成／实际维修量', value: `${result.repair.generated} / ${result.repair.actual}` },
    { label: '浪费维修量', value: String(result.repair.wasted) },
  )
  facts.push({ label: '中枢场景时间', value: String(result.hubSceneTime) })
  return Object.freeze(facts.map((fact) => Object.freeze(fact)))
}

export function previewStableRunUiHubMaintenanceDraft(
  phase: StableRunPhase,
  draft: StableRunUiHubMaintenanceDraft,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiHubMaintenancePreview | null {
  if (phase.kind !== 'current-day-hub') return null
  const opportunity = getStableRunUiHubMaintenanceOpportunities(phase, dependencies).find(({ operation }) => operation === draft.operation)
  if (!opportunity) return null
  let command: HubMaintenanceCommand | null = null
  try {
    command = buildCommand(opportunity, draft)
  } catch (error) {
    if (error instanceof HubMaintenanceError) command = null
    else throw error
  }
  const title = `确认${operationLabel(draft.operation)}`
  if (!command) return Object.freeze({ canExecute: false, rejection: '请明确选择目标、数量与材料来源。', command: null, title, facts: Object.freeze([]), warnings: Object.freeze([]), safeResult: null })
  const safe = previewPlayerVisibleHubMaintenance(phase.payload, command, rules(phase, dependencies))
  if (!safe.canExecute) return Object.freeze({ canExecute: false, rejection: safe.rejectionCode === 'ACTION_NOT_AVAILABLE' ? '当前目标、材料、工时或分配已经不可用。' : '维护命令无效。', command: null, title, facts: Object.freeze([]), warnings: Object.freeze([]), safeResult: null })
  const warnings = safe.result.repair?.wasted
    ? Object.freeze([`本次会浪费 ${safe.result.repair.wasted} 点维修量。`])
    : Object.freeze([])
  return Object.freeze({
    canExecute: true,
    rejection: null,
    command: createStableRunApplicationCommand({ kind: 'hub', command: { kind: 'hub-maintenance', command } }),
    title,
    facts: hubMaintenanceResultFacts(safe.result, dependencies, getStableRunPhaseIdentity(phase).rulesVersion),
    warnings,
    safeResult: safe.result,
  })
}
