import { useEffect, useState } from 'react'
import type { PlayerAction, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import { itemImage, roomImage, hubImage } from '../assets'
import { actionName } from '../labels'
import { HubPanel } from './hub-panel'
import { TerminalPanel } from './terminal-panel'
import { BattleStage } from './battle-stage'
import { TravelCluster } from './travel-cluster'
import { KnowledgeMap } from './knowledge-map'

export function WorldStage({ view, onAction }: { view: PlayerReadyView; onAction: (action: PlayerAction, item?: PlayerItem) => void }) {
  const [resultsOpen, setResultsOpen] = useState(true)
  const signature = view.sources.map(source => `${source.label}:${source.completed}`).join('|')
  useEffect(() => { setResultsOpen(true) }, [signature, view.location?.name])
  const image = view.point === 'first-hub' || view.point === 'living-hub' ? hubImage : roomImage(view.location?.name)
  const groundAction = (item: PlayerItem) => view.actions.find(action => item.ordinary ? action.family === 'inventory' && action.label === '拾取' : action.family === 'task-transfer' && action.label === '拾取任务物')
  return <section className="iw-stage" style={image ? { backgroundImage: `linear-gradient(180deg, #10191d30, #10191ddd), url(${image})` } : undefined}>
    {view.point === 'first-hub' ? <HubPanel view={view} onAction={onAction} /> : view.point === 'living-hub' || view.point === 'dead' ? <TerminalPanel view={view} /> : view.combat ? <BattleStage view={view} onAction={onAction} /> : <>
      <header className="iw-room-heading"><div><p className="iw-eyebrow">{view.location?.place}</p><h1>{view.location?.name}</h1></div><KnowledgeMap map={view.map} /></header>
      <div className="iw-room-content"><section className="iw-room-interactions" aria-label="当前现场互动">
        {view.sources.map((source, index) => <div className="iw-source" key={index}><strong>{source.label}</strong>{source.completed ? <span className="iw-muted">已处理</span> : <div className="iw-actions">{source.choices.map((action, n) => <button type="button" key={n} onClick={() => onAction(action)}>{actionName(action)}</button>)}</div>}</div>)}
        {view.tasks.choices.length > 0 && <section className="iw-task-actions" aria-label="任务操作"><h2>现场任务</h2><div className="iw-actions">{view.tasks.choices.map((action, index) => <button type="button" key={index} onClick={() => onAction(action)}>{actionName(action)}</button>)}</div></section>}
      </section>
      <section className="iw-ground" aria-label="当前地面物"><header><h2>现场物品</h2><button type="button" onClick={() => setResultsOpen(open => !open)}>{resultsOpen ? '收起结果' : '查看结果'}</button></header>
        {resultsOpen && <div className="iw-ground-items">{view.ground.length ? view.ground.map((item, index) => {
          const action = groundAction(item)
          return <article key={index}><img src={itemImage(item.name)} alt="" /><div><strong>{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</strong><small>{item.width}×{item.height} · 单位重量 {item.unitWeight}</small></div>{action && <button type="button" aria-label={`${action.label} ${item.name}`} onClick={() => onAction(action, item)}>{action.label}</button>}</article>
        }) : <p className="iw-muted">当前没有已揭示的地面物品</p>}</div>}
      </section></div>
      <TravelCluster actions={view.move.options} onAction={onAction} />
      <nav className="iw-local-actions" aria-label="当前地点行动">{view.actions.filter(action => action.family === 'rest' || action.family === 'terminal').map((action, index) => <button type="button" key={index} onClick={() => onAction(action)}>{actionName(action)}</button>)}</nav>
    </>}
  </section>
}
