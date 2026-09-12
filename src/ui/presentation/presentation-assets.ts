import hubBackground from '../../assets/presentation/v0.1/visual/bg_elevator_hub_v01.png'
import emergencyHallBackground from '../../assets/presentation/v0.1/visual/bg_emergency_hall_v01.png'
import isolationCorridorBackground from '../../assets/presentation/v0.1/visual/bg_isolation_corridor_v01.png'
import orderlyPristine from '../../assets/presentation/v0.1/visual/enemy_infected_orderly_pristine_v02.png'
import orderlyWounded from '../../assets/presentation/v0.1/visual/enemy_infected_orderly_wounded_v02.png'
import orderlyHeavyWounded from '../../assets/presentation/v0.1/visual/enemy_infected_orderly_heavy_wounded_v02.png'
import orderlyCritical from '../../assets/presentation/v0.1/visual/enemy_infected_orderly_critical_v02.png'
import orderlyDisabled from '../../assets/presentation/v0.1/visual/enemy_infected_orderly_disabled_v02.png'
import metalPipe from '../../assets/presentation/v0.1/visual/icon_metal_pipe_v01.png'
import heavyCoat from '../../assets/presentation/v0.1/visual/icon_heavy_coat_v01.png'
import flashlight from '../../assets/presentation/v0.1/visual/icon_flashlight_v01.png'
import bandage from '../../assets/presentation/v0.1/visual/icon_bandage_v02.png'
import accessCard from '../../assets/presentation/v0.1/visual/icon_isolation_access_card_v02.png'
import sealedCase from '../../assets/presentation/v0.1/visual/icon_sealed_pathogen_case_v02.png'
import fireDoor from '../../assets/presentation/v0.1/visual/event_isolation_fire_door_v02.png'
import pathogenObjective from '../../assets/presentation/v0.1/visual/objective_pathogen_case_v02.png'

export type PresentationVisualKey =
  | 'hub-elevator'
  | 'emergency-hall'
  | 'isolation-corridor'
  | 'infected-orderly-pristine'
  | 'infected-orderly-wounded'
  | 'infected-orderly-heavy-wounded'
  | 'infected-orderly-critical'
  | 'infected-orderly-disabled'
  | 'metal-pipe'
  | 'heavy-coat'
  | 'flashlight'
  | 'bandage'
  | 'isolation-access-card'
  | 'sealed-pathogen-case'
  | 'isolation-fire-door'
  | 'pathogen-case-objective'

export const presentationVisualAssetUrls: Readonly<Record<PresentationVisualKey, string>> = Object.freeze({
  'hub-elevator': hubBackground,
  'emergency-hall': emergencyHallBackground,
  'isolation-corridor': isolationCorridorBackground,
  'infected-orderly-pristine': orderlyPristine,
  'infected-orderly-wounded': orderlyWounded,
  'infected-orderly-heavy-wounded': orderlyHeavyWounded,
  'infected-orderly-critical': orderlyCritical,
  'infected-orderly-disabled': orderlyDisabled,
  'metal-pipe': metalPipe,
  'heavy-coat': heavyCoat,
  flashlight,
  bandage,
  'isolation-access-card': accessCard,
  'sealed-pathogen-case': sealedCase,
  'isolation-fire-door': fireDoor,
  'pathogen-case-objective': pathogenObjective,
})

export interface StableRunUiPresentationAssets {
  readonly hubBackgroundKey?: PresentationVisualKey
  itemVisualKey?(definitionId: string): PresentationVisualKey | null
  enemyVisualKey?(
    definitionId: string,
    healthStage: 'healthy' | 'wounded' | 'severely-wounded' | 'critical' | 'incapacitated',
  ): PresentationVisualKey | null
  sceneNodeVisualKey?(nodeId: string): PresentationVisualKey | null
  obstacleVisualKey?(obstacleId: string): PresentationVisualKey | null
  taskEventVisualKey?(eventId: string): PresentationVisualKey | null
  isAccessCardObstacleOption?(obstacleId: string, optionId: string): boolean
}

export function presentationVisualAssetUrl(key: PresentationVisualKey): string {
  return presentationVisualAssetUrls[key]
}
