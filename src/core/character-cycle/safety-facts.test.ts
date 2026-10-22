import { describe, expect, it } from 'vitest'
import { fixture } from '../../state/residence-session/combat-test-fixtures'
import { queryPublicActionCheckpoint } from './safety-facts'
import { queryActionBleedingHealth } from './cycle'

describe('F03 same-owner action checkpoint scalar', () => {
  it.each([[1, true, true, 0], [2, true, true, 1], [1, true, false, 1], [1, false, true, 1]] as const)('HP%i bleed%s paid%s -> %i', (hp, bleeding, paid, after) => {
    const f = fixture({ hp, bleeding }), d = f.deps.supply.residence
    expect(queryActionBleedingHealth(hp, bleeding, paid, d)).toBe(after)
    const q = queryPublicActionCheckpoint(f.value.character.body, paid, d)
    expect(q.healthAfter).toBe(after); expect(q.death.kind).toBe(after ? 'not-guaranteed' : 'guaranteed')
  })
  it.each([-1, 0.1, NaN, Infinity, 13])('rejects bad scalar %s', hp => {
    const f = fixture()
    expect(() => queryActionBleedingHealth(hp, true, true, f.deps.supply.residence)).toThrow()
  })
  it('HP0 cannot become a new action or free self-rescue proof', () => {
    const f = fixture(), body = { ...f.value.character.body, condition: { ...f.value.character.body.condition, currentHealth: 0 } }
    expect(() => queryPublicActionCheckpoint(body, false, f.deps.supply.residence)).toThrow()
  })
})
