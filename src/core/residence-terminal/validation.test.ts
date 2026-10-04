import { expect, it } from 'vitest'
import { infectedResidenceConfig as g1 } from '../../content/infected-residence-core-v0.1/config'
import { infectedTerminalCoreConfig as config } from '../../content/infected-terminal-core-v0.1/config'
import { fixture, command, mutable } from './test-fixtures'
import { planResidenceTerminal } from './controlled'
import { readTerminalSnapshot } from './validation'

it.each([-1, true, '1', 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, undefined])('T10 invalid current balance %s cannot be washed through any terminal', (bad) => {
  const f = fixture(g1, config)
  expect(() => readTerminalSnapshot({ ...f.value, balance: bad }, f.dependencies)).toThrow()
})
it.each([null, [], new (class Value {})(), { kind: 'deliver' }, { kind: 'combat' }])('T10 malformed command %j is rejected', (bad) => {
  const f = fixture(g1, config)
  expect(() => planResidenceTerminal(f.value, bad, f.authority)).toThrow()
})
it.each(['completed', 'outcome', 'reward', 'seed', 'snapshot', 'supported', 'risk', 'effects'])('T07 command cannot supply %s', (key) => {
  const f = fixture(g1, config)
  expect(() => planResidenceTerminal(f.value, { ...command(f.value, 'withdraw'), [key]: true }, f.authority)).toThrow()
})
it.each(['class', 'accessor', 'symbol', 'sparse', 'extra', 'missing'])('T10 strict data rejects %s without invoking caller code', (kind) => {
  const f = fixture(g1, config); const v = mutable(f.value); let calls = 0
  if (kind === 'class') Object.setPrototypeOf(v, new (class {})())
  if (kind === 'accessor') Object.defineProperty(v, 'balance', { enumerable: true, get: () => { calls++; return 0 } })
  if (kind === 'symbol') Object.defineProperty(v, Symbol('x'), { enumerable: true, value: 1 })
  if (kind === 'sparse') v.receipts.length = 1
  const candidate = kind === 'extra' ? { ...v, nextPhase: 'dead' } : kind === 'missing' ? { ...v, warehouse: undefined } : v
  expect(() => readTerminalSnapshot(candidate, f.dependencies)).toThrow(); expect(calls).toBe(0)
})
it('T10 full reward fits exactly at cap; exceeding reserved capacity by one is refused', () => {
  const f = fixture(g1, config, { complete: true, balance: 2147483527 })
  expect(planResidenceTerminal(f.value, command(f.value, 'deliver'), f.authority).snapshot.balance).toBe(2147483647)
  expect(() => fixture(g1, config, { balance: 2147483528 })).toThrow()
})
it.each(['revision', 'cycle'])('T10 %s overflow is refused without creating a terminal', (field) => {
  const f = fixture(g1, config, { day: 7, node: 'b' }); const v = mutable(f.value)
  if (field === 'revision') v.character.revision = Number.MAX_SAFE_INTEGER
  else {
    v.character.cycle = Number.MAX_SAFE_INTEGER
    if (v.character.clock.kind === 'active') v.character.clock.startCycle = Number.MAX_SAFE_INTEGER - 6
  }
  expect(() => planResidenceTerminal(v, command(v, 'deadline'), f.authorize(v))).toThrow()
})
it('T06 duplicate ownership and mismatched ItemState are refused', () => {
  const f = fixture(g1, config, { complete: true }); const v = mutable(f.value)
  v.site!.ground[0].items.push(v.carried.backpack.items[0])
  expect(() => readTerminalSnapshot(v, f.dependencies)).toThrow()
  const bad = mutable(f.value); bad.itemStates.states[0].resource = { kind: 'charge', current: 100 }
  expect(() => readTerminalSnapshot(bad, f.dependencies)).toThrow()
})
it('T08 receipt, latest closure, history and amount mismatches cannot be restored as terminal values', () => {
  const f = fixture(g1, config, { complete: true })
  const s = planResidenceTerminal(f.value, command(f.value, 'deliver'), f.authority).snapshot
  const variants = [mutable(s), mutable(s), mutable(s), mutable(s), mutable(s)]
  variants[0].receipts[0].reward = 119
  variants[1].balance = 119
  variants[2].receipts[0].dispositionIds = []
  variants[3].archives = []
  if (variants[4].character.clock.kind === 'return-due') variants[4].character.clock.source.outcome = 'voluntary-failure'
  for (const v of variants) expect(() => readTerminalSnapshot(v, f.dependencies)).toThrow()
})
