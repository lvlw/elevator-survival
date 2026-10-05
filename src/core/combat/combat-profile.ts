import type { FrozenRuleConfig } from '../config'
import type { RandomCursor, RandomDraw } from '../random'
import type { CombatDependencies, CombatRiskTier } from './combat-types'

/** Internal, version-neutral CTB facts. Not a hospital configuration or save format. */
export type CombatRules = Readonly<{
  player: FrozenRuleConfig['combat']['player']
  metalPipe: FrozenRuleConfig['combat']['metalPipe']
  heavyCoat: FrozenRuleConfig['combat']['heavyCoat']
  defend: FrozenRuleConfig['combat']['defend']
  temporaryAttack: FrozenRuleConfig['combat']['temporaryAttack']
  escape: FrozenRuleConfig['combat']['escape']
  riskTiers: FrozenRuleConfig['combat']['riskTiers']
  postPlayerActionBleedingDamage: number
  bandage: Readonly<{ combatCtb: number; healthRecovery: number; stopsBleeding: boolean }>
  painkiller: Readonly<{ combatCtb: number; escapeWoundCtbReduction: number }>
  backpack: FrozenRuleConfig['backpack']
  armorMaximum: number
}>
export type CombatEnemyActionProfile = Readonly<{
  actionId: string; ctb: number; damage: number
  injuryRiskTier: CombatRiskTier; exposureRiskTier: CombatRiskTier
  injuryKind: 'contusion' | 'laceration' | 'bite'
}>
export type CombatProfile = Readonly<{
  definitionId: string; maxHealth: number; firstEnemyCtb: number
  reentryEnemyCtb: number; reentryPlayerCtb: number
  bluntActionDelayBonus: number
  actions: readonly CombatEnemyActionProfile[]
  rules: CombatRules
}>
export type ProfiledCombatDependencies = Readonly<Omit<CombatDependencies, 'config'> & {
  profile: CombatProfile
  draw: (cursor: RandomCursor, min: number, max: number) => RandomDraw<number>
  riskAddress: Readonly<{ executionId: string; catalogId: string }>
}>
export type CombatEngineDependencies = CombatDependencies | ProfiledCombatDependencies
export const isProfiledCombat = (d: CombatEngineDependencies): d is ProfiledCombatDependencies => 'profile' in d
