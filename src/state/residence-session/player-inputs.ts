import { deepFreeze } from '../../core/config'
import { queryPlayerActionInputs, type CoreActionInputs, type InputItem } from '../../core/residence-supply/player-inputs'
import type { CombatDependencies } from '../../core/residence-combat/types'
import type { PlayerContext } from './player-context'
import type { PlayerHandle } from './player-types'
import { PlayerSelectionError } from './player-errors'

type PublicInputItem = Omit<InputItem, 'key'> & Readonly<{ selector: PlayerHandle }>
/** Necessary request inputs, not an action Preview or an execution capability. */
export type PlayerActionInputs = Readonly<Omit<CoreActionInputs, 'items' | 'targetItems' | 'wounds' | 'materials' | 'allocation'> & {
  convenience: 'ordinary-whole-pickup' | null;
  items: readonly PublicInputItem[]; targetItems: readonly PublicInputItem[];
  wounds: readonly Readonly<{ selector: PlayerHandle; ordinal: number; kind: string; treatment: string }>[];
  materials: readonly Readonly<{ name: string; quantity: number; choices: readonly PublicInputItem[] }>[];
  allocation: Readonly<{ pool: number; targets: readonly Readonly<{ selector: PlayerHandle; name: string; current: number; maximum: number }>[] }> | null
}>

export function describePlayerAction(context: PlayerContext, action: PlayerHandle, deps: CombatDependencies): PlayerActionInputs {
  const binding = context.resolve(action, 'action')
  if (binding.purpose !== 'action') throw new PlayerSelectionError()
  const source = queryPlayerActionInputs(context.value, binding.action, deps)
  const item = ({ key, ...rest }: InputItem): PublicInputItem => ({ ...rest, selector: context.item(key) })
  return deepFreeze({ ...source, convenience: binding.action.family === 'inventory' && binding.action.key === 'pickup' ? 'ordinary-whole-pickup' : null,
    items: source.items.map(item), targetItems: source.targetItems.map(item),
    wounds: source.wounds.map(({ key, ...rest }) => ({ ...rest, selector: context.wound(key) })),
    materials: source.materials.map(m => ({ ...m, choices: m.choices.map(item) })),
    allocation: source.allocation ? { pool: source.allocation.pool,
      targets: source.allocation.targets.map(({ key, ...rest }) => ({ ...rest, selector: context.item(key) })) } : null })
}
