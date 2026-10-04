import { expect, it } from 'vitest'
import * as publicApi from './index'
import * as controlledApi from './controlled'
import { infectedResidenceConfig as g1 } from '../../content/infected-residence-core-v0.1/config'
import { infectedTerminalCoreConfig as config } from '../../content/infected-terminal-core-v0.1/config'
import { fixture, command, mutable } from './test-fixtures'
import { planResidenceMove } from '../residence-location'
import { planResidenceLocationRest } from '../residence-location/controlled'
import { locationOf } from './authority'

it('T07 ordinary exports are readonly; controlled exports have an exact bounded surface', () => {
  expect(Object.keys(publicApi).sort()).toEqual(['TerminalError', 'queryTerminalEligibility', 'queryTerminalRewardCapacity'])
  expect(Object.keys(controlledApi).sort()).toEqual(['assertTerminalPlanCurrent', 'consumeResidenceLocationDeath', 'createTerminalAuthority', 'createTerminalConfig', 'planResidenceTerminal'])
})
it.each(['balance', 'body', 'revision', 'execution', 'history'])('T07 full current authority rejects same-looking changed %s', (field) => {
  const f = fixture(g1, config); const v = mutable(f.value)
  if (field === 'balance') v.balance = 47
  if (field === 'body') v.character.body.satiety = 5
  if (field === 'revision') v.character.revision++
  if (field === 'execution') v.site!.binding.execution.seed = 'new-seed'
  if (field === 'history') v.missions = []
  expect(() => controlledApi.planResidenceTerminal(v, command(v, 'withdraw'), f.authority)).toThrow()
})
it('T07 issued complete plan is deterministic, copied plans and replay against closed current are rejected', () => {
  const f = fixture(g1, config)
  const a = controlledApi.planResidenceTerminal(f.value, command(f.value, 'withdraw'), f.authority)
  const b = controlledApi.planResidenceTerminal(f.value, command(f.value, 'withdraw'), f.authority)
  expect(a).toEqual(b)
  expect(() => controlledApi.assertTerminalPlanCurrent(f.value, a, f.authority)).not.toThrow()
  expect(() => controlledApi.assertTerminalPlanCurrent(f.value, structuredClone(a), f.authority)).toThrow()
  expect(() => controlledApi.planResidenceTerminal(a.snapshot, command(f.value, 'withdraw'), f.authority)).toThrow()
  expect(() => controlledApi.createTerminalAuthority(a.snapshot, f.authorityFor(locationOf(f.value)), f.dependencies)).toThrow()
})
it('T05 T07 original G2 death capability works; cloning, JSON and other complete base cannot forge it', () => {
  const f = fixture(g1, config, { hp: 1, bleeding: true })
  const current = locationOf(f.value)
  const p = planResidenceMove(current, { ...command(f.value, 'withdraw'), kind: 'move', edgeId: 'ab' }, f.authorityFor(current), f.locationDependencies)
  for (const copied of [structuredClone(p), JSON.parse(JSON.stringify(p))]) {
    expect(() => controlledApi.consumeResidenceLocationDeath(f.value, copied, f.authority)).toThrow()
  }
  const changed = mutable(f.value); changed.character.body.satiety = 5
  expect(() => controlledApi.consumeResidenceLocationDeath(changed, p, f.authorize(changed))).toThrow()
  expect(controlledApi.consumeResidenceLocationDeath(f.value, p, f.authority).snapshot.phase).toBe('dead')
  expect(p.snapshot.character.body.condition.currentHealth).toBe(0)
})
it('T09 unknown dependency shells reject without freezing caller objects or invoking accessors', () => {
  const f = fixture(g1, config); const extra = { mutable: true }
  const bad = { ...f.dependencies, policies: [{ ...f.dependencies.policies[0], extra }] }
  expect(() => controlledApi.createTerminalAuthority(f.value, f.authorityFor(locationOf(f.value)), bad)).toThrow()
  expect(Object.isFrozen(extra)).toBe(false)
  let calls = 0
  const deps = { ...f.dependencies }
  Object.defineProperty(deps, 'policies', { enumerable: true, get: () => { calls++; return f.dependencies.policies } })
  expect(() => controlledApi.createTerminalAuthority(f.value, f.authorityFor(locationOf(f.value)), deps)).toThrow()
  expect(calls).toBe(0)
  const p = { ...f.dependencies.policies[0] }
  Object.defineProperty(p, 'catalog', { enumerable: true, get: () => { calls++; return f.dependencies.policies[0].catalog } })
  expect(() => controlledApi.createTerminalAuthority(f.value, f.authorityFor(locationOf(f.value)), { ...f.dependencies, policies: [p] })).toThrow()
  expect(calls).toBe(0)
  const list = new Array(1)
  Object.defineProperty(list, 'map', { enumerable: true, value: () => { calls++; return [] } })
  expect(() => controlledApi.createTerminalAuthority(f.value, f.authorityFor(locationOf(f.value)), { ...f.dependencies, policies: list })).toThrow()
  expect(calls).toBe(0)
})
it.each(['unsettled', 'wrong-rest'])('signed plan still requires independent %s source qualification', (fault) => {
  const f = fixture(g1, config, { hp: 1, bleeding: true }); const current = locationOf(f.value); const a = f.authorityFor(current)
  const p = planResidenceLocationRest(current, { ...command(f.value, 'withdraw'), kind: 'rest' }, a, f.locationDependencies)
  const changed = { ...a, cycle: { ...a.cycle, ...(fault === 'unsettled' ? { stableContext: 'unsettled' as const } : { rest: 'C' as const }) } }
  const cap = controlledApi.createTerminalAuthority(f.value, changed, f.dependencies)
  expect(() => controlledApi.consumeResidenceLocationDeath(f.value, p, cap)).toThrow(fault === 'unsettled' ? 'independent stable action' : 'independent facility qualification')
})
