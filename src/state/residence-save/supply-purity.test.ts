import { afterEach, describe, expect, it, vi } from 'vitest'
import * as energy from '../../core/residence-energy'
import * as cycle from '../../core/character-cycle'
import * as bodyConsequences from '../../core/character-cycle/cycle'
import * as supplyMovement from '../../core/residence-supply/controlled'
import * as movement from '../../core/residence-location/movement'
import * as locationSource from '../../core/residence-location/sources'
import * as locationItems from '../../core/residence-location/items'
import * as locationRest from '../../core/residence-location/controlled'
import * as task from '../../core/residence-task/actions'
import * as source from '../../core/residence-task/sources'
import * as transfer from '../../core/residence-task/transfer'
import * as medical from '../../core/residence-supply/medical'
import * as maintenance from '../../core/residence-supply/maintenance'
import * as inventory from '../../core/residence-supply/inventory'
import * as lifecycle from '../../core/mission-lifecycle/controlled'
import * as terminal from '../../core/residence-terminal/controlled'
import * as supplyTerminal from '../../core/residence-terminal/supply-terminal'
import * as authority from '../../core/residence-supply/authority'
import * as initial from '../../core/residence-supply/initial'
import * as allocations from '../../core/residence-supply/allocations'
import * as random from '../../core/random'
import { states, expectation, mutable } from './supply-test-fixtures'
import { createSupplyResidencePolicy } from './supply-policy'
import { serializeSupplyResidenceSave as encode, deserializeSupplyResidenceSave as decode } from './supply-codec'
import { restoreSupplyResidenceCandidate as restore } from './supply-expected'
afterEach(() => vi.restoreAllMocks())

describe('R10 zero producer/authority/RNG/IO calls per pure operation', () => {
  for (const phase of ['first-hub', 'active-world', 'living-hub', 'dead'] as const) {
    it.each(['encode', 'decode', 'restore'] as const)('%s of ' + phase + ' performs zero gameplay or persistence work', operation => {
      const { f, rows } = states(), v = rows.find(v => v.phase === phase)!, e = expectation(v, f.dependencies)
      const text = encode(v, e, f.policy), input = mutable(v), before = structuredClone(input)
      const draw = vi.fn(f.dependencies.draw), policy = createSupplyResidencePolicy({ ...f.dependencies, draw })
      const spies = [
        vi.spyOn(energy, 'planResidenceAction'), vi.spyOn(cycle, 'planCharacterCycle'),
        vi.spyOn(bodyConsequences, 'planActionBodyConsequences'),
        vi.spyOn(supplyMovement, 'planSupplyMove'), vi.spyOn(supplyMovement, 'planSupplyRest'),
        vi.spyOn(movement, 'planResidenceMove'), vi.spyOn(movement, 'planResidenceBoundMove'),
        vi.spyOn(locationSource, 'planResidenceSourceReveal'), vi.spyOn(locationItems, 'planResidenceItemTransfer'),
        vi.spyOn(locationRest, 'planResidenceLocationRest'), vi.spyOn(locationRest, 'establishResidenceLocation'),
        vi.spyOn(task, 'planSupplyTaskAction'), vi.spyOn(source, 'planSupplySourceReveal'),
        vi.spyOn(transfer, 'planSupplyTaskTransfer'), vi.spyOn(medical, 'planSupplyMedical'),
        vi.spyOn(maintenance, 'planSupplyMaintenance'), vi.spyOn(inventory, 'planSupplyInventory'),
        vi.spyOn(lifecycle, 'activateMission'), vi.spyOn(lifecycle, 'terminateMission'),
        vi.spyOn(terminal, 'planResidenceTerminal'), vi.spyOn(terminal, 'consumeResidenceLocationDeath'),
        vi.spyOn(supplyTerminal, 'planSupplyTerminal'), vi.spyOn(supplyTerminal, 'consumeSupplyDeath'),
        vi.spyOn(supplyTerminal, 'consumeSupplyLocationDeath'), vi.spyOn(authority, 'createSupplyAuthority'),
        vi.spyOn(initial, 'establishSupplyInitial'), vi.spyOn(initial, 'planSupplyDeparture'),
        vi.spyOn(allocations, 'issueSupplyOrigin'), vi.spyOn(random, 'drawIntInclusive'),
      ]
      // Real browser IO/event surfaces are observable but not dependencies of this headless API.
      const reads = vi.spyOn(Storage.prototype, 'getItem'), writes = vi.spyOn(Storage.prototype, 'setItem')
      const notifications = vi.spyOn(EventTarget.prototype, 'dispatchEvent')
      const result = operation === 'encode' ? encode(input, e, policy) : operation === 'decode' ? decode(text, e, policy) : restore(input, v, e, policy)
      expect(result).toBeDefined(); expect(input).toEqual(before)
      expect(spies.map(s => s.mock.calls.length)).toEqual(Array(spies.length).fill(0))
      expect([draw.mock.calls.length, reads.mock.calls.length, writes.mock.calls.length, notifications.mock.calls.length]).toEqual([0, 0, 0, 0])
      expect('authority' in (typeof result === 'string' ? {} : result)).toBe(false)
      expect(() => authority.readAuthorizedSupply(v, typeof result === 'string' ? JSON.parse(result) : result)).toThrow()
    })
  }
})
