import { useState, type ReactNode } from 'react'
import type { PlayerAction, PlayerReadyView } from '../../../state/residence-session/player-types'
import { actionName } from '../labels'
import { ActionButton } from './action-information'
import { EnemyArt } from './enemy-art'
import { sceneArt } from '../assets'

const stages: Readonly<Record<string, string>> = { healthy: '完好', wounded: '受伤', 'severely-wounded': '重伤', critical: '濒危', incapacitated: '失去能力' }
export function BattleStage({ view, onAction, presentation }: { view: PlayerReadyView; onAction: (action: PlayerAction) => void; presentation?: ReactNode }) {
  const [maximized, setMaximized] = useState(false)
  const combat = view.combat
  if (!combat) return null
  const intent = combat.intent, opponent = combat.opponent.name
  const art = sceneArt(view.location, view.point)
  const stageText = Object.hasOwn(stages, combat.enemyStage) ? stages[combat.enemyStage] : '公开生命阶段'
  const relation = { 'player-before-enemy': '玩家先于敌人', 'same-point': '双方处于同一行动点', 'enemy-before-player': '敌人先于玩家' }[combat.relativeTimeline.nextRelation]
  return <section className={`iw-battle iw-framed${maximized ? ' iw-battle--max' : ''}`} aria-label="战斗舞台"><header><div><p className="iw-eyebrow">{view.location?.place} / 当前由玩家决策</p><h1>{view.location?.name} · 战斗</h1></div><button className="iw-battle-size" type="button" onClick={() => setMaximized(value => !value)}>{maximized ? '还原战斗' : '放大战斗'}</button></header>
    <div className="iw-timeline" aria-label="相对行动顺序"><strong>{relation}</strong><small>仅为当前公开相对顺序，不预演未来结果</small></div>
    <div className="iw-battle-actors iw-battle-figures">{art && <img className="iw-battle-plate" key={art.key} src={art.src} alt="" aria-hidden="true" style={{ objectPosition: `${art.focal[0] * 100}% ${art.focal[1] * 100}%` }} onError={event => { event.currentTarget.hidden = true }} />}<div className="iw-player-caption">玩家 · 生命 {view.body.hp.current} / {view.body.hp.maximum}</div>
      <div className="iw-actor-placeholder iw-actor-placeholder--player" role="img" aria-label="玩家背身中性占位"><span>玩家</span><small>中性呈现槽</small></div>
      <EnemyArt opponent={combat.opponent} stage={combat.enemyStage} stageText={stageText} />
      <section className="iw-enemy-info"><div className="iw-enemy-caption"><h2>{opponent}</h2><strong className="iw-stage-badge">{stageText}</strong></div>
        <div className="iw-intent"><h3>公开意图</h3><p>{intent.category === 'special-attack' ? '特殊攻击' : '普通攻击'} · {intent.relativeSpeed === 'slow' ? '较慢' : '常规速度'}<br />直接损耗：{intent.directDamageSeverity === 'high' ? '高' : '中'}</p><ul>{intent.mayCauseInjury && <li>可能造成伤势</li>}{intent.mayCauseInfectionExposure && <li>可能产生感染暴露</li>}{intent.mayCauseControl && <li>可能产生控制效果</li>}</ul></div>
      </section>
    </div>
    <nav className="iw-battle-actions" aria-label="战斗行动">{combat.actions.map((action, index) => <ActionButton action={action} key={index} onAction={() => onAction(action)}>{actionName(action)}{action.quickConsumption && <small>快捷 {action.quickConsumption.slot + 1} · 消耗 {action.quickConsumption.quantity}</small>}{action.resourceCost && <small>资源 {action.resourceCost.currentBefore} → {action.resourceCost.after}</small>}{action.signatureUsesRemaining != null && <small>本次委托剩余 {action.signatureUsesRemaining} 次</small>}</ActionButton>)}</nav>
    <footer className="iw-battle-footer">{presentation}<details className="iw-battle-notes"><summary>战斗说明</summary><p>胜利或退却只结算一次精力。未证明必死不等于安全；具体保护由正式安全查询决定。失去能力不等于实际死亡。反馈可跳过，下一次行动无需等待。</p></details></footer>
  </section>
}
