// Mainline native template was first copied and run byte-exact; raw attempt is retained.
// Minimal native adaptation: observe the TEST send return; seed05 dies in walk's
// lexical move, so neither a fight spy nor an exported move spy reaches that return.
// R1 explicitly permits this 30s case budget for full native routes only.
// No P/R/S mock, state replacement, death fixture or RNG override. The injected error
// is raised AFTER the real TEST send has returned from the real S death, or after a real move.
import { afterEach, expect, test, vi } from 'vitest'
import * as policy from './e03-test-policy'
import * as nativeHarness from './e03-test-harness'
import { executeRoute } from './e03-test-routes'

afterEach(() => vi.restoreAllMocks())
const LONG_ROUTE_MS = 30_000
const NO_THROW = Symbol('route returned without surfacing the injected error')
function observed(run: () => unknown): unknown {
  try { run(); return NO_THROW } catch (error) { return error }
}
function assertionMarker(): unknown {
  try { expect('injected-observation').toBe('expected-observation') }
  catch (error) { return error }
  throw new Error('TEST failed to create a real assertion error')
}

test('R1 C01 unmodified default seed05 is still a real committed death, not a harness failure', () => {
  const { h, result } = executeRoute('E03-A-seed-05', 'crow', 'engineer')
  expect(result.outcome).toBe('death')
  expect(result.failure).toBeNull()
  expect(h.current().phase).toBe('dead')
  expect(h.current().receipts.at(-1)?.outcome).toBe('death')
  expect(result.writes).toBe(result.dispatches + 1)
  expect(result.notifications).toBe(result.writes)
}, LONG_ROUTE_MS)

test('R1 C02 real missing hotel condition remains a documented route stop, not death', () => {
  const { h, result } = executeRoute('E03-A-seed-01', 'lamp', 'survival', 'route-hotel-benefit')
  expect(result.outcome).toBe('route-stopped')
  expect(result.failure).toContain('HOTEL_CONDITION_MISSING')
  expect(h.current().phase).toBe('active-world')
  expect(h.current().receipts).toHaveLength(0)
}, LONG_ROUTE_MS)

test('R1 C03 the original real successful route remains successful without injected exceptions', () => {
  const { h, result } = executeRoute('E03-A-seed-01', 'crow', 'engineer')
  expect(result.outcome).toBe('success')
  expect(h.current().balance).toBe(120)
}, LONG_ROUTE_MS)

for (const kind of ['plain-error', 'assertion-error', 'coded-error', 'type-error', 'range-error'] as const) {
  test(`R1 after actual committed death ${kind} must propagate unchanged`, () => {
    const marker = kind === 'assertion-error' ? assertionMarker() : kind === 'type-error' ? new TypeError('R1 injected type error') :
      kind === 'range-error' ? new RangeError('R1 injected range error') : kind === 'coded-error'
        ? Object.assign(new Error('R1 injected infrastructure error'), { code: 'EACCES' }) : new Error('R1 injected helper bug')
    const realFactory = nativeHarness.makeHarness
    let injections = 0
    let captured: ReturnType<typeof nativeHarness.makeHarness> | null = null
    let committed: ReturnType<ReturnType<typeof nativeHarness.makeHarness>['current']> | null = null
    let saved: string | null = null, writes = 0, notifications = 0
    vi.spyOn(nativeHarness, 'makeHarness').mockImplementation((...args) => {
      const h = realFactory(...args), realSend = h.send
      vi.spyOn(h, 'send').mockImplementation((...fields) => {
        const result = realSend(...fields)
        if (h.current().phase === 'dead') {
          captured = h; committed = h.current(); saved = h.disk()
          writes = h.storage.write.mock.calls.length; notifications = h.notify.mock.calls.length
          expect(committed.receipts.at(-1)?.outcome).toBe('death')
          expect(committed.character.body.condition.currentHealth).toBe(0)
          injections++; throw marker
        }
        return result
      })
      return h
    })
    const caught = observed(() => executeRoute('E03-A-seed-05', 'crow', 'engineer'))
    expect(injections, 'the real frozen seed must reach the actual committed death; no fake fixture').toBe(1)
    expect(caught, 'death is not permission to swallow the following test/implementation error').toBe(marker)
    expect(captured!.current()).toBe(committed)
    expect(captured!.disk()).toBe(saved)
    expect(captured!.storage.write).toHaveBeenCalledTimes(writes)
    expect(captured!.notify).toHaveBeenCalledTimes(notifications)
  }, LONG_ROUTE_MS)
}

test('R1 arbitrary code property on an implementation error is not a known route stop', () => {
  const marker = Object.assign(new Error('R1 external evidence infrastructure failed'), { code: 'EACCES' })
  const realMove = policy.move
  let injections = 0
  vi.spyOn(policy, 'move').mockImplementationOnce((...args) => {
    realMove(...args)
    expect(args[0].current().phase).toBe('active-world')
    injections++
    throw marker
  })
  const caught = observed(() => executeRoute('E03-A-seed-01', 'crow', 'engineer'))
  expect(injections).toBe(1)
  expect(caught).toBe(marker)
}, LONG_ROUTE_MS)

for (const kind of ['plain-error', 'assertion-error', 'known-code-error'] as const) {
  test(`R1 after a real living move ${kind} must propagate without changing the committed value`, () => {
    const marker = kind === 'assertion-error' ? assertionMarker() : kind === 'known-code-error'
      ? Object.assign(new Error('R1 implementation error borrowing a real business code'), { code: 'NOT_AVAILABLE' })
      : new Error('R1 unexpected program failure after living move')
    const realMove = policy.move
    let captured: Parameters<typeof realMove>[0] | null = null
    let committed: ReturnType<Parameters<typeof realMove>[0]['current']> | null = null
    let saved: string | null = null, writes = 0, notifications = 0, injections = 0
    vi.spyOn(policy, 'move').mockImplementationOnce((...args) => {
      realMove(...args)
      captured = args[0]; committed = captured.current(); saved = captured.disk()
      expect(committed.phase).toBe('active-world')
      expect(committed.receipts).toHaveLength(0)
      writes = captured.storage.write.mock.calls.length; notifications = captured.notify.mock.calls.length
      injections++; throw marker
    })
    const caught = observed(() => executeRoute('E03-A-seed-01', 'crow', 'engineer'))
    expect(injections).toBe(1); expect(caught).toBe(marker)
    expect(captured!.current()).toBe(committed); expect(captured!.disk()).toBe(saved)
    expect(captured!.storage.write).toHaveBeenCalledTimes(writes)
    expect(captured!.notify).toHaveBeenCalledTimes(notifications)
  }, LONG_ROUTE_MS)
}
