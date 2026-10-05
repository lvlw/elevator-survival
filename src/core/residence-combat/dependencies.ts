import { createItemReturnLifecycleCatalog } from '../run-return'
import { requireCatalog } from '../residence-location/catalog'
import { requireSupplyConfig } from '../residence-supply/config'
import { requireTerminalConfig } from '../residence-terminal/config'
import { requireTaskCatalog } from '../residence-task/catalog'
import { ensure } from '../residence-supply/shared-validation'
import { createCombatProfile } from '../combat/profiled-controlled'
import { same } from '../residence-terminal/validation'
import { numberField, numberValue } from '../residence-supply/config'
import { requireResidenceConfig } from '../residence-config'
import { parseResidence } from '../residence-config/validation'
import { z } from 'zod'
import type { CombatDependencies } from './types'
import type { CombatProfile } from '../combat/combat-profile'
import type { SupplyDependencies } from '../residence-supply/types'
const issued = new WeakSet<object>()
export function createResidenceCombatDependencies(supply: SupplyDependencies, profiles: readonly CombatProfile[]): CombatDependencies {
  const keys = ['residence','terminal','configuration','catalog','catalogs','tasks','draw']
  ensure(supply && Object.getPrototypeOf(supply) === Object.prototype && Reflect.ownKeys(supply).length === keys.length &&
    Reflect.ownKeys(supply).every(k => typeof k === 'string' && keys.includes(k) &&
      Object.getOwnPropertyDescriptor(supply,k)?.enumerable && 'value' in Object.getOwnPropertyDescriptor(supply,k)!),
    'Expected exact supply dependency properties')
  ensure(Array.isArray(profiles) && Object.getPrototypeOf(profiles) === Array.prototype &&
    Reflect.ownKeys(profiles).length === profiles.length+1, 'Expected dense profile array')
  parseResidence(z.array(z.unknown()), profiles)
  requireResidenceConfig(supply.residence.configuration)
  requireCatalog(supply.catalog); requireSupplyConfig(supply.configuration)
  requireTerminalConfig(supply.terminal); requireTaskCatalog(supply.tasks)
  ensure(typeof supply.draw === 'function' && supply.catalogs.includes(supply.catalog), 'Invalid combat supply composition')
  const checked = profiles.map(createCombatProfile)
  ensure(new Set(checked.map(p => p.definitionId)).size === checked.length &&
    same(checked.map(p => p.definitionId).sort(), [...supply.catalog.enemies.definitionIds].sort()), 'Incomplete enemy profiles')
  for (const p of checked) {
    const e = supply.catalog.enemies.get(p.definitionId)
    ensure(e.maxHealth === p.maxHealth && same(e.actions.map(a => a.id).sort(), p.actions.map(a => a.actionId).sort()),
      'Profile action binding differs')
    const descriptor = supply.tasks.data.enemies.find(x => supply.catalog.data.enemies.some(y =>
      y.id === x.id && y.definition.id === p.definitionId))
    ensure(descriptor && p.firstEnemyCtb === numberField(supply.configuration, descriptor.parameters, 'first'),
      'Profile is not bound to approved first CTB')
    const parameters = supply.configuration.values[descriptor.parameters]
    ensure(parameters && typeof parameters === 'object' && !Array.isArray(parameters) &&
      'damages' in parameters && 'waits' in parameters, 'Missing approved enemy parameters')
    const damages = parameters.damages, waits = parameters.waits
    ensure(Array.isArray(damages) && Array.isArray(waits) && e.actionCycle.every((id, i) => {
      const action = p.actions.find(a => a.actionId === id)
      return !!action && action.damage === damages[i] && action.ctb === waits[i] && action.injuryKind === descriptor.wounds[i] &&
        action.injuryRiskTier === descriptor.woundRisk[i] && action.exposureRiskTier === descriptor.exposureRisk[i]
    }), 'Profile action facts differ from approved configuration/content')
    ensure(p.rules.player.maxHealth === supply.residence.configuration.config.limits.hp &&
      p.rules.metalPipe.chargedStrike.maxUsesPerExploration === supply.residence.configuration.config.quota.pipe_signature,
      'Profile body/quota binding differs')
    const cfg=supply.configuration, r=p.rules
    const pairs: readonly (readonly [number,string])[] = [
      [p.reentryEnemyCtb,'reentry.enemy'],[p.reentryPlayerCtb,'reentry.player'],
      [r.metalPipe.maxDurability,'capacity.pipe'],[r.armorMaximum,'capacity.coat'],
      [r.metalPipe.basicAttack.damage,'pipe.basic.damage'],[r.metalPipe.basicAttack.ctb,'pipe.basic.ctb'],
      [r.metalPipe.basicAttack.durabilityCost,'wear.pipe.basic'],
      [r.metalPipe.chargedStrike.damage,'pipe.signature.damage'],[r.metalPipe.chargedStrike.ctb,'pipe.signature.ctb'],
      [r.metalPipe.chargedStrike.durabilityCost,'wear.pipe.signature'],
      [r.escape.baseCtb.normal,'retreat.normal'],[r.escape.baseCtb.loaded,'retreat.normal'],
      [r.escape.baseCtb.overloaded,'retreat.overloaded'],[r.escape.ctbPerUntreatedOpenWound,'retreat.wound'],
      [r.escape.woundCtbBonusCap,'retreat.wound_cap'],[r.bandage.combatCtb,'bandage.ctb'],
      [r.painkiller.combatCtb,'painkiller.ctb'],[r.painkiller.escapeWoundCtbReduction,'painkiller.retreat'],
    ]
    ensure(pairs.every(([actual,key])=>actual===numberValue(cfg,key)) &&
      r.postPlayerActionBleedingDamage===supply.residence.configuration.config.health.bleed_action &&
      same(r.backpack,{...supply.catalog.data.backpack,totalCells:supply.catalog.data.backpack.width*supply.catalog.data.backpack.height}),
      'Profile player/entry/resource facts differ from approved configuration')
    ensure(same({heavyCoat:r.heavyCoat,defend:r.defend,temporaryAttack:r.temporaryAttack,riskTiers:r.riskTiers},
      {heavyCoat:checked[0].rules.heavyCoat,defend:checked[0].rules.defend,
        temporaryAttack:checked[0].rules.temporaryAttack,riskTiers:checked[0].rules.riskTiers}),
      'Inherited CTB rules differ across enemy profiles')
  }
  const frozenSupply = Object.freeze({ ...supply, catalogs: Object.freeze([...supply.catalogs]),
    residence: Object.freeze({ ...supply.residence }) })
  const result = Object.freeze({ supply: frozenSupply, profiles: Object.freeze(checked),
    lifecycle: createItemReturnLifecycleCatalog(supply.catalog.data.items.map(i => ({ definitionId: i.physical.id,
      kind: i.ordinary ? 'ordinary' as const : i.physical.id === supply.tasks.data.items.find(t => t.alias === 'card')?.id
        ? 'permission' as const : 'quest' as const })), supply.catalog.physical) })
  issued.add(result); return result
}
export function requireCombatDependencies(deps: CombatDependencies) {
  ensure(deps && issued.has(deps), 'Unissued combat dependencies', 'BINDING_MISMATCH')
  return deps
}
