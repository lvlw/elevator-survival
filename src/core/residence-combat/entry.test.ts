import { describe, it, expect } from 'vitest'
import { createCombatTestFactory } from './test-fixtures'
import { createInfectedCombatDependencies } from '../../content/infected-world-v0.1/combat-initial'
import { planCombatMove, planCombatRest } from './controlled'
const { entered, fixture } = createCombatTestFactory(() => createInfectedCombatDependencies('combat-test-character'))
describe('P02 real first departure and entry', () => {
  it.each([['orderly',70],['porter',150],['technician',60]] as const)('%s retains first CTB %i despite G2 encountered flag', (id,ctb) => {
    const h = entered(id)
    expect(h.initial.origins).toHaveLength(4)
    expect(h.initial.itemStates.states.find(s => s.definitionId === 'weapon_metal_pipe')?.resource).toEqual({kind:'durability',current:30})
    expect(h.initial.itemStates.states.find(s => s.definitionId === 'armor_heavy_coat')?.resource).toEqual({kind:'integrity',current:12})
    expect(h.value.battle?.entry.previouslyEncountered).toBe(false)
    expect(h.value.battle?.currentCtb).toBe(0); expect(h.value.battle?.enemyNext).toBe(ctb)
    expect(h.value.site?.enemies.find(e => e.id === id)?.state.hasBeenEncountered).toBe(true)
    expect(h.value.battle?.entry.revision).toBe(h.value.character.revision)
  })
  it('forbids move/rest during battle', () => {
    const h = entered()
    expect(() => planCombatMove(h.value, {kind:'move',edgeId:'H1-H4:reverse',expectedRevision:h.value.character.revision},h.authorize(h.value))).toThrow()
    expect(() => planCombatRest(h.value, {kind:'rest',expectedRevision:h.value.character.revision},h.authorize(h.value))).toThrow()
  })
  it('does not fabricate initial food or second execution', () => {
    const h = fixture()
    expect(h.initial.origins.some(o=>o.definitionId==='consumable_ration')).toBe(false)
    expect(h.initial.missions).toHaveLength(1)
  })
  it('last positive energy move reaches E0 but still opens the real encounter', () => {
    const h = entered('orderly', { energy: 9 })
    expect(h.value.character.body.energy).toBe(0)
    expect(h.value.battle!.enemyNext).toBe(70)
    const hit = h.action(h.value, { kind: 'metal-pipe-basic-attack' })
    expect(hit.snapshot.character.body.energy).toBe(0)
    expect(hit.snapshot.battle!.decision!.enemyHealthAfter).toBe(10)
  })
  it('real arrival bleeding death never creates a battle or publishes HP0 active', () => {
    const h = entered('orderly', { hp: 3, bleeding: true })
    expect(h.value.phase).toBe('dead')
    expect(h.value.battle).toBeNull()
    expect(h.value.combatDeaths).toHaveLength(0)
    expect(h.value.receipts[0].source).toBe('supply-death')
    expect(h.value.archives[0].site.enemies.find(e => e.id === 'orderly')!.state.resolvedActionCount).toBe(0)
  })
})
