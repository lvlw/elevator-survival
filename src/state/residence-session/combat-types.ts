import type { CombatValue } from '../../core/residence-combat/types'
import type { planCombatMaintenance } from '../../core/residence-combat/stable'
import type { queryResidenceCombat, queryCombatTerminalEligibility } from '../../core/residence-combat/queries'
import type { CombatResidencePolicy, CombatResidenceSaveError } from '../residence-save/combat-types'
import type { readCombatResidenceExpectation } from '../residence-save/combat-validation'
import type { Persistence, ResidenceStorage, SessionStatus } from './types'

export type CombatSessionExpectation = ReturnType<typeof readCombatResidenceExpectation>

/** Controlled headless composition. Cold facts pre-exist the candidate read. */
export type CombatSessionComposition = Readonly<{
  policy: CombatResidencePolicy; storage: ResidenceStorage; startup: 'first' | 'existing'
  provideInitialMaterials?: () => unknown
  provideColdExpectation?: () => unknown
}>
/** Internal diagnostic containing full facts; NOT an ordinary player ViewModel. */
export type CombatSessionView = Readonly<{
  status: SessionStatus; current: CombatValue | null; persistence: Persistence
  diagnostic: CombatResidenceSaveError['code'] | 'STORAGE_READ_FAILED' | 'STARTUP_BLOCKED' | null
}>
export type CombatMaintenanceResult = Readonly<Pick<ReturnType<typeof planCombatMaintenance>, 'resourceResult' | 'unusedPool'>>
export type CombatSessionCommit = Readonly<{
  kind: 'committed'; current: CombatValue; persistence: Exclude<Persistence, 'not-attempted'>
  maintenance: CombatMaintenanceResult | null
  notificationErrors: readonly Readonly<{ code: 'LISTENER_FAILED' }>[]
}>
export type CombatSession = Readonly<{
  getState(): CombatSessionView
  queryCombat(): ReturnType<typeof queryResidenceCombat> | null
  queryTerminal(): ReturnType<typeof queryCombatTerminalEligibility> | null
  subscribe(listener: (view: CombatSessionView) => void): () => void
  bootstrap(): CombatSessionView
  retryRead(): CombatSessionView
  createFirst(): CombatSessionCommit
  dispatch(command: unknown): CombatSessionCommit
  retrySave(): CombatSessionView
}>
