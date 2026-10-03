import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import * as energy from '../residence-energy'
import * as random from '../random'
import { planResidenceLocationRest, restoreResidenceLocationCandidate } from './controlled'
import { createLocationCommand, queryPlayerResidenceKnowledge } from './index'
import type { LocationPlan } from './types'
import { locationRandomCursor, sourceItemId } from './identity'
import { binding, catalogInput, fixture as createFixture, move, mutable, reveal } from './test-fixtures'
import { infectedResidenceConfig } from '../../content/infected-residence-core-v0.1/config'
const fixture = (options: Parameters<typeof createFixture>[1] = {}) => createFixture(infectedResidenceConfig, options)

describe('G2 arrival knowledge and stable random anchors (L04 L09)', () => {
  it('only actual arrival adds declared surface observations, not read or unseen graph membership', () => {
    const f = fixture()
    const start = queryPlayerResidenceKnowledge(f.state, f.authorityFor(f.state), f.dependencies)
    expect(start.nodes.map((n) => n.id)).toEqual(['a', 'b'])
    expect(start.routes.map((r) => r.id)).toEqual(['ab', 'ba'])
    const b = move(f, f.state, 'ab').snapshot
    expect(b.site.knowledge.knownNodeIds).toEqual(['a', 'b', 'c'])
    expect(b.site.knowledge.visitedNodeIds).toEqual(['a', 'b'])
    expect(b.site.knowledge.knownEdgeIds).not.toContain('secret')
    const rest = planResidenceLocationRest(b, { ...binding(b), kind: 'rest' }, f.authorityFor(b), f.dependencies).snapshot
    expect(rest.site.knowledge).toEqual(b.site.knowledge)
  })
  it('identical public knowledge with different unobserved remote truth gives identical safe output', () => {
    const f = fixture(); const other = mutable(f.state)
    other.site.facts[0].value = true; other.site.facts[1].value = true
    Object.assign(other.site.enemies[0].state, { hasBeenEncountered: true, currentHealth: 3,
      resolvedActionCount: 1, currentIntentActionId: 'bite', nextCycleIndex: 0 })
    other.site.enemies[0].riskDrawIndex = 11
    other.site.sources[2].claimed = true; other.site.sources[2].drawIndex = 1
    other.site.ground[1].items.push({ instanceId: 'remote-loot', definitionId: 'lamp', quantity: 1 })
    other.itemStates.states.push({ instanceId: 'remote-loot', definitionId: 'lamp', resource: { kind: 'charge', current: 2 } })
    const baseline = queryPlayerResidenceKnowledge(f.state, f.authorityFor(f.state), f.dependencies)
    expect(queryPlayerResidenceKnowledge(other, f.authorityFor(other), f.dependencies)).toEqual(baseline)
    const text = JSON.stringify(baseline)
    for (const secret of ['seed', 'riskDrawIndex', 'infectionProgress', 'currentHealth', 'currentIntentActionId', 'remote-loot', 'test-enemy']) expect(text).not.toContain(secret)
  })
  it('remote last observation is not overwritten with unobserved live road changes', () => {
    const f = fixture(); const b = move(f, f.state, 'ab').snapshot; const a = move(f, b, 'ba').snapshot
    const raw = mutable(a); raw.site.facts[0].value = true
    const query = queryPlayerResidenceKnowledge(raw, f.authorityFor(raw), f.dependencies)
    expect(query.routes.find((r) => r.id === 'bc')).toMatchObject({ observation: 'last-observed', passable: false })
    const observed = move(f, raw, 'ab').snapshot
    expect(queryPlayerResidenceKnowledge(observed, f.authorityFor(observed), f.dependencies).routes.find((r) => r.id === 'bc'))
      .toMatchObject({ observation: 'current', passable: true })
  })
  it('repeated E0 queries have no G1 plan/provider/random side effects and cannot become commands/plans', () => {
    const f = fixture({ energy: 0 }); const before = structuredClone(f.state)
    const action = vi.spyOn(energy, 'planResidenceAction'); const draw = vi.spyOn(random, 'drawIntInclusive')
    try {
      for (let i = 0; i < 4; i++) {
        const query = queryPlayerResidenceKnowledge(f.state, f.authorityFor(f.state), f.dependencies)
        expectTypeOf(query).not.toExtend<LocationPlan>()
        expect(query).not.toHaveProperty('snapshot'); expect(query).not.toHaveProperty('completion')
        expect(() => createLocationCommand(query)).toThrow()
      }
      expect(action).not.toHaveBeenCalled(); expect(draw).not.toHaveBeenCalled(); expect(f.state).toEqual(before)
    } finally { vi.restoreAllMocks() }
  })
  it('locks independent fixed counter32-v1 golden for the pre-recorded segment order', () => {
    const f = fixture(); let cursor = locationRandomCursor(f.state.site.binding, 'east', 'a', 'source', 'lottery-a', 'contents', 0)
    expect(cursor.streamId).toBe('21:residence-location-v1|9:character|17:g2-isolated-rules|33:infected-residence-core-test-v0.1|5:world|8:template|10:commission|8:contract|9:execution|17:g2-isolated-rules|12:test-catalog|2:v1|4:east|1:a|6:source|9:lottery-a|8:contents')
    const values: number[] = []
    for (let i = 0; i < 3; i++) { const draw = random.drawUint32(cursor); values.push(draw.value); cursor = draw.nextCursor }
    // Independently evaluated reference FNV-1a + counter32 mixer, not calculated by the function under test.
    expect(values).toEqual([725322321, 3571823335, 3087245897])
    expect(cursor.drawIndex).toBe(3)
  })
  it('isolates source, enemy, purpose, node, execution seed and delimiter-ambiguous segments', () => {
    const f = fixture(); const b = f.state.site.binding
    const cursors = [
      locationRandomCursor(b, 'east', 'a', 'source', 'one', 'contents', 0),
      locationRandomCursor(b, 'east', 'a', 'source', 'two', 'contents', 0),
      locationRandomCursor(b, 'east', 'a', 'enemy', 'one', 'risk', 0),
      locationRandomCursor(b, 'east', 'a', 'enemy', 'two', 'risk', 0),
      locationRandomCursor(b, 'east', 'a', 'source', 'one', 'risk', 0),
      locationRandomCursor(b, 'east', 'b', 'source', 'one', 'contents', 0),
    ]
    expect(new Set(cursors.map((c) => c.streamId)).size).toBe(cursors.length)
    const other = { ...b, execution: { ...b.execution, seed: 'different' } }
    expect(random.drawUint32(locationRandomCursor(other, 'east', 'a', 'source', 'one', 'contents', 0)).value).not.toBe(random.drawUint32(cursors[0]).value)
    expect(sourceItemId(other, 'east', 'a', 'one', 0)).not.toBe(sourceItemId(b, 'east', 'a', 'one', 0))
    expect(sourceItemId(b, 'east', 'a:b', 'c', 0)).not.toBe(sourceItemId(b, 'east', 'a', 'b:c', 0))
  })
  it('opposite visitation orders and real G1 rest do not alter either source outcome/cursor/instance ID', () => {
    const f = fixture()
    let first = reveal(f, f.state, 'lottery-a').snapshot
    first = move(f, first, 'ab').snapshot; first = reveal(f, first, 'lottery-b').snapshot
    let second = move(f, f.state, 'ab').snapshot; second = reveal(f, second, 'lottery-b').snapshot
    second = planResidenceLocationRest(second, { ...binding(second), kind: 'rest' }, f.authorityFor(second), f.dependencies).snapshot
    second = move(f, second, 'ba').snapshot; second = reveal(f, second, 'lottery-a').snapshot
    expect(second.site.ground).toEqual(first.site.ground); expect(second.site.sources).toEqual(first.site.sources)
    expect(second.itemStates).toEqual(first.itemStates); expect(second.site.enemies).toEqual(first.site.enemies)
    const decoded: unknown = JSON.parse(JSON.stringify(second))
    expect(restoreResidenceLocationCandidate(decoded, f.authorityFor(second), f.dependencies).value).toEqual(second)
  })
  it('two persistent named enemies of one definition retain independent actual risk cursors', () => {
    const catalog = catalogInput()
    catalog.nodes.push({ id: 'd', name: 'Hidden second room', placeId: 'west', surfaceEdgeIds: [], surfaceSourceIds: [], rest: null })
    catalog.enemies.push({ ...structuredClone(catalog.enemies[0]), id: 'other-guard', nodeId: 'd' })
    const f = fixture({ catalog }); const raw = mutable(f.state)
    raw.site.enemies[0].state.hasBeenEncountered = true; raw.site.enemies[0].riskDrawIndex = 9
    const s = restoreResidenceLocationCandidate(raw, f.authorityFor(raw), f.dependencies).value
    expect(s.site.enemies[1].riskDrawIndex).toBe(0)
    expect(move(f, s, 'ab').snapshot.site.enemies).toEqual(s.site.enemies)
    expect(queryPlayerResidenceKnowledge(s, f.authorityFor(s), f.dependencies).nodes.map((n) => n.id)).not.toContain('d')
  })
  it.each(['unknown-edge', 'route-witness', 'current-unvisited', 'duplicate-node', 'source-cursor'])('rejects impossible knowledge/cursor %s', (mode) => {
    const f = fixture(); const s = mutable(f.state)
    if (mode === 'unknown-edge') s.site.knowledge.knownEdgeIds.push('secret')
    if (mode === 'route-witness') s.site.knowledge.routes[0].observedFromNodeId = 'c'
    if (mode === 'current-unvisited') s.site.knowledge.visitedNodeIds = []
    if (mode === 'duplicate-node') s.site.knowledge.knownNodeIds.push('a')
    if (mode === 'source-cursor') s.site.sources[0].drawIndex = 1
    expect(() => restoreResidenceLocationCandidate(s, f.authorityFor(s), f.dependencies)).toThrow()
  })
})
