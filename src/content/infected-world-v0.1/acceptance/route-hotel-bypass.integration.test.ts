import { test, expect } from 'vitest'
import { executeRoute } from './e03-test-routes'
import { emitReport } from './e03-test-report'
import { NATIVE_ROUTE_BUDGET_MS } from './e03-test-budget'
test('E03 route-hotel-bypass: real success, C4 bypass leaves C2 alive, no hotel', async () => {
  const { h, result } = executeRoute('E03-A-seed-01', 'crow', 'engineer')
  await emitReport('witness-hotel-bypass', { result, ledger: h.ledger })
  expect(result.outcome).toBe('success')
  expect(result.final.enemies!.find(e => e.id === 'technician')!.state.currentHealth).toBe(16)
  expect(h.ledger.some(l => l.after.node?.startsWith('T'))).toBe(false)
}, NATIVE_ROUTE_BUDGET_MS)
