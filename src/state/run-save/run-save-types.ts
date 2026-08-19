import type { CurrentDayHubSnapshot } from '../../core/current-day-hub'
import type { RunIdentity } from '../../core/domain'
import type { RunFailureSnapshot } from '../../core/run-termination'
import type { RunSceneSessionSnapshot } from '../../core/scene-launch'

export const RUN_SAVE_FORMAT_VERSION = 1 as const

export type StableRunPhase =
  | Readonly<{ kind: 'current-day-hub'; payload: CurrentDayHubSnapshot }>
  | Readonly<{ kind: 'scene-session'; payload: RunSceneSessionSnapshot }>
  | Readonly<{ kind: 'run-failure'; payload: RunFailureSnapshot }>

export type RunSaveEnvelope =
  | Readonly<{
      saveFormatVersion: typeof RUN_SAVE_FORMAT_VERSION
      kind: 'current-day-hub'
      rulesVersion: string
      runIdentity: RunIdentity
      payload: CurrentDayHubSnapshot
    }>
  | Readonly<{
      saveFormatVersion: typeof RUN_SAVE_FORMAT_VERSION
      kind: 'scene-session'
      rulesVersion: string
      runIdentity: RunIdentity
      payload: RunSceneSessionSnapshot
    }>
  | Readonly<{
      saveFormatVersion: typeof RUN_SAVE_FORMAT_VERSION
      kind: 'run-failure'
      rulesVersion: string
      runIdentity: RunIdentity
      payload: RunFailureSnapshot
    }>

export interface RunSaveStorage {
  read(): string | null
  write(serialized: string): void
  clear(): void
}

export interface BrowserStringStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
