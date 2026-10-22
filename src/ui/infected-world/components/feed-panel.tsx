import { useLayoutEffect, useRef } from 'react'
import type { PreplayFeedEntry } from '../../../app/infected-preplay/types'
export function FeedPanel({ feed }: { feed: readonly PreplayFeedEntry[] }) {
  const list = useRef<HTMLOListElement>(null)
  useLayoutEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight }, [feed])
  return <section className="iw-feed" aria-label="行动记录"><header><strong>行动记录</strong><span>当前会话</span></header>
    <ol ref={list} aria-live="polite">{feed.length ? feed.map(entry => <li key={entry.ordinal}><span aria-hidden="true">{entry.kind === 'recovery' ? '↺' : '›'}</span>{entry.text}</li>) : <li className="iw-muted">尚无本会话行动；不会根据存档补造过去的记录。</li>}</ol>
  </section>
}
