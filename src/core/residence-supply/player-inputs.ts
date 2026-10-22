import { deepFreeze } from '../config'
import { carriedItems } from '../residence-location/validation'
import { playerTaskOpportunities } from '../residence-task/player-query'
import { playerCombatFacts } from '../residence-combat/player-query'
import { playerResidenceKnowledge } from '../residence-location/player-knowledge'
import { sharedTerminalEligibility } from '../residence-terminal/supply-settlement-shared'
import { numberValue, tableValue } from './config'
import { maintenancePool, maintenanceRecipe, requireMaintenanceTarget, type MaintenanceKind } from './maintenance-qualification'
import { requireSupplyClinicalTarget } from './medical-qualification'
import { requireSupplyTaskTransferItem } from '../residence-task/shared-transfer'
import { SupplyError } from './types'
import type { CombatDependencies, CombatValue } from '../residence-combat/types'

export type InputField = 'item' | 'targetItem' | 'quantity' | 'placement' | 'placements' | 'slot' | 'wound' | 'target' | 'materials' | 'allocations'
export type InputActionReference = Readonly<{ family: string; key: string; method?: string; slot?: number; woundId?: string }>
export type InputClinical = Readonly<{ wound: 'none' | 'untreated' | 'any'; targets: readonly ('contusion' | 'wound')[]; allowNoTarget: boolean }>
export type InputItem = Readonly<{ key: string; name: string; quantity: number; width: number; height: number; canRotate: boolean;
  clinical?: InputClinical }>
export type InputOutput = Readonly<{ name: string; width: number; height: number; unitWeight: number; quantity: number; canRotate: boolean }>
export type CoreActionInputs = Readonly<{ fields: readonly InputField[]; items: readonly InputItem[]; targetItems: readonly InputItem[];
  wounds: readonly Readonly<{ key: string; ordinal: number; kind: string; treatment: string }>[]; slots: readonly number[];
  outputs: readonly InputOutput[]; materials: readonly Readonly<{ name: string; quantity: number; choices: readonly InputItem[] }>[];
  allocation: Readonly<{ pool: number; targets: readonly Readonly<{ key: string; name: string; current: number; maximum: number }>[] }> | null;
  hints: readonly string[] }>

/** Input shapes only. Internal keys are replaced with current opaque handles by the facade. */
export function queryPlayerActionInputs(v: CombatValue, action: InputActionReference, deps: CombatDependencies): CoreActionInputs {
  const s = deps.supply, carried = carriedItems(v.carried), bag = v.carried.backpack.items
  const fields: InputField[] = [], hints: string[] = [], outputs: InputOutput[] = []
  let items: InputItem[] = [], targetItems: InputItem[] = [], slots: number[] = []
  let materials: CoreActionInputs['materials'] = [], allocation: CoreActionInputs['allocation'] = null
  const option = (i: typeof carried[number]): InputItem => {
    const d = s.catalog.physical.get(i.definitionId)
    return { key: i.instanceId, name: d.name, quantity: i.quantity, width: d.width, height: d.height, canRotate: d.canRotate }
  }
  const alias = (i: typeof carried[number]) => s.tasks.data.items.find(d => d.id === i.definitionId)?.alias
  const ordinary = (i: typeof carried[number]) => s.catalog.data.items.find(d => d.physical.id === i.definitionId)!.ordinary
  const output = (name: string, quantity: number) => {
    const d = s.catalog.physical.get(s.tasks.data.items.find(i => i.alias === name)!.id)
    return { name: d.name, quantity, width: d.width, height: d.height, unitWeight: d.unitWeight, canRotate: d.canRotate }
  }
  const recipe = (r: Readonly<Record<string, number>>) => Object.entries(r).map(([name, quantity]) => ({
    name: s.catalog.physical.get(s.tasks.data.items.find(i => i.alias === name)!.id).name, quantity,
    choices: carried.filter(i => alias(i) === name).map(option),
  }))
  const legal = (run: () => unknown) => { try { run(); return true } catch (e) { if (!(e instanceof SupplyError)) throw e; return false } }
  const same = (a: InputActionReference) => a.family === action.family && a.key === action.key && a.method === action.method
  const stable = v.phase === 'active-world' && !v.battle && v.site?.pending.kind === 'none'
  if (action.family === 'depart') {
    if (v.phase !== 'first-hub') throw new Error('Action is not currently public')
  } else if (action.family === 'combat') {
    if (!playerCombatFacts(v, deps)?.actions.some(({ command: c }) => c.kind === action.key && (c.kind !== 'use-quick-slot-item' ||
      c.quickSlotIndex === action.slot && c.targetOpenWoundId === action.woundId))) throw new Error('Action is not currently public')
  } else if (!stable) throw new Error('Action is not currently public')
  else if (action.family === 'task' || action.family === 'source') {
    if (!playerTaskOpportunities(v, s).some(a => same(a) && !a.completed)) throw new Error('Action is not currently public')
    const method = action.method
    if (method && ['crow', 'toolbox', 'lit', 'card'].includes(method)) {
      fields.push('item')
      const definition = method === 'card' ? s.tasks.data.items.find(i => i.alias === 'card')!.id :
        method === 'crow' ? 'utility_crowbar' : method === 'toolbox' ? 'utility_toolkit' : 'utility_flashlight'
      items = (method === 'card' ? carried : v.carried.equipment.utility ? [v.carried.equipment.utility] : [])
        .filter(i => i.definitionId === definition).map(option)
      hints.push('明确选择本次使用的实体工具或门禁物；不会自动替换。')
    }
    if (action.family === 'task') {
      const declaration = s.tasks.data.actions.find(a => a.id === action.key)!
      if (declaration.consume) { fields.push('materials'); materials = recipe(tableValue(s.configuration, declaration.consume)) }
      if (declaration.grant) { fields.push('placement'); outputs.push(output(declaration.grant, numberValue(s.configuration, declaration.outputQuantity!))) }
    } else {
      const declaration = s.tasks.data.sources.find(a => a.id === action.key)!
      if (declaration.mode === 'atomic-exchange') {
        fields.push('materials', 'placements'); materials = recipe(tableValue(s.configuration, declaration.inputs!))
        for (const [name, quantity] of Object.entries(tableValue(s.configuration, declaration.grants!))) outputs.push(output(name, quantity))
      } else hints.push('仅说明输入；未知搜索产出要在正式执行后查看。')
    }
  } else if (action.family === 'inventory' || action.family === 'task-transfer') {
    fields.push('item')
    const k = action.key, ground = v.site!.ground.find(g => g.nodeId === v.site!.nodeId)!.items
    const candidates = k === 'pickup' || k === 'task-pickup' ? ground : k === 'to-backpack' ? v.carried.quickSlots.slots.flatMap(i => i ? [i] : []) : bag
    items = candidates.filter(i => {
      if (action.family === 'task-transfer') return legal(() => requireSupplyTaskTransferItem(v, i.instanceId, k === 'task-pickup', s))
      const d = s.catalog.physical.get(i.definitionId)
      return k === 'pickup' || k === 'drop' ? ordinary(i) : k === 'split' ? d.stacking.kind === 'stackable' && i.quantity > 1 :
        k === 'merge' ? d.stacking.kind === 'stackable' : k === 'to-quick' ? s.catalog.containers.quickSlotCatalog.get(i.definitionId).kind === 'eligible' : true
    }).map(option)
    if (['move', 'split', 'to-backpack', 'pickup', 'task-pickup'].includes(k)) fields.push('placement')
    if (k === 'split' || k === 'merge') fields.push('quantity')
    if (k === 'merge') { fields.push('targetItem'); targetItems = bag.filter(i => s.catalog.physical.get(i.definitionId).stacking.kind === 'stackable').map(option) }
    if (k === 'to-quick') { fields.push('slot'); slots = v.carried.quickSlots.slots.flatMap((i, n) => i === null ? [n] : []) }
  } else if (action.family === 'medical') {
    fields.push('item', 'wound', 'target')
    items = [...bag, ...v.carried.quickSlots.slots.flatMap(i => i ? [i] : [])].flatMap(i => {
      const kind = alias(i)
      if (!kind || !['bandage', 'firstaid', 'food', 'painkiller', 'disinfect', 'suppressant'].includes(kind)) return []
      if (kind === 'disinfect' || kind === 'suppressant') return [{ ...option(i), clinical: { wound: 'none' as const, targets: [], allowNoTarget: true } }]
      const base = { expectedRevision: v.character.revision, instanceId: i.instanceId }
      const allowNoTarget = legal(() => requireSupplyClinicalTarget(v, base, s))
      const wounds = v.character.body.condition.openWounds.filter(w => legal(() => requireSupplyClinicalTarget(v, {
        ...base, woundId: w.id, ...(kind === 'firstaid' ? { target: 'wound' as const } : {}),
      }, s)))
      const contusion = kind === 'firstaid' && legal(() => requireSupplyClinicalTarget(v, { ...base, target: 'contusion' }, s))
      if (!allowNoTarget && !wounds.length && !contusion) return []
      const targets: ('contusion' | 'wound')[] = kind === 'firstaid' ? [...(contusion ? ['contusion' as const] : []), ...(wounds.length ? ['wound' as const] : [])] : []
      return [{ ...option(i), clinical: { wound: kind === 'bandage' && wounds.length ? 'untreated' as const : kind === 'firstaid' && wounds.length ? 'any' as const : 'none' as const, targets, allowNoTarget } }]
    })
    hints.push('只显示当前公开伤势目标；隐藏感染目标资格仍为未知。每次只消费一单位，不自动补快捷栏。')
  } else if (action.family === 'maintenance') {
    const kind = action.key as MaintenanceKind
    if (!['mechanical', 'coat', 'toolbox', 'recharge'].includes(kind)) throw new Error('Unknown maintenance input')
    const targets = carried.filter(i => legal(() => requireMaintenanceTarget(v, i.instanceId, kind))).filter(i => {
      const r = v.itemStates.states.find(st => st.instanceId === i.instanceId)!.resource, profile = s.catalog.resources.get(i.definitionId)
      return r.kind !== 'none' && profile.kind !== 'none' && r.current < profile.maximum
    })
    const pool = maintenancePool(kind, s)
    fields.push('materials', kind === 'mechanical' ? 'allocations' : 'item')
    items = targets.map(option)
    materials = recipe(maintenanceRecipe(v, kind, targets.map(i => ({ instanceId: i.instanceId })), s))
    allocation = { pool, targets: targets.map(i => {
      const state = v.itemStates.states.find(st => st.instanceId === i.instanceId)!.resource, profile = s.catalog.resources.get(i.definitionId)
      return { key: i.instanceId, name: s.catalog.physical.get(i.definitionId).name, current: state.kind === 'none' ? 0 : state.current, maximum: profile.kind === 'none' ? 0 : profile.maximum }
    }) }
    hints.push('分配和材料均须明确选择；最终合法性由正式 Preview 判断。未分配池不会生成物资。')
  } else if (action.family === 'move') {
    if (!playerResidenceKnowledge(v, s).moves.some(m => m.key === action.key && m.canStart)) throw new Error('Action is not currently public')
  } else if (action.family === 'terminal') {
    if (!sharedTerminalEligibility(v, s)[action.key as 'deliver' | 'withdraw' | 'deadline']) throw new Error('Action is not currently public')
  } else if (action.family !== 'rest') throw new Error('Unknown public action family')
  return deepFreeze({ fields, items, targetItems, slots, outputs, materials, allocation, hints,
    wounds: v.character.body.condition.openWounds.map((w, n) => ({ key: w.id, ordinal: n + 1, kind: w.kind, treatment: w.treatment })) })
}
