import type { z } from 'zod'
import type { DeepReadonly } from '../config'
import type { TaskCommand } from '../residence-task/validation'
import type { readSupplySourceSelection } from '../residence-task/shared-sources'
import type { supplyTaskTransferSchema } from '../residence-task/shared-transfer'
import type { supplyInventorySchema } from '../residence-supply/shared-inventory'
import type { supplyMedicalSchema } from '../residence-supply/shared-medical'
import type { supplyMaintenanceSchema } from '../residence-supply/shared-maintenance'
import type { CombatPlayerActionCommand } from '../combat/combat-types'
type Revision = { expectedRevision: number }
/** Structural normalized core intents; strict parsing is owned by existing formal constructors.
 * This is not a next state, plan, authority, save or session command owner. */
export type PlayerCoreCommand = DeepReadonly<
  | { kind: 'task'; command: TaskCommand }
  | { kind: 'source'; command: ReturnType<typeof readSupplySourceSelection>['command'] }
  | { kind: 'inventory'; command: z.infer<typeof supplyInventorySchema> }
  | { kind: 'medical'; command: z.infer<typeof supplyMedicalSchema> }
  | { kind: 'maintenance'; command: z.infer<typeof supplyMaintenanceSchema> }
  | { kind: 'task-transfer'; command: z.infer<typeof supplyTaskTransferSchema> }
  | { kind: 'depart'; command: Revision & { kind: 'depart'; commissionId: string } }
  | { kind: 'move'; command: Revision & { kind: 'move'; edgeId: string } }
  | { kind: 'rest'; command: Revision & { kind: 'rest' } }
  | { kind: 'terminal'; command: Revision & { kind: 'deliver' | 'withdraw' | 'deadline' } }
  | { kind: 'combat'; command: Revision & { kind: 'combat-action'; expectedBattleId: string;
      command: CombatPlayerActionCommand; instanceId?: string; quantity?: 1 } }
>
export type SafeCommandQualification = Readonly<{
  kind: 'available' | 'unavailable' | 'invalid-selection' | 'unknown'; cost: number | null
}>
