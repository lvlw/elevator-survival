import { deepFreeze } from '../config'
import type { ItemResourceKind } from '../item-state'

export type MaintenanceTier = 'basic' | 'professional'

export type MaintenanceFamily =
  | 'mechanical'
  | 'textile'
  | 'electronic-charge'
  | 'professional-composite'

export type MaintenanceOperation =
  | 'base-labor'
  | 'mechanical-material-repair'
  | 'textile-material-repair'
  | 'toolkit-repair'
  | 'flashlight-charge'

export interface MaintenanceProfile {
  readonly definitionId: string
  readonly resourceKind: Exclude<ItemResourceKind, 'none'>
  readonly maintenanceTier: MaintenanceTier
  readonly repairFamily: MaintenanceFamily
  readonly operations: readonly MaintenanceOperation[]
}

export interface MaintenanceProfileCatalog {
  readonly definitionIds: readonly string[]
  has(definitionId: string): boolean
  get(definitionId: string): Readonly<MaintenanceProfile>
}

export class MaintenanceProfileError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'MaintenanceProfileError'
  }
}

const RESOURCE_KINDS: readonly Exclude<ItemResourceKind, 'none'>[] = [
  'durability',
  'integrity',
  'charge',
]

const TIERS: readonly MaintenanceTier[] = ['basic', 'professional']

const FAMILIES: readonly MaintenanceFamily[] = [
  'mechanical',
  'textile',
  'electronic-charge',
  'professional-composite',
]

const OPERATIONS: readonly MaintenanceOperation[] = [
  'base-labor',
  'mechanical-material-repair',
  'textile-material-repair',
  'toolkit-repair',
  'flashlight-charge',
]

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

function createMaintenanceProfile(input: unknown): Readonly<MaintenanceProfile> {
  if (!exact(input, [
    'definitionId',
    'maintenanceTier',
    'operations',
    'repairFamily',
    'resourceKind',
  ]) || typeof input.definitionId !== 'string' || input.definitionId.trim().length === 0 ||
    !RESOURCE_KINDS.includes(input.resourceKind as Exclude<ItemResourceKind, 'none'>) ||
    !TIERS.includes(input.maintenanceTier as MaintenanceTier) ||
    !FAMILIES.includes(input.repairFamily as MaintenanceFamily) ||
    !Array.isArray(input.operations) || input.operations.length === 0 ||
    input.operations.some((operation) => !OPERATIONS.includes(operation as MaintenanceOperation)) ||
    new Set(input.operations).size !== input.operations.length) {
    throw new MaintenanceProfileError('维护目录条目无效')
  }
  return deepFreeze({
    definitionId: input.definitionId,
    resourceKind: input.resourceKind as Exclude<ItemResourceKind, 'none'>,
    maintenanceTier: input.maintenanceTier as MaintenanceTier,
    repairFamily: input.repairFamily as MaintenanceFamily,
    operations: [...input.operations] as readonly MaintenanceOperation[],
  })
}

export function createMaintenanceProfileCatalog(
  inputs: readonly MaintenanceProfile[],
): MaintenanceProfileCatalog {
  if (!Array.isArray(inputs)) {
    throw new MaintenanceProfileError('维护目录必须是数组')
  }
  const byId = new Map<string, Readonly<MaintenanceProfile>>()
  for (const input of inputs as readonly unknown[]) {
    const profile = createMaintenanceProfile(input)
    if (byId.has(profile.definitionId)) {
      throw new MaintenanceProfileError(`重复维护目录：${profile.definitionId}`)
    }
    byId.set(profile.definitionId, profile)
  }
  const definitionIds = [...byId.keys()].sort()
  return deepFreeze({
    definitionIds,
    has: (definitionId: string) => byId.has(definitionId),
    get: (definitionId: string) => {
      const profile = byId.get(definitionId)
      if (!profile) {
        throw new MaintenanceProfileError(`未知维护目录：${definitionId}`)
      }
      return profile
    },
  })
}

export function maintenanceProfileSupports(
  profile: Readonly<MaintenanceProfile>,
  operation: MaintenanceOperation,
): boolean {
  return profile.operations.includes(operation)
}
