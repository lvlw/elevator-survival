import { requireSupplyResidencePolicy } from '../residence-save/supply-policy'
import { ResidenceSessionError } from './types'
import type { SupplySessionComposition } from './supply-types'

function invalid(): never { throw new ResidenceSessionError('INVALID_COMPOSITION', 'Invalid synchronous supply session composition') }
function shell(value: unknown, required: string[], optional: string[] = []): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) invalid()
  const descriptors = Object.getOwnPropertyDescriptors(value), keys = Reflect.ownKeys(value)
  if (required.some(k => !keys.includes(k)) || keys.some(k => typeof k !== 'string' || ![...required, ...optional].includes(k)) ||
    !Object.values(descriptors).every(d => d.enumerable && 'value' in d)) invalid()
}
function sync(fn: unknown): asserts fn is (...args: never[]) => unknown {
  if (typeof fn !== 'function' || Object.prototype.toString.call(fn) !== '[object Function]') invalid()
}
export function readSupplyComposition(input: SupplySessionComposition) {
  shell(input, ['policy', 'storage', 'startup'], ['provideInitialMaterials', 'provideColdExpectation'])
  const dependencies = requireSupplyResidencePolicy(input.policy)
  shell(input.storage, ['read', 'write'])
  sync(input.storage.read); sync(input.storage.write)
  if (input.startup !== 'first' && input.startup !== 'existing') invalid()
  if (input.startup === 'first' || 'provideInitialMaterials' in input) sync(input.provideInitialMaterials)
  if ('provideColdExpectation' in input) sync(input.provideColdExpectation)
  return Object.freeze({ policy: input.policy, dependencies, startup: input.startup,
    read: input.storage.read.bind(input.storage), write: input.storage.write.bind(input.storage),
    initial: input.provideInitialMaterials?.bind(input), cold: input.provideColdExpectation?.bind(input) })
}
