import {
  createPerformMainSearchCommand,
  createPerformSceneObstacleOptionCommand,
  createPerformSceneTaskEventCommand,
  createUseSceneMedicalItemCommand,
  createMoveThroughSceneEdgeCommand,
  createPickUpRevealedNodeItemCommand,
  createWithdrawFromSceneCommand,
  getPlayerVisibleSceneNodeState,
  getPlayerVisibleSceneObstacles,
  getPlayerVisibleSceneTaskEvents,
  getAvailableSceneMedicalCommands,
  getPlayerVisibleSceneCombatActionOptions,
  previewMainSearchCommand,
  previewNodeItemPickupCommand,
  previewSceneMoveCommand,
  previewPlayerVisibleSceneTaskEventCommand,
  previewPlayerVisibleSceneMedicalCommand,
  previewSceneWithdrawalCommand,
  type SearchIlluminationChoice,
  type SceneExplorationEffect,
  type SceneTaskRiskTier,
  type PlayerVisibleSceneMedicalEvaluation,
  type UseSceneMedicalItemCommand,
} from '../../core/scene-exploration'
import type { PlayerVisibleCombatActionPreview } from '../../core/combat'
import type { CombatPlayerActionCommand } from '../../core/combat'
import type { TimedSceneActionOutcome } from '../../core/scene'
import { previewBackpackPlacement } from '../../core/inventory'
import {
  createLaunchMainSceneCommand,
  getRunSceneRuntime,
  previewSceneLaunch,
} from '../../core/scene-launch'
import {
  createStableRunApplicationCommand,
  type StableRunApplicationCommand,
} from '../../state/run-application'
import {
  getStableRunPhaseIdentity,
  type StableRunPhase,
} from '../../state/run-save'
import {
  createStableRunLifecycleCommand,
  getStableRunLifecycleCommandAvailability,
} from '../../state/run-lifecycle'
import type { StableRunUiPresentationDependencies } from '../presentation'
import { getCurrentTraversableAdjacentEdges } from './current-traversable-adjacent-edges'

export type StableRunUiActionKind =
  | 'launch-main-scene'
  | 'scene-move'
  | 'scene-main-search'
  | 'scene-obstacle'
  | 'scene-task-event'
  | 'scene-medical'
  | 'scene-combat-action'
  | 'scene-withdraw'
  | 'settle-terminal-scene'

/** An internal reference only; ordinary player ViewModels never expose it. */
export interface StableRunUiPickupOpportunity {
  readonly id: string
  readonly name: string
  readonly groundQuantity: number
  readonly canRotate: boolean
}

export interface StableRunUiPickupDraft {
  readonly opportunityId: string
  readonly quantity: number
  readonly x: number
  readonly y: number
  readonly rotated: boolean
}

export interface StableRunUiPickupPreview {
  readonly canExecute: boolean
  readonly rejection: string | null
  readonly command: StableRunApplicationCommand | null
  readonly facts: readonly StableRunUiActionPreviewFact[]
  readonly candidateCells: readonly Readonly<{ x: number; y: number }> []
}

/** Internal option reference; it never contains the generated task item ID. */
export interface StableRunUiTaskEventOpportunity {
  readonly id: string
  readonly label: string
  readonly eventName: string
  readonly outputName: string
  readonly width: number
  readonly height: number
  readonly unitWeight: number
  readonly canRotate: boolean
}

export interface StableRunUiTaskEventDraft {
  readonly opportunityId: string
  readonly x: number
  readonly y: number
  readonly rotated: boolean
}

export interface StableRunUiTaskEventPreview {
  readonly canExecute: boolean
  readonly rejection: string | null
  readonly command: StableRunApplicationCommand | null
  readonly preview: StableRunUiActionPreviewViewModel | null
  readonly candidateCells: readonly Readonly<{ x: number; y: number }>[]
}

export interface StableRunUiActionPreviewFact {
  readonly label: string
  readonly value: string
}

/**
 * Explicit player-facing projection of a formal preview. It intentionally
 * contains no raw snapshots, Effects, identifiers, or pre-materialized
 * search outcomes.
 */
export interface StableRunUiActionPreviewViewModel {
  readonly title: string
  readonly facts: readonly StableRunUiActionPreviewFact[]
  readonly warnings: readonly string[]
  readonly branches: readonly Readonly<{
    title: string
    facts: readonly StableRunUiActionPreviewFact[]
    warnings: readonly string[]
  }>[]
}

export interface StableRunUiAction {
  readonly id: string
  readonly kind: StableRunUiActionKind
  readonly label: string
  /** Internal formal command; React submits it only after explicit confirm. */
  readonly command: StableRunApplicationCommand
  readonly preview: StableRunUiActionPreviewViewModel
}

export interface StableRunUiInteractionModel {
  readonly actions: readonly StableRunUiAction[]
  readonly pickupOpportunities: readonly StableRunUiPickupOpportunity[]
  readonly taskEventOpportunities: readonly StableRunUiTaskEventOpportunity[]
}

function freezePreview(
  title: string,
  facts: readonly StableRunUiActionPreviewFact[],
  warnings: readonly string[] = [],
  branches: StableRunUiActionPreviewViewModel['branches'] = [],
): StableRunUiActionPreviewViewModel {
  return Object.freeze({
    title,
    facts: Object.freeze(facts.map((fact) => Object.freeze({ ...fact }))),
    warnings: Object.freeze([...warnings]),
    branches: Object.freeze(branches.map((branch) => Object.freeze({
      title: branch.title,
      facts: Object.freeze(branch.facts.map((fact) => Object.freeze({ ...fact }))),
      warnings: Object.freeze([...branch.warnings]),
    }))),
  })
}

function sceneOutcomeWarnings(input: Readonly<{
  outcome: TimedSceneActionOutcome
  returnEstimate: number
}>): readonly string[] {
  const warnings: string[] = []
  if (input.outcome.overtimeDebt > 0) warnings.push(`超时债务：${input.outcome.overtimeDebt}`)
  if (input.outcome.kind === 'forced-return') warnings.push('行动完成后将进入强制返程。')
  if (input.outcome.kind === 'death') warnings.push('行动完成后生命将归零。')
  if (
    input.outcome.kind === 'continue' &&
    input.outcome.clock.remainingTime < input.returnEstimate
  ) warnings.push('行动后剩余时间低于预计安全返程线。')
  return Object.freeze(warnings)
}

/**
 * Player-facing allow-list of the formal timed-action result. No time or
 * forced-return formula is reimplemented in the interaction layer.
 */
function timedOutcomeFacts(
  outcome: TimedSceneActionOutcome,
): readonly StableRunUiActionPreviewFact[] {
  const healthFact: StableRunUiActionPreviewFact = {
    label: '行动后生命',
    value: String(outcome.vitals.currentHealth),
  }
  if (outcome.overtimeDebt === 0) return Object.freeze([healthFact])
  return Object.freeze([
    { label: '超时债务', value: String(outcome.overtimeDebt) },
    { label: '有效紧急撤离时间', value: String(outcome.effectiveEmergencyReturnTime) },
    { label: '强制返程基础损耗', value: String(outcome.forcedReturnBaseDamage) },
    { label: '强制返程流血追加', value: String(outcome.forcedReturnBleedingDamage) },
    { label: '强制返程总损耗', value: String(outcome.forcedReturnTotalDamage) },
    healthFact,
    { label: '死亡风险', value: outcome.isDead ? '将死亡' : '可生还' },
  ])
}

function applicationSceneCommand(
  kind: 'scene-move' | 'scene-main-search' | 'scene-node-item-pickup' | 'scene-withdraw' | 'scene-obstacle' | 'scene-task-event' | 'scene-medical' | 'scene-combat-action',
  command: unknown,
): StableRunApplicationCommand {
  return createStableRunApplicationCommand({
    kind: 'scene',
    command: { kind, command },
  })
}

function medicalItemName(kind: PlayerVisibleSceneMedicalEvaluation['medicalItem']): string {
  return kind === 'bandage'
    ? '绷带'
    : kind === 'painkiller'
      ? '止痛药'
      : kind === 'disinfectant'
        ? '消毒剂'
        : '急救包'
}

function medicalSourceLabel(result: PlayerVisibleSceneMedicalEvaluation): string {
  return result.source.container === 'backpack'
    ? `背包格 ${result.source.column},${result.source.row}`
    : `快捷栏${result.source.slotNumber}`
}

function medicalTargetLabel(result: PlayerVisibleSceneMedicalEvaluation): string | null {
  if (result.target.kind === 'none') return null
  if (result.target.kind === 'minor-contusion') return '轻度挫伤'
  return `${woundKindName(result.target.woundKind)} ${result.target.ordinal}`
}

function medicalActionId(command: UseSceneMedicalItemCommand): string {
  const source = command.source.container === 'backpack'
    ? `backpack:${command.source.itemInstanceId}`
    : `quick-slot:${command.source.quickSlotIndex}`
  const target = command.target?.kind === 'open-wound'
    ? `open-wound:${command.target.woundId}`
    : command.target?.kind ?? 'none'
  return `scene-medical:${source}:${target}`
}

function medicalActionLabel(result: PlayerVisibleSceneMedicalEvaluation): string {
  const item = medicalItemName(result.medicalItem)
  const source = medicalSourceLabel(result)
  const target = medicalTargetLabel(result)
  if (!target) return `使用${item} · ${source}`
  return result.medicalItem === 'bandage'
    ? `使用${item} · ${source} · 处理${target}`
    : `使用${item} · ${source} · 移除${target}`
}

function medicalPreviewFacts(
  result: PlayerVisibleSceneMedicalEvaluation,
): readonly StableRunUiActionPreviewFact[] {
  const facts: StableRunUiActionPreviewFact[] = [
    { label: '使用', value: medicalItemName(result.medicalItem) },
    { label: '来源', value: medicalSourceLabel(result) },
    { label: '物品数量', value: `${result.quantityBefore} → ${result.quantityAfter}` },
    { label: '行动时间', value: String(result.actionTime) },
    {
      label: '生命（主要效果）',
      value: `${result.healthBefore} → ${result.healthAfterPrimaryEffect}`,
    },
    { label: '实际生命恢复', value: String(result.actualHealthRecovery) },
    {
      label: '流血（主要效果）',
      value: `${result.bleedingBefore ? '是' : '否'} → ${result.bleedingAfterPrimaryEffect ? '是' : '否'}`,
    },
  ]
  const target = medicalTargetLabel(result)
  if (target) facts.push({
    label: result.woundChange === 'treated' ? '处理伤口' : '移除轻伤',
    value: target,
  })
  if (result.minorContusionRemoved) facts.push({ label: '轻度挫伤', value: '移除1个' })
  if (result.painkillerActivated) facts.push({ label: '镇痛', value: '将生效' })
  if (
    result.medicalItem === 'disinfectant' ||
    result.actualInfectionExposureReduction > 0
  ) {
    facts.push(
      {
        label: '未结算感染暴露',
        value: `${result.infectionExposureBefore} → ${result.infectionExposureAfter}`,
      },
      {
        label: '实际暴露减少',
        value: String(result.actualInfectionExposureReduction),
      },
      {
        label: '今日消毒剂',
        value: `${result.disinfectantUsesBefore} → ${result.disinfectantUsesAfter}`,
      },
    )
  }
  facts.push(
    { label: '行动前剩余时间', value: String(result.remainingTimeBefore) },
    { label: '行动后剩余时间', value: String(result.remainingTimeAfter) },
    { label: '行动后流血损失', value: String(result.postActionBleedingDamage) },
    { label: '行动后预计返程', value: String(result.returnEstimateAfterAction) },
    {
      label: '行动后返程预计剩余',
      value: result.estimatedRemainingTimeAfterReturn === null
        ? '当前不可预览'
        : String(result.estimatedRemainingTimeAfterReturn),
    },
    { label: '完成节点', value: result.completionNodeName },
    { label: '最终生命', value: String(result.finalHealth) },
    { label: '最终 Scene 状态', value: result.finalSceneStatus },
    ...timedOutcomeFacts(result.sceneOutcome),
  )
  return Object.freeze(facts)
}

function medicalPreviewWarnings(
  result: PlayerVisibleSceneMedicalEvaluation,
): readonly string[] {
  const warnings = [...sceneOutcomeWarnings({
    outcome: result.sceneOutcome,
    returnEstimate: result.returnEstimateAfterAction,
  })]
  if (result.finalSceneStatus === 'forced-returned') {
    warnings.push('本次只保存 forced-returned Scene Session；后续需要显式完成返程结算。')
  }
  if (result.finalSceneStatus === 'dead') {
    warnings.push('本次只保存 dead Scene Session；后续需要显式结算战败。')
  }
  return Object.freeze(warnings)
}

function woundKindName(kind: 'laceration' | 'puncture' | 'bite'): string {
  return kind === 'laceration' ? '撕裂伤' : kind === 'puncture' ? '穿刺伤' : '咬伤'
}

function combatActionLabel(
  command: CombatPlayerActionCommand,
  preview: PlayerVisibleCombatActionPreview,
): string {
  const { primary } = preview
  if (command.kind === 'metal-pipe-basic-attack') return '挥击'
  if (command.kind === 'metal-pipe-charged-strike') return '蓄力击打'
  if (command.kind === 'temporary-attack') return '临时攻击'
  if (command.kind === 'defend') return '防御'
  if (command.kind === 'escape') return '逃跑'
  if (primary.kind !== 'quick-slot-item') return '使用快捷物品'
  const item = primary.itemKind === 'bandage' ? '绷带' : '止痛药'
  return primary.targetWound
    ? `使用${item} · 处理${woundKindName(primary.targetWound.kind)} ${primary.targetWound.ordinal}`
    : `使用${item}`
}

function combatPreviewFacts(
  preview: PlayerVisibleCombatActionPreview,
  includeEscapeCompletionFacts = true,
): readonly StableRunUiActionPreviewFact[] {
  const facts: StableRunUiActionPreviewFact[] = [
    { label: '行动 CTB', value: String(preview.primary.actionCtb) },
  ]
  const primary = preview.primary
  if (primary.kind === 'attack') {
    facts.push({ label: '请求伤害', value: String(primary.requestedDamage) })
    if (
      primary.weaponDurabilityBefore !== null &&
      primary.weaponDurabilityAfter !== null
    ) facts.push({
      label: '武器耐久',
      value: `${primary.weaponDurabilityBefore} → ${primary.weaponDurabilityAfter}`,
    })
    if (primary.enemyActionDelay > 0) facts.push({
      label: '敌人行动延后',
      value: String(primary.enemyActionDelay),
    })
  } else if (primary.kind === 'defend') {
    facts.push(
      { label: '临时防御', value: '持续至下一次玩家行动前' },
      { label: '可处理攻击', value: '一次符合条件的敌人直接攻击' },
      { label: '感染暴露', value: '不负责阻止' },
    )
  } else if (primary.kind === 'quick-slot-item') {
    facts.push(
      { label: '快捷栏槽位', value: String(primary.quickSlotIndex + 1) },
      { label: '消耗', value: '真实物品单位 ×1；使用后槽位为空' },
    )
    if (primary.requestedHealthRecovery > 0) facts.push({
      label: '生命恢复',
      value: String(primary.actualHealthRecovery),
    })
    if (primary.stopsBleeding) facts.push({ label: '止血', value: '是' })
    if (primary.targetWound) facts.push({
      label: '处理伤口',
      value: `${woundKindName(primary.targetWound.kind)} ${primary.targetWound.ordinal}`,
    })
    if (primary.activatesPainkiller) facts.push({ label: '镇痛', value: '生效' })
  } else {
    facts.push(
      { label: '背包负重档位', value: loadTierName(primary.loadTier) },
      { label: '基础准备 CTB', value: String(primary.baseCtb) },
      { label: '伤口追加 CTB', value: String(primary.rawWoundCtb) },
      { label: '镇痛抵消 CTB', value: String(primary.painkillerReductionApplied) },
      { label: '最终伤口追加', value: String(primary.finalWoundCtb) },
      { label: '最终准备 CTB', value: String(primary.actionCtb) },
    )
    const escape = preview.escapeConsequences
    if (escape && includeEscapeCompletionFacts) facts.push(
      { label: '脱离完成 CTB', value: String(primary.completesAtCtb) },
      {
        label: '脱离完成流血损失',
        value: escape.postPlayerActionBleedingDamageMin ===
          escape.postPlayerActionBleedingDamageMax
          ? String(escape.postPlayerActionBleedingDamageMin)
          : `${escape.postPlayerActionBleedingDamageMin}–${escape.postPlayerActionBleedingDamageMax}`,
      },
      {
        label: '脱离完成后生命',
        value: escape.playerHealthAfterCompletionMin ===
          escape.playerHealthAfterCompletionMax
          ? String(escape.playerHealthAfterCompletionMin)
          : `${escape.playerHealthAfterCompletionMin}–${escape.playerHealthAfterCompletionMax}`,
      },
    )
  }
  if (primary.kind !== 'escape') facts.push(
    { label: '自身行动后流血损失', value: String(preview.postPlayerActionBleedingDamage) },
    { label: '自身行动阶段后生命', value: String(preview.playerHealthAfterOwnAction) },
  )
  facts.push({
    label: '当前公开意图',
    value: preview.currentIntent.actsBeforeNextPlayerDecision
      ? '将在下一次玩家决策（或脱离完成）前执行'
      : '不会在下一次玩家决策（或脱离完成）前执行',
  })
  return Object.freeze(facts)
}

type PlayerVisibleSceneCombatOption = ReturnType<
  typeof getPlayerVisibleSceneCombatActionOptions
>[number]

function combatTerminalFacts(
  completion: NonNullable<NonNullable<PlayerVisibleSceneCombatOption['terminal']>['completion']>,
  deathRisk: NonNullable<PlayerVisibleSceneCombatOption['terminal']>['deathRisk'],
): readonly StableRunUiActionPreviewFact[] {
  const facts: StableRunUiActionPreviewFact[] = [
    {
      label: completion.outcome === 'defeat' ? '战败节点' : '完成节点',
      value: completion.nodeName,
    },
    { label: '当前剩余 Scene 时间', value: String(completion.currentRemainingTime) },
    { label: '战斗结束累计 CTB', value: String(completion.elapsedCtb) },
    { label: '战斗场景时间', value: String(completion.sceneTimeCost) },
    { label: '结算后剩余时间', value: String(completion.remainingTimeAfter) },
    {
      label: '战斗完成后生命',
      value: rangeValue(
        completion.combatCompletionHealthMin,
        completion.combatCompletionHealthMax,
      ),
    },
  ]
  if (completion.overtimeDebt > 0) {
    facts.push({ label: '超时债务', value: String(completion.overtimeDebt) })
  }
  if (completion.returnTimeMin !== null && completion.returnTimeMax !== null) {
    facts.push({
      label: '预计返程时间',
      value: rangeValue(completion.returnTimeMin, completion.returnTimeMax),
    })
  }
  if (
    completion.effectiveEmergencyReturnTimeMin !== null &&
    completion.effectiveEmergencyReturnTimeMax !== null &&
    completion.forcedReturnBaseDamageMin !== null &&
    completion.forcedReturnBaseDamageMax !== null &&
    completion.forcedReturnBleedingDamageMin !== null &&
    completion.forcedReturnBleedingDamageMax !== null &&
    completion.forcedReturnTotalDamageMin !== null &&
    completion.forcedReturnTotalDamageMax !== null &&
    completion.forcedReturnHealthMin !== null &&
    completion.forcedReturnHealthMax !== null
  ) {
    facts.push(
      {
        label: '有效紧急撤离时间',
        value: rangeValue(
          completion.effectiveEmergencyReturnTimeMin,
          completion.effectiveEmergencyReturnTimeMax,
        ),
      },
      {
        label: '强制返程基础损耗',
        value: rangeValue(
          completion.forcedReturnBaseDamageMin,
          completion.forcedReturnBaseDamageMax,
        ),
      },
      {
        label: '强制返程流血追加',
        value: rangeValue(
          completion.forcedReturnBleedingDamageMin,
          completion.forcedReturnBleedingDamageMax,
        ),
      },
      {
        label: '强制返程总损耗',
        value: rangeValue(
          completion.forcedReturnTotalDamageMin,
          completion.forcedReturnTotalDamageMax,
        ),
      },
      {
        label: '强制返程后生命',
        value: rangeValue(
          completion.forcedReturnHealthMin,
          completion.forcedReturnHealthMax,
        ),
      },
    )
  }
  facts.push({
    label: '死亡风险',
    value: deathRisk === 'guaranteed'
      ? '将死亡'
      : deathRisk === 'possible'
        ? '可能'
        : '未发现',
  })
  if (completion.survivingResult !== null) facts.push({
    label: '生还结果',
    value: completion.survivingResult === 'active-scene'
      ? '继续 active Scene'
      : 'forced-returned Scene',
  })
  if (completion.forcedReturnTargetNodeName !== null) facts.push({
    label: '强制返程目标',
    value: completion.forcedReturnTargetNodeName,
  })
  if (completion.survivingResult === 'active-scene') {
    facts.push({ label: '后续流程', value: '继续当前 active Scene' })
  } else if (completion.survivingResult === 'forced-returned-scene') {
    facts.push({
      label: '生命周期结算',
      value: '本次仅保存 forced-returned Scene Session；后续由独立 settle-terminal-scene 命令处理',
    })
  } else if (completion.outcome === 'defeat' || deathRisk === 'guaranteed') {
    facts.push({
      label: '生命周期结算',
      value: '本次仅保存 dead Scene Session；后续由独立 settle-terminal-scene 命令进入 Run Failure',
    })
  }
  return Object.freeze(facts)
}

function rangeValue(minimum: number, maximum: number): string {
  return minimum === maximum ? String(minimum) : `${minimum}–${maximum}`
}

function createCombatActions(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiAction[] {
  const scene = phase.payload.scene
  if (scene.status !== 'combat') return Object.freeze([])
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  return Object.freeze(getPlayerVisibleSceneCombatActionOptions(
    scene,
    runtime.dependencies,
  ).map((option) => {
    const { command, preview, terminal } = option
    const label = combatActionLabel(command, preview)
    const target = command.kind === 'use-quick-slot-item'
      ? `:${command.quickSlotIndex}:${command.targetOpenWoundId ?? 'none'}`
      : ''
    const warnings: string[] = []
    if (
      preview.primary.kind === 'attack' &&
      preview.primary.weaponDurabilityBefore !== null &&
      preview.primary.weaponDurabilityAfter === 0
    ) warnings.push('本次行动后武器将损坏。')
    if (preview.currentIntent.actsBeforeNextPlayerDecision) {
      warnings.push('当前公开意图将在你下次决策或完成脱离前执行。')
    }
    const terminalWarnings = terminal === null
      ? []
      : [
          ...(terminal.completion?.overtimeDebt
            ? ['战斗若在本次行动结束，将跨越场景时间零点。']
            : []),
          ...(terminal.deathRisk === 'possible' ? ['该终局存在玩家死亡分支。'] : []),
          ...(terminal.deathRisk === 'guaranteed' ? ['玩家将在本次行动结算中死亡。'] : []),
          ...(terminal.deathPriority && isAttackCommand(command)
            ? ['玩家死亡优先于任何潜在胜利，不会提交战斗胜利。']
            : []),
          ...(terminal.completionCheckpointDeathRisk === 'guaranteed'
            ? ['脱离完成主要效果后，行动后流血将使生命归零；玩家死亡优先于逃跑成功。']
            : []),
        ]
    const completionFacts = terminal?.completion
      ? combatTerminalFacts(terminal.completion, terminal.deathRisk)
      : []
    const completionBranches = terminal?.conditional && terminal.completion
      ? [{
          title: terminal.condition === 'enemy-incapacitated'
            ? '若本次攻击使敌人失去能力'
            : '若成功完成脱离',
          facts: completionFacts,
          warnings: terminalWarnings,
        }]
      : []
    const preCompletionDefeatBranches = terminal?.preCompletionDefeatRisk === 'possible'
      ? [{
          title: '若在脱离完成前战败',
          facts: [
            { label: '脱离结果', value: '不完成脱离' },
            { label: '节点变化', value: '不返回脱离节点' },
            { label: '强制返程', value: '不进入强制返程' },
            { label: '战败场景时间', value: '按实际终止 CTB 正式结算' },
          ],
          warnings: ['玩家死亡优先于脱离完成。'],
        }]
      : []
    const completionCheckpointDeathBranches = terminal?.completionCheckpointDeathRisk === 'possible'
      ? [{
          title: '若在脱离完成检查点因流血战败',
          facts: [
            {
              label: '脱离完成 CTB',
              value: String(
                preview.primary.kind === 'escape'
                  ? preview.primary.completesAtCtb
                  : preview.primary.actionCtb,
              ),
            },
            { label: '主要效果', value: '到达已锁定脱离完成检查点' },
            { label: '完成后流血', value: '生命归零' },
            { label: '逃跑结果', value: '玩家死亡优先，不提交逃跑成功' },
            { label: '节点变化', value: '不返回脱离节点' },
            { label: '强制返程', value: '不进入强制返程' },
            {
              label: '生命周期结算',
              value: '本次仅保存 dead Scene Session；后续由独立 settle-terminal-scene 命令进入 Run Failure',
            },
          ],
          warnings: ['该分支在脱离完成检查点结算，不属于脱离完成前战败。'],
        }]
      : []
    const branches = [
      ...completionBranches,
      ...preCompletionDefeatBranches,
      ...completionCheckpointDeathBranches,
    ]
    const noCompletionDeathFacts = terminal && !terminal.completion
      ? [
          {
            label: '死亡风险',
            value: terminal.deathRisk === 'guaranteed' ? '将死亡' : '可能',
          },
          {
            label: '生命周期结算',
            value: '本次仅保存 dead Scene Session；后续由独立 settle-terminal-scene 命令进入 Run Failure',
          },
        ]
      : []
    const baseCombatFacts = combatPreviewFacts(
      preview,
      terminal?.preCompletionDefeatRisk !== 'guaranteed',
    )
    return Object.freeze({
      id: `scene-combat-action:${command.kind}${target}`,
      kind: 'scene-combat-action' as const,
      label,
      command: applicationSceneCommand('scene-combat-action', command),
      preview: freezePreview(
        `确认${label}`,
        terminal !== null && !terminal.conditional
          ? [...baseCombatFacts, ...completionFacts, ...noCompletionDeathFacts]
          : baseCombatFacts,
        [
          ...warnings,
          ...(terminal !== null && !terminal.conditional ? terminalWarnings : []),
          ...(terminal?.preCompletionDefeatRisk === 'guaranteed'
            ? ['玩家将在脱离完成前战败，不会返回脱离节点，也不会进入强制返程。']
            : []),
        ],
        branches,
      ),
    })
  }))
}

function isAttackCommand(command: CombatPlayerActionCommand): boolean {
  return command.kind === 'metal-pipe-basic-attack' ||
    command.kind === 'metal-pipe-charged-strike' ||
    command.kind === 'temporary-attack'
}

function riskTierName(
  tier: 'none' | 'low' | 'medium' | 'high' | 'very-high',
): string {
  return tier === 'none'
    ? '无'
    : tier === 'low'
      ? '低'
      : tier === 'medium'
        ? '中'
        : tier === 'high'
          ? '高'
          : '极高'
}

function outcomeName(kind: TimedSceneActionOutcome['kind']): string {
  return kind === 'continue'
    ? '继续探索'
    : kind === 'forced-return'
      ? '强制返回'
      : kind === 'death'
        ? '死亡'
        : '安全返回'
}

function loadTierName(tier: 'normal' | 'loaded' | 'overloaded'): string {
  return tier === 'normal' ? '正常' : tier === 'loaded' ? '负载' : '超载'
}

function createLaunchAction(
  phase: Extract<StableRunPhase, { kind: 'current-day-hub' }>,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiAction | null {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const command = createLaunchMainSceneCommand({ kind: 'launch-main-scene' })
  const preview = previewSceneLaunch(phase.payload, command, rules.sceneLaunch)
  if (!preview.canExecute) return null
  const initialScene = preview.result.session.scene
  return Object.freeze({
    id: 'launch-main-scene',
    kind: 'launch-main-scene',
    label: `进入 ${dependencies.labels.sceneName(
      rules.sceneLaunch.content.sceneDefinitionId,
    )}`,
    command: createStableRunApplicationCommand({ kind: 'lifecycle', command }),
    preview: freezePreview('确认进入主要场景', [
      { label: '进入', value: dependencies.labels.sceneName(rules.sceneLaunch.content.sceneDefinitionId) },
      { label: '当前游戏日', value: `第 ${phase.payload.continuity.currentDay} 日` },
      { label: '场景初始时间', value: String(initialScene.remainingTime) },
      { label: '今日主要场景', value: '确认后将被使用' },
    ]),
  })
}

function createMoveActions(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiAction[] {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const scene = phase.payload.scene
  if (scene.status !== 'active') return Object.freeze([])
  return Object.freeze(getCurrentTraversableAdjacentEdges(scene, runtime).flatMap((edge) => {
    const command = createMoveThroughSceneEdgeCommand({ edgeId: edge.edgeId })
    const preview = previewSceneMoveCommand(scene, command, runtime.dependencies)
    if (!preview.canExecute) return []
    const result = preview.result
    const outcome = result.sceneOutcome
    const time = sceneTimeFacts(result.effects)
    return [Object.freeze({
      id: `scene-move:${edge.edgeId}`,
      kind: 'scene-move' as const,
      label: `前往 ${edge.destinationNodeName}`,
      command: applicationSceneCommand('scene-move', command),
      preview: freezePreview(`确认前往 ${edge.destinationNodeName}`, [
        { label: '目标节点', value: edge.destinationNodeName },
        { label: '本次移动耗时', value: String(result.finalMovementTime) },
        { label: '行动前剩余时间', value: String(time.before) },
        { label: '行动后剩余时间', value: String(time.after) },
        { label: '行动后预计返程', value: String(result.returnRoute.estimatedReturnTime) },
        ...timedOutcomeFacts(outcome),
      ], sceneOutcomeWarnings({
        outcome,
        returnEstimate: result.returnRoute.estimatedReturnTime,
      })),
    })]
  }))
}

function illuminationLabel(choice: SearchIlluminationChoice): string {
  return choice === 'use-equipped-flashlight' ? '使用手电筒' : '无照明'
}

function isMainSearchIlluminationConsumption(
  effect: SceneExplorationEffect,
): effect is Extract<SceneExplorationEffect, {
  readonly kind: 'item-resource-consumed'
}> {
  return effect.kind === 'item-resource-consumed' &&
    effect.source === 'main-search-illumination'
}

function sceneTimeFacts(
  effects: readonly SceneExplorationEffect[],
): Readonly<{ before: number; after: number }> {
  const time = effects.find((effect): effect is Extract<SceneExplorationEffect, {
    readonly kind: 'scene-time-resolved'
  }> => effect.kind === 'scene-time-resolved')
  if (!time) throw new Error('正式场景 Preview 缺少时间结算事实')
  return Object.freeze({ before: time.remainingTimeBefore, after: time.remainingTimeAfter })
}

function createSearchActions(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiAction[] {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const scene = phase.payload.scene
  if (scene.status !== 'active') return Object.freeze([])
  const choices: readonly SearchIlluminationChoice[] = Object.freeze([
    'use-equipped-flashlight',
    'search-without-flashlight',
  ])
  return Object.freeze(choices.flatMap((illumination) => {
    const command = createPerformMainSearchCommand({ illumination })
    const preview = previewMainSearchCommand(scene, command, runtime.dependencies)
    if (!preview.canExecute) return []
    const result = preview.result
    const resource = result.effects.find(isMainSearchIlluminationConsumption)
    const time = sceneTimeFacts(result.effects)
    const facts: StableRunUiActionPreviewFact[] = [
      { label: '搜索方式', value: illuminationLabel(illumination) },
      { label: '行动耗时', value: String(result.actionTime) },
      { label: '行动前剩余时间', value: String(time.before) },
      { label: '行动后剩余时间', value: String(time.after) },
      { label: '行动后预计返程', value: String(result.returnRoute.estimatedReturnTime) },
    ]
    if (resource) facts.push({
      label: '照明资源',
      value: `${resource.currentBefore} → ${resource.currentAfter}`,
    })
    facts.push(...timedOutcomeFacts(result.sceneOutcome))
    return [Object.freeze({
      id: `scene-main-search:${illumination}`,
      kind: 'scene-main-search' as const,
      label: `主要搜索 · ${illuminationLabel(illumination)}`,
      command: applicationSceneCommand('scene-main-search', command),
      preview: freezePreview('确认主要搜索', facts, sceneOutcomeWarnings({
        outcome: result.sceneOutcome,
        returnEstimate: result.returnRoute.estimatedReturnTime,
      })),
    })]
  }))
}

function obstacleOutcomeFacts(
  actionTime: number,
  outcome: TimedSceneActionOutcome,
  returnEstimate: number,
): readonly StableRunUiActionPreviewFact[] {
  return Object.freeze([
    { label: '行动耗时', value: String(actionTime) },
    { label: '行动后剩余时间', value: String(outcome.clock.remainingTime) },
    { label: '行动后预计返程', value: String(returnEstimate) },
    { label: '预计结果', value: outcomeName(outcome.kind) },
    ...timedOutcomeFacts(outcome),
  ])
}

function createObstacleActions(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiAction[] {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const scene = phase.payload.scene
  if (scene.status !== 'active') return Object.freeze([])

  return Object.freeze(getPlayerVisibleSceneObstacles(scene, runtime.dependencies).flatMap(
    (obstacle) => obstacle.options.map((option) => {
      const optionName = dependencies.labels.obstacleOptionName(option.command.optionId)
      const facts: StableRunUiActionPreviewFact[] = [
        { label: '处理方式', value: optionName },
        { label: '是否触发警觉', value: option.setsAlert ? '是' : '否' },
      ]
      if (option.resourceChange) {
        const definition = runtime.dependencies.physicalCatalog.get(
          option.resourceChange.definitionId,
        )
        facts.push({
          label: dependencies.labels.itemName(
            option.resourceChange.definitionId,
            definition.name,
          ),
          value: `${option.resourceChange.currentBefore} → ${option.resourceChange.currentAfter}`,
        })
      }
      for (const spawned of option.spawnedItems) {
        const definition = runtime.dependencies.physicalCatalog.get(spawned.definitionId)
        facts.push({
          label: '节点地面产物',
          value: `${dependencies.labels.itemName(spawned.definitionId, definition.name)} ×${spawned.quantity}`,
        })
      }
      if (option.injuryRiskTier !== null) {
        facts.push({ label: '轻度挫伤风险', value: riskTierName(option.injuryRiskTier) })
        facts.push({
          label: '冲击防护',
          value: option.impactProtectionActive ? '当前防护装备生效' : '未生效',
        })
      }

      const deterministic = option.outcomes.find(({ kind }) => kind === 'deterministic')
      const warnings = deterministic
        ? sceneOutcomeWarnings({
            outcome: deterministic.sceneOutcome,
            returnEstimate: deterministic.returnRoute.estimatedReturnTime,
          })
        : []
      if (deterministic) {
        facts.push(...obstacleOutcomeFacts(
          option.actionTime,
          deterministic.sceneOutcome,
          deterministic.returnRoute.estimatedReturnTime,
        ))
      } else {
        facts.push({ label: '行动耗时', value: String(option.actionTime) })
      }

      const branches = option.outcomes.flatMap((branch) => branch.kind === 'deterministic'
        ? []
        : [{
            title: branch.kind === 'minor-contusion' ? '若产生轻度挫伤' : '若未产生轻度挫伤',
            facts: obstacleOutcomeFacts(
              option.actionTime,
              branch.sceneOutcome,
              branch.returnRoute.estimatedReturnTime,
            ),
            warnings: sceneOutcomeWarnings({
              outcome: branch.sceneOutcome,
              returnEstimate: branch.returnRoute.estimatedReturnTime,
            }),
          }])
      return Object.freeze({
        id: `scene-obstacle:${option.command.obstacleId}:${option.command.optionId}`,
        kind: 'scene-obstacle' as const,
        label: `${dependencies.labels.obstacleName(obstacle.obstacleId)} · ${optionName}`,
        command: applicationSceneCommand(
          'scene-obstacle',
          createPerformSceneObstacleOptionCommand(option.command),
        ),
        preview: freezePreview(
          `确认${optionName}`,
          facts,
          warnings,
          branches,
        ),
      })
    }),
  ))
}

function taskEventFacts(
  result: Extract<
    ReturnType<typeof previewPlayerVisibleSceneTaskEventCommand>,
    { readonly canExecute: true }
  >['result'],
  outputName: string,
): readonly StableRunUiActionPreviewFact[] {
  if (result.kind === 'decline') {
    return Object.freeze([
      { label: '处理方式', value: '放弃提取' },
      { label: '行动耗时', value: '0' },
      { label: '取得样本箱', value: '否' },
      { label: '污染风险', value: '无' },
      { label: '场景时间', value: '保持不变' },
      { label: '任务事件', value: '仍可稍后重新选择' },
    ])
  }
  if (!result.output || !result.returnRoute || !result.sceneOutcome) {
    throw new Error('正式任务事件安全 Preview 缺少提取结果')
  }
  const outcome = result.sceneOutcome
  const facts: StableRunUiActionPreviewFact[] = [
    {
      label: '处理方式',
      value: result.extractionMode === 'cautious' ? '谨慎检查并提取' : '直接取出',
    },
    { label: '行动耗时', value: String(result.actionTime) },
    { label: '污染风险', value: riskTierName(result.effectiveRiskTier) },
    {
      label: '厚实外套保护',
      value: result.impactProtection.active ? '生效' : '未生效',
    },
  ]
  if (
    result.impactProtection.active &&
    result.impactProtection.integrityBefore !== null &&
    result.impactProtection.integrityAfter !== null
  ) {
    facts.push({
      label: '外套完整度',
      value: `${result.impactProtection.integrityBefore} → ${result.impactProtection.integrityAfter}`,
    })
  }
  facts.push(
    { label: '取得', value: `${outputName} ×${result.output.quantity}` },
    {
      label: '样本箱尺寸',
      value: `${result.output.width}×${result.output.height}`,
    },
    { label: '样本箱重量', value: String(result.output.unitWeight) },
    {
      label: '背包负重',
      value: `${result.backpackWeightBefore} → ${result.backpackWeightAfter}`,
    },
    { label: '取得后负重档位', value: loadTierName(result.loadTierAfter) },
    {
      label: '样本来源情报',
      value: result.originIntelWillBeRecorded ? '将记录' : '已记录',
    },
    {
      label: '可能感染暴露',
      value: result.possibleExposureAmount === 0
        ? '无'
        : `未结算感染暴露 +${result.possibleExposureAmount}`,
    },
    { label: '行动前剩余时间', value: String(result.remainingTimeBefore) },
    { label: '行动后剩余时间', value: String(outcome.clock.remainingTime) },
    { label: '行动后预计返程时间', value: String(result.returnRoute.estimatedReturnTime) },
    {
      label: '行动后返程预计剩余',
      value: String(result.estimatedRemainingTimeAfterReturn),
    },
    ...timedOutcomeFacts(outcome).map((fact) =>
      outcome.overtimeDebt > 0 && fact.label === '行动后生命'
        ? { ...fact, label: '强制返程后生命' }
        : fact),
  )
  if (outcome.overtimeDebt > 0) {
    facts.push({ label: '完成节点', value: result.completionNodeName })
  }
  return Object.freeze(facts)
}

function taskEventWarnings(
  result: Extract<
    ReturnType<typeof previewPlayerVisibleSceneTaskEventCommand>,
    { readonly canExecute: true }
  >['result'],
): readonly string[] {
  if (!result.sceneOutcome || !result.returnRoute) return Object.freeze([])
  const warnings = [...sceneOutcomeWarnings({
    outcome: result.sceneOutcome,
    returnEstimate: result.returnRoute.estimatedReturnTime,
  })]
  if (result.sceneOutcome.kind === 'forced-return') {
    warnings.push('若生还，本次只保存 forced-returned Scene；样本箱仍在 Scene 随身状态中，后续显式返程结算才会安全转入任务储存区。')
  }
  if (result.sceneOutcome.kind === 'death') {
    warnings.push('本次行动后玩家将死亡；样本箱不会安全入库，也不会进入中枢。')
  } else {
    warnings.push('取得样本箱不等于安全提取或主任务完成；必须安全返回后才会转入任务储存区。')
  }
  return Object.freeze(warnings)
}

function taskEventContext(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
) {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  return { runtime, scene: phase.payload.scene }
}

function createTaskEventInteraction(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): Readonly<{
  actions: readonly StableRunUiAction[]
  opportunities: readonly StableRunUiTaskEventOpportunity[]
}> {
  const { runtime, scene } = taskEventContext(phase, dependencies)
  if (scene.status !== 'active') {
    return Object.freeze({ actions: Object.freeze([]), opportunities: Object.freeze([]) })
  }
  const actions: StableRunUiAction[] = []
  const opportunities: StableRunUiTaskEventOpportunity[] = []
  for (const event of getPlayerVisibleSceneTaskEvents(scene, runtime.dependencies)) {
    const definition = runtime.dependencies.taskEventCatalog.get(event.eventId)
    const outputDefinition = runtime.dependencies.physicalCatalog.get(
      definition.outputDefinitionId,
    )
    for (const option of event.options) {
      const label = dependencies.labels.taskEventOptionName(option.optionId)
      if (option.requiresBackpackPlacement) {
        opportunities.push(Object.freeze({
          id: `${event.eventId}:${option.optionId}`,
          label,
          eventName: dependencies.labels.taskEventName(event.eventId),
          outputName: dependencies.labels.itemName(
            outputDefinition.id,
            outputDefinition.name,
          ),
          width: outputDefinition.width,
          height: outputDefinition.height,
          unitWeight: outputDefinition.unitWeight,
          canRotate: outputDefinition.canRotate,
        }))
        continue
      }
      const command = createPerformSceneTaskEventCommand({
        eventId: event.eventId,
        optionId: option.optionId,
      })
      const safe = previewPlayerVisibleSceneTaskEventCommand(
        scene,
        command,
        runtime.dependencies,
      )
      if (!safe.canExecute) continue
      actions.push(Object.freeze({
        id: `scene-task-event:${event.eventId}:${option.optionId}`,
        kind: 'scene-task-event',
        label,
        command: applicationSceneCommand('scene-task-event', command),
        preview: freezePreview(
          `确认${label}`,
          taskEventFacts(safe.result, dependencies.labels.itemName(
            outputDefinition.id,
            outputDefinition.name,
          )),
        ),
      }))
    }
  }
  return Object.freeze({
    actions: Object.freeze(actions),
    opportunities: Object.freeze(opportunities),
  })
}

/**
 * Rebuilds a task-event placement preview from the current canonical Scene.
 * It never stores raw risk facts and never derives the output instance ID.
 */
export function previewStableRunUiTaskEventDraft(
  phase: StableRunPhase,
  draft: StableRunUiTaskEventDraft,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiTaskEventPreview | null {
  if (phase.kind !== 'scene-session' || phase.payload.scene.status !== 'active') return null
  const interaction = createTaskEventInteraction(phase, dependencies)
  const opportunity = interaction.opportunities.find(({ id }) => id === draft.opportunityId)
  if (!opportunity) return null
  const separator = draft.opportunityId.lastIndexOf(':')
  if (separator <= 0) return null
  const eventId = draft.opportunityId.slice(0, separator)
  const optionId = draft.opportunityId.slice(separator + 1)
  const { runtime, scene } = taskEventContext(phase, dependencies)
  let command
  try {
    command = createPerformSceneTaskEventCommand({
      eventId,
      optionId,
      placement: { x: draft.x, y: draft.y, rotated: draft.rotated },
    })
  } catch {
    return Object.freeze({
      canExecute: false,
      rejection: '样本箱放置参数无效。',
      command: null,
      preview: null,
      candidateCells: Object.freeze([]),
    })
  }
  const safe = previewPlayerVisibleSceneTaskEventCommand(
    scene,
    command,
    runtime.dependencies,
  )
  if (!safe.canExecute) {
    return Object.freeze({
      canExecute: false,
      rejection: safe.rejectionCode === 'ACTION_NOT_AVAILABLE'
        ? '当前背包布局、位置或负重无法放置样本箱。'
        : '任务事件状态已变化，请重新选择。',
      command: null,
      preview: null,
      candidateCells: Object.freeze([]),
    })
  }
  return Object.freeze({
    canExecute: true,
    rejection: null,
    command: applicationSceneCommand('scene-task-event', command),
    preview: freezePreview(
      `确认${opportunity.label}`,
      taskEventFacts(safe.result, opportunity.outputName),
      taskEventWarnings(safe.result),
    ),
    candidateCells: Object.freeze(
      safe.result.output?.placementCells.map(({ x, y }) => Object.freeze({ x, y })) ?? [],
    ),
  })
}

function createMedicalActions(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiAction[] {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const scene = phase.payload.scene
  return Object.freeze(getAvailableSceneMedicalCommands(
    scene,
    runtime.dependencies,
  ).flatMap((commandInput) => {
    const command = createUseSceneMedicalItemCommand(commandInput)
    const preview = previewPlayerVisibleSceneMedicalCommand(
      scene,
      command,
      runtime.dependencies,
    )
    if (!preview.canExecute) return []
    const result = preview.result
    return [Object.freeze({
      id: medicalActionId(command),
      kind: 'scene-medical' as const,
      label: medicalActionLabel(result),
      command: applicationSceneCommand('scene-medical', command),
      preview: freezePreview(
        `确认使用${medicalItemName(result.medicalItem)}`,
        medicalPreviewFacts(result),
        medicalPreviewWarnings(result),
      ),
    })]
  }))
}

function createWithdrawalAction(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiAction | null {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const scene = phase.payload.scene
  if (scene.status !== 'active') return null
  const command = createWithdrawFromSceneCommand({ kind: 'withdraw-from-scene' })
  const preview = previewSceneWithdrawalCommand(scene, command, runtime.dependencies)
  if (!preview.canExecute) return null
  const result = preview.result
  const route = result.returnRoute.nodeIds.map((nodeId) =>
    runtime.dependencies.graph.nodes.find(({ id }) => id === nodeId)?.name ?? nodeId,
  ).join(' → ')
  const outcome = result.sceneOutcome
  return Object.freeze({
    id: 'scene-withdraw',
    kind: 'scene-withdraw',
    label: '主动撤离',
    command: applicationSceneCommand('scene-withdraw', command),
    preview: freezePreview('确认主动撤离', [
      { label: '返程路线', value: route },
      { label: '预计返程时间', value: String(result.returnRoute.estimatedReturnTime) },
      { label: '当前剩余时间', value: String(scene.remainingTime) },
      { label: '返程后预计剩余时间', value: String(result.snapshot.remainingTime) },
      { label: '返程后生命', value: String(result.snapshot.condition.currentHealth) },
      { label: '预计结果', value: result.snapshot.status === 'safe-returned' ? '安全返回' : result.snapshot.status === 'forced-returned' ? '强制返回' : '死亡' },
      ...(outcome ? timedOutcomeFacts(outcome) : []),
    ], outcome ? sceneOutcomeWarnings({
      outcome,
      returnEstimate: result.returnRoute.estimatedReturnTime,
    }) : []),
  })
}

function createSettlementAction(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
): StableRunUiAction | null {
  const command = createStableRunLifecycleCommand({ kind: 'settle-terminal-scene' })
  const availability = getStableRunLifecycleCommandAvailability(phase, command)
  if (!availability.canExecute || availability.settlementOutcome === null) return null
  const returning = availability.settlementOutcome === 'return-to-hub'
  return Object.freeze({
    id: 'settle-terminal-scene',
    kind: 'settle-terminal-scene',
    label: returning ? '完成返程结算' : '结算战败',
    command: createStableRunApplicationCommand({ kind: 'lifecycle', command }),
    preview: freezePreview(
      returning ? '确认完成返程结算' : '确认结算战败',
      returning
        ? [
            { label: '结果', value: '进入电梯中枢' },
            { label: '日期', value: '不会因此推进' },
          ]
        : [{ label: '结果', value: '进入 Run Failure' }],
    ),
  })
}

function pickupOpportunities(
  phase: Extract<StableRunPhase, { kind: 'scene-session' }>,
  dependencies: StableRunUiPresentationDependencies,
): readonly StableRunUiPickupOpportunity[] {
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const scene = phase.payload.scene
  if (scene.status !== 'active') return Object.freeze([])
  return Object.freeze(getPlayerVisibleSceneNodeState(scene, scene.currentNodeId).groundItems.map((item) => {
    const definition = runtime.dependencies.physicalCatalog.get(item.definitionId)
    return Object.freeze({
      id: item.instanceId,
      name: dependencies.labels.itemName(item.definitionId, definition.name),
      groundQuantity: item.quantity,
      canRotate: definition.canRotate,
    })
  }))
}

/**
 * Re-reads the current canonical Scene every time a draft changes. It does
 * not retain a raw preview, perform auto-placement, or create item identities.
 */
export function previewStableRunUiPickupDraft(
  phase: StableRunPhase,
  draft: StableRunUiPickupDraft,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiPickupPreview | null {
  if (phase.kind !== 'scene-session' || phase.payload.scene.status !== 'active') return null
  const identity = getStableRunPhaseIdentity(phase)
  const rules = dependencies.rulesRegistry.get(identity.rulesVersion)
  const runtime = getRunSceneRuntime(phase.payload, rules.sceneLaunch)
  const source = getPlayerVisibleSceneNodeState(
    phase.payload.scene,
    phase.payload.scene.currentNodeId,
  ).groundItems.find((item) => item.instanceId === draft.opportunityId)
  if (!source) return null
  const placement = { x: draft.x, y: draft.y, rotated: draft.rotated }
  const geometry = previewBackpackPlacement(
    phase.payload.scene.backpack,
    source,
    { ...placement, instanceId: source.instanceId },
    runtime.dependencies.physicalCatalog,
  )
  let command
  try {
    command = createPickUpRevealedNodeItemCommand({
      nodeItemInstanceId: source.instanceId,
      quantity: draft.quantity,
      placement,
    })
  } catch {
    return Object.freeze({
      canExecute: false,
      rejection: '拾取参数无效。',
      command: null,
      facts: Object.freeze([]),
      candidateCells: Object.freeze([]),
    })
  }
  const preview = previewNodeItemPickupCommand(
    phase.payload.scene,
    command,
    runtime.dependencies,
  )
  if (!preview.canExecute) {
    return Object.freeze({
      canExecute: false,
      rejection: '该数量或摆放无法执行，请调整选择。',
      command: null,
      facts: Object.freeze([]),
      candidateCells: Object.freeze(geometry.cells.map(({ x, y }) => Object.freeze({ x, y }))),
    })
  }
  const result = preview.result
  return Object.freeze({
    canExecute: true,
    rejection: null,
    command: applicationSceneCommand('scene-node-item-pickup', command),
    facts: Object.freeze([
      { label: '本次拾取数量', value: String(result.quantityPicked) },
      { label: '地面剩余数量', value: String(result.quantityRemaining) },
      { label: '目标坐标', value: `${result.destinationPlacement.x}, ${result.destinationPlacement.y}` },
      { label: '旋转状态', value: result.destinationPlacement.rotated ? '已旋转' : '未旋转' },
      { label: '背包负重', value: `${result.backpackWeightBefore} → ${result.backpackWeightAfter}` },
      { label: '拾取后负重状态', value: loadTierName(result.loadTierAfter) },
    ]),
    candidateCells: Object.freeze(geometry.cells.map(({ x, y }) => Object.freeze({ x, y }))),
  })
}

/**
 * Produces only the currently wired player actions. This is a pure projection:
 * it previews formal rules but never executes a resolver or changes a Run.
 */
export function createStableRunUiInteractionModel(
  phase: StableRunPhase,
  dependencies: StableRunUiPresentationDependencies,
): StableRunUiInteractionModel {
  const taskEvents = phase.kind === 'scene-session'
    ? createTaskEventInteraction(phase, dependencies)
    : Object.freeze({ actions: Object.freeze([]), opportunities: Object.freeze([]) })
  const actions = phase.kind === 'current-day-hub'
    ? [createLaunchAction(phase, dependencies)].filter(
        (action): action is StableRunUiAction => action !== null,
      )
    : phase.kind === 'scene-session'
      ? [
          ...createCombatActions(phase, dependencies),
          ...createMoveActions(phase, dependencies),
          ...createSearchActions(phase, dependencies),
          ...createObstacleActions(phase, dependencies),
          ...taskEvents.actions,
          ...createMedicalActions(phase, dependencies),
          ...[createWithdrawalAction(phase, dependencies), createSettlementAction(phase)].filter(
            (action): action is StableRunUiAction => action !== null,
          ),
        ]
      : []
  const opportunities = phase.kind === 'scene-session'
    ? pickupOpportunities(phase, dependencies)
    : Object.freeze([])
  return Object.freeze({
    actions: Object.freeze(actions),
    pickupOpportunities: opportunities,
    taskEventOpportunities: taskEvents.opportunities,
  })
}
