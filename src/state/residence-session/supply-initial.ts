import { z } from 'zod'
import { deepFreeze } from '../../core/config'
import { parseResidence } from '../../core/residence-config/validation'
import { executionSchema, readValue, readExecution } from '../../core/mission-lifecycle/validation'
import { readCycleContext } from '../../core/character-cycle'
import { supplyCharacterSchema } from '../../core/residence-supply/validation'
import { establishSupplyInitial } from '../../core/residence-supply/initial'
import { requireSupplyResidencePolicy } from '../residence-save/supply-policy'
import { readSupplyResidenceExpectation } from '../residence-save/supply-validation'
import type { SupplyResidencePolicy } from '../residence-save/supply-types'
import { ResidenceSessionError } from './types'

const materialsSchema = z.strictObject({ character: supplyCharacterSchema, mission: z.unknown(),
  execution: executionSchema, tool: z.enum(['crow', 'lamp', 'toolbox']), specialty: z.enum(['scout', 'engineer', 'survival']) })
/** Internal signal: validated launch material establishes existing progress. */
export class SupplyInitialProgressObserved extends ResidenceSessionError {
  constructor() { super('NOT_AVAILABLE', 'Initial materials describe existing progress') }
}
export function prepareSupplyInitial(input: unknown, policy: SupplyResidencePolicy) {
  const raw = parseResidence(materialsSchema, input), deps = requireSupplyResidencePolicy(policy)
  const binding = { characterId: deps.residence.scope.characterId, mission: deps.catalog.data.mission }
  const mission = readValue(raw.mission, binding, deps.residence.scope)
  if (mission.status !== 'unaccepted' || raw.character.clock.kind !== 'first-ready' || raw.character.revision !== 0 || raw.character.cycle !== 1)
    throw new SupplyInitialProgressObserved()
  const execution = readExecution(raw.execution, binding)
  // Validate independent material before the production call, not against output origins.
  const expected = readSupplyResidenceExpectation({ identity: raw.character.identity,
    phase: 'first-hub', revision: 0, cycle: 1,
    missions: deps.residence.scope.declarations.map(m => ({ status: 'unaccepted',
      binding: { characterId: binding.characterId, mission: m } })),
    initial: { binding, execution } }, policy)
  const character = readCycleContext(raw.character, { identity: expected.identity, revision: 0, cycle: 1,
    lifecycle: { kind: 'first' }, rest: null, stableContext: 'stable', normalReturn: null, departure: null }, deps.residence).state
  const value = establishSupplyInitial(deepFreeze({ ...raw, character, mission, execution }), deps)
  return { value, expected }
}
