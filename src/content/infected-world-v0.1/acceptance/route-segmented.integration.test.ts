import { test, expect } from 'vitest'
import { executeRoute } from './e03-test-routes'
import { emitReport } from './e03-test-report'
test('E03 route-segmented: real damage retreat immediate repair rest and same-enemy success', async () => {
  const { h, result } = executeRoute('E03-A-seed-01', 'crow', 'survival', 'route-segmented')
  await emitReport('witness-segmented', { result, ledger: h.ledger })
  expect(result.outcome).toBe('success')
  const escape = h.current().battles.find(b => b.outcome === 'escaped')!
  expect(escape.decision.enemyHealthAfter).toBe(8)
  const reentry = h.current().battles.find(b => b.entry.enemyId === 'orderly' && b.entry.previouslyEncountered)!
  expect(reentry.entry.enemyHealth).toBe(8)
  expect(reentry.entry.actionCount).toBe(escape.decision.actionCountAfter)
  expect(reentry.entry.riskIndex).toBe(escape.decision.riskAfter)
})
