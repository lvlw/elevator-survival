import { planCharacterCycle, type CycleAuthority } from '../../core/character-cycle'
import { sameResidenceValue } from '../../core/character-cycle/validation'
import { activateMission, createMissionScope } from '../../core/mission-lifecycle/controlled'
import { readExecution } from '../../core/mission-lifecycle/validation'
import { safeAdd } from '../../core/residence-config/validation'
import { establishResidenceLocation } from '../../core/residence-location/controlled'
import type { ActiveResidenceWorld, FreshResidenceHub, ResidenceSavePolicy } from '../residence-save'
import { residenceCatalog } from '../residence-save/validation'
import { ResidenceSessionError, type ResidenceLaunchCommand } from './types'

/** Complete proposal only. The session remains the sole installer and writer. */
export function proposeFirstResidenceLaunch(current: FreshResidenceHub, command: ResidenceLaunchCommand,
  policy: ResidenceSavePolicy, provideExecution: (() => unknown) | undefined): ActiveResidenceWorld {
  const character = current.character
  if (!sameResidenceValue(command.identity, character.identity)) {
    throw new ResidenceSessionError('BINDING_MISMATCH', 'Launch belongs to another character')
  }
  const catalog = residenceCatalog(current.catalogRef, policy)
  const selected = current.missions.find((m) => m.binding.mission.commissionId === command.commissionId)
  if (!provideExecution || character.clock.kind !== 'first-ready' || character.cycle !== 1 ||
    current.missions.some((m) => m.status !== 'unaccepted') || !selected || selected.status !== 'unaccepted' ||
    !sameResidenceValue(selected.binding.mission, catalog.data.mission)) {
    throw new ResidenceSessionError('NOT_AVAILABLE', 'No supported first commission for this hub')
  }
  const revision = safeAdd(character.revision, 1)
  let raw: unknown
  try { raw = provideExecution() }
  catch { throw new ResidenceSessionError('EXECUTION_PROVIDER_FAILED', 'Execution material provider failed; nothing committed') }
  const execution = readExecution(raw, selected.binding)
  const scope = createMissionScope({ characterId: character.identity.characterId, declarations: policy.declarations },
    (v) => v === policy.rulesVersion)
  const residence = { configuration: policy.configuration, rulesVersion: policy.rulesVersion, scope }
  const mission = activateMission(selected, { binding: selected.binding, execution }, scope)
  const firstAuthority: CycleAuthority = { identity: character.identity, revision: character.revision,
    cycle: character.cycle, lifecycle: { kind: 'first' }, stableContext: 'stable', rest: null,
    normalReturn: null, departure: { mission: selected, execution } }
  const departure = planCharacterCycle(character, { kind: 'depart', identity: character.identity,
    expectedRevision: character.revision, commissionId: command.commissionId }, firstAuthority, residence)
  const next = departure.snapshot
  if (departure.outcome !== 'alive' || departure.requiresDeadlineClosure !== null || next.clock.kind !== 'active') {
    throw new ResidenceSessionError('UNSUPPORTED_RESULT', 'First departure requires a living active result')
  }
  const location = establishResidenceLocation({ character: next, carried: current.carried, itemStates: current.itemStates },
    { mission, cycle: { ...firstAuthority, revision: next.revision, cycle: next.cycle,
      lifecycle: next.clock, departure: null } }, { residence, catalog })
  if (location.site.pending.kind !== 'none' || location.character.body.condition.currentHealth === 0) {
    throw new ResidenceSessionError('UNSUPPORTED_RESULT', 'Entry encounter or terminal result requires a future coordinator')
  }
  if (next.revision !== revision || next.cycle !== character.cycle ||
    !sameResidenceValue(next.identity, character.identity) || !sameResidenceValue(next.body, character.body) ||
    !sameResidenceValue(next.clock, { kind: 'active', mission: selected.binding.mission, execution, startCycle: character.cycle, taskDay: 1 }) ||
    !sameResidenceValue(location.carried, current.carried) || !sameResidenceValue(location.itemStates, current.itemStates)) {
    throw new ResidenceSessionError('PLAN_MISMATCH', 'First departure changed carry-forward or clock continuity')
  }
  return { phase: 'active-world', ...location, missions: current.missions.map((m) => m === selected ? mission : m) }
}
