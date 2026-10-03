import { z } from 'zod'
import { deepFreeze } from '../config'
import { ResidenceError, type ResidenceConfig } from './types'

export const countSchema = z.number().refine((v) => Number.isSafeInteger(v) && v >= 0)
export const positiveSchema = countSchema.refine((v) => v > 0)
export const idSchema = z.string().min(1).refine(
  (v) => v === v.trim() && !/[\u0000-\u001f\u007f]/.test(v),
)

function data(input: unknown, ancestors = new Set<object>()): void {
  if (input === null || typeof input !== 'object') return
  const array = Array.isArray(input)
  if (ancestors.has(input) || Object.getPrototypeOf(input) !== (array ? Array.prototype : Object.prototype)) {
    throw new ResidenceError('INVALID_INPUT', 'Expected acyclic plain data')
  }
  ancestors.add(input)
  const keys = Reflect.ownKeys(input)
  if (array && keys.length !== input.length + 1) throw new ResidenceError('INVALID_INPUT', 'Sparse or decorated array')
  for (const key of keys) {
    if (array && key === 'length') continue
    const d = Object.getOwnPropertyDescriptor(input, key)!
    if (typeof key !== 'string' || !d.enumerable || !('value' in d) ||
      (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= input.length))) {
      throw new ResidenceError('INVALID_INPUT', 'Unexpected non-data property')
    }
    data(d.value, ancestors)
  }
  ancestors.delete(input)
}

export function parseResidence<T>(schema: z.ZodType<T>, input: unknown): T {
  data(input)
  const result = schema.safeParse(input)
  if (!result.success) throw new ResidenceError('INVALID_INPUT', 'Invalid residence value shape or number')
  return result.data
}

export function safeInteger(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new ResidenceError('SAFE_INTEGER_OVERFLOW', 'Result exceeds safe integer range')
  }
  return Number(value)
}

export const safeAdd = (a: number, b: number): number => safeInteger(BigInt(a) + BigInt(b))
export const safeMultiply = (a: number, b: number): number => safeInteger(BigInt(a) * BigInt(b))

const configSchema = z.strictObject({
  configurationId: idSchema,
  config: z.strictObject({
    limits: z.strictObject({ days: positiveSchema, energy: positiveSchema, hp: positiveSchema, satiety: positiveSchema }),
    rest: z.strictObject({ A: positiveSchema, C: positiveSchema }),
    health: z.strictObject({
      bleed_night: countSchema, bleed_action: countSchema, exposure_progress: countSchema,
      infection_stages: z.array(z.strictObject({ min: countSchema, base: countSchema })).min(1),
      suppression: countSchema,
      infection_damage: z.array(z.strictObject({ min: countSchema, hp: countSchema })).min(1),
      night_food: countSchema, starve_threshold: countSchema, starve_damage: countSchema,
    }),
    quota: z.strictObject({ suppressant: countSchema, disinfectant: countSchema, pipe_signature: countSchema }),
  }),
})

// Only controlled composition creates handles. This records validation, not game state
// or save authority; a look-alike object with the same name is not a configured handle.
const handles = new WeakSet<object>()

export function createResidenceConfig(input: unknown, expectedConfigurationId: string): ResidenceConfig {
  const expected = parseResidence(idSchema, expectedConfigurationId)
  const parsed = parseResidence(configSchema, input)
  if (parsed.configurationId !== expected) throw new ResidenceError('CONFIGURATION_MISMATCH', 'Unknown configuration')
  const c = parsed.config
  const ordered = (rows: readonly { min: number }[]) => rows[0].min === 0 &&
    rows.every((row, i) => i === 0 || row.min > rows[i - 1].min)
  if (!ordered(c.health.infection_stages) || !ordered(c.health.infection_damage) ||
    c.health.infection_stages.some((r, i, rows) => i > 0 && r.base < rows[i - 1].base) ||
    c.health.infection_damage.some((r, i, rows) => i > 0 && r.hp < rows[i - 1].hp) ||
    c.rest.A > c.limits.energy || c.rest.C > c.limits.energy || c.health.starve_threshold > c.limits.satiety) {
    throw new ResidenceError('INVALID_INPUT', 'Invalid threshold or reset table')
  }
  safeMultiply(c.quota.suppressant, c.health.suppression)
  const frozen = deepFreeze(parsed)
  handles.add(frozen)
  return frozen
}

export function requireResidenceConfig(input: ResidenceConfig): ResidenceConfig {
  if (!input || !handles.has(input)) throw new ResidenceError('CONFIGURATION_MISMATCH', 'Uncontrolled configuration object')
  return input
}
