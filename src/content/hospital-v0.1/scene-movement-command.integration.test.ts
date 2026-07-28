import { describe, expect, it } from 'vitest'
import {
  activatePainkiller,
  addMinorContusion,
  createInitialPlayerCondition,
  createPlayerCondition,
} from '../../core/condition'
import {
  createBackpackSnapshot,
  type BackpackPlacement,
  type ItemInstance,
} from '../../core/inventory'
import {
  createInitialSceneExplorationSnapshot,
  previewSceneMoveCommand,
  resolveSceneMoveCommand,
} from '../../core/scene-exploration'
import {
  HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
  HOSPITAL_EDGE_IDS,
  HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS,
  HOSPITAL_NODE_IDS,
  hospitalSliceV01SceneGraph,
} from './hospital-scene-graph'
import { hospitalSliceV01RuleConfig as config } from './rule-config'
import { hospitalItemCatalog } from './items'
import { HOSPITAL_ITEM_IDS } from './items/hospital-item-ids'

const dependencies = {
  graph: hospitalSliceV01SceneGraph,
  physicalCatalog: hospitalItemCatalog,
  config,
}
const at = (instanceId: string, x: number, y: number): BackpackPlacement => ({
  instanceId,
  x,
  y,
  rotated: false,
})
const backpack = (
  items: readonly ItemInstance[] = [],
  placements: readonly BackpackPlacement[] = [],
) =>
  createBackpackSnapshot(
    {
      width: config.backpack.width,
      height: config.backpack.height,
      items,
      placements,
    },
    hospitalItemCatalog,
  )
const condition = (
  currentHealth = config.combat.player.maxHealth,
  bleeding = false,
  minorContusions = 0,
  painkillerActive = false,
) =>
  createPlayerCondition(
    {
      currentHealth,
      bleeding,
      untreatedOpenWounds: bleeding ? 1 : 0,
      treatedOpenWounds: 0,
      minorContusions,
      painkillerActive,
    },
    config.combat.player,
  )
const scene = (
  currentNodeId: string,
  remainingTime = config.scene.totalTime,
  inventory = backpack(),
  playerCondition = condition(),
  enabledEdgeIds: readonly string[] = HOSPITAL_ALWAYS_TRAVERSABLE_EDGE_IDS,
) =>
  createInitialSceneExplorationSnapshot(
    {
      currentNodeId,
      remainingTime,
      enabledEdgeIds,
      backpack: inventory,
      condition: playerCondition,
    },
    dependencies,
  )

describe('hospital scene movement command', () => {
  it('moves from the elevator anteroom to the emergency hall using the formal edge', () => {
    const result = resolveSceneMoveCommand(
      scene(HOSPITAL_NODE_IDS.elevatorAnteroom),
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      dependencies,
    )
    expect(result.result).toMatchObject({
      destinationNodeId: HOSPITAL_NODE_IDS.emergencyHall,
      baseMovementTime: config.scene.movementEdgeTime,
      finalMovementTime: 10,
      backpackWeight: 0,
      loadTier: 'normal',
    })
    expect(result.snapshot).toMatchObject({
      status: 'active',
      currentNodeId: HOSPITAL_NODE_IDS.emergencyHall,
      remainingTime: config.scene.totalTime - 10,
    })
    expect(result.result.effects.map((effect) => effect.kind)).toEqual([
      'scene-node-changed',
      'scene-time-resolved',
    ])
  })

  it('rejects the formal fire-door edge while it is not enabled', () => {
    const input = scene(HOSPITAL_NODE_IDS.emergencyHall)
    expect(
      previewSceneMoveCommand(
        input,
        { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToIsolationCorridor },
        dependencies,
      ),
    ).toEqual({ canExecute: false, rejectionCode: 'EDGE_NOT_ENABLED' })
    expect(input.currentNodeId).toBe(HOSPITAL_NODE_IDS.emergencyHall)
    expect(input.remainingTime).toBe(config.scene.totalTime)
  })

  it.each([
    [0, false, false, 10],
    [17, false, false, 11],
    [0, true, false, 11],
    [17, true, false, 13],
    [17, true, true, 11],
  ])('uses formal movement modifiers for weight %i contusion=%s analgesia=%s', (weight, contused, analgesia, expected) => {
    const items =
      weight === 0
        ? []
        : [
            { instanceId: 'metal', definitionId: HOSPITAL_ITEM_IDS.metalParts, quantity: 5 },
            { instanceId: 'electronics', definitionId: HOSPITAL_ITEM_IDS.electronicComponents, quantity: 5 },
            { instanceId: 'fabric', definitionId: HOSPITAL_ITEM_IDS.fabric, quantity: 5 },
            { instanceId: 'bandages', definitionId: HOSPITAL_ITEM_IDS.bandage, quantity: weight - 15 },
          ]
    const placements =
      weight === 0
        ? []
        : [at('metal', 0, 0), at('electronics', 1, 0), at('fabric', 2, 0), at('bandages', 3, 0)]
    let state = createInitialPlayerCondition(config.combat.player)
    if (contused) state = addMinorContusion(state)
    if (analgesia) state = activatePainkiller(state)
    const result = resolveSceneMoveCommand(
      scene(HOSPITAL_NODE_IDS.elevatorAnteroom, config.scene.totalTime, backpack(items, placements), state),
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      dependencies,
    )
    expect(result.result.finalMovementTime).toBe(expected)
  })

  it('keeps the formal overloaded contusion return at 42 and analgesia at 38', () => {
    const inventory = backpack(
      [
        { instanceId: 'metal', definitionId: HOSPITAL_ITEM_IDS.metalParts, quantity: 5 },
        { instanceId: 'electronics', definitionId: HOSPITAL_ITEM_IDS.electronicComponents, quantity: 5 },
        { instanceId: 'fabric', definitionId: HOSPITAL_ITEM_IDS.fabric, quantity: 5 },
        { instanceId: 'axe', definitionId: HOSPITAL_ITEM_IDS.fireAxe, quantity: 1 },
        { instanceId: 'toolkit', definitionId: HOSPITAL_ITEM_IDS.toolkit, quantity: 1 },
        { instanceId: 'sample', definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase, quantity: 1 },
      ],
      [at('metal', 0, 0), at('electronics', 1, 0), at('fabric', 2, 0), at('axe', 0, 1), at('toolkit', 2, 1), at('sample', 4, 1)],
    )
    const contused = addMinorContusion(createInitialPlayerCondition(config.combat.player))
    const base = scene(HOSPITAL_NODE_IDS.isolationCorridor, 100, inventory, contused, HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS)
    const result = resolveSceneMoveCommand(base, { edgeId: HOSPITAL_EDGE_IDS.isolationCorridorToSpecimenColdRoom }, dependencies)
    expect(result.result.backpackWeight).toBe(28)
    expect(result.result.returnRoute).toMatchObject({ baseReturnTime: 30, estimatedReturnTime: 42 })
    const suppressed = resolveSceneMoveCommand(
      scene(HOSPITAL_NODE_IDS.isolationCorridor, 100, inventory, activatePainkiller(contused), HOSPITAL_FIRE_DOOR_ROUTE_EDGE_IDS),
      { edgeId: HOSPITAL_EDGE_IDS.isolationCorridorToSpecimenColdRoom },
      dependencies,
    )
    expect(suppressed.result.returnRoute.estimatedReturnTime).toBe(38)
  })

  it('allows overtime movement and then performs a forced return', () => {
    const result = resolveSceneMoveCommand(
      scene(HOSPITAL_NODE_IDS.emergencyHall, 5),
      { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy },
      dependencies,
    )
    expect(result.result.sceneOutcome).toMatchObject({
      overtimeDebt: 5,
      forcedReturnBaseDamage: 2,
    })
    expect(result.snapshot).toMatchObject({
      status: 'forced-returned',
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
      remainingTime: 0,
    })
  })

  it('settles configured bleeding once after movement', () => {
    const result = resolveSceneMoveCommand(
      scene(HOSPITAL_NODE_IDS.elevatorAnteroom, 100, backpack(), condition(2, true)),
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      dependencies,
    )
    expect(result.snapshot.condition.currentHealth).toBe(1)
    expect(result.result.effects.filter((effect) => effect.kind === 'health-lost')).toEqual([
      expect.objectContaining({ source: 'post-action-bleeding', requestedLoss: 1, actualLoss: 1 }),
    ])
  })

  it('keeps the movement destination when bleeding death outranks forced return', () => {
    const result = resolveSceneMoveCommand(
      scene(HOSPITAL_NODE_IDS.emergencyHall, 5, backpack(), condition(1, true)),
      { edgeId: HOSPITAL_EDGE_IDS.emergencyHallToPharmacy },
      dependencies,
    )
    expect(result.snapshot).toMatchObject({
      status: 'dead',
      currentNodeId: HOSPITAL_NODE_IDS.pharmacy,
    })
    expect(result.result.effects.some((effect) => effect.kind === 'scene-node-changed' && effect.reason === 'forced-return')).toBe(false)
  })

  it('marks an active move into the elevator safety node as safe-returned', () => {
    const result = resolveSceneMoveCommand(
      scene(HOSPITAL_NODE_IDS.emergencyHall),
      { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall },
      dependencies,
    )
    expect(result.snapshot).toMatchObject({
      status: 'safe-returned',
      currentNodeId: HOSPITAL_NODE_IDS.elevatorAnteroom,
    })
  })

  it('rejects formal cannot-carry weight 29 without changing state', () => {
    const inventory = backpack(
      [
        { instanceId: 'metal', definitionId: HOSPITAL_ITEM_IDS.metalParts, quantity: 5 },
        { instanceId: 'electronics', definitionId: HOSPITAL_ITEM_IDS.electronicComponents, quantity: 5 },
        { instanceId: 'fabric', definitionId: HOSPITAL_ITEM_IDS.fabric, quantity: 5 },
        { instanceId: 'axe', definitionId: HOSPITAL_ITEM_IDS.fireAxe, quantity: 1 },
        { instanceId: 'toolkit', definitionId: HOSPITAL_ITEM_IDS.toolkit, quantity: 1 },
        { instanceId: 'sample', definitionId: HOSPITAL_ITEM_IDS.sealedPathogenCase, quantity: 1 },
        { instanceId: 'bandage', definitionId: HOSPITAL_ITEM_IDS.bandage, quantity: 1 },
      ],
      [at('metal', 0, 0), at('electronics', 1, 0), at('fabric', 2, 0), at('axe', 0, 1), at('toolkit', 2, 1), at('sample', 4, 1), at('bandage', 3, 0)],
    )
    const input = scene(HOSPITAL_NODE_IDS.elevatorAnteroom, 100, inventory)
    expect(previewSceneMoveCommand(input, { edgeId: HOSPITAL_EDGE_IDS.elevatorToEmergencyHall }, dependencies)).toEqual({
      canExecute: false,
      rejectionCode: 'CANNOT_CARRY',
    })
    expect(input.remainingTime).toBe(100)
  })
})
