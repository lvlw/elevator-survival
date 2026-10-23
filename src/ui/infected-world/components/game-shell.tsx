import { useState, type ReactNode } from 'react'
import type { PlayerAction, PlayerItem, PlayerReadyView } from '../../../state/residence-session/player-types'
import type { PreplayFeedEntry } from '../../../app/infected-preplay/types'
import { StatusHud } from './status-hud'
import { PersistenceBanner } from './persistence-banner'
import { InventoryPanel } from './inventory-panel'
import { WorldStage } from './world-stage'
import { FeedPanel } from './feed-panel'
import { actionName } from '../labels'
import { publicItemName } from '../labels'
import type { BrowserControls } from '../../../app/infected-browser/types'
import { ActionButton } from './action-information'

export function GameShell({ view, feed, onAction, onRetrySave, describeAction, children }: { view: PlayerReadyView;
  feed: readonly PreplayFeedEntry[]; onAction: (action: PlayerAction, item?: PlayerItem) => void;
  onRetrySave: () => void; describeAction: BrowserControls['describeAction']; children?: ReactNode }) {
  const [utilitiesOpen, setUtilitiesOpen] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const utility = view.actions.filter(action => action.family === 'medical' || action.family === 'maintenance')
  return <main className="iw-app iw-game"><StatusHud view={view} /><PersistenceBanner persistence={view.persistence} onRetrySave={onRetrySave} />
    <div className="iw-game-layout"><div className="iw-stage-column"><WorldStage view={view} onAction={onAction} />
      <div className="iw-support-strip"><button type="button" aria-expanded={tasksOpen} onClick={() => setTasksOpen(open => !open)}>任务目标</button>
        {utility.length > 0 && <button type="button" aria-expanded={utilitiesOpen} onClick={() => setUtilitiesOpen(open => !open)}>药食与维护</button>}
      </div>
      {tasksOpen && <section className="iw-support-panel" aria-label="任务目标"><ul>{view.tasks.publicObjectives.map((objective, index) => <li key={index}>{publicItemName(objective.label)} · {objective.state === 'completed' ? '已完成' : objective.state === 'observed' ? '已观察' : '尚未观察'}</li>)}</ul><p>样本状态：{({ 'not-acquired': '尚未取得', carried: '正在携带', 'left-in-world': '留置现场', delivered: '已交付', unavailable: '当前不可取得' })[view.tasks.sample]}</p></section>}
      {utilitiesOpen && utility.length > 0 && <section className="iw-support-panel iw-actions" aria-label="药食与维护">{utility.map((action, index) => <ActionButton key={index} action={action} onAction={() => onAction(action)}>{actionName(action)}</ActionButton>)}</section>}
      <FeedPanel feed={feed} /></div><InventoryPanel view={view} onAction={onAction} describeAction={describeAction} /></div>
    {children}
  </main>
}
