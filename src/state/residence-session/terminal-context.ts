import type { LocationAuthority } from '../../core/residence-location'
import { readLocationContext } from '../../core/residence-location/validation'
import { createTerminalAuthority } from '../../core/residence-terminal/controlled'
import { locationOf } from '../../core/residence-terminal/authority'
import { policyFor } from '../../core/residence-terminal/validation'
import type { TerminalSnapshot } from '../../core/residence-terminal'
import { terminalResidenceDependencies } from '../residence-save/terminal-validation'
import type { TerminalResidenceSavePolicy } from '../residence-save/terminal-index'
import { TerminalResidenceSessionError } from './terminal-types'

/** Rebuild authorities from this complete canonical current, never from a command. */
export function terminalActiveContext(current: TerminalSnapshot, policy: TerminalResidenceSavePolicy) {
  const clock = current.character.clock
  const mission = current.missions.find((m) => m.status === 'active')
  if (current.phase !== 'active-world' || clock.kind !== 'active' || !current.site || !mission) {
    throw new TerminalResidenceSessionError('NOT_AVAILABLE', 'A complete active execution is required')
  }
  const dependencies = terminalResidenceDependencies(current.character.identity.characterId, policy)
  const catalog = policyFor(current.site.binding, dependencies).catalog
  const authority: LocationAuthority = { mission, cycle: { identity: current.character.identity,
    revision: current.character.revision, cycle: current.character.cycle, lifecycle: clock,
    stableContext: 'stable', rest: catalog.data.nodes.find((n) => n.id === current.site!.nodeId)!.rest,
    normalReturn: null, departure: null } }
  const locationDependencies = { residence: dependencies.residence, catalog }
  const snapshot = readLocationContext(locationOf(current), authority, locationDependencies).snapshot
  return { snapshot, authority, locationDependencies, dependencies,
    terminalAuthority: createTerminalAuthority(current, authority, dependencies) }
}
