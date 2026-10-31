import { afterEach, describe, expect, it, vi } from 'vitest'
import { committedCase } from './player-committed-presentation-test-fixtures'
import { observe } from './combat-test-observers'
import { ready } from './player-test-fixtures'
import { wrapPlayerSession } from './player-facade'
import { infectedWorldPlayerLabels as labels } from '../../content/infected-world-v0.1/player-query'

afterEach(() => vi.restoreAllMocks())
describe('B1 facade native payment and parsed action authority', () => {
  it.each(['last-durability', 'quick'] as const)('K06 %s pays the real last resource once and rejects the stale request', id => {
    const { h, request } = committedCase(id), before = ready(h.player), o = observe(h); o.clear(); h.dispatch.mockClear()
    const result = h.player.execute(request), value = h.owner.getState().current!, d = value.battle!.decision!
    expect(result.committedAction).toEqual({ action: id === 'quick' ? 'quick-use' : 'signature' })
    if (id === 'quick') {
      expect(d.trace[0]).toMatchObject({ kind: 'heal', actual: 1 }); expect(d.uses).toHaveLength(1)
      expect(value.carried.quickSlots.slots[0]).toBeNull(); expect(ready(h.player).combat!.actions.some(a => a.quickConsumption)).toBe(false)
    } else {
      expect(before.combat!.actions.find(a => a.selector === request.action)!.resourceCost).toMatchObject({ currentBefore: 1, requested: 3, consumed: 1, after: 0 })
      expect(d.resources.find(r => r.requested === 3)).toMatchObject({ before: 1, requested: 3, consumed: 1, after: 0 })
    }
    expect(o.counts()).toMatchObject({ combat: 1, ctb: 1, current: 1, write: 1, batches: 1 })
    o.clear(); h.dispatch.mockClear(); expect(h.player.execute(request)).not.toHaveProperty('committedAction')
    expect(h.dispatch).not.toHaveBeenCalled(); expect(Object.values(o.counts()).every(n => n === 0)).toBe(true)
  })
  it('K01 translated identical labels cannot classify different original opaque choices', () => {
    for (const [index, action] of [[0, 'defend'], [1, 'retreat']] as const) {
      const { h } = committedCase('basic')
      const p = wrapPlayerSession(h.owner, h.policy, { ...labels, action: () => 'SAME-TRANSLATED-LABEL' }).player
      const choices = ready(p).combat!.actions
      // Stable sorting preserves the original formal command order for identical labels.
      expect(choices[0].label).toBe(choices[1].label)
      expect(p.execute({ action: choices[index].selector }).committedAction).toEqual({ action })
    }
  })
})
