import { createPlayerVisibleCombatSnapshot } from '../combat'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { SceneExplorationError } from './scene-exploration-errors'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
} from './scene-exploration-types'

export function getPlayerVisibleSceneCombatState(
  snapshotInput: SceneExplorationSnapshot,
  dependencies: SceneExplorationDependencies,
) {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  if (snapshot.status !== 'combat' || !dependencies.sceneCombat) {
    throw new SceneExplorationError('SCENE_NOT_IN_COMBAT', '场景当前不在战斗中')
  }
  const active = snapshot.combatState.encounters.find(({ kind }) => kind === 'active')
  if (!active || active.kind !== 'active') {
    throw new SceneExplorationError('INVALID_COMBAT_STATE', '场景缺少唯一活跃遭遇')
  }
  return createPlayerVisibleCombatSnapshot(active.combat, {
    encounterId: active.encounterId,
    nodeId: active.nodeId,
    engagement: active.engagement,
  }, dependencies.sceneCombat.combat)
}
