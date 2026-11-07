import { expect, it } from 'vitest'
import { createCombatSessionCommand } from './combat-commands'
import { createSupplySessionCommand } from './supply-commands'
import { createInfectedSupplyDependencies } from '../../content/infected-world-v0.1/initial'

const catalog = createInfectedSupplyDependencies('dec017-schema').tasks
for (const construct of [createCombatSessionCommand, createSupplySessionCommand]) {
  it(construct.name + ' keeps pickup input strict, raw numeric and bounded', () => {
    const base = { kind: 'pickup', expectedRevision: 1, instanceId: 'TEST-real-selection' }
    for (const fields of [{}, { quantity: 1 }, { quantity: 2, placement: { x: 1, y: 0, rotated: false } }]) {
      expect(construct({ kind: 'inventory', command: { ...base, ...fields } }, catalog))
        .toEqual({ kind: 'inventory', command: { ...base, ...fields } })
    }
    for (const quantity of [-1, 0, 0.5, true, false, '1', '', null, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => construct({ kind: 'inventory', command: { ...base, quantity } }, catalog)).toThrow()
    }
    for (const fields of [{ extra: 1 }, { placement: { x: 0, y: 0, rotated: false, extra: 1 } }, { placement: { x: -1, y: 0, rotated: false } }]) {
      expect(() => construct({ kind: 'inventory', command: { ...base, ...fields } }, catalog)).toThrow()
    }
    for (const kind of ['move', 'split', 'to-backpack']) {
      expect(() => construct({ kind: 'inventory', command: { ...base, kind } }, catalog)).toThrow()
    }
    expect(() => construct({ kind: 'inventory', command: { ...base, kind: 'drop', quantity: 1 } }, catalog)).toThrow()
    expect(() => construct({ kind: 'task-transfer', command: { ...base, kind: 'task-pickup' } }, catalog)).toThrow()
    expect(() => construct({ kind: 'task-transfer', command: { ...base, kind: 'task-pickup', quantity: 1,
      placement: { x: 0, y: 0, rotated: false } } }, catalog)).toThrow()
  })
}
