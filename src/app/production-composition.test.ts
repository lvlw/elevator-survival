import { afterEach, describe, expect, it, vi } from 'vitest'
import { bootstrapProductionRun } from './production-bootstrap'
import {
  createProductionBrowserRunSaveStorage,
  createProductionHospitalNewRunDependencies,
  productionPresentationDependencies,
} from './production-composition'

afterEach(() => vi.restoreAllMocks())

describe('production browser composition', () => {
  it('keeps localStorage access lazy until the formal storage operation', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    const storage = createProductionBrowserRunSaveStorage()
    expect(getItem).not.toHaveBeenCalled()
    const result = bootstrapProductionRun({
      storage,
      rulesRegistry: productionPresentationDependencies.rulesRegistry,
    })
    expect(result).toEqual({ kind: 'no-run' })
    expect(getItem).toHaveBeenCalledTimes(1)
  })

  it('routes blocked localStorage access through the formal read error', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => { throw new Error('browser-private-storage-error') })
    const storage = createProductionBrowserRunSaveStorage()
    expect(bootstrapProductionRun({
      storage,
      rulesRegistry: productionPresentationDependencies.rulesRegistry,
    })).toEqual({
      kind: 'load-error',
      category: 'storage-read-failed',
      canClear: false,
    })
    expect(getItem).toHaveBeenCalledTimes(1)
  })

  it('creates New Run dependencies without entropy and shares storage and registry', () => {
    const getRandomValues = vi.spyOn(globalThis.crypto, 'getRandomValues')
    const storage = createProductionBrowserRunSaveStorage()
    const dependencies = createProductionHospitalNewRunDependencies(storage)
    expect(dependencies.storage).toBe(storage)
    expect(dependencies.rulesRegistry).toBe(productionPresentationDependencies.rulesRegistry)
    expect(getRandomValues).not.toHaveBeenCalled()
  })
})
