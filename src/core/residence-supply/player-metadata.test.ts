import { describe, expect, it } from 'vitest'
import { fixture, maintenanceReady } from '../../state/residence-session/combat-test-fixtures'
import { queryPlayerActionMetadata } from './player-metadata'
import { qualifyPlayerCommand } from './player-query'
import { planCombatMaintenance } from '../residence-combat/controlled'
import type { PlayerCoreCommand } from '../residence-combat/player-query-types'

describe('F02 same-source public mechanisms and resource metadata', () => {
  it('real repair after retreat uses one shared pool and native material/resource operations', () => {
    const { h, v } = maintenanceReady(), s = h.deps.supply
    const metal = v.carried.backpack.items.find(i => i.definitionId === s.tasks.data.items.find(d => d.alias === 'metal')!.id)!
    const pipe = v.carried.equipment.weapon!, crow = v.carried.equipment.utility!
    const command: PlayerCoreCommand = { kind: 'maintenance', command: { kind: 'mechanical', expectedRevision: v.character.revision,
      inputs: [{ instanceId: metal.instanceId, quantity: 1 }], allocations: [{ instanceId: pipe.instanceId, amount: 7 }, { instanceId: crow.instanceId, amount: 8 }] } }
    expect(qualifyPlayerCommand(v, command, h.deps).kind).toBe('available')
    const metadata = queryPlayerActionMetadata(v, command, h.deps)
    expect(metadata.maintenance!.totalPool).toBe(15); expect(metadata.maintenance!.allocations).toHaveLength(2)
    expect(metadata.materials).toEqual([{ name: '金属零件', quantity: 1 }])
    const after = planCombatMaintenance(v, command.command, h.authorize(v)).plan.snapshot
    for (const [n, item] of [pipe, crow].entries()) {
      const state = after.itemStates.states.find(x => x.instanceId === item.instanceId)!
      expect(state.resource.kind === 'none' ? 0 : state.resource.current).toBe(metadata.maintenance!.allocations[n].after)
    }
    expect(JSON.stringify(metadata)).not.toMatch(/instanceId|originId|runId|seed|riskPercent/)
  })
  it('last public tool resource payment reuses the real truncated consumption', () => {
    const h = fixture(), v = h.move(h.value, 'H1').snapshot
    const command: PlayerCoreCommand = { kind: 'task', command: { kind: 'task', actionId: 'fire-door', method: 'crow',
      toolInstanceId: v.carried.equipment.utility!.instanceId, expectedRevision: v.character.revision } }
    const q = qualifyPlayerCommand(v, command, h.deps), m = queryPlayerActionMetadata(v, command, h.deps)
    expect(q.cost).toBe(6); expect(m.resources[0]).toMatchObject({ requested: 1, consumed: 1, before: 12, after: 11 })
    expect(m.output).toBeNull()
  })
  it('full HP with a real bleeding target reports actual recovery zero, not a fabricated heal', () => {
    const h = fixture({ bleeding: true }), v = h.value
    const c: PlayerCoreCommand = { kind: 'medical', command: { kind: 'medical', instanceId: v.carried.quickSlots.slots[0]!.instanceId,
      expectedRevision: v.character.revision } }
    expect(qualifyPlayerCommand(v, c, h.deps).kind).toBe('available')
    expect(queryPlayerActionMetadata(v, c, h.deps).clinical).toMatchObject({ healthRecovery: 0, consumes: 1 })
  })
})
