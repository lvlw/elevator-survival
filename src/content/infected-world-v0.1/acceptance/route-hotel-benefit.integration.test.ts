import { test, expect } from 'vitest'
import { executeRoute } from './e03-test-routes'
import { emitReport } from './e03-test-report'
import { NATIVE_ROUTE_BUDGET_MS } from './e03-test-budget'
for (const seed of ['E03-A-seed-01', 'E03-A-seed-04']) test(`E03 route-hotel-benefit: natural disinfect qualification ${seed}`, async () => {
  const { h, result } = executeRoute(seed, 'lamp', 'survival', 'route-hotel-benefit')
  await emitReport('witness-hotel-' + seed, { result, ledger: h.ledger })
  expect(result.outcome).toBe(seed === 'E03-A-seed-04' ? 'success' : 'route-stopped')
  expect(h.ledger.some(l => JSON.stringify(l.command).includes('T1-exchange'))).toBe(seed === 'E03-A-seed-04')
}, NATIVE_ROUTE_BUDGET_MS)
