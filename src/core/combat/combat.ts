import { deepFreeze } from '../config'
import {
  addOpenWound,
  addPendingInfectionExposure,
  applyHealthLoss,
  createPlayerCondition,
  startBleeding,
} from '../condition'
import { calculateBackpackWeightSubtotal } from '../inventory'
import {
  consumeCommittedResource,
  createItemStateCollectionSnapshot,
  getItemState,
  replaceItemState,
} from '../item-state'
import { createCarriedItemContainersSnapshot } from '../quick-slot'
import {
  RANDOM_ALGORITHM_VERSION,
  createRandomCursor,
  createStreamId,
  drawIntInclusive,
} from '../random'
import { CombatError } from './combat-errors'
import type {
  CombatDependencies,
  CombatEffect,
  CombatEncounterSnapshot,
  CombatPlayerActionCommand,
  CombatPreview,
  CombatResolution,
  CombatRiskTier,
  CombatRiskTrace,
  CombatTransitionPlan,
  EnemyDefinition,
  EnemyPersistentCombatState,
  ExplorationCombatUsageSnapshot,
  TemporaryDefenseSnapshot,
} from './combat-types'

const RISK_ORDER: readonly CombatRiskTier[] = ['none', 'low', 'medium', 'high', 'very-high']

export const riskTierToPercent = (
  tier: CombatRiskTier,
  config: CombatDependencies['config'],
): number => config.combat.riskTiers[tier]

export function reduceRiskTier(tier: CombatRiskTier, amount: number): CombatRiskTier {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new CombatError('INVALID_COMBAT_SNAPSHOT', '风险降低量无效')
  }
  return RISK_ORDER[Math.max(0, RISK_ORDER.indexOf(tier) - amount)]
}

export function selectEnemyHealthPhase(currentHealth: number, maxHealth: number) {
  if (currentHealth === 0) return 'incapacitated' as const
  const scaled = currentHealth * 14
  if (scaled >= maxHealth * 11) return 'healthy' as const
  if (scaled >= maxHealth * 7) return 'wounded' as const
  if (scaled >= maxHealth * 3) return 'severely-wounded' as const
  if (scaled >= maxHealth) return 'critical' as const
  return 'incapacitated' as const
}

export function createEnemyPersistentCombatState(
  input: EnemyPersistentCombatState,
  definition: EnemyDefinition,
): EnemyPersistentCombatState {
  if (
    typeof input.enemyInstanceId !== 'string' || input.enemyInstanceId.trim().length === 0 ||
    input.definitionId !== definition.id ||
    !Number.isSafeInteger(input.currentHealth) || input.currentHealth < 0 || input.currentHealth > definition.maxHealth ||
    !definition.actions.some(({ id }) => id === input.currentIntentActionId) ||
    !Number.isSafeInteger(input.nextCycleIndex) || input.nextCycleIndex < 0 || input.nextCycleIndex >= definition.actionCycle.length ||
    !Number.isSafeInteger(input.resolvedActionCount) || input.resolvedActionCount < 0 ||
    typeof input.hasBeenEncountered !== 'boolean' || typeof input.defeated !== 'boolean' ||
    input.defeated !== (input.currentHealth === 0)
  ) throw new CombatError('INVALID_ENEMY_STATE', '敌人持久战斗状态无效')
  return deepFreeze({ ...input })
}

export function createExplorationCombatUsage(
  input: ExplorationCombatUsageSnapshot,
  config: CombatDependencies['config'],
): ExplorationCombatUsageSnapshot {
  if (
    !Number.isSafeInteger(input.metalPipeChargedStrikeUses) ||
    input.metalPipeChargedStrikeUses < 0 ||
    input.metalPipeChargedStrikeUses > config.combat.metalPipe.chargedStrike.maxUsesPerExploration
  ) throw new CombatError('INVALID_COMBAT_SNAPSHOT', '探索战斗使用次数无效')
  return deepFreeze({ ...input })
}

export function createCombatEncounterSnapshot(
  input: CombatEncounterSnapshot,
  dependencies: CombatDependencies,
): CombatEncounterSnapshot {
  const definition = dependencies.enemyCatalog.get(input.enemy.definitionId)
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
  calculateBackpackWeightSubtotal(carried.backpack, dependencies.physicalCatalog)
  const carriedItems = [
    ...carried.backpack.items,
    ...Object.values(carried.equipment).filter((item): item is NonNullable<typeof item> => item !== null),
    ...carried.quickSlots.slots.filter((item): item is NonNullable<typeof item> => item !== null),
  ]
  const itemStates = createItemStateCollectionSnapshot(
    input.itemStates.states,
    carriedItems,
    dependencies.itemResourceCatalog,
  )
  const playerCondition = createPlayerCondition(input.playerCondition, dependencies.config.combat.player)
  const enemy = createEnemyPersistentCombatState(input.enemy, definition)
  const usage = createExplorationCombatUsage(input.usage, dependencies.config)
  if (
    !Number.isSafeInteger(input.currentCtb) || input.currentCtb < 0 ||
    !Number.isSafeInteger(input.playerNextActionCtb) || input.playerNextActionCtb < 0 ||
    !Number.isSafeInteger(input.enemyNextActionCtb) || input.enemyNextActionCtb < 0 ||
    (input.status === 'awaiting-player' &&
      (playerCondition.currentHealth === 0 || enemy.currentHealth === 0 ||
       input.currentCtb !== input.playerNextActionCtb ||
       input.playerNextActionCtb > input.enemyNextActionCtb)) ||
    (input.status === 'victory' && enemy.currentHealth !== 0) ||
    (input.status === 'defeat' && playerCondition.currentHealth !== 0)
  ) throw new CombatError('INVALID_COMBAT_SNAPSHOT', '战斗快照时间或终局状态无效')
  return deepFreeze({
    ...input,
    backpack: carried.backpack,
    equipment: carried.equipment,
    quickSlots: carried.quickSlots,
    itemStates,
    playerCondition,
    enemy,
    usage,
    temporaryDefense: input.temporaryDefense ? { ...input.temporaryDefense } : null,
  })
}

type EncounterInput = Omit<CombatEncounterSnapshot,
  'status' | 'currentCtb' | 'playerNextActionCtb' | 'enemyNextActionCtb' | 'temporaryDefense' | 'enemy'> & {
  readonly enemy: EnemyPersistentCombatState
}

export function createFirstCombatEncounter(
  input: EncounterInput,
  alertState: 'unalerted' | 'alerted',
  dependencies: CombatDependencies,
): CombatEncounterSnapshot {
  const definition = dependencies.enemyCatalog.get(input.enemy.definitionId)
  if (input.enemy.hasBeenEncountered || input.enemy.defeated) {
    throw new CombatError('INVALID_ENEMY_STATE', '首次遭遇需要未遭遇且未击败的敌人')
  }
  return createCombatEncounterSnapshot({
    ...input,
    status: 'awaiting-player',
    currentCtb: 0,
    playerNextActionCtb: 0,
    enemyNextActionCtb: alertState === 'alerted'
      ? dependencies.config.combat.infectedOrderly.firstActionTime.alerted
      : dependencies.config.combat.infectedOrderly.firstActionTime.unaware,
    enemy: { ...input.enemy, hasBeenEncountered: true, currentIntentActionId: definition.initialIntentActionId },
    temporaryDefense: null,
  }, dependencies)
}

export function createReentryCombatEncounter(
  input: EncounterInput,
  dependencies: CombatDependencies,
): CombatEncounterSnapshot {
  if (!input.enemy.hasBeenEncountered || input.enemy.defeated) {
    throw new CombatError('INVALID_ENEMY_STATE', '重入需要已遭遇且未击败的敌人')
  }
  return createCombatEncounterSnapshot({
    ...input,
    status: 'awaiting-player',
    currentCtb: 0,
    playerNextActionCtb: 0,
    enemyNextActionCtb: dependencies.config.combat.infectedOrderly.firstActionTime.reentry,
    temporaryDefense: null,
  }, dependencies)
}

function resourceState(snapshot: CombatEncounterSnapshot, slot: 'weapon' | 'armor') {
  const item = snapshot.equipment[slot]
  return item ? getItemState(snapshot.itemStates, item.instanceId) : null
}

export function getAvailableCombatPlayerActions(
  snapshot: CombatEncounterSnapshot,
  dependencies: CombatDependencies,
): readonly CombatPlayerActionCommand['kind'][] {
  if (snapshot.status !== 'awaiting-player') return deepFreeze([])
  const weapon = snapshot.equipment.weapon
  const state = resourceState(snapshot, 'weapon')
  const usablePipe = weapon?.definitionId === dependencies.bindings.metalPipeDefinitionId &&
    state?.resource.kind === 'durability' && state.resource.current >= 1
  const actions: CombatPlayerActionCommand['kind'][] = ['defend']
  if (usablePipe) {
    actions.push('metal-pipe-basic-attack')
    if (snapshot.usage.metalPipeChargedStrikeUses < dependencies.config.combat.metalPipe.chargedStrike.maxUsesPerExploration) {
      actions.push('metal-pipe-charged-strike')
    }
  } else actions.push('temporary-attack')
  return deepFreeze(actions.sort())
}

function addRisk(
  effects: CombatEffect[],
  snapshot: CombatEncounterSnapshot,
  actionId: string,
  resolvedActionCount: number,
  purpose: 'injury' | 'infection-exposure',
  originalTier: CombatRiskTier,
  finalTier: CombatRiskTier,
  usedHeavyCoat: boolean,
  usedDefense: boolean,
  dependencies: CombatDependencies,
): CombatRiskTrace {
  const streamId = createStreamId(
    'combat-risk', dependencies.sceneInstanceId, snapshot.enemy.enemyInstanceId,
    String(resolvedActionCount), actionId, purpose,
  )
  const draw = drawIntInclusive(createRandomCursor(dependencies.runSeed, streamId), 1, 100)
  const riskPercent = riskTierToPercent(finalTier, dependencies.config)
  const trace = deepFreeze({
    algorithmVersion: RANDOM_ALGORITHM_VERSION,
    streamId,
    drawIndex: draw.nextCursor.drawIndex - 1,
    roll: draw.value,
    originalTier,
    finalTier,
    riskPercent,
    succeeded: draw.value <= riskPercent,
    usedHeavyCoat,
    usedDefense,
  })
  effects.push({ kind: 'combat-risk-resolved', purpose, ...trace })
  return trace
}

function stableWoundId(enemyInstanceId: string, actionCount: number, actionId: string) {
  return ['combat-wound', enemyInstanceId, String(actionCount), actionId, 'injury']
    .map(encodeURIComponent).join(':')
}

function buildCombatTransitionPlan(
  snapshot: CombatEncounterSnapshot,
  command: CombatPlayerActionCommand,
  dependencies: CombatDependencies,
): CombatTransitionPlan {
  if (snapshot.status !== 'awaiting-player') throw new CombatError('COMBAT_NOT_ACTIVE', '战斗不在玩家决策点')
  if (!getAvailableCombatPlayerActions(snapshot, dependencies).includes(command.kind)) {
    throw new CombatError('ACTION_NOT_AVAILABLE', '玩家战斗行动不可用')
  }
  const effects: CombatEffect[] = []
  let playerHealth = snapshot.playerCondition.currentHealth
  let enemyHealth = snapshot.enemy.currentHealth
  let playerNext = snapshot.playerNextActionCtb
  let enemyNext = snapshot.enemyNextActionCtb
  let defense: TemporaryDefenseSnapshot | null = snapshot.temporaryDefense
  let intentId = snapshot.enemy.currentIntentActionId
  let nextCycleIndex = snapshot.enemy.nextCycleIndex
  let resolvedActionCount = snapshot.enemy.resolvedActionCount
  let usage = snapshot.usage.metalPipeChargedStrikeUses
  let bleeding = snapshot.playerCondition.bleeding
  let pendingExposures = snapshot.playerCondition.pendingInfectionExposures
  let weaponResourceCurrent = resourceState(snapshot, 'weapon')?.resource.kind === 'durability'
    ? (resourceState(snapshot, 'weapon')!.resource as { readonly current: number }).current
    : null
  let armorResourceCurrent = resourceState(snapshot, 'armor')?.resource.kind === 'integrity'
    ? (resourceState(snapshot, 'armor')!.resource as { readonly current: number }).current
    : null

  const consume = (slot: 'weapon' | 'armor', requestedCost: number, source: string) => {
    const item = snapshot.equipment[slot]!
    const original = getItemState(snapshot.itemStates, item.instanceId)
    const simulatedCurrent = slot === 'weapon' ? weaponResourceCurrent : armorResourceCurrent
    const state = simulatedCurrent === null || original.resource.kind === 'none'
      ? original
      : { ...original, resource: { kind: original.resource.kind, current: simulatedCurrent } }
    const result = consumeCommittedResource(state, requestedCost)
    effects.push({
      kind: 'item-resource-consumed', source, slot, instanceId: item.instanceId,
      definitionId: item.definitionId, resourceKind: state.resource.kind,
      currentBefore: result.currentBefore, requestedCost, consumed: result.consumed,
      currentAfter: result.currentAfter, depleted: result.depleted,
    })
    if (slot === 'weapon') weaponResourceCurrent = result.currentAfter
    else armorResourceCurrent = result.currentAfter
  }

  let actionCtb: number
  if (command.kind === 'metal-pipe-basic-attack' || command.kind === 'metal-pipe-charged-strike') {
    const rules = command.kind === 'metal-pipe-basic-attack'
      ? dependencies.config.combat.metalPipe.basicAttack
      : dependencies.config.combat.metalPipe.chargedStrike
    consume('weapon', rules.durabilityCost, command.kind)
    const actual = Math.min(enemyHealth, rules.damage)
    effects.push({ kind: 'enemy-health-lost', source: command.kind, healthBefore: enemyHealth, requestedLoss: rules.damage, actualLoss: actual, healthAfter: enemyHealth - actual })
    enemyHealth -= actual
    actionCtb = rules.ctb
    if (command.kind === 'metal-pipe-charged-strike') {
      const chargedRules = dependencies.config.combat.metalPipe.chargedStrike
      effects.push({ kind: 'enemy-action-delayed', enemyNextActionCtbBefore: enemyNext, delay: chargedRules.enemyActionDelay, enemyNextActionCtbAfter: enemyNext + chargedRules.enemyActionDelay })
      enemyNext += chargedRules.enemyActionDelay
      effects.push({ kind: 'combat-usage-changed', usage: 'metal-pipe-charged-strike', before: usage, after: usage + 1 })
      usage += 1
    }
  } else if (command.kind === 'temporary-attack') {
    const rules = dependencies.config.combat.temporaryAttack
    const actual = Math.min(enemyHealth, rules.damage)
    effects.push({ kind: 'enemy-health-lost', source: command.kind, healthBefore: enemyHealth, requestedLoss: rules.damage, actualLoss: actual, healthAfter: enemyHealth - actual })
    enemyHealth -= actual
    actionCtb = rules.ctb
  } else {
    actionCtb = dependencies.config.combat.defend.ctb
    defense = {
      activatedAtCtb: snapshot.currentCtb,
      expiresAtPlayerActionCtb: snapshot.currentCtb + actionCtb,
      availableDirectAttackUses: 1,
    }
    effects.push({ kind: 'temporary-defense-activated', before: snapshot.temporaryDefense, after: defense })
  }

  if (snapshot.playerCondition.bleeding) {
    const requested = dependencies.config.combat.postPlayerActionBleedingDamage
    const actual = Math.min(playerHealth, requested)
    effects.push({ kind: 'player-health-lost', source: 'post-player-action-bleeding', healthBefore: playerHealth, requestedLoss: requested, actualLoss: actual, healthAfter: playerHealth - actual })
    playerHealth -= actual
  }
  if (playerHealth === 0) {
    effects.push({ kind: 'combat-status-changed', from: 'awaiting-player', to: 'defeat', reason: 'player-death' })
    return deepFreeze({ command, effects })
  }
  if (enemyHealth === 0) {
    effects.push({ kind: 'combat-status-changed', from: 'awaiting-player', to: 'victory', reason: 'enemy-defeated' })
    return deepFreeze({ command, effects })
  }

  playerNext = snapshot.currentCtb + actionCtb
  effects.push({
    kind: 'combat-ctb-position-changed', reason: 'player-action-scheduled',
    currentCtbBefore: snapshot.currentCtb, currentCtbAfter: snapshot.currentCtb,
    playerNextActionCtbBefore: snapshot.playerNextActionCtb, playerNextActionCtbAfter: playerNext,
    enemyNextActionCtbBefore: enemyNext, enemyNextActionCtbAfter: enemyNext,
  })

  while (enemyNext < playerNext && playerHealth > 0 && enemyHealth > 0) {
    const definition = dependencies.enemyCatalog.get(snapshot.enemy.definitionId)
    const action = definition.actions.find(({ id }) => id === intentId) ??
      definition.actions.find(({ kind }) => kind === 'scratch')!
    const actionRules = action.kind === 'scratch'
      ? dependencies.config.combat.infectedOrderly.actions.scratch
      : dependencies.config.combat.infectedOrderly.actions.lungeBite
    const armor = snapshot.equipment.armor
    const armorState = armor ? getItemState(snapshot.itemStates, armor.instanceId) : null
    const usedHeavyCoat = armor?.definitionId === dependencies.bindings.heavyCoatDefinitionId &&
      armorState?.resource.kind === 'integrity' && (armorResourceCurrent ?? 0) >= 1
    const activeDefense = defense
    const usedDefense = activeDefense !== null
    if (usedHeavyCoat) consume('armor', dependencies.config.combat.heavyCoat.integrityCostPerAttack, 'enemy-direct-attack-protection')
    let damage = Math.max(0, actionRules.damage - (usedHeavyCoat ? dependencies.config.combat.heavyCoat.directDamageReduction : 0))
    if (usedDefense) {
      damage = Math.ceil(damage * dependencies.config.combat.defend.remainingDamagePercent / 100)
      effects.push({ kind: 'temporary-defense-consumed', before: activeDefense!, after: null, enemyActionId: action.id })
      defense = null
    }
    const actual = Math.min(playerHealth, damage)
    effects.push({ kind: 'player-health-lost', source: action.id, healthBefore: playerHealth, requestedLoss: damage, actualLoss: actual, healthAfter: playerHealth - actual })
    playerHealth -= actual
    if (playerHealth === 0) {
      effects.push({
        kind: 'combat-ctb-position-changed', reason: 'enemy-action-terminal',
        currentCtbBefore: snapshot.currentCtb, currentCtbAfter: enemyNext,
        playerNextActionCtbBefore: playerNext, playerNextActionCtbAfter: playerNext,
        enemyNextActionCtbBefore: enemyNext, enemyNextActionCtbAfter: enemyNext,
      })
      effects.push({ kind: 'combat-status-changed', from: 'awaiting-player', to: 'defeat', reason: 'player-death' })
      break
    }
    const injuryTier = reduceRiskTier(actionRules.injuryRiskTier,
      (usedHeavyCoat ? dependencies.config.combat.heavyCoat.injuryRiskTierReduction : 0) +
      (usedDefense ? dependencies.config.combat.defend.injuryRiskTierReduction : 0))
    const injury = addRisk(effects, snapshot, action.id, resolvedActionCount, 'injury', actionRules.injuryRiskTier, injuryTier, usedHeavyCoat, usedDefense, dependencies)
    if (injury.succeeded) {
      const wound = {
        id: stableWoundId(snapshot.enemy.enemyInstanceId, resolvedActionCount, action.id),
        kind: action.kind === 'scratch' ? 'laceration' as const : 'bite' as const,
        treatment: 'untreated' as const,
      }
      effects.push({ kind: 'open-wound-added', wound })
      if (!bleeding) {
        effects.push({ kind: 'bleeding-changed', before: false, after: true, source: action.id })
        bleeding = true
      }
    }
    if (actionRules.exposureRiskTier !== 'none') {
      const exposureTier = reduceRiskTier(actionRules.exposureRiskTier,
        usedHeavyCoat ? dependencies.config.combat.heavyCoat.exposureRiskTierReduction : 0)
      const exposure = addRisk(effects, snapshot, action.id, resolvedActionCount, 'infection-exposure', actionRules.exposureRiskTier, exposureTier, usedHeavyCoat, false, dependencies)
      if (exposure.succeeded) {
        effects.push({ kind: 'infection-exposure-added', before: pendingExposures, added: 1, after: pendingExposures + 1 })
        pendingExposures += 1
      }
    }
    const nextIntentId = definition.actionCycle[nextCycleIndex]
    const followingIndex = (nextCycleIndex + 1) % definition.actionCycle.length
    effects.push({
      kind: 'enemy-intent-changed', intentBefore: intentId, intentAfter: nextIntentId,
      nextCycleIndexBefore: nextCycleIndex, nextCycleIndexAfter: followingIndex,
      resolvedActionCountBefore: resolvedActionCount, resolvedActionCountAfter: resolvedActionCount + 1,
    })
    intentId = nextIntentId
    nextCycleIndex = followingIndex
    resolvedActionCount += 1
    const nextEnemy = enemyNext + actionRules.ctb
    effects.push({
      kind: 'combat-ctb-position-changed', reason: 'enemy-action-resolved',
      currentCtbBefore: snapshot.currentCtb, currentCtbAfter: enemyNext,
      playerNextActionCtbBefore: playerNext, playerNextActionCtbAfter: playerNext,
      enemyNextActionCtbBefore: enemyNext, enemyNextActionCtbAfter: nextEnemy,
    })
    enemyNext = nextEnemy
  }
  if (playerHealth > 0 && enemyHealth > 0) {
    effects.push({
      kind: 'combat-ctb-position-changed', reason: 'player-decision-point',
      currentCtbBefore: snapshot.currentCtb, currentCtbAfter: playerNext,
      playerNextActionCtbBefore: playerNext, playerNextActionCtbAfter: playerNext,
      enemyNextActionCtbBefore: enemyNext, enemyNextActionCtbAfter: enemyNext,
    })
    if (defense && defense.expiresAtPlayerActionCtb <= playerNext) {
      effects.push({ kind: 'temporary-defense-expired', before: defense, after: null })
    }
  }
  return deepFreeze({ command, effects })
}

export function applyCombatEffects(
  initial: CombatEncounterSnapshot,
  command: CombatPlayerActionCommand,
  effects: readonly CombatEffect[],
  dependencies: CombatDependencies,
): CombatEncounterSnapshot {
  const start = createCombatEncounterSnapshot(initial, dependencies)
  const expected = buildCombatTransitionPlan(start, command, dependencies)
  if (JSON.stringify(effects) !== JSON.stringify(expected.effects)) {
    throw new CombatError('INVALID_COMBAT_EFFECTS', 'Combat Effects与唯一正式计划不一致')
  }
  let state = start
  for (const effect of effects) {
    const value = effect as Record<string, unknown>
    switch (effect.kind) {
      case 'item-resource-consumed': {
        const item = state.equipment[value.slot as 'weapon' | 'armor']!
        const current = getItemState(state.itemStates, item.instanceId)
        const result = consumeCommittedResource(current, value.requestedCost as number)
        state = deepFreeze({ ...state, itemStates: replaceItemState(state.itemStates, result.state) })
        break
      }
      case 'enemy-health-lost':
        state = deepFreeze({ ...state, enemy: { ...state.enemy, currentHealth: value.healthAfter as number, defeated: (value.healthAfter as number) === 0 } })
        break
      case 'enemy-action-delayed':
        state = deepFreeze({ ...state, enemyNextActionCtb: value.enemyNextActionCtbAfter as number })
        break
      case 'combat-usage-changed':
        state = deepFreeze({ ...state, usage: { metalPipeChargedStrikeUses: value.after as number } })
        break
      case 'temporary-defense-activated':
        state = deepFreeze({ ...state, temporaryDefense: value.after as TemporaryDefenseSnapshot })
        break
      case 'temporary-defense-consumed':
      case 'temporary-defense-expired':
        state = deepFreeze({ ...state, temporaryDefense: null })
        break
      case 'player-health-lost':
        state = deepFreeze({ ...state, playerCondition: applyHealthLoss(state.playerCondition, value.requestedLoss as number, dependencies.config.combat.player).state })
        break
      case 'combat-risk-resolved':
        break
      case 'open-wound-added':
        state = deepFreeze({ ...state, playerCondition: addOpenWound(state.playerCondition, value.wound as never) })
        break
      case 'bleeding-changed':
        state = deepFreeze({ ...state, playerCondition: startBleeding(state.playerCondition) })
        break
      case 'infection-exposure-added':
        state = deepFreeze({ ...state, playerCondition: addPendingInfectionExposure(state.playerCondition) })
        break
      case 'enemy-intent-changed':
        state = deepFreeze({ ...state, enemy: {
          ...state.enemy,
          currentIntentActionId: value.intentAfter as string,
          nextCycleIndex: value.nextCycleIndexAfter as number,
          resolvedActionCount: value.resolvedActionCountAfter as number,
        } })
        break
      case 'combat-ctb-position-changed':
        state = deepFreeze({
          ...state,
          currentCtb: value.currentCtbAfter as number,
          playerNextActionCtb: value.playerNextActionCtbAfter as number,
          enemyNextActionCtb: value.enemyNextActionCtbAfter as number,
        })
        break
      case 'combat-status-changed':
        state = deepFreeze({ ...state, status: value.to as CombatEncounterSnapshot['status'] })
        break
    }
  }
  return createCombatEncounterSnapshot(state, dependencies)
}

export function resolveCombatPlayerAction(
  snapshot: CombatEncounterSnapshot,
  command: CombatPlayerActionCommand,
  dependencies: CombatDependencies,
): CombatResolution {
  const initial = createCombatEncounterSnapshot(snapshot, dependencies)
  const plan = buildCombatTransitionPlan(initial, command, dependencies)
  return deepFreeze({ plan, snapshot: applyCombatEffects(initial, command, plan.effects, dependencies) })
}

export function previewCombatPlayerAction(
  snapshot: CombatEncounterSnapshot,
  command: CombatPlayerActionCommand,
  dependencies: CombatDependencies,
): CombatPreview {
  try {
    const result = resolveCombatPlayerAction(snapshot, command, dependencies)
    return deepFreeze({ canExecute: true, ...result })
  } catch (error) {
    if (error instanceof CombatError) return deepFreeze({ canExecute: false, errorCode: error.code })
    throw error
  }
}
