import { deepFreeze } from '../config'
import { removeItemFromBackpack } from '../inventory'
import { getItemState, removeItemState } from '../item-state'
import { createCarriedItemContainersSnapshot, removeQuickSlotItem } from '../quick-slot'
import { createRunLoadoutSnapshot } from '../run-loadout/run-loadout-snapshot'
import type { RunLoadoutDependencies, RunLoadoutSnapshot } from '../run-loadout'

export type HubItemSource =
  | Readonly<{ container: 'warehouse'; itemInstanceId: string }>
  | Readonly<{ container: 'backpack'; itemInstanceId: string }>
  | Readonly<{ container: 'quick-slot'; quickSlotIndex: number }>

export interface ResolvedHubItemSource {
  readonly source: HubItemSource
  readonly sourceContainer: HubItemSource['container']
  readonly sourceSlotIndex: number | null
  readonly item: Readonly<{ instanceId: string; definitionId: string; quantity: number }>
}

export interface HubItemConsumption {
  readonly source: HubItemSource
  readonly sourceContainer: HubItemSource['container']
  readonly sourceSlotIndex: number | null
  readonly instanceId: string
  readonly definitionId: string
  readonly quantityBefore: number
  readonly quantityConsumed: 1
  readonly quantityAfter: number
}

export class HubInventoryError extends Error {
  public constructor(message: string) { super(message); this.name = 'HubInventoryError' }
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

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function createHubItemSource(input: unknown): HubItemSource {
  if (exact(input, ['container', 'itemInstanceId']) &&
    (input.container === 'warehouse' || input.container === 'backpack') && validId(input.itemInstanceId)) {
    return deepFreeze({ container: input.container, itemInstanceId: input.itemInstanceId })
  }
  if (exact(input, ['container', 'quickSlotIndex']) && input.container === 'quick-slot' &&
    Number.isSafeInteger(input.quickSlotIndex) && (input.quickSlotIndex as number) >= 0) {
    return deepFreeze({ container: 'quick-slot', quickSlotIndex: input.quickSlotIndex as number })
  }
  throw new HubInventoryError('中枢物品来源无效')
}

export function getAvailableHubItemSources(snapshot: RunLoadoutSnapshot): readonly HubItemSource[] {
  return deepFreeze([
    ...snapshot.warehouse.items.map(({ instanceId }) => ({ container: 'warehouse' as const, itemInstanceId: instanceId })),
    ...snapshot.backpack.items.map(({ instanceId }) => ({ container: 'backpack' as const, itemInstanceId: instanceId })),
    ...snapshot.quickSlots.slots.flatMap((item, quickSlotIndex) => item
      ? [{ container: 'quick-slot' as const, quickSlotIndex }]
      : []),
  ])
}

export function resolveHubItemSource(
  snapshot: RunLoadoutSnapshot,
  sourceInput: HubItemSource,
): ResolvedHubItemSource {
  const source = createHubItemSource(sourceInput)
  const item = source.container === 'warehouse'
    ? snapshot.warehouse.items.find(({ instanceId }) => instanceId === source.itemInstanceId)
    : source.container === 'backpack'
      ? snapshot.backpack.items.find(({ instanceId }) => instanceId === source.itemInstanceId)
      : snapshot.quickSlots.slots[source.quickSlotIndex]
  if (!item || item.quantity < 1) throw new HubInventoryError('指定物品不在中枢来源容器中')
  const state = getItemState(snapshot.itemStates, item.instanceId)
  if (state.definitionId !== item.definitionId || state.resource.kind !== 'none') {
    throw new HubInventoryError('指定中枢物品不是可按单位消费的物品')
  }
  return deepFreeze({
    source,
    sourceContainer: source.container,
    sourceSlotIndex: source.container === 'quick-slot' ? source.quickSlotIndex : null,
    item,
  })
}

function carriedDependencies(dependencies: RunLoadoutDependencies) {
  return {
    physicalCatalog: dependencies.physicalCatalog,
    equipmentCatalog: dependencies.equipmentCatalog,
    quickSlotCatalog: dependencies.quickSlotCatalog,
  }
}

export function consumeOneHubItem(
  snapshot: RunLoadoutSnapshot,
  resolved: ResolvedHubItemSource,
  dependencies: RunLoadoutDependencies,
): Readonly<{ snapshot: RunLoadoutSnapshot; consumption: HubItemConsumption }> {
  const item = resolved.item
  let next: RunLoadoutSnapshot
  if (resolved.sourceContainer === 'warehouse') {
    next = {
      ...snapshot,
      warehouse: { items: item.quantity === 1
        ? snapshot.warehouse.items.filter(({ instanceId }) => instanceId !== item.instanceId)
        : snapshot.warehouse.items.map((candidate) => candidate.instanceId === item.instanceId
          ? { ...candidate, quantity: candidate.quantity - 1 }
          : candidate) },
      itemStates: item.quantity === 1 ? removeItemState(snapshot.itemStates, item.instanceId) : snapshot.itemStates,
    }
  } else if (resolved.sourceContainer === 'backpack') {
    next = {
      ...snapshot,
      backpack: item.quantity === 1
        ? removeItemFromBackpack(snapshot.backpack, item.instanceId, dependencies.physicalCatalog).snapshot
        : { ...snapshot.backpack, items: snapshot.backpack.items.map((candidate) =>
          candidate.instanceId === item.instanceId ? { ...candidate, quantity: candidate.quantity - 1 } : candidate) },
      itemStates: item.quantity === 1 ? removeItemState(snapshot.itemStates, item.instanceId) : snapshot.itemStates,
    }
  } else {
    const removed = removeQuickSlotItem(
      createCarriedItemContainersSnapshot(
        snapshot.backpack,
        snapshot.equipment,
        snapshot.quickSlots,
        carriedDependencies(dependencies),
      ),
      resolved.sourceSlotIndex!,
      carriedDependencies(dependencies),
    )
    if (removed.removedItem.instanceId !== item.instanceId) throw new HubInventoryError('快捷栏物品实例已变化')
    next = {
      ...snapshot,
      backpack: removed.snapshot.backpack,
      equipment: removed.snapshot.equipment,
      quickSlots: removed.snapshot.quickSlots,
      itemStates: removeItemState(snapshot.itemStates, item.instanceId),
    }
  }
  return deepFreeze({
    snapshot: createRunLoadoutSnapshot(next, dependencies),
    consumption: {
      source: resolved.source,
      sourceContainer: resolved.sourceContainer,
      sourceSlotIndex: resolved.sourceSlotIndex,
      instanceId: item.instanceId,
      definitionId: item.definitionId,
      quantityBefore: item.quantity,
      quantityConsumed: 1,
      quantityAfter: item.quantity - 1,
    },
  })
}
