import { planCharacterCycle, type CycleAuthority } from '../../core/character-cycle'
import { sameResidenceValue as same } from '../../core/character-cycle/validation'
import { activateMission } from '../../core/mission-lifecycle/controlled'
import { readExecution } from '../../core/mission-lifecycle/validation'
import { safeAdd } from '../../core/residence-config/validation'
import { establishResidenceLocation } from '../../core/residence-location/controlled'
import { queryTerminalRewardCapacity, type TerminalConfig, type TerminalSnapshot } from '../../core/residence-terminal'
import { terminalResidenceDependencies } from '../residence-save/terminal-validation'
import type { FreshTerminalResidenceHub, TerminalResidenceSavePolicy } from '../residence-save/terminal-index'
import type { ResidenceLaunchCommand } from './types'
import { TerminalResidenceSessionError } from './terminal-types'

/** The actual launch preflight, also independently testable without inventing a valid rich fresh hub. */
export function assertTerminalLaunchCapacity(balance: unknown, configuration: TerminalConfig): void {
  if (!queryTerminalRewardCapacity(balance, configuration)) {
    throw new TerminalResidenceSessionError('REWARD_CAPACITY', 'Insufficient space for the complete reward')
  }
}
export function proposeTerminalFirstLaunch(current: FreshTerminalResidenceHub, command: ResidenceLaunchCommand,
  policy: TerminalResidenceSavePolicy, provideExecution: (() => unknown) | undefined): TerminalSnapshot {
  const character = current.character
  if (!same(command.identity, character.identity)) throw new TerminalResidenceSessionError('BINDING_MISMATCH', 'Foreign launch identity')
  const catalog = policy.policies.find((p) => p.catalog.data.id === current.catalogRef.catalogId &&
    p.catalog.data.version === current.catalogRef.catalogVersion)?.catalog
  const selected = current.missions.find((m) => m.binding.mission.commissionId === command.commissionId)
  if (!catalog || !provideExecution || character.clock.kind !== 'first-ready' || character.cycle !== 1 ||
    character.revision !== 0 || command.expectedRevision !== character.revision ||
    current.missions.some((m) => m.status !== 'unaccepted') || !selected || selected.status !== 'unaccepted' ||
    !same(selected.binding.mission, catalog.data.mission)) {
    throw new TerminalResidenceSessionError('NOT_AVAILABLE', 'No supported first launch')
  }
  const revision = safeAdd(character.revision, 1)
  assertTerminalLaunchCapacity(current.balance, policy.terminalConfiguration)
  let raw: unknown
  try { raw = provideExecution() }
  catch { throw new TerminalResidenceSessionError('EXECUTION_PROVIDER_FAILED', 'Execution provider failed; nothing committed') }
  const execution = readExecution(raw, selected.binding)
  const { residence } = terminalResidenceDependencies(character.identity.characterId, policy)
  const mission = activateMission(selected, { binding: selected.binding, execution }, residence.scope)
  const first: CycleAuthority = { identity: character.identity, revision: character.revision, cycle: character.cycle,
    lifecycle: { kind: 'first' }, stableContext: 'stable', rest: null, normalReturn: null, departure: { mission: selected, execution } }
  const departure = planCharacterCycle(character, { kind: 'depart', identity: character.identity,
    expectedRevision: character.revision, commissionId: command.commissionId }, first, residence)
  const next = departure.snapshot
  if (departure.outcome !== 'alive' || departure.deathCause !== null || departure.requiresDeadlineClosure !== null ||
    departure.steps.length !== 0 || next.clock.kind !== 'active') {
    throw new TerminalResidenceSessionError('PLAN_MISMATCH', 'First departure must not settle a night or terminal result')
  }
  const location = establishResidenceLocation({ character: next, carried: current.carried, itemStates: current.itemStates },
    { mission, cycle: { ...first, revision: next.revision, cycle: next.cycle, lifecycle: next.clock, departure: null } }, { residence, catalog })
  if (location.site.pending.kind !== 'none' || location.character.body.condition.currentHealth === 0) {
    throw new TerminalResidenceSessionError('UNSUPPORTED_RESULT', 'Entry requires an unimplemented combat coordinator')
  }
  if (!same(departure.base, { identity: character.identity, revision: character.revision }) || next.revision !== revision ||
    next.cycle !== character.cycle || !same(next.identity, character.identity) || !same(next.body, character.body) ||
    !same(next.clock, { kind: 'active', mission: selected.binding.mission, execution, startCycle: character.cycle, taskDay: 1 }) ||
    !same(location.character, next) || !same(location.carried, current.carried) || !same(location.itemStates, current.itemStates)) {
    throw new TerminalResidenceSessionError('PLAN_MISMATCH', 'First launch violated carry-forward or clock continuity')
  }
  const { catalogRef: _ref, ...retained } = current
  return { ...retained, phase: 'active-world', ...location, missions: current.missions.map((m) => m === selected ? mission : m) }
}
