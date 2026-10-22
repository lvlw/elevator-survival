import { describe, expect, it } from 'vitest'
import { fixture, entered, bodyBoundary } from './combat-test-fixtures'
import { planCombatTerminal } from '../../core/residence-combat/controlled'
import { fromValue, ready, normalize, playerHarness } from './player-test-fixtures'

describe('F01 F08 safe current condition at every complete point', () => {
  it('real first-hub, stable, combat, living Hub and dead read retained current facts without cycling', () => {
    const first = playerHarness(); first.bootstrap(); first.createFirst()
    const f = fixture(), combat = entered(), dying = fixture({ hp: 1, bleeding: true })
    const living = planCombatTerminal(f.value, { kind: 'withdraw', expectedRevision: f.value.character.revision }, f.authorize(f.value)).snapshot
    const dead = dying.move(dying.value, 'H1').snapshot
    const rows = [first, fromValue(f.value, f.deps), fromValue(combat.value, combat.deps), fromValue(living, f.deps), fromValue(dead, dying.deps)]
    expect(rows.map(h => ready(h.player).point)).toEqual(['first-hub', 'stable-active', 'battle-decision', 'living-hub', 'dead'])
    for (const h of rows) {
      const v = h.owner.getState().current!, cycle = v.character.cycle
      expect(ready(h.player).body.infectionWarning.kind).toBe('known')
      expect(h.owner.getState().current).toBe(v); expect(v.character.cycle).toBe(cycle)
    }
    expect(living.receipts.at(-1)!.steps).toEqual([])
    expect(dead.character.body.condition.currentHealth).toBe(0)
  })
  it('same-band hidden progress/exposure cannot change complete view or metadata', () => {
    const f = fixture(), records = [61, 89].map((progress, n) => {
      const value = bodyBoundary(f.value, f.deps, { infectionProgress: progress,
        condition: { ...f.value.character.body.condition, pendingInfectionExposures: n * 2 } })
      const h = fromValue(value, f.deps), q = ready(h.player), request = { action: q.move.options[0].selector }
      return { view: normalize(q), metadata: h.preplay.inspect(request) }
    })
    expect(records[0]).toEqual(records[1])
    expect(JSON.stringify(records)).not.toMatch(/infectionProgress|pendingInfectionExposures|suppression|runId|riskPercent/)
  })
  it('no current does not invent a lowest-band character; invalid suppression is not a legal hidden pair', () => {
    const h = playerHarness()
    expect(h.player.query()).not.toHaveProperty('body')
    h.bootstrap(); expect(h.player.query()).not.toHaveProperty('body')
    const f = fixture()
    expect(() => bodyBoundary(f.value, f.deps, { suppression: 15 })).toThrow()
  })
})
