import { describe, expect, it } from 'vitest'
import {
  MedicalContentError,
  validateMedicalContentBindings,
} from '../../core/medical'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemResourceCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalSceneMedicalContentBindings,
} from './items'

const formalDependencies = {
  physicalCatalog: hospitalItemCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
}

describe('hospital medical content lifecycle bindings', () => {
  it('keeps all four formal medical bindings valid against the lifecycle catalog', () => {
    expect(() => validateMedicalContentBindings(
      hospitalSceneMedicalContentBindings,
      formalDependencies,
    )).not.toThrow()
  })

  it('rejects a real quest item forged into an otherwise structurally valid binding', () => {
    expect(() => validateMedicalContentBindings({
      ...hospitalSceneMedicalContentBindings,
      bandageDefinitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase,
    }, formalDependencies)).toThrow(MedicalContentError)
  })

  it('rejects a missing lifecycle catalog and a catalog missing a bound definition', () => {
    expect(() => validateMedicalContentBindings(
      hospitalSceneMedicalContentBindings,
      { ...formalDependencies, lifecycleCatalog: undefined as never },
    )).toThrow(MedicalContentError)
    expect(() => validateMedicalContentBindings(
      hospitalSceneMedicalContentBindings,
      {
        ...formalDependencies,
        lifecycleCatalog: {
          get: () => {
            throw new Error('missing lifecycle definition')
          },
        } as never,
      },
    )).toThrow(MedicalContentError)
  })
})
