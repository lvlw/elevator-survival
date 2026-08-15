import { deepFreeze, type FrozenRuleConfig } from '../config'
import type { DeviceRechargeCatalog } from '../device-recharge'
import {
  createCurrentDayHubSnapshot,
  type CurrentDayHubDependencies,
  type CurrentDayHubSnapshot,
} from '../current-day-hub/current-day-hub'
import { createDailyRunStateSnapshot, type DailyRunStateSnapshot } from '../daily-state'
import type { EquipmentSlotKind } from '../equipment'
import {
  HubInventoryError,
  consumeOneHubItem,
  createHubItemSource,
  getAvailableHubItemSources,
  resolveHubItemSource,
  type HubItemSource,
} from '../hub-inventory'
import {
  getItemState,
  replaceItemState,
  restoreItemResource,
  type ItemResourceKind,
} from '../item-state'
import type { ItemInstance } from '../inventory'
import {
  createRunLoadoutDependenciesFromReturn,
  createRunLoadoutSnapshot,
  type RunLoadoutDependencies,
  type RunLoadoutSnapshot,
} from '../run-loadout'
import {
  maintenanceProfileSupports,
  type MaintenanceOperation,
  type MaintenanceProfile,
  type MaintenanceProfileCatalog,
} from './maintenance-profile-catalog'

export interface HubMaintenanceMaterialBindings {
  readonly metalPartsDefinitionId: string
  readonly fabricDefinitionId: string
  readonly electronicComponentsDefinitionId: string
}

export interface HubMaintenanceContentBindings {
  readonly profiles: MaintenanceProfileCatalog
  readonly materials: HubMaintenanceMaterialBindings
  readonly deviceRechargeCatalog: DeviceRechargeCatalog
}

export interface HubMaintenanceDependencies {
  readonly currentDayHub: CurrentDayHubDependencies
  readonly contentBindings: HubMaintenanceContentBindings
}

export type HubMaintenanceTarget =
  | Readonly<{ container: 'warehouse'; itemInstanceId: string }>
  | Readonly<{ container: 'backpack'; itemInstanceId: string }>
  | Readonly<{
      container: 'equipment'
      equipmentSlot: EquipmentSlotKind
      itemInstanceId: string
    }>

export interface HubMaintenanceAllocation {
  readonly target: HubMaintenanceTarget
  readonly points: number
}

export type HubMaintenanceCommand =
  | Readonly<{
      kind: 'allocate-base-maintenance-labor'
      allocations: readonly HubMaintenanceAllocation[]
    }>
  | Readonly<{
      kind: 'repair-with-metal-parts'
      source: HubItemSource
      allocations: readonly HubMaintenanceAllocation[]
    }>
  | Readonly<{
      kind: 'repair-with-fabric'
      source: HubItemSource
      target: HubMaintenanceTarget
    }>
  | Readonly<{
      kind: 'repair-toolkit'
      target: HubMaintenanceTarget
      metalPartsSource: HubItemSource
      electronicComponentsSource: HubItemSource
    }>
  | Readonly<{
      kind: 'charge-flashlight'
      target: HubMaintenanceTarget
      batterySource: HubItemSource
    }>

export type HubMaintenanceMaterialKind =
  | 'metal-parts'
  | 'fabric'
  | 'electronic-components'
  | 'standard-battery'

export type HubMaintenanceEffect =
  | Readonly<{
      kind: 'maintenance-material-consumed'
      material: HubMaintenanceMaterialKind
      source: HubItemSource
      sourceContainer: HubItemSource['container']
      sourceSlotIndex: number | null
      instanceId: string
      definitionId: string
      quantityBefore: number
      quantityConsumed: 1
      quantityAfter: number
    }>
  | Readonly<{
      kind: 'maintenance-labor-consumed'
      before: number
      used: number
      after: number
    }>
  | Readonly<{
      kind: 'item-resource-restored'
      target: HubMaintenanceTarget
      targetContainer: HubMaintenanceTarget['container']
      targetEquipmentSlot: EquipmentSlotKind | null
      instanceId: string
      definitionId: string
      resourceKind: Exclude<ItemResourceKind, 'none'>
      resourceBefore: number
      requestedRecovery: number
      actualRecovery: number
      resourceAfter: number
      unusedRecovery: number
    }>
  | Readonly<{
      kind: 'maintenance-repair-waste'
      repairFamily: 'mechanical' | 'textile'
      generatedRepair: number
      actualRepair: number
      wastedRepair: number
    }>
  | Readonly<{ kind: 'hub-maintenance-zero-time-confirmed'; hubSceneTime: 0 }>
  | Readonly<{ kind: 'current-day-hub-state-committed'; snapshot: CurrentDayHubSnapshot }>

export interface HubMaintenanceTransitionPlan {
  readonly command: HubMaintenanceCommand
  readonly effects: readonly HubMaintenanceEffect[]
  readonly snapshot: CurrentDayHubSnapshot
}

export interface HubMaintenanceTargetCandidate {
  readonly target: HubMaintenanceTarget
  readonly instanceId: string
  readonly definitionId: string
  readonly container: HubMaintenanceTarget['container']
  readonly equipmentSlot: EquipmentSlotKind | null
  readonly resourceKind: Exclude<ItemResourceKind, 'none'>
  readonly current: number
  readonly maximum: number
  readonly missing: number
  readonly maintenanceTier: MaintenanceProfile['maintenanceTier']
  readonly repairFamily: MaintenanceProfile['repairFamily']
}

export interface HubMaintenanceMaterialSourceCandidate {
  readonly material: HubMaintenanceMaterialKind
  readonly source: HubItemSource
  readonly instanceId: string
  readonly definitionId: string
  readonly quantity: number
}

export interface HubMaintenanceActionCandidate {
  readonly kind: HubMaintenanceCommand['kind']
  readonly maintenanceLaborRemaining: number
  readonly generatedRepair: number | null
  readonly targets: readonly HubMaintenanceTargetCandidate[]
  readonly materialSources: readonly HubMaintenanceMaterialSourceCandidate[]
}

export class HubMaintenanceError extends Error {
  public readonly code: 'INVALID_INPUT' | 'ACTION_NOT_AVAILABLE' | 'EFFECT_MISMATCH'

  public constructor(code: HubMaintenanceError['code'], message: string) {
    super(message)
    this.name = 'HubMaintenanceError'
    this.code = code
  }
}

interface ResolvedHubMaintenanceTarget {
  readonly target: HubMaintenanceTarget
  readonly container: HubMaintenanceTarget['container']
  readonly equipmentSlot: EquipmentSlotKind | null
  readonly item: Readonly<ItemInstance>
  readonly profile: Readonly<MaintenanceProfile>
  readonly resourceKind: Exclude<ItemResourceKind, 'none'>
  readonly current: number
  readonly maximum: number
  readonly missing: number
}

interface ResolvedHubMaintenanceMaterial {
  readonly material: HubMaintenanceMaterialKind
  readonly source: HubItemSource
  readonly sourceContainer: HubItemSource['container']
  readonly sourceSlotIndex: number | null
  readonly item: Readonly<ItemInstance>
}

interface HubMaintenanceOperationResult {
  readonly runLoadout: RunLoadoutSnapshot
  readonly dailyState: DailyRunStateSnapshot
  readonly effects: readonly Exclude<HubMaintenanceEffect, {
    kind: 'current-day-hub-state-committed'
  } | {
    kind: 'hub-maintenance-zero-time-confirmed'
  }>[]
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

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function invalid(message: string): never {
  throw new HubMaintenanceError('INVALID_INPUT', message)
}

function unavailable(message: string): never {
  throw new HubMaintenanceError('ACTION_NOT_AVAILABLE', message)
}

function nonEmptyId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) invalid(`${label}必须是非空字符串`)
  return value
}

function positiveSafeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    invalid(`${label}必须是正安全整数`)
  }
  return value as number
}

function configOf(dependencies: HubMaintenanceDependencies): FrozenRuleConfig {
  return dependencies.currentDayHub.returnDependencies.scene.config
}

function loadoutDependenciesOf(dependencies: HubMaintenanceDependencies): RunLoadoutDependencies {
  return createRunLoadoutDependenciesFromReturn(dependencies.currentDayHub.returnDependencies)
}

function sourceKey(source: HubItemSource): string {
  return source.container === 'quick-slot'
    ? `quick-slot:${source.quickSlotIndex}`
    : `${source.container}:${source.itemInstanceId}`
}

function targetKey(target: HubMaintenanceTarget): string {
  return target.container === 'equipment'
    ? `equipment:${target.equipmentSlot}:${target.itemInstanceId}`
    : `${target.container}:${target.itemInstanceId}`
}

function createSource(input: unknown): HubItemSource {
  try {
    return createHubItemSource(input)
  } catch {
    invalid('维护材料来源无效')
  }
}

export function createHubMaintenanceTarget(input: unknown): HubMaintenanceTarget {
  if (exact(input, ['container', 'itemInstanceId']) &&
    (input.container === 'warehouse' || input.container === 'backpack')) {
    return deepFreeze({
      container: input.container,
      itemInstanceId: nonEmptyId(input.itemInstanceId, '维护目标实例ID'),
    })
  }
  if (exact(input, ['container', 'equipmentSlot', 'itemInstanceId']) && input.container === 'equipment' &&
    (input.equipmentSlot === 'weapon' || input.equipmentSlot === 'armor' || input.equipmentSlot === 'utility')) {
    return deepFreeze({
      container: 'equipment',
      equipmentSlot: input.equipmentSlot,
      itemInstanceId: nonEmptyId(input.itemInstanceId, '维护目标实例ID'),
    })
  }
  invalid('维护目标无效')
}

function createAllocations(input: unknown): readonly HubMaintenanceAllocation[] {
  if (!Array.isArray(input) || input.length === 0) invalid('维护分配必须是非空数组')
  const allocations = input.map((candidate) => {
    if (!exact(candidate, ['points', 'target'])) invalid('维护分配结构无效')
    return deepFreeze({
      target: createHubMaintenanceTarget(candidate.target),
      points: positiveSafeInteger(candidate.points, '维护分配点数'),
    })
  })
  if (new Set(allocations.map(({ target }) => targetKey(target))).size !== allocations.length) {
    invalid('同一维护目标不能重复分配')
  }
  return deepFreeze(allocations)
}

export function createHubMaintenanceCommand(input: unknown): HubMaintenanceCommand {
  if (!plain(input) || typeof input.kind !== 'string') invalid('中枢维护命令结构无效')
  if (input.kind === 'allocate-base-maintenance-labor') {
    if (!exact(input, ['allocations', 'kind'])) invalid('基础维护工时命令结构无效')
    return deepFreeze({ kind: input.kind, allocations: createAllocations(input.allocations) })
  }
  if (input.kind === 'repair-with-metal-parts') {
    if (!exact(input, ['allocations', 'kind', 'source'])) invalid('金属维修命令结构无效')
    return deepFreeze({ kind: input.kind, source: createSource(input.source), allocations: createAllocations(input.allocations) })
  }
  if (input.kind === 'repair-with-fabric') {
    if (!exact(input, ['kind', 'source', 'target'])) invalid('织物维修命令结构无效')
    return deepFreeze({ kind: input.kind, source: createSource(input.source), target: createHubMaintenanceTarget(input.target) })
  }
  if (input.kind === 'repair-toolkit') {
    if (!exact(input, ['electronicComponentsSource', 'kind', 'metalPartsSource', 'target'])) {
      invalid('工具箱维修命令结构无效')
    }
    return deepFreeze({
      kind: input.kind,
      target: createHubMaintenanceTarget(input.target),
      metalPartsSource: createSource(input.metalPartsSource),
      electronicComponentsSource: createSource(input.electronicComponentsSource),
    })
  }
  if (input.kind === 'charge-flashlight') {
    if (!exact(input, ['batterySource', 'kind', 'target'])) invalid('手电筒充能命令结构无效')
    return deepFreeze({
      kind: input.kind,
      target: createHubMaintenanceTarget(input.target),
      batterySource: createSource(input.batterySource),
    })
  }
  invalid('未知中枢维护命令')
}

function validateProfileSemantics(profile: Readonly<MaintenanceProfile>, config: FrozenRuleConfig): void {
  for (const operation of profile.operations) {
    if (operation === 'base-labor' &&
      (profile.maintenanceTier !== 'basic' || profile.resourceKind === 'charge')) {
      invalid('基础维护工时目录资格无效')
    }
    if (operation === 'mechanical-material-repair' &&
      (profile.maintenanceTier !== 'basic' || profile.repairFamily !== 'mechanical' || profile.resourceKind !== 'durability')) {
      invalid('基础机械维修目录资格无效')
    }
    if (operation === 'textile-material-repair' &&
      (profile.maintenanceTier !== 'basic' || profile.repairFamily !== 'textile' || profile.resourceKind !== 'integrity')) {
      invalid('基础织物维修目录资格无效')
    }
    if (operation === 'toolkit-repair' &&
      (profile.maintenanceTier !== 'professional' || profile.repairFamily !== 'professional-composite' || profile.resourceKind !== 'durability')) {
      invalid('工具箱维修目录资格无效')
    }
    if (operation === 'flashlight-charge' &&
      (profile.maintenanceTier !== 'basic' || profile.repairFamily !== 'electronic-charge' || profile.resourceKind !== 'charge')) {
      invalid('照明充能目录资格无效')
    }
  }
  if (profile.operations.includes('flashlight-charge') &&
    config.maintenance.flashlightCharge.maxCharge <= 0) {
    invalid('手电筒充能配置无效')
  }
}

export function validateHubMaintenanceDependencies(
  dependencies: HubMaintenanceDependencies,
): void {
  if (!plain(dependencies) || !exact(dependencies, ['contentBindings', 'currentDayHub'])) {
    invalid('中枢维护依赖结构无效')
  }
  const bindings = dependencies.contentBindings
  if (!plain(bindings) || !exact(bindings, ['deviceRechargeCatalog', 'materials', 'profiles']) ||
    !plain(bindings.materials) || !exact(bindings.materials, [
      'electronicComponentsDefinitionId',
      'fabricDefinitionId',
      'metalPartsDefinitionId',
    ]) || !bindings.profiles || !Array.isArray(bindings.profiles.definitionIds) ||
    typeof bindings.profiles.get !== 'function' || typeof bindings.profiles.has !== 'function' ||
    !bindings.deviceRechargeCatalog || !Array.isArray(bindings.deviceRechargeCatalog.bindings) ||
    typeof bindings.deviceRechargeCatalog.get !== 'function' ||
    typeof bindings.deviceRechargeCatalog.getBindingsForTarget !== 'function') {
    invalid('中枢维护内容绑定无效')
  }
  const materialIds = [
    bindings.materials.metalPartsDefinitionId,
    bindings.materials.fabricDefinitionId,
    bindings.materials.electronicComponentsDefinitionId,
  ]
  if (materialIds.some((id) => typeof id !== 'string' || !id.trim()) ||
    new Set(materialIds).size !== materialIds.length) {
    invalid('中枢维护材料绑定无效')
  }
  const config = configOf(dependencies)
  if (config.maintenance.materialRepair.metalParts.units !== 1 ||
    config.maintenance.materialRepair.fabric.units !== 1 ||
    config.maintenance.toolkitRepair.metalParts !== 1 ||
    config.maintenance.toolkitRepair.electronicComponents !== 1 ||
    config.maintenance.flashlightCharge.batteryUnits !== 1) {
    invalid('当前中枢维护配置必须按正式规则消费一个材料单位')
  }
  const loadout = loadoutDependenciesOf(dependencies)
  for (const definitionId of materialIds) {
    if (!loadout.physicalCatalog.has(definitionId) ||
      loadout.itemResourceCatalog.get(definitionId).kind !== 'none' ||
      loadout.lifecycleCatalog.get(definitionId).kind !== 'ordinary') {
      invalid('中枢维护材料绑定不符合物品语义')
    }
  }
  for (const recharge of bindings.deviceRechargeCatalog.bindings) {
    if (!loadout.physicalCatalog.has(recharge.supplyDefinitionId) ||
      !loadout.physicalCatalog.has(recharge.targetDefinitionId) ||
      loadout.itemResourceCatalog.get(recharge.supplyDefinitionId).kind !== 'none' ||
      loadout.itemResourceCatalog.get(recharge.targetDefinitionId).kind !== recharge.targetResourceKind) {
      invalid('中枢设备充能目录与物品语义不一致')
    }
  }
  for (const definitionId of bindings.profiles.definitionIds) {
    const profile = bindings.profiles.get(definitionId)
    if (!loadout.physicalCatalog.has(profile.definitionId) ||
      loadout.lifecycleCatalog.get(profile.definitionId).kind !== 'ordinary' ||
      loadout.itemResourceCatalog.get(profile.definitionId).kind !== profile.resourceKind) {
      invalid('中枢维护目录与物品语义不一致')
    }
    validateProfileSemantics(profile, config)
    if (profile.operations.includes('flashlight-charge')) {
      const resource = loadout.itemResourceCatalog.get(profile.definitionId)
      if (resource.kind !== 'charge' || resource.maximum !== config.maintenance.flashlightCharge.maxCharge) {
        invalid('中枢照明充能目录与配置上限不一致')
      }
    }
  }
}

function resolveTargetItem(
  runLoadout: RunLoadoutSnapshot,
  targetInput: HubMaintenanceTarget,
): Readonly<{
  target: HubMaintenanceTarget
  container: HubMaintenanceTarget['container']
  equipmentSlot: EquipmentSlotKind | null
  item: Readonly<ItemInstance>
}> {
  const target = createHubMaintenanceTarget(targetInput)
  const item = target.container === 'warehouse'
    ? runLoadout.warehouse.items.find(({ instanceId }) => instanceId === target.itemInstanceId)
    : target.container === 'backpack'
      ? runLoadout.backpack.items.find(({ instanceId }) => instanceId === target.itemInstanceId)
      : runLoadout.equipment[target.equipmentSlot]
  if (!item || item.instanceId !== target.itemInstanceId) {
    unavailable('指定维护目标不在当前合法容器中')
  }
  return deepFreeze({
    target,
    container: target.container,
    equipmentSlot: target.container === 'equipment' ? target.equipmentSlot : null,
    item,
  })
}

function resolveEligibleTarget(
  runLoadout: RunLoadoutSnapshot,
  target: HubMaintenanceTarget,
  operation: MaintenanceOperation,
  dependencies: HubMaintenanceDependencies,
): ResolvedHubMaintenanceTarget {
  const resolved = resolveTargetItem(runLoadout, target)
  const profiles = dependencies.contentBindings.profiles
  if (!profiles.has(resolved.item.definitionId)) {
    unavailable('指定物品没有已确认的维护资格')
  }
  const profile = profiles.get(resolved.item.definitionId)
  if (!maintenanceProfileSupports(profile, operation)) {
    unavailable('指定物品不符合本维护操作资格')
  }
  const state = getItemState(runLoadout.itemStates, resolved.item.instanceId)
  const resource = loadoutDependenciesOf(dependencies).itemResourceCatalog.get(resolved.item.definitionId)
  if (resource.kind === 'none' || state.resource.kind === 'none' ||
    resource.kind !== state.resource.kind || profile.resourceKind !== resource.kind) {
    unavailable('指定维护目标资源类型不符合目录')
  }
  const missing = resource.maximum - state.resource.current
  if (missing <= 0) unavailable('指定维护目标已经处于满状态')
  return deepFreeze({
    ...resolved,
    profile,
    resourceKind: resource.kind,
    current: state.resource.current,
    maximum: resource.maximum,
    missing,
  })
}

function listTargetReferences(runLoadout: RunLoadoutSnapshot): readonly HubMaintenanceTarget[] {
  return deepFreeze([
    ...runLoadout.warehouse.items.map(({ instanceId }) => ({ container: 'warehouse' as const, itemInstanceId: instanceId })),
    ...runLoadout.backpack.items.map(({ instanceId }) => ({ container: 'backpack' as const, itemInstanceId: instanceId })),
    ...(['weapon', 'armor', 'utility'] as const).flatMap((equipmentSlot) => {
      const item = runLoadout.equipment[equipmentSlot]
      return item ? [{ container: 'equipment' as const, equipmentSlot, itemInstanceId: item.instanceId }] : []
    }),
  ].map((target) => createHubMaintenanceTarget(target)))
}

function listEligibleTargetCandidates(
  snapshot: CurrentDayHubSnapshot,
  operation: MaintenanceOperation,
  dependencies: HubMaintenanceDependencies,
): readonly HubMaintenanceTargetCandidate[] {
  const result: HubMaintenanceTargetCandidate[] = []
  for (const target of listTargetReferences(snapshot.runLoadout)) {
    try {
      const resolved = resolveEligibleTarget(snapshot.runLoadout, target, operation, dependencies)
      result.push({
        target: resolved.target,
        instanceId: resolved.item.instanceId,
        definitionId: resolved.item.definitionId,
        container: resolved.container,
        equipmentSlot: resolved.equipmentSlot,
        resourceKind: resolved.resourceKind,
        current: resolved.current,
        maximum: resolved.maximum,
        missing: resolved.missing,
        maintenanceTier: resolved.profile.maintenanceTier,
        repairFamily: resolved.profile.repairFamily,
      })
    } catch (error) {
      if (!(error instanceof HubMaintenanceError) || error.code !== 'ACTION_NOT_AVAILABLE') throw error
    }
  }
  return deepFreeze(result.sort((left, right) => targetKey(left.target).localeCompare(targetKey(right.target))))
}

function materialDefinitionId(
  material: Exclude<HubMaintenanceMaterialKind, 'standard-battery'>,
  bindings: HubMaintenanceMaterialBindings,
): string {
  switch (material) {
    case 'metal-parts': return bindings.metalPartsDefinitionId
    case 'fabric': return bindings.fabricDefinitionId
    case 'electronic-components': return bindings.electronicComponentsDefinitionId
  }
}

function listMaterialSources(
  runLoadout: RunLoadoutSnapshot,
  material: Exclude<HubMaintenanceMaterialKind, 'standard-battery'>,
  dependencies: HubMaintenanceDependencies,
): readonly HubMaintenanceMaterialSourceCandidate[] {
  const expectedDefinitionId = materialDefinitionId(material, dependencies.contentBindings.materials)
  const result: HubMaintenanceMaterialSourceCandidate[] = []
  for (const source of getAvailableHubItemSources(runLoadout)) {
    try {
      const resolved = resolveHubItemSource(runLoadout, source)
      if (resolved.item.definitionId === expectedDefinitionId) {
        result.push({
          material,
          source: resolved.source,
          instanceId: resolved.item.instanceId,
          definitionId: resolved.item.definitionId,
          quantity: resolved.item.quantity,
        })
      }
    } catch (error) {
      if (!(error instanceof HubInventoryError)) throw error
    }
  }
  return deepFreeze(result.sort((left, right) => sourceKey(left.source).localeCompare(sourceKey(right.source))))
}

function listRechargeSources(
  runLoadout: RunLoadoutSnapshot,
  targetDefinitionIds: readonly string[],
  dependencies: HubMaintenanceDependencies,
): readonly HubMaintenanceMaterialSourceCandidate[] {
  const supplies = new Set(
    targetDefinitionIds.flatMap((targetDefinitionId) =>
      dependencies.contentBindings.deviceRechargeCatalog
        .getBindingsForTarget(targetDefinitionId)
        .map(({ supplyDefinitionId }) => supplyDefinitionId),
    ),
  )
  const result: HubMaintenanceMaterialSourceCandidate[] = []
  for (const source of getAvailableHubItemSources(runLoadout)) {
    try {
      const resolved = resolveHubItemSource(runLoadout, source)
      if (supplies.has(resolved.item.definitionId)) {
        result.push({ material: 'standard-battery', source: resolved.source, instanceId: resolved.item.instanceId, definitionId: resolved.item.definitionId, quantity: resolved.item.quantity })
      }
    } catch (error) {
      if (!(error instanceof HubInventoryError)) throw error
    }
  }
  return deepFreeze(result.sort((left, right) => sourceKey(left.source).localeCompare(sourceKey(right.source))))
}

export function getAvailableHubMaintenanceActions(
  snapshotInput: CurrentDayHubSnapshot,
  dependencies: HubMaintenanceDependencies,
): readonly HubMaintenanceActionCandidate[] {
  const snapshot = createCurrentDayHubSnapshot(snapshotInput, dependencies.currentDayHub)
  validateHubMaintenanceDependencies(dependencies)
  const config = configOf(dependencies)
  const actions: HubMaintenanceActionCandidate[] = []
  const baseTargets = listEligibleTargetCandidates(snapshot, 'base-labor', dependencies)
  if (snapshot.dailyState.maintenanceLaborRemaining > 0 && baseTargets.length > 0) {
    actions.push({
      kind: 'allocate-base-maintenance-labor',
      maintenanceLaborRemaining: snapshot.dailyState.maintenanceLaborRemaining,
      generatedRepair: null,
      targets: baseTargets,
      materialSources: [],
    })
  }
  const mechanicalTargets = listEligibleTargetCandidates(snapshot, 'mechanical-material-repair', dependencies)
  const metalSources = listMaterialSources(snapshot.runLoadout, 'metal-parts', dependencies)
  if (mechanicalTargets.length > 0 && metalSources.length > 0) {
    actions.push({
      kind: 'repair-with-metal-parts',
      maintenanceLaborRemaining: snapshot.dailyState.maintenanceLaborRemaining,
      generatedRepair: config.maintenance.materialRepair.metalParts.mechanicalRepairPoints,
      targets: mechanicalTargets,
      materialSources: metalSources,
    })
  }
  const textileTargets = listEligibleTargetCandidates(snapshot, 'textile-material-repair', dependencies)
  const fabricSources = listMaterialSources(snapshot.runLoadout, 'fabric', dependencies)
  if (textileTargets.length > 0 && fabricSources.length > 0) {
    actions.push({
      kind: 'repair-with-fabric',
      maintenanceLaborRemaining: snapshot.dailyState.maintenanceLaborRemaining,
      generatedRepair: config.maintenance.materialRepair.fabric.textileRepairPoints,
      targets: textileTargets,
      materialSources: fabricSources,
    })
  }
  const toolkitTargets = listEligibleTargetCandidates(snapshot, 'toolkit-repair', dependencies)
  const toolkitSources = [
    ...listMaterialSources(snapshot.runLoadout, 'metal-parts', dependencies),
    ...listMaterialSources(snapshot.runLoadout, 'electronic-components', dependencies),
  ]
  if (toolkitTargets.length > 0 &&
    toolkitSources.some(({ material }) => material === 'metal-parts') &&
    toolkitSources.some(({ material }) => material === 'electronic-components')) {
    actions.push({
      kind: 'repair-toolkit',
      maintenanceLaborRemaining: snapshot.dailyState.maintenanceLaborRemaining,
      generatedRepair: config.maintenance.toolkitRepair.durabilityRecovery,
      targets: toolkitTargets,
      materialSources: toolkitSources,
    })
  }
  const flashlightTargets = listEligibleTargetCandidates(snapshot, 'flashlight-charge', dependencies)
  const batterySources = listRechargeSources(
    snapshot.runLoadout,
    flashlightTargets.map(({ definitionId }) => definitionId),
    dependencies,
  )
  if (flashlightTargets.length > 0 && batterySources.length > 0) {
    actions.push({
      kind: 'charge-flashlight',
      maintenanceLaborRemaining: snapshot.dailyState.maintenanceLaborRemaining,
      generatedRepair: config.maintenance.flashlightCharge.chargeRecovery,
      targets: flashlightTargets,
      materialSources: batterySources,
    })
  }
  return deepFreeze(actions)
}

function addSafe(left: number, right: number, label: string): number {
  const result = left + right
  if (!Number.isSafeInteger(result)) invalid(`${label}超出安全整数范围`)
  return result
}

function multiplySafe(left: number, right: number, label: string): number {
  const result = left * right
  if (!Number.isSafeInteger(result)) invalid(`${label}超出安全整数范围`)
  return result
}

function resolveMaterial(
  runLoadout: RunLoadoutSnapshot,
  sourceInput: HubItemSource,
  material: Exclude<HubMaintenanceMaterialKind, 'standard-battery'>,
  dependencies: HubMaintenanceDependencies,
): ResolvedHubMaintenanceMaterial {
  let resolved
  try {
    resolved = resolveHubItemSource(runLoadout, sourceInput)
  } catch (error) {
    if (error instanceof HubInventoryError) unavailable(error.message)
    throw error
  }
  const expectedDefinitionId = materialDefinitionId(material, dependencies.contentBindings.materials)
  if (resolved.item.definitionId !== expectedDefinitionId) {
    unavailable('指定来源不是本维护操作所需材料')
  }
  return deepFreeze({
    material,
    source: resolved.source,
    sourceContainer: resolved.sourceContainer,
    sourceSlotIndex: resolved.sourceSlotIndex,
    item: resolved.item,
  })
}

function resolveRechargeBattery(
  runLoadout: RunLoadoutSnapshot,
  sourceInput: HubItemSource,
  targetDefinitionId: string,
  dependencies: HubMaintenanceDependencies,
): ResolvedHubMaintenanceMaterial {
  let resolved
  try {
    resolved = resolveHubItemSource(runLoadout, sourceInput)
  } catch (error) {
    if (error instanceof HubInventoryError) unavailable(error.message)
    throw error
  }
  const binding = dependencies.contentBindings.deviceRechargeCatalog.get(
    resolved.item.definitionId,
    targetDefinitionId,
  )
  if (!binding || binding.targetResourceKind !== 'charge') {
    unavailable('指定来源不能为该设备充能')
  }
  return deepFreeze({ material: 'standard-battery', source: resolved.source, sourceContainer: resolved.sourceContainer, sourceSlotIndex: resolved.sourceSlotIndex, item: resolved.item })
}

function consumeMaterial(
  runLoadout: RunLoadoutSnapshot,
  source: ResolvedHubMaintenanceMaterial,
  dependencies: HubMaintenanceDependencies,
): Readonly<{
  snapshot: RunLoadoutSnapshot
  effect: Extract<HubMaintenanceEffect, { kind: 'maintenance-material-consumed' }>
}> {
  let consumed
  try {
    consumed = consumeOneHubItem(runLoadout, source, loadoutDependenciesOf(dependencies))
  } catch (error) {
    if (error instanceof HubInventoryError) unavailable(error.message)
    throw error
  }
  return deepFreeze({
    snapshot: consumed.snapshot,
    effect: {
      kind: 'maintenance-material-consumed',
      material: source.material,
      source: source.source,
      sourceContainer: source.sourceContainer,
      sourceSlotIndex: source.sourceSlotIndex,
      instanceId: source.item.instanceId,
      definitionId: source.item.definitionId,
      quantityBefore: source.item.quantity,
      quantityConsumed: 1,
      quantityAfter: source.item.quantity - 1,
    },
  })
}

function restoreTarget(
  runLoadout: RunLoadoutSnapshot,
  target: HubMaintenanceTarget,
  operation: MaintenanceOperation,
  requestedRecovery: number,
  dependencies: HubMaintenanceDependencies,
): Readonly<{
  snapshot: RunLoadoutSnapshot
  resolved: ResolvedHubMaintenanceTarget
  effect: Extract<HubMaintenanceEffect, { kind: 'item-resource-restored' }>
}> {
  const resolved = resolveEligibleTarget(runLoadout, target, operation, dependencies)
  let restored
  try {
    restored = restoreItemResource(
      getItemState(runLoadout.itemStates, resolved.item.instanceId),
      requestedRecovery,
      loadoutDependenciesOf(dependencies).itemResourceCatalog,
    )
  } catch (error) {
    unavailable(error instanceof Error ? error.message : '维护资源恢复失败')
  }
  if (restored.restored <= 0) unavailable('维护必须产生实际资源恢复')
  const itemStates = replaceItemState(runLoadout.itemStates, restored.state)
  const snapshot = createRunLoadoutSnapshot({ ...runLoadout, itemStates }, loadoutDependenciesOf(dependencies))
  return deepFreeze({
    snapshot,
    resolved,
    effect: {
      kind: 'item-resource-restored',
      target: resolved.target,
      targetContainer: resolved.container,
      targetEquipmentSlot: resolved.equipmentSlot,
      instanceId: resolved.item.instanceId,
      definitionId: resolved.item.definitionId,
      resourceKind: resolved.resourceKind,
      resourceBefore: restored.currentBefore,
      requestedRecovery: restored.requestedAmount,
      actualRecovery: restored.restored,
      resourceAfter: restored.currentAfter,
      unusedRecovery: restored.unused,
    },
  })
}

function assertDistinctTargets(
  resolved: readonly ResolvedHubMaintenanceTarget[],
): void {
  if (new Set(resolved.map(({ item }) => item.instanceId)).size !== resolved.length) {
    invalid('同一维护目标不能重复分配')
  }
}

function assertMaterialSeparateFromTargets(
  material: ResolvedHubMaintenanceMaterial,
  targets: readonly ResolvedHubMaintenanceTarget[],
): void {
  if (targets.some(({ item }) => item.instanceId === material.item.instanceId)) {
    invalid('维护材料来源不能与维护目标为同一物品实例')
  }
}

function buildBaseLaborResult(
  snapshot: CurrentDayHubSnapshot,
  command: Extract<HubMaintenanceCommand, { kind: 'allocate-base-maintenance-labor' }>,
  dependencies: HubMaintenanceDependencies,
): HubMaintenanceOperationResult {
  const config = configOf(dependencies)
  let laborUsed = 0
  const prepared = command.allocations.map((allocation) => {
    const requested = multiplySafe(
      allocation.points,
      config.maintenance.dailyBaseLabor.recoveryPerPoint,
      '基础维护恢复量',
    )
    laborUsed = addSafe(laborUsed, allocation.points, '基础维护工时')
    const target = resolveEligibleTarget(snapshot.runLoadout, allocation.target, 'base-labor', dependencies)
    if (target.missing < requested) unavailable('基础维护工时不能产生浪费')
    return { allocation, requested, target }
  })
  assertDistinctTargets(prepared.map(({ target }) => target))
  if (laborUsed > snapshot.dailyState.maintenanceLaborRemaining) {
    unavailable('剩余基础维护工时不足')
  }
  const dailyState = createDailyRunStateSnapshot({
    ...snapshot.dailyState,
    maintenanceLaborRemaining: snapshot.dailyState.maintenanceLaborRemaining - laborUsed,
  }, config)
  let runLoadout = snapshot.runLoadout
  const effects: HubMaintenanceOperationResult['effects'][number][] = [{
    kind: 'maintenance-labor-consumed',
    before: snapshot.dailyState.maintenanceLaborRemaining,
    used: laborUsed,
    after: dailyState.maintenanceLaborRemaining,
  }]
  for (const { allocation, requested } of prepared) {
    const restored = restoreTarget(runLoadout, allocation.target, 'base-labor', requested, dependencies)
    if (restored.effect.actualRecovery !== requested || restored.effect.unusedRecovery !== 0) {
      invalid('基础维护工时产生了未确认的浪费')
    }
    runLoadout = restored.snapshot
    effects.push(restored.effect)
  }
  return deepFreeze({ runLoadout, dailyState, effects })
}

function buildMechanicalMaterialResult(
  snapshot: CurrentDayHubSnapshot,
  command: Extract<HubMaintenanceCommand, { kind: 'repair-with-metal-parts' }>,
  dependencies: HubMaintenanceDependencies,
): HubMaintenanceOperationResult {
  const generatedRepair = configOf(dependencies).maintenance.materialRepair.metalParts.mechanicalRepairPoints
  let requestedRepair = 0
  const prepared = command.allocations.map((allocation) => {
    requestedRepair = addSafe(requestedRepair, allocation.points, '机械维修分配')
    return {
      allocation,
      target: resolveEligibleTarget(snapshot.runLoadout, allocation.target, 'mechanical-material-repair', dependencies),
    }
  })
  if (requestedRepair > generatedRepair) unavailable('机械维修分配超过本次材料生成的维修量')
  assertDistinctTargets(prepared.map(({ target }) => target))
  const material = resolveMaterial(snapshot.runLoadout, command.source, 'metal-parts', dependencies)
  assertMaterialSeparateFromTargets(material, prepared.map(({ target }) => target))
  const consumed = consumeMaterial(snapshot.runLoadout, material, dependencies)
  let runLoadout = consumed.snapshot
  let actualRepair = 0
  const effects: HubMaintenanceOperationResult['effects'][number][] = [consumed.effect]
  for (const { allocation } of prepared) {
    const restored = restoreTarget(runLoadout, allocation.target, 'mechanical-material-repair', allocation.points, dependencies)
    runLoadout = restored.snapshot
    actualRepair = addSafe(actualRepair, restored.effect.actualRecovery, '机械维修实际恢复量')
    effects.push(restored.effect)
  }
  if (actualRepair <= 0) unavailable('机械维修必须产生实际恢复')
  effects.push({
    kind: 'maintenance-repair-waste',
    repairFamily: 'mechanical',
    generatedRepair,
    actualRepair,
    wastedRepair: generatedRepair - actualRepair,
  })
  return deepFreeze({ runLoadout, dailyState: snapshot.dailyState, effects })
}

function buildTextileMaterialResult(
  snapshot: CurrentDayHubSnapshot,
  command: Extract<HubMaintenanceCommand, { kind: 'repair-with-fabric' }>,
  dependencies: HubMaintenanceDependencies,
): HubMaintenanceOperationResult {
  const generatedRepair = configOf(dependencies).maintenance.materialRepair.fabric.textileRepairPoints
  const target = resolveEligibleTarget(snapshot.runLoadout, command.target, 'textile-material-repair', dependencies)
  const material = resolveMaterial(snapshot.runLoadout, command.source, 'fabric', dependencies)
  assertMaterialSeparateFromTargets(material, [target])
  const consumed = consumeMaterial(snapshot.runLoadout, material, dependencies)
  const restored = restoreTarget(consumed.snapshot, command.target, 'textile-material-repair', generatedRepair, dependencies)
  const actualRepair = restored.effect.actualRecovery
  if (actualRepair <= 0) unavailable('织物维修必须产生实际恢复')
  const effects: HubMaintenanceOperationResult['effects'][number][] = [
    consumed.effect,
    restored.effect,
    {
      kind: 'maintenance-repair-waste',
      repairFamily: 'textile',
      generatedRepair,
      actualRepair,
      wastedRepair: generatedRepair - actualRepair,
    },
  ]
  return deepFreeze({
    runLoadout: restored.snapshot,
    dailyState: snapshot.dailyState,
    effects,
  })
}

function buildToolkitResult(
  snapshot: CurrentDayHubSnapshot,
  command: Extract<HubMaintenanceCommand, { kind: 'repair-toolkit' }>,
  dependencies: HubMaintenanceDependencies,
): HubMaintenanceOperationResult {
  const target = resolveEligibleTarget(snapshot.runLoadout, command.target, 'toolkit-repair', dependencies)
  const metal = resolveMaterial(snapshot.runLoadout, command.metalPartsSource, 'metal-parts', dependencies)
  const electronic = resolveMaterial(snapshot.runLoadout, command.electronicComponentsSource, 'electronic-components', dependencies)
  if (metal.item.instanceId === electronic.item.instanceId || sourceKey(metal.source) === sourceKey(electronic.source)) {
    invalid('工具箱维修的两种材料必须来自两个不同的真实物品来源')
  }
  assertMaterialSeparateFromTargets(metal, [target])
  assertMaterialSeparateFromTargets(electronic, [target])
  const afterMetal = consumeMaterial(snapshot.runLoadout, metal, dependencies)
  const afterElectronic = consumeMaterial(afterMetal.snapshot, electronic, dependencies)
  const restored = restoreTarget(
    afterElectronic.snapshot,
    command.target,
    'toolkit-repair',
    configOf(dependencies).maintenance.toolkitRepair.durabilityRecovery,
    dependencies,
  )
  return deepFreeze({
    runLoadout: restored.snapshot,
    dailyState: snapshot.dailyState,
    effects: [afterMetal.effect, afterElectronic.effect, restored.effect],
  })
}

function buildFlashlightChargeResult(
  snapshot: CurrentDayHubSnapshot,
  command: Extract<HubMaintenanceCommand, { kind: 'charge-flashlight' }>,
  dependencies: HubMaintenanceDependencies,
): HubMaintenanceOperationResult {
  const target = resolveEligibleTarget(snapshot.runLoadout, command.target, 'flashlight-charge', dependencies)
  const battery = resolveRechargeBattery(
    snapshot.runLoadout,
    command.batterySource,
    target.item.definitionId,
    dependencies,
  )
  assertMaterialSeparateFromTargets(battery, [target])
  const consumed = consumeMaterial(snapshot.runLoadout, battery, dependencies)
  const restored = restoreTarget(
    consumed.snapshot,
    command.target,
    'flashlight-charge',
    configOf(dependencies).maintenance.flashlightCharge.chargeRecovery,
    dependencies,
  )
  return deepFreeze({
    runLoadout: restored.snapshot,
    dailyState: snapshot.dailyState,
    effects: [consumed.effect, restored.effect],
  })
}

export function buildHubMaintenanceTransitionPlan(
  snapshotInput: CurrentDayHubSnapshot,
  commandInput: HubMaintenanceCommand,
  dependencies: HubMaintenanceDependencies,
): HubMaintenanceTransitionPlan {
  const snapshot = createCurrentDayHubSnapshot(snapshotInput, dependencies.currentDayHub)
  validateHubMaintenanceDependencies(dependencies)
  const command = createHubMaintenanceCommand(commandInput)
  const operation = command.kind === 'allocate-base-maintenance-labor'
    ? buildBaseLaborResult(snapshot, command, dependencies)
    : command.kind === 'repair-with-metal-parts'
      ? buildMechanicalMaterialResult(snapshot, command, dependencies)
      : command.kind === 'repair-with-fabric'
        ? buildTextileMaterialResult(snapshot, command, dependencies)
        : command.kind === 'repair-toolkit'
          ? buildToolkitResult(snapshot, command, dependencies)
          : buildFlashlightChargeResult(snapshot, command, dependencies)
  const finalSnapshot = createCurrentDayHubSnapshot({
    ...snapshot,
    runLoadout: operation.runLoadout,
    dailyState: operation.dailyState,
  }, dependencies.currentDayHub)
  return deepFreeze({
    command,
    effects: [
      ...operation.effects,
      { kind: 'hub-maintenance-zero-time-confirmed', hubSceneTime: 0 },
      { kind: 'current-day-hub-state-committed', snapshot: finalSnapshot },
    ],
    snapshot: finalSnapshot,
  })
}

export function previewHubMaintenance(
  snapshot: CurrentDayHubSnapshot,
  command: HubMaintenanceCommand,
  dependencies: HubMaintenanceDependencies,
): HubMaintenanceTransitionPlan {
  return buildHubMaintenanceTransitionPlan(snapshot, command, dependencies)
}

export function applyHubMaintenanceEffects(
  snapshot: CurrentDayHubSnapshot,
  command: HubMaintenanceCommand,
  effects: readonly HubMaintenanceEffect[],
  dependencies: HubMaintenanceDependencies,
): Readonly<{ effects: readonly HubMaintenanceEffect[]; snapshot: CurrentDayHubSnapshot }> {
  const expected = buildHubMaintenanceTransitionPlan(snapshot, command, dependencies)
  if (!same(effects, expected.effects)) {
    throw new HubMaintenanceError('EFFECT_MISMATCH', '中枢维护Effect与冻结正式计划不一致')
  }
  return deepFreeze({ effects: expected.effects, snapshot: expected.snapshot })
}

export function resolveHubMaintenanceCommand(
  snapshot: CurrentDayHubSnapshot,
  command: HubMaintenanceCommand,
  dependencies: HubMaintenanceDependencies,
): Readonly<{ effects: readonly HubMaintenanceEffect[]; snapshot: CurrentDayHubSnapshot }> {
  const plan = buildHubMaintenanceTransitionPlan(snapshot, command, dependencies)
  return applyHubMaintenanceEffects(snapshot, plan.command, plan.effects, dependencies)
}
