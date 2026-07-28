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
| 玩家生命、流血、伤口、挫伤与镇痛 | DEC-026、DEC-031、DEC-034、DEC-035 | `combat.player`、`combat.escape`、`medical.painkiller`、`scene.postActionBleedingDamage` | `src/core/condition/` | `src/core/condition/condition.test.ts`、医院条件集成测试 | 已实现 | 基础状态和选择器已实现，医疗物品与日结算命令未实现。 |
| 消防斧耐久2 | DEC-039 | `maintenance.itemResourceMaximums.fireAxeDurability` | 医院物品资源目录 | `hospital-item-resource-profiles.test.ts` | 已实现 | 只追踪资源状态，不代表消防斧攻击或维修配方已实现。 |
| 统一 Effect 管线 | DEC-006 | 尚无正式实现配置 | 尚无 | 尚无 | 未实现 | 当前模块通过显式结果组合，未形成统一 Effect 编排层。 |
| 快捷栏 | DEC-007、DEC-016 | `backpack.quickSlotCount`、医院快捷栏资格目录 | `src/core/quick-slot/`、医院快捷栏资格目录 | `src/core/quick-slot/quick-slot.test.ts`、医院快捷栏集成测试 | 已实现基础容器与转移 | 已实现实际单件实例、堆叠抽取、放回、槽间移动交换和显式移出；物品效果、命令编排、使用时间和UI仍未实现。 |
| 战斗、搜索、日结算、存档与完整 Run 编排 | DEC-009、DEC-025、DEC-027、DEC-028、DEC-031、DEC-032 | 部分测试参数已存在 | 尚无完整命令链 | 现有测试仅覆盖独立规则或纸面参数 | 部分实现 | 配置和部分基础能力已存在，但完整玩法流程尚未实现。 |
