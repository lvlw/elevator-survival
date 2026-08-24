import {
  createPlayerVisibleCombatSnapshot,
  evaluateCombatSceneTime,
  getPlayerVisibleCombatActionOptions,
  type PlayerVisibleCombatActionOption,
} from '../combat'
import { hasMinorContusions } from '../condition'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { calculateForcedReturnDamage } from '../scene'
import { getEffectiveEnabledEdgeIds } from '../scene-access'
import { findReturnRoute } from '../scene-graph'
import { deepFreeze } from '../config'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { SceneExplorationError } from './scene-exploration-errors'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
} from './scene-exploration-types'

export type PlayerVisibleCombatDeathRisk = 'none' | 'possible' | 'guaranteed'

export interface PlayerVisibleCombatTerminalCompletion {
  readonly outcome: 'victory' | 'escaped' | 'defeat'
  readonly nodeName: string
  readonly elapsedCtb: number
  readonly currentRemainingTime: number
  readonly sceneTimeCost: number
  readonly remainingTimeAfter: number
  readonly overtimeDebt: number
  readonly combatCompletionHealthMin: number
  readonly combatCompletionHealthMax: number
  readonly returnTimeMin: number | null
  readonly returnTimeMax: number | null
  readonly effectiveEmergencyReturnTimeMin: number | null
  readonly effectiveEmergencyReturnTimeMax: number | null
  readonly forcedReturnBaseDamageMin: number | null
  readonly forcedReturnBaseDamageMax: number | null
  readonly forcedReturnBleedingDamageMin: number | null
  readonly forcedReturnBleedingDamageMax: number | null
  readonly forcedReturnTotalDamageMin: number | null
  readonly forcedReturnTotalDamageMax: number | null
  readonly forcedReturnHealthMin: number | null
  readonly forcedReturnHealthMax: number | null
  readonly survivingResult: 'active-scene' | 'forced-returned-scene' | null
  readonly forcedReturnTargetNodeName: string | null
}

export interface PlayerVisibleCombatTerminalPreview {
  readonly conditional: boolean
  readonly condition: 'enemy-incapacitated' | 'escape-survived' | null
  readonly deathRisk: PlayerVisibleCombatDeathRisk
  readonly deathPriority: boolean
  readonly preCompletionDefeatRisk: PlayerVisibleCombatDeathRisk
  readonly completionCheckpointDeathRisk: PlayerVisibleCombatDeathRisk
  readonly completion: PlayerVisibleCombatTerminalCompletion | null
}

interface SurvivingCompletionBranch {
  readonly health: number
  readonly bleeding: boolean
}

function nodeName(
  nodeId: string,
  dependencies: SceneExplorationDependencies,
): string {
  return dependencies.graph.nodes.find(({ id }) => id === nodeId)!.name
}

function noForcedReturnFacts() {
  return {
    returnTimeMin: null,
    returnTimeMax: null,
    effectiveEmergencyReturnTimeMin: null,
    effectiveEmergencyReturnTimeMax: null,
    forcedReturnBaseDamageMin: null,
    forcedReturnBaseDamageMax: null,
    forcedReturnBleedingDamageMin: null,
    forcedReturnBleedingDamageMax: null,
    forcedReturnTotalDamageMin: null,
    forcedReturnTotalDamageMax: null,
    forcedReturnHealthMin: null,
    forcedReturnHealthMax: null,
    survivingResult: null,
    forcedReturnTargetNodeName: null,
  } as const
}

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

export function getPlayerVisibleSceneCombatActionOptions(
  snapshotInput: SceneExplorationSnapshot,
  dependencies: SceneExplorationDependencies,
): readonly Readonly<{
  command: PlayerVisibleCombatActionOption['command']
  preview: PlayerVisibleCombatActionOption['preview']
  terminal: PlayerVisibleCombatTerminalPreview | null
}>[] {
  const snapshot = createSceneExplorationSnapshot(snapshotInput, dependencies)
  if (snapshot.status !== 'combat' || !dependencies.sceneCombat) {
    throw new SceneExplorationError('SCENE_NOT_IN_COMBAT', '场景当前不在战斗中')
  }
  const active = snapshot.combatState.encounters.find(({ kind }) => kind === 'active')
  if (!active || active.kind !== 'active') {
    throw new SceneExplorationError('INVALID_COMBAT_STATE', '场景缺少唯一活跃遭遇')
  }
  const options = getPlayerVisibleCombatActionOptions(
    active.combat,
    dependencies.sceneCombat.combat,
  )
  return deepFreeze(options.map((option) => {
    const isAttack = option.preview.primary.kind === 'attack'
    const isEscape = option.preview.primary.kind === 'escape'
    if (!isAttack && !isEscape) return { ...option, terminal: null }
    const escape = option.preview.escapeConsequences
    const preCompletionDefeatRisk: PlayerVisibleCombatDeathRisk = isEscape &&
      escape?.preCompletionDeath
      ? 'guaranteed'
      : 'none'
    const completionCheckpointDeathRisk: PlayerVisibleCombatDeathRisk = !isEscape ||
      !escape?.completionCheckpointDeathPossible
      ? 'none'
      : escape.completionCheckpointDeathGuaranteed
        ? 'guaranteed'
        : 'possible'
    if (isAttack && option.preview.playerHealthAfterOwnAction === 0) {
      const elapsedCtb = active.combat.currentCtb
      const time = evaluateCombatSceneTime(
        elapsedCtb,
        snapshot.remainingTime,
        dependencies.config.combat.sceneTimeConversion,
      )
      return {
        ...option,
        terminal: {
          conditional: false,
          condition: null,
          deathRisk: 'guaranteed' as const,
          deathPriority: true,
          preCompletionDefeatRisk: 'none' as const,
          completionCheckpointDeathRisk: 'none' as const,
          completion: {
            outcome: 'defeat' as const,
            nodeName: nodeName(active.nodeId, dependencies),
            elapsedCtb,
            currentRemainingTime: snapshot.remainingTime,
            ...time,
            combatCompletionHealthMin: 0,
            combatCompletionHealthMax: 0,
            ...noForcedReturnFacts(),
          },
        },
      }
    }
    const completionBranches: SurvivingCompletionBranch[] = isEscape
      ? [
          ...(escape?.nonBleedingCompletionHealth !== null &&
          escape?.nonBleedingCompletionHealth !== undefined &&
          escape.nonBleedingCompletionHealth > 0
            ? [{ health: escape.nonBleedingCompletionHealth, bleeding: false }]
            : []),
          ...(escape?.bleedingCompletionHealth !== null &&
          escape?.bleedingCompletionHealth !== undefined &&
          escape.bleedingCompletionHealth > 0
            ? [{ health: escape.bleedingCompletionHealth, bleeding: true }]
            : []),
        ]
      : option.preview.playerHealthAfterOwnAction > 0
        ? [{
            health: option.preview.playerHealthAfterOwnAction,
            bleeding: active.combat.playerCondition.bleeding,
          }]
        : []
    if (completionBranches.length === 0) {
      const defeatCtb = preCompletionDefeatRisk === 'guaranteed'
        ? escape?.preCompletionDeathCtb ?? null
        : completionCheckpointDeathRisk === 'guaranteed' && isEscape
          ? option.preview.primary.completesAtCtb
          : null
      const completion = defeatCtb !== null
        ? {
            outcome: 'defeat' as const,
            nodeName: nodeName(active.nodeId, dependencies),
            elapsedCtb: defeatCtb,
            currentRemainingTime: snapshot.remainingTime,
            ...evaluateCombatSceneTime(
              defeatCtb,
              snapshot.remainingTime,
              dependencies.config.combat.sceneTimeConversion,
            ),
            combatCompletionHealthMin: 0,
            combatCompletionHealthMax: 0,
            ...noForcedReturnFacts(),
          }
        : null
      return {
        ...option,
        terminal: {
          conditional: false,
          condition: null,
          deathRisk: 'guaranteed' as const,
          deathPriority: true,
          preCompletionDefeatRisk,
          completionCheckpointDeathRisk,
          completion,
        },
      }
    }
    const elapsedCtb = isEscape
      ? option.preview.primary.completesAtCtb
      : active.combat.currentCtb
    const time = evaluateCombatSceneTime(
      elapsedCtb,
      snapshot.remainingTime,
      dependencies.config.combat.sceneTimeConversion,
    )
    const finalNodeId = isEscape ? active.returnNodeId : active.nodeId
    const completionHealths = completionBranches.map(({ health }) => health)
    const baseCompletion = {
      outcome: isEscape ? 'escaped' as const : 'victory' as const,
      nodeName: nodeName(finalNodeId, dependencies),
      elapsedCtb,
      currentRemainingTime: snapshot.remainingTime,
      ...time,
      combatCompletionHealthMin: Math.min(...completionHealths),
      combatCompletionHealthMax: Math.max(...completionHealths),
    }
    if (time.remainingTimeAfter > 0) {
      return {
        ...option,
        terminal: {
          conditional: isAttack || completionCheckpointDeathRisk === 'possible',
          condition: isAttack
            ? 'enemy-incapacitated' as const
            : completionCheckpointDeathRisk === 'possible'
              ? 'escape-survived' as const
              : null,
          deathRisk: completionCheckpointDeathRisk === 'possible'
            ? 'possible' as const
            : 'none' as const,
          deathPriority: completionCheckpointDeathRisk !== 'none',
          preCompletionDefeatRisk,
          completionCheckpointDeathRisk,
          completion: {
            ...baseCompletion,
            ...noForcedReturnFacts(),
            survivingResult: 'active-scene' as const,
          },
        },
      }
    }
    const backpackWeight = calculateBackpackWeightSubtotal(
      active.combat.backpack,
      dependencies.physicalCatalog,
    )
    const route = findReturnRoute({
      graph: dependencies.graph,
      currentNodeId: finalNodeId,
      availability: {
        enabledEdgeIds: getEffectiveEnabledEdgeIds({
          enabledEdgeIds: snapshot.enabledEdgeIds,
          backpack: active.combat.backpack,
        }, dependencies.edgeAccessCatalog),
      },
      totalWeight: backpackWeight,
      hasMinorContusion: hasMinorContusions(active.combat.playerCondition),
      analgesiaActive: active.combat.playerCondition.painkillerActive,
    }, dependencies.config)
    const forcedBranches = completionBranches.map((branch) => {
      const damage = calculateForcedReturnDamage(
        time.overtimeDebt,
        route.estimatedReturnTime,
        branch.bleeding,
        dependencies.config.forcedReturn,
      )
      return {
        damage,
        finalHealth: Math.max(0, branch.health - damage.totalDamage),
      }
    })
    const effectiveTimes = forcedBranches.map(
      ({ damage }) => damage.effectiveEmergencyReturnTime,
    )
    const baseDamages = forcedBranches.map(({ damage }) => damage.baseDamage)
    const bleedingDamages = forcedBranches.map(({ damage }) => damage.bleedingExtraDamage)
    const totalDamages = forcedBranches.map(({ damage }) => damage.totalDamage)
    const finalHealths = forcedBranches.map(({ finalHealth }) => finalHealth)
    const survivesForcedReturn = finalHealths.some((health) => health > 0)
    const diesInAnyBranch = completionCheckpointDeathRisk !== 'none' ||
      finalHealths.some((health) => health === 0)
    return {
      ...option,
      terminal: {
        conditional: isAttack || diesInAnyBranch,
        condition: isAttack
          ? 'enemy-incapacitated' as const
          : diesInAnyBranch
            ? 'escape-survived' as const
            : null,
        deathRisk: !survivesForcedReturn
          ? 'guaranteed' as const
          : diesInAnyBranch
            ? 'possible' as const
            : 'none' as const,
        deathPriority: diesInAnyBranch,
        preCompletionDefeatRisk,
        completionCheckpointDeathRisk,
        completion: {
          ...baseCompletion,
          returnTimeMin: route.estimatedReturnTime,
          returnTimeMax: route.estimatedReturnTime,
          effectiveEmergencyReturnTimeMin: Math.min(...effectiveTimes),
          effectiveEmergencyReturnTimeMax: Math.max(...effectiveTimes),
          forcedReturnBaseDamageMin: Math.min(...baseDamages),
          forcedReturnBaseDamageMax: Math.max(...baseDamages),
          forcedReturnBleedingDamageMin: Math.min(...bleedingDamages),
          forcedReturnBleedingDamageMax: Math.max(...bleedingDamages),
          forcedReturnTotalDamageMin: Math.min(...totalDamages),
          forcedReturnTotalDamageMax: Math.max(...totalDamages),
          forcedReturnHealthMin: Math.min(...finalHealths),
          forcedReturnHealthMax: Math.max(...finalHealths),
          survivingResult: survivesForcedReturn
            ? 'forced-returned-scene' as const
            : null,
          forcedReturnTargetNodeName: nodeName(route.safetyNodeId, dependencies),
        },
      },
    }
  }))
}
