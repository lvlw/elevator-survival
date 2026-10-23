import type { PlayerAction, PlayerReadyView } from '../../../state/residence-session/player-types'
import { actionName } from '../labels'
import { ActionButton } from './action-information'

const stages: Readonly<Record<string, string>> = { healthy: '完好', wounded: '受伤', 'severely-wounded': '重伤', critical: '濒危', incapacitated: '失去能力' }
export function BattleStage({ view, onAction }: { view: PlayerReadyView; onAction: (action: PlayerAction) => void }) {
  const combat = view.combat
  if (!combat) return null
  const intent = combat.intent
  const relation = { 'player-before-enemy': '玩家先于敌人', 'same-point': '双方处于同一行动点', 'enemy-before-player': '敌人先于玩家' }[combat.relativeTimeline.nextRelation]
  return <section className="iw-battle" aria-label="战斗舞台"><header><p className="iw-eyebrow">{view.location?.place}</p><h1>{view.location?.name} · 战斗</h1><span>当前由玩家决策</span></header>
    <div className="iw-timeline" aria-label="相对行动顺序"><strong>玩家 → {relation}</strong><small>仅为当前公开相对顺序，不预演未来结果</small></div>
    <div className="iw-battle-actors"><section className="iw-enemy-info"><h2>当前对手</h2><strong className="iw-stage-badge">{stages[combat.enemyStage] ?? '公开生命阶段'}</strong>
      <h3>公开意图</h3><p>{intent.category === 'special-attack' ? '特殊攻击' : '普通攻击'} · {intent.relativeSpeed === 'slow' ? '较慢' : '常规速度'}</p>
      <p>直接损耗：{intent.directDamageSeverity === 'high' ? '高' : '中'}</p><ul>{intent.mayCauseInjury && <li>可能造成伤势</li>}{intent.mayCauseInfectionExposure && <li>可能产生感染暴露</li>}{intent.mayCauseControl && <li>可能产生控制效果</li>}</ul>
    </section><div className="iw-battle-figures"><div className="iw-actor-placeholder iw-actor-placeholder--enemy" role="img" aria-label="当前对手中性占位">对手<br />{stages[combat.enemyStage]}</div><span className="iw-versus" aria-hidden="true">VS</span><div className="iw-actor-placeholder iw-actor-placeholder--player" role="img" aria-label="玩家背身中性占位">玩家</div></div></div>
    <nav className="iw-battle-actions" aria-label="战斗行动">{combat.actions.map((action, index) => <ActionButton action={action} key={index} onAction={() => onAction(action)}>{actionName(action)}{action.quickConsumption && <small>快捷 {action.quickConsumption.slot + 1} · 消耗 {action.quickConsumption.quantity}</small>}{action.resourceCost && <small>资源 {action.resourceCost.currentBefore} → {action.resourceCost.after}</small>}</ActionButton>)}</nav>
    <p className="iw-muted">胜利或退却只结算一次精力。未证明必死不等于安全；具体保护由正式安全查询决定。</p>
  </section>
}
