import type { queryPlayerResidenceKnowledge, LocationCommand } from '../../core/residence-location'
import type { ResidenceAggregate, ResidenceSavePolicy, ResidenceSaveError } from '../residence-save'

export type ResidenceMoveCommand = Extract<LocationCommand, { kind: 'move' }>
export type ResidenceStorage = Readonly<{ read(): string | null; write(serialized: string): void }>
export type Persistence = 'not-attempted' | 'saved' | 'save-failed'
export type SessionStatus = 'unbootstrapped' | 'no-save' | 'read-error' | 'blocked' | 'ready'
export type SessionDiagnostic = ResidenceSaveError['code'] | 'STORAGE_READ_FAILED' | null
/** Internal headless diagnostic, NOT a player-facing model (contains identities/seeds). */
export type ResidenceSessionView = Readonly<{ status: SessionStatus; current: ResidenceAggregate | null;
  persistence: Persistence; diagnostic: SessionDiagnostic }>
export type ResidenceCommit = Readonly<{ kind: 'committed'; current: ResidenceAggregate;
  persistence: Exclude<Persistence, 'not-attempted'>; notificationErrors: readonly Readonly<{ code: 'LISTENER_FAILED' }>[] }>
export type ResidenceSession = Readonly<{
  getState(): ResidenceSessionView
  queryKnowledge(): ReturnType<typeof queryPlayerResidenceKnowledge> | null
  subscribe(listener: (view: ResidenceSessionView) => void): () => void
  bootstrap(): ResidenceSessionView
  retryRead(): ResidenceSessionView
  createFirst(): ResidenceCommit
  dispatch(command: unknown): ResidenceCommit
  retrySave(): ResidenceSessionView
}>
declare const domainBrand: unique symbol
export type ResidenceDomain = Readonly<{ [domainBrand]: true }>
export type ResidenceSessionComposition = Readonly<{ policy: ResidenceSavePolicy; storage: ResidenceStorage; createFirst: () => unknown }>
export class ResidenceSessionError extends Error {
  constructor(public readonly code: 'BUSY' | 'DOMAIN_CLAIMED' | 'INVALID_DOMAIN' | 'INVALID_COMPOSITION' |
    'NOT_AVAILABLE' | 'INVALID_COMMAND' | 'STALE_COMMAND' | 'BINDING_MISMATCH' | 'UNSUPPORTED_RESULT' |
    'INVALID_FACTORY_RESULT' | 'FACTORY_FAILED' | 'PLAN_MISMATCH', message: string) {
    super(message); this.name = 'ResidenceSessionError'
  }
}
