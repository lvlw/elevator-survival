import { describe, expect, it, vi } from 'vitest'
import { deepFreeze } from '../config'
import { createLocationCatalog, establishResidenceLocation, restoreResidenceLocationCandidate } from './controlled'
import { createLocationCommand, queryActiveResidencePosition } from './index'
import { binding, catalogInput, fixture as createFixture, mutable } from './test-fixtures'
import { infectedResidenceConfig } from '../../content/infected-residence-core-v0.1/config'
const fixture = (options: Parameters<typeof createFixture>[1] = {}) => createFixture(infectedResidenceConfig, options)

describe('G2 strict location boundaries (L01)', () => {
  it('requires independently active execution, returns immutable copies without freezing callers', () => {
    const f = fixture(); const raw = mutable(f.state); const before = structuredClone(raw)
    const restored = restoreResidenceLocationCandidate(raw, f.authorityFor(raw), f.dependencies).value
    expect(restored).toEqual(f.state); expect(restored).not.toBe(raw)
    expect(raw).toEqual(before); expect(Object.isFrozen(raw.site)).toBe(false)
    expect(Object.isFrozen(restored.site.knowledge.routes)).toBe(true)
    expect(restoreResidenceLocationCandidate(deepFreeze(raw), f.authorityFor(raw), f.dependencies).value).toEqual(restored)
    expect(queryActiveResidencePosition(restored, f.authorityFor(restored), f.dependencies)).toEqual({ nodeId: 'a', placeId: 'east' })
  })
  it.each(['characterId', 'rulesVersion', 'configurationId'])('rejects site identity %s', (key) => {
    const f = fixture(); const raw = mutable(f.state)
    Reflect.set(raw.site.binding.identity, key, 'wrong')
    expect(() => restoreResidenceLocationCandidate(raw, f.authorityFor(f.state), f.dependencies)).toThrow()
  })
  it.each(['worldId', 'templateId', 'commissionId', 'rulesVersion', 'contractVersion'])('rejects mission %s', (key) => {
    const f = fixture(); const raw = mutable(f.state)
    Reflect.set(raw.site.binding.mission, key, 'wrong')
    expect(() => restoreResidenceLocationCandidate(raw, f.authorityFor(f.state), f.dependencies)).toThrow()
  })
  it.each(['runId', 'seed', 'rulesVersion'])('rejects execution %s', (key) => {
    const f = fixture(); const raw = mutable(f.state)
    Reflect.set(raw.site.binding.execution, key, 'wrong')
    expect(() => restoreResidenceLocationCandidate(raw, f.authorityFor(f.state), f.dependencies)).toThrow()
  })
  it.each(['catalogId', 'catalogVersion'])('rejects %s and look-alike catalog handles', (key) => {
    const f = fixture(); const raw = mutable(f.state)
    Reflect.set(raw.site.binding, key, 'wrong')
    expect(() => restoreResidenceLocationCandidate(raw, f.authorityFor(f.state), f.dependencies)).toThrow()
    expect(() => restoreResidenceLocationCandidate(f.state, f.authorityFor(f.state), { ...f.dependencies,
      catalog: { ...f.dependencies.catalog } })).toThrow()
  })
  it.each([null, [], new (class {})(), {}, { nextState: true }])('rejects non-snapshot %#', (raw) => {
    const f = fixture(); expect(() => restoreResidenceLocationCandidate(raw, f.authorityFor(f.state), f.dependencies)).toThrow()
  })
  it.each(['extra', 'missing', 'getter', 'symbol', 'sparse', 'duplicate', 'negative', 'nan', 'fraction', 'overflow'])('strict malformed site %s', (mode) => {
    const f = fixture(); const raw = mutable(f.state)
    if (mode === 'extra') Reflect.set(raw.site, 'energy', 100)
    if (mode === 'missing') Reflect.deleteProperty(raw.site, 'sources')
    if (mode === 'getter') Object.defineProperty(raw.site, 'nodeId', { enumerable: true, get() { throw new Error('getter must not execute') } })
    if (mode === 'symbol') Reflect.set(raw.site, Symbol('x'), true)
    if (mode === 'sparse') raw.site.sources.length += 1
    if (mode === 'duplicate') raw.site.facts.push(raw.site.facts[0])
    if (mode === 'negative') raw.site.sources[0].drawIndex = -1
    if (mode === 'nan') raw.site.sources[0].drawIndex = NaN
    if (mode === 'fraction') raw.character.revision = 0.5
    if (mode === 'overflow') raw.character.revision = Number.MAX_SAFE_INTEGER + 1
    expect(() => restoreResidenceLocationCandidate(raw, f.authorityFor(f.state), f.dependencies)).toThrow()
  })
  it.each(['eligible', 'canCarry', 'alreadyTriggered', 'free', 'force', 'nextState', 'cost', 'quantity', 'edgeIds'])('rejects command bypass %s', (key) => {
    const f = fixture(); expect(() => createLocationCommand({ ...binding(f.state), kind: 'move', edgeId: 'ab', [key]: true })).toThrow()
  })
  it('rejects view and unsupported operations rather than turning them into free mutations', () => {
    const f = fixture()
    for (const kind of ['view', 'split', 'merge', 'equip', 'combat', 'install', 'rest']) {
      expect(() => createLocationCommand({ ...binding(f.state), kind })).toThrow()
    }
    const request = { ...binding(f.state), kind: 'move', edgeId: 'ab' }
    const command = createLocationCommand(request)
    expect(command).toEqual(request); expect(command).not.toBe(request); expect(Object.isFrozen(command.binding)).toBe(true)
  })
  it.each(['duplicate-node', 'bad-surface', 'hidden-source', 'bad-cost', 'bad-profile', 'unknown-fact', 'bad-band', 'unknown-entry', 'extra'])('strict controlled catalog %s', (mode) => {
    const input = catalogInput()
    if (mode === 'duplicate-node') input.nodes.push(input.nodes[0])
    if (mode === 'bad-surface') input.nodes[0].surfaceEdgeIds.push('bc')
    if (mode === 'hidden-source') input.nodes[0].surfaceSourceIds.push('lottery-b')
    if (mode === 'bad-cost') input.edges[0].cost.base = 0
    if (mode === 'bad-profile') input.items[0].resource.definitionId = 'other'
    if (mode === 'unknown-fact') input.edges[0].requiredFactIds.push('unknown')
    if (mode === 'bad-band') input.backpack.weightBands.loaded.min = 10
    if (mode === 'unknown-entry') input.entryNodeId = 'absent'
    if (mode === 'extra') Reflect.set(input, 'approved', true)
    expect(() => createLocationCatalog(input)).toThrow()
  })
  it('does not accept existing site payload as initialization or normalize missing resources', () => {
    const f = fixture()
    expect(() => establishResidenceLocation(f.state, f.authorityFor(f.state), f.dependencies)).toThrow()
    const raw = mutable(f.state); Reflect.deleteProperty(raw.carried, 'quickSlots')
    expect(() => restoreResidenceLocationCandidate(raw, f.authorityFor(f.state), f.dependencies)).toThrow()
  })
  it('rejects accessors before invocation and duplicate static enemy definitions with conflicting meaning', () => {
    const f = fixture(); const raw = mutable(f.state); const getter = vi.fn(() => 'a')
    Object.defineProperty(raw.site, 'nodeId', { enumerable: true, get: getter })
    expect(() => restoreResidenceLocationCandidate(raw, f.authorityFor(f.state), f.dependencies)).toThrow()
    expect(getter).not.toHaveBeenCalled()
    const input = catalogInput(); input.enemies.push({ ...structuredClone(input.enemies[0]), id: 'second', nodeId: 'b' })
    input.enemies[1].definition.maxHealth = 11
    expect(() => createLocationCatalog(input)).toThrow()
  })
  it.each(['raw-ctb', 'risk-negative', 'unencountered-risk', 'intent-mismatch', 'enemy-overflow'])('rejects unsupported or inconsistent enemy state %s', (mode) => {
    const input = catalogInput()
    if (mode === 'enemy-overflow') input.enemies[0].definition.initialIntentActionId = 'bite'
    const f = fixture({ catalog: input }); const raw = mutable(f.state)
    const enemy = raw.site.enemies[0]
    if (mode === 'raw-ctb') Reflect.set(enemy, 'currentCtb', 50)
    if (mode === 'risk-negative') enemy.riskDrawIndex = -1
    if (mode === 'unencountered-risk') enemy.riskDrawIndex = 1
    if (mode === 'intent-mismatch') enemy.state.currentIntentActionId = 'bite'
    if (mode === 'enemy-overflow') { enemy.state.hasBeenEncountered = true; enemy.state.resolvedActionCount = Number.MAX_SAFE_INTEGER }
    expect(() => restoreResidenceLocationCandidate(raw, f.authorityFor(raw), f.dependencies)).toThrow()
  })
})
