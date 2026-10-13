// TEST ONLY. Native spies observe calls; no resolver or RNG replacement.
import { vi, expect } from 'vitest'
import { exitEnergyCost } from '../../../core/residence-combat/history'
import type { CombatDependencies, CombatValue, ClosedBattleReceipt } from '../../../core/residence-combat/types'
import * as stable from '../../../core/residence-combat/stable'
import * as combat from '../../../core/residence-combat/actions'
import * as entry from '../../../core/residence-combat/entry'
import * as cycle from '../../../core/character-cycle'
import * as energy from '../../../core/residence-energy'
import * as initial from '../../../core/residence-combat/initial'
import type { Harness } from './e03-test-harness'
export function observe(h: Harness) {
  const spies = { task: vi.spyOn(stable, 'planCombatTask'), source: vi.spyOn(stable, 'planCombatSource'),
    medical: vi.spyOn(stable, 'planCombatMedical'), maintenance: vi.spyOn(stable, 'planCombatMaintenance'),
    terminal: vi.spyOn(stable, 'planCombatTerminal'), rest: vi.spyOn(stable, 'planCombatRest'),
    combat: vi.spyOn(combat, 'resolveResidenceCombatAction'), move: vi.spyOn(entry, 'planCombatMove'),
    g1: vi.spyOn(energy, 'planResidenceAction'), cycle: vi.spyOn(cycle, 'planCharacterCycle'),
    initial: vi.spyOn(initial, 'establishCombatInitial') }
  const counts = () => ({ ...Object.fromEntries(Object.entries(spies).map(([key, spy]) => [key, spy.mock.calls.length])),
    draw: h.draw.mock.calls.length, write: h.storage.write.mock.calls.length, notify: h.notify.mock.calls.length })
  const clear = () => { Object.values(spies).forEach(s => s.mockClear()); h.draw.mockClear(); h.storage.write.mockClear(); h.notify.mockClear() }
  return { spies, counts, clear }
}
export function assertExitAccounting(receipt: ClosedBattleReceipt, deps: CombatDependencies) {
  expect(receipt.requestedEnergy).toBe(exitEnergyCost(receipt.elapsed, deps))
  expect(receipt.energyAfter).toBe(Math.max(0, receipt.energyBefore - receipt.requestedEnergy))
}
export function assertCompleteEqual(actual: CombatValue, expected: CombatValue) { expect(actual).toEqual(expected) }
