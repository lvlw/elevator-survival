import { deepFreeze } from '../config'
import { createItemInstance } from '../inventory'
import { createSearchItemState } from '../scene-search'
import type { SearchItemInitialState } from '../scene-search'
import type {
  FireDoorTimeKey,
  SceneObstacleCatalog,
  SceneObstacleCatalogDependencies,
  SceneObstacleDefinition,
  SceneObstacleOptionDefinition,
} from './scene-obstacle-types'

export type SceneObstacleErrorCode =
  | 'INVALID_OBSTACLE'
  | 'DUPLICATE_OBSTACLE'
  | 'INVALID_OBSTACLE_OPTION'
  | 'UNKNOWN_OBSTACLE'

export class SceneObstacleError extends Error {
  readonly code: SceneObstacleErrorCode
  constructor(code: SceneObstacleErrorCode, message: string) {
    super(message)
    this.name = 'SceneObstacleError'
    this.code = code
  }
}

type UnknownRecord = Record<string, unknown>

const TIME_KEYS: readonly FireDoorTimeKey[] = [
  'accessCardTime',
  'crowbarTime',
  'toolkitTime',
  'fireAxeTime',
  'forceEntryTime',
]
const EQUIPMENT_SLOTS = ['weapon', 'armor', 'utility'] as const
const RESOURCE_SOURCES = [
  'fire-door-crowbar',
  'fire-door-toolkit',
  'fire-door-fire-axe',
] as const

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function invalidOption(message: string): never {
  throw new SceneObstacleError('INVALID_OBSTACLE_OPTION', message)
}

function assertTimeKey(value: unknown): asserts value is FireDoorTimeKey {
  if (!TIME_KEYS.includes(value as FireDoorTimeKey)) {
    invalidOption(`障碍行动时间键无效：${String(value)}`)
  }
}

function validateGrant(
  value: unknown,
  dependencies: SceneObstacleCatalogDependencies,
): Readonly<{
  definitionId: string
  quantity: number
  initialState: SearchItemInitialState
}> {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['definitionId', 'quantity', 'initialState']) ||
    !isNonEmptyString(value.definitionId) ||
    !dependencies.itemCatalog.has(value.definitionId) ||
    !Number.isSafeInteger(value.quantity) ||
    (value.quantity as number) <= 0
  ) {
    invalidOption('障碍产物定义、数量或字段无效')
  }
  const definition = dependencies.itemCatalog.get(value.definitionId)
  const quantity = value.quantity as number
  if (
    (definition.stacking.kind === 'none' && quantity !== 1) ||
    (definition.stacking.kind === 'stackable' &&
      quantity > definition.stacking.maxQuantity)
  ) {
    invalidOption('障碍产物数量不符合正式堆叠规则')
  }
  try {
    const identity = createItemInstance(
      { instanceId: 'catalog-validation', definitionId: value.definitionId, quantity },
      dependencies.itemCatalog,
    )
    createSearchItemState(
      identity,
      value.initialState as SearchItemInitialState,
      dependencies.itemResourceCatalog,
    )
  } catch {
    invalidOption('障碍产物初始资源状态无效')
  }
  return {
    definitionId: value.definitionId,
    quantity,
    initialState: { ...(value.initialState as SearchItemInitialState) },
  }
}

function validateOption(
  value: unknown,
  dependencies: SceneObstacleCatalogDependencies,
): SceneObstacleOptionDefinition {
  if (!isRecord(value) || !isNonEmptyString(value.id)) {
    invalidOption('障碍选项必须是带非空ID的对象')
  }
  if (value.kind === 'decline') {
    if (!hasOnlyKeys(value, ['id', 'kind'])) {
      invalidOption('放弃选项包含未知字段')
    }
    return { id: value.id, kind: value.kind }
  }
  if (value.kind === 'backpack-item') {
    if (
      !hasOnlyKeys(value, [
        'id',
        'kind',
        'timeKey',
        'requiredDefinitionId',
      ]) ||
      !isNonEmptyString(value.requiredDefinitionId) ||
      !dependencies.itemCatalog.has(value.requiredDefinitionId)
    ) {
      invalidOption('背包物品障碍选项字段或物品无效')
    }
    assertTimeKey(value.timeKey)
    return {
      id: value.id,
      kind: value.kind,
      timeKey: value.timeKey,
      requiredDefinitionId: value.requiredDefinitionId,
    }
  }
  if (value.kind === 'equipped-resource') {
    if (
      !hasOnlyKeys(value, [
        'id',
        'kind',
        'timeKey',
        'equipmentSlot',
        'requiredDefinitionId',
        'resourceKind',
        'resourceSource',
        'setsAlert',
        'spawnGrants',
      ]) ||
      !EQUIPMENT_SLOTS.includes(value.equipmentSlot as typeof EQUIPMENT_SLOTS[number]) ||
      !isNonEmptyString(value.requiredDefinitionId) ||
      !dependencies.itemCatalog.has(value.requiredDefinitionId) ||
      (value.resourceKind !== 'durability' &&
        value.resourceKind !== 'integrity' &&
        value.resourceKind !== 'charge') ||
      !RESOURCE_SOURCES.includes(value.resourceSource as typeof RESOURCE_SOURCES[number]) ||
      typeof value.setsAlert !== 'boolean' ||
      !Array.isArray(value.spawnGrants)
    ) {
      invalidOption('装备资源障碍选项字段无效')
    }
    assertTimeKey(value.timeKey)
    const equipmentSlot = value.equipmentSlot as typeof EQUIPMENT_SLOTS[number]
    const equipmentProfile = dependencies.equipmentCatalog.get(
      value.requiredDefinitionId,
    )
    if (
      equipmentProfile.kind !== 'equippable' ||
      !equipmentProfile.eligibleSlots.includes(equipmentSlot)
    ) {
      invalidOption('障碍物品不能装备到声明槽位')
    }
    const resourceProfile = dependencies.itemResourceCatalog.get(
      value.requiredDefinitionId,
    )
    if (resourceProfile.kind !== value.resourceKind) {
      invalidOption('障碍物品资源类型与正式档案不一致')
    }
    const grants = value.spawnGrants.map((grant) =>
      validateGrant(grant, dependencies),
    )
    const grantIds = grants.map(({ definitionId }) => definitionId)
    if (new Set(grantIds).size !== grantIds.length) {
      invalidOption('同一障碍选项不能重复产出同一物品定义')
    }
    return {
      id: value.id,
      kind: value.kind,
      timeKey: value.timeKey,
      equipmentSlot,
      requiredDefinitionId: value.requiredDefinitionId,
      resourceKind: value.resourceKind,
      resourceSource: value.resourceSource as typeof RESOURCE_SOURCES[number],
      setsAlert: value.setsAlert,
      spawnGrants: grants,
    }
  }
  if (value.kind === 'force-entry') {
    if (
      !hasOnlyKeys(value, [
        'id',
        'kind',
        'timeKey',
        'protectionDefinitionId',
        'protectionResourceKind',
      ]) ||
      !isNonEmptyString(value.protectionDefinitionId) ||
      !dependencies.itemCatalog.has(value.protectionDefinitionId) ||
      value.protectionResourceKind !== 'integrity'
    ) {
      invalidOption('强行撞门选项字段或防护资源无效')
    }
    assertTimeKey(value.timeKey)
    const profile = dependencies.equipmentCatalog.get(
      value.protectionDefinitionId,
    )
    if (
      profile.kind !== 'equippable' ||
      !profile.eligibleSlots.includes('armor')
    ) {
      invalidOption('撞门防护物品必须能够装备到防具槽')
    }
    if (
      dependencies.itemResourceCatalog.get(value.protectionDefinitionId).kind !==
      'integrity'
    ) {
      invalidOption('撞门防护物品必须使用完整度资源')
    }
    return {
      id: value.id,
      kind: value.kind,
      timeKey: value.timeKey,
      protectionDefinitionId: value.protectionDefinitionId,
      protectionResourceKind: value.protectionResourceKind,
    }
  }
  invalidOption(`未知障碍选项类型：${String(value.kind)}`)
}

export function createSceneObstacleCatalog(
  definitions: readonly SceneObstacleDefinition[],
  dependencies: SceneObstacleCatalogDependencies,
): SceneObstacleCatalog {
  if (!Array.isArray(definitions)) {
    throw new SceneObstacleError('INVALID_OBSTACLE', '场景障碍目录必须是数组')
  }
  const byId = new Map<string, SceneObstacleDefinition>()
  const edges = new Map(dependencies.graph.edges.map((edge) => [edge.id, edge]))
  for (const input of definitions as readonly unknown[]) {
    if (
      !isRecord(input) ||
      !hasOnlyKeys(input, [
        'id',
        'eventId',
        'edgeId',
        'endpointNodeIds',
        'options',
      ]) ||
      !isNonEmptyString(input.id) ||
      !isNonEmptyString(input.eventId) ||
      !isNonEmptyString(input.edgeId) ||
      !Array.isArray(input.endpointNodeIds) ||
      input.endpointNodeIds.length === 0 ||
      !Array.isArray(input.options) ||
      input.options.length === 0
    ) {
      throw new SceneObstacleError('INVALID_OBSTACLE', '场景障碍定义无效')
    }
    if (byId.has(input.id)) {
      throw new SceneObstacleError('DUPLICATE_OBSTACLE', `场景障碍重复：${input.id}`)
    }
    const edge = edges.get(input.edgeId)
    if (!edge) {
      throw new SceneObstacleError('INVALID_OBSTACLE', '场景障碍引用未知边')
    }
    if (
      input.endpointNodeIds.some(
        (endpoint) =>
          !isNonEmptyString(endpoint) ||
          (endpoint !== edge.from && endpoint !== edge.to),
      ) ||
      new Set(input.endpointNodeIds).size !== input.endpointNodeIds.length
    ) {
      throw new SceneObstacleError(
        'INVALID_OBSTACLE',
        '障碍端点必须是受控边的真实且不重复端点',
      )
    }
    const options = input.options.map((option) =>
      validateOption(option, dependencies),
    )
    const optionIds = options.map(({ id }) => id)
    if (new Set(optionIds).size !== optionIds.length) {
      invalidOption('障碍选项ID无效或重复')
    }
    byId.set(
      input.id,
      deepFreeze({
        id: input.id,
        eventId: input.eventId,
        edgeId: input.edgeId,
        endpointNodeIds: [...input.endpointNodeIds].sort() as string[],
        options,
      }),
    )
  }
  const obstacleIds = [...byId.keys()].sort()
  return deepFreeze({
    obstacleIds,
    has: (id: string) => byId.has(id),
    get: (id: string) => {
      const result = byId.get(id)
      if (!result) {
        throw new SceneObstacleError('UNKNOWN_OBSTACLE', `未知障碍：${id}`)
      }
      return result
    },
  })
}
