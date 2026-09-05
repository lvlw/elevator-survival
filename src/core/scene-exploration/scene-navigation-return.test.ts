import { describe, expect, it } from 'vitest'
import type { FrozenRuleConfig } from '../config'
import { createPlayerCondition } from '../condition'
import { createEmptyEquipment, createEquipmentProfileCatalog } from '../equipment'
import { createBackpackSnapshot, createItemCatalog } from '../inventory'
import { createItemResourceCatalog } from '../item-state'
import { createEmptyQuickSlots, createQuickSlotProfileCatalog } from '../quick-slot'
import { createSceneGraph } from '../scene-graph'
import { createSceneSurfaceObservationCatalog } from '../scene-navigation'
import { createTestNavigationKnowledgeAlongPath } from '../../test-support/scene-navigation'
import { createSceneExplorationSnapshot } from './scene-exploration-snapshot'
import { findPlayerKnownReturnRoute } from './scene-navigation-return'

const graph = createSceneGraph({
  nodes: [
    { id: 'safe', name: '安全点', isReturnSafetyNode: true },
    { id: 'middle', name: '中点', isReturnSafetyNode: false },
    { id: 'current', name: '当前点', isReturnSafetyNode: false },
  ],
  edges: [
    { id: 'safe-middle', from: 'safe', to: 'middle', baseTravelTime: 10, bidirectional: true },
    { id: 'middle-current', from: 'middle', to: 'current', baseTravelTime: 10, bidirectional: true },
    { id: 'hidden-shortcut', from: 'current', to: 'safe', baseTravelTime: 1, bidirectional: true },
  ],
})
const navigationCatalog = createSceneSurfaceObservationCatalog([
  { nodeId: 'safe', surfaceVisibleEdgeIds: ['safe-middle'] },
  { nodeId: 'middle', surfaceVisibleEdgeIds: ['middle-current'] },
  { nodeId: 'current', surfaceVisibleEdgeIds: [] },
], graph)
const physicalCatalog = createItemCatalog([])
const equipmentCatalog = createEquipmentProfileCatalog([], [])
const quickSlotCatalog = createQuickSlotProfileCatalog([], [])
const itemResourceCatalog = createItemResourceCatalog([], [])
const config = {
  combat: { player: { maxHealth: 12 } },
  backpack: {
    width: 1,
    height: 1,
    quickSlotCount: 2,
    weightBands: {
      normal: { min: 0, max: 16, timeIncreasePercent: 0 },
      loaded: { min: 17, max: 24, timeIncreasePercent: 10 },
      overloaded: { min: 25, max: 28, timeIncreasePercent: 25 },
      cannotCarryFrom: 29,
    },
  },
  scene: {
    totalTime: 100,
    travelTimeModifiers: { minorContusionTimeIncreasePercent: 10 },
  },
  medical: { disinfectant: { maxUsesPerDay: 1 } },
} as unknown as FrozenRuleConfig
const dependencies = {
  graph,
  navigationCatalog,
  physicalCatalog,
  equipmentCatalog,
  quickSlotCatalog,
  itemResourceCatalog,
  config,
}

function scene(knowShortcut: boolean) {
  const baseKnowledge = createTestNavigationKnowledgeAlongPath(
    ['safe', 'middle', 'current'],
    graph,
    navigationCatalog,
  )
  return createSceneExplorationSnapshot({
    sceneInstanceId: 'known-return-route-test',
    status: 'active',
    searchState: {
      sceneInstanceId: 'known-return-route-test',
      nodeStates: graph.nodes.map(({ id }) => ({ kind: 'not-available' as const, nodeId: id })),
    },
    sceneItems: { nodeStates: graph.nodes.map(({ id }) => ({ nodeId: id, items: [] })) },
    alertState: 'unalerted',
    combatState: { encounters: [], usage: { metalPipeChargedStrikeUses: 0 } },
    currentNodeId: 'current',
    navigationKnowledge: knowShortcut
      ? { ...baseKnowledge, knownEdgeIds: [...baseKnowledge.knownEdgeIds, 'hidden-shortcut'] }
      : baseKnowledge,
    remainingTime: 100,
    enabledEdgeIds: graph.edges.map(({ id }) => id),
    backpack: createBackpackSnapshot({ width: 1, height: 1, items: [], placements: [] }, physicalCatalog),
    equipment: createEmptyEquipment(physicalCatalog, equipmentCatalog),
    quickSlots: createEmptyQuickSlots(2, physicalCatalog, quickSlotCatalog),
    itemStates: { states: [] },
    condition: createPlayerCondition({
      currentHealth: 12,
      bleeding: false,
      openWounds: [],
      minorContusions: 0,
      painkillerActive: false,
      pendingInfectionExposures: 0,
    }, config.combat.player),
    dailyMedicalUsage: { disinfectantUsesToday: 0 },
    runIntelLog: { intelIds: [] },
    taskEvents: { entries: [] },
  }, dependencies)
}

describe('player-known return route adapter', () => {
  it('ignores a physically enabled unknown shortcut and uses it once known', () => {
    expect(findPlayerKnownReturnRoute(scene(false), dependencies)).toMatchObject({
      edgeIds: ['middle-current', 'safe-middle'],
      estimatedReturnTime: 20,
    })
    expect(findPlayerKnownReturnRoute(scene(true), dependencies)).toMatchObject({
      edgeIds: ['hidden-shortcut'],
      estimatedReturnTime: 1,
    })
  })
})
