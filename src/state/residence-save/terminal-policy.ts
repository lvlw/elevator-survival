import { z } from 'zod'
import { deepFreeze } from '../../core/config'
import { declarationSchema } from '../../core/mission-lifecycle/validation'
import { requireResidenceConfig } from '../../core/residence-config'
import { countSchema, idSchema, parseResidence } from '../../core/residence-config/validation'
import { requireCatalog } from '../../core/residence-location/catalog'
import { requireTerminalConfig } from '../../core/residence-terminal/config'
import { same } from '../../core/residence-terminal/validation'
import { TerminalResidenceSaveError, type TerminalResidenceSavePolicy } from './terminal-types'

const handles = new WeakSet<object>()
const roles = z.strictObject({ returnNodeId: idSchema, powerFactId: idSchema, transferFactId: idSchema,
  sampleSourceId: idSchema, sampleOrdinal: countSchema, specialDefinitionIds: z.array(idSchema), permissionDefinitionIds: z.array(idSchema) })
function reject(message: string): never { throw new TerminalResidenceSaveError('INVALID_POLICY', message) }
/** Check only the shell before reading handles; never traverse or freeze caller objects. */
function shell(input: unknown, keys: readonly string[]): asserts input is Record<string, unknown> {
  if (!input || typeof input !== 'object' || Object.getPrototypeOf(input) !== Object.prototype ||
    !same(Reflect.ownKeys(input).sort(), [...keys].sort()) ||
    !Object.values(Object.getOwnPropertyDescriptors(input)).every((d) => d.enumerable && 'value' in d)) reject('Invalid controlled dependency shell')
}
function list(input: unknown): asserts input is unknown[] {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype ||
    Reflect.ownKeys(input).length !== input.length + 1 ||
    !Object.entries(Object.getOwnPropertyDescriptors(input)).every(([k, d]) => k === 'length' ||
      /^(0|[1-9][0-9]*)$/.test(k) && Number(k) < input.length && d.enumerable && 'value' in d)) reject('Invalid controlled policy list')
}
export function createTerminalResidenceSavePolicy(input: TerminalResidenceSavePolicy): TerminalResidenceSavePolicy {
  try {
    shell(input, ['configuration', 'terminalConfiguration', 'rulesVersion', 'declarations', 'policies'])
    const configuration = requireResidenceConfig(input.configuration)
    const terminalConfiguration = requireTerminalConfig(input.terminalConfiguration)
    const rulesVersion = parseResidence(idSchema, input.rulesVersion)
    const declarations = parseResidence(z.array(declarationSchema).min(1), input.declarations)
    if (new Set(declarations.map((d) => d.commissionId)).size !== declarations.length ||
      declarations.some((d) => d.rulesVersion !== rulesVersion)) reject('Invalid declaration scope')
    list(input.policies)
    const policies = input.policies.map((entry) => {
      shell(entry, ['catalog', ...Object.keys(roles.shape)])
      const catalog = requireCatalog(entry.catalog)
      const metadata = parseResidence(roles, { returnNodeId: entry.returnNodeId, powerFactId: entry.powerFactId,
        transferFactId: entry.transferFactId, sampleSourceId: entry.sampleSourceId, sampleOrdinal: entry.sampleOrdinal,
        specialDefinitionIds: entry.specialDefinitionIds, permissionDefinitionIds: entry.permissionDefinitionIds })
      if (!declarations.some((d) => same(d, catalog.data.mission))) reject('Undeclared catalog binding')
      return Object.freeze({ catalog, ...deepFreeze(metadata) })
    })
    if (policies.length !== declarations.length || new Set(policies.map((p) => p.catalog.data.mission.commissionId)).size !== declarations.length ||
      new Set(policies.map((p) => JSON.stringify([p.catalog.data.id, p.catalog.data.version]))).size !== policies.length) reject('Missing or duplicate catalog policy')
    // Catalog/role data are controlled bindings. A remains the full semantic owner;
    // checkDependencies is invoked with the real cold root scope during every read.
    const profiles = new Map<string, unknown>()
    for (const p of policies) {
      const c = p.catalog.data
      const source = c.sources.find((s) => s.id === p.sampleSourceId)
      const grant = source?.contents.kind === 'fixed' ? source.contents.grants[p.sampleOrdinal] : undefined
      const classes = [grant?.definitionId, ...p.specialDefinitionIds, ...p.permissionDefinitionIds]
      if (!c.nodes.some((n) => n.id === p.returnNodeId) || p.powerFactId === p.transferFactId ||
        ![p.powerFactId, p.transferFactId].every((id) => c.facts.some((f) => f.id === id)) || !grant || grant.quantity !== 1 ||
        new Set(classes).size !== classes.length || !classes.every((id) => c.items.some((i) => i.physical.id === id && !i.ordinary))) reject('Invalid terminal role binding')
      for (const item of c.items) {
        if (profiles.has(item.physical.id) && !same(profiles.get(item.physical.id), item)) reject('Conflicting catalog item profile')
        profiles.set(item.physical.id, item)
      }
    }
    const result = Object.freeze({ configuration, terminalConfiguration, rulesVersion,
      declarations: deepFreeze(declarations), policies: Object.freeze(policies) })
    handles.add(result)
    return result
  } catch (error) {
    if (error instanceof TerminalResidenceSaveError) throw error
    reject('Invalid or unissued controlled dependency')
  }
}
export function requireTerminalResidenceSavePolicy(input: TerminalResidenceSavePolicy) {
  if (!input || !handles.has(input)) reject('Unissued terminal residence policy')
  return input
}
