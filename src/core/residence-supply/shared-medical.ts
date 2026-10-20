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
import { requireSupplyClinicalTarget } from './medical-qualification'

export const supplyMedicalSchema = z.strictObject({ kind: z.literal('medical'), expectedRevision: countSchema, instanceId: idSchema,
  quantity: z.literal(1).optional(), woundId: idSchema.optional(),
  target: z.enum(['contusion', 'wound']).optional() })
export function evaluateSupplyClinical(v: SupplyDomain, input: unknown, deps: SupplyDependencies) {
  const c = parseResidence(supplyMedicalSchema, input)
  const { alias } = requireSupplyClinicalTarget(v, c, deps)
  const cfg = deps.residence.configuration.config, old = v.character.body
  let body = old, condition = old.condition, firstBandage = v.choices.firstBandageUsed
  const heal = (amount: number) => { condition = restoreHealth(condition, amount, { maxHealth: cfg.limits.hp }).state }
  const untreated = condition.openWounds.filter(w => w.treatment === 'untreated')
  const specific = () => c.woundId!
  if (alias === 'bandage') {
    if (untreated.length) {
      const id = specific()
      condition = treatOpenWound(condition, id)
    }
    condition = stopBleeding(condition)
    heal(supplyBandageRecovery(v, deps))
    firstBandage = true
  } else if (alias === 'firstaid') {
    const hasInjury = condition.openWounds.length > 0 || condition.minorContusions > 0
    if (hasInjury) {
      if (c.target === 'contusion') {
        condition = removeOneMinorContusion(condition)
      } else {
        condition = removeOpenWound(condition, specific())
        if (!condition.openWounds.some(w => w.treatment === 'untreated')) condition = stopBleeding(condition)
      }
    }
    heal(numberValue(deps.configuration, 'firstaid.hp'))
  } else {
    if (alias === 'food') {
      body = { ...body, satiety: Math.min(cfg.limits.satiety, old.satiety + numberValue(deps.configuration, 'ration.satiety')) }
    } else if (alias === 'disinfect') {
      condition = reducePendingInfectionExposure(condition, numberValue(deps.configuration, 'disinfect.exposure')).state
      body = { ...body, quotasRemaining: { ...body.quotasRemaining, disinfectant: old.quotasRemaining.disinfectant - 1 } }
    } else if (alias === 'suppressant') {
      body = { ...body, suppression: old.suppression + cfg.health.suppression,
        quotasRemaining: { ...body.quotasRemaining, suppressant: old.quotasRemaining.suppressant - 1 } }
    } else if (alias === 'painkiller') {
      condition = activatePainkiller(condition)
    }
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
