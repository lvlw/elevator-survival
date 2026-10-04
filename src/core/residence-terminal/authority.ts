import { deepFreeze } from '../config'
import { readLocationContext } from '../residence-location/validation'
import type { LocationAuthority, ResidenceLocationSnapshot } from '../residence-location'
import type { TerminalAuthority, TerminalDependencies, TerminalSnapshot } from './types'
import { TerminalError } from './types'
import { readTerminalSnapshot, policyFor, same, ensure } from './validation'

type Record = Readonly<{ fingerprint: string; dependencies: TerminalDependencies; location: LocationAuthority }>
const authorities = new WeakMap<object, Record>()
export function locationOf(value: TerminalSnapshot): ResidenceLocationSnapshot {
  ensure(value.site, 'No active site')
  return { character: value.character, site: value.site, carried: value.carried, itemStates: value.itemStates }
}
/** Trusted composition supplies current and independent location authority. This is
 * not proof against a caller discarding all history; the future owner retains that duty. */
export function createTerminalAuthority(input: unknown, location: LocationAuthority, dependencies: TerminalDependencies): TerminalAuthority {
  const value = readTerminalSnapshot(input, dependencies)
  ensure(value.phase === 'active-world', 'Only an existing active execution can receive terminal authority')
  const p = policyFor(locationOf(value).site.binding, dependencies)
  const checked = readLocationContext(locationOf(value), location, { residence: dependencies.residence, catalog: p.catalog })
  ensure(same(checked.authority.mission, value.missions.find((m) => m.status === 'active')), 'Independent active fact mismatch')
  const deps: TerminalDependencies = deepFreeze({ configuration: dependencies.configuration,
    residence: { ...dependencies.residence, scope: structuredClone(dependencies.residence.scope) },
    policies: dependencies.policies.map((p) => ({ ...p, specialDefinitionIds: [...p.specialDefinitionIds], permissionDefinitionIds: [...p.permissionDefinitionIds] })) })
  const authority = Object.freeze({ kind: 'residence-terminal-authority' as const })
  authorities.set(authority, { fingerprint: JSON.stringify(value), dependencies: deps, location: checked.authority })
  return authority
}
export function readAuthorized(input: unknown, authority: TerminalAuthority) {
  const record = authority && authorities.get(authority)
  if (!record) throw new TerminalError('STALE_AUTHORITY', 'No issued terminal authority')
  const value = readTerminalSnapshot(input, record.dependencies)
  if (record.fingerprint !== JSON.stringify(value)) throw new TerminalError('STALE_AUTHORITY', 'Complete current state changed')
  const policy = policyFor(locationOf(value).site.binding, record.dependencies)
  return { value, policy, dependencies: record.dependencies, location: record.location }
}
