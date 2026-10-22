import { describe, expect, it } from 'vitest'
import { appHarness, startApp, appChoose, commit } from './test-fixtures'
import { counts } from '../../state/residence-session/player-test-fixtures'
describe('controller readonly input delegation', () => {
  it('preserves snapshot draft and zero gameplay effects', () => {
    const h = appHarness(); startApp(h)
    const action = appChoose(h.app, 'inventory', '放入背包'), snapshot = h.app.getSnapshot(), before = counts(h)
    const result = h.app.describeAction(action)
    expect(result.fields).toEqual(['item', 'placement']); expect(h.app.getSnapshot()).toBe(snapshot)
    expect(counts(h)).toEqual(before)
  })
  it('does not rebind an old action after a new current', () => {
    const h = appHarness(); startApp(h); const action = appChoose(h.app, 'inventory', '放入背包')
    commit(h.app, { action: appChoose(h.app, 'move', '大厅') })
    expect(() => h.app.describeAction(action)).toThrow()
  })
})
