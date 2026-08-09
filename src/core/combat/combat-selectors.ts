import { deepFreeze } from '../config'
import { getUntreatedOpenWounds } from '../condition'
import { getItemState } from '../item-state'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { classifyLoad } from '../load'
import { validateCombatDependencies } from './combat-dependencies'
import { createCombatEncounterSnapshot } from './combat-snapshot'
import type {
  CombatDependencies,
  CombatEncounterSnapshot,
  CombatPlayerActionCommand,
} from './combat-types'

export function getCombatResourceState(
  snapshot: CombatEncounterSnapshot,
  slot: 'weapon' | 'armor',
) {
  const item = snapshot.equipment[slot]
  return item ? getItemState(snapshot.itemStates, item.instanceId) : null
}

export function getAvailableCombatPlayerActionsFromValidatedSnapshot(
  snapshot: CombatEncounterSnapshot,
  dependencies: CombatDependencies,
): readonly CombatPlayerActionCommand['kind'][] {
  const commands = getAvailableCombatPlayerCommandsFromValidatedSnapshot(
    snapshot,
    dependencies,
  )
  return deepFreeze([...new Set(commands.map(({ kind }) => kind))].sort())
}

function commandSortKey(command: CombatPlayerActionCommand): string {
  return command.kind === 'use-quick-slot-item'
    ? `${command.kind}|${command.quickSlotIndex}|${command.targetOpenWoundId ?? ''}`
    : command.kind
}

export function getAvailableCombatPlayerCommandsFromValidatedSnapshot(
  snapshot: CombatEncounterSnapshot,
  dependencies: CombatDependencies,
): readonly CombatPlayerActionCommand[] {
  if (snapshot.status !== 'awaiting-player') return deepFreeze([])
  const weapon = snapshot.equipment.weapon
  const state = getCombatResourceState(snapshot, 'weapon')
  const usablePipe =
    weapon?.definitionId === dependencies.bindings.metalPipeDefinitionId &&
    state?.resource.kind === 'durability' &&
    state.resource.current >= 1
  const commands: CombatPlayerActionCommand[] = [{ kind: 'defend' }]
  const backpackWeight = calculateBackpackWeightSubtotal(
    snapshot.backpack,
    dependencies.physicalCatalog,
  )
  if (classifyLoad(backpackWeight, dependencies.config.backpack).canCarry) {
    commands.push({ kind: 'escape' })
  }
  if (usablePipe) {
    commands.push({ kind: 'metal-pipe-basic-attack' })
    if (
      snapshot.usage.metalPipeChargedStrikeUses <
      dependencies.config.combat.metalPipe.chargedStrike.maxUsesPerExploration
    ) {
      commands.push({ kind: 'metal-pipe-charged-strike' })
    }
  } else {
    commands.push({ kind: 'temporary-attack' })
  }

  const untreatedWounds = getUntreatedOpenWounds(snapshot.playerCondition)
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))
  for (let quickSlotIndex = 0; quickSlotIndex < snapshot.quickSlots.slots.length; quickSlotIndex += 1) {
    const item = snapshot.quickSlots.slots[quickSlotIndex]
    if (!item) continue
    const itemState = getItemState(snapshot.itemStates, item.instanceId)
    if (itemState.resource.kind !== 'none') continue

    if (
      item.definitionId === dependencies.bindings.bandageDefinitionId &&
      (
        snapshot.playerCondition.currentHealth < dependencies.config.combat.player.maxHealth ||
        snapshot.playerCondition.bleeding ||
        untreatedWounds.length > 0
      )
    ) {
      if (untreatedWounds.length > 0) {
        for (const wound of untreatedWounds) {
          commands.push({
            kind: 'use-quick-slot-item',
            quickSlotIndex,
            targetOpenWoundId: wound.id,
          })
        }
      } else {
        commands.push({ kind: 'use-quick-slot-item', quickSlotIndex })
      }
    }

    if (
      item.definitionId === dependencies.bindings.painkillerDefinitionId &&
      !snapshot.playerCondition.painkillerActive &&
      (
        snapshot.playerCondition.minorContusions > 0 ||
        untreatedWounds.length > 0
      )
    ) {
      commands.push({ kind: 'use-quick-slot-item', quickSlotIndex })
    }
  }

  return deepFreeze(commands.sort((left, right) =>
    commandSortKey(left).localeCompare(commandSortKey(right))))
}

export function getAvailableCombatPlayerActions(
  snapshot: CombatEncounterSnapshot,
  dependencies: CombatDependencies,
): readonly CombatPlayerActionCommand['kind'][] {
  validateCombatDependencies(dependencies)
  return getAvailableCombatPlayerActionsFromValidatedSnapshot(
    createCombatEncounterSnapshot(snapshot, dependencies),
    dependencies,
  )
}

export function getAvailableCombatPlayerCommands(
  snapshot: CombatEncounterSnapshot,
  dependencies: CombatDependencies,
): readonly CombatPlayerActionCommand[] {
  validateCombatDependencies(dependencies)
  return getAvailableCombatPlayerCommandsFromValidatedSnapshot(
    createCombatEncounterSnapshot(snapshot, dependencies),
    dependencies,
  )
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
