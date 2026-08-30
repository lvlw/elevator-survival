import { getItemState } from '../../core/item-state'
import type { PlayerVisibleHubItemSource } from '../../core/hub-inventory'
import type {
  PlayerVisibleHubMaintenanceResult,
  PlayerVisibleHubMaintenanceTargetLocation,
} from '../../core/hub-maintenance'
import { getStableRunPhaseIdentity, type StableRunPhase } from '../../state/run-save'
import { hubMaintenanceResultFacts } from '../interaction/hub-maintenance-interaction'
import type { StableRunUiPresentationDependencies } from './stable-run-view-model'

export interface HubMaintenanceResultViewModel {
  readonly title: string
  readonly facts: readonly Readonly<{ label: string; value: string }>[]
  readonly warnings: readonly string[]
}

function itemAtTarget(
  phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  location: PlayerVisibleHubMaintenanceTargetLocation,
) {
  const loadout = phase.payload.runLoadout
  if (location.container === 'warehouse') return loadout.warehouse.items[location.ordinal - 1] ?? null
  if (location.container === 'equipment') return loadout.equipment[location.slot]
  const placement = loadout.backpack.placements.find(({ x, y }) => x === location.column - 1 && y === location.row - 1)
  return placement ? loadout.backpack.items.find(({ instanceId }) => instanceId === placement.instanceId) ?? null : null
}

function itemAtSource(
  phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  source: PlayerVisibleHubItemSource,
) {
  if (source.container === 'quick-slot') return phase.payload.runLoadout.quickSlots.slots[source.slotNumber - 1] ?? null
  return itemAtTarget(phase, source)
}

function allItems(phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>) {
  const loadout = phase.payload.runLoadout
  return [
    ...loadout.warehouse.items,
    ...loadout.backpack.items,
    ...Object.values(loadout.equipment).filter((item): item is NonNullable<typeof item> => item !== null),
    ...loadout.quickSlots.slots.filter((item): item is NonNullable<typeof item> => item !== null),
  ]
}

export function createHubMaintenanceResultViewModel(
  before: StableRunPhase,
  after: StableRunPhase,
  preview: PlayerVisibleHubMaintenanceResult,
  dependencies: StableRunUiPresentationDependencies,
): HubMaintenanceResultViewModel {
  if (before.kind !== 'current-day-hub' || after.kind !== 'current-day-hub') {
    throw new Error('中枢维护结果必须来自当前日中枢事务')
  }
  if (preview.labor && after.payload.dailyState.maintenanceLaborRemaining !== preview.labor.after) {
    throw new Error('中枢维护结果与正式工时提交不一致')
  }
  for (const target of preview.targets) {
    const beforeItem = itemAtTarget(before, target.location)
    if (!beforeItem || beforeItem.definitionId !== target.definitionId) {
      throw new Error('中枢维护结果与正式提交前目标不一致')
    }
    const afterItem = itemAtTarget(after, target.location)
    if (!afterItem || afterItem.definitionId !== target.definitionId) {
      throw new Error('中枢维护改变了目标物品身份或容器生命周期')
    }
    if (afterItem.instanceId !== beforeItem.instanceId) {
      throw new Error('中枢维护结果未保持目标物品身份')
    }
    const state = getItemState(after.payload.runLoadout.itemStates, afterItem.instanceId)
    if (state.resource.kind !== target.resourceKind || state.resource.current !== target.after) {
      throw new Error('中枢维护结果与正式目标资源不一致')
    }
  }
  for (const material of preview.materials) {
    const beforeItem = itemAtSource(before, material.source)
    if (!beforeItem || beforeItem.definitionId !== material.definitionId || beforeItem.quantity !== material.quantityBefore) {
      throw new Error('中枢维护结果与正式材料来源不一致')
    }
    const afterItem = allItems(after).find(({ instanceId }) => instanceId === beforeItem.instanceId)
    if (
      (material.quantityAfter === 0 && afterItem !== undefined) ||
      (material.quantityAfter > 0 && afterItem?.quantity !== material.quantityAfter)
    ) throw new Error('中枢维护结果与正式材料消费不一致')
    const afterState = after.payload.runLoadout.itemStates.states.find(({ instanceId }) => instanceId === beforeItem.instanceId)
    if ((material.quantityAfter === 0 && afterState !== undefined) || (material.quantityAfter > 0 && !afterState)) {
      throw new Error('中枢维护结果与材料 ItemState 生命周期不一致')
    }
  }
  const rulesVersion = getStableRunPhaseIdentity(after).rulesVersion
  return Object.freeze({
    title: '中枢维护结果',
    facts: hubMaintenanceResultFacts(preview, dependencies, rulesVersion),
    warnings: Object.freeze(preview.repair?.wasted ? [`本次浪费了 ${preview.repair.wasted} 点维修量。`] : []),
  })
}
