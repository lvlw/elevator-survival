import { z } from 'zod'
import { restoreHealth, stopBleeding, treatOpenWound, removeOpenWound, removeOneMinorContusion,
  reducePendingInfectionExposure, activatePainkiller } from '../condition'
import { parseResidence, countSchema, idSchema } from '../residence-config/validation'
import { ensure, requireSupplyDomainAction } from './shared-validation'
import { numberValue } from './config'
import { carriedSupplyItem, consumeSupplyUnits } from './allocations'
import { supplyBodyAction } from './cycle-adapter'
import type { SupplyDependencies } from './types'
import type { SupplyDomain, SupplyDomainContext } from './shared-types'

export const supplyMedicalSchema = z.strictObject({ kind: z.literal('medical'), expectedRevision: countSchema, instanceId: idSchema,
  quantity: z.literal(1).optional(), woundId: idSchema.optional(),
  target: z.enum(['contusion', 'wound']).optional() })
export function evaluateSupplyClinical(v: SupplyDomain, input: unknown, deps: SupplyDependencies) {
  const c = parseResidence(supplyMedicalSchema, input)
  ensure(v.character.body.condition.currentHealth > 0, 'Living medical target required', 'NOT_AVAILABLE')
  ensure(c.expectedRevision === v.character.revision, 'Stale medical revision', 'STALE_AUTHORITY')
  const item = carriedSupplyItem(v, c.instanceId)
  const alias = deps.tasks.data.items.find(i => i.id === item.definitionId)?.alias
  const cfg = deps.residence.configuration.config, old = v.character.body
  let body = old, condition = old.condition, firstBandage = v.choices.firstBandageUsed
  const heal = (amount: number) => { condition = restoreHealth(condition, amount, { maxHealth: cfg.limits.hp }).state }
  const untreated = condition.openWounds.filter(w => w.treatment === 'untreated')
  const specific = () => {
    ensure(c.woundId && condition.openWounds.some(w => w.id === c.woundId), 'Specific eligible wound required', 'NOT_AVAILABLE')
    return c.woundId
  }
  if (alias === 'bandage') {
    ensure(!c.target && (condition.currentHealth < cfg.limits.hp || condition.bleeding || untreated.length > 0), 'No bandage target', 'NOT_AVAILABLE')
    if (untreated.length) {
      const id = specific(); ensure(untreated.some(w => w.id === id), 'Not untreated wound', 'NOT_AVAILABLE')
      condition = treatOpenWound(condition, id)
    } else ensure(!c.woundId, 'No wound target')
    condition = stopBleeding(condition)
    heal(supplyBandageRecovery(v, deps))
    firstBandage = true
  } else if (alias === 'firstaid') {
    const hasInjury = condition.openWounds.length > 0 || condition.minorContusions > 0
    ensure(condition.currentHealth < cfg.limits.hp || hasInjury, 'No first aid target', 'NOT_AVAILABLE')
    if (hasInjury) {
      ensure(c.target, 'Explicit first aid injury target required')
      if (c.target === 'contusion') {
        ensure(!c.woundId && condition.minorContusions > 0, 'No contusion target', 'NOT_AVAILABLE')
        condition = removeOneMinorContusion(condition)
      } else {
        condition = removeOpenWound(condition, specific())
        if (!condition.openWounds.some(w => w.treatment === 'untreated')) condition = stopBleeding(condition)
      }
    } else ensure(!c.target && !c.woundId, 'Extraneous first aid target')
    heal(numberValue(deps.configuration, 'firstaid.hp'))
  } else {
    ensure(!c.woundId && !c.target, 'Extraneous medical target')
    if (alias === 'food') {
      ensure(old.satiety < cfg.limits.satiety, 'Satiety full', 'NOT_AVAILABLE')
      body = { ...body, satiety: Math.min(cfg.limits.satiety, old.satiety + numberValue(deps.configuration, 'ration.satiety')) }
    } else if (alias === 'disinfect') {
      ensure(condition.pendingInfectionExposures > 0 && old.quotasRemaining.disinfectant > 0, 'No disinfect target/quota', 'NOT_AVAILABLE')
      condition = reducePendingInfectionExposure(condition, numberValue(deps.configuration, 'disinfect.exposure')).state
      body = { ...body, quotasRemaining: { ...body.quotasRemaining, disinfectant: old.quotasRemaining.disinfectant - 1 } }
    } else if (alias === 'suppressant') {
      ensure((old.infectionProgress > 0 || condition.pendingInfectionExposures > 0) && old.quotasRemaining.suppressant > 0, 'No suppressant target/quota', 'NOT_AVAILABLE')
      body = { ...body, suppression: old.suppression + cfg.health.suppression,
        quotasRemaining: { ...body.quotasRemaining, suppressant: old.quotasRemaining.suppressant - 1 } }
    } else if (alias === 'painkiller') {
      ensure(!condition.painkillerActive && (condition.minorContusions > 0 || untreated.length > 0), 'No painkiller target', 'NOT_AVAILABLE')
      condition = activatePainkiller(condition)
    } else ensure(false, 'Not a medical/food item', 'NOT_AVAILABLE')
  }
  return { command: c, body: { ...body, condition }, firstBandage }
}
export function planSharedMedical<V extends SupplyDomain, P>(value: V, request: unknown, context: SupplyDomainContext<V, P>) {
  const deps = context.dependencies
  const command = parseResidence(supplyMedicalSchema, request)
  requireSupplyDomainAction(value)
  const evaluated = evaluateSupplyClinical(value, command, deps)
  let next = consumeSupplyUnits(value, evaluated.command.instanceId, 1, deps, 'consumed', 'medical')
  next = { ...next, character: { ...next.character, body: evaluated.body },
    choices: { ...next.choices, firstBandageUsed: evaluated.firstBandage } }
  const checked = context.read(next)
  const result = supplyBodyAction(checked, deps, 'medical', { kind: 'free', amount: 0 })
  const steps = [{ kind: 'primary' as const, healthBefore: value.character.body.condition.currentHealth,
    healthAfter: result.snapshot.body.condition.currentHealth, facts: { heal: result.snapshot.body.condition.currentHealth - value.character.body.condition.currentHealth,
      exposuresReduced: value.character.body.condition.pendingInfectionExposures - result.snapshot.body.condition.pendingInfectionExposures } }]
  return context.issue(value, { ...next, character: result.snapshot }, 'medical', steps)
}

export function supplyBandageRecovery(v: Pick<SupplyDomain, 'choices'>, deps: SupplyDependencies): number {
  return numberValue(deps.configuration, v.choices.specialty === 'survival' && !v.choices.firstBandageUsed ? 'survival.hp' : 'bandage.hp')
}
