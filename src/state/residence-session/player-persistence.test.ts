import { describe, expect, it } from 'vitest'
import { begin, playerHarness, ready, choose, send, counts } from './player-test-fixtures'
import { coldSaved } from './combat-test-fixtures'
import { wrapPlayerSession } from './player-facade'
import { infectedWorldPlayerLabels } from '../../content/infected-world-v0.1/player-query'

describe('Q10 persistence feedback and callback boundaries', () => {
  it('save failure retains latest memory/handles; retry only writes and preserves selection', () => {
    const h = playerHarness(); begin(h); const n = counts(h), old = choose(h.player, 'move', '大厅')
    h.faults.write = true
    expect(h.player.execute({ action: old }).kind).toBe('committed')
    expect(ready(h.player).location!.name).toBe('大厅'); expect(ready(h.player).persistence.feedback).toBe('save-failed')
    const latest = choose(h.player, 'move', '电梯前室'), memory = h.owner.getState().current
    expect(h.player.execute({ action: old }).kind).toBe('rejected')
    expect(counts(h)).toEqual({ ...n, writes: n.writes + 1, notices: n.notices + 1 })
    h.faults.write = false
    expect(h.player.retrySave().persistence.feedback).toBe('saved')
    expect(h.owner.getState().current).toBe(memory); expect(choose(h.player, 'move', '电梯前室')).toBe(latest)
    expect(counts(h)).toEqual({ ...n, writes: n.writes + 2, notices: n.notices + 1 })
    const cold = coldSaved(h), facade = wrapPlayerSession(cold.owner, cold.policy, infectedWorldPlayerLabels)
    expect(facade.player.execute({ action: latest }).kind).toBe('rejected')
  })
  it('write and native notification callbacks see blocked projection and cannot reenter gameplay', () => {
    const h = playerHarness(); begin(h); const action = choose(h.player, 'move', '大厅'), observations: string[] = []
    h.hooks.write = () => {
      observations.push(h.player.query().status)
      expect(h.player.execute({ action }).kind).toBe('rejected')
      expect(h.player.retrySave().status).toBe('blocked')
    }
    const unsubscribe = h.player.subscribe(view => {
      observations.push(view.status)
      expect(h.player.execute({ action }).kind).toBe('rejected')
    })
    const n = counts(h), calls = h.dispatch.mock.calls.length
    expect(h.player.execute({ action }).kind).toBe('committed'); unsubscribe()
    expect(observations).toEqual(['blocked', 'blocked'])
    expect(h.dispatch).toHaveBeenCalledTimes(calls + 1)
    expect(counts(h)).toEqual({ ...n, writes: n.writes + 1, notices: n.notices + 1 })
    expect(ready(h.player).location!.name).toBe('大厅')
  })
})
