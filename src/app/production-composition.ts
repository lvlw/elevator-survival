import {
  createBrowserRunSaveStorage,
  hospitalRunSaveRulesRegistry,
  type BrowserStringStorage,
  type RunSaveStorage,
} from '../state/run-save'
import { hospitalV01UiLabels } from '../ui/hospital-v0.1'
import type { StableRunUiPresentationDependencies } from '../ui/presentation'

export const productionPresentationDependencies: StableRunUiPresentationDependencies =
  Object.freeze({
    rulesRegistry: hospitalRunSaveRulesRegistry,
    labels: hospitalV01UiLabels,
  })

/**
 * Creates the sole production browser adapter. Access to localStorage remains
 * lazy so access failures are classified by the formal read/write/clear boundary.
 */
export function createProductionBrowserRunSaveStorage(): RunSaveStorage {
  const browserStorage: BrowserStringStorage = Object.freeze({
    getItem: (key: string) => window.localStorage.getItem(key),
    setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
    removeItem: (key: string) => window.localStorage.removeItem(key),
  })
  return createBrowserRunSaveStorage(browserStorage)
}
