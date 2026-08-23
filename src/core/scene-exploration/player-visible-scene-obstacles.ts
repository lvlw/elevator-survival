import type { CombatRiskTier } from '../combat'
import { deepFreeze, type FrozenRuleConfig } from '../config'
import { createPerformSceneObstacleOptionCommand } from '../scene-obstacle'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import {
  previewSceneObstacleOptionCommand,
  previewSceneObstacleOutcomeBranch,
} from './scene-obstacle-command'
import type {
  PlayerVisibleSceneObstacle,
  PlayerVisibleSceneObstacleOption,
  SceneExplorationEffect,
  SceneExplorationSnapshot,
  SceneObstacleCommandDependencies,
} from './scene-exploration-types'

const RISK_TIERS: readonly CombatRiskTier[] = Object.freeze([
  'none',
  'low',
  'medium',
  'high',
  'very-high',
])

function riskTierForPercent(
  percent: number,
  config: FrozenRuleConfig,
): CombatRiskTier {
  const tier = RISK_TIERS.find(
    (candidate) => config.combat.riskTiers[candidate] === percent,
  )
  if (!tier) {
    throw new Error('障碍风险必须对应版本化配置中的正式相对等级')
  }
  return tier
}

function resourceChange(
  effects: readonly SceneExplorationEffect[],
): PlayerVisibleSceneObstacleOption['resourceChange'] {
  const effect = effects.find((candidate): candidate is Extract<
    SceneExplorationEffect,
    { readonly kind: 'item-resource-consumed' }
  > => candidate.kind === 'item-resource-consumed')
  if (effect?.resourceKind === 'none') {
    throw new Error('障碍装备资源消耗不能使用 none 资源')
  }
  return effect
    ? deepFreeze({
        definitionId: effect.definitionId,
        resourceKind: effect.resourceKind,
        currentBefore: effect.currentBefore,
        currentAfter: effect.currentAfter,
      })
    : null
}

/**
 * Returns only unresolved obstacles at the current active node and only the
 * options accepted by the formal obstacle preview. Hidden deterministic risk
 * draws and resulting snapshots never cross this boundary.
 */
export function getPlayerVisibleSceneObstacles(
  input: SceneExplorationSnapshot,
  dependencies: SceneObstacleCommandDependencies,
): readonly PlayerVisibleSceneObstacle[] {
  const snapshot = createSceneExplorationSnapshot(input, dependencies)
  if (snapshot.status !== 'active') return Object.freeze([])

  const obstacles = dependencies.obstacleCatalog.obstacleIds.flatMap((obstacleId) => {
    const obstacle = dependencies.obstacleCatalog.get(obstacleId)
    if (
      !obstacle.endpointNodeIds.includes(snapshot.currentNodeId) ||
      snapshot.enabledEdgeIds.includes(obstacle.edgeId)
    ) return []

    const options = obstacle.options.flatMap((option): PlayerVisibleSceneObstacleOption[] => {
      const command = createPerformSceneObstacleOptionCommand({
        obstacleId,
        optionId: option.id,
      })
      const raw = previewSceneObstacleOptionCommand(snapshot, command, dependencies)
      if (!raw.canExecute) return []
      const result = raw.result
      const protectionActive = result.effects.some(
        (effect) => effect.kind === 'item-resource-consumed' &&
          effect.source === 'fire-door-impact-protection',
      )
      const spawnedItems = result.effects.flatMap((effect) =>
        effect.kind === 'scene-item-spawned'
          ? [{
              definitionId: effect.entity.item.definitionId,
              quantity: effect.entity.item.quantity,
            }]
          : [],
      )
      const setsAlert = option.kind === 'force-entry' ||
        (option.kind === 'equipped-resource' && option.setsAlert)
      const riskPercent = option.kind === 'force-entry'
        ? protectionActive
          ? dependencies.config.scene.fireDoor.protectedForceEntryInjuryRiskPercent
          : dependencies.config.scene.fireDoor.forceEntryInjuryRiskPercent
        : null
      const outcomes = option.kind === 'force-entry'
        ? ([
            deepFreeze({
              kind: 'no-minor-contusion' as const,
              ...previewSceneObstacleOutcomeBranch(
                snapshot,
                command,
                false,
                dependencies,
              ),
            }),
            deepFreeze({
              kind: 'minor-contusion' as const,
              ...previewSceneObstacleOutcomeBranch(
                snapshot,
                command,
                true,
                dependencies,
              ),
            }),
          ])
        : result.returnRoute && result.sceneOutcome
          ? [deepFreeze({
              kind: 'deterministic' as const,
              returnRoute: result.returnRoute,
              sceneOutcome: result.sceneOutcome,
            })]
          : []
      return [deepFreeze({
        command,
        kind: option.kind,
        actionTime: result.actionTime,
        setsAlert,
        resourceChange: resourceChange(result.effects),
        spawnedItems: deepFreeze(spawnedItems),
        injuryRiskTier: riskPercent === null
          ? null
          : riskTierForPercent(riskPercent, dependencies.config),
        impactProtectionActive: protectionActive,
        outcomes: deepFreeze(outcomes),
      })]
    })
    return [deepFreeze({ obstacleId, options: deepFreeze(options) })]
  })
  return deepFreeze(obstacles)
}
