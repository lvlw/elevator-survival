import { afterEach, describe, expect, it, vi } from 'vitest'
import * as cycle from '../character-cycle'
import * as mission from '../mission-lifecycle/controlled'
import * as plans from './plans'
import * as location from '../residence-location'
import { planResidenceLocationRest } from '../residence-location/controlled'
import { infectedResidenceConfig as g1 } from '../../content/infected-residence-core-v0.1/config'
import { infectedTerminalCoreConfig as config } from '../../content/infected-terminal-core-v0.1/config'
import { fixture, command, mutable } from './test-fixtures'
import { planResidenceTerminal, consumeResidenceLocationDeath } from './controlled'
import { locationOf } from './authority'

afterEach(() => vi.restoreAllMocks())
describe('T04 T09 G1 producer-fault tests (not replacement positive models)', () => {
  it.each(['nonempty', 'outcome', 'cause', 'deadline', 'clock', 'body', 'cycle', 'revision', 'base', 'extra', 'missing'])('normal original result fault %s rejects after exactly one G1 call', (fault) => {
    const f = fixture(g1, config); const before = structuredClone(f.value)
    const native = cycle.planCharacterCycle
    const g = vi.spyOn(cycle, 'planCharacterCycle').mockImplementation((...args) => {
      const p = mutable(native(...args))
      if (fault === 'nonempty') p.steps.push({ kind: 'primary', healthBefore: 12, healthAfter: 12, facts: { healthLoss: 0, exposuresAdded: 0 } })
      if (fault === 'outcome') p.outcome = 'death'
      if (fault === 'cause') p.deathCause = 'cycle-bleeding'
      if (fault === 'deadline' && p.snapshot.clock.kind === 'return-due') p.requiresDeadlineClosure = p.snapshot.clock.source
      if (fault === 'clock' && p.snapshot.clock.kind === 'return-due') p.snapshot.clock.source.endCycle++
      if (fault === 'body') p.snapshot.body.satiety--
      if (fault === 'cycle') p.snapshot.cycle++
      if (fault === 'revision') p.snapshot.revision++
      if (fault === 'base') p.base.identity.characterId = 'forged'
      if (fault === 'extra') Object.assign(p, { supported: true })
      if (fault === 'missing') Reflect.deleteProperty(p, 'steps')
      return p
    })
    const close = vi.spyOn(mission, 'terminateMission'); const complete = vi.spyOn(plans, 'issueTerminalPlan')
    expect(() => planResidenceTerminal(f.value, command(f.value, 'withdraw'), f.authority)).toThrow()
    expect(g).toHaveBeenCalledTimes(1); expect(close).not.toHaveBeenCalled(); expect(complete).not.toHaveBeenCalled()
    expect(f.value).toEqual(before)
  })
  it.each(['empty', 'null', 'string-step', 'reorder', 'post-death', 'facts', 'unowned', 'closure', 'wrong-cause', 'wrong-outcome'])('deadline original death fault %s rejects after one producer call', (fault) => {
    const f = fixture(g1, config, { day: 7, node: 'b', hp: 1, bleeding: true })
    const native = cycle.planCharacterCycle
    const g = vi.spyOn(cycle, 'planCharacterCycle').mockImplementation((...args) => {
      const p = mutable(native(...args))
      if (fault === 'empty') p.steps = []
      if (fault === 'null') Object.assign(p, { steps: null })
      if (fault === 'string-step') Object.assign(p, { steps: ['cycle-bleeding'] })
      if (fault === 'reorder') p.steps[0].kind = 'hunger'
      if (fault === 'post-death') p.steps.push({ kind: 'end-cycle', healthBefore: 0, healthAfter: 0, facts: { energyBefore: 100, energyAfter: 100 } })
      if (fault === 'facts') p.steps[0].facts.damage = 0
      if (fault === 'unowned') p.snapshot.body.condition.painkillerActive = true
      if (fault === 'wrong-cause') p.deathCause = 'hunger'
      if (fault === 'wrong-outcome') p.outcome = 'alive'
      if (fault === 'closure' && f.value.character.clock.kind === 'active') p.requiresDeadlineClosure = { mission: f.value.character.clock.mission,
        execution: f.value.character.clock.execution, startCycle: 1, taskDay: 7, endCycle: 7, outcome: 'deadline-failure' }
      return p
    })
    const close = vi.spyOn(mission, 'terminateMission'); const complete = vi.spyOn(plans, 'issueTerminalPlan')
    expect(() => planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority)).toThrow()
    expect(g).toHaveBeenCalledTimes(1); expect(close).not.toHaveBeenCalled(); expect(complete).not.toHaveBeenCalled()
  })
  it('nonbleeding body cannot be accepted as cycle-bleeding death even with consistent HP arithmetic', () => {
    const f = fixture(g1, config, { day: 7, node: 'b', hp: 1 })
    vi.spyOn(cycle, 'planCharacterCycle').mockReturnValue({ base: { identity: f.value.character.identity, revision: f.value.character.revision },
      snapshot: { ...f.value.character, revision: f.value.character.revision + 1,
        body: { ...f.value.character.body, condition: { ...f.value.character.body.condition, currentHealth: 0 } } },
      steps: [{ kind: 'cycle-bleeding', healthBefore: 1, healthAfter: 0, facts: { damage: 1 } }],
      outcome: 'death', deathCause: 'cycle-bleeding', requiresDeadlineClosure: null })
    expect(() => planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority)).toThrow('Unqualified cycle bleeding')
  })
})

it('T09 accepting or rejecting a mutable G1 proposal never freezes or modifies that proposal', () => {
  const f = fixture(g1, config); const native = cycle.planCharacterCycle
  const captured: ReturnType<typeof mutable<ReturnType<typeof native>>>[] = []
  vi.spyOn(cycle, 'planCharacterCycle').mockImplementation((...args) => {
    const p = mutable(native(...args)); captured.push(p); return p
  })
  const p = planResidenceTerminal(f.value, command(f.value, 'withdraw'), f.authority)
  expect(Object.isFrozen(p.snapshot)).toBe(true)
  expect(Object.isFrozen(captured[0])).toBe(false); expect(Object.isFrozen(captured[0].snapshot.body)).toBe(false)
  expect(captured[0].steps).toEqual([]); expect(captured[0].snapshot.body).toEqual(f.value.character.body)
  captured[0].snapshot.body.energy = 1
  expect(p.snapshot.character.body.energy).toBe(100)
})

it.each(['empty', 'null', 'string', 'wrong-order', 'fake-kind'])('T05 malformed unsigned death %s fails before G2 proof can be bypassed', (fault) => {
  const f = fixture(g1, config, { hp: 1, bleeding: true }); const current = locationOf(f.value)
  const p = mutable(location.planResidenceMove(current, { ...command(f.value, 'withdraw'), kind: 'move', edgeId: 'ab' }, f.authorityFor(current), f.locationDependencies))
  if (fault === 'empty') p.steps = []
  if (fault === 'null') Object.assign(p, { steps: null })
  if (fault === 'string') Object.assign(p, { steps: ['death'] })
  if (fault === 'wrong-order') p.steps.reverse()
  if (fault === 'fake-kind') Object.assign(p, { kind: 'combat-result' })
  expect(() => consumeResidenceLocationDeath(f.value, p, f.authority)).toThrow()
})

// Explicit producer-boundary fault injection. Native positive provenance is checked
// against the genuine original; only this test simulates corruption after that check.
it.each(['empty', 'null', 'string', 'order', 'unowned-body', 'rest-site', 'free-action'])('T05 post-proof corrupt G2 result %s rejects before close/complete plan', (fault) => {
  const f = fixture(g1, config, { hp: 1, bleeding: true }); const current = locationOf(f.value)
  const auth = f.authorityFor(current)
  const original = fault === 'rest-site'
    ? planResidenceLocationRest(current, { ...command(f.value, 'withdraw'), kind: 'rest' }, auth, f.locationDependencies)
    : location.planResidenceMove(current, { ...command(f.value, 'withdraw'), kind: 'move', edgeId: 'ab' }, auth, f.locationDependencies)
  const pristine = structuredClone(original); const bad = mutable(original)
  if (fault === 'empty') bad.steps = []
  if (fault === 'null') Object.assign(bad, { steps: null })
  if (fault === 'string') Object.assign(bad, { steps: ['death'] })
  if (fault === 'order') bad.steps.reverse()
  if (fault === 'unowned-body') bad.snapshot.character.body.satiety--
  if (fault === 'rest-site') bad.snapshot.site.facts[0].value = true
  if (fault === 'free-action') { bad.energyCost = 0; bad.snapshot.character.body.energy = current.character.body.energy }
  const nativeProof = location.assertResidenceLocationPlanCurrent
  const proof = vi.spyOn(location, 'assertResidenceLocationPlanCurrent').mockImplementation((before, _bad, a, deps) => nativeProof(before, original, a, deps))
  const close = vi.spyOn(mission, 'terminateMission'); const complete = vi.spyOn(plans, 'issueTerminalPlan')
  expect(() => consumeResidenceLocationDeath(f.value, bad, f.authority)).toThrow(fault === 'order' ? 'Invalid body step order'
    : fault === 'unowned-body' ? 'Body result changed unowned fields' : fault === 'rest-site' ? 'Rest death changed non-body state'
      : fault === 'free-action' ? 'paid move/reveal results' : 'Invalid residence value shape or number')
  expect(proof).toHaveBeenCalledTimes(1); expect(close).not.toHaveBeenCalled(); expect(complete).not.toHaveBeenCalled()
  expect(original).toEqual(pristine)
})
it.each(['infection', 'exposure'])('T10 composed %s overflow is rejected before G1; normal H0 still does not settle overnight', (field) => {
  const f = fixture(g1, config, { day: 7, node: 'b' }); const v = mutable(f.value)
  if (field === 'infection') v.character.body.infectionProgress = Number.MAX_SAFE_INTEGER
  else v.character.body.condition.pendingInfectionExposures = Number.MAX_SAFE_INTEGER
  const cap = f.authorize(v); const spy = vi.spyOn(cycle, 'planCharacterCycle')
  expect(() => planResidenceTerminal(v, command(v, 'deadline'), cap)).toThrow()
  expect(spy).not.toHaveBeenCalled()
  const h = fixture(g1, config); const atHome = mutable(h.value)
  atHome.character.body.infectionProgress = Number.MAX_SAFE_INTEGER
  expect(planResidenceTerminal(atHome, command(atHome, 'withdraw'), h.authorize(atHome)).snapshot.character.body).toEqual(atHome.character.body)
  expect(spy).toHaveBeenCalledTimes(1)
})
