import type { MissionDeclaration } from '../../core/mission-lifecycle'
import type { ResidenceConfig } from '../../core/residence-config'
import type { TerminalConfig, TerminalPolicy, TerminalSnapshot } from '../../core/residence-terminal'
import type { CatalogReference } from './types'

export type TerminalResidenceSavePolicy = Readonly<{
  configuration: ResidenceConfig
  terminalConfiguration: TerminalConfig
  rulesVersion: string
  declarations: readonly MissionDeclaration[]
  policies: readonly TerminalPolicy[]
}>
export type FreshTerminalResidenceHub = Omit<TerminalSnapshot, 'phase' | 'site'> & Readonly<{
  phase: 'fresh-hub'; site: null; catalogRef: CatalogReference
}>
export type TerminalResidenceAggregate = FreshTerminalResidenceHub | TerminalSnapshot
export const TERMINAL_RESIDENCE_FORMAT = 'elevator-survival.residence-headless' as const
export const TERMINAL_RESIDENCE_FORMAT_VERSION = 2 as const
export type TerminalResidenceEnvelope = Readonly<{
  format: typeof TERMINAL_RESIDENCE_FORMAT
  formatVersion: typeof TERMINAL_RESIDENCE_FORMAT_VERSION
  state: TerminalResidenceAggregate
}>
export type TerminalResidenceCandidate = Readonly<{
  kind: 'terminal-residence-candidate'; value: TerminalResidenceAggregate
}>
export class TerminalResidenceSaveError extends Error {
  constructor(public readonly code: 'INVALID_JSON' | 'INVALID_ENVELOPE' | 'UNKNOWN_FORMAT' | 'UNKNOWN_VERSION' |
    'INVALID_POLICY' | 'BINDING_MISMATCH' | 'INVALID_STATE' | 'UNSUPPORTED_STAGE' | 'EXPECTED_MISMATCH', message: string) {
    super(message)
    this.name = 'TerminalResidenceSaveError'
  }
}
