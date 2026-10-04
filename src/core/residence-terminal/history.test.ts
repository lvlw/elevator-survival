import { describe, expect, it } from 'vitest'
import { planCharacterCycle } from '../character-cycle'
import { activateMission } from '../mission-lifecycle/controlled'
import { establishResidenceLocation } from '../residence-location/controlled'
import { planResidenceMove, type LocationAuthority } from '../residence-location'
import { infectedResidenceConfig as g1 } from '../../content/infected-residence-core-v0.1/config'
import { infectedTerminalCoreConfig as config } from '../../content/infected-terminal-core-v0.1/config'
import { consumeResidenceLocationDeath, createTerminalAuthority, planResidenceTerminal } from './controlled'
import { readTerminalSnapshot } from './validation'
import { command, fixture, mutable } from './test-fixtures'
import { locationOf } from './authority'

function assets(f: ReturnType<typeof fixture>) {
  const v = mutable(f.value)
  v.carried.equipment.weapon = { instanceId: 'carried-pipe', definitionId: 'pipe', quantity: 1 }
  v.carried.quickSlots.slots[0] = { instanceId: 'quick-supply', definitionId: 'supply', quantity: 1 }
  v.itemStates.states.push({ instanceId: 'carried-pipe', definitionId: 'pipe', resource: { kind: 'durability', current: 2 } },
    { instanceId: 'quick-supply', definitionId: 'supply', resource: { kind: 'none' } })
  for (const [id, definitionId, x, y] of [['carried-lamp', 'lamp', 2, 0], ['special', 'component', 3, 0], ['permission', 'card', 2, 1]] as const) {
    v.carried.backpack.items.push({ instanceId: id, definitionId, quantity: 1 })
    v.carried.backpack.placements.push({ instanceId: id, x, y, rotated: false })
    v.itemStates.states.push({ instanceId: id, definitionId, resource: definitionId === 'lamp' ? { kind: 'charge', current: 1 } : { kind: 'none' } })
  }
  v.warehouse.items.push({ instanceId: 'warehouse-pipe', definitionId: 'pipe', quantity: 1 })
  v.warehouse.itemStates.states.push({ instanceId: 'warehouse-pipe', definitionId: 'pipe', resource: { kind: 'durability', current: 3 } })
  for (const kind of ['installed', 'consumed', 'destroyed'] as const) v.dispositions.push({ kind, source: 'prior-effect', cycle: 1, binding: v.site!.binding,
    item: { instanceId: `old-${kind}`, definitionId: 'component', quantity: 1 },
    state: { instanceId: `old-${kind}`, definitionId: 'component', resource: { kind: 'none' } } })
  return readTerminalSnapshot(v, f.dependencies)
}

describe('T06 T08 real assets and historical ownership', () => {
  it('living success keeps worn ordinary equipment, quick-slot, charge and old warehouse exactly; task assets leave usable containers', () => {
    const f = fixture(g1, config, { complete: true }); const v = assets(f)
    const s = planResidenceTerminal(v, command(v, 'deliver'), f.authorize(v)).snapshot
    expect(s.carried.equipment).toEqual(v.carried.equipment)
    expect(s.carried.quickSlots).toEqual(v.carried.quickSlots)
    expect(s.warehouse).toEqual(v.warehouse)
    expect(s.itemStates.states).toEqual(v.itemStates.states.filter((i) => ['carried-pipe', 'quick-supply', 'carried-lamp'].includes(i.instanceId)))
    expect(s.carried.backpack.items).toEqual(v.carried.backpack.items.filter((i) => i.instanceId === 'carried-lamp'))
    expect(s.dispositions.slice(3).map((d) => d.kind).sort()).toEqual(['delivered', 'returned-special', 'revoked-permission'])
    expect(s.dispositions.slice(0, 3)).toEqual(v.dispositions)
    expect(s.dispositions.find((d) => d.kind === 'delivered')!.state).toEqual(v.itemStates.states[0])
  })
  it('death makes every then-usable asset unavailable, never rewrites prior disposition or ground history', () => {
    const f = fixture(g1, config, { hp: 1, bleeding: true, balance: 47 }); const v = assets(f)
    const local = locationOf(v)
    const death = planResidenceMove(local, { ...command(v, 'withdraw'), kind: 'move', edgeId: 'ab' }, f.authorityFor(local), f.locationDependencies)
    const s = consumeResidenceLocationDeath(v, death, f.authorize(v)).snapshot
    expect(s.carried.backpack.items).toEqual([]); expect(s.carried.equipment).toEqual({ weapon: null, armor: null, utility: null })
    expect(s.carried.quickSlots.slots).toEqual([null, null]); expect(s.warehouse.items).toEqual([])
    expect(s.dispositions.slice(0, 3)).toEqual(v.dispositions)
    const lost = s.dispositions.slice(3)
    expect(lost).toHaveLength(6); expect(lost.every((d) => d.kind === 'death-unavailable')).toBe(true)
    expect(lost.find((d) => d.item.instanceId === 'warehouse-pipe')!.state.resource).toEqual({ kind: 'durability', current: 3 })
    expect(s.receipts[0]).toMatchObject({ reward: 0, penalty: 0, forfeited: 47 })
  })
  it('already delivered sample remains historical and does not become a second terminal delivery', () => {
    const f = fixture(g1, config, { complete: true }); const v = mutable(f.value)
    v.dispositions.push({ binding: v.site!.binding, cycle: 1, source: 'prior-effect', kind: 'delivered',
      item: v.carried.backpack.items[0], state: v.itemStates.states[0] })
    v.carried.backpack.items = []; v.carried.backpack.placements = []; v.itemStates.states = []
    const s = planResidenceTerminal(v, command(v, 'withdraw'), f.authorize(v)).snapshot
    expect(s.dispositions).toEqual(v.dispositions)
    expect(s.receipts[0]).toMatchObject({ outcome: 'voluntary-failure', reward: 0, dispositionIds: [] })
  })
  it.each([true, false])('actual prior A success=%s -> real G1 departure -> second G2 death -> A preserves all older facts', (success) => {
    const f = fixture(g1, config, { two: true, hp: 3, bleeding: true, complete: success, balance: 47 })
    const initial = assets(f)
    const first = planResidenceTerminal(initial, command(initial, success ? 'deliver' : 'withdraw'), f.authorize(initial)).snapshot
    expect(first.character.body.condition.currentHealth).toBe(3)
    if (first.character.clock.kind !== 'return-due' || first.missions[1].status !== 'unaccepted') throw new Error('native first result')
    const execution = { runId: 'second-real-execution', seed: 'second-seed', rulesVersion: f.dependencies.residence.rulesVersion }
    const departure = planCharacterCycle(first.character, { kind: 'depart', identity: first.character.identity,
      expectedRevision: first.character.revision, commissionId: first.missions[1].binding.mission.commissionId }, {
      identity: first.character.identity, revision: first.character.revision, cycle: first.character.cycle,
      lifecycle: { kind: 'closed', source: first.character.clock.source }, stableContext: 'stable', rest: null, normalReturn: null,
      departure: { mission: first.missions[1], execution } }, f.dependencies.residence)
    expect(departure.snapshot.body.condition.currentHealth).toBe(1)
    expect(departure.snapshot.cycle).toBe(2)
    if (departure.snapshot.clock.kind !== 'active') throw new Error('native activation clock')
    const active = activateMission(first.missions[1], { binding: first.missions[1].binding, execution }, f.dependencies.residence.scope)
    const authority: LocationAuthority = { mission: active, cycle: { identity: departure.snapshot.identity,
      revision: departure.snapshot.revision, cycle: departure.snapshot.cycle, lifecycle: departure.snapshot.clock,
      stableContext: 'stable', rest: 'A', normalReturn: null, departure: null } }
    const deps = { residence: f.dependencies.residence, catalog: f.dependencies.policies[1].catalog }
    const second = establishResidenceLocation({ character: departure.snapshot, carried: first.carried, itemStates: first.itemStates }, authority, deps)
    const current = readTerminalSnapshot({ ...first, ...second, phase: 'active-world', missions: [first.missions[0], active] }, f.dependencies)
    const cap = createTerminalAuthority(current, authority, f.dependencies)
    const death = planResidenceMove(second, { kind: 'move', binding: second.site.binding, expectedRevision: second.character.revision, edgeId: 'ab' }, authority, deps)
    const final = consumeResidenceLocationDeath(current, death, cap).snapshot
    expect(final.phase).toBe('dead'); expect(final.missions[0]).toEqual(first.missions[0])
    expect(final.receipts[0]).toEqual(first.receipts[0]); expect(final.archives[0]).toEqual(first.archives[0])
    expect(final.dispositions.slice(0, first.dispositions.length)).toEqual(first.dispositions)
    expect(final.receipts[0].penalty).toBe(success ? 0 : 20)
    expect(final.receipts[0].reward).toBe(success ? 120 : 0)
    expect(final.receipts[1]).toMatchObject({ reward: 0, penalty: 0, forfeited: first.balance })
    expect(final.character).toEqual(death.snapshot.character)
    expect(final.character.revision).toBe(second.character.revision + 1)
    const oldRemoved = mutable(current); oldRemoved.receipts = []; oldRemoved.archives = []
    expect(() => createTerminalAuthority(oldRemoved, authority, f.dependencies)).toThrow()
    const oldRewritten = mutable(current); oldRewritten.receipts[0].reward = 1
    expect(() => createTerminalAuthority(oldRewritten, authority, f.dependencies)).toThrow()
    const early = mutable(current); early.character.revision = first.character.revision
    expect(() => createTerminalAuthority(early, { ...authority, cycle: { ...authority.cycle, revision: early.character.revision } }, f.dependencies)).toThrow()
  })
  it.each(['kind', 'goals', 'resource', 'usable-task', 'reference'])('successful historical %s mutation is rejected', (fault) => {
    const f = fixture(g1, config, { complete: true }); const result = planResidenceTerminal(f.value, command(f.value, 'deliver'), f.authority).snapshot
    const v = mutable(result)
    if (fault === 'kind') v.dispositions[0].kind = 'installed'
    if (fault === 'goals') v.archives[0].site.facts[0].value = false
    if (fault === 'resource') v.dispositions[0].state.resource = { kind: 'charge', current: 0 }
    if (fault === 'reference') v.receipts[0].dispositionIds = []
    if (fault === 'usable-task') {
      v.carried.backpack.items.push(v.dispositions[0].item)
      v.carried.backpack.placements.push({ instanceId: v.dispositions[0].item.instanceId, x: 0, y: 0, rotated: false })
      v.itemStates.states.push(v.dispositions[0].state); v.dispositions = []; v.receipts[0].dispositionIds = []
    }
    expect(() => readTerminalSnapshot(v, f.dependencies)).toThrow()
  })
  it.each(['end-cycle-death', 'wrong-order', 'fake-facts', 'cycle-rewrite'])('historical deadline death %s cannot be restored', (fault) => {
    const f = fixture(g1, config, { day: 7, node: 'b', hp: 1, bleeding: true })
    const v = mutable(planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority).snapshot)
    if (fault === 'end-cycle-death') {
      v.receipts[0].steps = [{ kind: 'end-cycle', healthBefore: 1, healthAfter: 0, facts: {} }]; v.receipts[0].deathCause = 'end-cycle'
    }
    if (fault === 'wrong-order') v.receipts[0].steps[0].kind = 'hunger'
    if (fault === 'fake-facts') v.receipts[0].steps[0].facts.damage = false
    if (fault === 'cycle-rewrite' && v.character.clock.kind === 'active') { v.character.cycle++; v.character.clock.startCycle++ }
    expect(() => readTerminalSnapshot(v, f.dependencies)).toThrow()
  })
  it.each(['hp', 'infection', 'exposure', 'satiety', 'energy', 'quota', 'painkiller'])('latest deadline body %s must match its actual trace', (field) => {
    const f = fixture(g1, config, { day: 7, node: 'b' })
    const v = mutable(planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority).snapshot)
    if (field === 'hp') v.character.body.condition.currentHealth--
    if (field === 'infection') v.character.body.infectionProgress++
    if (field === 'exposure') v.character.body.condition.pendingInfectionExposures++
    if (field === 'satiety') v.character.body.satiety--
    if (field === 'energy') v.character.body.energy--
    if (field === 'quota') v.character.body.quotasRemaining.disinfectant--
    if (field === 'painkiller') v.character.body.condition.painkillerActive = true
    expect(() => readTerminalSnapshot(v, f.dependencies)).toThrow()
  })
})
