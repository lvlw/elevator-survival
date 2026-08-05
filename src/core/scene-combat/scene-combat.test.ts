import { describe, expect, it } from 'vitest'
import {
  HOSPITAL_COMBAT_ENCOUNTER_IDS,
  HOSPITAL_NODE_IDS,
  createHospitalSceneCombatDependencies,
  hospitalEnemyCatalog,
  hospitalSliceV01SceneGraph,
} from '../../content'
import { createSceneCombatEncounterCatalog } from './scene-combat-catalog'
import {
  createInitialSceneCombatState,
  createSceneCombatStateSnapshot,
  createStableSceneEnemyInstanceId,
} from './scene-combat-state'

describe('scene combat encounter catalog and state', () => {
  const sceneInstanceId = 'scene-combat-core-test'
  const dependencies = createHospitalSceneCombatDependencies('seed', sceneInstanceId)

  it('creates a strict deeply frozen catalog without mutating input', () => {
    const input = [{
      id: 'generic-encounter',
      eventId: 'generic-event',
      nodeId: HOSPITAL_NODE_IDS.isolationCorridor,
      enemyDefinitionId: 'enemy_infected_orderly',
      triggerKind: 'enter-node-while-enemy-present' as const,
    }]
    const copy = structuredClone(input)
    const catalog = createSceneCombatEncounterCatalog(input, {
      graph: hospitalSliceV01SceneGraph,
      enemyCatalog: hospitalEnemyCatalog,
    })
    expect(input).toEqual(copy)
    expect(catalog.get('generic-encounter')).toEqual(input[0])
    expect(Object.isFrozen(catalog)).toBe(true)
    expect(Object.isFrozen(catalog.get('generic-encounter'))).toBe(true)
  })

  it('rejects duplicate IDs, duplicate automatic nodes, unknown nodes and unknown fields', () => {
    const base = {
      id: 'encounter-a', eventId: 'event-a',
      nodeId: HOSPITAL_NODE_IDS.isolationCorridor,
      enemyDefinitionId: 'enemy_infected_orderly',
      triggerKind: 'enter-node-while-enemy-present' as const,
    }
    const create = (values: readonly never[]) => createSceneCombatEncounterCatalog(values, {
      graph: hospitalSliceV01SceneGraph,
      enemyCatalog: hospitalEnemyCatalog,
    })
    expect(() => create([base, { ...base }] as never)).toThrow()
    expect(() => create([base, { ...base, id: 'encounter-b' }] as never)).toThrow()
    expect(() => create([{ ...base, nodeId: 'missing' }] as never)).toThrow()
    expect(() => create([{ ...base, extra: true }] as never)).toThrow()
  })

  it('creates one dormant state per definition with stable instance identity', () => {
    const state = createInitialSceneCombatState(sceneInstanceId, dependencies)
    expect(state.encounters).toHaveLength(1)
    expect(state.encounters[0]).toMatchObject({
      kind: 'dormant',
      encounterId: HOSPITAL_COMBAT_ENCOUNTER_IDS.infectedOrderly,
      enemy: { hasBeenEncountered: false, defeated: false, currentHealth: 14 },
    })
    expect(Object.isFrozen(state)).toBe(true)
    expect(Object.isFrozen(state.encounters)).toBe(true)
    const first = createStableSceneEnemyInstanceId(sceneInstanceId, 'encounter', 'enemy')
    expect(first).toBe(createStableSceneEnemyInstanceId(sceneInstanceId, 'encounter', 'enemy'))
    expect(first).not.toBe(createStableSceneEnemyInstanceId('another-scene', 'encounter', 'enemy'))
  })

  it('strictly restores full catalog coverage without mutating input', () => {
    const initial = createInitialSceneCombatState(sceneInstanceId, dependencies)
    const input = structuredClone(initial)
    const restored = createSceneCombatStateSnapshot(input, sceneInstanceId, dependencies)
    expect(restored).toEqual(initial)
    expect(input).toEqual(initial)
    expect(() => createSceneCombatStateSnapshot({
      ...initial,
      encounters: [],
    }, sceneInstanceId, dependencies)).toThrow()
    expect(() => createSceneCombatStateSnapshot({
      ...initial,
      encounters: [...initial.encounters, initial.encounters[0]],
    }, sceneInstanceId, dependencies)).toThrow()
  })
})
