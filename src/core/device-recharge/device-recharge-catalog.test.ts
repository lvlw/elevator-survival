import { describe, expect, it } from 'vitest'
import { createDeviceRechargeCatalog, DeviceRechargeCatalogError } from './device-recharge-catalog'

describe('device recharge catalog', () => {
  it('normalizes a neutral supply-to-device binding and exposes deterministic lookups', () => {
    const catalog = createDeviceRechargeCatalog([
      { supplyDefinitionId: 'battery', targetDefinitionId: 'flashlight', targetResourceKind: 'charge' },
    ])
    expect(catalog.get('battery', 'flashlight')).toEqual({ supplyDefinitionId: 'battery', targetDefinitionId: 'flashlight', targetResourceKind: 'charge' })
    expect(catalog.getBindingsForTarget('flashlight')).toHaveLength(1)
    expect(Object.isFrozen(catalog)).toBe(true)
  })

  it('strictly rejects malformed compatibility bindings', () => {
    for (const input of [
      [],
      [{ supplyDefinitionId: 'battery', targetDefinitionId: 'flashlight', targetResourceKind: 'none' }],
      [{ supplyDefinitionId: 'battery', targetDefinitionId: 'flashlight', targetResourceKind: 'charge', extra: true }],
      [
        { supplyDefinitionId: 'battery', targetDefinitionId: 'flashlight', targetResourceKind: 'charge' },
        { supplyDefinitionId: 'battery', targetDefinitionId: 'flashlight', targetResourceKind: 'charge' },
      ],
    ]) {
      expect(() => createDeviceRechargeCatalog(input)).toThrow(DeviceRechargeCatalogError)
    }
  })
})
