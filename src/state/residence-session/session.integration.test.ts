import { afterEach, describe, expect, it, vi } from 'vitest'
import * as g2 from '../../core/residence-location'
import * as random from '../../core/random'
import { planResidenceLocationRest, restoreResidenceLocationCandidate } from '../../core/residence-location/controlled'
import { planResidenceItemTransfer } from '../../core/residence-location'
import { deserializeResidenceSave, serializeResidenceSave } from '../residence-save'
import { binding, catalogInput, command, currentActive, fixture, harness, move, mutable, reveal } from './test-fixtures'
afterEach(() => vi.restoreAllMocks())

describe('G3 S07/S08/S11/S12 native composition', () => {
  it('three real session moves consume only preceding current; one revision/write/notification per step', () => {
    const h = harness(); h.owner.bootstrap(); const plan = vi.spyOn(g2, 'planResidenceMove')
    for (const [i, edge] of ['ab', 'ba', 'ab'].entries()) {
      const result = h.owner.dispatch(command(currentActive(h), edge))
      expect(result.current.character.revision).toBe(i + 1)
      expect(deserializeResidenceSave(h.storage.value()!, h.f.policy)).toEqual(result.current)
      expect(h.storage.port.write).toHaveBeenCalledTimes(i + 1); expect(h.listener).toHaveBeenCalledTimes(i + 1)
    }
    expect(plan).toHaveBeenCalledTimes(3); expect(h.storage.port.read).toHaveBeenCalledTimes(1)
  })
  it.each(['damage', 'exposure', 'live-enemy', 'bleeding-death'])('unsupported %s never installs partial body/position', (mode) => {
    const catalog = catalogInput()
    if (mode === 'damage') catalog.edges[0].arrival.healthLoss = 1
    if (mode === 'exposure') catalog.edges[0].arrival.exposuresAdded = 1
    if (mode === 'live-enemy') catalog.facts[0].initial = true
    const f = fixture({ catalog, hp: mode === 'bleeding-death' ? 1 : 12, bleeding: mode === 'bleeding-death' })
    const start = mode === 'live-enemy' ? f.active(move(f, f.state, 'ab').snapshot) : f.active()
    const h = harness(f, serializeResidenceSave(start, f.policy)); h.owner.bootstrap()
    const plan = vi.spyOn(g2, 'planResidenceMove'); const draw = vi.spyOn(random, 'drawIntInclusive')
    const before = h.owner.getState().current; const saved = h.storage.value()
    expect(() => h.owner.dispatch(command(currentActive(h), mode === 'live-enemy' ? 'bc' : 'ab')))
      .toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_RESULT' }))
    expect(h.owner.getState().current).toBe(before); expect(h.storage.value()).toBe(saved)
    expect(h.storage.port.write).not.toHaveBeenCalled(); expect(h.listener).not.toHaveBeenCalled(); expect(draw).not.toHaveBeenCalled()
    expect(plan).toHaveBeenCalledTimes(mode === 'damage' || mode === 'exposure' ? 0 : 1)
  })
  it('real reveal -> whole pickup/drop -> rest -> string cold restore preserves source/resources/enemy/knowledge', () => {
    const f = fixture(); const raw = mutable(f.state)
    raw.site.facts[0].value = true
    Object.assign(raw.site.enemies[0].state, { currentHealth: 3, hasBeenEncountered: true, resolvedActionCount: 1, currentIntentActionId: 'bite', nextCycleIndex: 0 })
    raw.site.enemies[0].riskDrawIndex = 7
    let s = restoreResidenceLocationCandidate(raw, f.authorityFor(raw), f.dependencies).value
    s = reveal(f, s, 'fixed').snapshot
    const pipe = s.site.ground[0].items[0]; const lamp = s.site.ground[0].items[1]
    s = planResidenceItemTransfer(s, { ...binding(s), kind: 'pickup', instanceId: pipe.instanceId, placement: { x: 0, y: 0, rotated: false } }, f.authorityFor(s), f.dependencies).snapshot
    s = planResidenceItemTransfer(s, { ...binding(s), kind: 'pickup', instanceId: lamp.instanceId, placement: { x: 1, y: 0, rotated: false } }, f.authorityFor(s), f.dependencies).snapshot
    s = planResidenceItemTransfer(s, { ...binding(s), kind: 'drop', instanceId: lamp.instanceId }, f.authorityFor(s), f.dependencies).snapshot
    s = reveal(f, s, 'lottery-a').snapshot
    s = move(f, s, 'ab').snapshot
    s = planResidenceLocationRest(s, { ...binding(s), kind: 'rest' }, f.authorityFor(s), f.dependencies).snapshot
    const before = f.active(s)
    const h = harness(f, serializeResidenceSave(before, f.policy))
    const draw = vi.spyOn(random, 'drawIntInclusive'); h.owner.bootstrap()
    expect(h.owner.getState().current).toEqual(before)
    expect(currentActive(h).character).toMatchObject({ cycle: 2, clock: { taskDay: 2, startCycle: 1 }, body: { energy: 85 } })
    h.owner.dispatch(command(currentActive(h), 'ba'))
    const after = currentActive(h)
    expect(after.site.sources).toEqual(before.site.sources); expect(after.site.enemies).toEqual(before.site.enemies)
    expect(after.carried.backpack.items).toEqual([pipe]); expect(after.site.ground[0].items).toContainEqual(lamp)
    expect(after.itemStates).toEqual(before.itemStates); expect(after.site.binding).toEqual(before.site.binding)
    expect(after.site.knowledge.knownEdgeIds).not.toContain('secret')
    const location = { character: after.character, site: after.site, carried: after.carried, itemStates: after.itemStates }
    expect(() => reveal(f, location, 'lottery-a')).toThrowError(expect.objectContaining({ code: 'NOT_AVAILABLE' }))
    expect(draw).not.toHaveBeenCalled()
    expect(h.storage.port.write).toHaveBeenCalledTimes(1); expect(h.listener).toHaveBeenCalledTimes(1)
  })
  it('different hidden seeds/enemy health leave same player query; internal diagnostics are explicitly not player safe', () => {
    const a = fixture(); const b = fixture({ seed: 'another-hidden-seed' }); const changed = mutable(b.state)
    changed.site.enemies[0].state.currentHealth = 2; changed.site.enemies[0].state.hasBeenEncountered = true
    const h1 = harness(a); const h2 = harness(b, serializeResidenceSave(b.active(changed), b.policy))
    h1.owner.bootstrap(); h2.owner.bootstrap()
    expect(h1.owner.queryKnowledge()).toEqual(h2.owner.queryKnowledge())
    expect(h1.owner.getState().current).not.toEqual(h2.owner.getState().current)
  })
})
