import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PlayerAction, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import type { PreplayFeedEntry } from '../../../app/infected-preplay/types'
import { StatusHud } from './status-hud'
import { PersistenceBanner } from './persistence-banner'
import { InventoryPanel } from './inventory-panel'
import { WorldStage } from './world-stage'
import { FeedPanel } from './feed-panel'
import { actionName, toolName, specialtyName } from '../labels'
import { publicItemName } from '../labels'
import type { BrowserControls } from '../../../app/infected-browser/types'
import { ActionButton } from './action-information'
import { KnowledgeMap } from './knowledge-map'
import { ContentLayer } from './content-layer'
import { BodyDetails, HelpDetails } from './shell-information'
import { ItemInspectionProvider } from './item-inspection'

export function GameShell({ view, feed, onAction, onRetrySave, describeAction, presentation, children }: { view: PlayerReadyView;
  feed: readonly PreplayFeedEntry[]; onAction: (action: PlayerAction, item?: PlayerItem) => void;
  onRetrySave: () => void; describeAction: BrowserControls['describeAction']; children?: ReactNode; presentation?: ReactNode }) {
  const [utilitiesOpen, setUtilitiesOpen] = useState(false)
  const [panel, setPanel] = useState<'tasks' | 'body' | 'help' | 'map' | null>(null)
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null)
  const utility = view.actions.filter(action => action.family === 'medical' || action.family === 'maintenance')
  const utilitiesAvailable = view.point === 'stable-active' && view.phase === 'active-world' && utility.length > 0
  const restoreUtilityFocus = useRef(utilitiesAvailable); restoreUtilityFocus.current = utilitiesAvailable
  useEffect(() => { if (!utilitiesAvailable) setUtilitiesOpen(false) }, [utilitiesAvailable])
  const objectives = <><ul className="iw-objectives">{view.tasks.publicObjectives.map((objective, index) => <li key={index} data-state={objective.state}><span>{publicItemName(objective.label)}</span><small>{objective.state === 'completed' ? '已完成' : objective.state === 'observed' ? '已观察' : '尚未观察'}</small></li>)}</ul><p className="iw-muted">样本状态：{({ 'not-acquired': '尚未取得', carried: '正在携带', 'left-in-world': '留置现场', delivered: '已交付', unavailable: '当前不可取得' })[view.tasks.sample]}</p></>
  return <ItemInspectionProvider view={view} describeAction={describeAction} onAction={onAction}><main className={`iw-app iw-game${drawer ? ` iw-drawer-${drawer}` : ''}`}><StatusHud view={view} onBody={() => setPanel('body')} onHelp={() => setPanel('help')} />
    <nav className="iw-drawer-tabs" aria-label="窄屏侧栏"><button onClick={() => setDrawer(drawer === 'left' ? null : 'left')}>任务与地图</button><button onClick={() => setDrawer(drawer === 'right' ? null : 'right')}>携带</button>{drawer && <button onClick={() => setDrawer(null)}>关闭侧栏</button>}</nav>
    <div className="iw-game-layout"><aside className="iw-sidebar iw-framed" aria-label="任务与已知信息"><h2>当前委托</h2>{objectives}<button type="button" onClick={() => setPanel('tasks')}>任务目标</button>
      <h2>已知地点 <small>只读</small></h2><KnowledgeMap map={view.map} /><button type="button" onClick={() => setPanel('map')}>展开已知区域</button>
      <div className="iw-sidebar-bottom"><p>{view.location ? `${view.location.place} / ${view.location.name}` : '电梯中枢'}</p><p>工具：{view.first.toolChoices.map(toolName).join('、')}<br />专长：{view.first.specialtyChoices.map(specialtyName).join('、')}</p></div></aside>
      <div className="iw-stage-column"><WorldStage view={view} onAction={onAction} presentation={presentation} /></div>
      <div className="iw-carrying iw-framed"><InventoryPanel view={view} onAction={onAction} describeAction={describeAction} />
        {utilitiesAvailable && <button className="iw-utility-button" type="button" aria-expanded={utilitiesOpen} onClick={() => setUtilitiesOpen(open => !open)}>药食与维护</button>}
      </div></div>
    <footer className="iw-footer iw-framed"><PersistenceBanner persistence={view.persistence} onRetrySave={onRetrySave} /><span className="iw-recent-feedback">{feed.at(-1)?.text ?? '当前会话尚无行动记录'}</span><details className="iw-feed-drawer"><summary>行动记录</summary><FeedPanel feed={feed} /></details></footer>
    {panel && <ContentLayer title={{ tasks: '任务目标', body: '身体', help: '帮助', map: '已知地图' }[panel]} tier={panel === 'map' ? 'map' : 'summary'} onClose={() => setPanel(null)}>
      {panel === 'tasks' ? objectives : panel === 'map' ? <KnowledgeMap map={view.map} compact={false} /> : panel === 'body' ? <BodyDetails view={view} /> : <HelpDetails />}
    </ContentLayer>}
    {utilitiesOpen && utilitiesAvailable && <ContentLayer title="药食与维护" tier="parameters" onClose={() => setUtilitiesOpen(false)} restoreFocus={() => restoreUtilityFocus.current}><div className="iw-actions">{utility.map((action, index) => <ActionButton key={index} action={action} onAction={() => onAction(action)}>{actionName(action)}</ActionButton>)}</div></ContentLayer>}
    {children}
  </main></ItemInspectionProvider>
}
