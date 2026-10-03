import { describe, expect, it, vi } from 'vitest'
import * as energy from '../residence-energy'
import * as random from '../random'
import { planResidenceLocationRest, restoreResidenceLocationCandidate } from './controlled'
import { assertResidenceLocationPlanCurrent, planResidenceMove, queryPlayerResidenceKnowledge } from './index'
import { binding, catalogInput, fixture as createFixture, move, mutable } from './test-fixtures'
import { infectedResidenceConfig } from '../../content/infected-residence-core-v0.1/config'
const fixture = (options: Parameters<typeof createFixture>[1] = {}) => createFixture(infectedResidenceConfig, options)

describe('G2 directed movement and G1 composition (L02 L03 L10)', () => {
  it('A to B to A keeps execution and D/T; each command changes the sole revision once', () => {
    const f = fixture(); const next = move(f, f.state, 'ab')
    expect(next.snapshot.site.nodeId).toBe('b'); expect(next.snapshot.character.revision).toBe(1)
    expect(next.snapshot.character.body.energy).toBe(92); expect(next.coordination).toBe('stable-local-result')
    const back = move(f, next.snapshot, 'ba').snapshot
    expect(back.site.nodeId).toBe('a'); expect(back.site.binding).toEqual(f.state.site.binding)
    expect(back.character.clock).toEqual(f.state.character.clock); expect(back.character.cycle).toBe(1)
    expect(back.character.revision).toBe(2); expect(f.state.site.nodeId).toBe('a')
  })
  it.each(['secret', 'cb', 'ba', 'absent'])('rejects unknown, reverse, remote or absent edge %s before G1/RNG', (edgeId) => {
    const f = fixture(); const action = vi.spyOn(energy, 'planResidenceAction'); const draw = vi.spyOn(random, 'drawIntInclusive')
    try { expect(() => move(f, f.state, edgeId)).toThrow(); expect(action).not.toHaveBeenCalled(); expect(draw).not.toHaveBeenCalled() }
    finally { vi.restoreAllMocks() }
  })
  it('E1 cost8 arrives at E0, bleeds once; next edge never calls effect provider or RNG', () => {
    const f = fixture({ energy: 1, bleeding: true }); const next = move(f, f.state, 'ab')
    expect(next.snapshot.character.body.energy).toBe(0); expect(next.snapshot.site.nodeId).toBe('b')
    expect(next.steps.map((s) => s.kind)).toEqual(['primary', 'action-bleeding'])
    expect(next.snapshot.character.body.condition.currentHealth).toBe(11)
    const draw = vi.spyOn(random, 'drawIntInclusive')
    expect(() => move(f, next.snapshot, 'ba')).toThrowError(expect.objectContaining({ code: 'ACTION_NOT_AVAILABLE' }))
    expect(draw).not.toHaveBeenCalled(); vi.restoreAllMocks()
  })
  it('E0 arrival still applies declared immediate loss/exposure and one bleeding checkpoint', () => {
    const catalog = catalogInput(); catalog.edges[0].arrival = { healthLoss: 2, exposuresAdded: 1 }
    const f = fixture({ energy: 1, bleeding: true, catalog }); const p = move(f, f.state, 'ab')
    expect(p.snapshot.character.body).toMatchObject({ energy: 0, condition: { currentHealth: 9, pendingInfectionExposures: 1 } })
    expect(p.steps.map((s) => s.kind)).toEqual(['primary', 'action-bleeding']); expect(p.snapshot.character.revision).toBe(1)
  })
  it('E0 next movement never invokes the G1 consequence provider', () => {
    const f = fixture({ energy: 1 }); const b = move(f, f.state, 'ab').snapshot
    const original = energy.planResidenceAction; const provider = vi.fn()
    vi.spyOn(energy, 'planResidenceAction').mockImplementation((input, request, authority, deps, provide) =>
      original(input, request, authority, deps, (completion) => { provider(); return provide(completion) }))
    try { expect(() => move(f, b, 'ba')).toThrow(); expect(provider).not.toHaveBeenCalled() }
    finally { vi.restoreAllMocks() }
  })
  it('rejects arithmetic overflow before a plan or source draw is produced', () => {
    const catalog = catalogInput(); catalog.edges[0].arrival.exposuresAdded = 1
    const f = fixture({ catalog }); const s = mutable(f.state)
    s.character.body.condition.pendingInfectionExposures = Number.MAX_SAFE_INTEGER
    expect(() => move(f, s, 'ab')).toThrowError(expect.objectContaining({ code: 'SAFE_INTEGER_OVERFLOW' }))
    const maximumRevision = mutable(f.state); maximumRevision.character.revision = Number.MAX_SAFE_INTEGER
    expect(() => move(f, maximumRevision, 'ab')).toThrowError(expect.objectContaining({ code: 'SAFE_INTEGER_OVERFLOW' }))
  })
  it.each([1, 2])('legal arrival death HP%i is a non-committable local result, not request rejection or mission closure', (hp) => {
    const catalog = catalogInput(); catalog.edges[0].arrival.healthLoss = 1
    const f = fixture({ energy: 1, bleeding: true, hp, catalog }); const p = move(f, f.state, 'ab')
    expect(p.coordination).toBe('death-required'); expect(p.snapshot.site.nodeId).toBe('b')
    expect(p.snapshot.character.body.condition.currentHealth).toBe(0)
    expect(p.snapshot.character.clock.kind).toBe('active'); expect(f.lifecycle.status).toBe('active')
    expect(() => move(f, p.snapshot, 'ba')).toThrow()
  })
  it('live arrival encounter at E0 is retained and cannot be bypassed by moving/resting or deleting pending', () => {
    const catalog = catalogInput(); catalog.facts[0].initial = true
    const f = fixture({ energy: 9, catalog }); const b = move(f, f.state, 'ab').snapshot
    const p = move(f, b, 'bc'); expect(p.snapshot.character.body.energy).toBe(0)
    expect(p.coordination).toBe('combat-required'); expect(p.snapshot.site.pending).toEqual({ kind: 'combat-required', enemyId: 'guard' })
    expect(p.snapshot.site.enemies[0].state.hasBeenEncountered).toBe(true)
    expect(() => move(f, p.snapshot, 'cb')).toThrow()
    expect(() => planResidenceLocationRest(p.snapshot, { ...binding(p.snapshot), kind: 'rest' }, f.authorityFor(p.snapshot), f.dependencies)).toThrow()
    const forged = mutable(p.snapshot); forged.site.pending = { kind: 'none' }
    expect(() => restoreResidenceLocationCandidate(forged, f.authorityFor(forged), f.dependencies)).toThrow()
  })
  it('current permission checks real carried item, never historic traversal', () => {
    const catalog = catalogInput(); catalog.edges[1].requiredItemDefinitionId = 'card'
    const f = fixture({ catalog }); const s = mutable(f.state)
    const card = { instanceId: 'real-card', definitionId: 'card', quantity: 1 }
    s.carried.backpack.items.push(card); s.carried.backpack.placements.push({ instanceId: card.instanceId, x: 0, y: 0, rotated: false })
    s.itemStates.states.push({ instanceId: card.instanceId, definitionId: card.definitionId, resource: { kind: 'none' } })
    const b = move(f, s, 'ab').snapshot
    expect(move(f, b, 'ba').snapshot.carried.backpack.items).toContainEqual(card)
    const without = mutable(b); without.site.ground.find((g) => g.nodeId === 'b')!.items.push(card)
    without.carried.backpack.items = []; without.carried.backpack.placements = []
    expect(queryPlayerResidenceKnowledge(without, f.authorityFor(without), f.dependencies).routes.find((r) => r.id === 'ba')?.passable).toBe(false)
    expect(() => move(f, without, 'ba')).toThrow()
  })
  it('guards issued plans against changed revision, execution, same-revision base and look-alikes', () => {
    const f = fixture(); const p = move(f, f.state, 'ab')
    expect(() => assertResidenceLocationPlanCurrent(f.state, p, f.authorityFor(f.state), f.dependencies)).not.toThrow()
    expect(() => assertResidenceLocationPlanCurrent(p.snapshot, p, f.authorityFor(p.snapshot), f.dependencies)).toThrow()
    const raw = mutable(f.state); raw.character.body.energy--
    expect(() => assertResidenceLocationPlanCurrent(raw, p, f.authorityFor(raw), f.dependencies)).toThrow()
    expect(() => assertResidenceLocationPlanCurrent(f.state, { ...p }, f.authorityFor(f.state), f.dependencies)).toThrow()
    const other = fixture({ seed: 'other' })
    expect(() => assertResidenceLocationPlanCurrent(other.state, p, other.authorityFor(other.state), other.dependencies)).toThrow()
    expect(() => planResidenceMove(p.snapshot, { ...binding(f.state), kind: 'move', edgeId: 'ba' }, f.authorityFor(p.snapshot), f.dependencies)).toThrow()
  })
})
