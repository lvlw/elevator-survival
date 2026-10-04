import { describe, expect, it, vi } from 'vitest'
import { activateMission } from '../../core/mission-lifecycle/controlled'
import { planResidenceMove } from '../../core/residence-location'
import { createLocationCatalog } from '../../core/residence-location/controlled'
import { createTerminalAuthority, consumeResidenceLocationDeath, planResidenceTerminal } from '../../core/residence-terminal/controlled'
import { readTerminalSnapshot } from '../../core/residence-terminal/validation'
import { createTerminalResidenceSavePolicy } from './terminal-controlled'
import { fixture, initial, mutable, assertRejected, accepted, normal, death, command, locationOf, roundTrip, policyFor } from './terminal-test-fixtures'

describe('B04 complete identities and B05 stable lifecycle', () => {
  it.each(['root-character', 'child-character', 'execution', 'world', 'contract', 'catalog', 'catalog-version', 'rules', 'g1-config', 'terminal-config',
    'missing-mission', 'duplicate-mission', 'unknown-mission', 'two-active', 'run-reuse'])('rejects %s without repairing scope', (fault) => {
    const f = fixture({ two: true }); const raw = mutable(f.value)
    if (fault === 'root-character') raw.character.identity.characterId = 'other'
    if (fault === 'child-character') raw.missions[0].binding.characterId = 'other'
    if (fault === 'execution') raw.site!.binding.execution.seed = 'other'
    if (fault === 'world') raw.missions[0].binding.mission.worldId = 'other'
    if (fault === 'contract') raw.missions[0].binding.mission.contractVersion = 'other'
    if (fault === 'catalog') raw.site!.binding.catalogId = 'other'
    if (fault === 'catalog-version') raw.site!.binding.catalogVersion = 'other'
    if (fault === 'rules') raw.character.identity.rulesVersion = 'other'
    if (fault === 'g1-config') raw.character.identity.configurationId = 'other'
    if (fault === 'terminal-config') raw.terminalConfigurationId = 'other'
    if (fault === 'missing-mission') raw.missions.pop()
    if (fault === 'duplicate-mission') raw.missions[1] = raw.missions[0]
    if (fault === 'unknown-mission') raw.missions[1].binding.mission.commissionId = 'other'
    if (fault === 'two-active' || fault === 'run-reuse') raw.missions[1] = mutable(activateMission(raw.missions[1], { binding: raw.missions[1].binding,
      execution: { ...raw.site!.binding.execution, runId: fault === 'two-active' ? 'another' : raw.site!.binding.execution.runId } }, f.dependencies.residence.scope))
    assertRejected(raw, f.policy, ['rules', 'g1-config', 'terminal-config'].includes(fault) ? 'BINDING_MISMATCH' : 'INVALID_STATE')
  })
  it('valid complete reordered declaration facts are canonicalized only after validation', () => {
    const f = fixture({ two: true }); const raw = mutable(f.value); raw.missions.reverse()
    expect(accepted(raw, f.policy)).toEqual(f.value)
  })
  it.each(['cycle', 'task-day', 'revision', 'clock-source', 'phase', 'hp', 'empty-steps', 'step-order', 'post-death', 'source', 'cause', 'facts'])('rejects terminal %s contradiction', (fault) => {
    const f = fixture({ hp: 1, bleeding: true }); const raw = mutable(death(f).value)
    if (fault === 'cycle') raw.character.cycle++
    if (fault === 'task-day' && raw.character.clock.kind === 'active') raw.character.clock.taskDay++
    if (fault === 'revision') raw.receipts[0].revision++
    if (fault === 'clock-source' && raw.character.clock.kind === 'active') raw.character.clock.execution.runId = 'wrong'
    if (fault === 'phase') raw.phase = 'living-hub'
    if (fault === 'hp') raw.character.body.condition.currentHealth = 1
    if (fault === 'empty-steps') raw.receipts[0].steps = []
    if (fault === 'step-order') raw.receipts[0].steps.reverse()
    if (fault === 'post-death') raw.receipts[0].steps.push({ kind: 'end-cycle', healthBefore: 0, healthAfter: 0, facts: { energyBefore: 0, energyAfter: 100 } })
    if (fault === 'source') raw.receipts[0].source = 'normal-return'
    if (fault === 'cause') raw.receipts[0].deathCause = 'infection'
    if (fault === 'facts') raw.receipts[0].steps[1].facts.damage = 0
    assertRejected(raw, f.policy)
  })
  it.each(['cycle', 'outcome', 'missing-history', 'body-hp'])('normal return due rejects %s', (fault) => {
    const f = fixture(); const raw = mutable(normal(f))
    if (fault === 'cycle') raw.character.cycle++
    if (fault === 'outcome' && raw.character.clock.kind === 'return-due') raw.character.clock.source.outcome = 'success'
    if (fault === 'missing-history') raw.archives = []
    if (fault === 'body-hp') raw.character.body.condition.currentHealth = 0
    assertRejected(raw, f.policy)
  })
  it('live pending and hidden pending omission both reject while intermediate HP0 is not a terminal', () => {
    const f = fixture({ encounterOnArrival: true }); const s = locationOf(f.value)
    const p = planResidenceMove(s, { ...command(f.value, 'withdraw'), kind: 'move', edgeId: 'ab' }, f.authorityFor(s), f.locationDependencies)
    const pending = { ...f.value, ...p.snapshot }
    assertRejected(pending, f.policy, 'UNSUPPORTED_STAGE')
    const hidden = mutable(pending); hidden.site.pending = { kind: 'none' }
    assertRejected(hidden, f.policy)
    const intermediate = mutable(f.value); intermediate.character.body.condition.currentHealth = 0
    assertRejected(intermediate, f.policy)
  })
  it.each(['move', 'rest'] as const)('native %s bleeding death cannot restore a nonbleeding current body', (mode) => {
    const f = fixture({ hp: 1, bleeding: true }); const bad = mutable(death(f, mode).value)
    bad.character.body.condition.bleeding = false
    assertRejected(bad, f.policy)
  })
  it('primary exposure persists with preexisting exposure; it cannot vanish from a real arrival death', () => {
    const f = fixture({ hp: 1 }); const data = mutable(f.locationDependencies.catalog.data)
    data.edges[0].arrival = { healthLoss: 1, exposuresAdded: 2 }
    const catalog = createLocationCatalog(data)
    const deps = { ...f.dependencies, policies: [{ ...f.dependencies.policies[0], catalog }] }
    const policy = policyFor(deps)
    const before = mutable(f.value); before.character.body.condition.pendingInfectionExposures = 3
    const value = readTerminalSnapshot(before, deps)
    const s = locationOf(value); const authority = f.authorityFor(s)
    const cap = createTerminalAuthority(value, authority, deps)
    const p = planResidenceMove(s, { kind: 'move', binding: s.site.binding, expectedRevision: s.character.revision, edgeId: 'ab' }, authority,
      { ...f.locationDependencies, catalog })
    const result = consumeResidenceLocationDeath(value, p, cap).snapshot
    expect(result.character.body.condition.pendingInfectionExposures).toBe(5)
    roundTrip(result, policy)
    const bad = mutable(result); bad.character.body.condition.pendingInfectionExposures = 0
    expect(() => readTerminalSnapshot(bad, deps)).not.toThrow()
    assertRejected(bad, policy)
  })
  it('infection death before reset cannot falsify the suppression trace independently of body', () => {
    const f = fixture({ day: 7, node: 'b', hp: 1, infection: 60 })
    const result = planResidenceTerminal(f.value, command(f.value, 'deadline'), f.authority).snapshot
    roundTrip(result, f.policy)
    const bad = mutable(result); bad.receipts[0].steps.find((s) => s.kind === 'infection')!.facts.suppression = 15
    expect(() => readTerminalSnapshot(bad, f.dependencies)).not.toThrow()
    assertRejected(bad, f.policy)
  })
  it.each(['active', 'closed'] as const)('first %s execution cannot invent an earlier unrecorded departure day', (kind) => {
    const f = fixture(); const bad = mutable(kind === 'active' ? f.value : normal(f))
    bad.character.cycle++
    if (bad.character.clock.kind === 'active') bad.character.clock.startCycle++
    else if (bad.character.clock.kind === 'return-due') {
      bad.character.clock.source.startCycle++; bad.character.clock.source.endCycle++
      bad.receipts[0].startCycle++; bad.receipts[0].endCycle++
    }
    expect(() => readTerminalSnapshot(bad, f.dependencies)).not.toThrow()
    assertRejected(bad, f.policy)
  })
  it.each(['balance', 'revision', 'closed', 'nonempty-history', 'warehouse-duplicate', 'warehouse-task'])('fresh rejects %s instead of clearing it', (fault) => {
    const f = initial(); const raw = mutable(f.fresh)
    if (fault === 'balance') raw.balance = 1
    if (fault === 'revision') raw.character.revision = 1
    if (fault === 'closed') Object.assign(raw.missions[0], { status: 'closed', outcome: 'death' })
    if (fault === 'nonempty-history') Object.assign(raw, { archives: [{}] })
    if (fault.startsWith('warehouse')) {
      const definitionId = fault === 'warehouse-task' ? 'quest' : 'lamp'
      const item = { instanceId: 'fresh-item', definitionId, quantity: 1 }
      raw.warehouse.items.push(item)
      raw.warehouse.itemStates.states.push({ ...item, resource: { kind: 'none' } })
      if (fault === 'warehouse-duplicate') { raw.carried.equipment.utility = item; raw.itemStates.states.push({ instanceId: item.instanceId, definitionId, resource: { kind: 'charge', current: 0 } }) }
    }
    assertRejected(raw, f.policy)
  })
})

describe('B04 controlled policy shells and signed handles', () => {
  it.each(['clone-config', 'clone-terminal', 'clone-catalog', 'rules', 'missing-policy', 'duplicate-policy', 'role', 'sample', 'extra', 'class', 'getter', 'sparse'])('rejects %s with no caller getter execution', (fault) => {
    const f = fixture(); const input = { ...f.policy, policies: [...f.policy.policies] }; const getter = vi.fn(() => f.policy.configuration)
    if (fault === 'clone-config') input.configuration = { ...input.configuration }
    if (fault === 'clone-terminal') input.terminalConfiguration = { ...input.terminalConfiguration }
    if (fault === 'clone-catalog') input.policies[0] = { ...input.policies[0], catalog: { ...input.policies[0].catalog } }
    if (fault === 'rules') input.rulesVersion = 'unknown'
    if (fault === 'missing-policy') input.policies = []
    if (fault === 'duplicate-policy') input.policies.push(input.policies[0])
    if (fault === 'role') input.policies[0] = { ...input.policies[0], returnNodeId: 'unknown' }
    if (fault === 'sample') input.policies[0] = { ...input.policies[0], sampleOrdinal: 1 }
    if (fault === 'extra') Object.assign(input, { current: f.value })
    if (fault === 'class') Object.setPrototypeOf(input, new (class {})())
    if (fault === 'getter') Object.defineProperty(input, 'configuration', { get: getter, enumerable: true })
    if (fault === 'sparse') input.policies.length++
    expect(() => createTerminalResidenceSavePolicy(input)).toThrowError(expect.objectContaining({ name: 'TerminalResidenceSaveError', code: 'INVALID_POLICY' }))
    expect(getter).not.toHaveBeenCalled()
  })
  it('copies values without freezing caller shells; look-alike policy cannot validate a save', () => {
    const f = fixture(); const declarations = mutable(f.policy.declarations)
    const roles = { ...f.policy.policies[0], specialDefinitionIds: [...f.policy.policies[0].specialDefinitionIds] }
    const input = { ...f.policy, declarations, policies: [roles] }
    const p = createTerminalResidenceSavePolicy(input)
    expect(Object.isFrozen(input)).toBe(false); expect(Object.isFrozen(declarations[0])).toBe(false)
    expect(Object.isFrozen(roles.specialDefinitionIds)).toBe(false)
    declarations[0].commissionId = 'changed'; roles.specialDefinitionIds.push('other')
    roundTrip(f.value, p)
    assertRejected(f.value, { ...p }, 'INVALID_POLICY')
  })
})
