import { deepFreeze } from '../config'
import type { ItemCatalog } from '../inventory'
import { RunReturnError } from './run-return-errors'
import type {
  ItemReturnLifecycleCatalog,
  ItemReturnLifecycleKind,
  ItemReturnLifecycleProfile,
} from './run-return-types'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
}

export function createItemReturnLifecycleCatalog(
  inputs: readonly ItemReturnLifecycleProfile[],
  physicalCatalog: ItemCatalog,
): ItemReturnLifecycleCatalog {
  if (!Array.isArray(inputs)) {
    throw new RunReturnError('INVALID_INPUT', '物品返回生命周期目录必须是数组')
  }
  const byId = new Map<string, Readonly<ItemReturnLifecycleProfile>>()
  const allowedKinds: readonly ItemReturnLifecycleKind[] = [
    'ordinary',
    'permission',
    'quest',
  ]
  for (const input of inputs as readonly unknown[]) {
    if (
      !isPlainObject(input) ||
      !hasExactKeys(input, ['definitionId', 'kind']) ||
      typeof input.definitionId !== 'string' ||
      input.definitionId.trim().length === 0 ||
      !allowedKinds.includes(input.kind as ItemReturnLifecycleKind) ||
      !physicalCatalog.has(input.definitionId) ||
      byId.has(input.definitionId)
    ) {
      throw new RunReturnError('INVALID_INPUT', '物品返回生命周期定义无效')
    }
    byId.set(input.definitionId, deepFreeze({
      definitionId: input.definitionId,
      kind: input.kind as ItemReturnLifecycleKind,
    }))
  }
  const definitionIds = [...byId.keys()].sort()
  const expectedIds = [...physicalCatalog.definitionIds].sort()
  if (
    definitionIds.length !== expectedIds.length ||
    definitionIds.some((id, index) => id !== expectedIds[index])
  ) {
    throw new RunReturnError('INVALID_INPUT', '物品返回生命周期目录必须完整覆盖物品目录')
  }
  return deepFreeze({
    definitionIds,
    has: (definitionId: string) => byId.has(definitionId),
    get: (definitionId: string) => {
      const profile = byId.get(definitionId)
      if (!profile) {
        throw new RunReturnError('INVALID_INPUT', `未知物品返回生命周期：${definitionId}`)
      }
      return profile
    },
  })
}
