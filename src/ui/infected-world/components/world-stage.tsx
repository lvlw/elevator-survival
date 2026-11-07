import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import type { PlayerAction, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import { sceneArt } from '../assets'
import { ItemPicture, useItemInspection } from './item-inspection'
import { actionName, publicItemName } from '../labels'
import { ActionButton } from './action-information'
import { PlatformPanel } from '../narrative-closure/platform-panel'
import { HubPanel } from './hub-panel'
import { TerminalPanel } from './terminal-panel'
import { BattleStage } from './battle-stage'
import { TravelCluster } from './travel-cluster'
import { ContentLayer } from './content-layer'
import { TaskArtwork } from './task-artwork'
import { itemPurpose } from '../story-interaction/short-hint'
import { physicalMethodLimitation, type ReadAction, type MethodLimitation } from '../owner-playtest-ux/physical-methods'

export function WorldStage({ view, onAction, presentation, minimap, readAction, terminalReview, stageRef }: {
  view: PlayerReadyView; onAction(action: PlayerAction, item?: PlayerItem): void
  presentation?: ReactNode; minimap?: ReactNode; readAction: ReadAction; terminalReview?: ReactNode; stageRef?: Ref<HTMLElement>
}) {
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
  const groundAction = (item: PlayerItem) => view.actions.find(action => item.ordinary
    ? action.family === 'inventory' && action.label === '拾取'
    : action.family === 'task-transfer' && action.label === '拾取任务物')
  const limits = new Map<PlayerAction, MethodLimitation>()
  for (const action of [...view.sources.flatMap(source => source.choices), ...view.tasks.choices]) {
    const limitation = physicalMethodLimitation(action, view.carried, readAction)
    if (limitation) limits.set(action, limitation)
  }
  const primary = (actions: readonly PlayerAction[]) => actions.filter(action => !limits.has(action))
  const tasks = primary(view.tasks.choices)
  const taskLabels = [...new Set(tasks.map(action => action.label))]
  const renderAction = (action: PlayerAction, index: number) => <ActionButton action={action} key={index}
    onAction={() => onAction(action)}>{actionName(action)}</ActionButton>
  const disabled = (action: PlayerAction, limitation: MethodLimitation) =>
    <><button type="button" disabled>{actionName(action)}</button><small>{limitation.text}</small></>

  return <section ref={stageRef} className="iw-stage" data-scene={art?.key ?? 'neutral'}>
    {art && <img key={art.key} className="iw-scene-plate" src={art.src} alt="" aria-hidden="true"
      style={{ objectPosition: `${art.focal[0] * 100}% ${art.focal[1] * 100}%` }}
      onError={event => { event.currentTarget.hidden = true }} />}
    <div className="iw-scene-shade" aria-hidden="true" />
    {view.point === 'first-hub' ? <HubPanel view={view} onAction={onAction} /> :
      view.point === 'living-hub' || view.point === 'dead' ? <TerminalPanel view={view}>{terminalReview}</TerminalPanel> :
        view.combat ? <BattleStage view={view} onAction={onAction} presentation={presentation} /> :
          <div className="iw-room-layout">
            {minimap && <aside className="iw-stage-map" aria-label="场景地图">{minimap}</aside>}
            <header className="iw-room-heading">
              <p className="iw-eyebrow">{view.location?.place} / 当前地点</p><h1>{view.location?.name}</h1>
              {contextActions.length > 0 && <button type="button" className="iw-scene-details-trigger"
                onClick={() => { contextFocus.current = true; setContext(contextActions[0]!) }}>查看现场详情</button>}
            </header>
            <div className="iw-room-content">
              <PlatformPanel view={view} />
              <section className="iw-room-interactions" aria-label="当前现场互动">
                {view.sources.map((source, index) => {
                  const choices = primary(source.choices)
                  return source.completed || choices.length > 0 ? <div className="iw-source" key={index}>
                    <strong>{source.label}</strong>
                    {source.completed ? <span className="iw-muted">已处理</span> : <div className="iw-actions">{choices.map(renderAction)}</div>}
                  </div> : null
                })}
                {tasks.length > 0 && <section className="iw-task-actions" aria-label="任务操作">
                  {taskLabels.map(label => {
                    const choices = tasks.filter(action => action.label === label)
                    return <div key={label} className="iw-task-object">
                      {choices.length > 1 && <h2>{label}</h2>}<div className="iw-actions">{choices.map(renderAction)}</div>
                    </div>
                  })}
                </section>}
              </section>
              {limits.size > 0 && <details className="iw-other-methods" key={`${view.location?.place}/${view.location?.name}`}>
                <summary>{[...limits.values()].every(reason => reason.kind === 'missing')
                  ? '其他办法（当前缺工具）' : '其他办法（当前不可用）'}</summary>
                <ul className="iw-limited-methods">{[...limits].map(([action, limitation], index) =>
                  <li key={index}>{disabled(action, limitation)}</li>)}</ul>
              </details>}
              {revealed && <section className="iw-ground" data-empty={view.ground.length === 0} aria-label="当前地面物">
                <header><h2>现场物品 <small>{view.ground.length} 件</small></h2>
                  <button type="button" onClick={() => setResultsOpen(open => !open)}>{resultsOpen ? '收起结果' : '查看结果'}</button></header>
                {resultsOpen && <div className="iw-ground-items">{view.ground.length ? view.ground.map((item, index) => {
                  const action = groundAction(item)
                  const name = publicItemName(item.name)
                  return <article key={index}>
                    <button type="button" className="iw-ground-inspect" aria-label={`查看${name}详情`}
                      onClick={event => inspect?.(item, event.currentTarget)}>
                      <ItemPicture name={item.name} />
                      <span><strong>{name} ×{item.quantity}</strong><small>占格 {item.width}×{item.height} · 单位重量 {item.unitWeight}</small></span>
                    </button>
                    {action && <ActionButton action={action} item={item} ariaLabel={`${action.label} ${name}`}
                      onAction={() => onAction(action, item)}>拾取</ActionButton>}
                    <p className="iw-ground-purpose">{itemPurpose(item.name)}</p>
                  </article>
                }) : <p className="iw-muted">当前没有已揭示的地面物品</p>}</div>}
              </section>}
            </div>
            <div className="iw-room-navigation">
              <TravelCluster actions={view.move.options} map={view.map} onAction={onAction} />
              <nav className="iw-local-actions" aria-label="当前地点行动">
                {view.actions.filter(action => action.family === 'rest' || action.family === 'terminal').map(renderAction)}
              </nav>
            </div>
            {presentation && <div className="iw-room-feedback">{presentation}</div>}
          </div>}
    {!view.combat && view.point !== 'stable-active' && presentation}
    {context && contextCurrent && <ContentLayer title={`${view.location?.name} · 现场详情`}
      tier="parameters" restoreFocus={() => contextFocus.current} onClose={() => setContext(null)}>
      <div className="iw-context-details"><TaskArtwork view={view} action={context} /><div>
        <h3>当前公开操作</h3><p>查看不执行操作。需要物品、材料或位置时，请明确选择。</p>
        <div className="iw-actions">{contextActions.map((action, index) => {
          const reason = limits.get(action)
          return reason ? <div className="iw-limited-methods" key={index}>{disabled(action, reason)}</div> :
            <ActionButton action={action} key={index} onAction={() => onAction(action)}>{actionName(action)}
              {action.cost !== null && <small>精力 {action.cost}</small>}</ActionButton>
        })}</div>
      </div></div>
    </ContentLayer>}
  </section>
}
