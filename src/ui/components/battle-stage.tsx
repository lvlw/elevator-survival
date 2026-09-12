import type { StableRunUiCombatGhostPreview } from '../interaction'
import type {
  CombatActionResultViewModel,
  PlayerVisibleCombatViewModel,
  PlayerVisibleConditionViewModel,
} from '../presentation'
import { presentationVisualAssetUrl } from '../presentation'

const healthPhases: readonly PlayerVisibleCombatViewModel['enemyHealthStage'][] = [
  'healthy',
  'wounded',
  'severely-wounded',
  'critical',
  'incapacitated',
]

function healthPhaseName(phase: PlayerVisibleCombatViewModel['enemyHealthStage']): string {
  return phase === 'healthy'
    ? '完好'
    : phase === 'wounded'
      ? '受伤'
      : phase === 'severely-wounded'
        ? '重伤'
        : phase === 'critical'
          ? '濒危'
          : '失去能力'
}

function timingName(timing: PlayerVisibleCombatViewModel['enemyTimingBeforeNextDecision']): string {
  return timing === 'will-act'
    ? '敌人会先行动'
    : timing === 'will-not-act'
      ? '玩家会先再次获得决策机会'
      : '取决于所选行动'
}

function woundName(kind: PlayerVisibleConditionViewModel['wounds'][number]['kind']): string {
  return kind === 'laceration' ? '撕裂伤' : kind === 'puncture' ? '穿刺伤' : '咬伤'
}

function ghostRelationshipName(ghost: StableRunUiCombatGhostPreview): string {
  if (ghost.context === 'escape-completion') {
    return ghost.relationship === 'enemy-first'
      ? '敌人将在脱离完成前行动'
      : '你将在敌人行动前完成脱离'
  }
  return ghost.relationship === 'enemy-first'
    ? '敌人将在下一次玩家决策前行动'
    : '玩家将在敌人行动前再次获得决策机会'
}

export function BattleStage({
  combat,
  condition,
  ghost,
  latestResult,
}: Readonly<{
  combat: PlayerVisibleCombatViewModel
  condition: PlayerVisibleConditionViewModel
  ghost: StableRunUiCombatGhostPreview | null
  latestResult: CombatActionResultViewModel | null
}>) {
  const category = combat.currentIntentCategory === 'basic-attack' ? '基础攻击' : '特殊攻击'
  const speed = combat.currentIntentRelativeSpeed === 'normal' ? '普通' : '缓慢'
  const danger = combat.currentIntentDirectDamageSeverity === 'medium'
    ? '中等直接伤害'
    : '高直接伤害'
  const weapon = combat.equipment.weapon?.name ?? '未装备可用武器'
  const currentPhase = healthPhaseName(combat.enemyHealthStage)

  return <section className="battle-stage" aria-labelledby="battle-stage-heading">
    {combat.sceneBackgroundVisualKey && <div className="battle-stage__background" style={{ backgroundImage: `url(${presentationVisualAssetUrl(combat.sceneBackgroundVisualKey)})` }} aria-hidden="true" />}
    <header className="battle-stage__header">
      <div><p className="panel-kicker">战斗态势</p><h2 id="battle-stage-heading">玩家 vs {combat.enemyName}</h2></div>
      <span className="battle-stage__turn">当前：玩家可行动</span>
    </header>

    <div className="battle-stage__actors">
      <section className="battle-actor battle-actor--player" aria-label="玩家战斗状态">
        <p className="battle-actor__eyebrow">玩家</p>
        <h3>生命 {combat.playerHealth} / {combat.playerMaximumHealth}</h3>
        <progress
          aria-label={`玩家生命 ${combat.playerHealth} / ${combat.playerMaximumHealth}`}
          max={combat.playerMaximumHealth}
          value={combat.playerHealth}
        />
        <p>当前武器：<strong>{weapon}</strong></p>
        <div className="battle-status-row" aria-label="玩家公开状态">
          <span className={condition.bleeding ? 'battle-status battle-status--danger' : 'battle-status'}>流血：{condition.bleeding ? '是' : '否'}</span>
          <span className="battle-status">未处理伤口：{condition.untreatedOpenWounds}</span>
          <span className="battle-status">轻度挫伤：{condition.minorContusions}</span>
          <span className="battle-status">镇痛：{condition.painkillerActive ? '生效' : '无'}</span>
          <span className="battle-status">未结算感染暴露：{condition.pendingInfectionExposures}</span>
        </div>
        {condition.wounds.length > 0 && <ul className="battle-wound-list">
          {condition.wounds.map((wound) => <li key={`${wound.kind}-${wound.ordinal}`}>
            {woundName(wound.kind)} {wound.ordinal} · {wound.treatment === 'treated' ? '已处理' : '未处理'}
          </li>)}
        </ul>}
      </section>

      <div className="battle-stage__versus" aria-hidden="true">VS</div>

      <section className="battle-actor battle-actor--enemy" aria-label="敌人战斗状态">
        <p className="battle-actor__eyebrow">敌人</p>
        <h3>{combat.enemyName}</h3>
        {combat.enemyVisualKey && <img className="enemy-actor-art" src={presentationVisualAssetUrl(combat.enemyVisualKey)} alt="" aria-hidden="true" />}
        <p>相对生命：<strong>{currentPhase}</strong></p>
        <div className="enemy-health-phases" aria-label={`敌人生命阶段：${currentPhase}`}>
          {healthPhases.map((phase) => <span
            key={phase}
            className="enemy-health-phase"
            data-active={phase === combat.enemyHealthStage ? 'true' : 'false'}
          >{healthPhaseName(phase)}</span>)}
        </div>
        <div className="enemy-intent-card">
          <span>当前意图</span><strong>{combat.currentIntent}</strong>
          <small>{category} · {speed} · {danger}</small>
          <small>伤势 {combat.currentIntentMayCauseInjury ? '可能' : '无'} · 感染暴露 {combat.currentIntentMayCauseInfectionExposure ? '可能' : '无'} · 控制 {combat.currentIntentMayCauseControl ? '可能' : '无'}</small>
        </div>
      </section>
    </div>

    <section className="relative-combat-timeline" aria-label="相对行动顺序">
      <div className="relative-combat-timeline__step relative-combat-timeline__step--current">
        <span>现在</span><strong>玩家选择行动</strong>
      </div>
      <div className="relative-combat-timeline__link" aria-hidden="true" />
      <div className="relative-combat-timeline__step">
        <span>下一次决策前</span><strong>{combat.enemyName} · {combat.currentIntent}</strong><small>{timingName(combat.enemyTimingBeforeNextDecision)}</small>
      </div>
      {ghost && <div className="combat-action-ghost" role="status">
        <span>行动预估</span><strong>{ghost.title}</strong><em>{ghostRelationshipName(ghost)}</em>
      </div>}
    </section>

    <div className="battle-stage__scene-time">
      <span>当前场景剩余时间：<strong>{combat.sceneRemainingTime}</strong></span>
      <span>若此刻结束，预计结算场景时间：<strong>{combat.sceneTimeIfCombatEndedNow}</strong>（最低 {combat.minimumSceneTime}）</span>
    </div>
    <p className="battle-stage__time-note">战斗行动顺序不等于今日场景时间；战斗结束后才按正式规则结算场景时间。</p>
    {latestResult && <p className="battle-stage__latest-result" role="status">
      最近行动已提交：{latestResult.playerAction}；玩家生命 {latestResult.playerHealthBefore} → {latestResult.playerHealthAfter}；敌人相对生命 {healthPhaseName(latestResult.enemyHealthStage)}。
    </p>}
    <p className="empty-copy">战斗实际场景时间将在战斗结束时一次结算。</p>
  </section>
}
