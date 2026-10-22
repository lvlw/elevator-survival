import { deepFreeze } from '../config'
import { restoreHealth } from '../condition'
import { previewCommittedResourceAction, restoreItemResource } from '../item-state'
import { carriedItems } from '../residence-location/validation'
import { numberValue } from './config'
import { requireSupplyClinicalTarget } from './medical-qualification'
import { supplyBandageRecovery } from './shared-medical'
import { maintenancePool } from './maintenance-qualification'
import { playerCombatFacts } from '../residence-combat/player-query'
import { projectCombat } from '../residence-combat/projection'
import { createCombatEnginePlayerPrimaryPlan } from '../combat/combat-player-action-primary-plan'
import { querySampleProtection } from '../residence-task/sample-protection'
import type { CombatValue, CombatDependencies } from '../residence-combat/types'
import type { PlayerCoreCommand } from '../residence-combat/player-query-types'

export type PublicPayment = Readonly<{ name: string; kind: string; before: number; requested: number; consumed: number; after: number }>
export type PublicActionMetadata = Readonly<{ mechanisms: readonly string[]; resources: readonly PublicPayment[];
  materials: readonly Readonly<{ name: string; quantity: number }>[];
  output: Readonly<{ name: string; width: number; height: number; unitWeight: number; quantity: number }> | null;
  clinical: Readonly<{ effect: string; healthRecovery: number | null; consumes: 1; maximumSatietyGain?: number }> | null;
  maintenance: Readonly<{ totalPool: number; allocations: readonly Readonly<{ name: string; requested: number; restored: number; after: number }>[] }> | null }>

/** Called after formal pure qualification. No primary-effect evaluator or plan. */
export function queryPlayerActionMetadata(v: CombatValue, command: PlayerCoreCommand, deps: CombatDependencies): PublicActionMetadata {
  const s = deps.supply, resources: PublicPayment[] = [], mechanisms: string[] = [], materials: { name: string; quantity: number }[] = []
  let output: PublicActionMetadata['output'] = null
  let clinical: PublicActionMetadata['clinical'] = null, maintenance: PublicActionMetadata['maintenance'] = null
  const items = carriedItems(v.carried)
  const name = (id: string) => s.catalog.physical.get(items.find(i => i.instanceId === id)!.definitionId).name
  if (command.kind === 'task' || command.kind === 'source' || command.kind === 'maintenance') {
    for (const i of command.command.inputs ?? []) materials.push({ name: name(i.instanceId), quantity: i.quantity })
  }
  const resource = (id: string, requested: number) => {
    const payment = previewCommittedResourceAction(v.itemStates.states.find(i => i.instanceId === id)!, requested)
    if (!payment.allowed) throw new Error('Qualified action lost its resource payment')
    resources.push({ name: name(id), kind: payment.kind, before: payment.currentBefore,
      requested: payment.requestedCost, consumed: payment.consumed, after: payment.currentAfter })
  }
  if (command.kind === 'task' || command.kind === 'source') {
    const c = command.command
    if ('toolInstanceId' in c && c.toolInstanceId && ('method' in c) && c.method && ['crow', 'toolbox', 'lit'].includes(c.method)) {
      resource(c.toolInstanceId, numberValue(s.configuration, c.method === 'lit' ? 'wear.lamp' : 'wear.tool'))
    }
    mechanisms.push(command.kind === 'source' ? '一次性来源；执行前不揭示未知产出。' : '任务操作使用真实材料和实例；取得不等于已交付。')
    if (command.kind === 'task') {
      const declaration = s.tasks.data.actions.find(a => a.id === command.command.actionId)!
      if (declaration.id === 'sample' && c.method !== undefined) {
        const payment = querySampleProtection(v, c.method, s).payment
        if (payment) resource(payment.instanceId, payment.requested)
      }
      if (declaration.grant) {
        const def = s.catalog.physical.get(s.tasks.data.items.find(i => i.alias === declaration.grant)!.id)
        output = { name: def.name, width: def.width, height: def.height, unitWeight: def.unitWeight,
          quantity: numberValue(s.configuration, declaration.outputQuantity!) }
      }
    }
  } else if (command.kind === 'medical') {
    const c = command.command, item = items.find(i => i.instanceId === c.instanceId)!
    const alias = s.tasks.data.items.find(i => i.id === item.definitionId)?.alias
    if (alias === 'disinfect' || alias === 'suppressant') {
      clinical = { effect: '隐藏目标资格未知；仅明确执行后反馈正式结果。', healthRecovery: null, consumes: 1 }
    } else {
      requireSupplyClinicalTarget(v, c, s)
      const recovery = alias === 'bandage' ? supplyBandageRecovery(v, s) : alias === 'firstaid' ? numberValue(s.configuration, 'firstaid.hp') : null
      const actual = recovery === null ? null : restoreHealth(v.character.body.condition, recovery, { maxHealth: s.residence.configuration.config.limits.hp }).actualRecovery
      const effect = alias === 'bandage' ? '先止血并处理所选未治疗伤口，再恢复生命；生存首绷按正式额度。' :
        alias === 'firstaid' ? '先处理明确选择的伤势，再恢复生命；不自动选择目标。' :
          alias === 'painkiller' ? '激活本周期镇痛，不治疗独立伤势。' : '增加饱食但不超过上限，不治疗伤势。'
      clinical = { effect, healthRecovery: actual, consumes: 1, ...(alias === 'food' ? { maximumSatietyGain: numberValue(s.configuration, 'ration.satiety') } : {}) }
    }
    mechanisms.push('稳定世界药食为免费动作，不触发付费行动流血；不自动补快捷栏。')
  } else if (command.kind === 'maintenance') {
    const c = command.command, pool = maintenancePool(c.kind, s)
    const allocations = c.kind === 'mechanical' ? c.allocations : [{ instanceId: c.instanceId, amount: pool }]
    maintenance = { totalPool: pool, allocations: allocations.map(a => {
      const r = restoreItemResource(v.itemStates.states.find(i => i.instanceId === a.instanceId)!, a.amount, s.catalog.resources)
      return { name: name(a.instanceId), requested: a.amount, restored: r.restored, after: r.state.resource.kind === 'none' ? 0 : r.state.resource.current }
    }) }
    mechanisms.push('机械维护共享单次总池；材料明确选择并真实消费，未用额度不变为物资。')
  } else if (command.kind === 'rest') mechanisms.push('休整执行正式身体周期；不自动治疗、修理、充电或补给，隐藏周期后果未知。')
  else if (command.kind === 'terminal') mechanisms.push(command.command.kind === 'deadline' ? '截止先执行真实身体周期；死亡优先，不生成下一任务日。' : '正常返回不追加过夜；任务关闭后不能重接。')
  else if (command.kind === 'inventory' || command.kind === 'task-transfer') mechanisms.push('免费真实实例迁移；不触发付费行动流血，不自动整理或重建。')
  else if (command.kind === 'move') mechanisms.push('只移动一条明确相邻边，正式成本已含当前负重及伤势；抵达后果另由正式规则处理。')
  else if (command.kind === 'combat') {
    const action = playerCombatFacts(v, deps)!.actions.find(a => JSON.stringify(a.command) === JSON.stringify(command.command.command))!
    const payment = action.resourceCost
    if (payment) resources.push({ name: name(v.carried.equipment.weapon!.instanceId), kind: payment.kind,
      before: payment.currentBefore, requested: payment.requested, consumed: payment.consumed, after: payment.after })
    if (command.command.command.kind === 'use-quick-slot-item') {
      const { snapshot, engine } = projectCombat(v, deps), primary = createCombatEnginePlayerPrimaryPlan(snapshot, command.command.command, engine)
      if (primary.kind === 'quick-slot-item') clinical = { effect: primary.stopsBleeding ? '先止血并恢复生命；敌方响应仍按正式顺序处理。' : '激活本周期镇痛，不治疗独立伤势。',
        healthRecovery: primary.actualHealthRecovery, consumes: 1 }
    }
    mechanisms.push('主要效果先于本次动作流血；胜利或退却只结一次精力。查询不抽取风险随机或预演CTB。')
  }
  else mechanisms.push('首次出发使用已锁定初配，不重复发物。')
  return deepFreeze({ mechanisms, resources, materials, output, clinical, maintenance })
}
