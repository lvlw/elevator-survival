import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PlayerAction, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import type { PreplayFeedEntry } from '../../../app/infected-preplay/types'
import type { BrowserControls } from '../../../app/infected-browser/types'
import { StatusHud } from './status-hud'
import { PersistenceBanner } from './persistence-banner'
import { InventoryPanel } from './inventory-panel'
import { WorldStage } from './world-stage'
import { FeedPanel } from './feed-panel'
import { actionName } from '../labels'
import { ActionButton } from './action-information'
import { KnowledgeMap, type MapScope } from './knowledge-map'
import { MissionGuide } from './mission-guide'
import { areaRoomName, uniqueTarget, type MapTarget } from '../map/projection'
import { ContentLayer } from './content-layer'
import { BodyDetails, HelpDetails } from './shell-information'
import { ItemInspectionProvider } from './item-inspection'

export function GameShell({ view, feed, onAction, onRetrySave, describeAction, previewAction, presentation, narrative, children }: {
  view: PlayerReadyView; feed: readonly PreplayFeedEntry[]; onAction(action: PlayerAction, item?: PlayerItem): void
  onRetrySave(): void; describeAction: BrowserControls['describeAction']; previewAction: BrowserControls['preview']; children?: ReactNode; presentation?: ReactNode; narrative?: ReactNode
}) {
  const stageRef = useRef<HTMLElement>(null)
  const [utilitiesOpen, setUtilitiesOpen] = useState(false)
  const [panel, setPanel] = useState<'tasks' | 'body' | 'help' | 'map' | null>(null)
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null)
  const utility = view.actions.filter(action => action.family === 'medical' || action.family === 'maintenance')
  const utilitiesAvailable = view.point === 'stable-active' && view.phase === 'active-world' && utility.length > 0
  const restoreUtilityFocus = useRef(utilitiesAvailable)
  restoreUtilityFocus.current = utilitiesAvailable
  useEffect(() => { if (!utilitiesAvailable) setUtilitiesOpen(false) }, [utilitiesAvailable])

  const [mapScope, setMapScope] = useState<MapScope>({ anchor: view.location?.place ?? null, world: false, place: view.location?.place ?? null, selected: null })
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null)
  const ended = view.point === 'living-hub' || view.point === 'dead'
  const taskTitle = ended ? '委托摘要' : '任务目标'
  const active = view.phase === 'active-world' && view.location !== null
  const safeTarget = active && mapTarget && uniqueTarget(view.map, mapTarget) ? mapTarget : null
  const locate = (target: MapTarget) => {
    if (!active || !uniqueTarget(view.map, target)) return
    setMapTarget(target)
    setMapScope({ anchor: view.location?.place ?? null, world: !target.name, place: target.place,
      selected: target.name ? `${target.place} / ${target.name}` : null })
    setPanel('map')
  }
  const closePanel = () => {
    if (panel === 'map' && mapTarget) {
      setMapTarget(null)
      setMapScope(current => ({ ...current, selected: null }))
    }
    setPanel(null)
  }
  useEffect(() => {
    setMapTarget(null)
    if (!active) setPanel(current => current === 'map' ? null : current)
  }, [active, view.location?.place])
  const mapProps = { map: view.map, scope: mapScope, onScope: setMapScope, target: safeTarget }
  const missionProps = { view, onLocate: locate, describeAction }
  const mapVisible = active && panel === 'map'
  return <ItemInspectionProvider view={view} describeAction={describeAction} onAction={onAction}>
    <main className={`iw-app iw-game${drawer ? ` iw-drawer-${drawer}` : ''}`}>
      <StatusHud view={view} onBody={() => setPanel('body')} onHelp={() => setPanel('help')} />
      <nav className="iw-drawer-tabs" aria-label="窄屏侧栏">
        <button onClick={() => setDrawer(drawer === 'left' ? null : 'left')}>任务</button>
        <button onClick={() => setDrawer(drawer === 'right' ? null : 'right')}>携带</button>
        {drawer && <button onClick={() => setDrawer(null)}>关闭侧栏</button>}
      </nav>
      <div className="iw-game-layout">
        <aside className="iw-sidebar iw-framed" aria-label="任务与已知信息">
          <MissionGuide {...missionProps} />
          <button type="button" onClick={() => setPanel('tasks')}>{taskTitle}</button>
        </aside>
        <div className="iw-stage-column">
          {active && view.combat && <div className="iw-battle-map-link">
            <span>{areaRoomName(view.location!)}</span>
            <button type="button" aria-label="展开已知区域" onClick={() => setPanel('map')}>已知地图</button>
          </div>}
          <WorldStage stageRef={stageRef} view={view} onAction={onAction} presentation={presentation} readAction={{ describeAction, preview: previewAction }}
            terminalReview={ended ? narrative : null}
            minimap={active && !view.combat ? <KnowledgeMap {...mapProps} onExpand={() => setPanel('map')} /> : null} />
          {!ended && narrative}
        </div>
        <div className="iw-carrying iw-framed">
          <InventoryPanel view={view} onAction={onAction} describeAction={describeAction} />
          {utilitiesAvailable && <button className="iw-utility-button" type="button" aria-expanded={utilitiesOpen}
            onClick={() => setUtilitiesOpen(open => !open)}>药食与维护</button>}
        </div>
      </div>
      <footer className="iw-footer iw-framed">
        <PersistenceBanner persistence={view.persistence} onRetrySave={onRetrySave} />
        <span className="iw-recent-feedback">{feed.at(-1)?.text ?? '当前会话尚无行动记录'}</span>
        <details className="iw-feed-drawer"><summary>行动记录</summary><FeedPanel feed={feed} /></details>
      </footer>
      {panel && (panel !== 'map' || mapVisible) && <ContentLayer key={panel} stageRef={stageRef}
        title={{ tasks: taskTitle, body: '身体', help: '帮助', map: '已知地图' }[panel]}
        tier={panel === 'map' ? 'map' : panel === 'tasks' ? 'mission' : 'summary'} onClose={closePanel}>
        {panel === 'tasks' ? <MissionGuide {...missionProps} detail /> : panel === 'map' ? <KnowledgeMap {...mapProps} compact={false} /> :
          panel === 'body' ? <BodyDetails view={view} /> : <HelpDetails />}
      </ContentLayer>}
      {utilitiesOpen && utilitiesAvailable && <ContentLayer title="药食与维护" tier="parameters" onClose={() => setUtilitiesOpen(false)}
        restoreFocus={() => restoreUtilityFocus.current}>
        <div className="iw-actions">{utility.map((action, index) => <ActionButton key={index} action={action}
          onAction={() => onAction(action)}>{actionName(action)}</ActionButton>)}</div>
      </ContentLayer>}
      {children}
    </main>
  </ItemInspectionProvider>
}
