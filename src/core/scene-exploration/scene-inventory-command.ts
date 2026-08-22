import { deepFreeze } from '../config'
import { areItemStatesStackCompatible, createItemState, createItemStateCollectionSnapshot, getItemState, removeItemState } from '../item-state'
import { addItemToBackpack, createBackpackSnapshot, createItemInstance, deriveStableSplitInstanceId, moveBackpackItem, removeItemFromBackpack } from '../inventory'
import { createQuickSlotSnapshot } from '../quick-slot'
import { addSceneItems } from '../scene-items'
import { SceneExplorationError } from './scene-exploration-errors'
import { applySceneExplorationEffects } from './scene-exploration-effects'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { getScenePhysicalItemInstanceIds } from './scene-physical-items'
import type {
  SceneExplorationDependencies,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneInventoryAudit,
  SceneInventoryCommand,
} from './scene-exploration-types'

const keys = (value: unknown, expected: readonly string[]): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join('|') === [...expected].sort().join('|')
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
function invalid(message: string): never { throw new SceneExplorationError('INVALID_INPUT', message) }
const id = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const integer = (value: unknown): value is number => Number.isSafeInteger(value)
const placement = (value: unknown, hasInstanceId: boolean) => { if (!keys(value, hasInstanceId ? ['instanceId', 'x', 'y', 'rotated'] : ['x', 'y', 'rotated'])) return false; return (!hasInstanceId || id(value.instanceId)) && integer(value.x) && value.x >= 0 && integer(value.y) && value.y >= 0 && typeof value.rotated === 'boolean' }
function active(snapshot: SceneExplorationSnapshot): void {
  if (snapshot.status !== 'active') throw new SceneExplorationError('SCENE_NOT_ACTIVE', '只有active场景可以整理')
  if (snapshot.condition.currentHealth === 0) throw new SceneExplorationError('PLAYER_DEAD', '死亡玩家不能整理')
}
export function createSceneInventoryCommand(input: unknown): SceneInventoryCommand {
  if (!input || typeof input !== 'object') invalid('场景整理命令无效')
  const candidate = input as Record<string, unknown>
  const kind = candidate.kind
  if (kind === 'move-scene-backpack-item' && keys(candidate, ['kind','instanceId','placement']) && id(candidate.instanceId) && placement(candidate.placement, true)) { const target = candidate.placement as { instanceId: string; x: number; y: number; rotated: boolean }; return deepFreeze({ kind, instanceId: candidate.instanceId, placement: { instanceId: target.instanceId, x: target.x, y: target.y, rotated: target.rotated } }) }
  if (kind === 'split-scene-backpack-stack' && keys(candidate, ['kind','sourceInstanceId','quantity','placement']) && id(candidate.sourceInstanceId) && integer(candidate.quantity) && candidate.quantity > 0 && placement(candidate.placement, false)) { const target = candidate.placement as { x: number; y: number; rotated: boolean }; return deepFreeze({ kind, sourceInstanceId: candidate.sourceInstanceId, quantity: candidate.quantity, placement: { x: target.x, y: target.y, rotated: target.rotated } }) }
  if (kind === 'merge-scene-backpack-stacks' && keys(candidate, ['kind','sourceInstanceId','targetInstanceId','quantity']) && id(candidate.sourceInstanceId) && id(candidate.targetInstanceId) && integer(candidate.quantity) && candidate.quantity > 0) return deepFreeze({ kind, sourceInstanceId: candidate.sourceInstanceId, targetInstanceId: candidate.targetInstanceId, quantity: candidate.quantity })
  if (kind === 'scene-backpack-to-quick-slot' && keys(candidate, ['kind','instanceId','targetSlotIndex']) && id(candidate.instanceId) && integer(candidate.targetSlotIndex)) return deepFreeze({ kind, instanceId: candidate.instanceId, targetSlotIndex: candidate.targetSlotIndex })
  if (kind === 'scene-quick-slot-to-backpack' && keys(candidate, ['kind','sourceSlotIndex','placement']) && integer(candidate.sourceSlotIndex) && placement(candidate.placement, false)) { const target = candidate.placement as { x: number; y: number; rotated: boolean }; return deepFreeze({ kind, sourceSlotIndex: candidate.sourceSlotIndex, placement: { x: target.x, y: target.y, rotated: target.rotated } }) }
  if ((kind === 'drop-scene-backpack-item' || kind === 'confirm-drop-scene-quest-item') && keys(candidate, ['kind','instanceId']) && id(candidate.instanceId)) return deepFreeze({ kind, instanceId: candidate.instanceId })
  invalid('场景整理命令结构无效')
}

function buildSceneInventoryAudit(
  snapshot: SceneExplorationSnapshot,
  command: SceneInventoryCommand,
  dependencies: SceneExplorationDependencies,
): SceneInventoryAudit {
  const backpackItem = (instanceId: string) => {
    const item = snapshot.backpack.items.find((candidate) => candidate.instanceId === instanceId)
    if (!item) invalid('整理审计来源不存在')
    return item
  }
  const backpackPlacement = (instanceId: string) =>
    snapshot.backpack.placements.find((candidate) => candidate.instanceId === instanceId) ?? null
  const state = (instanceId: string) => getItemState(snapshot.itemStates, instanceId)

  if (command.kind === 'move-scene-backpack-item') {
    const source = backpackItem(command.instanceId)
    return deepFreeze({
      operationKind: command.kind,
      sourceInstanceId: source.instanceId,
      targetInstanceId: source.instanceId,
      definitionId: source.definitionId,
      sourceQuantityBefore: source.quantity,
      quantityMoved: source.quantity,
      sourceQuantityAfter: source.quantity,
      targetQuantityBefore: source.quantity,
      targetQuantityAfter: source.quantity,
      sourcePlacement: backpackPlacement(source.instanceId),
      targetPlacement: command.placement,
      splitInstanceId: null,
      quickSlotIndex: null,
      nodeId: null,
      sourceItemState: state(source.instanceId),
      targetItemState: state(source.instanceId),
      mergeResult: null,
      dropLifecycleKind: null,
    })
  }
  if (command.kind === 'split-scene-backpack-stack') {
    const source = backpackItem(command.sourceInstanceId)
    const splitInstanceId = deriveStableSplitInstanceId({
      scope: `scene-backpack-split:${snapshot.sceneInstanceId}`,
      sourceInstanceId: source.instanceId,
      sourceQuantityBeforeSplit: source.quantity,
      quantity: command.quantity,
    })
    return deepFreeze({
      operationKind: command.kind,
      sourceInstanceId: source.instanceId,
      targetInstanceId: splitInstanceId,
      definitionId: source.definitionId,
      sourceQuantityBefore: source.quantity,
      quantityMoved: command.quantity,
      sourceQuantityAfter: source.quantity - command.quantity,
      targetQuantityBefore: 0,
      targetQuantityAfter: command.quantity,
      sourcePlacement: backpackPlacement(source.instanceId),
      targetPlacement: { instanceId: splitInstanceId, ...command.placement },
      splitInstanceId,
      quickSlotIndex: null,
      nodeId: null,
      sourceItemState: state(source.instanceId),
      targetItemState: null,
      mergeResult: null,
      dropLifecycleKind: null,
    })
  }
  if (command.kind === 'merge-scene-backpack-stacks') {
    const source = backpackItem(command.sourceInstanceId)
    const target = backpackItem(command.targetInstanceId)
    return deepFreeze({
      operationKind: command.kind,
      sourceInstanceId: source.instanceId,
      targetInstanceId: target.instanceId,
      definitionId: source.definitionId,
      sourceQuantityBefore: source.quantity,
      quantityMoved: command.quantity,
      sourceQuantityAfter: source.quantity - command.quantity,
      targetQuantityBefore: target.quantity,
      targetQuantityAfter: target.quantity + command.quantity,
      sourcePlacement: backpackPlacement(source.instanceId),
      targetPlacement: backpackPlacement(target.instanceId),
      splitInstanceId: null,
      quickSlotIndex: null,
      nodeId: null,
      sourceItemState: state(source.instanceId),
      targetItemState: state(target.instanceId),
      mergeResult: command.quantity === source.quantity ? 'full' : 'partial',
      dropLifecycleKind: null,
    })
  }
  if (command.kind === 'scene-backpack-to-quick-slot') {
    const source = backpackItem(command.instanceId)
    const splitInstanceId = source.quantity > 1
      ? deriveStableSplitInstanceId({
          scope: `scene-quick-slot-split:${snapshot.sceneInstanceId}`,
          sourceInstanceId: source.instanceId,
          sourceQuantityBeforeSplit: source.quantity,
          quantity: 1,
        })
      : null
    return deepFreeze({
      operationKind: command.kind,
      sourceInstanceId: source.instanceId,
      targetInstanceId: splitInstanceId ?? source.instanceId,
      definitionId: source.definitionId,
      sourceQuantityBefore: source.quantity,
      quantityMoved: 1,
      sourceQuantityAfter: source.quantity - 1,
      targetQuantityBefore: 0,
      targetQuantityAfter: 1,
      sourcePlacement: backpackPlacement(source.instanceId),
      targetPlacement: null,
      splitInstanceId,
      quickSlotIndex: command.targetSlotIndex,
      nodeId: null,
      sourceItemState: state(source.instanceId),
      targetItemState: null,
      mergeResult: null,
      dropLifecycleKind: null,
    })
  }
  if (command.kind === 'scene-quick-slot-to-backpack') {
    const source = snapshot.quickSlots.slots[command.sourceSlotIndex]
    if (!source) invalid('整理审计快捷栏来源不存在')
    return deepFreeze({
      operationKind: command.kind,
      sourceInstanceId: source.instanceId,
      targetInstanceId: source.instanceId,
      definitionId: source.definitionId,
      sourceQuantityBefore: source.quantity,
      quantityMoved: source.quantity,
      sourceQuantityAfter: 0,
      targetQuantityBefore: 0,
      targetQuantityAfter: source.quantity,
      sourcePlacement: null,
      targetPlacement: { instanceId: source.instanceId, ...command.placement },
      splitInstanceId: null,
      quickSlotIndex: command.sourceSlotIndex,
      nodeId: null,
      sourceItemState: state(source.instanceId),
      targetItemState: null,
      mergeResult: null,
      dropLifecycleKind: null,
    })
  }
  const source = backpackItem(command.instanceId)
  if (!dependencies.lifecycleCatalog) invalid('整理审计缺少生命周期目录')
  return deepFreeze({
    operationKind: command.kind,
    sourceInstanceId: source.instanceId,
    targetInstanceId: source.instanceId,
    definitionId: source.definitionId,
    sourceQuantityBefore: source.quantity,
    quantityMoved: source.quantity,
    sourceQuantityAfter: 0,
    targetQuantityBefore: 0,
    targetQuantityAfter: source.quantity,
    sourcePlacement: backpackPlacement(source.instanceId),
    targetPlacement: null,
    splitInstanceId: null,
    quickSlotIndex: null,
    nodeId: snapshot.currentNodeId,
    sourceItemState: state(source.instanceId),
    targetItemState: null,
    mergeResult: null,
    dropLifecycleKind: dependencies.lifecycleCatalog.get(source.definitionId).kind,
  })
}
export function buildSceneInventoryTransitionPlan(snapshotInput: SceneExplorationSnapshot, input: unknown, dependencies: SceneExplorationDependencies) {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies); active(snapshot)
  const command = createSceneInventoryCommand(input); const audit = buildSceneInventoryAudit(snapshot, command, dependencies); let backpack = snapshot.backpack; let quickSlots = snapshot.quickSlots; let itemStates = snapshot.itemStates; let sceneItems = snapshot.sceneItems
  if (command.kind === 'move-scene-backpack-item') { if (command.placement.instanceId !== command.instanceId) invalid('背包移动摆放身份不一致'); backpack = moveBackpackItem(backpack, command.instanceId, command.placement, dependencies.physicalCatalog) }
  if (command.kind === 'split-scene-backpack-stack') {
    const source = backpack.items.find(x => x.instanceId === command.sourceInstanceId); if (!source) invalid('拆分来源不存在')
    const def = dependencies.physicalCatalog.get(source.definitionId); if (def.stacking.kind !== 'stackable' || source.quantity <= 1 || !Number.isSafeInteger(command.quantity) || command.quantity <= 0 || command.quantity >= source.quantity || getItemState(itemStates, source.instanceId).resource.kind !== 'none') invalid('拆分条件不满足')
    const id = deriveStableSplitInstanceId({ scope: `scene-backpack-split:${snapshot.sceneInstanceId}`, sourceInstanceId: source.instanceId, sourceQuantityBeforeSplit: source.quantity, quantity: command.quantity })
    if (getScenePhysicalItemInstanceIds(snapshot).includes(id)) invalid('拆分实例ID冲突')
    backpack = createBackpackSnapshot({ ...backpack, items: backpack.items.map(x => x.instanceId === source.instanceId ? { ...x, quantity: x.quantity - command.quantity } : x) }, dependencies.physicalCatalog)
    backpack = addItemToBackpack(backpack, createItemInstance({ instanceId:id, definitionId:source.definitionId, quantity:command.quantity }, dependencies.physicalCatalog), { instanceId:id, ...command.placement }, dependencies.physicalCatalog)
    itemStates = createItemStateCollectionSnapshot([...itemStates.states, createItemState({ instanceId:id, definitionId:source.definitionId, resource:{kind:'none'} }, dependencies.itemResourceCatalog)], [...backpack.items,...Object.values(snapshot.equipment).filter((x):x is NonNullable<typeof x>=>x!==null),...quickSlots.slots.filter((x):x is NonNullable<typeof x>=>x!==null)], dependencies.itemResourceCatalog)
  }
  if (command.kind === 'merge-scene-backpack-stacks') {
    const source=backpack.items.find(x=>x.instanceId===command.sourceInstanceId), target=backpack.items.find(x=>x.instanceId===command.targetInstanceId); if(!source||!target||source===target||source.definitionId!==target.definitionId) invalid('合并来源无效')
    const def=dependencies.physicalCatalog.get(source.definitionId); if(def.stacking.kind!=='stackable'||!Number.isSafeInteger(command.quantity)||command.quantity<=0||command.quantity>source.quantity||target.quantity+command.quantity>def.stacking.maxQuantity||!areItemStatesStackCompatible(getItemState(itemStates,source.instanceId),getItemState(itemStates,target.instanceId))) invalid('合并条件不满足')
    backpack=createBackpackSnapshot({ ...backpack, items:backpack.items.flatMap(x=>x.instanceId===target.instanceId?[{...x,quantity:x.quantity+command.quantity}]:x.instanceId===source.instanceId?(x.quantity===command.quantity?[]:[{...x,quantity:x.quantity-command.quantity}]):[x]), placements:backpack.placements.filter(x=>!(x.instanceId===source.instanceId&&source.quantity===command.quantity))},dependencies.physicalCatalog)
    if(source.quantity===command.quantity)itemStates=removeItemState(itemStates,source.instanceId)
  }
  if (command.kind === 'scene-backpack-to-quick-slot') {
    const source=backpack.items.find(x=>x.instanceId===command.instanceId); if(command.targetSlotIndex<0||command.targetSlotIndex>=quickSlots.slots.length||!source||quickSlots.slots[command.targetSlotIndex]||dependencies.quickSlotCatalog.get(source.definitionId).kind!=='eligible')invalid('快捷栏转移无效')
    let moved=source; if(source.quantity>1){const id=deriveStableSplitInstanceId({scope:`scene-quick-slot-split:${snapshot.sceneInstanceId}`,sourceInstanceId:source.instanceId,sourceQuantityBeforeSplit:source.quantity,quantity:1}); if(getScenePhysicalItemInstanceIds(snapshot).includes(id))invalid('拆分实例ID冲突'); moved=createItemInstance({instanceId:id,definitionId:source.definitionId,quantity:1},dependencies.physicalCatalog); backpack=createBackpackSnapshot({...backpack,items:backpack.items.map(x=>x.instanceId===source.instanceId?{...x,quantity:x.quantity-1}:x)},dependencies.physicalCatalog); itemStates=createItemStateCollectionSnapshot([...itemStates.states,createItemState({instanceId:id,definitionId:source.definitionId,resource:{kind:'none'}},dependencies.itemResourceCatalog)],[...backpack.items,...Object.values(snapshot.equipment).filter((x):x is NonNullable<typeof x>=>x!==null),...quickSlots.slots.filter((x):x is NonNullable<typeof x>=>x!==null),moved],dependencies.itemResourceCatalog)}else{backpack=removeItemFromBackpack(backpack,source.instanceId,dependencies.physicalCatalog).snapshot}
    const slots=[...quickSlots.slots];slots[command.targetSlotIndex]=moved;quickSlots=createQuickSlotSnapshot(slots,slots.length,dependencies.physicalCatalog,dependencies.quickSlotCatalog)
  }
  if(command.kind==='scene-quick-slot-to-backpack'){if(command.sourceSlotIndex<0||command.sourceSlotIndex>=quickSlots.slots.length)invalid('快捷栏来源无效');const moved=quickSlots.slots[command.sourceSlotIndex];if(!moved)invalid('快捷栏来源为空');backpack=addItemToBackpack(backpack,moved!,{instanceId:moved.instanceId,...command.placement},dependencies.physicalCatalog);const slots=[...quickSlots.slots];slots[command.sourceSlotIndex]=null;quickSlots=createQuickSlotSnapshot(slots,slots.length,dependencies.physicalCatalog,dependencies.quickSlotCatalog)}
  if(command.kind==='drop-scene-backpack-item'||command.kind==='confirm-drop-scene-quest-item'){const moved=backpack.items.find(x=>x.instanceId===command.instanceId);if(!moved||!dependencies.lifecycleCatalog)invalid('丢弃来源或生命周期目录无效');const lifecycle=dependencies.lifecycleCatalog.get(moved.definitionId).kind;if((command.kind==='drop-scene-backpack-item'&&lifecycle==='quest')||(command.kind==='confirm-drop-scene-quest-item'&&lifecycle!=='quest'))invalid('丢弃确认类型与物品生命周期不一致');const state=getItemState(itemStates,moved.instanceId);backpack=removeItemFromBackpack(backpack,moved.instanceId,dependencies.physicalCatalog).snapshot;itemStates=removeItemState(itemStates,moved.instanceId);sceneItems=addSceneItems(sceneItems,snapshot.currentNodeId,[{item:moved,state}],{graph:dependencies.graph,itemCatalog:dependencies.physicalCatalog,itemResourceCatalog:dependencies.itemResourceCatalog})}
  const final=createSceneExplorationSnapshot({...snapshot,backpack,quickSlots,itemStates,sceneItems},dependencies); const effects:readonly SceneExplorationEffect[]=deepFreeze([{kind:'scene-inventory-committed',command,audit,snapshot:final}]);return deepFreeze({command,effects,snapshot:final})
}
export function applySceneInventoryEffects(snapshot: SceneExplorationSnapshot,command: SceneInventoryCommand,effects: readonly SceneExplorationEffect[],dependencies: SceneExplorationDependencies){const effect=effects[0];if(!effect||effect.kind!=='scene-inventory-committed'||effects.length!==1)throw new SceneExplorationError('EFFECT_RESOURCE_MISMATCH','整理Effect无效');const expected=buildSceneInventoryTransitionPlan(snapshot,command,dependencies);if(!same(effects,expected.effects))throw new SceneExplorationError('EFFECT_RESOURCE_MISMATCH','整理Effect与独立命令不一致');return expected.snapshot}
export function previewSceneInventoryCommand(snapshot: SceneExplorationSnapshot, command: unknown, dependencies: SceneExplorationDependencies) {
  try {
    const plan = buildSceneInventoryTransitionPlan(snapshot, command, dependencies)
    return deepFreeze({ canExecute: true as const, result: plan })
  } catch (error) {
    if (error instanceof SceneExplorationError) {
      return deepFreeze({ canExecute: false as const, rejectionCode: error.code })
    }
    throw error
  }
}
export function resolveSceneInventoryCommand(snapshot: SceneExplorationSnapshot, command: unknown, dependencies: SceneExplorationDependencies){const plan=buildSceneInventoryTransitionPlan(snapshot,command,dependencies);return deepFreeze({result:{...plan},snapshot:applySceneExplorationEffects(snapshot,plan.effects,dependencies,{kind:'scene-inventory',command:plan.command})})}
