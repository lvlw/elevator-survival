import type { StableRunPlayerViewModel } from './stable-run-view-model'

export type ActivityFeedCategory = 'scene' | 'combat' | 'inventory' | 'hub' | 'lifecycle'

export interface ActivityFeedEntry {
  readonly sequence: number
  readonly category: ActivityFeedCategory
  readonly action: string
  readonly outcome: string
}

/** A short, player-safe, session-local record of a committed execution. */
export function projectActivityFeedEntry(input: Readonly<{
  sequence: number
  category: ActivityFeedCategory
  action: string
  before: StableRunPlayerViewModel
  after: StableRunPlayerViewModel
}>): ActivityFeedEntry {
  const facts: string[] = []
  if (input.before.kind === 'scene-session' && input.after.kind === 'scene-session') {
    if (input.before.scene.currentNodeName !== input.after.scene.currentNodeName) {
      facts.push(`到达${input.after.scene.currentNodeName}`)
    }
    if (input.before.scene.remainingTime !== input.after.scene.remainingTime) {
      facts.push(`时间 ${input.before.scene.remainingTime}→${input.after.scene.remainingTime}`)
    }
    if (input.before.scene.status !== input.after.scene.status) {
      facts.push(input.after.scene.status === 'combat' ? '进入战斗' :
        input.after.scene.status === 'dead' ? '行动失败' :
        input.after.scene.status === 'forced-returned' ? '强制返程' :
        input.after.scene.status === 'safe-returned' ? '安全返回' : '继续探索')
    }
  }
  if (input.before.kind !== 'run-failure' && input.after.kind !== 'run-failure') {
    const beforeHealth = input.before.status.condition.currentHealth
    const afterHealth = input.after.status.condition.currentHealth
    if (beforeHealth !== afterHealth) facts.push(`生命 ${beforeHealth}→${afterHealth}`)
  }
  if (input.before.kind !== input.after.kind) {
    facts.push(input.after.kind === 'current-day-hub' ? '返回中枢' :
      input.after.kind === 'scene-session' ? '进入场景' : '本局终止')
  }
  return Object.freeze({
    sequence: input.sequence,
    category: input.category,
    action: input.action,
    outcome: facts.length > 0 ? facts.join(' · ') : '已执行',
  })
}
