import type { BodyStep } from '../character-cycle'
import type { SupplyDependencies, SupplyPlan, SupplyReceipt, SupplyValue } from './types'

/** Common domain facts, never an old protocol authorization or restore candidate. */
export type CombatSupplyReceipt = Readonly<Omit<SupplyReceipt, 'source'> & {
  source: 'combat-death'; combatDeathReceiptId: string
}>
export type SupplyDomain = Readonly<Omit<SupplyValue, 'protocol' | 'receipts'> & {
  receipts: readonly (SupplyReceipt | CombatSupplyReceipt)[]
}>
export type SupplyDomainContext<V extends SupplyDomain, P> = Readonly<{
  dependencies: SupplyDependencies
  read: (input: unknown) => V
  issue: (before: V, after: V, producer: SupplyPlan['producer'],
    steps: readonly BodyStep[], energyCost?: number) => P
}>
