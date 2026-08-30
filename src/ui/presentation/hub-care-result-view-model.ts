import type {
  PlayerVisibleHubItemSource,
} from '../../core/hub-inventory'
import type {
  PlayerVisibleHubMedicalTarget,
  PlayerVisibleRunHubMedicalResult,
} from '../../core/run-hub-medical'
import type { PlayerVisibleHubSurvivalResult } from '../../core/current-day-hub'
import type { StableRunPhase } from '../../state/run-save'

export interface HubMedicalResultViewModel extends PlayerVisibleRunHubMedicalResult {
  readonly action: string
}

export interface HubSurvivalResultViewModel extends PlayerVisibleHubSurvivalResult {
  readonly actionLabel: string
}

function sourceItem(
  phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  source: PlayerVisibleHubItemSource,
) {
  const loadout = phase.payload.runLoadout
  if (source.container === 'warehouse') {
    return loadout.warehouse.items[source.ordinal - 1] ?? null
  }
  if (source.container === 'quick-slot') {
    return loadout.quickSlots.slots[source.slotNumber - 1] ?? null
  }
  const placement = loadout.backpack.placements.find(
    ({ x, y }) => x === source.column - 1 && y === source.row - 1,
  )
  return placement
    ? loadout.backpack.items.find(
        ({ instanceId }) => instanceId === placement.instanceId,
      ) ?? null
    : null
}

function verifyConsumption(
  before: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  after: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  source: PlayerVisibleHubItemSource,
  quantityBefore: number,
  quantityAfter: number,
): void {
  const beforeItem = sourceItem(before, source)
  if (!beforeItem || beforeItem.quantity !== quantityBefore) {
    throw new Error('中枢结果与正式提交前的物品来源不一致')
  }
  const afterItems = [
    ...after.payload.runLoadout.warehouse.items,
    ...after.payload.runLoadout.backpack.items,
    ...after.payload.runLoadout.quickSlots.slots.filter(
      (candidate): candidate is NonNullable<typeof candidate> => candidate !== null,
    ),
  ]
  const afterItem = afterItems.find(
    ({ instanceId }) => instanceId === beforeItem.instanceId,
  )
  if (
    (quantityAfter === 0 && afterItem !== undefined) ||
    (quantityAfter > 0 && afterItem?.quantity !== quantityAfter)
  ) {
    throw new Error('中枢结果与正式物品消费后的数量不一致')
  }
  const beforeState = before.payload.runLoadout.itemStates.states.find(
    ({ instanceId }) => instanceId === beforeItem.instanceId,
  )
  const afterState = after.payload.runLoadout.itemStates.states.find(
    ({ instanceId }) => instanceId === beforeItem.instanceId,
  )
  if (!beforeState || (quantityAfter === 0 ? afterState !== undefined : JSON.stringify(afterState) !== JSON.stringify(beforeState))) {
    throw new Error('中枢结果与正式物品状态生命周期不一致')
  }
}

function targetWoundId(
  phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  target: PlayerVisibleHubMedicalTarget,
): string | null {
  if (!target || target.kind === 'minor-contusion') return null
  let ordinal = 0
  for (const wound of phase.payload.playerCondition.openWounds) {
    if (wound.kind !== target.woundKind) continue
    ordinal += 1
    if (ordinal === target.ordinal) return wound.id
  }
  throw new Error('中枢医疗结果引用了不存在的玩家可见伤口')
}

export function createHubMedicalResultViewModel(
  before: StableRunPhase,
  after: StableRunPhase,
  action: string,
  preview: PlayerVisibleRunHubMedicalResult,
): HubMedicalResultViewModel {
  if (before.kind !== 'current-day-hub' || after.kind !== 'current-day-hub') {
    throw new Error('中枢医疗结果必须来自当前日中枢事务')
  }
  verifyConsumption(
    before,
    after,
    preview.source,
    preview.sourceQuantityBefore,
    preview.sourceQuantityAfter,
  )
  const condition = after.payload.playerCondition
  if (
    condition.currentHealth !== preview.healthAfter ||
    condition.bleeding !== preview.bleedingAfter ||
    condition.minorContusions !== preview.minorContusionsAfter ||
    condition.painkillerActive !== preview.painkillerAfter ||
    condition.pendingInfectionExposures !== preview.infectionExposuresAfter ||
    after.payload.dailyState.medicalUsage.disinfectantUsesToday !== preview.disinfectantUsesAfter
  ) throw new Error('中枢医疗结果与正式提交后的玩家状态不一致')
  const woundId = targetWoundId(before, preview.target)
  if (preview.woundTreated && !condition.openWounds.some(
    (wound) => wound.id === woundId && wound.treatment === 'treated',
  )) throw new Error('中枢医疗结果缺少正式已处理伤口')
  if (preview.woundRemoved && condition.openWounds.some(({ id }) => id === woundId)) {
    throw new Error('中枢医疗结果未移除正式目标伤口')
  }
  return Object.freeze({ action, ...preview })
}

export function createHubSurvivalResultViewModel(
  before: StableRunPhase,
  after: StableRunPhase,
  actionLabel: string,
  preview: PlayerVisibleHubSurvivalResult,
): HubSurvivalResultViewModel {
  if (before.kind !== 'current-day-hub' || after.kind !== 'current-day-hub') {
    throw new Error('中枢生存结果必须来自当前日中枢事务')
  }
  verifyConsumption(
    before,
    after,
    preview.source,
    preview.sourceQuantityBefore,
    preview.sourceQuantityAfter,
  )
  if (
    after.payload.satiety.current !== preview.satietyAfter ||
    after.payload.dailyState.threatSuppression.usesToday !== preview.suppressionUsesAfter ||
    after.payload.dailyState.threatSuppression.suppressionAmountToday !== preview.suppressionAmountAfter ||
    after.payload.playerCondition.pendingInfectionExposures !== preview.infectionExposuresAfter ||
    after.payload.worldThreat.progress !== before.payload.worldThreat.progress
  ) throw new Error('中枢生存结果与正式提交后的日级状态不一致')
  return Object.freeze({ actionLabel, ...preview })
}
