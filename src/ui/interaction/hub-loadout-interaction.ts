import {
  createRunLoadoutCommand,
  createRunLoadoutDependenciesFromReturn,
  previewPlayerVisibleRunLoadoutCommand,
  type PlayerVisibleRunLoadoutEvaluation,
  type PlayerVisibleRunLoadoutLocation,
  type RunLoadoutCommand,
} from '../../core/run-loadout'
import { createStableRunApplicationCommand, type StableRunApplicationCommand } from '../../state/run-application'
import { getStableRunPhaseIdentity, type StableRunPhase } from '../../state/run-save'
import type { StableRunUiPresentationDependencies } from '../presentation'
import { getItemDimensions } from '../../core/inventory'

export type StableRunUiHubLoadoutOperation = RunLoadoutCommand['kind']

export interface StableRunUiHubLoadoutOpportunity {
  readonly id: string
  /** Internal command reference; ordinary player ViewModels and DOM never receive it. */
  readonly sourceInstanceId: string
  readonly definitionId: string
  readonly container: 'warehouse' | 'backpack' | 'equipment' | 'quick-slot'
  readonly equipmentSlot: 'weapon' | 'armor' | 'utility' | null
  readonly quickSlotIndex: number | null
  readonly name: string
  readonly sourceLabel: string
  readonly quantity: number
  readonly canRotate: boolean
  readonly operations: readonly StableRunUiHubLoadoutOperation[]
}

export interface StableRunUiHubLoadoutDraft {
  readonly opportunityId: string
  readonly operation: StableRunUiHubLoadoutOperation
  readonly quantity: number | null
  readonly targetOpportunityId: string | null
  readonly targetEquipmentSlot: 'weapon' | 'armor' | 'utility' | null
  readonly targetQuickSlotIndex: number | null
  readonly x: number | null
  readonly y: number | null
  readonly rotated: boolean
}

export interface StableRunUiHubLoadoutPreviewFact {
  readonly label: string
  readonly value: string
}

export interface StableRunUiHubLoadoutPreview {
  readonly canExecute: boolean
  readonly rejection: string | null
  readonly command: StableRunApplicationCommand | null
  readonly title: string | null
  readonly facts: readonly StableRunUiHubLoadoutPreviewFact[]
  readonly candidateCells: readonly Readonly<{ x: number; y: number }>[]
  readonly selectedFootprintCells: readonly Readonly<{ x: number; y: number }>[]
  readonly safeResult: PlayerVisibleRunLoadoutEvaluation | null
}

const SLOT_ORDER = ['weapon', 'armor', 'utility'] as const

function hubDependencies(phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>, dependencies: StableRunUiPresentationDependencies) {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  return createRunLoadoutDependenciesFromReturn(rules.currentDayHub.returnDependencies)
}

function operationName(kind: StableRunUiHubLoadoutOperation): string {
  const names: Record<StableRunUiHubLoadoutOperation, string> = {
    'warehouse-to-backpack': '仓库取出至背包',
    'backpack-to-warehouse': '背包存入仓库',
    'move-backpack-item': '移动／旋转背包物品',
    'split-backpack-stack': '拆分背包堆叠',
    'merge-backpack-stacks': '合并背包堆叠',
    'equip-from-backpack': '从背包装备',
    'unequip-to-backpack': '卸下装备至背包',
    'swap-backpack-equipped': '显式交换装备',
    'backpack-to-quick-slot': '背包放入快捷栏',
    'quick-slot-to-backpack': '快捷栏放回背包',
    'move-quick-slot-item': '移动快捷栏物品',
    'swap-quick-slot-items': '交换快捷栏物品',
  }
  return names[kind]
}

function slotName(slot: 'weapon' | 'armor' | 'utility'): string {
  return slot === 'weapon' ? '武器位' : slot === 'armor' ? '防具位' : '实用装备位'
}

function locationName(location: PlayerVisibleRunLoadoutLocation): string {
  return location.container === 'warehouse'
    ? `仓库条目 ${location.ordinal}`
    : location.container === 'backpack'
      ? `背包格 ${location.column},${location.row}`
      : location.container === 'equipment'
        ? slotName(location.slot)
        : `快捷栏${location.slotNumber}`
}

function loadTierName(tier: PlayerVisibleRunLoadoutEvaluation['loadTierBefore']): string {
  return tier === 'normal' ? '正常' : tier === 'loaded' ? '负载' : tier === 'overloaded' ? '超载' : '无法携带'
}

export function getStableRunUiHubLoadoutOpportunities(
  phase: StableRunPhase,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiHubLoadoutOpportunity[] {
  if (phase.kind !== 'current-day-hub') return Object.freeze([])
  const formal = hubDependencies(phase, dependencies)
  const loadout = phase.payload.runLoadout
  const placements = new Map(loadout.backpack.placements.map((placement) => [placement.instanceId, placement]))
  const make = (
    item: typeof loadout.backpack.items[number],
    input: Omit<StableRunUiHubLoadoutOpportunity, 'canRotate' | 'name' | 'quantity' | 'sourceInstanceId' | 'definitionId'>,
  ): StableRunUiHubLoadoutOpportunity => {
    const definition = formal.physicalCatalog.get(item.definitionId)
    return Object.freeze({
      ...input,
      sourceInstanceId: item.instanceId,
      definitionId: item.definitionId,
      name: dependencies.labels.itemName(item.definitionId, definition.name),
      quantity: item.quantity,
      canRotate: definition.canRotate,
    })
  }
  const warehouse = loadout.warehouse.items.map((item, index) => make(item, {
    id: `warehouse:${item.instanceId}`,
    container: 'warehouse', equipmentSlot: null, quickSlotIndex: null,
    sourceLabel: `仓库条目${index + 1} · ${dependencies.labels.itemName(item.definitionId, formal.physicalCatalog.get(item.definitionId).name)}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`,
    operations: Object.freeze(['warehouse-to-backpack'] as const),
  }))
  const backpack = [...loadout.backpack.items].sort((left, right) => {
    const a = placements.get(left.instanceId)!
    const b = placements.get(right.instanceId)!
    return a.y - b.y || a.x - b.x || left.instanceId.localeCompare(right.instanceId)
  }).map((item) => {
    const definition = formal.physicalCatalog.get(item.definitionId)
    const placement = placements.get(item.instanceId)!
    const equipment = formal.equipmentCatalog.get(item.definitionId)
    const quick = formal.quickSlotCatalog.get(item.definitionId)
    const operations: StableRunUiHubLoadoutOperation[] = [
      'backpack-to-warehouse', 'move-backpack-item',
    ]
    if (definition.stacking.kind === 'stackable') {
      if (item.quantity > 1) operations.push('split-backpack-stack')
      operations.push('merge-backpack-stacks')
    }
    if (equipment.kind === 'equippable') operations.push('equip-from-backpack', 'swap-backpack-equipped')
    if (quick.kind === 'eligible') operations.push('backpack-to-quick-slot')
    const name = dependencies.labels.itemName(item.definitionId, definition.name)
    return make(item, {
      id: `backpack:${item.instanceId}`,
      container: 'backpack', equipmentSlot: null, quickSlotIndex: null,
      sourceLabel: `${name}${item.quantity > 1 ? ` ×${item.quantity}` : ''} · 背包格 ${placement.x + 1},${placement.y + 1}`,
      operations: Object.freeze(operations),
    })
  })
  const equipment = SLOT_ORDER.flatMap((slot): StableRunUiHubLoadoutOpportunity[] => {
    const item = loadout.equipment[slot]
    if (!item) return []
    const name = dependencies.labels.itemName(item.definitionId, formal.physicalCatalog.get(item.definitionId).name)
    return [make(item, {
      id: `equipment:${slot}:${item.instanceId}`,
      container: 'equipment', equipmentSlot: slot, quickSlotIndex: null,
      sourceLabel: `${slotName(slot)} · ${name}`,
      operations: Object.freeze(['unequip-to-backpack'] as const),
    })]
  })
  const quickSlots = loadout.quickSlots.slots.flatMap((item, index): StableRunUiHubLoadoutOpportunity[] => {
    if (!item) return []
    const name = dependencies.labels.itemName(item.definitionId, formal.physicalCatalog.get(item.definitionId).name)
    return [make(item, {
      id: `quick-slot:${index}:${item.instanceId}`,
      container: 'quick-slot', equipmentSlot: null, quickSlotIndex: index,
      sourceLabel: `快捷栏${index + 1} · ${name}`,
      operations: Object.freeze(['quick-slot-to-backpack', 'move-quick-slot-item', 'swap-quick-slot-items'] as const),
    })]
  })
  return Object.freeze([...warehouse, ...backpack, ...equipment, ...quickSlots])
}

function draftCommand(
  source: StableRunUiHubLoadoutOpportunity,
  draft: StableRunUiHubLoadoutDraft,
  opportunities: readonly StableRunUiHubLoadoutOpportunity[],
): RunLoadoutCommand | null {
  const placement = (sourceId: string) => draft.x === null || draft.y === null ? null : ({ instanceId: sourceId, x: draft.x, y: draft.y, rotated: draft.rotated })
  switch (draft.operation) {
    case 'warehouse-to-backpack': {
      const target = placement(source.sourceInstanceId)
      return target ? createRunLoadoutCommand({ kind: draft.operation, instanceId: source.sourceInstanceId, placement: target }) : null
    }
    case 'backpack-to-warehouse':
      return createRunLoadoutCommand({ kind: draft.operation, instanceId: source.sourceInstanceId })
    case 'move-backpack-item': {
      const target = placement(source.sourceInstanceId)
      return target ? createRunLoadoutCommand({ kind: draft.operation, instanceId: source.sourceInstanceId, placement: target }) : null
    }
    case 'split-backpack-stack':
      return draft.quantity === null || draft.x === null || draft.y === null ? null : createRunLoadoutCommand({ kind: draft.operation, sourceInstanceId: source.sourceInstanceId, quantity: draft.quantity, placement: { x: draft.x, y: draft.y, rotated: draft.rotated } })
    case 'merge-backpack-stacks': {
      const target = opportunities.find(({ id }) => id === draft.targetOpportunityId)
      return draft.quantity === null || !target || target.container !== 'backpack' ? null : createRunLoadoutCommand({ kind: draft.operation, sourceInstanceId: source.sourceInstanceId, targetInstanceId: target.sourceInstanceId, quantity: draft.quantity })
    }
    case 'equip-from-backpack':
      return draft.targetEquipmentSlot === null ? null : createRunLoadoutCommand({ kind: draft.operation, instanceId: source.sourceInstanceId, targetSlot: draft.targetEquipmentSlot })
    case 'unequip-to-backpack': {
      const target = placement(source.sourceInstanceId)
      return source.equipmentSlot && target ? createRunLoadoutCommand({ kind: draft.operation, sourceSlot: source.equipmentSlot, placement: target }) : null
    }
    case 'swap-backpack-equipped': {
      const displaced = opportunities.find((candidate) => candidate.id === draft.targetOpportunityId)
      if (!displaced || displaced.container !== 'equipment' || !displaced.equipmentSlot || draft.x === null || draft.y === null) return null
      return createRunLoadoutCommand({ kind: draft.operation, backpackInstanceId: source.sourceInstanceId, targetSlot: displaced.equipmentSlot, displacedPlacement: { instanceId: displaced.sourceInstanceId, x: draft.x, y: draft.y, rotated: draft.rotated } })
    }
    case 'backpack-to-quick-slot':
      return draft.targetQuickSlotIndex === null ? null : createRunLoadoutCommand({ kind: draft.operation, instanceId: source.sourceInstanceId, targetSlotIndex: draft.targetQuickSlotIndex })
    case 'quick-slot-to-backpack': {
      const target = placement(source.sourceInstanceId)
      return source.quickSlotIndex !== null && target ? createRunLoadoutCommand({ kind: draft.operation, sourceSlotIndex: source.quickSlotIndex, placement: target }) : null
    }
    case 'move-quick-slot-item':
      return source.quickSlotIndex === null || draft.targetQuickSlotIndex === null ? null : createRunLoadoutCommand({ kind: draft.operation, sourceSlotIndex: source.quickSlotIndex, targetSlotIndex: draft.targetQuickSlotIndex })
    case 'swap-quick-slot-items':
      return source.quickSlotIndex === null || draft.targetQuickSlotIndex === null ? null : createRunLoadoutCommand({ kind: draft.operation, firstSlotIndex: source.quickSlotIndex, secondSlotIndex: draft.targetQuickSlotIndex })
  }
}

export function previewStableRunUiHubLoadoutDraft(
  phase: StableRunPhase,
  draft: StableRunUiHubLoadoutDraft,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiHubLoadoutPreview | null {
  if (phase.kind !== 'current-day-hub') return null
  const opportunities = getStableRunUiHubLoadoutOpportunities(phase, dependencies)
  const source = opportunities.find(({ id }) => id === draft.opportunityId)
  if (!source || !source.operations.includes(draft.operation)) return null
  let command: RunLoadoutCommand | null = null
  try { command = draftCommand(source, draft, opportunities) } catch { command = null }
  const formal = hubDependencies(phase, dependencies)
  const allCells = Array.from({ length: formal.backpackRules.width * formal.backpackRules.height }, (_, index) => Object.freeze({ x: index % formal.backpackRules.width, y: Math.floor(index / formal.backpackRules.width) }))
  const needsPlacement = ['warehouse-to-backpack', 'move-backpack-item', 'split-backpack-stack', 'unequip-to-backpack', 'quick-slot-to-backpack', 'swap-backpack-equipped'].includes(draft.operation)
  const candidateCells = Object.freeze(needsPlacement ? allCells.filter(({ x, y }) => {
    try {
      const candidate = draftCommand(source, { ...draft, x, y }, opportunities)
      return candidate !== null && previewPlayerVisibleRunLoadoutCommand(phase.payload.runLoadout, candidate, formal).canExecute
    } catch {
      return false
    }
  }) : [])
  const placedDefinitionId = draft.operation === 'swap-backpack-equipped'
    ? opportunities.find(({ id }) => id === draft.targetOpportunityId)?.definitionId ?? null
    : source.definitionId
  const selectedFootprintCells = Object.freeze(
    needsPlacement && draft.x !== null && draft.y !== null && placedDefinitionId !== null
      ? (() => {
          const dimensions = getItemDimensions(formal.physicalCatalog.get(placedDefinitionId), draft.rotated)
          return Array.from({ length: dimensions.width * dimensions.height }, (_, index) => Object.freeze({
            x: draft.x! + index % dimensions.width,
            y: draft.y! + Math.floor(index / dimensions.width),
          }))
        })()
      : [],
  )
  if (!command) return Object.freeze({ canExecute: false, rejection: '请完整选择数量、目标槽位或背包位置。', command: null, title: null, facts: Object.freeze([]), candidateCells, selectedFootprintCells, safeResult: null })
  const safe = previewPlayerVisibleRunLoadoutCommand(phase.payload.runLoadout, command, formal)
  if (!safe.canExecute) return Object.freeze({ canExecute: false, rejection: safe.rejectionCode === 'CANNOT_CARRY' ? '该操作会使背包进入无法携带状态。' : '当前来源、目标、资格、数量或摆放无法执行。', command: null, title: null, facts: Object.freeze([]), candidateCells, selectedFootprintCells, safeResult: null })
  const result = safe.result
  const item = formal.physicalCatalog.get(result.definitionId)
  const facts: StableRunUiHubLoadoutPreviewFact[] = [
    { label: '操作', value: operationName(result.operationKind) },
    { label: '物品', value: dependencies.labels.itemName(result.definitionId, item.name) },
    { label: '来源', value: locationName(result.source) },
    { label: '目标', value: locationName(result.target) },
    { label: '转移数量', value: String(result.quantityMoved) },
    { label: '来源数量', value: `${result.sourceQuantityBefore} → ${result.sourceQuantityAfter}` },
    { label: '背包负重', value: `${result.backpackWeightBefore} → ${result.backpackWeightAfter}` },
    { label: '负重状态', value: `${loadTierName(result.loadTierBefore)} → ${loadTierName(result.loadTierAfter)}` },
    { label: '场景时间', value: '0（电梯中枢整备）' },
  ]
  if (result.targetQuantityBefore !== null && result.targetQuantityAfter !== null) facts.splice(6, 0, { label: '目标数量', value: `${result.targetQuantityBefore} → ${result.targetQuantityAfter}` })
  if (result.rotated !== null) facts.push({ label: '旋转', value: result.rotated ? '是' : '否' })
  if (result.displacedDefinitionId) {
    facts.push({ label: '被替换／交换物品', value: dependencies.labels.itemName(result.displacedDefinitionId, formal.physicalCatalog.get(result.displacedDefinitionId).name) })
    if (result.displacedSource && result.displacedTarget) facts.push({ label: '被替换／交换路径', value: `${locationName(result.displacedSource)} → ${locationName(result.displacedTarget)}` })
  }
  if (result.resource) facts.push({
    label: '资源保持',
    value: `${dependencies.labels.itemResourceName(result.definitionId, result.resource.kind)} ${result.resource.current}`,
  })
  return Object.freeze({
    canExecute: true,
    rejection: null,
    command: createStableRunApplicationCommand({ kind: 'hub', command: { kind: 'hub-loadout', command } }),
    title: `确认${operationName(result.operationKind)}`,
    facts: Object.freeze(facts.map((fact) => Object.freeze(fact))),
    candidateCells,
    selectedFootprintCells,
    safeResult: result,
  })
}
