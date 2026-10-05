import { z } from 'zod'
import { deepFreeze } from '../config'
import { ruleConfigSchema } from '../config/rule-config-schema'
import { countSchema, positiveSchema, idSchema, parseResidence } from '../residence-config/validation'
import { CombatError } from './combat-errors'
import type { CombatProfile, ProfiledCombatDependencies } from './combat-profile'

const c = ruleConfigSchema.shape.combat.shape
const risk = z.enum(['none', 'low', 'medium', 'high', 'very-high'])
const schema = z.strictObject({ definitionId: idSchema, maxHealth: positiveSchema,
  firstEnemyCtb: countSchema, reentryEnemyCtb: countSchema, reentryPlayerCtb: countSchema,
  bluntActionDelayBonus: countSchema,
  actions: z.array(z.strictObject({ actionId: idSchema, ctb: positiveSchema, damage: countSchema,
    injuryRiskTier: risk, exposureRiskTier: risk, injuryKind: z.enum(['contusion', 'laceration', 'bite']) })).min(1),
  rules: z.strictObject({ player: c.player, metalPipe: c.metalPipe, heavyCoat: c.heavyCoat,
    defend: c.defend, temporaryAttack: c.temporaryAttack, escape: c.escape, riskTiers: c.riskTiers,
    postPlayerActionBleedingDamage: countSchema, armorMaximum: positiveSchema,
    bandage: z.strictObject({ combatCtb: positiveSchema, healthRecovery: countSchema, stopsBleeding: z.boolean() }),
    painkiller: z.strictObject({ combatCtb: positiveSchema, escapeWoundCtbReduction: countSchema }),
    backpack: ruleConfigSchema.shape.backpack,
  }),
})
const profiles = new WeakSet<object>(), dependencies = new WeakSet<object>()
function safeNumbers(value: unknown): void {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0))
    throw new CombatError('INVALID_COMBAT_DEPENDENCIES', 'Unsafe profile number')
  if (value && typeof value === 'object') Object.values(value).forEach(safeNumbers)
}
export function createCombatProfile(input: unknown): CombatProfile {
  const v = parseResidence(schema, input)
  safeNumbers(v)
  if (new Set(v.actions.map(a => a.actionId)).size !== v.actions.length)
    throw new CombatError('INVALID_COMBAT_DEPENDENCIES', 'Duplicate profiled action')
  const result = deepFreeze(v); profiles.add(result); return result
}
export function createProfiledCombatDependencies(input: ProfiledCombatDependencies): ProfiledCombatDependencies {
  const keys = ['profile', 'draw', 'runSeed', 'sceneInstanceId', 'riskAddress', 'bindings', 'enemyCatalog',
    'physicalCatalog', 'equipmentCatalog', 'quickSlotCatalog', 'itemResourceCatalog', 'lifecycleCatalog']
  if (!input || Object.getPrototypeOf(input) !== Object.prototype || Reflect.ownKeys(input).length !== keys.length ||
    Reflect.ownKeys(input).some(k => typeof k !== 'string' || !keys.includes(k) ||
      !Object.getOwnPropertyDescriptor(input, k)?.enumerable || !('value' in Object.getOwnPropertyDescriptor(input, k)!)))
    throw new CombatError('INVALID_COMBAT_DEPENDENCIES', 'Expected exact dependency data properties')
  parseResidence(z.strictObject({ executionId: idSchema, catalogId: idSchema }), input.riskAddress)
  parseResidence(z.strictObject({ enemyDefinitionId: idSchema, metalPipeDefinitionId: idSchema,
    heavyCoatDefinitionId: idSchema, bandageDefinitionId: idSchema, painkillerDefinitionId: idSchema }), input.bindings)
  if (!profiles.has(input.profile) || typeof input.draw !== 'function' ||
    !idSchema.safeParse(input.runSeed).success || !idSchema.safeParse(input.sceneInstanceId).success ||
    !idSchema.safeParse(input.riskAddress.executionId).success || !idSchema.safeParse(input.riskAddress.catalogId).success)
    throw new CombatError('INVALID_COMBAT_DEPENDENCIES', 'Uncontrolled profile or risk address')
  const enemy = input.enemyCatalog.get(input.bindings.enemyDefinitionId)
  if (enemy.id !== input.profile.definitionId || enemy.maxHealth !== input.profile.maxHealth ||
    enemy.actions.length !== input.profile.actions.length ||
    enemy.actions.some(a => !input.profile.actions.some(p => p.actionId === a.id)))
    throw new CombatError('COMBAT_CONTENT_BINDING_MISMATCH', 'Enemy profile does not match the catalog')
  for (const [id, slot, kind, max] of [
    [input.bindings.metalPipeDefinitionId, 'weapon', 'durability', input.profile.rules.metalPipe.maxDurability],
    [input.bindings.heavyCoatDefinitionId, 'armor', 'integrity', input.profile.rules.armorMaximum],
  ] as const) {
    const e = input.equipmentCatalog.get(id), r = input.itemResourceCatalog.get(id)
    if (!input.physicalCatalog.has(id) || e.kind !== 'equippable' || !e.eligibleSlots.includes(slot) || r.kind !== kind || r.maximum !== max)
      throw new CombatError('COMBAT_CONTENT_BINDING_MISMATCH', 'Profiled equipment binding mismatch')
  }
  for (const id of [input.bindings.bandageDefinitionId, input.bindings.painkillerDefinitionId]) {
    if (!input.physicalCatalog.has(id) || input.quickSlotCatalog.get(id).kind !== 'eligible' ||
      input.itemResourceCatalog.get(id).kind !== 'none' || input.lifecycleCatalog.get(id).kind === 'quest')
      throw new CombatError('COMBAT_CONTENT_BINDING_MISMATCH', 'Profiled medicine binding mismatch')
  }
  if (input.bindings.bandageDefinitionId === input.bindings.painkillerDefinitionId)
    throw new CombatError('COMBAT_CONTENT_BINDING_MISMATCH', 'Medicine bindings overlap')
  const result = Object.freeze({ ...input, bindings: Object.freeze({ ...input.bindings }), riskAddress: Object.freeze({ ...input.riskAddress }) })
  dependencies.add(result); return result
}
export function requireProfiledCombatDependencies(input: ProfiledCombatDependencies): void {
  if (!dependencies.has(input)) throw new CombatError('INVALID_COMBAT_DEPENDENCIES', 'Unissued profiled dependencies')
}
