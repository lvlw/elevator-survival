<a id="doc-world-entry-005"></a>
## DOC-WORLD-ENTRY-005 技术定稿附记（2026-10-06）

[R1专项实审](adoption/inputs/AUD-464b59d-WORLD-ENTRY-005-R1-review-v1.0.md)确认准确SHA `464b59d657184636b897f72375eb6b61bd2c5786` 为限定PASS，F01／F02已关闭；不是整个世界或生产实现验收。[MAINLINE技术定稿](adoption/inputs/MAINLINE-technical-ratification-WORLD-ENTRY-005-v1.0.md)确定独立v4及E02-P→E02-R→E02-S逐项准确SHA停审，不新增玩法、DEC或参数；Owner无需新增玩法采纳。

正式技术依据：[P→R→S批次门槛](../../../engineering/residence-foundation/active-combat-batch-plan-v1.0.md)、[E02-P纯核心合同](../../../engineering/residence-foundation/active-combat-core-contract-v1.0.md)、[活战斗时序合同](../../../engineering/residence-foundation/active-combat-lifecycle-contract-v1.0.md)、[E02-R恢复合同](../../../engineering/residence-foundation/active-combat-restore-contract-v1.0.md)、[E02-S会话合同](../../../engineering/residence-foundation/active-combat-session-contract-v1.0.md)。

本次文档交付仍待当前WebGPT主线准确SHA文档实审；其后另行下发E02-P完整任务，不自动开工。E02／E03、玩家入口和浏览器未执行，O3未决定。[本轮报告](adoption/DOC-WORLD-ENTRY-005-completion.md)与[本轮检查](adoption/checks.json)只记本次实际文档核验。

以下原文（含R1附记）逐字节保留；其中“候选／待审／未定稿”、旧通过和旧失败均为当时历史状态，当前技术合同状态以上述附记为准。

---

# W1 — 实际基线与复用矩阵

候选合同；源码观察固定在 `9c3c8a8c97c374bd1def6217c691137f3df10096`，父 `84eb6dff5e9d3238c3e651525b6ed28412132549`；src tree `10501d897195173df2023b1ebd73f9f097228512`。新分支 `feature/design-world-entry-005` 从该提交建立。旧设计会话不作事实来源；[输入基线](inputs/BASELINE-AND-INPUTS.json)与[本轮检查](checks.json)分开。

## 实际API与事实所有权

下列路径以仓库根为准，函数均实际存在；“候选”函数另列在03/04/06，不冒充源码。N编号对应[独立原生探针](validation/native-probe.test.ts)。

| 分类／当前入口 | 返回与所有者 | 可复用边界／必要适配 | 观察 |
|---|---|---|---|
| 原样规则：`core/character-cycle/cycle.ts` 的 `planCharacterCycle`、`planActionBodyConsequences` | CyclePlan／BodyResult，G1拥有唯一body／cycle／clock／quota | 正常H0 steps=[]；真实日结流血→感染→饥饿，活者才刷新quota。战中不调用日结，治疗链不能伪装为其单调扣HP步骤 | N13/15/16 |
| 原样底层／需新组合：`core/residence-location/movement.ts` 的 `planResidenceBoundMove` | LocationPlan，signed完整前态、arrival site及G1步骤 | 先真实移动／流血，HP0优先；`markArrivalEncounter`已把敌人state.hasBeenEncountered设true。须从移动前态及签发结果捕获from/edge/是否首遇，不让玩家填退却点 | N14 |
| 需窄适配：`core/combat/combat.ts` 的 `resolveCombatPlayerAction` | CombatResolution={plan,snapshot}，纯投影值无提交权 | 真实CTB调度、资源、防护和checkpoint有用；目前快照复制身体／携带／敌人／usage，只能临时投影。`applyCombatEffects`会重新构建计划核对effects；新死亡消费者绝不能再调用它重算 | N02–11 |
| 需窄适配：`combat-snapshot.ts` 的 first/reentry构造器 | CombatEncounterSnapshot，首入0/70，重入0/50（旧配置） | 首入拒绝已遇敌，返回INVALID_ENEMY_STATE；G2到达后不能直接交旧first工厂。新受控入场工厂消费移动witness，旧工厂保留旧义 | N01/14 |
| 需窄适配：`combat-enemy-action-primary-plan.ts`、`combat-transition-plan.ts` | 直接攻击／风险／后继意图effects | scratch/lunge-bite硬绑infectedOrderly数值及撕裂／咬伤。新porter/technician需要按动作ID解析伤型；挫伤不能自动生成开放伤口／流血 | [数据表](05-approved-data-and-gaps.md) |
| 原样基础／适配随机域：`combat-risk.ts`、`core/random` | CombatRiskTrace／RandomCursor | 旧stream含sceneInstanceId、敌实例、已行动数、actionId、purpose，每条子流drawIndex=0。不是G2的累计riskDrawIndex；新域须由执行＋持续敌人导出，不能带新battleID导致重抽 | N11 |
| 需窄适配：`combat-player-action-primary-plan.ts`、`combat-selectors.ts` | 玩家主效果／合法意图 | 旧蓄力固定延后200／usage每次探索上限；按已批弱点140+60及G1日额替代投影来源。绷带使用真实快捷位，但旧代码无来源份额及生存首绷标记 | N06/07/10 |
| 原样原语：`core/item-state`、`core/condition`、`core/quick-slot` | 实物扣耗与condition纯变换 | 截零耐久、足额电量、伤口和止血等复用；效果写回同一body／ItemState，不能另建角色对象 | N06/09/10 |
| 需窄适配：`residence-supply/{authority,plans,validation,history,allocations,medical}.ts` | SupplyAuthority／SupplyPlan／SupplyValue | WeakMap能力与完整before校验、有限份额守恒可复用；`planSupplyMedical`只允许稳定非pending，战中不能直接调用。提取只读公用规则及窄消费组合，旧入口限制保持 | N15 |
| 需窄适配：`residence-terminal/supply-terminal.ts` | SupplyPlan；A唯一关闭／钱包／处分 | 当前consumeSupplyDeath只接受task/maintenance/move/rest真实计划。战斗治疗后受伤需要新typed combat-death来源；旧正常空步骤、旧致死非空步骤及历史处分不放松 | N16 |
| 仅当前稳定v3：`state/residence-save/supply-{codec,validation,expected,history}.ts` | candidate/value/string，无安装权 | 严格四态、来源份额和独立expected；活pending UNSUPPORTED_STAGE，format4 UNKNOWN_VERSION。新增显式v4 reader，不能擦pending强行过v3 | N14/17/18 |
| 需新受控门面：`state/residence-session/supply-{session,proposals,expectation,persistence}.ts`、`domain.ts` | SupplySession私有current，诊断getState | 已有域唯一owner、validate/encode先于commit、save失败保内存／retry只写／回调busy。旧十类命令无combat，新的门面复用共同域；不能再开一份战斗Store | N19/20 |
| 仅旧版：`combat-scene-time.ts` 的 `evaluateCombatSceneTime` 与 `core/scene-combat` 接线 | Scene Time/debt／医院场景事务 | 算术形状相似不代表新世界适用；新退出E从103配置读，绕开旧场景耗时、超时返程及额外流血，旧函数不全局改义 | 只读源码 |
| 尚未实现：`content/infected-world-v0.1/enemies.ts` | buildInfectedSupplyEnemies持续声明 | 三敌HP和意图已声明，但没有对应CTB profile生产者。静态category/speed只是现有声明，不能将porter慢重击误称旧抓挠 | 只读数据＋源码 |
| 仅旧可见投影：`combat/player-visible-combat.ts` | PlayerVisibleCombatSnapshot | 敌HP为阶段，却含精确CTB；`previewPlayerVisibleCombatAction`隐藏风险可复用思路。E03须遵UIR，不可暴露getState/seed/风险游标/未揭示事实 | N12 |

## 事实分层与核对方式

已批来源是DEC-049—052及唯一配置；`docs/content`两份38值和103值由现有content运行时绑定，core不读docs。具体profile适配是技术候选。`TEST`人工低HP、少E、队列、预置受伤敌人只为验证边界，不是发放或随机世界事实。

读取实际AGENTS、GDD的战斗／连续驻留附记、切片原战斗／终局验收、架构单owner及新驻留附记、DEC-025/031/035/036/049—052、UIR当前约定，并追踪上表真实imports；同时核对entry-004的03—07、批准记录和P/R/S合同。旧“未实现”段按时间身份保留，不覆盖本包E01-S实审结论。

发现的是已有能力与新接线之间的缺口，没有以旧医院一天一区或Scene Time否决新驻留，也没有把旧实验当新玩法批准。E01-S审查中的CI 179文件/3621项和主线62隔离项仅历史；本轮原生probe、有限模型、架构结果分别记账。


## R1 基线重新核验

本次沿用分支，准确HEAD为df1c3ff6979703b72bf76d73761b3915e59eb5b2，父9c3c8a8c97c374bd1def6217c691137f3df10096；起始工作区和暂存区干净，远端同名分支一致。src仍为10501d897195173df2023b1ebd73f9f097228512；F01/F02发生于隔离Python检查器，不是现有v3／生产CTB回归。

重新核对AGENTS、正式CTB／DEC-052及P/R/S接缝；修前实际执行原106有限项、23原生项和独立34项。两组旧套件通过不能覆盖专项发现；[checks](checks.json)保留独立结果和原历史对象。模型与推理配置不能独立核验，不声称调整。
