import type { PlayerView } from '../../state/residence-session/player-types'
import type { PreplayFeedEntry } from './types'

/** Session-local public differences only. The input views are never retained. */
export function publicActionFeed(before: PlayerView | null, after: PlayerView): string {
  if (before?.status !== 'ready' || after.status !== 'ready') return '行动已完成。'
  const text: string[] = []
  if (before.body.hp.current !== after.body.hp.current) text.push(`生命 ${before.body.hp.current} → ${after.body.hp.current}`)
  if (before.body.energy.current !== after.body.energy.current) text.push(`精力 ${before.body.energy.current} → ${after.body.energy.current}`)
  if (before.body.satiety.current !== after.body.satiety.current) text.push(`饱食 ${before.body.satiety.current} → ${after.body.satiety.current}`)
  if (before.body.bleeding !== after.body.bleeding) text.push(after.body.bleeding ? '流血中' : '流血已停止')
  if (before.body.infectionWarning.band !== after.body.infectionWarning.band) text.push(`当前病程：${after.body.infectionWarning.label}`)
  if (before.location?.name !== after.location?.name && after.location) text.push(`抵达${after.location.name}`)
  if (before.phase !== after.phase) text.push(after.phase === 'dead' ? '角色已死亡' : after.phase === 'living-hub' ? '委托已结束，返回静态中枢' : '已出发')
  return text.length ? text.join('；') : '行动已完成，当前公开状态已更新。'
}
export function appendPreplayFeed(feed: readonly PreplayFeedEntry[], text: string, kind: PreplayFeedEntry['kind'] = 'action') {
  return Object.freeze([...feed, Object.freeze({ ordinal: (feed.at(-1)?.ordinal ?? 0) + 1, kind, text })].slice(-40))
}
