import { deepFreeze } from '../config'
import { createPlayerCondition } from '../condition'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { createItemStateCollectionSnapshot } from '../item-state'
import { createCarriedItemContainersSnapshot } from '../quick-slot'
import { validateCombatDependencies } from './combat-dependencies'
import { CombatError } from './combat-errors'
import {
  createEnemyPersistentCombatState,
  createExplorationCombatUsage,
} from './enemy-persistent-state'
import { hasExactObjectKeys } from './combat-validation'
import type {
  CombatDependencies,
  CombatEncounterSnapshot,
  EnemyPersistentCombatState,
} from './combat-types'

const COMBAT_SNAPSHOT_KEYS = [
  'backpack',
  'currentCtb',
  'enemy',
  'enemyNextActionCtb',
  'equipment',
  'itemStates',
  'playerCondition',
  'playerNextActionCtb',
  'quickSlots',
  'status',
  'temporaryDefense',
  'usage',
] as const

type EncounterInput = Omit<
  CombatEncounterSnapshot,
  'status' | 'currentCtb' | 'playerNextActionCtb' |
  'enemyNextActionCtb' | 'temporaryDefense' | 'enemy'
> & { readonly enemy: EnemyPersistentCombatState }

export function createCombatEncounterSnapshot(
  input: CombatEncounterSnapshot,
  dependencies: CombatDependencies,
): CombatEncounterSnapshot {
  validateCombatDependencies(dependencies)
  if (!hasExactObjectKeys(input, COMBAT_SNAPSHOT_KEYS)) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '战斗快照顶层字段无效')
  }
  if (
    input.status !== 'awaiting-player' &&
    input.status !== 'victory' &&
    input.status !== 'defeat'
  ) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '未知战斗状态')
  }
  if (input.enemy.definitionId !== dependencies.bindings.enemyDefinitionId) {
    throw new CombatError(
      'COMBAT_CONTENT_BINDING_MISMATCH',
      '战斗快照敌人与内容绑定不一致',
    )
  }

  const definition = dependencies.enemyCatalog.get(
    dependencies.bindings.enemyDefinitionId,
  )
  const carried = createCarriedItemContainersSnapshot(
    input.backpack,
    input.equipment,
    input.quickSlots,
    {
      physicalCatalog: dependencies.physicalCatalog,
      equipmentCatalog: dependencies.equipmentCatalog,
      quickSlotCatalog: dependencies.quickSlotCatalog,
    },
  )
  if (
    carried.backpack.width !== dependencies.config.backpack.width ||
    carried.backpack.height !== dependencies.config.backpack.height ||
    carried.quickSlots.slots.length !== dependencies.config.backpack.quickSlotCount
  ) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '战斗携带容器与版本配置不一致')
  }
  calculateBackpackWeightSubtotal(carried.backpack, dependencies.physicalCatalog)
  const carriedItems = [
    ...carried.backpack.items,
    ...Object.values(carried.equipment).filter(
      (item): item is NonNullable<typeof item> => item !== null,
    ),
    ...carried.quickSlots.slots.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    ),
  ]
  const itemStates = createItemStateCollectionSnapshot(
    input.itemStates.states,
    carriedItems,
    dependencies.itemResourceCatalog,
  )
  const playerCondition = createPlayerCondition(
    input.playerCondition,
    dependencies.config.combat.player,
  )
  const enemy = createEnemyPersistentCombatState(input.enemy, definition)
  const usage = createExplorationCombatUsage(input.usage, dependencies.config)
  if (
    !Number.isSafeInteger(input.currentCtb) || input.currentCtb < 0 ||
    !Number.isSafeInteger(input.playerNextActionCtb) || input.playerNextActionCtb < 0 ||
    !Number.isSafeInteger(input.enemyNextActionCtb) || input.enemyNextActionCtb < 0 ||
    input.temporaryDefense !== null
  ) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '战斗快照时间或临时防御无效')
  }

  const awaitingPlayer = input.status === 'awaiting-player' &&
    playerCondition.currentHealth > 0 &&
    enemy.currentHealth > 0 &&
    input.currentCtb === input.playerNextActionCtb &&
    input.playerNextActionCtb <= input.enemyNextActionCtb
  const victory = input.status === 'victory' &&
    playerCondition.currentHealth > 0 && enemy.currentHealth === 0
  const defeat = input.status === 'defeat' && playerCondition.currentHealth === 0
  if (!awaitingPlayer && !victory && !defeat) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '战斗快照状态判别无效')
  }

  return deepFreeze({
    status: input.status,
    currentCtb: input.currentCtb,
    playerNextActionCtb: input.playerNextActionCtb,
    enemyNextActionCtb: input.enemyNextActionCtb,
    playerCondition,
    backpack: carried.backpack,
    equipment: carried.equipment,
    quickSlots: carried.quickSlots,
    itemStates,
    enemy,
    usage,
    temporaryDefense: null,
  })
}

export function createFirstCombatEncounter(
  input: EncounterInput,
  alertState: 'unalerted' | 'alerted',
  dependencies: CombatDependencies,
): CombatEncounterSnapshot {
  validateCombatDependencies(dependencies)
  const definition = dependencies.enemyCatalog.get(
    dependencies.bindings.enemyDefinitionId,
  )
  const cleanEnemy = createEnemyPersistentCombatState(input.enemy, definition)
  if (cleanEnemy.hasBeenEncountered || cleanEnemy.defeated) {
    throw new CombatError('INVALID_ENEMY_STATE', '首次遭遇需要干净的未遭遇敌人')
  }
  return createCombatEncounterSnapshot({
    ...input,
    status: 'awaiting-player',
    currentCtb: 0,
    playerNextActionCtb: 0,
    enemyNextActionCtb: alertState === 'alerted'
      ? dependencies.config.combat.infectedOrderly.firstActionTime.alerted
      : dependencies.config.combat.infectedOrderly.firstActionTime.unaware,
    enemy: {
      ...cleanEnemy,
      hasBeenEncountered: true,
    },
    temporaryDefense: null,
  }, dependencies)
}

export function createReentryCombatEncounter(
  input: EncounterInput,
  dependencies: CombatDependencies,
): CombatEncounterSnapshot {
  validateCombatDependencies(dependencies)
  const definition = dependencies.enemyCatalog.get(
    dependencies.bindings.enemyDefinitionId,
  )
  const enemy = createEnemyPersistentCombatState(input.enemy, definition)
  if (!enemy.hasBeenEncountered || enemy.defeated) {
    throw new CombatError('INVALID_ENEMY_STATE', '重入需要已遭遇且未击败的敌人')
  }
  return createCombatEncounterSnapshot({
    ...input,
    status: 'awaiting-player',
    currentCtb: 0,
    playerNextActionCtb: 0,
    enemyNextActionCtb:
      dependencies.config.combat.infectedOrderly.firstActionTime.reentry,
    enemy,
    temporaryDefense: null,
  }, dependencies)
}
