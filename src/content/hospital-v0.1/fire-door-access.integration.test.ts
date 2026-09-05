import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState, createItemState, getItemState } from '../../core/item-state'
import { getEffectiveEnabledEdgeIds } from '../../core/scene-access'
import {
  applySceneExplorationEffects,
  getPlayerVisibleSceneNodeState,
  getPlayerVisibleSceneNavigation,
  getPlayerVisibleSceneObstacles,
  previewMainSearchCommand,
  previewNodeItemPickupCommand,
  previewSceneMoveCommand,
  resolveSceneInventoryCommand,
  previewSceneObstacleOptionCommand,
  resolveMainSearchCommand,
  resolveNodeItemPickupCommand,
  resolveSceneMoveCommand,
  resolveSceneObstacleOptionCommand,
  selectInfectedOrderlyFirstActionTime,
  type SceneExplorationSnapshot,
} from '../../core/scene-exploration'
import { getSceneNodeItems } from '../../core/scene-items'
import { createSceneSearchState } from '../../core/scene-search'
import { createSceneObstaclePrimaryPlan } from '../../core/scene-obstacle'
import { getCurrentTraversableAdjacentEdges } from '../../ui/interaction/current-traversable-adjacent-edges'
import { hospitalSceneSurfaceObservationCatalog } from './hospital-scene-navigation'
import { createHospitalTestSceneExplorationSnapshot } from './hospital-scene-navigation.test-support'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_EDGE_IDS,
  HOSPITAL_EVENT_IDS,
  HOSPITAL_FIRE_DOOR_OPTION_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  HOSPITAL_OBSTACLE_IDS,
  createHospitalSceneRuntimeBundle,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemReturnLifecycleCatalog,
  hospitalItemResourceCatalog,
  hospitalItemSearchIlluminationCatalog,
  hospitalMainSearchCatalog,
  hospitalSceneEdgeAccessCatalog,
  hospitalSceneObstacleCatalog,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
} from '..'

const RUN_SEED = 'door-risk-0'
const SCENE_ID = 'hospital-fire-door-test'
const dependencies = {
  graph: hospitalSliceV01SceneGraph,
  navigationCatalog: hospitalSceneSurfaceObservationCatalog,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  lifecycleCatalog: hospitalItemReturnLifecycleCatalog,
  searchCatalog: hospitalMainSearchCatalog,
  searchIlluminationCatalog: hospitalItemSearchIlluminationCatalog,
  edgeAccessCatalog: hospitalSceneEdgeAccessCatalog,
  obstacleCatalog: hospitalSceneObstacleCatalog,
  config,
}
const obstacleDependencies = { ...dependencies, runSeed: RUN_SEED }

interface Options {
  nodeId?: string
  weapon?: 'fireAxe' | 'metalPipe' | null
  utility?: 'crowbar' | 'toolkit' | 'flashlight' | null
  armor?: 'heavyCoat' | null
  resourceCurrent?: number
  armorIntegrity?: number
  withCard?: boolean
  remainingTime?: number
  bleeding?: boolean
  currentHealth?: number
  alertState?: 'unalerted' | 'alerted'
}

function snapshot(options: Options = {}): SceneExplorationSnapshot {
  const {
    nodeId = HOSPITAL_NODE_IDS.emergencyHall,
    weapon = null,
    utility = null,
    armor = null,
    resourceCurrent,
    armorIntegrity = config.maintenance.itemResourceMaximums.heavyCoatIntegrity,
    withCard = false,
    remainingTime = config.scene.totalTime,
    bleeding = false,
    currentHealth = config.combat.player.maxHealth,
    alertState = 'unalerted',
  } = options
  const backpackItems: ItemInstance[] = withCard
    ? [{ instanceId: 'access-card', definitionId: HOSPITAL_ITEM_IDS.isolationWardAccessCard, quantity: 1 }]
    : []
  const equipped = {
    weapon: weapon ? { instanceId: `equipped-${weapon}`, definitionId: HOSPITAL_ITEM_IDS[weapon], quantity: 1 } : null,
    armor: armor ? { instanceId: 'equipped-coat', definitionId: HOSPITAL_ITEM_IDS.heavyCoat, quantity: 1 } : null,
    utility: utility ? { instanceId: `equipped-${utility}`, definitionId: HOSPITAL_ITEM_IDS[utility], quantity: 1 } : null,
  }
  const carried: ItemInstance[] = [...backpackItems]
  if (equipped.weapon) carried.push(equipped.weapon)
  if (equipped.armor) carried.push(equipped.armor)
  if (equipped.utility) carried.push(equipped.utility)
  return createHospitalTestSceneExplorationSnapshot(
    {
      sceneInstanceId: SCENE_ID,
      searchState: createSceneSearchState({
        runSeed: 'hospital-search-golden-seed',
        sceneInstanceId: SCENE_ID,
        graph: hospitalSliceV01SceneGraph,
        searchCatalog: hospitalMainSearchCatalog,
        itemCatalog: hospitalItemCatalog,
        itemResourceCatalog: hospitalItemResourceCatalog,
      }),
      alertState,
      currentNodeId: nodeId,
      remainingTime,
      enabledEdgeIds: HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
      backpack: createBackpackSnapshot({
        width: config.backpack.width,
        height: config.backpack.height,
        items: backpackItems,
        placements: backpackItems.map(({ instanceId }) => ({ instanceId, x: 0, y: 0, rotated: false })),
      }, hospitalItemCatalog),
      equipment: equipped,
      quickSlots: { slots: [null, null] },
      itemStates: {
        states: carried.map((item) => {
          if (item.instanceId === 'equipped-coat') {
            return createItemState({ ...item, resource: { kind: 'integrity', current: armorIntegrity } }, hospitalItemResourceCatalog)
          }
          const full = createFullItemState(item, hospitalItemResourceCatalog)
          if (resourceCurrent !== undefined && item.instanceId.startsWith('equipped-') && full.resource.kind !== 'none') {
            return createItemState({ ...item, resource: { kind: full.resource.kind, current: resourceCurrent } }, hospitalItemResourceCatalog)
          }
          return full
        }),
      },
      condition: createPlayerCondition({
        currentHealth,
        bleeding,
        openWounds: bleeding
          ? [{ id: 'fixture-wound', kind: 'laceration', treatment: 'untreated' }]
          : [],
        pendingInfectionExposures: 0,
        minorContusions: 0,
        painkillerActive: false,
      }, config.combat.player),
      dailyMedicalUsage: { disinfectantUsesToday: 0 },
      runIntelLog: { intelIds: [] },
    },
    dependencies,
  )
}

function option(optionId: string) {
  return { obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor, optionId }
}

describe('hospital staff access and fire door', () => {
  it('projects only discovered names and known routes at the entrance without raw identities', () => {
    const entrance = snapshot({ nodeId: HOSPITAL_NODE_IDS.elevatorAnteroom })
    const projection = getPlayerVisibleSceneNavigation(entrance, dependencies)
    expect(projection.currentNodeName).toBe('电梯前室')
    expect(projection.nodes.map(({ name }) => name)).toEqual(['电梯前室', '急诊大厅'])
    expect(projection.routes).toHaveLength(1)
    const serialized = JSON.stringify(projection)
    for (const hidden of [
      '药房',
      '保安值班室',
      '隔离走廊',
      '标本冷藏室',
      SCENE_ID,
      HOSPITAL_NODE_IDS.elevatorAnteroom,
      HOSPITAL_EDGE_IDS.elevatorToEmergencyHall,
      'runId',
      'seed',
      'rulesVersion',
      'preparedOutcome',
      'randomTrace',
      'riskPercent',
    ]) {
      expect(serialized).not.toContain(hidden)
    }
  })

  it('keeps the staff passage hidden until security is visited even when a backpack card grants physical access', () => {
    const withCard = snapshot({
      nodeId: HOSPITAL_NODE_IDS.isolationCorridor,
      withCard: true,
    })
    expect(getEffectiveEnabledEdgeIds(withCard, hospitalSceneEdgeAccessCatalog)).toContain(
      HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
    )
    expect(withCard.navigationKnowledge.knownEdgeIds).not.toContain(
      HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
    )
    const runtime = createHospitalSceneRuntimeBundle(RUN_SEED, SCENE_ID)
    expect(getCurrentTraversableAdjacentEdges(withCard, runtime).map(({ destinationNodeName }) => destinationNodeName))
      .not.toContain('保安值班室')
    expect(previewSceneMoveCommand(withCard, {
      edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
    }, dependencies)).toEqual({ canExecute: false, rejectionCode: 'EDGE_NOT_KNOWN' })
  })

  it('separates known routes from current traversal for the fire door and staff passage', () => {
    const hall = snapshot()
    expect(hall.navigationKnowledge.knownEdgeIds).toContain(
      HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
    )
    expect(getEffectiveEnabledEdgeIds(hall, hospitalSceneEdgeAccessCatalog)).not.toContain(
      HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor,
    )
    const security = snapshot({ nodeId: HOSPITAL_NODE_IDS.securityOffice })
    expect(security.navigationKnowledge.knownEdgeIds).toContain(
      HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
    )
    expect(getEffectiveEnabledEdgeIds(security, hospitalSceneEdgeAccessCatalog)).not.toContain(
      HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
    )
  })

  it('uses the backpack card as a live, non-persistent edge permission', () => {
    const without = snapshot({ nodeId: HOSPITAL_NODE_IDS.securityOffice })
    const withCard = snapshot({ nodeId: HOSPITAL_NODE_IDS.securityOffice, withCard: true })
    expect(getEffectiveEnabledEdgeIds(without, hospitalSceneEdgeAccessCatalog)).not.toContain(HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor)
    expect(getEffectiveEnabledEdgeIds(withCard, hospitalSceneEdgeAccessCatalog)).toContain(HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor)
    const result = resolveSceneMoveCommand(withCard, { edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor }, dependencies)
    expect(result.result.finalMovementTime).toBe(config.scene.movementEdgeTime)
    expect(result.snapshot.backpack.items).toEqual(withCard.backpack.items)
    expect(result.snapshot.enabledEdgeIds).toEqual(withCard.enabledEdgeIds)
    expect(result.result.effects.map(({ kind }) => kind)).toEqual([
      'scene-node-changed',
      'scene-navigation-knowledge-updated',
      'scene-time-resolved',
    ])
  })

  it('loses and regains staff-passage access when the real card moves between backpack and current ground', () => {
    const withCard = snapshot({ nodeId: HOSPITAL_NODE_IDS.securityOffice, withCard: true })
    const cardId = withCard.backpack.items[0]!.instanceId
    const dropped = resolveSceneInventoryCommand(
      withCard,
      { kind: 'drop-scene-backpack-item', instanceId: cardId },
      dependencies,
    ).snapshot
    expect(getEffectiveEnabledEdgeIds(dropped, hospitalSceneEdgeAccessCatalog)).not.toContain(
      HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
    )
    const restored = resolveNodeItemPickupCommand(
      dropped,
      { nodeItemInstanceId: cardId, quantity: 1, placement: { x: 0, y: 0, rotated: false } },
      dependencies,
    ).snapshot
    expect(getEffectiveEnabledEdgeIds(restored, hospitalSceneEdgeAccessCatalog)).toContain(
      HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor,
    )
  })

  it('reads first encounter time from alert state and versioned configuration', () => {
    expect(selectInfectedOrderlyFirstActionTime('unalerted', config)).toBe(config.combat.infectedOrderly.firstActionTime.unaware)
    expect(selectInfectedOrderlyFirstActionTime('alerted', config)).toBe(config.combat.infectedOrderly.firstActionTime.alerted)
  })

  it.each([
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard, { withCard: true }, 10, false],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.crowbar, { utility: 'crowbar' as const }, 20, false],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit, { utility: 'toolkit' as const }, 30, false],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.fireAxe, { weapon: 'fireAxe' as const }, 10, true],
  ])('resolves option %s with formal time and alert result', (optionId, setup, time, alerted) => {
    const start = snapshot(setup)
    const preview = previewSceneObstacleOptionCommand(start, option(optionId), obstacleDependencies)
    const resolved = resolveSceneObstacleOptionCommand(start, option(optionId), obstacleDependencies)
    expect(preview.canExecute).toBe(true)
    if (!preview.canExecute) throw new Error('防火门预览必须成功')
    expect(preview.result.effects).toEqual(resolved.result.effects)
    expect(applySceneExplorationEffects(start, resolved.result.effects, obstacleDependencies)).toEqual(resolved.snapshot)
    expect(resolved.result.actionTime).toBe(time)
    expect(resolved.snapshot.enabledEdgeIds).toContain(HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor)
    expect(resolved.snapshot.alertState).toBe(alerted ? 'alerted' : 'unalerted')
    expect(previewSceneObstacleOptionCommand(resolved.snapshot, option(optionId), obstacleDependencies)).toMatchObject({ canExecute: false, rejectionCode: 'OBSTACLE_ALREADY_RESOLVED' })
  })

  it('exposes only formally executable fire-door options at the unresolved current endpoint', () => {
    const defaultOptions = getPlayerVisibleSceneObstacles(snapshot(), obstacleDependencies)[0]!.options
    expect(defaultOptions.map(({ command }) => command.optionId)).toEqual([
      HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry,
      HOSPITAL_FIRE_DOOR_OPTION_IDS.decline,
    ])
    expect(getPlayerVisibleSceneObstacles(snapshot({ withCard: true }), obstacleDependencies)[0]!.options.map(({ command }) => command.optionId)).toContain(HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard)
    expect(getPlayerVisibleSceneObstacles(snapshot({ utility: 'crowbar' }), obstacleDependencies)[0]!.options.map(({ command }) => command.optionId)).toContain(HOSPITAL_FIRE_DOOR_OPTION_IDS.crowbar)
    expect(getPlayerVisibleSceneObstacles(snapshot({ utility: 'toolkit' }), obstacleDependencies)[0]!.options.map(({ command }) => command.optionId)).toContain(HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit)
    expect(getPlayerVisibleSceneObstacles(snapshot({ weapon: 'fireAxe' }), obstacleDependencies)[0]!.options.map(({ command }) => command.optionId)).toContain(HOSPITAL_FIRE_DOOR_OPTION_IDS.fireAxe)
    expect(getPlayerVisibleSceneObstacles(snapshot({ nodeId: HOSPITAL_NODE_IDS.securityOffice }), obstacleDependencies)).toEqual([])
  })

  it('projects deterministic resource, alert, and toolkit ground-grant facts without resolving', () => {
    const toolkit = getPlayerVisibleSceneObstacles(snapshot({ utility: 'toolkit' }), obstacleDependencies)[0]!.options.find(({ command }) => command.optionId === HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit)!
    expect(toolkit).toMatchObject({
      actionTime: config.scene.fireDoor.toolkitTime,
      setsAlert: false,
      resourceChange: { resourceKind: 'durability', currentBefore: 2, currentAfter: 1 },
      spawnedItems: [{ definitionId: HOSPITAL_ITEM_IDS.electronicComponents, quantity: 1 }],
      injuryRiskTier: null,
      outcomes: [{ kind: 'deterministic' }],
    })
    const fireAxe = getPlayerVisibleSceneObstacles(snapshot({ weapon: 'fireAxe' }), obstacleDependencies)[0]!.options.find(({ command }) => command.optionId === HOSPITAL_FIRE_DOOR_OPTION_IDS.fireAxe)!
    expect(fireAxe).toMatchObject({
      setsAlert: true,
      resourceChange: { resourceKind: 'durability', currentBefore: 2, currentAfter: 1 },
    })
  })

  it.each([
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard, { withCard: true }, false],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.crowbar, { utility: 'crowbar' as const }, false],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit, { utility: 'toolkit' as const }, false],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.fireAxe, { weapon: 'fireAxe' as const }, true],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, {}, true],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.decline, {}, false],
  ])('uses shared alert metadata for option %s across plan, resolver, and safe preview', (
    optionId,
    setup,
    expectedSetsAlert,
  ) => {
    const start = snapshot(setup)
    const command = option(optionId)
    const plan = createSceneObstaclePrimaryPlan(start, command, obstacleDependencies)
    const resolved = resolveSceneObstacleOptionCommand(start, command, obstacleDependencies)
    const safe = getPlayerVisibleSceneObstacles(start, obstacleDependencies)[0]!.options.find(
      ({ command: candidate }) => candidate.optionId === optionId,
    )
    expect(plan.outcomeMetadata.setsAlert).toBe(expectedSetsAlert)
    expect(resolved.snapshot.alertState === 'alerted').toBe(expectedSetsAlert)
    expect(safe?.setsAlert).toBe(expectedSetsAlert)
  })

  it.each([
    [false, 'high'],
    [true, 'low'],
  ] as const)('uses shared effective force-entry risk protected=%s for raw and safe previews', (
    protectedByCoat,
    expectedTier,
  ) => {
    const start = snapshot({ armor: protectedByCoat ? 'heavyCoat' : null })
    const command = option(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry)
    const plan = createSceneObstaclePrimaryPlan(start, command, obstacleDependencies)
    const raw = previewSceneObstacleOptionCommand(start, command, obstacleDependencies)
    if (!raw.canExecute) throw new Error('强行撞门正式预览必须成功')
    const safe = getPlayerVisibleSceneObstacles(start, obstacleDependencies)[0]!.options.find(
      ({ command: candidate }) => candidate.optionId === HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry,
    )
    expect(plan.outcomeMetadata).toMatchObject({
      impactProtectionActive: protectedByCoat,
      effectiveInjuryRiskPercent: raw.result.riskTrace?.riskPercent,
    })
    expect(safe).toMatchObject({
      impactProtectionActive: protectedByCoat,
      injuryRiskTier: expectedTier,
    })
  })

  it('keeps force-entry safe preview identical across opposite hidden outcomes', () => {
    const start = snapshot({ remainingTime: 15 })
    const injuredDependencies = { ...obstacleDependencies, runSeed: 'door-risk-0' }
    const safeDependencies = { ...obstacleDependencies, runSeed: 'door-risk-2' }
    const injuredRaw = previewSceneObstacleOptionCommand(start, option(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry), injuredDependencies)
    const safeRaw = previewSceneObstacleOptionCommand(start, option(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry), safeDependencies)
    expect(injuredRaw.canExecute && injuredRaw.result.riskTrace?.causedMinorContusion).toBe(true)
    expect(safeRaw.canExecute && safeRaw.result.riskTrace?.causedMinorContusion).toBe(false)
    const injuredVisible = getPlayerVisibleSceneObstacles(start, injuredDependencies)
    const safeVisible = getPlayerVisibleSceneObstacles(start, safeDependencies)
    expect(injuredVisible).toEqual(safeVisible)
    const forceEntry = injuredVisible[0]!.options.find(({ command }) => command.optionId === HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry)!
    expect(forceEntry).toMatchObject({
      injuryRiskTier: 'high',
      impactProtectionActive: false,
      setsAlert: true,
      outcomes: [
        { kind: 'no-minor-contusion' },
        { kind: 'minor-contusion' },
      ],
    })
    expect(forceEntry.outcomes[0]!.returnRoute.estimatedReturnTime).toBe(10)
    expect(forceEntry.outcomes[1]!.returnRoute.estimatedReturnTime).toBe(11)
    for (const hidden of ['riskTrace', 'riskPercent', 'roll', 'streamId', 'drawIndex', 'causedMinorContusion']) {
      expect(JSON.stringify(forceEntry)).not.toContain(hidden)
    }
  })

  it('reads protected force-entry tier and integrity change from formal configuration and Effects', () => {
    const forceEntry = getPlayerVisibleSceneObstacles(snapshot({ armor: 'heavyCoat' }), obstacleDependencies)[0]!.options.find(({ command }) => command.optionId === HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry)!
    expect(forceEntry).toMatchObject({
      injuryRiskTier: 'low',
      impactProtectionActive: true,
      resourceChange: { resourceKind: 'integrity', currentBefore: 4, currentAfter: 3 },
    })
  })

  it('projects formal near-zero deterministic and uncertain overtime consequences', () => {
    const card = getPlayerVisibleSceneObstacles(snapshot({ withCard: true, remainingTime: 5 }), obstacleDependencies)[0]!.options.find(({ command }) => command.optionId === HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard)!
    expect(card.outcomes[0]!.sceneOutcome).toMatchObject({
      kind: 'forced-return',
      clock: { remainingTime: 0 },
      overtimeDebt: 5,
    })
    const forceEntry = getPlayerVisibleSceneObstacles(snapshot({ remainingTime: 5 }), obstacleDependencies)[0]!.options.find(({ command }) => command.optionId === HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry)!
    expect(forceEntry.outcomes).toHaveLength(2)
    expect(forceEntry.outcomes.map(({ sceneOutcome }) => sceneOutcome.overtimeDebt)).toEqual([15, 15])
    expect(forceEntry.outcomes.map(({ returnRoute }) => returnRoute.estimatedReturnTime)).toEqual([10, 11])
  })

  it('removes a formally resolved obstacle from the player-visible query', () => {
    const start = snapshot({ withCard: true })
    const opened = resolveSceneObstacleOptionCommand(start, option(HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard), obstacleDependencies).snapshot
    expect(getPlayerVisibleSceneObstacles(opened, obstacleDependencies)).toEqual([])
    expect(opened.navigationKnowledge).toEqual(start.navigationKnowledge)
  })

  it('spawns stable toolkit electronics on the current ground before search and allows explicit pickup', () => {
    const start = snapshot({ utility: 'toolkit' })
    const opened = resolveSceneObstacleOptionCommand(start, option(HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit), obstacleDependencies)
    const ground = getSceneNodeItems(opened.snapshot.sceneItems, HOSPITAL_NODE_IDS.emergencyHall)
    expect(ground).toHaveLength(1)
    expect(ground[0]).toMatchObject({
      item: { definitionId: HOSPITAL_ITEM_IDS.electronicComponents, quantity: 1 },
      state: { resource: { kind: 'none' } },
    })
    expect(ground[0].item.instanceId).toContain(encodeURIComponent(HOSPITAL_EVENT_IDS.isolationFireDoor))
    expect(opened.snapshot.backpack.items).toEqual([])
    expect(getPlayerVisibleSceneNodeState(opened.snapshot, HOSPITAL_NODE_IDS.emergencyHall)).toMatchObject({
      search: { kind: 'available-unsearched' },
      groundItems: [{ definitionId: HOSPITAL_ITEM_IDS.electronicComponents }],
    })
    const searchedAfterSpawn = resolveMainSearchCommand(
      opened.snapshot,
      { illumination: 'search-without-flashlight' },
      dependencies,
    ).snapshot
    expect(
      getSceneNodeItems(
        searchedAfterSpawn.sceneItems,
        HOSPITAL_NODE_IDS.emergencyHall,
      ).some(({ item }) => item.instanceId === ground[0].item.instanceId),
    ).toBe(true)
    const picked = resolveNodeItemPickupCommand(opened.snapshot, {
      nodeItemInstanceId: ground[0].item.instanceId,
      quantity: 1,
      placement: { x: 0, y: 0, rotated: false },
    }, dependencies)
    expect(picked.snapshot.backpack.items[0].instanceId).toBe(ground[0].item.instanceId)
    expect(picked.snapshot.navigationKnowledge).toEqual(opened.snapshot.navigationKnowledge)
    expect(getSceneNodeItems(picked.snapshot.sceneItems, HOSPITAL_NODE_IDS.emergencyHall)).toEqual([])
  })

  it.each([
    ['door-risk-0', false, 29, 60, true],
    ['door-risk-2', false, 80, 60, false],
    ['door-risk-9', true, 9, 20, true],
    ['door-risk-0', true, 29, 20, false],
  ])('locks deterministic force-entry risk for %s protected=%s', (runSeed, protectedByCoat, roll, risk, injured) => {
    const start = snapshot({ armor: protectedByCoat ? 'heavyCoat' : null })
    const deps = { ...obstacleDependencies, runSeed }
    const first = resolveSceneObstacleOptionCommand(start, option(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry), deps)
    const second = resolveSceneObstacleOptionCommand(start, option(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry), deps)
    expect(first.result.riskTrace).toMatchObject({ roll, riskPercent: risk, causedMinorContusion: injured, usedImpactProtection: protectedByCoat, drawIndex: 0 })
    expect(second.result.riskTrace).toEqual(first.result.riskTrace)
    expect(first.snapshot.alertState).toBe('alerted')
    expect(first.snapshot.condition.minorContusions).toBe(injured ? 1 : 0)
    expect(first.snapshot.condition).toMatchObject({ bleeding: false, openWounds: [], currentHealth: config.combat.player.maxHealth })
    if (protectedByCoat) {
      expect(getItemState(first.snapshot.itemStates, 'equipped-coat').resource).toEqual({ kind: 'integrity', current: 3 })
    }
  })

  it('keeps zero-integrity coat ineffective and decline entirely timeless', () => {
    const broken = snapshot({ armor: 'heavyCoat', armorIntegrity: 0 })
    const forced = resolveSceneObstacleOptionCommand(broken, option(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry), obstacleDependencies)
    expect(forced.result.riskTrace).toMatchObject({ riskPercent: 60, usedImpactProtection: false })
    expect(getItemState(forced.snapshot.itemStates, 'equipped-coat').resource).toEqual({ kind: 'integrity', current: 0 })
    const start = snapshot({ remainingTime: 1, bleeding: true })
    const declined = resolveSceneObstacleOptionCommand(start, option(HOSPITAL_FIRE_DOOR_OPTION_IDS.decline), obstacleDependencies)
    expect(declined.result.actionTime).toBe(0)
    expect(declined.result.effects.map(({ kind }) => kind)).toEqual(['scene-obstacle-declined'])
    expect(declined.snapshot).toEqual(start)
  })

  it('executes the real security search, pickup, and staff-channel flow', () => {
    let current = snapshot({ nodeId: HOSPITAL_NODE_IDS.securityOffice })
    expect(previewSceneMoveCommand(current, { edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor }, dependencies)).toMatchObject({ canExecute: false })
    const searchPreview = previewMainSearchCommand(current, { illumination: 'search-without-flashlight' }, dependencies)
    const searchResolved = resolveMainSearchCommand(current, { illumination: 'search-without-flashlight' }, dependencies)
    expect(searchPreview.canExecute).toBe(true)
    if (!searchPreview.canExecute) throw new Error('保安室搜索预览必须成功')
    expect(searchPreview.result.effects).toEqual(searchResolved.result.effects)
    expect(applySceneExplorationEffects(current, searchResolved.result.effects, dependencies)).toEqual(searchResolved.snapshot)
    current = searchResolved.snapshot
    const card = getSceneNodeItems(current.sceneItems, HOSPITAL_NODE_IDS.securityOffice).find(({ item }) => item.definitionId === HOSPITAL_ITEM_IDS.isolationWardAccessCard)!
    expect(previewSceneMoveCommand(current, { edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor }, dependencies)).toMatchObject({ canExecute: false })
    const pickupCommand = { nodeItemInstanceId: card.item.instanceId, quantity: 1, placement: { x: 0, y: 0, rotated: false } } as const
    const pickupPreview = previewNodeItemPickupCommand(current, pickupCommand, dependencies)
    const pickupResolved = resolveNodeItemPickupCommand(current, pickupCommand, dependencies)
    expect(pickupPreview.canExecute).toBe(true)
    if (!pickupPreview.canExecute) throw new Error('门禁卡拾取预览必须成功')
    expect(pickupPreview.result.effects).toEqual(pickupResolved.result.effects)
    expect(applySceneExplorationEffects(
      current,
      pickupResolved.result.effects,
      dependencies,
      { kind: 'node-item-pickup', command: pickupCommand },
    )).toEqual(pickupResolved.snapshot)
    current = pickupResolved.snapshot
    const movePreview = previewSceneMoveCommand(current, { edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor }, dependencies)
    const moved = resolveSceneMoveCommand(current, { edgeId: HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor }, dependencies)
    expect(movePreview.canExecute).toBe(true)
    if (!movePreview.canExecute) throw new Error('工作人员通道移动预览必须成功')
    expect(movePreview.result.effects).toEqual(moved.result.effects)
    expect(applySceneExplorationEffects(current, moved.result.effects, dependencies)).toEqual(moved.snapshot)
    expect(moved.snapshot.currentNodeId).toBe(HOSPITAL_NODE_IDS.isolationCorridor)
    expect(moved.result.returnRoute.edgeIds).toContain(HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor)
    expect(moved.snapshot.backpack.items).toContainEqual(card.item)
    expect(moved.snapshot.enabledEdgeIds).not.toContain(HOSPITAL_EDGE_IDS.securityOfficeToIsolationCorridor)
  })

  it('executes the real toolkit door, pickup, and isolation-corridor flow', () => {
    let current = snapshot({ nodeId: HOSPITAL_NODE_IDS.elevatorAnteroom, utility: 'toolkit' })
    const hallMovePreview = previewSceneMoveCommand(current, { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall }, dependencies)
    const hallMove = resolveSceneMoveCommand(current, { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall }, dependencies)
    expect(hallMovePreview.canExecute && hallMovePreview.result.effects).toEqual(hallMove.result.effects)
    expect(applySceneExplorationEffects(current, hallMove.result.effects, dependencies)).toEqual(hallMove.snapshot)
    current = hallMove.snapshot
    const doorPreview = previewSceneObstacleOptionCommand(current, option(HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit), obstacleDependencies)
    const doorResolved = resolveSceneObstacleOptionCommand(current, option(HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit), obstacleDependencies)
    expect(doorPreview.canExecute && doorPreview.result.effects).toEqual(doorResolved.result.effects)
    expect(applySceneExplorationEffects(current, doorResolved.result.effects, obstacleDependencies)).toEqual(doorResolved.snapshot)
    current = doorResolved.snapshot
    const electronics = getSceneNodeItems(current.sceneItems, HOSPITAL_NODE_IDS.emergencyHall)[0]
    const pickupCommand = { nodeItemInstanceId: electronics.item.instanceId, quantity: 1, placement: { x: 0, y: 0, rotated: false } } as const
    const pickupPreview = previewNodeItemPickupCommand(current, pickupCommand, dependencies)
    const pickupResolved = resolveNodeItemPickupCommand(current, pickupCommand, dependencies)
    expect(pickupPreview.canExecute && pickupPreview.result.effects).toEqual(pickupResolved.result.effects)
    expect(applySceneExplorationEffects(
      current,
      pickupResolved.result.effects,
      dependencies,
      { kind: 'node-item-pickup', command: pickupCommand },
    )).toEqual(pickupResolved.snapshot)
    current = pickupResolved.snapshot
    const corridorPreview = previewSceneMoveCommand(current, { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor }, dependencies)
    const corridorMove = resolveSceneMoveCommand(current, { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor }, dependencies)
    expect(corridorPreview.canExecute && corridorPreview.result.effects).toEqual(corridorMove.result.effects)
    expect(applySceneExplorationEffects(current, corridorMove.result.effects, dependencies)).toEqual(corridorMove.snapshot)
    current = corridorMove.snapshot
    expect(current.currentNodeId).toBe(HOSPITAL_NODE_IDS.isolationCorridor)
    expect(current.backpack.items).toContainEqual(electronics.item)
    expect(getItemState(current.itemStates, 'equipped-toolkit').resource).toEqual({ kind: 'durability', current: 1 })
  })
})
