import { describe, expect, it } from 'vitest'
import { createPlayerCondition } from '../../core/condition'
import type { EquipmentSnapshot } from '../../core/equipment'
import { createBackpackSnapshot, type ItemInstance } from '../../core/inventory'
import { createFullItemState, createItemState } from '../../core/item-state'
import {
  applySceneExplorationEffects,
  createInitialSceneExplorationSnapshot,
  resolveSceneObstacleOptionCommand,
  type SceneExplorationEffect,
  type SceneExplorationSnapshot,
} from '../../core/scene-exploration'
import { createSceneSearchState } from '../../core/scene-search'
import { createSceneObstaclePrimaryPlan } from '../../core/scene-obstacle'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_OPTION_IDS,
  HOSPITAL_ITEM_IDS,
  HOSPITAL_NODE_IDS,
  HOSPITAL_OBSTACLE_IDS,
  hospitalItemCatalog,
  hospitalItemEquipmentCatalog,
  hospitalItemQuickSlotCatalog,
  hospitalItemResourceCatalog,
  hospitalMainSearchCatalog,
  hospitalSceneEdgeAccessCatalog,
  hospitalSceneObstacleCatalog,
  hospitalSliceV01RuleConfig as config,
  hospitalSliceV01SceneGraph,
} from '..'

const dependencies = {
  graph: hospitalSliceV01SceneGraph,
  physicalCatalog: hospitalItemCatalog,
  equipmentCatalog: hospitalItemEquipmentCatalog,
  quickSlotCatalog: hospitalItemQuickSlotCatalog,
  itemResourceCatalog: hospitalItemResourceCatalog,
  edgeAccessCatalog: hospitalSceneEdgeAccessCatalog,
  obstacleCatalog: hospitalSceneObstacleCatalog,
  config,
}
const withSeed = { ...dependencies, runSeed: 'door-risk-0' }

type Setup = Readonly<{
  weapon?: 'fireAxe'
  utility?: 'crowbar' | 'toolkit'
  armor?: 'heavyCoat'
  armorIntegrity?: number
  withCard?: boolean
  alertState?: 'unalerted' | 'alerted'
}>

function snapshot(setup: Setup = {}): SceneExplorationSnapshot {
  const backpackItems: ItemInstance[] = setup.withCard
    ? [{ instanceId: 'card', definitionId: HOSPITAL_ITEM_IDS.isolationWardAccessCard, quantity: 1 }]
    : []
  const equipment: EquipmentSnapshot = {
    weapon: setup.weapon
      ? { instanceId: 'axe', definitionId: HOSPITAL_ITEM_IDS.fireAxe, quantity: 1 }
      : null,
    armor: setup.armor
      ? { instanceId: 'coat', definitionId: HOSPITAL_ITEM_IDS.heavyCoat, quantity: 1 }
      : null,
    utility: setup.utility
      ? { instanceId: setup.utility, definitionId: HOSPITAL_ITEM_IDS[setup.utility], quantity: 1 }
      : null,
  }
  const carried: ItemInstance[] = [...backpackItems]
  for (const item of Object.values(equipment)) {
    if (item) carried.push(item)
  }
  return createInitialSceneExplorationSnapshot({
    sceneInstanceId: 'effect-integrity-scene',
    searchState: createSceneSearchState({
      runSeed: 'hospital-search-golden-seed',
      sceneInstanceId: 'effect-integrity-scene',
      graph: hospitalSliceV01SceneGraph,
      searchCatalog: hospitalMainSearchCatalog,
      itemCatalog: hospitalItemCatalog,
      itemResourceCatalog: hospitalItemResourceCatalog,
    }),
    alertState: setup.alertState ?? 'unalerted',
    currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
    remainingTime: config.scene.totalTime,
    enabledEdgeIds: HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
    backpack: createBackpackSnapshot({
      width: config.backpack.width,
      height: config.backpack.height,
      items: backpackItems,
      placements: backpackItems.map(({ instanceId }) => ({ instanceId, x: 0, y: 0, rotated: false })),
    }, hospitalItemCatalog),
    equipment,
    quickSlots: { slots: [null, null] },
    itemStates: {
      states: carried.map((item) =>
        item.instanceId === 'coat'
          ? createItemState({ ...item, resource: { kind: 'integrity', current: setup.armorIntegrity ?? 4 } }, hospitalItemResourceCatalog)
          : createFullItemState(item, hospitalItemResourceCatalog),
      ),
    },
    condition: createPlayerCondition({
      currentHealth: config.combat.player.maxHealth,
      bleeding: false,
      openWounds: [],
          pendingInfectionExposures: 0,
      minorContusions: 0,
      painkillerActive: false,
    }, config.combat.player),
  }, dependencies)
}

function option(optionId: string) {
  return { obstacleId: HOSPITAL_OBSTACLE_IDS.isolationFireDoor, optionId }
}

function plan(
  optionId: string,
  setup: Setup,
  runSeed = 'door-risk-0',
): { start: SceneExplorationSnapshot; effects: SceneExplorationEffect[] } {
  const start = snapshot(setup)
  const result = resolveSceneObstacleOptionCommand(
    start,
    option(optionId),
    { ...withSeed, runSeed },
  )
  return { start, effects: structuredClone(result.result.effects) as SceneExplorationEffect[] }
}

type MutableEffect = Record<string, unknown>
const records = (effects: SceneExplorationEffect[]) => effects as unknown as MutableEffect[]
const indexOf = (effects: SceneExplorationEffect[], kind: string) =>
  records(effects).findIndex((effect) => effect.kind === kind)

function expectRejected(
  start: SceneExplorationSnapshot,
  effects: SceneExplorationEffect[],
  replayDependencies: typeof withSeed = withSeed,
): void {
  const before = structuredClone(start)
  expect(() => applySceneExplorationEffects(start, effects, replayDependencies)).toThrow()
  expect(start).toEqual(before)
}

describe('fire-door obstacle Effect anti-tampering', () => {
  it('locks one obstacle, six options, one toolkit grant, and the shared primary prefix', () => {
    expect(hospitalSceneObstacleCatalog.obstacleIds).toEqual([
      HOSPITAL_OBSTACLE_IDS.isolationFireDoor,
    ])
    const obstacle = hospitalSceneObstacleCatalog.get(
      HOSPITAL_OBSTACLE_IDS.isolationFireDoor,
    )
    expect(obstacle.endpointNodeIds).toEqual([
      HOSPITAL_NODE_IDS.emergencyHall,
      HOSPITAL_NODE_IDS.isolationCorridor,
    ].sort())
    expect(obstacle.options).toHaveLength(6)
    const toolkit = obstacle.options.find(
      ({ id }) => id === HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit,
    )
    expect(toolkit?.kind).toBe('equipped-resource')
    if (!toolkit || toolkit.kind !== 'equipped-resource') {
      throw new Error('工具箱正式障碍选项缺失')
    }
    expect(toolkit.spawnGrants).toHaveLength(1)

    const start = snapshot({ utility: 'toolkit' })
    const shared = createSceneObstaclePrimaryPlan(
      start,
      option(HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit),
      withSeed,
    )
    const command = resolveSceneObstacleOptionCommand(
      start,
      option(HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit),
      withSeed,
    )
    expect(
      command.result.effects.slice(0, shared.primaryEffects.length),
    ).toEqual(shared.primaryEffects)
  })

  it('requires the exact impact-protection consumption Effect', () => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, { armor: 'heavyCoat' })
    effects.splice(indexOf(effects, 'item-resource-consumed'), 1)
    expectRejected(start, effects)
  })

  it('rejects impact-protection consumption without effective armor', () => {
    const unprotected = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, {})
    const protectedPlan = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, { armor: 'heavyCoat' })
    unprotected.effects.unshift(protectedPlan.effects[0])
    expectRejected(unprotected.start, unprotected.effects)
  })

  it.each([
    ['requested cost', 'requestedCost', 2],
    ['equipment slot', 'equipmentSlot', 'utility'],
    ['resource before', 'currentBefore', 3],
    ['resource after', 'currentAfter', 2],
  ])('rejects modified coat %s', (_label, field, value) => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, { armor: 'heavyCoat' })
    records(effects)[0][field] = value
    expectRejected(start, effects)
  })

  it.each([
    ['fire axe', HOSPITAL_FIRE_DOOR_OPTION_IDS.fireAxe, { weapon: 'fireAxe' } as Setup],
    ['force entry', HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, {}],
  ])('rejects a deleted %s alert Effect', (_label, optionId, setup) => {
    const { start, effects } = plan(optionId, setup)
    effects.splice(indexOf(effects, 'scene-alert-changed'), 1)
    expectRejected(start, effects)
  })

  it.each([
    ['already alerted force entry', HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, { alertState: 'alerted' } as Setup],
    ['access card', HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard, { withCard: true } as Setup],
    ['crowbar', HOSPITAL_FIRE_DOOR_OPTION_IDS.crowbar, { utility: 'crowbar' } as Setup],
    ['toolkit', HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit, { utility: 'toolkit' } as Setup],
  ])('rejects an inserted alert Effect for %s', (_label, optionId, setup) => {
    const { start, effects } = plan(optionId, setup)
    const edge = indexOf(effects, 'scene-edge-enabled')
    effects.splice(edge + 1, 0, {
      kind: 'scene-alert-changed',
      fromAlertState: start.alertState,
      toAlertState: 'alerted',
      reason: 'fire-door-force-entry',
    })
    expectRejected(start, effects)
  })

  it('rejects an alerted-to-alerted Effect', () => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, { alertState: 'alerted' })
    const edge = indexOf(effects, 'scene-edge-enabled')
    effects.splice(edge + 1, 0, {
      kind: 'scene-alert-changed',
      fromAlertState: 'alerted',
      toAlertState: 'alerted',
      reason: 'fire-door-force-entry',
    })
    expectRejected(start, effects)
  })

  it('requires exactly one force-entry risk Effect', () => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, {})
    effects.splice(indexOf(effects, 'scene-obstacle-risk-resolved'), 1)
    expectRejected(start, effects)
  })

  it.each([
    ['roll', 'roll', 1],
    ['threshold', 'riskPercent', 59],
    ['stream ID', 'streamId', 'forged-stream'],
    ['draw index', 'drawIndex', 1],
    ['algorithm version', 'algorithmVersion', 'forged-version'],
    ['protection flag', 'usedImpactProtection', true],
  ])('rejects modified risk %s', (_label, field, value) => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, {})
    records(effects)[indexOf(effects, 'scene-obstacle-risk-resolved')][field] = value
    expectRejected(start, effects)
  })

  it('rejects a deleted contusion after a successful risk roll', () => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, {})
    effects.splice(indexOf(effects, 'minor-contusion-added'), 1)
    expectRejected(start, effects)
  })

  it('rejects a contusion after a failed risk roll', () => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, {}, 'door-risk-2')
    const risk = indexOf(effects, 'scene-obstacle-risk-resolved')
    effects.splice(risk + 1, 0, { kind: 'minor-contusion-added', source: 'fire-door-force-entry', countBefore: 0, added: 1, countAfter: 1 })
    expectRejected(start, effects, { ...withSeed, runSeed: 'door-risk-2' })
  })

  it('rejects duplicate contusions', () => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, {})
    const contusion = effects[indexOf(effects, 'minor-contusion-added')]
    effects.splice(indexOf(effects, 'minor-contusion-added') + 1, 0, structuredClone(contusion))
    expectRejected(start, effects)
  })

  it('rejects a contusion placed before its risk Effect', () => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, {})
    const risk = indexOf(effects, 'scene-obstacle-risk-resolved')
    const contusion = indexOf(effects, 'minor-contusion-added')
    ;[effects[risk], effects[contusion]] = [effects[contusion], effects[risk]]
    expectRejected(start, effects)
  })

  it('requires Run seed for obstacle replay', () => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, {})
    expect(() => applySceneExplorationEffects(start, effects, dependencies)).toThrowError(
      expect.objectContaining({ code: 'EFFECT_RISK_MISMATCH' }),
    )
  })

  it.each([
    ['delete grant', (effects: SceneExplorationEffect[]) => effects.splice(indexOf(effects, 'scene-item-spawned'), 1)],
    ['duplicate grant', (effects: SceneExplorationEffect[]) => {
      const grant = effects[indexOf(effects, 'scene-item-spawned')]
      effects.splice(indexOf(effects, 'scene-item-spawned') + 1, 0, structuredClone(grant))
    }],
    ['instance ID', (effects: SceneExplorationEffect[]) => {
      const spawn = records(effects)[indexOf(effects, 'scene-item-spawned')]
      ;((spawn.entity as MutableEffect).item as MutableEffect).instanceId = 'forged-id'
    }],
    ['definition ID', (effects: SceneExplorationEffect[]) => {
      const spawn = records(effects)[indexOf(effects, 'scene-item-spawned')]
      ;((spawn.entity as MutableEffect).item as MutableEffect).definitionId = HOSPITAL_ITEM_IDS.metalParts
    }],
    ['quantity', (effects: SceneExplorationEffect[]) => {
      const spawn = records(effects)[indexOf(effects, 'scene-item-spawned')]
      ;((spawn.entity as MutableEffect).item as MutableEffect).quantity = 2
    }],
    ['initial state', (effects: SceneExplorationEffect[]) => {
      const spawn = records(effects)[indexOf(effects, 'scene-item-spawned')]
      ;((spawn.entity as MutableEffect).state as MutableEffect).resource = { kind: 'durability', current: 1 }
    }],
    ['node', (effects: SceneExplorationEffect[]) => {
      records(effects)[indexOf(effects, 'scene-item-spawned')].nodeId = HOSPITAL_NODE_IDS.securityOffice
    }],
    ['order before edge', (effects: SceneExplorationEffect[]) => {
      const spawn = effects.splice(indexOf(effects, 'scene-item-spawned'), 1)[0]
      effects.splice(indexOf(effects, 'scene-edge-enabled'), 0, spawn)
    }],
  ])('rejects toolkit grant tampering: %s', (_label, mutate) => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit, { utility: 'toolkit' })
    mutate(effects)
    expectRejected(start, effects)
  })

  it.each([
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard, { withCard: true } as Setup],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.crowbar, { utility: 'crowbar' } as Setup],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit, { utility: 'toolkit' } as Setup],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.fireAxe, { weapon: 'fireAxe' } as Setup],
    [HOSPITAL_FIRE_DOOR_OPTION_IDS.forceEntry, {}],
  ])('rejects forged formal time for %s', (optionId, setup) => {
    const { start, effects } = plan(optionId, setup)
    const time = records(effects)[indexOf(effects, 'scene-time-resolved')]
    time.actionTimeCost = (time.actionTimeCost as number) + 1
    time.remainingTimeAfter = (time.remainingTimeBefore as number) - (time.actionTimeCost as number)
    time.overtimeDebt = 0
    expectRejected(start, effects)
  })

  it('rejects a deleted or duplicate door-opening Effect', () => {
    const deleted = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard, { withCard: true })
    deleted.effects.splice(indexOf(deleted.effects, 'scene-edge-enabled'), 1)
    expectRejected(deleted.start, deleted.effects)
    const duplicated = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.accessCard, { withCard: true })
    const edge = duplicated.effects[indexOf(duplicated.effects, 'scene-edge-enabled')]
    duplicated.effects.unshift(structuredClone(edge))
    expectRejected(duplicated.start, duplicated.effects)
  })

  it('rejects time inserted into the primary prefix', () => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit, { utility: 'toolkit' })
    const time = effects.splice(indexOf(effects, 'scene-time-resolved'), 1)[0]
    effects.splice(indexOf(effects, 'scene-item-spawned'), 0, time)
    expectRejected(start, effects)
  })

  it('rejects any time Effect after decline', () => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.decline, {})
    effects.push({ kind: 'scene-time-resolved', remainingTimeBefore: 200, actionTimeCost: 1, remainingTimeAfter: 199, overtimeDebt: 0 })
    expectRejected(start, effects)
  })

  it('does not return partial state and replays formal Effects deterministically', () => {
    const { start, effects } = plan(HOSPITAL_FIRE_DOOR_OPTION_IDS.toolkit, { utility: 'toolkit' })
    const expected = applySceneExplorationEffects(start, effects, withSeed)
    expect(applySceneExplorationEffects(start, effects, withSeed)).toEqual(expected)
    const tampered = structuredClone(effects) as SceneExplorationEffect[]
    tampered.splice(indexOf(tampered, 'scene-item-spawned'), 1)
    expectRejected(start, tampered)
    expect(start.enabledEdgeIds).not.toContain(
      hospitalSceneObstacleCatalog.get(HOSPITAL_OBSTACLE_IDS.isolationFireDoor).edgeId,
    )
  })
})
