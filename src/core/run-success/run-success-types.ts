import type { FrozenRuleConfig } from '../config'
import type { RunIdentity } from '../domain'

/**
 * Audit-only source facts emitted by a future formal success resolver.  This
 * framework validates and persists them, but does not decide success.
 */
export interface RunSuccessTerminalSource {
  readonly kind: 'future-success-resolver'
  readonly resolverId: string
  readonly auditId: string
}

/** A terminal Run result with no active gameplay, inventory, or Profile data. */
export interface RunSuccessSnapshot {
  readonly kind: 'run-success'
  readonly source: RunSuccessTerminalSource
  readonly reason: string | null
  readonly runIdentity: RunIdentity
  readonly terminalDay: number
}

export interface RunSuccessDependencies {
  readonly config: FrozenRuleConfig
}
