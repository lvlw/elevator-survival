import type { ActivityFeedEntry } from '../presentation/activity-feed'

const categoryIcon = {
  scene: '➜', combat: '⚔', inventory: '▦', hub: '⚙', lifecycle: '◷',
} as const

export function ActivityFeed({ entries, combatOnly = false }: Readonly<{
  entries: readonly ActivityFeedEntry[]
  combatOnly?: boolean
}>) {
  const shown = combatOnly ? entries.filter(({ category }) => category === 'combat') : entries
  return <section className="activity-feed" aria-label={combatOnly ? '战斗日志' : '行动记录'}>
    <strong>{combatOnly ? '战斗记录' : '行动记录'}</strong>
    <ol aria-live="polite">{shown.length === 0
      ? <li className="activity-feed__empty">尚无本次会话记录</li>
      : shown.slice(-6).map((entry) => <li className={`activity-feed__entry activity-feed__entry--${entry.category}`} key={entry.sequence}>
        <span className="activity-feed__icon" aria-hidden="true">{categoryIcon[entry.category]}</span>
        <span className="activity-feed__copy"><strong>{entry.action}</strong><small>{entry.outcome}</small></span>
      </li>)}</ol>
  </section>
}
