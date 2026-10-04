import type { queryPlayerResidenceKnowledge } from '../../core/residence-location'
import type { TerminalCommand, queryTerminalEligibility } from '../../core/residence-terminal'
import type { TerminalResidenceAggregate, TerminalResidenceSavePolicy, TerminalResidenceSaveError } from '../residence-save/terminal-index'
import type { ResidenceSessionCommand, ResidenceStorage, Persistence, SessionStatus } from './types'

export type TerminalResidenceSessionCommand = ResidenceSessionCommand | TerminalCommand
export type TerminalResidenceComposition = Readonly<{
  policy: TerminalResidenceSavePolicy
  storage: ResidenceStorage
  createFirst: () => unknown
  provideFirstExecution?: () => unknown
}>
/** Headless diagnostics only. Current contains internal identities/seeds, NOT a player ViewModel. */
export type TerminalResidenceSessionView = Readonly<{
  status: SessionStatus; current: TerminalResidenceAggregate | null; persistence: Persistence
  diagnostic: TerminalResidenceSaveError['code'] | 'STORAGE_READ_FAILED' | null
}>
export type TerminalResidenceCommit = Readonly<{
  kind: 'committed'; current: TerminalResidenceAggregate; persistence: 'saved' | 'save-failed'
  notificationErrors: readonly Readonly<{ code: 'LISTENER_FAILED' }>[]
}>
export type TerminalResidenceSession = Readonly<{
  getState(): TerminalResidenceSessionView
  queryKnowledge(): ReturnType<typeof queryPlayerResidenceKnowledge> | null
  queryTerminalEligibility(): ReturnType<typeof queryTerminalEligibility>
  subscribe(listener: (view: TerminalResidenceSessionView) => void): () => void
  bootstrap(): TerminalResidenceSessionView
  retryRead(): TerminalResidenceSessionView
  createFirst(): TerminalResidenceCommit
  dispatch(command: unknown): TerminalResidenceCommit
  retrySave(): TerminalResidenceSessionView
}>
export class TerminalResidenceSessionError extends Error {
  constructor(public readonly code: 'BUSY' | 'DOMAIN_CLAIMED' | 'INVALID_DOMAIN' | 'INVALID_COMPOSITION' |
    'NOT_AVAILABLE' | 'STALE_COMMAND' | 'BINDING_MISMATCH' | 'UNSUPPORTED_RESULT' | 'INVALID_FACTORY_RESULT' |
    'FACTORY_FAILED' | 'EXECUTION_PROVIDER_FAILED' | 'PLAN_MISMATCH' | 'REWARD_CAPACITY', message: string) {
    super(message); this.name = 'TerminalResidenceSessionError'
  }
}
