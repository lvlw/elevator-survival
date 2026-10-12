import { describe, expect, it } from 'vitest'
import { SupplyResidenceSaveError } from './supply-types'
import { validateSupplyResidenceHistory } from './supply-history'
import { validateSharedSupplyHistory, type HistoryCheck } from './shared-supply-history'
import { states, mutable } from './supply-test-fixtures'
import { entered } from './combat-test-fixtures'
import type { SupplyDependencies, SupplyValue } from '../../core/residence-supply/types'

// The same corpus also runs outside the repo against the untouched baseline helper.
// Within this suite, compare the old wrapper and the neutral helper's explicit old-source contract.
function original(v: SupplyValue, d: SupplyDependencies) {
  const check: HistoryCheck = (ok, reason) => { if (!ok) throw new SupplyResidenceSaveError('INVALID_STATE', reason) }
  validateSharedSupplyHistory(v, d, check, () => check(false, 'Wrong closure source'))
}
function observe(read: () => void) { try { read(); return 'ACCEPTED' } catch (e) {
  if (!(e instanceof SupplyResidenceSaveError)) throw e
  return e.code
} }
describe('R10 neutral extraction preserves original v3 categories', () => {
  it.each([0, 1, 2, 3])('baseline actual old stable boundary %i has identical result', i => {
    const { f, rows } = states(), v = rows[i]
    expect(observe(() => original(v, f.dependencies))).toBe('ACCEPTED')
    expect(observe(() => validateSupplyResidenceHistory(v, f.dependencies))).toBe('ACCEPTED')
  })
  it.each(['source', 'amplitude', 'cycle', 'warehouse', 'clock'] as const)('baseline invalid %s keeps same error category', fault => {
    const { f, rows } = states(), v = mutable(rows[fault === 'warehouse' ? 2 : 3])
    if (fault === 'source') Object.assign(v.receipts[0], { source: 'combat-death' })
    if (fault === 'amplitude') { const [p, b] = v.receipts[0].steps; p.healthBefore = p.healthAfter = b.healthBefore = 2; b.facts.damage = 2 }
    if (fault === 'cycle') v.receipts[0].startCycle++
    if (fault === 'warehouse') v.warehouse.items = [{ instanceId: 'bad', definitionId: 'quest_sealed_pathogen_case', quantity: 1 }]
    if (fault === 'clock') v.character.cycle++
    expect(observe(() => original(v, f.dependencies))).toBe('INVALID_STATE')
    expect(observe(() => validateSupplyResidenceHistory(v, f.dependencies))).toBe('INVALID_STATE')
  })
  it('combat source requires an explicit callback; old wrapper cannot be opted into it', () => {
    const h = entered('orderly', { hp: 1 }), dead = h.action(h.value, { kind: 'defend' }).snapshot
    const check: HistoryCheck = (ok, message) => { if (!ok) throw new SupplyResidenceSaveError('INVALID_STATE', message) }
    expect(() => validateSharedSupplyHistory(dead, h.deps.supply, check, () => check(false, 'Wrong closure source')))
      .toThrowError(expect.objectContaining({ code: 'INVALID_STATE' }))
    // Type-only check: new protocol is not an old SupplyValue. Never alter its protocol to make it pass.
    if (false) {
      // @ts-expect-error v3's signature retains the old protocol/four-source contract
      validateSupplyResidenceHistory(dead, h.deps.supply as SupplyDependencies)
      const old: SupplyValue = states().rows[0]; validateSupplyResidenceHistory(old, h.deps.supply)
    }
  })
})
