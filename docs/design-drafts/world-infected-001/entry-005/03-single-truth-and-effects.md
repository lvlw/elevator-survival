<a id="doc-world-entry-005"></a>
## DOC-WORLD-ENTRY-005 技术定稿附记（2026-10-06）

[R1专项实审](adoption/inputs/AUD-464b59d-WORLD-ENTRY-005-R1-review-v1.0.md)确认准确SHA `464b59d657184636b897f72375eb6b61bd2c5786` 为限定PASS，F01／F02已关闭；不是整个世界或生产实现验收。[MAINLINE技术定稿](adoption/inputs/MAINLINE-technical-ratification-WORLD-ENTRY-005-v1.0.md)确定独立v4及E02-P→E02-R→E02-S逐项准确SHA停审，不新增玩法、DEC或参数；Owner无需新增玩法采纳。

正式技术依据：[P→R→S批次门槛](../../../engineering/residence-foundation/active-combat-batch-plan-v1.0.md)、[E02-P纯核心合同](../../../engineering/residence-foundation/active-combat-core-contract-v1.0.md)、[活战斗时序合同](../../../engineering/residence-foundation/active-combat-lifecycle-contract-v1.0.md)、[E02-R恢复合同](../../../engineering/residence-foundation/active-combat-restore-contract-v1.0.md)、[E02-S会话合同](../../../engineering/residence-foundation/active-combat-session-contract-v1.0.md)。

本次文档交付仍待当前WebGPT主线准确SHA文档实审；其后另行下发E02-P完整任务，不自动开工。E02／E03、玩家入口和浏览器未执行，O3未决定。[本轮报告](adoption/DOC-WORLD-ENTRY-005-completion.md)与[本轮检查](adoption/checks.json)只记本次实际文档核验。

以下原文（含R1附记）逐字节保留；其中“候选／待审／未定稿”、旧通过和旧失败均为当时历史状态，当前技术合同状态以上述附记为准。

---

# W2 — 唯一事实与受控效果合同候选

以下类型、文件及函数名均为TECHNICAL DRAFT，不是现有导出或已批准Save schema；[有限样本](validation/state-candidates.json)更不是生产结构。现有字段以[SupplyValue](../../../../src/core/residence-supply/types.ts)为基线。

## 聚合及依赖方向

```ts
// shared字段的具体既有类型直接引用，不复制第二份库存或body。
type Shared = Omit<SupplyValue, 'protocol' | 'phase' | 'site' | 'receipts'> & {
  protocol: 'residence-combat-candidate-v1';
  receipts: readonly (LegacySupplyReceipt | CombatDeathReceipt)[];
  battles: readonly ClosedBattleReceipt[];
};
type CombatValue = Shared & (
  | { phase: 'first-hub' | 'living-hub' | 'dead'; site: null; combat: null }
  | { phase: 'active-world'; site: ResidenceSite;
      combat: { kind: 'stable' } | { kind: 'decision'; battle: BattleDecision } }
);
type BattleDecision = {
  id: string; binding: LocationBinding; enemyId: string;
  entry: EntryWitness; currentCtb: number;
  playerNextActionCtb: number; enemyNextActionCtb: number;
  checkpoint: DecisionWitness;
};
// pending是组合内部的判别，不属于可保存CombatValue。
type MovementContinuation =
  | { kind: 'stable'; issued: SupplyPlan }
  | { kind: 'pending-alive'; issued: SupplyPlan; entry: EntryWitness }
  | { kind: 'pending-death'; issued: SupplyPlan };
```

Shared从SupplyValue继承的`character/carried/itemStates/warehouse/origins/allocations/dispositions/lineage/unitTransfers/choices/missions/balance/archives/witnesses/productions`各有唯一存储位置。旧protocol和旧reader不接受此扩展；适配层复用提取出的只读核验，不通过删掉combat/receipt再骗过旧P/R。

| 唯一事实 | 持有位置／读者 | 禁止第二真相 |
|---|---|---|
| HP/伤口/出血/饱食/感染/energy/quota/cycle/clock | character；G1周期与战斗组合共读同一body | 战斗不额外保留可编辑playerCondition或dailyUsage |
| 包／装备／快捷实体、耐久电量 | carried与itemStates；沿用原实例关系 | 空快捷槽不能自动补；库存副本不可作为资源支付来源 |
| 地面／道路／来源／知识／持续敌人 | site；敌人同条目state与riskDrawIndex | battle只enemyId引用，无第二enemy对象；archives是已关闭不可操作历史 |
| 当前队列及入场来源 | combat.battle | 瞬时CombatEncounterSnapshot仅求值，计算完拆回上述唯一位置，不保存 |
| 临时防御／逃跑准备 | 同步plan工作区 | 在完整玩家机会／胜退／死亡前消费或到期；不进入可存决策态 |
| 首绷／三专长／工具 | choices | firstBandageUsed须与真实bandage消费历史一致；休整不清标记，换场不改选择 |
| 份额、处分／任务成果／钱包与关闭 | 原P来源账／A终局receipt／mission核心 | 战斗只追加自己真实消费或击败事实，不创造任务奖励，不改旧处分 |

```text
受控content profile → P/G2/G1 + 既有CTB/condition/item原语
                     ↓ 唯一同步组合／签发完整CombatPlan
                     A窄死亡消费者（仅需要时）
                     ↓ R严格完整聚合 + 预编码
                     S同域唯一current → write → 只读notify
```

core不读state/content/docs；R不安装；S不算伤害；监听器不参与费用、消费、死亡或来源更新。计划签发器、随机依赖和profile工厂不得从公共命令获取。

## 严格命令、前态与完整计划

候选`planCombatEntry(before, moveIntent, authority)`内部调用真实P移动并取得原签发结果；`planCombatAction(before, intent, authority)`只接受`expectedRevision/battleId`及discriminated intent：管基础、管蓄力、临时攻击、防御、逃跑；快捷药另有slotIndex、instanceId与可选woundId。固定消费省略quantity或严格整数1。各分支strict keys，不接受任意targetEnemy、damage、effects、roll、胜负、result、support或外部after。

先验证完整before、当前执行／config/content绑定、全部原始安全整数（排除bool、NaN、Infinity、负数与超范围）、真实实例／位置／日额及目标，再计算。原样witness不能仅用JSON品牌作能力；私有WeakMap绑定原before完整值、dependencies、intent、输出及作用域。消费入口再次核对current完整前态与revision；JSON/clone、跨会话、旧计划和换binding拒绝，且零提交。

候选`CombatPlan`含`base identity/revision/battleId`、唯一不可变result、ordered Effects、entry/exit记录、`outcome:decision|victory|escaped|death`；WeakMap保留完整前态和签发来源。一次move+entry、一次玩家动作+全部敌响应+胜退／死亡都只占外层一次revision递增。内部既有P/G2局部revision不额外叠加；需要受控组合能力与验证，不能玩家传revision覆盖结果。

## 药物／资源与真实消费

投影到旧引擎前，从唯一G1 quota生成usage（上限减remaining），从当前专长及firstBandageUsed生成绷带本次恢复1或2；其他CTB、伤型／风险由受控profile绑定。投影参数是本次受控派生，不是存档第二配置，也不是允许调用者改倍率。

战中不能直接调用`planSupplyMedical`（它要求稳定无pending）。复用其合格目标判定、condition原语与`consumeSupplyUnits`的分配操作，新增窄战斗来源组合：真实快捷实例的一单位→同origin范围从allocations移到consumed disposition，`reason=medical`保留既有首绷语义，并附单独CombatUseWitness绑定battle/actionRevision/slot/instance/ranges。旧receipt/旧读档不扩展隐式支持。

空槽、背包／地面／仓库远程物、已耗尽、错目标、多余结果字段先拒绝。真用后slot为空，不自动补；消费与药效、首绷标记、身体、ItemState删除/保留同笔。既有firstBandageUsed=true iff曾有medical bandage消费约束继续包含战中消耗。无目标不能消耗或保存溢出恢复。

蓄力从G1剩余额度1→0；任何换场／退却／读档不归还；真正生还日结才重置。耐久剩余正值可完成末次行动再截零；资源0选择既有临时攻击，不能从背包远程换武器。甲本击由正完整度提供完整保护并耗1，下击才失效。

## 新来源死亡与最小持久证据

不能让旧G1的`BodyStep`用负healthLoss表示治疗。候选新增`CombatBodyTrace`：有序discriminated步骤`healed/direct-damage/action-bleeding/injury/exposure`，每条带实际before/after及受控requested/actual、具体sourceAction、CTB与实例引用；治疗限上限，伤害实际扣量=min(before,requested)。非HP步骤不能改HP；相邻before=前after，HP0必须为最后身体结果，不能再用药、抽签或续事件。trace只保留当前命令已发生的效果，不预测未来。

`consumeCombatDeath(originalBefore, issuedCombatPlan, authority)`是新窄消费者。验证真实能力、原始完整前态、同execution/battle/revision、非空trace及末HP0，只消费一次并调用共用A清算；不重算CTB、伤害、随机或药效。死亡只安装final dead，保留真实物耗和击杀事实，但不得发成功奖励；历史成功交付/安装不倒改。旧`consumeSupplyDeath`和其单调步骤验真保持；正常H0 steps=[]仍合法，实际休整/截止不能因此空steps。

候选CombatDeathReceipt以`source:'combat-death'`单独分支存`binding/battleId/entry/lastCheckpoint/trace/actionRevision/dispositionIds`及既有奖罚字段。旧receipt逐字前缀保留。trace中的消费引用必须联到真实disposition、origin及实例；不能只看HP0或一个伪造cause字符串。终局新分支不把旧四种source批量放宽。

最小证据：EntryWitness留真实from/to/edge及移动前敌count/risk/encountered和G1立即结果；DecisionWitness留上一动作的绑定、起止CTB、各队列变化原因、敌count/risk前后与资源变更引用；ClosedBattleReceipt留入/退出锚、结果、elapsed/E扣额及已消费引用。它们是不可操作历史，不能替代当前库存；不用保存整场每一版body或建立通用事件溯源库。

当前有限检查只检验这些关系的局部实例。冷候选没有独立完整历史时，最小证据只能保证内部一致性，不证明完全重写的离线历史真实；能力防伪属于原生工程测试，不能由Python的TEST字符串证明。


## R1 原始值与死亡上下文补充（技术候选）

F01相邻自查覆盖exit、medicine、charge、order、continuity、blocked及事务表：先验原字段和嵌套容器，再检查选择器／消费／时序关系；缺键或非法原值明确Reject，KeyError／TypeError均为检查失败。绷带wound可省略，有值须非空ID；提案selectedWound在无伤口选择时才可为null，不靠覆盖非法输入得合法输出。

F02使用该条真实combat前态的battle/execution/entryRevision及独立终局锚，不借spec.activeBattle的首场ID、默认节点或revision。先验前态与terminal，再核对场次、执行、入场关系、原HP、终局revision和真实非空trace；不删sourceBattle核验，不重算任何伤害／抽签／用药。后续场次死亡与错误场次反例同检。
