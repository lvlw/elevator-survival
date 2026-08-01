import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_INTEL_IDS,
  hospitalItemQuickSlotCatalog,
  hospitalItemQuickSlotProfiles,
  hospitalItemSearchIlluminationCatalog,
  hospitalItemSearchIlluminationProfiles,
  hospitalMainSearchCatalog,
  hospitalMainSearchDefinitions,
} from '.'
import {
  hospitalItemQuickSlotCatalog as itemQuickSlotCatalog,
  hospitalItemQuickSlotProfiles as itemQuickSlotProfiles,
  hospitalItemSearchIlluminationCatalog as itemSearchIlluminationCatalog,
  hospitalItemSearchIlluminationProfiles as itemSearchIlluminationProfiles,
} from './hospital-v0.1/items'
import {
  HOSPITAL_INTEL_IDS as intelIds,
  hospitalMainSearchCatalog as mainSearchCatalog,
  hospitalMainSearchDefinitions as mainSearchDefinitions,
} from './hospital-v0.1/search'

describe('versioned hospital public content entry', () => {
  it('re-exports the existing quick-slot, illumination, and main-search capabilities', () => {
    expect(hospitalItemQuickSlotCatalog).toBe(itemQuickSlotCatalog)
    expect(hospitalItemQuickSlotProfiles).toBe(itemQuickSlotProfiles)
    expect(hospitalItemSearchIlluminationCatalog).toBe(
      itemSearchIlluminationCatalog,
    )
    expect(hospitalItemSearchIlluminationProfiles).toBe(
      itemSearchIlluminationProfiles,
    )
    expect(hospitalMainSearchCatalog).toBe(mainSearchCatalog)
    expect(hospitalMainSearchDefinitions).toBe(mainSearchDefinitions)
    expect(HOSPITAL_INTEL_IDS).toBe(intelIds)
  })
})
