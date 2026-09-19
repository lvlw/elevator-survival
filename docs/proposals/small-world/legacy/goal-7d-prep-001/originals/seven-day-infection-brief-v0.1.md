# 七日感染世界设计启动包 v0.1

> **Draft / Proposal — 待 Owner 评审。**
>
> 本文件不构成实现授权，不是 DEC，不是玩法规则来源，也不覆盖已确认的 DEC、Vertical Slice、Architecture、Freeze、Content Docs 或当前 UI 契约。文中的名称、场景、效果、顺序和运行时事实均为候选，除非明确标注为“已确认规则”或“当前实现”。

## 1. 评审结论摘要

### 推荐方案：三线取证，七日撤离

玩家被困在感染扩散中的城市片区，需要在七个游戏日内完成三类准备，并在第七日正常探索返回后启动最终结算：

1. **确认感染特征**：医院安全带回的密封病原样本箱是首选证据，但它只是感染取证成果，不是修复电梯的最终核心部件。
2. **取得撤离窗口**：从应急通信中心恢复或取得能够定位安全离开窗口的正式情报。
3. **取得稳定条件**：从隔离物流站带回用于稳定电梯离开过程的任务对象，或完成经 Owner 确认的等价替代成果。

三项合在一起表达“知道面对什么、知道何时离开、具备离开条件”。第七日不是额外的结局按钮日：玩家仍拥有一次正常主要场景机会；返回 Hub 后确认结束第七日，才进入尚待设计的 Final Day Resolver。

推荐场景池保持为三个主要场景，允许跨日重访：

| Proposal 场景 | 核心职责 | 主要资源倾向 | 主要压力 | 为什么不是换名医院 |
| --- | --- | --- | --- | --- |
| 封锁医院·急诊楼一层 | 感染证据、医疗补给、感染来源情报 | 医疗品、布料、少量电池／电子元件 | 接触污染、伤口、室内战斗、任务物负重 | 复用已完成的临床环境、样本提取与感染护工闭环 |
| 市政应急通信中心 | 撤离窗口、路线与威胁节奏情报 | 电池、电子元件、少量工具资源 | 供电取舍、噪声、电子／机械障碍、信息不完整 | 核心是恢复通信和解释情报，不是医疗搜索或样本搬运 |
| 隔离物流转运站 | 稳定条件、口粮、维修材料与防护补给 | 食物、金属、织物、密封材料候选 | 开放区域暴露、重物携带、资源与主线同背包竞争 | 核心是物资调度与重载撤离，不是室内临床路线 |

这三个名字和具体内容均是 Proposal。推荐它们，是因为它们分别把医疗／感染、信息／能源、补给／负载置于主位，让每日选择影响后续问题而不是只换美术背景。

### 简短备选：单一大型医院，七日分区解锁

备选方案把全部七日内容放在一座医院的不同楼层或分区，每天选择一个已知分区。它的优势是复用美术、敌人、物品和环境语言，新增 runtime 内容较少；劣势是更容易变成“重复医院七次”，专长差异也会集中在相似的门、污染和搜索问题上。它还会让场景重访、分区状态持久化和导航知识跨日边界更复杂，而没有得到三个场景带来的策略辨识度。

因此不优先采用。若 Owner 选择更低内容成本，它可作为 Alpha 子阶段，但不能被误称为已经验证完整七日世界的内容多样性。

## 2. 事实分层

### 2.1 已确认规则

| 规则 | 正式依据 |
| --- | --- |
| 单局七个游戏日，每天只能选择一个主要场景，选择后不能返回电梯改选 | DEC-003；`docs/01-game-design-v0.1.md` 单局目标与期限／每日循环 |
| 三个局内专长为侦察、工程、生存；本局不可更换；都必须能完成主线 | DEC-005 |
| 医院一日暂缓专长只是局部例外，完整七日完成前必须补回 | DEC-041；Freeze §3 |
| Run 状态、Profile 与中枢状态职责分离 | DEC-014 |
| 核心生成使用版本与 seed，关键内容必须避免隐藏死锁 | DEC-010 |
| 任务物必须实际携带；只有安全返回后进入 Run 任务储存区并计入任务进度 | DEC-023、DEC-027；Freeze §13 |
| 工具、装备与专业路线不能成为无替代的主线资格锁 | DEC-005、DEC-036；`docs/content/items.md` 工具与防护边界 |
| 关键对象永久遗失必须有重新取得、替代路线或明确失败边界 | DEC-028 |
| Return、Hub 整备、End Day、terminal Scene settlement 是分离边界 | DEC-027；Architecture 与现有生命周期实现 |
| 第七日仍有正常行动机会；普通日结算不能生成 Day 8 | DEC-028 的终局边界；当前 `FINAL_DAY_RESOLUTION_REQUIRED` 门禁 |
| 场景真相与玩家情报分离 | DEC-013；DEC-045（导航知识） |

### 2.2 exact SHA `11cc705a9a923b367919cc9139de5097c006beb7` 的当前实现

| 当前实现事实 | 实际入口或符号 |
| --- | --- |
| 只有一个医院 Scene runtime 和单一 Launch content | `src/content/hospital-v0.1/hospital-scene-runtime.ts`：`hospitalSceneLaunchContent`、`createHospitalSceneRuntimeBundle()` |
| Scene identity 由 RunIdentity、日期与正式 sceneDefinitionId 确定性派生 | `src/core/scene-launch/scene-launch.ts`：`deriveSceneInstanceId()`；domain helper |
| Day 1 初始 Hub 预绑定医院 Scene identity，Return Ledger 初始为空 | `src/core/current-day-hub/current-day-hub.ts`：`createCurrentDayHubSnapshot()`；DEC-044 |
| Scene、Return、Hub 和 Daily Settlement 已有严格事务与恢复边界 | `src/core/scene-launch/`、`src/core/run-return/`、`src/core/current-day-hub/`、`src/core/daily-settlement/` |
| 每日状态只含医疗使用、威胁抑制、维护工时和 `mainSceneUsedToday` | `src/core/daily-state/daily-run-state.ts` |
| Run 仓库、任务储存、RunIntel、Return Ledger 可跨 Scene／日携带 | `src/core/run-return/`、`src/core/run-intel/`、`CurrentDayHubSnapshot` |
| 感染世界威胁、饱食、医疗和维护已实现医院测试配置 | `src/core/world-threat/`、`src/core/satiety/`、Hub medical/survival/maintenance 与医院 content |
| Day 7 普通 `end-day` 明确拒绝 | `src/core/daily-settlement/daily-settlement.ts`：`FINAL_DAY_RESOLUTION_REQUIRED` |
| Stable Run 只有 `current-day-hub`、`scene-session`、`run-failure` | `src/state/run-save/run-save-types.ts` |
| `run-success` 在当前 codec 被拒绝；没有 Success Resolver | `src/state/run-save/run-save-codec.ts` 及 `run-save.integration.test.ts` forged success regression |
| 医院 New Run 只选择实用装备，不包含专长字段 | `src/app/hospital-new-run-transaction.ts`、`src/ui/hospital-v0.1/hospital-new-run-setup-view-model.ts` |
| 当前 Game Shell 已覆盖医院一日命令与 player-safe 展示 | `src/ui/stable-run-ui-app.tsx`、`src/ui/interaction/`、`src/ui/presentation/` |

### 2.3 本文件提出、但尚未确认

- 三个场景的名称、内容职责和每日候选结构。
- 三类终局准备成果及其替代／重取结构。
- 专长的具体作用域与 Modifier 接入点。
- 跨日地点进度、导航知识和固定资源耗尽的生命周期。
- 多场景选择与 Scene identity 绑定时点。
- Day 7 日级危险与主线结果的结算顺序。
- Success terminal、失败原因、Profile 交付与正式放弃的范围。

## 3. 推荐主线结构

### 3.1 玩家七天在争取什么

玩家不是简单搜空三张地图，而是在世界威胁上升、食物消耗、伤势和装备磨损同时存在时，建立一个可执行的离开窗口。建议把主线拆成三个玩家可理解的 **Run-owned objective categories**：

| Objective category（Proposal） | 推荐达成表达 | 安全返回要求 | 避免资格锁的候选结构 |
| --- | --- | --- | --- |
| 感染特征已确认 | 密封病原样本箱进入任务储存区；或以后经 Owner 明确确认的等价完整证据 | 实体样本必须安全带回；纯情报是否足以替代待定 | 医院样本可在未完成时重访；永久丢失时必须有重取、替代或明确失败，不自动返还 |
| 撤离窗口已定位 | 通信中心关键情报完成，并经正式任务事件提交为 Run objective fact | 若依赖实体载体则须安全带回；普通 RunIntel 本身不占背包 | 基础人工恢复路径始终存在；工具／工程专长只改变耗时、风险或资源成本 |
| 稳定条件已取得 | 物流站任务对象安全进入任务储存区，或等价设施成果被正式记录 | 实体对象必须安全带回 | 任务对象有明确重取规则或高成本替代；不依赖随机掉落 |

这里的三个 category 是推荐的玩家目标结构，不是建议现在创建三个 boolean。正式设计应先决定哪些成果是实体、情报或世界事实，再决定唯一 owner 和派生方式。能从任务储存区／RunIntel／世界事实派生的结果不应重复保存。

### 3.2 医院样本箱的角色

医院样本箱保留其已确认的严格生命周期：取得不等于完成，安全返回后进入任务储存区才是成果。它在完整七日中推荐承担“感染特征已确认”的强证据，而不是电梯修复零件、最终按钮或单独通关条件。

这样既保留医院一日成果，又避免把首个纵向切片目标错误提升为完整世界的唯一核心。若 Owner 不允许任何替代证据，则“样本永久遗失后的明确失败边界和最晚重取日”必须在内容实现前冻结。

### 3.3 每日选择为什么成立

每天开始时，Player-safe 场景候选至少应公开名称、资源倾向、模糊危险与已知 objective relevance；玩家只能承诺一个场景。

- 去医院：补医疗或推进感染证据，但可能增加暴露、伤口与医疗消耗。
- 去通信中心：较早取得撤离情报，会减少之后的未知与路线浪费，但电池／工具消耗可能降低后续搜索和维护能力。
- 去物流站：缓解食物和维护压力，或搬运稳定对象，但重物会提高返程成本并挤压其他收益。
- 先撤退：保住已取得对象和装备状态，留下重访价值；不是自动惩罚，也不免费重置已消耗的一次性成果。

不存在理论上的唯一固定顺序：受伤或缺药时医院价值上升；缺口粮／维修时物流站价值上升；不确定下一步或接近期限时通信中心价值上升。要让这个结论成立，正式内容预算必须验证“资源倾向有差异但不存在单一场景同时支配主线、补给和维护”。

## 4. 跨日后果候选

### 4.1 推荐延续

- RunIdentity、currentDay、rulesVersion。
- 玩家生命、伤口、感染进展、饱食。
- Run 仓库、任务储存区、ItemInstance／ItemState、装备与快捷栏。
- RunIntel、Return Ledger、世界威胁。
- 已确认的 specialization。
- 已完成的 objective category 及其正式来源。
- 各地点的一次性主线结果、已安全带回的关键对象和明确的永久世界改变。
- 玩家已经掌握且被确认允许跨日保留的地点导航知识。

### 4.2 推荐仅属于一次 Scene Session

- remainingTime、当前节点、当前战斗 CTB、行动内随机轨迹。
- 本次访问的临时警觉、当前 ground inventory、未带回的普通临时掉落。
- 仅服务当前命令的 Preview、Plan、Effect 与 UI 草稿。

### 4.3 必须单独确认的重访语义

推荐使用“**新日新 Scene instance + Run-owned 地点进度投影**”：Scene instance 继续包含日期，从而保持确定性和 Return Ledger 清晰；进入同一 sceneDefinitionId 时，由 Run-owned location progress 决定哪些一次性事件已完成、哪些固定资源已耗尽、哪些替代任务仍可用。

这不是当前实现。必须先确认：

1. 固定搜索、敌人、障碍和任务事件哪些跨日保持，哪些可以重新出现；
2. 未安全带回且遗留在上次 Scene 的任务物如何处理；
3. 导航知识是否按 sceneDefinitionId 跨日保留；
4. 当日 seed 可以变化，但一次性目标不能因此重复生成；
5. 重访不允许无限刷固定主线目标、固定材料或任务奖励。

## 5. 三种专长的推荐方向

以下只定义策略角色，不定义数值。

| 专长（已确认名称） | Proposal 作用 | 典型收益 | 基础替代路径 |
| --- | --- | --- | --- |
| 侦察 | 提高行动前可获得的信息质量，或更早发现路线／风险类别 | 更少盲目绕路、更精确地选择当天场景与撤离时机 | 非侦察玩家仍能通过表层观察、搜索和保守路线获得完成主线所需信息 |
| 工程 | 降低机械／电子障碍和维护的时间或资源成本，或提高固定材料保留 | 更高装备可用率、更省资源地恢复通信／设施 | 所有主线工程点都有更慢、更危险或更耗资源的通用方案 |
| 生存 | 降低环境暴露和野外补给管理成本，或提高有限消耗品效率 | 更能承受物流站与污染路线、减少恢复压力 | 非生存玩家仍可依靠防护、医疗、绕行和资源消耗完成 |

硬约束：专长不能凭空生成关键任务物、取消所有风险、替代装备全部职责或成为命令资格的唯一来源。专长效果应进入正式 core 规则／Modifier 汇总；React 只显示 player-safe 结果。

## 6. 七日压力闭环

推荐让压力形成互相牵制，而不是七个独立计量表：

- **食物**：每天结算消耗，迫使玩家安排物流补给；不能假设每日免费刷新。
- **治疗与伤口**：深入可获得主线收益，但伤口会占用医疗和恢复预算。
- **感染**：暴露在日结算转化并叠加世界威胁；抑制剂只是有限减压，不是治疗倒退。
- **维护与电池**：更安全／高效的工具路线消耗装备资源，Hub 工时和材料要与后续日程竞争。
- **任务携带**：任务对象占格计重，取得后继续搜集会提高返程风险；安全带回才有进度。
- **日期**：前六日可以选择推进或整备；第七日仍可补一个最重要缺口，但没有 Day 8。

当前医院数值只能证明医院一日和特定维护预算，不证明七日食物、药品、电池、抑制剂或多场景总经济。正式内容前需要按确定性最低供给、合法较差掉落和典型消耗分别核算。

## 7. 两条示例玩家经历

这些路线用于比较策略，不是推荐攻略，也不宣称已经模拟通过。

### 路线 A：侦察，先信息后搬运

| 日 | 选择与承诺 | 当日结果示例 | 留给后续的后果 |
| --- | --- | --- | --- |
| 1 | 通信中心，优先取得表层路线与威胁节奏情报 | 未完成通信 objective，因电池不足提前撤退 | 保存已取得 RunIntel；工具状态较好，但主线无实体成果 |
| 2 | 物流站，补口粮与电池 | 安全带回基础补给，放弃深处重物 | 缓解日结算与照明压力；稳定条件仍缺 |
| 3 | 医院，利用较完整装备推进 | 样本安全进入任务储存区 | 感染证据完成，但受伤并产生医疗消耗 |
| 4 | 通信中心重访 | 依靠已有情报选择更短路径，完成撤离窗口 | 通信一次性目标不再刷新；电子资源偏低 |
| 5 | 物流站深入 | 取得稳定对象但因负载提前返程 | 三类成果齐备；仓库普通材料较少 |
| 6 | 按状态选择补给场景 | 处理口粮／维修／抑制缺口，不要求搜空 | 为第七日和最终结算留生存余量 |
| 7 | 选择仍最有价值的正常场景 | 安全返回后在 Hub 明确确认结束第七日 | Final Day Resolver 按已确认顺序处理危险与主线结果 |

侦察的价值是更早让日程可解释，而不是独占通信中心。第一日撤退仍有价值，因为情报延续；但是否允许这些具体情报跨日，必须由 Location Progress 决策确认。

### 路线 B：工程，先稳定资源后补证据

| 日 | 选择与承诺 | 当日结果示例 | 留给后续的后果 |
| --- | --- | --- | --- |
| 1 | 物流站，优先取得维修材料 | 带回材料和少量口粮，未搬稳定对象 | 装备维护更从容；撤离窗口仍未知 |
| 2 | 医院 | 门／战斗消耗高，未取得样本即撤退 | 合理止损保住装备与药品；医院主线仍可重访 |
| 3 | 通信中心 | 工程路线节省一类成本，完成撤离窗口 | 材料下降，但较早锁定最后所需方向 |
| 4 | Hub 修整后重访医院 | 取得样本并安全返回 | 感染证据完成；感染或伤口压力高于路线 A |
| 5 | 物流站深入 | 在主线重物与额外口粮之间选择，先带回稳定对象 | 三类成果齐备，但食物余量偏低 |
| 6 | 物流站或医院补给 | 只取必要补给后撤退，不搜空 | 修复前期失败造成的资源缺口 |
| 7 | 正常场景机会用于保命或补缺 | 返回后确认结束本日 | 不因成果较早齐备而跳过 Day 7 日级风险 |

工程专长降低部分成本，但第二日失败没有隐藏补偿；如果样本在重访中永久丢失，系统必须按 Owner 选择执行重取、替代或明确失败。

## 8. 源码能力与缺口图

| 能力 | 分类 | 依据 | 对七日方案的含义 |
| --- | --- | --- | --- |
| 纯 TS Scene runtime bundle、图、搜索、障碍、战斗、事件、医疗、充能 | 可直接复用 | `hospital-scene-runtime.ts` 与 `src/core/scene-exploration/` | 新场景可沿既有边界组织，但每个新内容包仍需严格目录校验与测试 |
| 确定性 Scene identity 与 Scene Session strict restore | 可直接复用 | `scene-launch.ts`、domain identity helper | 单次选定场景可确定性启动；不能直接表达“选哪个场景”的前置状态 |
| Return、任务储存区、RunIntel、仓库、ItemState 连续性 | 可直接复用 | `src/core/run-return/`、`src/core/run-intel/` | 实体任务成果和情报已有基础生命周期 |
| Hub loadout／medical／survival／maintenance 与日级 reset | 可直接复用 | `src/core/current-day-hub/`、Hub modules、`daily-state` | 七日复用事务边界；经济值仍需重新验证 |
| Day 1 医院 content、样本事件、战斗和 UI | 可直接复用 | `src/content/hospital-v0.1/`、`src/ui/` | 可作为七日一个场景，不等于整套世界已完成 |
| 新场景图、目录、物品／敌人／事件 | 内容扩展候选 | 现有数据驱动 catalog 与 runtime dependencies | 可按既有 schema 表达的内容仍需 Owner 内容评审和确定性测试 |
| 多个 Scene content 的候选查询和选择 command | 已有能力需扩展 | 当前 `SceneLaunchDependencies.content` 是单值 | 需新增 player-safe candidate source 与应用命令，但 core 仍拥有资格与身份绑定 |
| Day 2+ Hub identity 绑定到“尚未选择的场景” | 新规则／生命周期决策 | DEC-044 只确认单医院 Day 1 预绑定；Hub strict restore要求 continuity scene ID 在 ledger 中 | 必须决定选择前 Hub continuity 的合法身份表达与选择后绑定时点 |
| 地点跨日进度、固定资源耗尽、重访任务 | 新规则／生命周期决策 | 当前 Scene snapshot 是单 Scene Session；导航知识明确不默认跨日 | 需正式 owner、strict restore、Save、确定性投影 |
| 专长选择、状态、Modifier、Preview、Save | 新规则／生命周期决策 | DEC-041 明确当前无字段或效果；源码搜索只有暂缓文案 | Owner 确认效果与 owner 后才能实现 |
| Day 7 Final Resolver 与 Success terminal | 新规则／生命周期决策 | 当前普通结算拒绝 Day 7；StableRunPhase 无 success | 必须先冻结顺序、source、terminal snapshot 与 Save restore |
| Profile 收藏、正式 Run Abandon | 后续阶段／需范围确认 | 当前 Stable Run 与 New Run 只支持 no-run／failure 入口 | 不应阻塞核心七日 Alpha，是否属于完整里程碑由 Owner 决定 |
| 制作／拆解完整经济 | 后续阶段 | 文档有概念，当前正式应用面不完整 | 不作为七日供给保底；若必要需独立规则与经济 Goal |

## 9. 候选新增运行时事实

下表是需求分析，不授权字段、Schema 或 Save migration。

| 用途 | 生命周期 | 建议唯一 owner | 更新时点 | 玩家可见性 | 是否可派生 | 恢复／确定性要求 |
| --- | --- | --- | --- | --- | --- | --- |
| 本局 specialization | Run | New Run／Run progression core | New Run 最终确认一次 | 名称与 player-safe 效果可见 | 否 | strict enum；不可中途改变；参与 rulesVersion |
| 当日场景候选及公开摘要 | 日／查询 | Scene selection query | 每日 Hub canonical state 变化后重算 | 公开名称、倾向、模糊危险 | 尽量从规则、日期、Run facts 派生 | 同版本／seed／状态一致；不持久化 Preview |
| 当日已选择 sceneDefinitionId | 从选择到 Return | Scene launch lifecycle | 单次场景选择 command | 可见 | sceneInstanceId 可由事实派生 | 绑定后不可改选；不得伪造 ledger |
| location progress | Run，按 sceneDefinitionId | World／location progression core | Return、正式事件或日结算的明确定义点 | 只投影已知结果 | 部分 objective status 可由来源派生 | exact keys、catalog 引用完整、跨日确定性 |
| 主线 objective sources | Run | 任务储存区／RunIntel／location facts 各自原 owner | 安全 Return 或正式世界事件 | player-safe 进度可见 | **应派生** objective completion | 不重复保存 completion boolean；恢复时重算并验证来源 |
| final-day terminal source | Run terminal | Future Final Day Resolver | Day 7 Return 后显式 End Day | 结果与公开理由可见 | 否 | 原子 outcome；Success／Failure source 严格恢复；唯一 Save |
| 跨日导航知识（若确认） | Run location knowledge | Navigation knowledge owner | Return 时 carry forward，Launch 时投影 | 仅已知节点／边 | 否 | 不得从完整图反推；按场景版本校验 |

不建议创建一个包含所有字段的 `FullRunState`。优先扩展现有 Hub／Scene carry-forward 聚合，并让完成状态从既有事实来源派生。

## 10. 经济与反例检查

### 10.1 检查方法

本轮是 **设计自查**，没有独立审阅者执行，不能称为 Independent Critic PASS。只使用文档和现有源码参数做边界推导，没有运行七日模拟，因为新增场景、供给表和专长数值尚不存在。

当前已确认可量化参照：医院配置初始饱食 6、每日消耗 2、口粮恢复 2；医院维护每天 3 点基础工时；医院感染、医疗、电池和维护测试值存在。它们只证明现有配置行为，不证明新世界经济。

### 10.2 初稿暴露的问题与修订

| 反例 | 初稿风险 | 本稿修订 |
| --- | --- | --- |
| 固定顺序无条件更优 | 先通信再医院再物流可能成为唯一最优 | 不给通信成果通用数值增益；资源缺口与状态决定相对价值，正式平衡必须跑多起点路线 |
| 工程专长成为通信资格 | 把“修复通信”写成工具／工程硬门 | 保留通用高成本路径；工程只改成本／风险／收益 |
| 必须搜空所有节点 | 三类成果之外还要求资源全清 | 主线只取明确定义成果；补给是策略选择，合理撤退保留后续价值 |
| 较差掉落导致无提示死档 | 关键口粮、任务物或电池全由随机提供 | 关键 objective 不走普通随机池；经济要验证确定性最低供给，不用平均掉落掩盖缺口 |
| 同一资源被重复计入 | 把医院随机电池、通信固定电池和物流补给同时算成保底 | 每个内容源单独列 deterministic floor／random range／required sinks，跨场景只计算一次 |
| 重访刷固定收益 | 每日新 Scene seed 导致固定搜索与任务物重生 | 引入待确认 location progress；一次性 fixed reward 已完成后不重生 |
| 撤退等于浪费一天 | 只有完成主线才保留价值 | RunIntel、已安全提取普通资源和明确世界事实可以保留；但未安全提取实体不自动保留 |
| Day 7 成果齐备后绕过危险 | 成果齐备即立即 Success | 仍需正常 Day 7 行动与显式最终结算；具体危险／主线顺序交 Owner 决定 |
| 医院维护预算被外推 | 8 对 7 的医院示例被当成七日全经济 | 明确只作单内容参照；三场景七日需要新预算矩阵和合法较差路线测试 |

### 10.3 正式实现前的预算 Gate

至少建立以下纸面表与可执行测试：

1. 每日、每场景的确定性最低供给与随机区间，分别列食物、医疗、抑制剂、电池和维修材料；
2. 三种专长各自至少两条七日合法路线，含一次早退和一次较差但合法掉落；
3. 关键 objective 的最晚可达日、失败可见性和重取／替代次数；
4. 不使用制作／拆解收益的基础通过性；若后来把制作纳入保障，先冻结配方与损耗；
5. 不要求所有策略获胜，但失败必须可解释，不能由未公开的永久死档触发。

## 11. Owner 优先决策包

### 决策主题 1：主线成果模型

- **问题**：三类准备是否采用本稿结构；医院样本是否允许等价替代。
- **已有规则**：样本是任务物，安全返回才计进度；样本不是完整七日最终核心部件；关键对象遗失必须有重取、替代或明确失败。
- **候选**：A. 三类成果全部必需且各有重取；B. 三类中满足两类加一项高成本替代；C. 单一组装式核心。
- **推荐**：A，但每类必须有非专长锁定的基本路径，且样本遗失的重取规则明确。
- **玩家影响**：目标清晰，场景都有主线意义，携带与撤离仍重要。
- **工程影响**：决定 task storage、RunIntel、location facts 和 progress query 的来源。
- **不决定会阻塞**：任务目录、重访状态、Final Resolver 输入与 UI 进度。

### 决策主题 2：三场景池与跨日重访

- **问题**：是否采用医院／通信中心／物流站，以及哪些状态跨日。
- **已有规则**：每天一个主要场景；当前仅同一 Scene 内节点状态明确不刷新；导航知识不默认跨日。
- **候选**：A. 三场景可自由重访，Run-owned location progress；B. 每场景固定开放日；C. 单大型医院分区。
- **推荐**：A，以少量一次性 progress 约束固定奖励，不保存整份旧 Scene snapshot。
- **玩家影响**：能补救早退和资源缺口，不被固定日程绑死，也不能无限刷主线。
- **工程影响**：需要 location progress owner、Launch 投影、strict restore 与 Save 更新。
- **不决定会阻塞**：多场景 content、固定资源预算、导航知识和任务物重取。

### 决策主题 3：多场景选择与身份绑定

- **问题**：选择前 Hub 如何保持合法 continuity，何时派生 Scene identity。
- **已有规则**：DEC-044 只冻结 Day 1 单医院预绑定；Return Ledger 只记录真实返回。
- **候选**：A. Hub 保存当日候选集的确定性来源，选择命令原子绑定 sceneDefinitionId 与 instanceId；B. New Run 预先绑定一个默认场景；C. 使用 null／占位 identity。
- **推荐**：A；明确禁止 B 的隐藏默认和 C 的占位身份。候选集尽量派生，不作为第二份 truth。
- **玩家影响**：看到候选后明确承诺，刷新不能改变已提交选择。
- **工程影响**：影响 Hub strict restore、Scene selection command、Launch、Save 与 Return ledger invariants。
- **不决定会阻塞**：第一项多场景编码 Goal。

### 决策主题 4：专长效果与 Modifier owner

- **问题**：三个专长具体改变哪些安全事实，如何保存和展示。
- **已有规则**：三选一、Run 内不可换、全部可通关；当前无字段或实现。
- **候选**：采用本稿信息／工程成本／生存成本三分法；或更窄的每专长两项固定 modifier。
- **推荐**：先冻结每专长 2–3 个可测试作用点和基础替代路径，再定数值；避免大量例外标签。
- **玩家影响**：形成不同路线，而不是颜色不同的被动加成。
- **工程影响**：New Run、Run continuity、Save、core resolver dependency、player-safe Preview 和 UI 都受影响。
- **不决定会阻塞**：完整七日里程碑，且不应以 `none` 占位绕过。

### 决策主题 5：Day 7 终局顺序与 terminal

- **问题**：日级危险、主线检查、Success／Failure 的优先级与保存来源。
- **已有规则**：Day 7 有正常场景机会；当前普通 End Day 明确拒绝；死亡／威胁 terminal 已有原子 Failure。
- **候选**：A. 先结算日级危险，生还后检查主线；B. 先检查主线再结算危险；C. 独立“启动逃离”命令。
- **推荐**：A，避免在同一次终局中出现“已经死亡但成功”；但这是重大规则选择，Owner 确认前不得实现。
- **玩家影响**：第七日生存准备仍重要，成功条件与失败原因可解释。
- **工程影响**：需要 Final Day Resolver、Success terminal snapshot、StableRunPhase／Save strict restore、UI Result 和 New Run 入口。
- **不决定会阻塞**：终局编码和完整七日验收。

### 关联但可后置的范围决策

- Profile 收藏写入是否纳入完整七日 Alpha，还是首版后续 Gate。
- 正式 Run Abandon 是否必须随七日同时实现。
- 制作／拆解是否进入七日基础经济，还是只用已有维护／补给边界完成 Alpha。

这些不能被静默删除；Owner 可以明确排进后续阶段。

## 12. 候选 Execution Goals

### Goal A：多场景选择、身份与 location progress 基础

- **玩家能力**：每天查看正式候选并承诺一个场景；重访不会重复刷一次性成果。
- **前置决策**：主题 2、3。
- **系统影响**：CurrentDayHub、SceneLaunch、Run continuity、Return Ledger、Save、player-safe query。
- **验收路径**：Day 1 三候选 → 选 A → Return → Day 2 选 B → Day 3 重访 A；刷新／恢复 identity 一致，一次性结果不重生。
- **源码审查点**：完成 Hub／Scene／Return／Save strict boundary 后 exact-SHA 审查。
- **不做**：新场景完整内容、专长、终局、Profile。

这是第一项可能的编码 Goal，但必须先完成主题 2 和 3 的 Owner 确认。

### Goal B：专长生命周期与最小 Modifier 接入

- **玩家能力**：New Run 明确三选一；不同专长改变已确认的成本／信息，不改变主线资格。
- **前置决策**：主题 4 及每个 modifier 的规则值。
- **系统影响**：New Run、Run identity continuity payload、Save、core resolution、Preview、UI。
- **验收路径**：三个独立同 seed Run 走同一 command，差异只出现在已确认作用点；跨 Save 恢复不变，不能中途换。
- **源码审查点**：生命周期／Save 完成后；三专长 content 完成后。
- **不做**：天赋树、永久成长、职业专属主线门。

### Goal C：通信中心 playable scene

- **玩家能力**：探索非医院的信息／供电场景并安全带回撤离窗口成果。
- **前置决策**：主题 1、2；场景节点／事件／敌人／资源内容确认。
- **系统影响**：现有 Scene runtime catalogs、player-safe query、Game Shell content adapter。
- **验收路径**：至少两种非资格锁路径、早退、重访、关键成果安全提交、合法较差资源路线。
- **源码审查点**：content definition + deterministic integration tests。
- **不做**：第三场景、终局、完整经济。

### Goal D：物流站 playable scene 与七日经济底线

- **玩家能力**：以补给／维护／重载取舍取得稳定成果。
- **前置决策**：主题 1、2；七日资源 floor。
- **系统影响**：Scene content、task items、Return、load／maintenance／survival。
- **验收路径**：任务对象携带、超载返程、早退、不可刷固定补给、三专长可达。
- **源码审查点**：内容与经济反例测试完成后。
- **不做**：未确认 crafting／salvage 保障。

### Goal E：Final Day Resolver 与 Success lifecycle

- **玩家能力**：完成 Day 7 正常行动后得到严格、可保存恢复的成功或失败终局。
- **前置决策**：主题 1、5，及 Profile／Abandon 范围。
- **系统影响**：Daily Settlement、run termination/success、StableRunPhase、Save codec、Store、UI。
- **验收路径**：成果齐／缺、日级死亡、威胁 terminal、保存失败、strict restore、无 Day 8、Failure 后 New Run。
- **源码审查点**：terminal core；Save／application；UI 三个边界分别核验。
- **不做**：评分、奖励、剧情树、完整 Profile，除非另行确认。

## 13. 明确停止点与未决风险

- 本稿不批准任何场景名称、任务对象、专长效果或终局顺序。
- 当前没有可执行七日模拟；示例路线只是设计演算。
- 浏览器补验不是本任务范围，之前遗留的浏览器证据仍未因此变为通过。
- 需要 Owner 先决定主线、重访／身份、专长、终局四大边界；其中多场景身份是第一编码 Goal 的硬前置。
- 任何正式实现都应另开 Execution Goal，并在实现前反讲输入、输出、owner、事务和排除项。
