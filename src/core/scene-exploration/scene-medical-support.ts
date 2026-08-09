import { getItemState } from '../item-state'
import { SceneExplorationError } from './scene-exploration-errors'
import type {
  SceneExplorationSnapshot,
  SceneMedicalCommandDependencies,
  SceneMedicalItemKind,
  SceneMedicalItemSource,
  UseSceneMedicalItemCommand,
} from './scene-exploration-types'

export interface ResolvedSceneMedicalSource {
  readonly item: Readonly<{ instanceId: string; definitionId: string; quantity: number }>
  readonly sourceContainer: SceneMedicalItemSource['container']
  readonly sourceSlotIndex: number | null
  readonly medicalItem: SceneMedicalItemKind
}

export function getSceneMedicalItemKind(
  definitionId: string,
  dependencies: SceneMedicalCommandDependencies,
): SceneMedicalItemKind | null {
  const bindings = dependencies.medicalBindings
  if (definitionId === bindings.bandageDefinitionId) return 'bandage'
  if (definitionId === bindings.painkillerDefinitionId) return 'painkiller'
  if (definitionId === bindings.disinfectantDefinitionId) return 'disinfectant'
  if (definitionId === bindings.firstAidKitDefinitionId) return 'first-aid-kit'
  return null
}

export function resolveSceneMedicalSource(
  snapshot: SceneExplorationSnapshot,
  command: UseSceneMedicalItemCommand,
  dependencies: SceneMedicalCommandDependencies,
): ResolvedSceneMedicalSource {
  const source = command.source
  const item = source.container === 'backpack'
    ? snapshot.backpack.items.find(({ instanceId }) => instanceId === source.itemInstanceId)
    : snapshot.quickSlots.slots[source.quickSlotIndex]
  if (!item || item.quantity < 1) {
    throw new SceneExplorationError('SCENE_MEDICAL_NOT_AVAILABLE', '指定的探索医疗物品不在当前容器中')
  }
  const medicalItem = getSceneMedicalItemKind(item.definitionId, dependencies)
  const state = getItemState(snapshot.itemStates, item.instanceId)
  if (!medicalItem || state.definitionId !== item.definitionId || state.resource.kind !== 'none') {
    throw new SceneExplorationError('SCENE_MEDICAL_NOT_AVAILABLE', '指定物品不是可用的探索医疗物品')
  }
  return {
    item,
    sourceContainer: source.container,
    sourceSlotIndex: source.container === 'quick-slot'
      ? source.quickSlotIndex
      : null,
    medicalItem,
  }
}
