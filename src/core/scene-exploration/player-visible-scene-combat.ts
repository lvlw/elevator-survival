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
  terminal: Readonly<{
    conditional: boolean
    outcome: 'victory-if-incapacitated' | 'escape-if-survived'
    elapsedCtb: number
    sceneTimeCost: number
    remainingTimeAfter: number
    overtimeDebt: number
    returnTime: number | null
    forcedReturnBaseDamage: number | null
    forcedReturnBleedingDamageMin: number | null
    forcedReturnBleedingDamageMax: number | null
    forcedReturnTotalDamageMin: number | null
    forcedReturnTotalDamageMax: number | null
    deathPossible: boolean
  }> | null
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
    const elapsedCtb = isEscape
      ? option.preview.primary.completesAtCtb
      : active.combat.currentCtb
    const time = evaluateCombatSceneTime(
      elapsedCtb,
      snapshot.remainingTime,
      dependencies.config.combat.sceneTimeConversion,
    )
    if (time.remainingTimeAfter > 0) {
      return {
        ...option,
        terminal: {
          conditional: isAttack,
          outcome: isAttack
            ? 'victory-if-incapacitated' as const
            : 'escape-if-survived' as const,
          elapsedCtb,
          ...time,
          returnTime: null,
          forcedReturnBaseDamage: null,
          forcedReturnBleedingDamageMin: null,
          forcedReturnBleedingDamageMax: null,
          forcedReturnTotalDamageMin: null,
          forcedReturnTotalDamageMax: null,
          deathPossible: isEscape && option.preview.currentIntent.actsBeforeNextPlayerDecision,
        },
      }
    }
    const finalNodeId = isEscape ? active.returnNodeId : active.nodeId
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
    const definitelyBleeding = active.combat.playerCondition.bleeding
    const injuryCouldStartBleeding = isEscape &&
      option.preview.currentIntent.actsBeforeNextPlayerDecision &&
      option.preview.currentIntent.metadata.mayCauseInjury
    const withoutBleeding = calculateForcedReturnDamage(
      time.overtimeDebt,
      route.estimatedReturnTime,
      false,
      dependencies.config.forcedReturn,
    )
    const withBleeding = calculateForcedReturnDamage(
      time.overtimeDebt,
      route.estimatedReturnTime,
      definitelyBleeding || injuryCouldStartBleeding,
      dependencies.config.forcedReturn,
    )
    const bleedingMin = definitelyBleeding ? withBleeding.bleedingExtraDamage : 0
    const bleedingMax = withBleeding.bleedingExtraDamage
    const healthAfterOwnAction = option.preview.playerHealthAfterOwnAction
    return {
      ...option,
      terminal: {
        conditional: isAttack,
        outcome: isAttack
          ? 'victory-if-incapacitated' as const
          : 'escape-if-survived' as const,
        elapsedCtb,
        ...time,
        returnTime: route.estimatedReturnTime,
        forcedReturnBaseDamage: withoutBleeding.baseDamage,
        forcedReturnBleedingDamageMin: bleedingMin,
        forcedReturnBleedingDamageMax: bleedingMax,
        forcedReturnTotalDamageMin: withoutBleeding.baseDamage + bleedingMin,
        forcedReturnTotalDamageMax: withoutBleeding.baseDamage + bleedingMax,
        deathPossible: (
          isEscape && option.preview.currentIntent.actsBeforeNextPlayerDecision
        ) || healthAfterOwnAction <= withoutBleeding.baseDamage + bleedingMax,
      },
    }
  }))
}
