import { useEffect, useState, type ReactNode } from 'react'
import type { PlayerAction, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import { itemImage, itemPlaceholder, sceneArt } from '../assets'
import { actionName, publicItemName } from '../labels'
import { ActionButton } from './action-information'
import { HubPanel } from './hub-panel'
import { TerminalPanel } from './terminal-panel'
import { BattleStage } from './battle-stage'
import { TravelCluster } from './travel-cluster'

export function WorldStage({ view, onAction, presentation }: { view: PlayerReadyView; onAction: (action: PlayerAction, item?: PlayerItem) => void; presentation?: ReactNode }) {
  const [resultsOpen, setResultsOpen] = useState(true)
  const signature = view.sources.map(source => `${source.label}:${source.completed}`).join('|')
  useEffect(() => { setResultsOpen(true) }, [signature, view.location?.place, view.location?.name])
  const art = sceneArt(view.location, view.point)
  const revealed = view.ground.length > 0 || view.sources.some(source => source.completed)
  const groundAction = (item: PlayerItem) => view.actions.find(action => item.ordinary ? action.family === 'inventory' && action.label === '拾取' : action.family === 'task-transfer' && action.label === '拾取任务物')
  return <section className="iw-stage" data-scene={art?.key ?? 'neutral'}>
    {art && <img key={art.key} className="iw-scene-plate" src={art.src} alt="" aria-hidden="true" style={{ objectPosition: `${art.focal[0] * 100}% ${art.focal[1] * 100}%` }} onError={event => { event.currentTarget.hidden = true }} />}
    <div className="iw-scene-shade" aria-hidden="true" />
    {view.point === 'first-hub' ? <HubPanel view={view} onAction={onAction} /> : view.point === 'living-hub' || view.point === 'dead' ? <TerminalPanel view={view} /> : view.combat ? <BattleStage view={view} onAction={onAction} /> : <>
      <header className="iw-room-heading"><div><p className="iw-eyebrow">{view.location?.place} / 当前地点</p><h1>{view.location?.name}</h1></div><span className="iw-location-tag">当前现场</span></header>
      <div className="iw-scene-card"><div className="iw-room-content"><section className="iw-room-interactions" aria-label="当前现场互动">
        {view.sources.map((source, index) => <div className="iw-source" key={index}><strong>{source.label}</strong>{source.completed ? <span className="iw-muted">已处理</span> : <div className="iw-actions">{source.choices.map((action, n) => <ActionButton action={action} key={n} onAction={() => onAction(action)}>{actionName(action)}</ActionButton>)}</div>}</div>)}
        {view.tasks.choices.length > 0 && <section className="iw-task-actions" aria-label="任务操作"><h2>现场任务</h2><div className="iw-actions">{view.tasks.choices.map((action, index) => <ActionButton action={action} key={index} onAction={() => onAction(action)}>{actionName(action)}</ActionButton>)}</div></section>}
      </section>
      {revealed && <section className="iw-ground" data-empty={view.ground.length === 0} aria-label="当前地面物"><header><h2>现场物品 <small>{view.ground.length} 件</small></h2><button type="button" onClick={() => setResultsOpen(open => !open)}>{resultsOpen ? '收起结果' : '查看结果'}</button></header>
        {resultsOpen && <div className="iw-ground-items">{view.ground.length ? view.ground.map((item, index) => {
          const action = groundAction(item)
          return <article key={index}><img key={itemImage(item.name)} src={itemImage(item.name)} alt="" onError={event => { if (event.currentTarget.getAttribute('src') !== itemPlaceholder) event.currentTarget.src = itemPlaceholder }} /><div><strong>{publicItemName(item.name)}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</strong><small>{item.width}×{item.height} · 单位重量 {item.unitWeight}</small></div>{action && <ActionButton action={action} item={item} ariaLabel={`${action.label} ${publicItemName(item.name)}`} onAction={() => onAction(action, item)}>{action.label}</ActionButton>}</article>
        }) : <p className="iw-muted">{revealed ? '当前没有已揭示的地面物品' : '先选择现场互动；结果只显示实际已揭示物品。'}</p>}</div>}
      </section>}</div>
      <TravelCluster actions={view.move.options} onAction={onAction} />
      <nav className="iw-local-actions" aria-label="当前地点行动">{view.actions.filter(action => action.family === 'rest' || action.family === 'terminal').map((action, index) => <ActionButton action={action} key={index} onAction={() => onAction(action)}>{actionName(action)}</ActionButton>)}</nav></div>
    </>}
    {presentation}
  </section>
}
