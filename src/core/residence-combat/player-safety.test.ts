import { describe, expect, it } from 'vitest'
import { fixture, bodyBoundary } from '../../state/residence-session/combat-test-fixtures'
import { readCombatValue } from './validation'
import { fromValue, ready, choose } from '../../state/residence-session/player-test-fixtures'
import { createResidenceCombatDependencies } from './dependencies'
import { drawIntInclusive } from '../random'

describe('F03 public escape branch bounds without a future roll', () => {
  function mixed(value: number) {
    const f = fixture(), s = Object.freeze({ ...f.deps.supply, draw: (c: Parameters<typeof drawIntInclusive>[0], min: number, max: number) =>
      ({ ...drawIntInclusive(c, min, max), value }) }), deps = createResidenceCombatDependencies(s, f.deps.profiles)
    let v = f.move(f.value, 'H1').snapshot
    v = f.task(v, 'fire-door', { method: 'crow', toolInstanceId: v.carried.equipment.utility!.instanceId }).snapshot
    // Explicit legal TEST pre-entry HP/resource boundary, not a fabricated enemy or result.
    v = bodyBoundary(v, deps, { condition: { ...v.character.body.condition, currentHealth: 4 } })
    const armor = v.carried.equipment.armor!.instanceId
    v = readCombatValue({ ...v, itemStates: { states: v.itemStates.states.map(i => i.instanceId === armor ? { ...i, resource: { kind: 'integrity', current: 0 } } : i) } }, deps)
    // Entry uses real production; the session below uses the independently bound draw port.
    v = f.move(v, 'H4').snapshot
    const session = fromValue(v, deps)
    // The read-only old cold helper deliberately installs quietDraw. Explicitly
    // bind this TEST conditional witness port before executing either branch.
    session.draw.mockImplementation(s.draw)
    return session
  }
  it('one public response supports both completion bleeding death and survival, so the whole command is not-guaranteed', () => {
    const pair = [1, 100].map(mixed)
    const requests = pair.map(h => ({ action: choose(h.player, 'combat', '退却') }))
    const metadata = pair.map((h, n) => h.preplay.inspect(requests[n]))
    expect(metadata[0]).toEqual(metadata[1]); expect(metadata[0].death.kind).toBe('not-guaranteed')
    pair.forEach((h, n) => expect(h.player.execute(requests[n]).kind).toBe('committed'))
    expect(pair.map(h => ready(h.player).phase)).toEqual(['dead', 'active-world'])
    expect(pair[0].owner.getState().current!.combatDeaths[0].decision.trace.at(-1)!.kind).toBe('post-action-bleeding')
  })
})
