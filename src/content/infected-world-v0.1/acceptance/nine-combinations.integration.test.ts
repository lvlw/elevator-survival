import { test, expect } from 'vitest'
import { executeRoute } from './e03-test-routes'
import { emitReport } from './e03-test-report'
import { tools, specialties, defaultSeeds } from './e03-test-seeds'
import { numberValue } from '../../../core/residence-supply/config'
import { NATIVE_ROUTE_BUDGET_MS } from './e03-test-budget'
for (const tool of tools) for (const specialty of specialties) for (const seed of defaultSeeds) {
  test(`E03 default corpus ${tool} ${specialty} ${seed}`, async () => {
    const { h, result } = executeRoute(seed, tool, specialty)
    await emitReport(`default-${tool}-${specialty}-${seed}`, { result, ledger: h.ledger })
    // Mechanical contract declared before sampling. Outcome is separately reported, not a win assertion.
    expect(result.steps).toBeGreaterThan(10)
    expect(result.writes).toBe(result.dispatches + 1)
    expect(result.notifications).toBe(result.writes)
    expect(h.materials.execution.seed).toBe(seed)
    // Frozen after recorded exploration, before the two acceptance reruns; no actual-derived assertion.
    expect(result.outcome).toBe(seed === 'E03-A-seed-05' ? 'death' : 'success')
    const match = h.ledger.find(l => l.family === 'task' && JSON.stringify(l.command).includes('"match"'))!
    expect(match.before!.body.energy - match.after.body.energy).toBe(numberValue(h.deps.supply.configuration,
      specialty === 'scout' ? 'verify.scout.fast' : 'verify.fast'))
    const fix = h.ledger.find(l => l.family === 'task' && JSON.stringify(l.command).includes('"fix"'))!
    expect(fix.before!.body.energy - fix.after.body.energy).toBe(numberValue(h.deps.supply.configuration,
      specialty === 'engineer' ? 'fix.method' : 'door.manual'))
    expect(h.current().choices.firstBandageUsed).toBe(true)
  }, NATIVE_ROUTE_BUDGET_MS)
}
