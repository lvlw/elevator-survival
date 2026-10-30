import { describe, expect, it } from 'vitest'
import { fixture, entered } from './combat-test-fixtures'
import { fromValue, ready, normalize, send } from './player-test-fixtures'
import { baselineProjectPlayerView } from './player-opponent-test-fixtures'
import { createPlayerContext } from './player-context'
import { infectedWorldPlayerLabels as labels } from '../../content/infected-world-v0.1/player-query'
import { planCombatTerminal } from '../../core/residence-combat/controlled'
import { selectEnemyHealthPhase } from '../../core/combat/combat-selectors'

describe('A complete historical DTO equivalence and formal phase semantics', () => {
  it('baseline oracle compares every field, action and handle alias at all five complete points', () => {
    const f = fixture(), dead = fixture({ hp: 1, bleeding: true })
    const values = [f.initial, f.value, entered().value,
      planCombatTerminal(f.value, { kind: 'withdraw', expectedRevision: f.value.character.revision }, f.authorize(f.value)).snapshot,
      dead.move(dead.value, 'H1').snapshot]
    for (const value of values) {
      const h = fromValue(value, f.deps), q = ready(h.player), current = h.owner.getState().current!
      const old = baselineProjectPlayerView(h.owner.getState(), createPlayerContext(current, h.deps), h.deps, labels)
      const combat = q.combat ? (({ opponent: _, ...rest }) => rest)(q.combat) : null
      expect(normalize({ ...q, combat })).toEqual(normalize(old))
      expect(Object.keys(h.player).sort()).toEqual(['execute', 'preview', 'query', 'resolve', 'retrySave', 'setup', 'subscribe'])
    }
  })
  it.each(['orderly', 'porter', 'technician'] as const)('%s query uses original stage selector at native reachable HP, including critical', enemy => {
    const observed = new Set<string>()
    for (const sequence of [['金属管攻击', '金属管攻击', '金属管攻击'], ['蓄力打击', '金属管攻击', '金属管攻击']]) {
      const f = entered(enemy), h = fromValue(f.value, f.deps)
      for (const label of [null, ...sequence]) {
        if (label) send(h.player, 'combat', label)
        const q = ready(h.player), v = h.owner.getState().current!
        if (!q.combat) { expect(v.battle).toBeNull(); continue }
        const e = v.site!.enemies.find(e => e.id === v.battle!.entry.enemyId)!, profile = h.deps.profiles.find(p => p.definitionId === e.state.definitionId)!
        expect(q.combat.enemyStage).toBe(selectEnemyHealthPhase(e.state.currentHealth, profile.maxHealth))
        observed.add(q.combat.enemyStage)
        const old = baselineProjectPlayerView(h.owner.getState(), createPlayerContext(v, h.deps), h.deps, labels)
        const { opponent: _, ...combat } = q.combat
        expect(normalize({ ...q, combat })).toEqual(normalize(old))
      }
    }
    expect([...observed].sort()).toEqual(['critical', 'healthy', 'severely-wounded', 'wounded'])
  })
  it('formal five-phase specification includes positive-HP incapacitated without inventing live HP0 or death', () => {
    for (const max of [14, 16]) {
      const phases = new Set(Array.from({ length: max + 1 }, (_, hp) => selectEnemyHealthPhase(hp, max)))
      expect([...phases].sort()).toEqual(['critical', 'healthy', 'incapacitated', 'severely-wounded', 'wounded'])
    }
    expect(selectEnemyHealthPhase(1, 16)).toBe('incapacitated')
    expect(selectEnemyHealthPhase(1, 14)).toBe('critical')
    // Current native damage values are all even; HP16 enemies cannot reach HP1.
    // Selector specification is distinct from claiming that state was produced by this content.
  })
})
