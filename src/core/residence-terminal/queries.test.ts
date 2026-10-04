import { afterEach, expect, it, vi } from 'vitest'
import * as cycle from '../character-cycle'
import * as mission from '../mission-lifecycle/controlled'
import * as random from '../random'
import { infectedResidenceConfig as g1 } from '../../content/infected-residence-core-v0.1/config'
import { infectedTerminalCoreConfig as config } from '../../content/infected-terminal-core-v0.1/config'
import { queryTerminalEligibility } from './queries'
import { fixture, mutable } from './test-fixtures'

afterEach(() => vi.restoreAllMocks())
it('T01 T09 T11 query is a frozen allow-list with zero producer/draw/termination/IO calls', () => {
  const f = fixture(g1, config, { complete: true })
  const g = vi.spyOn(cycle, 'planCharacterCycle'); const m = vi.spyOn(mission, 'terminateMission')
  const draw = vi.spyOn(random, 'drawIntInclusive'); const io = vi.spyOn(Storage.prototype, 'setItem')
  const v = mutable(f.value); const before = structuredClone(v)
  for (let i = 0; i < 3; i++) expect(queryTerminalEligibility(v, f.authority)).toEqual({ deliver: true, withdraw: false, deadline: false })
  expect(v).toEqual(before); expect(Object.isFrozen(v)).toBe(false)
  expect(g).not.toHaveBeenCalled(); expect(m).not.toHaveBeenCalled(); expect(draw).not.toHaveBeenCalled(); expect(io).not.toHaveBeenCalled()
  expect(Object.keys(queryTerminalEligibility(v, f.authority)).sort()).toEqual(['deadline', 'deliver', 'withdraw'])
  expect(Object.isFrozen(queryTerminalEligibility(v, f.authority))).toBe(true)
})
it('T11 hidden seed and exact infection do not appear in ordinary output', () => {
  const f = fixture(g1, config, { infection: 119 })
  const out = JSON.stringify(queryTerminalEligibility(f.value, f.authority))
  for (const key of ['119', 'seed', 'runId', 'infectionProgress', 'drawIndex', 'rulesVersion']) expect(out).not.toContain(key)
})
