import { describe, expect, it } from 'vitest'
import { planResidenceTerminal, createTerminalAuthority, consumeResidenceLocationDeath } from '../../core/residence-terminal/controlled'
import { readTerminalSnapshot } from '../../core/residence-terminal/validation'
import { sourceItemId } from '../../core/residence-location/identity'
import { planResidenceSourceReveal } from '../../core/residence-location'
import { createLocationCatalog } from '../../core/residence-location/controlled'
import { fixture, history, roundTrip, mutable, normal, assertRejected, revealFixed, pickFixed, withAssets, command, locationOf, policyFor } from './terminal-test-fixtures'

describe('B03 genuine two-declaration history', () => {
  it.each([true, false])('old success=%s -> G1 departure -> new active -> G2 death round trips old facts exactly', (success) => {
    const f = history(success)
    expect(f.first.character.body.condition.currentHealth).toBe(3)
    expect(f.current.character).toMatchObject({ cycle: 2, body: { condition: { currentHealth: 1 } } })
    roundTrip(f.current, f.policy)
    const end = roundTrip(f.final, f.policy)
    expect(end.phase).toBe('dead')
    expect(end.missions[0]).toEqual(f.first.missions[0])
    expect(end.receipts[0]).toEqual(f.first.receipts[0])
    expect(end.archives[0]).toEqual(f.first.archives[0])
    expect(end.dispositions.slice(0, f.first.dispositions.length)).toEqual(f.first.dispositions)
    const oldPipe = f.source.carried.backpack.items.find((i) => i.definitionId === 'pipe')!
    const lost = end.dispositions.find((d) => d.item.instanceId === oldPipe.instanceId)!
    expect(lost.kind).toBe('death-unavailable')
    expect(lost.binding.execution).toEqual(f.current.site!.binding.execution)
    expect(lost.item).toEqual(oldPipe)
    expect(lost.state).toEqual(f.source.itemStates.states.find((s) => s.instanceId === oldPipe.instanceId))
  })
  it.each(['old-claimed', 'old-reward', 'missing-archive', 'stale-ready', 'old-body', 'missing-disposition'])('cross-history %s cannot be washed by later death', (fault) => {
    const f = history(true); const raw = mutable(f.final)
    if (fault === 'old-claimed') raw.archives[0].site.sources.find((s) => s.id === 'fixed')!.claimed = false
    if (fault === 'old-reward') raw.receipts[0].reward++
    if (fault === 'missing-archive') raw.archives.splice(0, 1)
    if (fault === 'stale-ready') raw.character.clock = mutable(f.first.character.clock)
    if (fault === 'old-body') raw.character.body = mutable(f.first.character.body)
    if (fault === 'missing-disposition') {
      const d = raw.dispositions.find((d) => d.item.definitionId === 'pipe')!
      raw.dispositions = raw.dispositions.filter((v) => v !== d)
      raw.receipts.forEach((r) => { r.dispositionIds = r.dispositionIds.filter((id) => id !== d.item.instanceId) })
      // Remove the reference too: this must fail B source completeness, not A dangling refs.
      expect(() => readTerminalSnapshot(raw, f.dependencies)).not.toThrow()
    }
    assertRejected(raw, f.policy)
  })
  it('unknown ordinal survives neither death disposition nor archived historical owner', () => {
    const f = history(false); const raw = mutable(f.final)
    const d = raw.dispositions.find((d) => d.item.definitionId === 'pipe')!
    const oldId = d.item.instanceId
    const wrong = sourceItemId(raw.archives[0].site.binding, 'east', 'a', 'fixed', 8)
    d.item.instanceId = wrong; d.state.instanceId = wrong
    raw.receipts[1].dispositionIds = raw.receipts[1].dispositionIds.map((id) => id === oldId ? wrong : id)
    expect(() => readTerminalSnapshot(raw, f.dependencies)).not.toThrow()
    assertRejected(raw, f.policy)
  })
  it('native later departure cannot shift both character D and execution start to skip an unrecorded cycle', () => {
    const f = history(false); const bad = mutable(f.current)
    if (bad.character.clock.kind !== 'active') throw new Error('native active clock')
    bad.character.cycle++; bad.character.clock.startCycle++
    expect(() => readTerminalSnapshot(bad, f.dependencies)).not.toThrow()
    assertRejected(bad, f.policy)
  })
  it('actual second source reveal death cannot place its output in an earlier archive', () => {
    const f = history(false); const s = locationOf(f.current)
    const clock = s.character.clock
    if (clock.kind !== 'active') throw new Error('native second clock')
    const authority = { mission: f.current.missions[1], cycle: { identity: s.character.identity, revision: s.character.revision,
      cycle: s.character.cycle, lifecycle: clock, stableContext: 'stable' as const, rest: 'A' as const, normalReturn: null, departure: null } }
    const deps = { residence: f.dependencies.residence, catalog: f.dependencies.policies[1].catalog }
    const cap = createTerminalAuthority(f.current, authority, f.dependencies)
    const p = planResidenceSourceReveal(s, { kind: 'reveal', binding: s.site.binding, expectedRevision: s.character.revision, sourceId: 'fixed' }, authority, deps)
    const result = consumeResidenceLocationDeath(f.current, p, cap).snapshot
    roundTrip(result, f.policy)
    const bad = mutable(result)
    const item = bad.archives[1].site.ground[0].items.shift()!
    const state = bad.archives[1].itemStates.states.find((v) => v.instanceId === item.instanceId)!
    bad.archives[1].itemStates.states = bad.archives[1].itemStates.states.filter((v) => v !== state)
    bad.archives[0].site.ground[0].items.push(item); bad.archives[0].itemStates.states.push(state)
    expect(() => readTerminalSnapshot(bad, f.dependencies)).not.toThrow()
    assertRejected(bad, f.policy)
  })
  it('native deadline-ready -> real next departure starts at D8, not D9, and later death keeps old deadline history', () => {
    const f = history(false, 'deadline')
    expect(f.first.character).toMatchObject({ cycle: 8, clock: { kind: 'deadline-ready', source: { endCycle: 7 } } })
    expect(f.current.character).toMatchObject({ cycle: 8, clock: { kind: 'active', startCycle: 8, taskDay: 1 } })
    roundTrip(f.current, f.policy); roundTrip(f.final, f.policy)
    expect(f.final.receipts[0]).toEqual(f.first.receipts[0])
  })
  it('old task output stays in its passive archive, never leaks into later usable backpack', () => {
    const f = history(false, 'ground-sample')
    roundTrip(f.current, f.policy)
    const bad = mutable(f.current)
    const item = bad.archives[0].site.ground[0].items.find((i) => i.definitionId === 'quest')!
    const state = bad.archives[0].itemStates.states.find((s) => s.instanceId === item.instanceId)!
    bad.archives[0].site.ground[0].items = bad.archives[0].site.ground[0].items.filter((i) => i !== item)
    bad.archives[0].itemStates.states = bad.archives[0].itemStates.states.filter((s) => s !== state)
    bad.carried.backpack.items.push(item)
    bad.carried.backpack.placements.push({ instanceId: item.instanceId, x: 0, y: 0, rotated: false })
    bad.itemStates.states.push(state)
    expect(() => readTerminalSnapshot(bad, f.dependencies)).not.toThrow()
    assertRejected(bad, f.policy)
  })
})

describe('B06 receipt amounts and B07 all-domain entity truth', () => {
  it('worn equipment, real backpack stack, quick unit, zero-charge old warehouse and ground keep their exact resources', () => {
    const f = fixture({ complete: true })
    const value = revealFixed(f, withAssets(f))
    const result = normal(f, true, value)
    const copy = roundTrip(result, f.policy)
    expect(copy.warehouse).toEqual(value.warehouse)
    expect(copy.carried.equipment.weapon).toEqual(value.carried.equipment.weapon)
    expect(copy.carried.quickSlots.slots[0]?.quantity).toBe(1)
    expect(copy.carried.backpack.items.find((i) => i.instanceId === 'initial-stack')?.quantity).toBe(3)
    expect(copy.itemStates).toEqual(result.itemStates)
    expect(copy.archives[0].itemStates).toEqual({ states: value.itemStates.states.filter((s) => value.site!.ground[0].items.some((i) => i.instanceId === s.instanceId)) })
  })
  it.each(['reward', 'penalty', 'forfeited', 'balance', 'missing', 'duplicate', 'reference', 'outcome'])('receipt %s corruption rejects', (fault) => {
    const f = fixture({ complete: true }); const raw = mutable(normal(f, true))
    if (fault === 'reward') raw.receipts[0].reward++
    if (fault === 'penalty') raw.receipts[0].penalty++
    if (fault === 'forfeited') raw.receipts[0].forfeited++
    if (fault === 'balance') raw.balance++
    if (fault === 'missing') raw.receipts = []
    if (fault === 'duplicate') raw.receipts.push(raw.receipts[0])
    if (fault === 'reference') raw.receipts[0].dispositionIds = []
    if (fault === 'outcome') raw.receipts[0].outcome = 'voluntary-failure'
    assertRejected(raw, f.policy)
  })
  it.each(['duplicate-ground', 'duplicate-warehouse', 'missing-state', 'extra-state', 'definition', 'resource', 'geometry', 'carry-limit', 'quick-eligibility'])('entity %s corruption rejects', (fault) => {
    const f = fixture(); const raw = mutable(pickFixed(f))
    const item = raw.carried.backpack.items[0]; const state = raw.itemStates.states.find((s) => s.instanceId === item.instanceId)!
    if (fault === 'duplicate-ground') raw.site!.ground[0].items.push(item)
    if (fault === 'duplicate-warehouse') { raw.warehouse.items.push(item); raw.warehouse.itemStates.states.push(state) }
    if (fault === 'missing-state') raw.itemStates.states.pop()
    if (fault === 'extra-state') raw.itemStates.states.push({ ...state, instanceId: 'orphan' })
    if (fault === 'definition') state.definitionId = 'lamp'
    if (fault === 'resource') state.resource = { kind: 'durability', current: 99 }
    if (fault === 'geometry') raw.carried.backpack.placements[0].x = 4
    if (fault === 'carry-limit') {
      raw.carried.backpack.items.push({ instanceId: 'heavy', definitionId: 'heavy', quantity: 1 })
      raw.carried.backpack.placements.push({ instanceId: 'heavy', x: 0, y: 0, rotated: false })
      raw.itemStates.states.push({ instanceId: 'heavy', definitionId: 'heavy', resource: { kind: 'none' } })
    }
    if (fault === 'quick-eligibility') raw.carried.quickSlots.slots[0] = { instanceId: 'quick-pipe', definitionId: 'pipe', quantity: 1 }
    assertRejected(raw, f.policy)
  })
  it.each(['unclaimed', 'wrong-source', 'wrong-ordinal', 'wrong-execution', 'wrong-definition', 'wrong-quantity', 'missing-output'])('source %s fails beyond A raw validation', (fault) => {
    const f = fixture(); const raw = mutable(revealFixed(f)); const ground = raw.site!.ground[0]
    const item = ground.items[0]; const state = raw.itemStates.states.find((s) => s.instanceId === item.instanceId)!
    if (fault === 'unclaimed') raw.site!.sources.find((s) => s.id === 'fixed')!.claimed = false
    if (fault.startsWith('wrong-') && !['wrong-definition', 'wrong-quantity'].includes(fault)) {
      const binding = mutable(raw.site!.binding)
      if (fault === 'wrong-execution') binding.execution.seed = 'another|seed'
      const id = sourceItemId(binding, 'east', 'a', fault === 'wrong-source' ? 'missing-source' : 'fixed', fault === 'wrong-ordinal' ? 9 : 0)
      item.instanceId = id; state.instanceId = id
    }
    if (fault === 'wrong-definition' || fault === 'wrong-quantity') {
      item.definitionId = 'supply'; item.quantity = fault === 'wrong-quantity' ? 3 : 1
      state.definitionId = 'supply'; state.resource = { kind: 'none' }
    }
    if (fault === 'missing-output') { ground.items.shift(); raw.itemStates.states = raw.itemStates.states.filter((s) => s !== state) }
    expect(() => readTerminalSnapshot(raw, f.dependencies)).not.toThrow()
    assertRejected(raw, f.policy)
  })
  it.each(['installed', 'consumed', 'destroyed'] as const)('explicit prior-effect %s retains source instance and is not demanded back on ground', (kind) => {
    const f = fixture(); const raw = mutable(revealFixed(f))
    const item = raw.site!.ground[0].items.shift()!
    const state = raw.itemStates.states.find((s) => s.instanceId === item.instanceId)!
    raw.itemStates.states = raw.itemStates.states.filter((s) => s !== state)
    raw.dispositions.push({ binding: raw.site!.binding, cycle: raw.character.cycle, source: 'prior-effect', kind, item, state })
    const result = normal(f, false, readTerminalSnapshot(raw, f.dependencies))
    roundTrip(result, f.policy)
    expect(result.dispositions[0]).toEqual(raw.dispositions[0])
    expect(result.receipts[0].dispositionIds).not.toContain(item.instanceId)
  })
  it('previously delivered exact sample stays historical and is not redelivered', () => {
    const f = fixture({ complete: true }); const raw = mutable(f.value)
    raw.dispositions.push({ binding: raw.site!.binding, cycle: 1, source: 'prior-effect', kind: 'delivered',
      item: raw.carried.backpack.items[0], state: raw.itemStates.states[0] })
    raw.carried.backpack.items = []; raw.carried.backpack.placements = []; raw.itemStates.states = []
    const result = normal(f, false, readTerminalSnapshot(raw, f.dependencies))
    roundTrip(result, f.policy)
    expect(result.receipts[0].dispositionIds).toEqual([])
  })
  it('same formal random choice as a whole is required, not per-item choice mixing', () => {
    const base = fixture(); const data = mutable(base.locationDependencies.catalog.data)
    const source = data.sources.find((s) => s.id === 'lottery-a')!
    source.contents = { kind: 'choice', choices: [
      [{ definitionId: 'supply', quantity: 1, resource: { kind: 'none' } }, { definitionId: 'supply', quantity: 2, resource: { kind: 'none' } }],
      [{ definitionId: 'supply', quantity: 2, resource: { kind: 'none' } }, { definitionId: 'supply', quantity: 1, resource: { kind: 'none' } }],
    ] }
    const catalog = createLocationCatalog(data)
    const dependencies = { ...base.dependencies, policies: [{ ...base.dependencies.policies[0], catalog }] }
    const policy = policyFor(dependencies)
    const s = locationOf(base.value)
    const actual = planResidenceSourceReveal(s, { kind: 'reveal', binding: s.site.binding, expectedRevision: s.character.revision, sourceId: source.id },
      base.authorityFor(s), { ...base.locationDependencies, catalog })
    const good = readTerminalSnapshot({ ...base.value, ...actual.snapshot }, dependencies)
    roundTrip(good, policy)
    const bad = mutable(good)
    bad.site!.ground[0].items.forEach((i) => { i.quantity = 1 })
    expect(() => readTerminalSnapshot(bad, dependencies)).not.toThrow()
    assertRejected(bad, policy)
  })
  it('actual noninitial resource remaining value survives without refilling', () => {
    const f = fixture(); const raw = mutable(revealFixed(f))
    raw.itemStates.states.forEach((s) => { if (s.resource.kind !== 'none') s.resource.current = 0 })
    const value = readTerminalSnapshot(raw, f.dependencies)
    roundTrip(value, f.policy)
  })
  it.each(['hp', 'infection', 'exposure', 'satiety', 'energy', 'quota', 'painkiller', 'old-ready'])('latest deadline %s mismatch rejects', (fault) => {
    const f = fixture({ day: 7, node: 'b' })
    const raw = mutable(planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority).snapshot)
    if (fault === 'hp') raw.character.body.condition.currentHealth--
    if (fault === 'infection') raw.character.body.infectionProgress++
    if (fault === 'exposure') raw.character.body.condition.pendingInfectionExposures++
    if (fault === 'satiety') raw.character.body.satiety--
    if (fault === 'energy') raw.character.body.energy--
    if (fault === 'quota') raw.character.body.quotasRemaining.disinfectant--
    if (fault === 'painkiller') raw.character.body.condition.painkillerActive = true
    if (fault === 'old-ready') raw.character.cycle++
    assertRejected(raw, f.policy)
  })
  it('jointly forged deadline energy fact and current energy cannot override the formal A recovery target', () => {
    const f = fixture({ day: 7, node: 'b' })
    const bad = mutable(planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority).snapshot)
    bad.character.body.energy = 1
    bad.receipts[0].steps.at(-1)!.facts.energyAfter = 1
    expect(() => readTerminalSnapshot(bad, f.dependencies)).not.toThrow()
    assertRejected(bad, f.policy)
  })
})
