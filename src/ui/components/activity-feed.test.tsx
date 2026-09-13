import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ActivityFeed } from './activity-feed'

describe('ActivityFeed', () => {
  it('shows the combat filter of the same session entries without a second log owner', () => {
    const entries = [
      { sequence: 1, category: 'scene' as const, action: '前往急诊大厅', outcome: '已执行' },
      { sequence: 2, category: 'combat' as const, action: '挥击', outcome: '生命 7→6' },
    ]
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<ActivityFeed entries={entries} combatOnly />)
    expect(container.querySelector('.activity-feed')?.getAttribute('aria-label')).toBe('战斗日志')
    expect(container.textContent).toContain('挥击')
    expect(container.textContent).not.toContain('前往急诊大厅')
    expect(entries).toHaveLength(2)
    container.innerHTML = renderToStaticMarkup(<ActivityFeed entries={entries} />)
    expect(container.textContent).toContain('挥击')
    expect(container.textContent).toContain('前往急诊大厅')
  })

  it('presents committed categories as compact game feedback without changing entry facts', () => {
    const entries = [
      { sequence: 1, category: 'scene' as const, action: '前往急诊大厅', outcome: '时间 200→190' },
      { sequence: 2, category: 'combat' as const, action: '挥击', outcome: '生命 7→6' },
    ]
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<ActivityFeed entries={entries} />)
    expect(container.querySelectorAll('.activity-feed__entry')).toHaveLength(2)
    expect(container.querySelector('.activity-feed__entry--scene .activity-feed__icon')?.textContent).toBe('➜')
    expect(container.querySelector('.activity-feed__entry--combat .activity-feed__icon')?.textContent).toBe('⚔')
    expect(container.textContent).toContain('时间 200→190')
    expect(container.textContent).toContain('生命 7→6')
    expect(entries[0]?.outcome).toBe('时间 200→190')
  })

  it('keeps six most recent entries visible in the in-stage strip', () => {
    const entries = Array.from({ length: 7 }, (_, index) => ({
      sequence: index + 1,
      category: 'scene' as const,
      action: `行动${index + 1}`,
      outcome: '已执行',
    }))
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(<ActivityFeed entries={entries} />)
    expect(container.querySelectorAll('.activity-feed__entry')).toHaveLength(6)
    expect(container.textContent).not.toContain('行动1')
    expect(container.textContent).toContain('行动2')
    expect(container.textContent).toContain('行动7')
  })
})
