import { z } from 'zod'
import { deepFreeze } from '../../core/config'
import { identitySchema } from '../../core/character-cycle/validation'
import { createMissionScope, parseMissionColdCandidate } from '../../core/mission-lifecycle/controlled'
import { bindingSchema } from '../../core/mission-lifecycle/validation'
import { countSchema, idSchema, parseResidence, positiveSchema } from '../../core/residence-config/validation'
import { carriedItems, carriedSchema, itemStatesSchema, readLocationContext } from '../../core/residence-location/validation'
import { createItemInstance } from '../../core/inventory'
import { createItemStateCollectionSnapshot } from '../../core/item-state'
import { checkDependencies, itemSchema, policyFor, readTerminalSnapshot } from '../../core/residence-terminal/validation'
import type { TerminalDependencies } from '../../core/residence-terminal'
import { createResidenceSavePolicy, validateResidenceAggregate } from './validation'
import { requireTerminalResidenceSavePolicy } from './terminal-policy'
import { isSourceEntityId, validateTerminalEntityHistory } from './terminal-history'
import { TerminalResidenceSaveError, type TerminalResidenceAggregate, type TerminalResidenceSavePolicy } from './terminal-types'

const characterHeader = z.strictObject({ identity: identitySchema, revision: countSchema, cycle: positiveSchema,
  body: z.unknown(), clock: z.unknown() })
const header = z.object({ phase: idSchema, terminalConfigurationId: idSchema, character: characterHeader,
  missions: z.array(z.unknown()) }).passthrough()
const freshSchema = z.strictObject({ phase: z.literal('fresh-hub'), terminalConfigurationId: idSchema,
  character: characterHeader, missions: z.array(z.unknown()), balance: countSchema, site: z.null(),
  carried: carriedSchema, itemStates: itemStatesSchema,
  warehouse: z.strictObject({ items: z.array(itemSchema), itemStates: itemStatesSchema }),
  archives: z.tuple([]), dispositions: z.tuple([]), receipts: z.tuple([]),
  catalogRef: z.strictObject({ catalogId: idSchema, catalogVersion: idSchema }),
})
function invalid(message: string): never { throw new TerminalResidenceSaveError('INVALID_STATE', message) }
export function terminalResidenceDependencies(characterId: string, policy: TerminalResidenceSavePolicy): TerminalDependencies {
  return { residence: { configuration: policy.configuration, rulesVersion: policy.rulesVersion,
    scope: createMissionScope({ characterId, declarations: policy.declarations }, (v) => v === policy.rulesVersion) },
  configuration: policy.terminalConfiguration, policies: policy.policies }
}

/** Cold consistency only: there is no current, installation or recovered capability here. */
export function validateTerminalResidenceAggregate(input: unknown, policyInput: TerminalResidenceSavePolicy): TerminalResidenceAggregate {
  const policy = requireTerminalResidenceSavePolicy(policyInput)
  try {
    // This first read checks the entire raw data graph before using lookup fields.
    // The original input still goes through the exact full schema; no unknown key is discarded.
    const h = parseResidence(header, input)
    if (h.character.identity.rulesVersion !== policy.rulesVersion ||
      h.character.identity.configurationId !== policy.configuration.configurationId ||
      h.terminalConfigurationId !== policy.terminalConfiguration.configurationId) {
      throw new TerminalResidenceSaveError('BINDING_MISMATCH', 'Unsupported rules or configuration binding')
    }
    if (!['fresh-hub', 'active-world', 'living-hub', 'dead'].includes(h.phase)) {
      throw new TerminalResidenceSaveError('UNSUPPORTED_STAGE', 'Unsupported aggregate phase')
    }
    const deps = terminalResidenceDependencies(h.character.identity.characterId, policy)
    checkDependencies(deps)
    const seen = new Set<string>()
    const missions = h.missions.map((fact) => {
      const { binding } = parseResidence(z.object({ binding: bindingSchema }), fact)
      const declaration = policy.declarations.find((d) => d.commissionId === binding.mission.commissionId)
      if (!declaration || seen.has(declaration.commissionId)) invalid('Unknown or duplicate declared mission')
      seen.add(declaration.commissionId)
      return parseMissionColdCandidate(fact, { characterId: h.character.identity.characterId, mission: declaration }, deps.residence.scope).value
    })
    if (seen.size !== policy.declarations.length) invalid('Incomplete declaration facts')
    const ordered = policy.declarations.map((d) => missions.find((m) => m.binding.mission.commissionId === d.commissionId)!)
    if (h.phase === 'fresh-hub') {
      const raw = parseResidence(freshSchema, input)
      if (raw.balance !== policy.terminalConfiguration.config.initial_balance || raw.character.revision !== 0) invalid('Not a genuine initial wallet/revision')
      const oldPolicy = createResidenceSavePolicy({ configuration: policy.configuration, rulesVersion: policy.rulesVersion,
        declarations: policy.declarations, catalogs: policy.policies.map((p) => p.catalog) })
      const common = validateResidenceAggregate({ phase: 'fresh-hub', character: raw.character, missions: ordered,
        carried: raw.carried, itemStates: raw.itemStates, catalogRef: raw.catalogRef }, oldPolicy)
      if (common.phase !== 'fresh-hub') invalid('Not fresh')
      const catalog = policy.policies.find((p) => p.catalog.data.id === raw.catalogRef.catalogId && p.catalog.data.version === raw.catalogRef.catalogVersion)!.catalog
      const warehouseItems = raw.warehouse.items.map((item) => createItemInstance(item, catalog.physical))
      if (warehouseItems.some((item) => !catalog.data.items.some((d) => d.physical.id === item.definitionId && d.ordinary))) invalid('Nonordinary initial warehouse item')
      const warehouseStates = createItemStateCollectionSnapshot(raw.warehouse.itemStates.states, warehouseItems, catalog.resources)
      const all = [...carriedItems(common.carried), ...warehouseItems]
      if (new Set(all.map((i) => i.instanceId)).size !== all.length || all.some((i) => isSourceEntityId(i.instanceId))) invalid('Duplicate or prematurely issued source item')
      return deepFreeze({ ...raw, ...common, warehouse: { items: warehouseItems, itemStates: warehouseStates } })
    }
    // The A schema is exact. Normalize only declaration ordering after checking every fact.
    const value = readTerminalSnapshot({ ...h, missions: ordered }, deps)
    if (value.phase === 'active-world') {
      const site = value.site!
      const clock = value.character.clock
      const mission = value.missions.find((m) => m.status === 'active')!
      if (clock.kind !== 'active') invalid('Active state has no active clock')
      if (site.pending.kind !== 'none') throw new TerminalResidenceSaveError('UNSUPPORTED_STAGE', 'Live combat requires a future coordinator')
      const catalog = policyFor(site.binding, deps).catalog
      readLocationContext({ character: value.character, site, carried: value.carried, itemStates: value.itemStates },
        { mission, cycle: { identity: value.character.identity, revision: value.character.revision, cycle: value.character.cycle,
          lifecycle: clock, stableContext: 'stable', rest: null, normalReturn: null, departure: null } },
        { residence: deps.residence, catalog })
    }
    validateTerminalEntityHistory(value, deps)
    return value
  } catch (error) {
    if (error instanceof TerminalResidenceSaveError) throw error
    throw new TerminalResidenceSaveError('INVALID_STATE', 'Aggregate violates a formal identity, body, site or terminal boundary')
  }
}
