import type { SupplyValue } from '../../core/residence-supply/types'
import type { querySupplyKnownObjects } from '../../core/residence-supply/queries'
import type { planSupplyMaintenance } from '../../core/residence-supply/maintenance'
import type { SupplyResidencePolicy, SupplyResidenceSaveError } from '../residence-save/supply-types'
import type { Persistence, ResidenceStorage, SessionStatus } from './types'

/** Controlled launch materials, never inferred from storage or a request. */
export type SupplySessionComposition = Readonly<{
  policy: SupplyResidencePolicy; storage: ResidenceStorage; startup: 'first' | 'existing'
  provideInitialMaterials?: () => unknown
  provideColdExpectation?: () => unknown
}>
/** Internal diagnostic, not a player ViewModel. */
export type SupplySessionView = Readonly<{
  status: SessionStatus; current: SupplyValue | null; persistence: Persistence
  diagnostic: SupplyResidenceSaveError['code'] | 'STORAGE_READ_FAILED' | 'STARTUP_BLOCKED' | null
}>
export type SupplyMaintenanceResult = Readonly<Pick<ReturnType<typeof planSupplyMaintenance>, 'resourceResult' | 'unusedPool'>>
export type SupplySessionCommit = Readonly<{
  kind: 'committed'; current: SupplyValue; persistence: Exclude<Persistence, 'not-attempted'>
  maintenance: SupplyMaintenanceResult | null
  notificationErrors: readonly Readonly<{ code: 'LISTENER_FAILED' }>[]
}>
export type SupplySession = Readonly<{
  getState(): SupplySessionView
  queryKnowledge(): ReturnType<typeof querySupplyKnownObjects> | null
  subscribe(listener: (view: SupplySessionView) => void): () => void
  bootstrap(): SupplySessionView
  retryRead(): SupplySessionView
  createFirst(): SupplySessionCommit
  dispatch(command: unknown): SupplySessionCommit
  retrySave(): SupplySessionView
}>
