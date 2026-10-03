import type { BodyStep, CharacterCycleState, ResidenceRequestBinding, ResidenceIdentity } from '../character-cycle'
import type { RunIdentity } from '../domain/run-identity'

export type FreeResidenceAction = 'organize' | 'revealed-pickup' | 'medical' | 'food'
export type PaidResidenceAction = 'move' | 'search' | 'extraction' | 'repair' | 'recharge' | 'npc-handover' | 'install'
export type ResidenceCost = Readonly<{ kind: 'free'; amount: 0 }> | Readonly<{
  kind: 'paid'; base: number; factors: readonly Readonly<{ numerator: number; denominator: number }>[]
}>
export type ResidenceActionRequest = ResidenceRequestBinding & (
  | Readonly<{ action: FreeResidenceAction; cost: Extract<ResidenceCost, { kind: 'free' }> }>
  | Readonly<{ action: PaidResidenceAction; cost: Extract<ResidenceCost, { kind: 'paid' }> }>
)
/** A view can be queried, but is never a completed action or an effect plan. */
export type ResidenceQueryRequest = ResidenceActionRequest | (ResidenceRequestBinding &
  Readonly<{ action: 'view'; cost: Extract<ResidenceCost, { kind: 'free' }> }>)
export type ResidenceCompletion = Readonly<{
  identity: ResidenceIdentity; revision: number; execution: RunIdentity | null
  request: ResidenceActionRequest; energyBefore: number; energyAfter: number
}>
export type ResidencePrimaryEffects = Readonly<{ healthLoss: number; exposuresAdded: number }>
export type ResidenceEffectProvider = (completion: ResidenceCompletion) => Readonly<{
  completion: ResidenceCompletion; effects: ResidencePrimaryEffects
}>
/** An already-triggered fact supplied by the controlled coordinator, not a UI flag. */
export type ResidenceTrigger = Readonly<{
  identity: ResidenceIdentity; revision: number; execution: RunIdentity; triggerId: string
  kind: 'combat-action-completed' | 'bleeding-checkpoint' | 'immediate-result'
  effects: ResidencePrimaryEffects
}>
export type ResidenceTriggeredRequest = ResidenceRequestBinding & Readonly<{ triggerId: string }>
export type ResidenceActionPlan = Readonly<{
  base: Readonly<{ identity: ResidenceIdentity; revision: number }>
  snapshot: CharacterCycleState; cost: number; steps: readonly BodyStep[]
  outcome: 'alive' | 'death'; deathCause: BodyStep['kind'] | null
}>
