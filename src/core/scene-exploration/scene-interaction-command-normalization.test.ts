import { describe, expect, it } from 'vitest'
import {
  createPerformSceneObstacleOptionCommand,
  createPerformSceneTaskEventCommand,
  createUseSceneBatteryCommand,
  createUseSceneMedicalItemCommand,
} from '.'

describe('strict Scene interaction command constructors', () => {
  it('normalizes and freezes obstacle commands while rejecting non-exact inputs', () => {
    const command = createPerformSceneObstacleOptionCommand({ obstacleId: 'door', optionId: 'decline' })
    expect(command).toEqual({ obstacleId: 'door', optionId: 'decline' })
    expect(Object.isFrozen(command)).toBe(true)
    for (const input of [null, [], {}, { obstacleId: '', optionId: 'decline' }, { obstacleId: 'door' }, { obstacleId: 'door', optionId: 'decline', risk: 1 }]) {
      expect(() => createPerformSceneObstacleOptionCommand(input)).toThrow()
    }
  })

  it('normalizes both task-event command shapes and exact placement', () => {
    expect(createPerformSceneTaskEventCommand({ eventId: 'event', optionId: 'decline' })).toEqual({ eventId: 'event', optionId: 'decline' })
    const command = createPerformSceneTaskEventCommand({ eventId: 'event', optionId: 'extract', placement: { x: 1, y: 2, rotated: false } })
    expect(command).toEqual({ eventId: 'event', optionId: 'extract', placement: { x: 1, y: 2, rotated: false } })
    expect(Object.isFrozen(command)).toBe(true)
    expect(Object.isFrozen('placement' in command ? command.placement : null)).toBe(true)
    for (const input of [null, [], { eventId: 'event' }, { eventId: 'event', optionId: 'extract', placement: { x: -1, y: 0, rotated: false } }, { eventId: 'event', optionId: 'extract', placement: { x: 0.5, y: 0, rotated: false } }, { eventId: 'event', optionId: 'extract', placement: { x: 0, y: 0, rotated: false, extra: true } }]) {
      expect(() => createPerformSceneTaskEventCommand(input)).toThrow()
    }
  })

  it('normalizes medical sources and optional typed targets from unknown input', () => {
    const command = createUseSceneMedicalItemCommand({ source: { container: 'backpack', itemInstanceId: 'bandage' }, target: { kind: 'open-wound', woundId: 'wound' } })
    expect(command).toEqual({ source: { container: 'backpack', itemInstanceId: 'bandage' }, target: { kind: 'open-wound', woundId: 'wound' } })
    expect(Object.isFrozen(command)).toBe(true)
    for (const input of [null, [], { source: { container: 'backpack', itemInstanceId: 'bandage' }, extra: true }, { source: { container: 'backpack' } }, { source: { container: 'quick-slot', quickSlotIndex: -1 } }]) {
      expect(() => createUseSceneMedicalItemCommand(input)).toThrow()
    }
  })

  it('normalizes battery commands from unknown input and rejects caller results', () => {
    const command = createUseSceneBatteryCommand({ batteryInstanceId: 'battery', targetInstanceId: 'flashlight' })
    expect(command).toEqual({ batteryInstanceId: 'battery', targetInstanceId: 'flashlight' })
    expect(Object.isFrozen(command)).toBe(true)
    for (const input of [null, [], { batteryInstanceId: 'battery' }, { batteryInstanceId: '', targetInstanceId: 'flashlight' }, { batteryInstanceId: 'battery', targetInstanceId: 'flashlight', effect: {} }]) {
      expect(() => createUseSceneBatteryCommand(input)).toThrow()
    }
  })
})
