import { describe, expect, it } from 'vitest'
import contract from '../../../docs/engineering/world-integration/player-query/player-query-field-contract-v1.0.json'
import { begin, playerHarness, ready, normalize, counts } from './player-test-fixtures'
import { createPlayerSession } from './player-controlled'
import { infectedWorldPlayerLabels } from '../../content/infected-world-v0.1/player-query'
import { wrapPlayerSession } from './player-facade'
import type { CombatResidencePolicy } from '../residence-save/combat-types'

describe('Q01 Q02 Q04 Q06 all 24 fields and controlled boundary', () => {
  it('all ratified keys have actual view paths, not the historical 3/12/9 support claim', () => {
    const h = playerHarness(); begin(h); const v = ready(h.player)
    const fields = {
      'first.toolChoices': v.first.toolChoices, 'first.specialtyChoices': v.first.specialtyChoices,
      phase: v.phase, location: v.location, taskDay: v.taskDay,
      'map.nodes': v.map.nodes, 'map.routes': v.map.routes, 'move.options': v.move.options,
      sources: v.sources, ground: v.ground, carried: v.carried, 'tasks.publicObjectives': v.tasks.publicObjectives,
      'terminal.eligibility': v.terminal.eligibility, 'terminal.result': v.terminal.result,
      'combat.intent': v.combat?.intent ?? null, 'combat.actions': v.combat?.actions ?? [],
      'combat.enemyStage': v.combat?.enemyStage ?? null, 'combat.relativeTimeline': v.combat?.relativeTimeline ?? null,
      'body.hp': v.body.hp, 'body.bleedingWounds': { bleeding: v.body.bleeding, wounds: v.body.wounds },
      'body.energySatiety': { energy: v.body.energy, satiety: v.body.satiety, quotas: v.body.quotas },
      'body.infectionWarning': v.body.infectionWarning, 'persistence.feedback': v.persistence.feedback,
      'staticHub.successors': v.staticHub.successors,
    }
    expect(Object.keys(fields).sort()).toEqual(contract.fields.map(f => f.field).sort())
    expect(Object.keys(fields)).toHaveLength(24)
    expect(v.body.infectionWarning.kind).toBe('unknown')
    expect(v.body.hp).toEqual({ current: 12, maximum: 12 })
    expect(v.location!.name).toBe('电梯前室'); expect(v.taskDay).toBe(1)
    expect(v.carried).toHaveLength(4)
  })
  it('ordinary facade has no current/commit/command/authority/writer or bootstrap replacement API', () => {
    const h = playerHarness(); begin(h)
    expect(Object.keys(h.player).sort()).toEqual(['execute', 'preview', 'query', 'resolve', 'retrySave', 'setup', 'subscribe'])
    const view = ready(h.player), before = h.owner.getState().current, n = counts(h)
    expect(Reflect.set(view.body.hp, 'current', 999)).toBe(false)
    expect(Reflect.set(view.carried[0].selector, 'instanceId', 'injected')).toBe(false)
    expect(h.owner.getState().current).toBe(before); expect(counts(h)).toEqual(n)
    expect(normalize(view)).toEqual(normalize(h.player.query()))
  })
  it('new controlled facade uses the existing shared writer domain and issued version-bound policy', () => {
    const h = playerHarness(), n = counts(h)
    expect(() => createPlayerSession(h.domain, h.composition, infectedWorldPlayerLabels)).toThrow()
    expect(() => wrapPlayerSession(h.owner, Object.freeze({ kind: 'combat-residence-policy' }) as CombatResidencePolicy, infectedWorldPlayerLabels)).toThrow()
    expect(counts(h)).toEqual(n); expect(h.owner.getState().current).toBeNull()
  })
})
