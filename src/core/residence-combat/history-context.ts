import { classifyLoad } from '../load'
import { safeAdd, safeMultiply } from '../residence-config/validation'
import { supplyBandageRecovery } from '../residence-supply/shared-medical'
import { ensure } from '../residence-supply/shared-validation'
import { carriedItems } from '../residence-location/validation'
import { calculateBackpackWeightSubtotal } from '../inventory'
import { getItemState } from '../item-state'
import type { CombatDependencies, CombatValue, DecisionWitness, EntryWitness } from './types'

/** Capture directly from the independently validated before, before spending/removal. */
export function captureDecisionContext(before: CombatValue, command: DecisionWitness['command'], deps: CombatDependencies): DecisionWitness['context'] {
  const condition = before.character.body.condition
  const resource = (slot: 'weapon' | 'armor') => {
    const item = before.carried.equipment[slot]
    if (!item || item.definitionId !== (slot === 'weapon' ? 'weapon_metal_pipe' : 'armor_heavy_coat')) return null
    const state = getItemState(before.itemStates, item.instanceId).resource
    return state.kind === 'none' ? null : { instanceId: item.instanceId, current: state.current }
  }
  return { enemyNext: before.battle!.enemyNext, bleeding: condition.bleeding, painkiller: condition.painkillerActive,
    minorContusions: condition.minorContusions, untreatedWoundIds: condition.openWounds.filter(w => w.treatment === 'untreated').map(w => w.id),
    firstBandageUsed: before.choices.firstBandageUsed, weapon: resource('weapon'), armor: resource('armor'),
    escapeWeight: command.kind === 'escape' ? calculateBackpackWeightSubtotal(before.carried.backpack, deps.supply.catalog.physical) : null }
}

/** Read-only constraints over start evidence. No planner, reducer or state mutation. */
export function decisionFacts(d: DecisionWitness, e: EntryWitness, v: CombatValue, deps: CombatDependencies) {
  const profile = deps.profiles.find(p => p.definitionId === e.definitionId)
  ensure(profile, 'Missing decision profile')
  const r = profile.rules, c = d.context, command = d.command
  ensure(c.enemyNext >= d.ctbBefore && new Set(c.untreatedWoundIds).size === c.untreatedWoundIds.length,
    'Invalid decision-start facts')
  const items = [...carriedItems(v.carried), ...v.warehouse.items, ...v.dispositions.map(x => x.item),
    ...(v.site?.ground.flatMap(g => g.items) ?? []), ...v.archives.flatMap(a => a.site.ground.flatMap(g => g.items))]
  for (const [resource, definition, max] of [
    [c.weapon, 'weapon_metal_pipe', r.metalPipe.maxDurability],
    [c.armor, 'armor_heavy_coat', r.armorMaximum],
  ] as const) if (resource) ensure(resource.current <= max &&
    v.lineage.some(l => l.instanceId === resource.instanceId && l.revision <= d.baseRevision) &&
    items.some(i => i.instanceId === resource.instanceId && i.definitionId === definition), 'Invalid original resource identity')
  ensure(d.uses.length === (command.kind === 'use-quick-slot-item' ? 1 : 0), 'Consumption command differs')
  let duration = 0, damage = 0, delay = 0, recovery = 0, weaponCost = 0
  if (command.kind === 'escape') {
    ensure(c.escapeWeight !== null, 'Missing escape lock weight')
    const load = classifyLoad(c.escapeWeight, r.backpack)
    ensure(load.canCarry, 'Uncarryable escape lock')
    const raw = Math.min(safeMultiply(c.untreatedWoundIds.length, r.escape.ctbPerUntreatedOpenWound), r.escape.woundCtbBonusCap)
    duration = safeAdd(r.escape.baseCtb[load.tier], raw - (c.painkiller ? Math.min(raw, r.painkiller.escapeWoundCtbReduction) : 0))
  } else {
    ensure(c.escapeWeight === null, 'Extraneous escape lock')
    if (command.kind === 'use-quick-slot-item') {
      const use = d.uses[0]
      ensure(use.slot === command.quickSlotIndex, 'Medicine slot differs')
      if (use.kind === 'bandage') {
        ensure(d.healthBefore < r.player.maxHealth || c.bleeding || c.untreatedWoundIds.length > 0, 'No original bandage target')
        ensure(c.untreatedWoundIds.length
          ? !!command.targetOpenWoundId && c.untreatedWoundIds.includes(command.targetOpenWoundId)
          : command.targetOpenWoundId === undefined, 'Original wound target differs')
        duration = r.bandage.combatCtb
        recovery = supplyBandageRecovery({ choices: { ...v.choices, firstBandageUsed: c.firstBandageUsed } }, deps.supply)
      } else {
        ensure(!c.painkiller && (c.minorContusions > 0 || c.untreatedWoundIds.length > 0) &&
          command.targetOpenWoundId === undefined, 'No original painkiller target')
        duration = r.painkiller.combatCtb
      }
    } else if (command.kind === 'defend') duration = r.defend.ctb
    else {
      const attack = command.kind === 'metal-pipe-basic-attack' ? r.metalPipe.basicAttack
        : command.kind === 'metal-pipe-charged-strike' ? r.metalPipe.chargedStrike : r.temporaryAttack
      duration = attack.ctb; damage = attack.damage
      if (command.kind === 'temporary-attack') ensure(!c.weapon || c.weapon.current === 0, 'Temporary attack had usable weapon')
      else {
        ensure(c.weapon && c.weapon.current > 0, 'No original weapon resource')
        weaponCost = attack.durabilityCost
      }
      if (command.kind === 'metal-pipe-charged-strike') {
        ensure(d.quotaBefore > 0, 'No original charged quota')
        delay = safeAdd(r.metalPipe.chargedStrike.enemyActionDelay,
          deps.supply.catalog.enemies.get(e.definitionId).weaknessTags.includes('blunt') ? profile.bluntActionDelayBonus : 0)
      }
    }
  }
  ensure(d.enemyHealthAfter === Math.max(0, d.enemyHealthBefore - damage), 'Primary enemy damage differs')
  const completion = safeAdd(d.ctbBefore, duration), enemyStart = safeAdd(c.enemyNext, delay)
  ensure(d.queue.length <= Math.floor(duration / Math.min(...profile.actions.map(a => a.ctb))) + 3,
    'Unbounded decision queue evidence')
  return { profile, duration, completion, enemyStart, recovery, weaponCost }
}

export function responseAction(d: DecisionWitness, e: EntryWitness, deps: CombatDependencies, offset: number) {
  const definition = deps.supply.catalog.enemies.get(e.definitionId)
  const index = safeAdd(d.actionCountBefore, offset) % definition.actionCycle.length
  const action = deps.profiles.find(p => p.definitionId === e.definitionId)!.actions
    .find(a => a.actionId === definition.actionCycle[index])
  ensure(action, 'Unknown response action')
  return action
}
