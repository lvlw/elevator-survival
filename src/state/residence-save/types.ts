import type { CharacterCycleState } from '../../core/character-cycle'
import type { MissionDeclaration, MissionLifecycleValue } from '../../core/mission-lifecycle'
import type { ResidenceConfig } from '../../core/residence-config'
import type { LocationCatalog, ResidenceLocationSnapshot } from '../../core/residence-location'

export type CatalogReference = Readonly<{ catalogId: string; catalogVersion: string }>
type Common = Readonly<{ character: CharacterCycleState; missions: readonly MissionLifecycleValue[];
  carried: ResidenceLocationSnapshot['carried']; itemStates: ResidenceLocationSnapshot['itemStates'] }>
export type FreshResidenceHub = Common & Readonly<{ phase: 'fresh-hub'; catalogRef: CatalogReference }>
export type ActiveResidenceWorld = Common & Readonly<{ phase: 'active-world'; site: ResidenceLocationSnapshot['site'] }>
export type ResidenceAggregate = FreshResidenceHub | ActiveResidenceWorld
export type ResidenceSavePolicy = Readonly<{ configuration: ResidenceConfig; rulesVersion: string;
  declarations: readonly MissionDeclaration[]; catalogs: readonly LocationCatalog[] }>
export const RESIDENCE_FORMAT = 'elevator-survival.residence-headless' as const
export const RESIDENCE_FORMAT_VERSION = 1 as const
export type ResidenceEnvelope = Readonly<{ format: typeof RESIDENCE_FORMAT;
  formatVersion: typeof RESIDENCE_FORMAT_VERSION; state: ResidenceAggregate }>
export class ResidenceSaveError extends Error {
  constructor(public readonly code: 'INVALID_JSON' | 'INVALID_ENVELOPE' | 'UNKNOWN_FORMAT' | 'UNKNOWN_VERSION' |
    'UNKNOWN_RULES' | 'UNKNOWN_CONFIGURATION' | 'UNKNOWN_CATALOG' | 'INVALID_STATE' | 'UNSUPPORTED_STAGE', message: string) {
    super(message); this.name = 'ResidenceSaveError'
  }
}
