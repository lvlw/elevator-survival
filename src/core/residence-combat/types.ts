import type { BodyStep } from '../character-cycle'
import type { CombatPlayerActionCommand, TemporaryDefenseSnapshot } from '../combat/combat-types'
import type { CombatProfile } from '../combat/combat-profile'
import type { SupplyDependencies, SupplyIndependentContext, SupplyPlan } from '../residence-supply/types'
import type { SupplyDomain } from '../residence-supply/shared-types'
import type { LocationBinding } from '../residence-location'
export type CombatDependencies = Readonly<{ supply: SupplyDependencies; profiles: readonly CombatProfile[]; lifecycle: import('../run-return').ItemReturnLifecycleCatalog }>
export type EntryWitness = Readonly<{
  id: string; binding: LocationBinding; revision: number; baseRevision: number
  edgeId: string; from: string; to: string; enemyId: string; enemyInstanceId: string
  definitionId: string; previouslyEncountered: boolean; enemyHealth: number
  intent: string; nextCycleIndex: number; actionCount: number; riskIndex: number
  healthBefore: number; healthAfter: number; steps: readonly BodyStep[]
}>
export type CombatBodyTrace = Readonly<{
  kind: 'heal' | 'direct-damage' | 'post-action-bleeding' | 'injury' | 'exposure' | 'treatment'
  actionId: string; ctb: number; requested: number; actual: number
  healthBefore: number; healthAfter: number; reference: string | null
}>
export type CombatUseWitness = Readonly<{
  instanceId: string; definitionId: string; slot: number; dispositionIds: readonly string[]
  kind: 'bandage' | 'painkiller'; quantity: 1
}>
export type DecisionWitness = Readonly<{
  battleId: string; revision: number; baseRevision: number; command: CombatPlayerActionCommand
  ctbBefore: number; ctbAfter: number; playerNext: number; enemyNext: number
  healthBefore: number; healthAfter: number; enemyHealthBefore: number; enemyHealthAfter: number
  actionCountBefore: number; actionCountAfter: number; enemyResponses: number
  riskBefore: number; riskAfter: number; trace: readonly CombatBodyTrace[]
  uses: readonly CombatUseWitness[]
  resources: readonly Readonly<{ instanceId: string; before: number; requested: number; consumed: number; after: number }>[]
  quotaBefore: number; quotaAfter: number
  queue: readonly Readonly<{ reason: 'player-action-scheduled' | 'escape-preparation-scheduled' | 'enemy-action-resolved' |
    'enemy-action-terminal' | 'escape-completed' | 'player-decision-point'
    currentBefore: number; currentAfter: number; playerBefore: number; playerAfter: number; enemyBefore: number; enemyAfter: number }>[]
}>
export type Battle = Readonly<{ entry: EntryWitness; currentCtb: number; playerNext: number; enemyNext: number
  temporaryDefense: TemporaryDefenseSnapshot | null; decision: DecisionWitness | null }>
export type ClosedBattleReceipt = Readonly<{
  entry: EntryWitness; decision: DecisionWitness; outcome: 'victory' | 'escaped'
  exitRevision: number; elapsed: number; requestedEnergy: number; energyBefore: number; energyAfter: number
  nodeId: string
}>
export type CombatDeathReceipt = Readonly<{ id: string; entry: EntryWitness; decision: DecisionWitness; revision: number }>
export type CombatValue = Readonly<SupplyDomain & {
  protocol: 'residence-combat-pure-v1'; battle: Battle | null
  battles: readonly ClosedBattleReceipt[]; combatDeaths: readonly CombatDeathReceipt[]
}>
export type CombatAuthority = Readonly<{ kind: 'residence-combat-authority' }>
export type CombatIndependentContext = SupplyIndependentContext
export type CombatPlan = Readonly<{
  kind: 'residence-combat-plan'; snapshot: CombatValue; baseRevision: number
  producer: SupplyPlan['producer'] | 'combat'; steps: readonly BodyStep[]; energyCost: number
  outcome: 'alive' | 'death'
}>
