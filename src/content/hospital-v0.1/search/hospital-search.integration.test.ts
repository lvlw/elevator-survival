import { describe, expect, it } from 'vitest'
import {
  createSceneSearchState,
  materializeMainSearchOutcome,
  revealPreparedMainSearchOutcome,
} from '../../../core/scene-search'
import { createRandomCursor, createStreamId, drawIntInclusive, RANDOM_ALGORITHM_VERSION } from '../../../core/random'
import {
  HOSPITAL_NODE_IDS,
  hospitalSliceV01SceneGraph,
} from '../hospital-scene-graph'
import {
  HOSPITAL_ITEM_IDS,
  hospitalItemCatalog,
  hospitalItemResourceCatalog,
} from '../items'
import { hospitalMainSearchCatalog } from './hospital-search-catalog'
import { hospitalMainSearchDefinitions } from './hospital-search-definitions'
import { HOSPITAL_INTEL_IDS } from './hospital-search-ids'

const RUN_SEED = 'hospital-search-golden-seed'
const SCENE_INSTANCE_ID = 'hospital-scene-instance-001'

function prepare(sceneInstanceId = SCENE_INSTANCE_ID) {
  return createSceneSearchState({
    runSeed: RUN_SEED,
    sceneInstanceId,
    graph: hospitalSliceV01SceneGraph,
    searchCatalog: hospitalMainSearchCatalog,
    itemCatalog: hospitalItemCatalog,
    itemResourceCatalog: hospitalItemResourceCatalog,
  })
}

function prepared(nodeId: string) {
  const node = prepare().nodeStates.find((candidate) => candidate.nodeId === nodeId)
  if (!node || node.kind !== 'unsearched') throw new Error('节点必须存在预定搜索结果')
  return node.preparedOutcome
}

describe('hospital main search definitions', () => {
  it('defines exactly three searchable nodes and three unavailable nodes', () => {
    expect(hospitalMainSearchDefinitions).toHaveLength(3)
    expect(hospitalMainSearchCatalog.nodeIds).toEqual([
      HOSPITAL_NODE_IDS.emergencyHall,
      HOSPITAL_NODE_IDS.pharmacy,
      HOSPITAL_NODE_IDS.securityOffice,
    ].sort())
    expect(prepare().nodeStates.filter((node) => node.kind === 'not-available').map((node) => node.nodeId)).toEqual([
      HOSPITAL_NODE_IDS.elevatorAnteroom,
      HOSPITAL_NODE_IDS.isolationCorridor,
      HOSPITAL_NODE_IDS.specimenColdRoom,
    ].sort())
  })

  it('keeps the formal emergency hall grants, intel, and 40/30/30 pool', () => {
    const definition = hospitalMainSearchCatalog.get(HOSPITAL_NODE_IDS.emergencyHall)
    expect(definition.fixedItemGrants).toEqual([
      {
        definitionId: HOSPITAL_ITEM_IDS.metalParts,
        quantity: 1,
        initialState: { kind: 'none' },
      },
    ])
    expect(definition.fixedIntelIds).toEqual([HOSPITAL_INTEL_IDS.accessRouteHint])
    expect(definition.weightedItemChoice?.entries.map((entry) => [entry.grant.definitionId, entry.weight])).toEqual([
      [HOSPITAL_ITEM_IDS.electronicComponents, 30],
      [HOSPITAL_ITEM_IDS.fabric, 30],
      [HOSPITAL_ITEM_IDS.standardBattery, 40],
    ])
    expect(definition.weightedItemChoice?.entries.reduce((sum, entry) => sum + entry.weight, 0)).toBe(100)
  })

  it('keeps the formal pharmacy grant and 35/30/20/15 pool', () => {
    const definition = hospitalMainSearchCatalog.get(HOSPITAL_NODE_IDS.pharmacy)
    expect(definition.fixedItemGrants).toEqual([
      {
        definitionId: HOSPITAL_ITEM_IDS.bandage,
        quantity: 1,
        initialState: { kind: 'none' },
      },
    ])
    expect(definition.fixedIntelIds).toEqual([])
    expect(definition.weightedItemChoice?.entries.map((entry) => [entry.grant.definitionId, entry.weight])).toEqual([
      [HOSPITAL_ITEM_IDS.disinfectant, 35],
      [HOSPITAL_ITEM_IDS.firstAidKit, 20],
      [HOSPITAL_ITEM_IDS.infectionSuppressant, 15],
      [HOSPITAL_ITEM_IDS.painkiller, 30],
    ])
    expect(definition.weightedItemChoice?.entries.reduce((sum, entry) => sum + entry.weight, 0)).toBe(100)
  })

  it('keeps security fixed grants and intel without a random draw', () => {
    const definition = hospitalMainSearchCatalog.get(HOSPITAL_NODE_IDS.securityOffice)
    expect(definition.fixedItemGrants).toEqual([
      {
        definitionId: HOSPITAL_ITEM_IDS.isolationWardAccessCard,
        quantity: 1,
        initialState: { kind: 'none' },
      },
      {
        definitionId: HOSPITAL_ITEM_IDS.standardBattery,
        quantity: 1,
        initialState: { kind: 'none' },
      },
    ])
    expect(definition.fixedIntelIds).toEqual([
      HOSPITAL_INTEL_IDS.securityMonitoringRecord,
    ])
    expect(definition.weightedItemChoice).toBeNull()
    expect(prepared(HOSPITAL_NODE_IDS.securityOffice).randomTrace).toBeNull()
  })
})

describe('hospital deterministic search materialization', () => {
  it('locks the algorithm, seed, scene, item definitions, and stable instance ids', () => {
    const state = prepare()
    expect(RANDOM_ALGORITHM_VERSION).toBe('counter32-v1')
    expect(
      state.nodeStates
        .filter((node) => node.kind === 'unsearched')
        .map((node) => ({
          nodeId: node.nodeId,
          items: node.preparedOutcome.revealedItems.map(({ item }) => ({
            definitionId: item.definitionId,
            instanceId: item.instanceId,
          })),
          randomTrace: node.preparedOutcome.randomTrace,
        })),
    ).toEqual([
      {
        nodeId: HOSPITAL_NODE_IDS.emergencyHall,
        items: [
          {
            definitionId: HOSPITAL_ITEM_IDS.metalParts,
            instanceId: 'search:hospital-scene-instance-001:hospital_emergency_hall:0:fixed:0',
          },
          {
            definitionId: HOSPITAL_ITEM_IDS.standardBattery,
            instanceId: 'search:hospital-scene-instance-001:hospital_emergency_hall:0:weighted:0',
          },
        ],
        randomTrace: {
          algorithmVersion: 'counter32-v1',
          streamId: createStreamId(
            'scene-main-search',
            SCENE_INSTANCE_ID,
            HOSPITAL_NODE_IDS.emergencyHall,
            '0',
            'weighted-loot',
          ),
          drawIndex: 0,
          selectedDefinitionId: HOSPITAL_ITEM_IDS.standardBattery,
        },
      },
      {
        nodeId: HOSPITAL_NODE_IDS.pharmacy,
        items: [
          {
            definitionId: HOSPITAL_ITEM_IDS.bandage,
            instanceId: 'search:hospital-scene-instance-001:hospital_pharmacy:0:fixed:0',
          },
          {
            definitionId: HOSPITAL_ITEM_IDS.disinfectant,
            instanceId: 'search:hospital-scene-instance-001:hospital_pharmacy:0:weighted:0',
          },
        ],
        randomTrace: {
          algorithmVersion: 'counter32-v1',
          streamId: createStreamId(
            'scene-main-search',
            SCENE_INSTANCE_ID,
            HOSPITAL_NODE_IDS.pharmacy,
            '0',
            'weighted-loot',
          ),
          drawIndex: 0,
          selectedDefinitionId: HOSPITAL_ITEM_IDS.disinfectant,
        },
      },
      {
        nodeId: HOSPITAL_NODE_IDS.securityOffice,
        items: [
          {
            definitionId: HOSPITAL_ITEM_IDS.isolationWardAccessCard,
            instanceId: 'search:hospital-scene-instance-001:hospital_security_office:0:fixed:0',
          },
          {
            definitionId: HOSPITAL_ITEM_IDS.standardBattery,
            instanceId: 'search:hospital-scene-instance-001:hospital_security_office:0:fixed:1',
          },
        ],
        randomTrace: null,
      },
    ])
  })

  it('is independent of node order and unrelated battle random consumption', () => {
    const before = createRandomCursor(RUN_SEED, createStreamId('battle', 'enemy'))
    drawIntInclusive(before, 1, 100)
    const forward = hospitalMainSearchCatalog.nodeIds.map((nodeId) =>
      materializeMainSearchOutcome(RUN_SEED, SCENE_INSTANCE_ID, hospitalMainSearchCatalog.get(nodeId), hospitalItemCatalog, hospitalItemResourceCatalog),
    )
    const reverse = [...hospitalMainSearchCatalog.nodeIds].reverse().map((nodeId) =>
      materializeMainSearchOutcome(RUN_SEED, SCENE_INSTANCE_ID, hospitalMainSearchCatalog.get(nodeId), hospitalItemCatalog, hospitalItemResourceCatalog),
    ).reverse()
    expect(reverse).toEqual(forward)
    expect(prepare()).toEqual(prepare())
  })

  it('changes stable instance ids for a different scene instance', () => {
    const first = prepare()
    const second = prepare('hospital-scene-instance-002')
    const ids = (state: ReturnType<typeof prepare>) =>
      state.nodeStates.flatMap((node) =>
        node.kind === 'unsearched'
          ? node.preparedOutcome.revealedItems.map(({ item }) => item.instanceId)
          : [],
      )
    expect(ids(second)).not.toEqual(ids(first))
  })

  it('reveals items at the node without any backpack input or automatic pickup', () => {
    const state = prepare()
    const revealed = revealPreparedMainSearchOutcome(
      state,
      HOSPITAL_NODE_IDS.emergencyHall,
    )
    const node = revealed.nodeStates.find(
      (candidate) => candidate.nodeId === HOSPITAL_NODE_IDS.emergencyHall,
    )
    expect(node?.kind).toBe('searched')
    if (!node || node.kind !== 'searched') throw new Error('急诊大厅应已搜索')
    expect('revealedItems' in node).toBe(false)
    expect(state.nodeStates.find((candidate) => candidate.nodeId === HOSPITAL_NODE_IDS.emergencyHall)?.kind).toBe('unsearched')
  })
})
