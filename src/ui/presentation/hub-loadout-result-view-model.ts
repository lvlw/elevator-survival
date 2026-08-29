import { calculateBackpackWeightSubtotal } from '../../core/inventory'
import { classifyLoad } from '../../core/load'
import { createRunLoadoutDependenciesFromReturn, type PlayerVisibleRunLoadoutEvaluation, type PlayerVisibleRunLoadoutLocation } from '../../core/run-loadout'
import { getStableRunPhaseIdentity, type StableRunPhase } from '../../state/run-save'
import type { StableRunUiPresentationDependencies } from './stable-run-view-model'

export interface HubLoadoutResultViewModel {
  readonly action: string
  readonly itemName: string
  readonly source: string
  readonly target: string
  readonly quantityMoved: number
  readonly sourceQuantityBefore: number
  readonly sourceQuantityAfter: number
  readonly targetQuantityBefore: number | null
  readonly targetQuantityAfter: number | null
  readonly displacedItemName: string | null
  readonly displacedPath: string | null
  readonly backpackWeightBefore: number
  readonly backpackWeightAfter: number
  readonly loadTierBefore: 'normal' | 'loaded' | 'overloaded' | 'cannot-carry'
  readonly loadTierAfter: 'normal' | 'loaded' | 'overloaded' | 'cannot-carry'
  readonly resourceCurrent: number | null
}

function locationName(location: PlayerVisibleRunLoadoutLocation): string {
  if (location.container === 'warehouse') return `仓库条目 ${location.ordinal}`
  if (location.container === 'backpack') return `背包格 ${location.column},${location.row}`
  if (location.container === 'quick-slot') return `快捷栏${location.slotNumber}`
  return location.slot === 'weapon' ? '武器位' : location.slot === 'armor' ? '防具位' : '实用装备位'
}

function itemAt(
  phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  location: PlayerVisibleRunLoadoutLocation,
) {
  const loadout = phase.payload.runLoadout
  if (location.container === 'warehouse') return loadout.warehouse.items[location.ordinal - 1] ?? null
  if (location.container === 'equipment') return loadout.equipment[location.slot]
  if (location.container === 'quick-slot') return loadout.quickSlots.slots[location.slotNumber - 1] ?? null
  const placement = loadout.backpack.placements.find(({ x, y }) => x === location.column - 1 && y === location.row - 1)
  return placement ? loadout.backpack.items.find(({ instanceId }) => instanceId === placement.instanceId) ?? null : null
}

export function createHubLoadoutResultViewModel(
  phase: StableRunPhase,
  action: string,
  evaluation: PlayerVisibleRunLoadoutEvaluation,
  dependencies: StableRunUiPresentationDependencies,
): HubLoadoutResultViewModel {
  if (phase.kind !== 'current-day-hub') throw new Error('中枢整备结果必须来自当前日电梯中枢')
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const formal = createRunLoadoutDependenciesFromReturn(rules.currentDayHub.returnDependencies)
  const actualWeight = calculateBackpackWeightSubtotal(phase.payload.runLoadout.backpack, formal.physicalCatalog)
  const actualTier = classifyLoad(actualWeight, formal.backpackRules).tier
  if (actualWeight !== evaluation.backpackWeightAfter || actualTier !== evaluation.loadTierAfter) {
    throw new Error('中枢整备结果与正式提交后的背包事实不一致')
  }
  const targetItem = itemAt(phase, evaluation.target)
  if (
    !targetItem ||
    targetItem.definitionId !== evaluation.definitionId ||
    (evaluation.targetQuantityAfter !== null && targetItem.quantity !== evaluation.targetQuantityAfter)
  ) throw new Error('中枢整备结果与正式提交后的目标容器事实不一致')
  if (evaluation.displacedDefinitionId && evaluation.displacedTarget) {
    const displaced = itemAt(phase, evaluation.displacedTarget)
    if (!displaced || displaced.definitionId !== evaluation.displacedDefinitionId) {
      throw new Error('中枢整备结果与正式提交后的被替换容器事实不一致')
    }
  }
  const definition = formal.physicalCatalog.get(evaluation.definitionId)
  return Object.freeze({
    action,
    itemName: dependencies.labels.itemName(evaluation.definitionId, definition.name),
    source: locationName(evaluation.source),
    target: locationName(evaluation.target),
    quantityMoved: evaluation.quantityMoved,
    sourceQuantityBefore: evaluation.sourceQuantityBefore,
    sourceQuantityAfter: evaluation.sourceQuantityAfter,
    targetQuantityBefore: evaluation.targetQuantityBefore,
    targetQuantityAfter: evaluation.targetQuantityAfter,
    displacedItemName: evaluation.displacedDefinitionId === null
      ? null
      : dependencies.labels.itemName(
          evaluation.displacedDefinitionId,
          formal.physicalCatalog.get(evaluation.displacedDefinitionId).name,
        ),
    displacedPath: evaluation.displacedSource && evaluation.displacedTarget
      ? `${locationName(evaluation.displacedSource)} → ${locationName(evaluation.displacedTarget)}`
      : null,
    backpackWeightBefore: evaluation.backpackWeightBefore,
    backpackWeightAfter: evaluation.backpackWeightAfter,
    loadTierBefore: evaluation.loadTierBefore,
    loadTierAfter: evaluation.loadTierAfter,
    resourceCurrent: evaluation.resource?.current ?? null,
  })
}
