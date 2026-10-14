import { test, expect } from 'vitest'
import { executeRoute } from './e03-test-routes'
import { emitReport } from './e03-test-report'
import { NATIVE_ROUTE_BUDGET_MS } from './e03-test-budget'
test('E03 route-toolbox: professional electronic spent, real C4 replacement installed', async () => {
  const { h, result } = executeRoute('E03-A-seed-01', 'toolbox', 'engineer', 'route-toolbox')
  await emitReport('witness-toolbox', { result, ledger: h.ledger })
  expect(result.outcome).toBe('success')
  const v = h.current(), original = v.origins.find(o => o.producerId === 'H1-toolbox')!
  expect(v.dispositions.some(d => d.reason === 'recipe' && d.kind === 'consumed' && d.ranges.some(r => r.originId === original.id))).toBe(true)
  expect(v.dispositions.some(d => d.kind === 'installed' && d.ranges.some(r => r.originId === original.id))).toBe(false)
}, NATIVE_ROUTE_BUDGET_MS)
