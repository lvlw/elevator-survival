import { requireCombatResidencePolicy } from '../residence-save/combat-policy'
import { ResidenceSessionError } from './types'
import type { CombatSessionComposition } from './combat-types'

function invalid(): never { throw new ResidenceSessionError('INVALID_COMPOSITION', 'Invalid synchronous v4 composition') }
function shell(value: unknown, required: string[], optional: string[] = []): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) invalid()
  const descriptors = Object.getOwnPropertyDescriptors(value), keys = Reflect.ownKeys(value)
  if (required.some(k => !keys.includes(k)) || keys.some(k => typeof k !== 'string' || ![...required, ...optional].includes(k)) ||
    !Object.values(descriptors).every(d => d.enumerable && 'value' in d)) invalid()
}
export function assertCombatSyncFunction(fn: unknown): asserts fn is (...args: never[]) => unknown {
  if (typeof fn !== 'function' || Reflect.has(fn, Symbol.toStringTag) ||
    Object.prototype.toString.call(fn) !== '[object Function]' || /^class\s/.test(Function.prototype.toString.call(fn))) invalid()
}
/** Check descriptors before any data read; do not execute getters or freeze caller data. */
export function assertCombatData(input: unknown, code: 'INVALID_COMMAND' | 'INVALID_FACTORY_RESULT' = 'INVALID_COMMAND'): void {
  const ancestors = new Set<object>()
  const bad = (): never => { throw new ResidenceSessionError(code, 'Expected acyclic plain data properties') }
  const visit = (v: unknown): void => {
    if (v === null || typeof v !== 'object') { if (typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') bad(); return }
    if (ancestors.has(v) || (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype)) bad()
    if (Array.isArray(v) && (Object.getPrototypeOf(v) !== Array.prototype ||
      Reflect.ownKeys(v).length !== v.length + 1 ||
      Reflect.ownKeys(v).some(k => k !== 'length' && (typeof k !== 'string' || !/^(0|[1-9]\d*)$/.test(k) || Number(k) >= v.length)))) bad()
    ancestors.add(v)
    const descriptors = Object.getOwnPropertyDescriptors(v)
    for (const key of Reflect.ownKeys(v)) {
      if (typeof key !== 'string') return bad()
      const d = descriptors[key]
      if (!('value' in d) || (!d.enumerable && !(Array.isArray(v) && key === 'length'))) bad()
      visit(d.value)
    }
    ancestors.delete(v)
  }
  visit(input)
}
export function readCombatComposition(input: CombatSessionComposition) {
  shell(input, ['policy', 'storage', 'startup'], ['provideInitialMaterials', 'provideColdExpectation'])
  const { dependencies } = requireCombatResidencePolicy(input.policy)
  shell(input.storage, ['read', 'write'])
  assertCombatSyncFunction(input.storage.read); assertCombatSyncFunction(input.storage.write)
  if (input.startup !== 'first' && input.startup !== 'existing') invalid()
  if (input.startup === 'first' || 'provideInitialMaterials' in input) assertCombatSyncFunction(input.provideInitialMaterials)
  if (input.startup === 'existing' || 'provideColdExpectation' in input) assertCombatSyncFunction(input.provideColdExpectation)
  // Copy only the validated ports; caller-owned shells remain untouched.
  return Object.freeze({ policy: input.policy, dependencies, startup: input.startup,
    read: input.storage.read.bind(input.storage), write: input.storage.write.bind(input.storage),
    initial: input.provideInitialMaterials?.bind(input), cold: input.provideColdExpectation?.bind(input) })
}
