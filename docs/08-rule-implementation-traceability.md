# 规则实现追踪矩阵

> 本文件用于连接设计决策、版本化配置、实现和测试，不是权威规则来源。实际规则以已确认 DEC 为准；存在类型、接口或测试辅助组合不代表完整玩法命令链已经实现。

| 主题 | 相关 DEC | 配置路径 | 实现路径 | 主要测试路径 | 状态 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 版本化规则配置与 Run 绑定 | DEC-009、DEC-014 | `src/content/hospital-v0.1/rule-config.ts` | `src/core/config/`、`src/core/domain/run-identity.ts`、`src/content/rule-config-registry.ts` | `src/content/rule-config-registry.test.ts`、`src/core/domain/run-identity.test.ts` | 已实现 | 已实现最小 Run 身份与配置版本绑定，不是完整 RunState。 |
| 确定性随机 | DEC-010 | 随机算法版本常量 | `src/core/random/` | `src/core/random/*.test.ts` | 已实现 | 命名子流和黄金输出已锁定；尚未接入完整内容生成。 |
| 场景时间与超时债务 | DEC-024、DEC-030、DEC-035 | `scene.*` | `src/core/scene/timed-scene-action.ts` | `src/core/scene/timed-scene-action.test.ts` | 已实现 | 实现通用事务，不代表全部场景行动已实现。 |
| 强制返程伤害 | DEC-033、DEC-035 | `forcedReturn.*` | `src/core/scene/forced-return.ts` | `src/core/scene/timed-scene-action.test.ts` | 已实现 | 与行动后流血使用独立配置。 |
| 负载档位 | DEC-015、DEC-016、DEC-030 | `backpack.weightBands` | `src/core/load/load-tier.ts` | `src/core/load/load-tier.test.ts` | 已实现 | 严格只接收背包重量小计。 |
| 移动与返程倍率 | DEC-033、DEC-038 | `scene.travelTimeModifiers`、`backpack.weightBands` | `src/core/load/travel-time.ts` | `src/core/load/travel-time.test.ts` | 已实现 | 倍率相乘后统一向上取整。 |
| 场景节点图与确定性寻路 | DEC-004、DEC-029、DEC-030 | 医院版本化图定义 | `src/core/scene-graph/`、`src/content/hospital-v0.1/hospital-scene-graph.ts` | `src/core/scene-graph/*.test.ts` | 已实现 | 实现静态图、通行状态和返程估算，不含完整节点交互。 |
| 物品物理目录 | DEC-017、DEC-029 | 医院物品定义 | `src/core/inventory/item-catalog.ts`、`src/content/hospital-v0.1/items/` | `hospital-item-catalog.test.ts` | 已实现 | 覆盖医院18项物品物理属性。 |
| 背包几何与重量小计 | DEC-015、DEC-016、DEC-017 | `backpack.*` | `src/core/inventory/` | `src/core/inventory/*.test.ts` | 已实现 | 仅计算背包负重，不创建角色总负重。 |
| 耐久、完整度与电量 | DEC-018、DEC-019、DEC-020、DEC-036 | `combat.metalPipe.maxDurability`、`maintenance.*` | `src/core/item-state/`、医院资源目录 | `src/core/item-state/item-state.test.ts`、医院资源测试 | 已实现 | 实现状态资源基础，不包含具体攻击、防护、照明或维修行为。 |
| 装备资格与背包转移 | DEC-007、DEC-016、DEC-020、DEC-037 | 医院装备资格目录 | `src/core/equipment/`、医院装备目录 | `src/core/equipment/equipment.test.ts`、医院装备集成测试 | 已实现 | 装备不占格且不计入背包负重；上下文换装资格未实现。 |
| 玩家生命、流血、伤口、挫伤、暴露与镇痛 | DEC-026、DEC-031、DEC-034、DEC-035 | `combat.player`、`combat.escape`、`medical.painkiller`、`scene.postActionBleedingDamage` | `src/core/condition/` | `src/core/condition/condition.test.ts`、医院条件与战斗集成测试 | 已实现 | 已实现类型化伤口与待处理感染暴露；感染进展和医疗命令尚未实现。 |
| 消防斧耐久2 | DEC-039 | `maintenance.itemResourceMaximums.fireAxeDurability` | 医院物品资源目录 | `hospital-item-resource-profiles.test.ts` | 已实现 | 只追踪资源状态，不代表消防斧攻击或维修配方已实现。 |
| 统一 Effect 管线 | DEC-006 | 复用场景、负载、战斗与返程配置 | `src/core/scene-exploration/` | 核心场景Effect、搜索、拾取、障碍与场景战斗命令测试，医院集成测试 | 部分实现 | 场景移动、主要搜索、节点物品拾取、防火门和场景战斗已采用冻结Effect计划和唯一应用器生成最终快照；战斗推进内嵌并验证完整Combat计划；尚未形成通用命令总线。 |
| 场景移动命令 | DEC-004、DEC-024、DEC-030、DEC-033、DEC-035、DEC-038 | `scene.*`、`forcedReturn.*`、`backpack.weightBands` | `src/core/scene-exploration/` | 核心移动命令与Effect防篡改测试、`src/content/hospital-v0.1/scene-movement-command.integration.test.ts` | 已实现 | 严格校验单字段边ID命令；移动、负载、挫伤、返程、流血、终局与战斗触发共用唯一完整Effect计划，应用前会重新生成并完整比对；不是完整 RunState，医院切片尚不可玩。 |
| 场景节点主要搜索 | DEC-010、DEC-013、DEC-023、DEC-024、DEC-030、DEC-032、DEC-035 | `scene.searchTime`、医院搜索与照明资格目录 | `src/core/scene-search/`、`src/core/scene-exploration/`、`src/content/hospital-v0.1/search/` | 核心搜索及命令测试、医院搜索命令集成测试 | 部分实现 | 已实现结果预定、搜索命令、照明和揭示；独立互动及搜索UI尚未实现。 |
| 节点物品拾取 | DEC-006、DEC-007、DEC-015、DEC-016、DEC-017、DEC-023、DEC-024、DEC-032 | 医院物理物品、资源档案与搜索定义 | `src/core/scene-search/`、`src/core/scene-exploration/node-item-pickup-command.ts` | 核心拾取命令测试、医院拾取集成测试 | 部分实现 | 已完成显式拾取、部分数量、背包摆放、负载和Effect提交；手动堆叠合并、任务对象互动和UI尚未实现。 |
| 医院防火门 | DEC-029、DEC-030、DEC-032、DEC-035、DEC-036、DEC-040 | `scene.fireDoor`、医院障碍与物品目录 | `src/core/scene-obstacle/`、`src/core/scene-exploration/`、医院障碍目录 | 障碍目录、Effect防篡改、医院防火门与完整流程集成测试 | 已实现 | 六种选项共用唯一主要结果计划；正式时间、资源、警觉、风险、挫伤和产物均按完整前缀回放验证；障碍内容目录是严格运行时边界；UI尚未实现。 |
| 工作人员通道 | DEC-029、DEC-030、DEC-040 | 医院节点图、边权限和权限物品目录 | `src/core/scene-access/`、医院边权限目录 | 医院工作人员通道真实流程测试 | 已实现 | 背包持卡实时授权，不消耗卡且无额外开门行动；权限边不写入 `enabledEdgeIds`。 |
| 工具箱开门产物 | DEC-032、DEC-036、DEC-040 | 医院事件与物品目录 | `src/core/scene-items/`、`scene-item-spawned` Effect | 医院工具箱开门、Effect防篡改与拾取流程测试 | 已实现 | 电子元件以稳定实例ID进入当前节点地面状态，不自动拾取或合并；应用器严格验证产物数量、顺序、身份和初始状态。 |
| 场景单级警觉 | DEC-032 | 医院防火门内容、`combat.infectedOrderly.firstActionTime` | 场景探索警觉状态与战斗首次遭遇入口 | 医院防火门、战斗时间轴与场景遭遇测试 | 已实现 | `unalerted/alerted` 决定隔离走廊首次遭遇行动70/50；逃跑重入固定为50，警觉不直接修改伤害或意图。 |
| 场景战斗遭遇 | DEC-006、DEC-029、DEC-031、DEC-035 | 医院遭遇目录、`combat.sceneTimeConversion` | `src/core/scene-combat/`、`src/core/scene-exploration/` | 场景遭遇核心测试、医院进入／胜利／逃跑／重入／超时及严格恢复集成测试 | 已实现 | 已记录来源节点与真实入口边，严格恢复会复核当前通行授权、战斗正时间和敌人节点不变量；隐藏状态字段不可通过省略而重置，终局仍只写回一次；不是完整RunState。 |
| 快捷栏 | DEC-007、DEC-016 | `backpack.quickSlotCount`、医院快捷栏资格目录 | `src/core/quick-slot/`、医院快捷栏资格目录 | `src/core/quick-slot/quick-slot.test.ts`、医院快捷栏集成测试 | 已实现基础容器与转移 | 已实现实际单件实例、堆叠抽取、放回、槽间移动交换和显式移出；物品效果、命令编排、使用时间和UI仍未实现。 |
| 感染护工单敌人CTB战斗 | DEC-006、DEC-026、DEC-031、DEC-032、DEC-035、DEC-036、DEC-037 | `combat.*` | `src/core/combat/`、`src/core/scene-combat/`、`src/content/hospital-v0.1/combat/` | 核心敌人目录与换算测试、医院战斗及场景遭遇集成测试 | 部分实现 | 已完成严格恢复、敌人循环、运行时内容绑定、连续CTB Effect链、五种玩家行动、逃跑锁定与同点优先、节点自动触发、持久重入、终局场景时间和强制返程写回；快捷医疗、战利品、样本箱和多目标尚未实现。 |
| 日结算、存档与完整 Run 编排 | DEC-009、DEC-025、DEC-027、DEC-028 | 部分测试参数已存在 | 尚无完整命令链 | 现有测试仅覆盖独立规则 | 部分实现 | 战斗内核不代表完整玩法流程已经接通。 |
