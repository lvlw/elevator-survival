import { deepFreeze } from '../config'
import type { ItemResourceKind } from '../item-state'

export interface DeviceRechargeBinding {
  readonly supplyDefinitionId: string
  readonly targetDefinitionId: string
  readonly targetResourceKind: Exclude<ItemResourceKind, 'none'>
}

export interface DeviceRechargeCatalog {
  readonly bindings: readonly Readonly<DeviceRechargeBinding>[]
  get(
    supplyDefinitionId: string,
    targetDefinitionId: string,
  ): Readonly<DeviceRechargeBinding> | null
  getBindingsForSupply(supplyDefinitionId: string): readonly Readonly<DeviceRechargeBinding>[]
  getBindingsForTarget(targetDefinitionId: string): readonly Readonly<DeviceRechargeBinding>[]
}

export class DeviceRechargeCatalogError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeviceRechargeCatalogError'
  }
}

function invalid(message: string): never {
  throw new DeviceRechargeCatalogError(message)
}

function isResourceKind(value: unknown): value is Exclude<ItemResourceKind, 'none'> {
  return value === 'durability' || value === 'integrity' || value === 'charge'
}

function normalizeBinding(input: unknown): Readonly<DeviceRechargeBinding> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    invalid('设备充能绑定必须是对象')
  }
  const record = input as Record<string, unknown>
  const keys = Object.keys(record).sort()
  const expected = ['supplyDefinitionId', 'targetDefinitionId', 'targetResourceKind']
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    invalid('设备充能绑定字段不合法')
  }
  if (typeof record.supplyDefinitionId !== 'string' || record.supplyDefinitionId.length === 0 ||
    typeof record.targetDefinitionId !== 'string' || record.targetDefinitionId.length === 0 ||
    !isResourceKind(record.targetResourceKind)) {
    invalid('设备充能绑定内容不合法')
  }
  return deepFreeze({
    supplyDefinitionId: record.supplyDefinitionId,
    targetDefinitionId: record.targetDefinitionId,
    targetResourceKind: record.targetResourceKind,
  })
}

export function createDeviceRechargeCatalog(input: unknown): DeviceRechargeCatalog {
  if (!Array.isArray(input) || input.length === 0) {
    invalid('设备充能目录必须包含至少一条绑定')
  }
  const bindings = input.map(normalizeBinding).sort((left, right) => {
    const leftKey = `${left.supplyDefinitionId}\u0000${left.targetDefinitionId}`
    const rightKey = `${right.supplyDefinitionId}\u0000${right.targetDefinitionId}`
    return leftKey.localeCompare(rightKey)
  })
  const keys = new Set<string>()
  for (const binding of bindings) {
    const key = `${binding.supplyDefinitionId}\u0000${binding.targetDefinitionId}`
    if (keys.has(key)) invalid('设备充能目录不能包含重复的供给物与目标组合')
    keys.add(key)
  }
  return deepFreeze({
    bindings,
    get(supplyDefinitionId: string, targetDefinitionId: string) {
      return bindings.find((binding) =>
        binding.supplyDefinitionId === supplyDefinitionId &&
        binding.targetDefinitionId === targetDefinitionId,
      ) ?? null
    },
    getBindingsForSupply(supplyDefinitionId: string) {
      return deepFreeze(bindings.filter((binding) => binding.supplyDefinitionId === supplyDefinitionId))
    },
    getBindingsForTarget(targetDefinitionId: string) {
      return deepFreeze(bindings.filter((binding) => binding.targetDefinitionId === targetDefinitionId))
    },
  })
}
