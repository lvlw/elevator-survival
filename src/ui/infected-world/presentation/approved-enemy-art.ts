// Owner-approved DEV-only enemy art. Full PNGs; registration is placement, never gameplay.
import type { PlayerOpponentPresentation } from '../../../state/residence-session/player-types'
import art0 from '../../../assets/presentation/world-battle-v1/enemy_infected_orderly_pristine_v02.png'
import art1 from '../../../assets/presentation/world-battle-v1/enemy_infected_orderly_wounded_v02.png'
import art2 from '../../../assets/presentation/world-battle-v1/enemy_infected_orderly_heavy_wounded_v02.png'
import art3 from '../../../assets/presentation/world-battle-v1/enemy_infected_orderly_critical_v02.png'
import art4 from '../../../assets/presentation/world-battle-v1/enemy_infected_orderly_disabled_v02.png'
import art5 from '../../../assets/presentation/world-battle-v1/enemy-porter-pristine-v1.png'
import art6 from '../../../assets/presentation/world-battle-v1/enemy-porter-wounded-v1.png'
import art7 from '../../../assets/presentation/world-battle-v1/enemy-porter-heavy_wounded-v1.png'
import art8 from '../../../assets/presentation/world-battle-v1/enemy-porter-critical-v1.png'
import art9 from '../../../assets/presentation/world-battle-v1/enemy-porter-disabled-v1.png'
import art10 from '../../../assets/presentation/world-battle-v1/enemy-technician-pristine-v1.png'
import art11 from '../../../assets/presentation/world-battle-v1/enemy-technician-wounded-v1.png'
import art12 from '../../../assets/presentation/world-battle-v1/enemy-technician-heavy_wounded-v1.png'
import art13 from '../../../assets/presentation/world-battle-v1/enemy-technician-critical-v1.png'
import art14 from '../../../assets/presentation/world-battle-v1/enemy-technician-disabled-v1.png'

export const enemyArtStages = ['healthy', 'wounded', 'severely-wounded', 'critical', 'incapacitated'] as const
export type EnemyArtStage = typeof enemyArtStages[number]
export type EnemyArtKey = 'infected-orderly' | 'infected-porter' | 'infected-technician'
export type EnemyArtMember = Readonly<{ src: string; width: number; height: number; placement: Readonly<{ left: number; top: number; width: number }> }>
export type EnemyArtGroup = Readonly<{ key: EnemyArtKey; stages: Readonly<Record<EnemyArtStage, EnemyArtMember>> }>
export const approvedEnemyArt: Readonly<Record<EnemyArtKey, EnemyArtGroup>> = Object.freeze({
  "infected-orderly": Object.freeze({ key: "infected-orderly", stages: Object.freeze({
    "healthy": Object.freeze({ src: art0, width: 1024, height: 1280, placement: Object.freeze({"left": -0.05371093750000296, "top": 9.207031250000004, "width": 90.0}) }),
    "wounded": Object.freeze({ src: art1, width: 1024, height: 1280, placement: Object.freeze({"left": 7.8125, "top": 6.499999999999998, "width": 90.0}) }),
    "severely-wounded": Object.freeze({ src: art2, width: 1024, height: 1280, placement: Object.freeze({"left": 4.011230468749997, "top": 8.679687500000004, "width": 90.0}) }),
    "critical": Object.freeze({ src: art3, width: 1024, height: 1280, placement: Object.freeze({"left": 2.5610351562499987, "top": 9.769531250000002, "width": 90.0}) }),
    "incapacitated": Object.freeze({ src: art4, width: 1024, height: 1280, placement: Object.freeze({"left": 9.636230468749995, "top": 11.457031249999996, "width": 90.0}) }),
  }) }),
  "infected-porter": Object.freeze({ key: "infected-porter", stages: Object.freeze({
    "healthy": Object.freeze({ src: art5, width: 1122, height: 1402, placement: Object.freeze({"left": 2.2851562499999942, "top": 8.536458333333337, "width": 91.30859375}) }),
    "wounded": Object.freeze({ src: art6, width: 1122, height: 1402, placement: Object.freeze({"left": 2.054036458333338, "top": 8.373697916666671, "width": 91.30859375}) }),
    "severely-wounded": Object.freeze({ src: art7, width: 1121, height: 1403, placement: Object.freeze({"left": -1.964925130208332, "top": 8.145833333333337, "width": 91.22721354166667}) }),
    "critical": Object.freeze({ src: art8, width: 1122, height: 1402, placement: Object.freeze({"left": -1.2211100260416607, "top": 6.648437500000004, "width": 91.30859375}) }),
    "incapacitated": Object.freeze({ src: art9, width: 1122, height: 1402, placement: Object.freeze({"left": 2.621663411458338, "top": 10.001302083333337, "width": 91.30859375}) }),
  }) }),
  "infected-technician": Object.freeze({ key: "infected-technician", stages: Object.freeze({
    "healthy": Object.freeze({ src: art10, width: 1122, height: 1402, placement: Object.freeze({"left": 2.1105957031249956, "top": 7.169270833333338, "width": 91.30859375}) }),
    "wounded": Object.freeze({ src: art11, width: 1122, height: 1402, placement: Object.freeze({"left": 1.938883463541674, "top": 7.136718750000004, "width": 91.30859375}) }),
    "severely-wounded": Object.freeze({ src: art12, width: 1122, height: 1402, placement: Object.freeze({"left": -3.3105468750000013, "top": 7.039062500000004, "width": 91.30859375}) }),
    "critical": Object.freeze({ src: art13, width: 1122, height: 1402, placement: Object.freeze({"left": -0.4549153645833304, "top": 7.039062500000004, "width": 91.30859375}) }),
    "incapacitated": Object.freeze({ src: art14, width: 1122, height: 1402, placement: Object.freeze({"left": -9.481201171874995, "top": 7.527343750000004, "width": 91.30859375}) }),
  }) }),
})
export function isEnemyArtStage(stage: unknown): stage is EnemyArtStage {
  return typeof stage === 'string' && Object.hasOwn(approvedEnemyArt['infected-orderly'].stages, stage)
}
export function selectEnemyArt(opponent: PlayerOpponentPresentation, stage: unknown): EnemyArtGroup | null {
  if (opponent.kind !== 'known' || typeof opponent.visualKey !== 'string' || !Object.hasOwn(approvedEnemyArt, opponent.visualKey) || !isEnemyArtStage(stage)) return null
  return approvedEnemyArt[opponent.visualKey]
}
