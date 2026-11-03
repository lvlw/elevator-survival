import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PlayerAction, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import { sceneArt } from '../assets'
import { ItemPicture, useItemInspection } from './item-inspection'
import { actionName, publicItemName } from '../labels'
import { ActionButton } from './action-information'
import { HubPanel } from './hub-panel'
import { TerminalPanel } from './terminal-panel'
import { BattleStage } from './battle-stage'
import { TravelCluster } from './travel-cluster'
import { ContentLayer } from './content-layer'
import { TaskArtwork } from './task-artwork'
import { ItemHint } from '../story-interaction/short-hint'

export function WorldStage({ view, onAction, presentation, narrative }: { view: PlayerReadyView; onAction: (action: PlayerAction, item?: PlayerItem) => void; presentation?: ReactNode; narrative?: ReactNode }) {
  const [resultsOpen, setResultsOpen] = useState(true)
  const inspect = useItemInspection()
  const [context, setContext] = useState<PlayerAction | null>(null)
  const contextActions = [...view.tasks.choices, ...view.sources.filter(source => source.label === '酒店交换').flatMap(source => source.choices)]
  const contextCurrent = context && contextActions.some(action => action.selector === context.selector)
  const contextFocus = useRef(true)
  if (context && !contextCurrent) contextFocus.current = false
  useEffect(() => { if (context && !contextCurrent) setContext(null) }, [context, contextCurrent])
  const signature = view.sources.map(source => `${source.label}:${source.completed}`).join('|')
  useEffect(() => { setResultsOpen(true) }, [signature, view.location?.place, view.location?.name])
  const art = sceneArt(view.location, view.point)
  const revealed = view.ground.length > 0 || view.sources.some(source => source.completed)
  const groundAction = (item: PlayerItem) => view.actions.find(action => item.ordinary ? action.family === 'inventory' && action.label === '拾取' : action.family === 'task-transfer' && action.label === '拾取任务物')
  const taskGroups = [...new Set(view.tasks.choices.map(a => a.label))].map(label => ({ label, choices: view.tasks.choices.filter(a => a.label === label) }))
  return <section className="iw-stage" data-scene={art?.key ?? 'neutral'}>
    {art && <img key={art.key} className="iw-scene-plate" src={art.src} alt="" aria-hidden="true" style={{ objectPosition: `${art.focal[0] * 100}% ${art.focal[1] * 100}%` }} onError={event => { event.currentTarget.hidden = true }} />}
    <div className="iw-scene-shade" aria-hidden="true" />
    {narrative}
    {view.point === 'first-hub' ? <HubPanel view={view} onAction={onAction} /> : view.point === 'living-hub' || view.point === 'dead' ? <TerminalPanel view={view} /> : view.combat ? <BattleStage view={view} onAction={onAction} presentation={presentation} /> : <>
      <header className="iw-room-heading"><div><p className="iw-eyebrow">{view.location?.place} / 当前地点</p><h1>{view.location?.name}</h1></div><div style={{ marginRight: narrative ? 120 : 0 }}>{contextActions.length > 0 && <button type="button" className="iw-scene-details-trigger" onClick={() => { contextFocus.current = true; setContext(contextActions[0]!) }}>查看现场详情</button>}</div></header>
      <div className="iw-scene-card"><div className="iw-room-content"><section className="iw-room-interactions" aria-label="当前现场互动">
        {view.sources.map((source, index) => <div className="iw-source" key={index}><strong>{source.label}</strong>{source.completed ? <span className="iw-muted">已处理</span> : <div className="iw-actions">{source.choices.map((action, n) => <ActionButton action={action} key={n} onAction={() => onAction(action)}>{actionName(action)}</ActionButton>)}</div>}</div>)}
        {view.tasks.choices.length > 0 && <section className="iw-task-actions" aria-label="任务操作">{taskGroups.map(group => <div key={group.label} className="iw-task-object"><h2>{group.label}</h2><div className="iw-actions">{group.choices.map((action, index) => <ActionButton action={action} key={index} onAction={() => onAction(action)}>{actionName(action)}</ActionButton>)}</div></div>)}</section>}
      </section>
      {revealed && <section className="iw-ground" data-empty={view.ground.length === 0} aria-label="当前地面物"><header><h2>现场物品 <small>{view.ground.length} 件</small></h2><button type="button" onClick={() => setResultsOpen(open => !open)}>{resultsOpen ? '收起结果' : '查看结果'}</button></header>
        {resultsOpen && <div className="iw-ground-items">{view.ground.length ? view.ground.map((item, index) => {
          const action = groundAction(item)
          return <article key={index}><ItemHint item={item}><button type="button" className="iw-ground-inspect" aria-label={`查看${publicItemName(item.name)}详情`} onClick={event => inspect?.(item, event.currentTarget)}><ItemPicture name={item.name} /><span><strong>{publicItemName(item.name)}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</strong><small>{item.width}×{item.height} · 单位重量 {item.unitWeight}</small></span></button></ItemHint>{action && <ActionButton action={action} item={item} ariaLabel={`${action.label} ${publicItemName(item.name)}`} onAction={() => onAction(action, item)}>{action.label}</ActionButton>}</article>
        }) : <p className="iw-muted">{revealed ? '当前没有已揭示的地面物品' : '先选择现场互动；结果只显示实际已揭示物品。'}</p>}</div>}
      </section>}</div>
      <TravelCluster actions={view.move.options} onAction={onAction} />
      <nav className="iw-local-actions" aria-label="当前地点行动">{view.actions.filter(action => action.family === 'rest' || action.family === 'terminal').map((action, index) => <ActionButton action={action} key={index} onAction={() => onAction(action)}>{actionName(action)}</ActionButton>)}</nav></div>
    </>}
    {!view.combat && presentation}
    {context && contextCurrent && <ContentLayer title={`${view.location?.name} · 现场详情`} tier="parameters" restoreFocus={() => contextFocus.current} onClose={() => setContext(null)}>
      <div className="iw-context-details"><TaskArtwork view={view} action={context} /><div><h3>当前公开操作</h3><p>方法与成本来自当前现场；查看不执行操作。需要物品、材料或位置时仍须明确选择。</p><div className="iw-actions">{contextActions.map((action, index) => <ActionButton action={action} key={index} onAction={() => onAction(action)}>{actionName(action)}{action.cost !== null && <small>精力 {action.cost}</small>}</ActionButton>)}</div></div></div>
    </ContentLayer>}
  </section>
}
