import { z } from 'zod'
import { deepFreeze } from '../../core/config'
import { parseResidence } from '../../core/residence-config/validation'
import { executionSchema, readValue, readExecution } from '../../core/mission-lifecycle/validation'
import { readCycleContext } from '../../core/character-cycle'
import { supplyCharacterSchema } from '../../core/residence-supply/validation'
import { establishCombatInitial } from '../../core/residence-combat/initial'
import { requireCombatResidencePolicy } from '../residence-save/combat-policy'
import { readCombatResidenceExpectation } from '../residence-save/combat-validation'
import { combatExpectationSchema } from '../residence-save/combat-schema'
import type { CombatResidencePolicy } from '../residence-save/combat-types'
import { ResidenceSessionError } from './types'
import { assertCombatData } from './combat-composition'

const schema = z.strictObject({ character: supplyCharacterSchema, mission: z.unknown(), execution: executionSchema,
  tool: z.enum(['crow', 'lamp', 'toolbox']), specialty: z.enum(['scout', 'engineer', 'survival']) })
export class CombatInitialProgressObserved extends ResidenceSessionError {
  constructor() { super('NOT_AVAILABLE', 'Initial materials describe existing progress') }
}
export function prepareCombatInitial(input: unknown, policy: CombatResidencePolicy) {
  assertCombatData(input, 'INVALID_FACTORY_RESULT')
  const raw = parseResidence(schema, input), { dependencies: deps, versions } = requireCombatResidencePolicy(policy), s = deps.supply
  const binding = { characterId: s.residence.scope.characterId, mission: s.catalog.data.mission }
  const mission = readValue(raw.mission, binding, s.residence.scope)
  if (mission.status !== 'unaccepted' || raw.character.clock.kind !== 'first-ready' ||
    raw.character.revision !== 0 || raw.character.cycle !== 1) throw new CombatInitialProgressObserved()
  const execution = readExecution(raw.execution, binding)
  const expected = readCombatResidenceExpectation(parseResidence(combatExpectationSchema, { identity: raw.character.identity,
    phase: 'first-hub', revision: 0, cycle: 1, versions,
    missions: s.residence.scope.declarations.map(m => ({ status: 'unaccepted',
      binding: { characterId: binding.characterId, mission: m } })),
    initial: { binding, execution, choices: { tool: raw.tool, specialty: raw.specialty } }, battle: null, closure: null }), policy)
  const character = readCycleContext(raw.character, { identity: expected.identity, revision: 0, cycle: 1,
    lifecycle: { kind: 'first' }, rest: null, stableContext: 'stable', normalReturn: null, departure: null }, s.residence).state
  const value = establishCombatInitial(deepFreeze({ ...raw, character, mission, execution }), deps)
  return { value, expected }
}
