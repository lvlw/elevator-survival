import type { SupplyDependencies, SupplyValue } from '../../core/residence-supply/types'
import { validateSharedSupplyHistory, type HistoryCheck } from './shared-supply-history'
import { SupplyResidenceSaveError } from './supply-types'

const check: HistoryCheck = (ok, reason) => {
  if (!ok) throw new SupplyResidenceSaveError('INVALID_STATE', reason)
}
/** Original v3 boundary: the four old sources only, never combat authorization. */
export function validateSupplyResidenceHistory(v: SupplyValue, deps: SupplyDependencies): void {
  validateSharedSupplyHistory(v, deps, check, () => check(false, 'Wrong closure source'))
}
