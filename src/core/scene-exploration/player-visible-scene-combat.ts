import {
  createPlayerVisibleCombatSnapshot,
  evaluateCombatSceneTime,
  getPlayerVisibleCombatActionOptions,
  type PlayerVisibleCombatActionOption,
} from '../combat'
import { calculateForcedReturnDamage } from '../scene'
import { deepFreeze } from '../config'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { SceneExplorationError } from './scene-exploration-errors'
import { findPlayerKnownReturnRoute } from './scene-navigation-return'
import type {
  SceneExplorationDependencies,
  SceneExplorationSnapshot,
} from './scene-exploration-types'

export type PlayerVisibleCombatDeathRisk = 'none' | 'possible' | 'guaranteed'
/**
 * What the player-safe command preview can establish about this one command.
 * `unknown` intentionally does not authorize a dynamic death-protection escape
 * hatch: a missing terminal projection is not evidence that the command is safe.
 */
export type PlayerVisibleCombatCommandDeathCertainty =
  | 'guaranteed'
  | 'not-guaranteed'
  | 'unknown'

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

export interface PlayerVisibleSceneCombatActionOption {
  readonly command: PlayerVisibleCombatActionOption['command']
  readonly preview: PlayerVisibleCombatActionOption['preview']
  readonly terminal: PlayerVisibleCombatTerminalPreview | null
  readonly deathCertainty: PlayerVisibleCombatCommandDeathCertainty
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
): readonly PlayerVisibleSceneCombatActionOption[] {
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
  const optionsWithTerminal = options.map((option) => {
    const isAttack = option.preview.primary.kind === 'attack'
    const isEscape = option.preview.primary.kind === 'escape'
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
    if (!isEscape && option.preview.playerHealthAfterOwnAction === 0) {
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
    if (!isAttack && !isEscape) return { ...option, terminal: null }
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
    const route = findPlayerKnownReturnRoute(snapshot, dependencies, {
      currentNodeId: finalNodeId,
      backpack: active.combat.backpack,
      condition: active.combat.playerCondition,
    })
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
  })
  return deepFreeze(optionsWithTerminal.map((option) => Object.freeze({
    ...option,
    deathCertainty: combatCommandDeathCertainty(option),
  })))
}

/**
 * Classifies only the formal command scope covered by the existing safe preview.
 * In particular, an attack's victory completion is conditional on hidden enemy
 * health, so its terminal result cannot be promoted to a whole-command death.
 */
function combatCommandDeathCertainty(input: Readonly<{
  preview: PlayerVisibleCombatActionOption['preview']
  terminal: PlayerVisibleCombatTerminalPreview | null
}>): PlayerVisibleCombatCommandDeathCertainty {
  const { preview, terminal } = input
  if (preview.primary.kind === 'escape') {
    const escape = preview.escapeConsequences
    if (!escape) return 'unknown'
    if (escape.preCompletionDeath || escape.completionCheckpointDeathGuaranteed) {
      return 'guaranteed'
    }
    // A guaranteed terminal applies to every completion branch that remains;
    // with an additional checkpoint-death branch this is still whole-command
    // death, not merely a conditional warning.
    if (terminal?.deathRisk === 'guaranteed') return 'guaranteed'
    if (escape.completionCheckpointDeathPossible) return 'unknown'
    return 'not-guaranteed'
  }
  if (preview.playerHealthAfterOwnAction === 0) return 'guaranteed'
  return preview.currentIntent.actsBeforeNextPlayerDecision
    ? 'unknown'
    : 'not-guaranteed'
}
