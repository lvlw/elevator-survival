# 实际源码能力缺口与唯一所有权

**Draft v1.4 / Engineering Review Candidate。** 固定读审25e420ed9f36f1bf2acfbb0d96e3a798fbdd6bf8，生产文件本轮未改。本表是能力盘点，不是源码独立验收。路径和符号来自实际文件；数字为本次行号定位，未来移动以符号为准。

> **DOC-WORLD-ENTRY-001 · 2026-10-03附记：** 下列源码与测试表保留004基线及证据身份。本次只重新读取任务指定的run-identity.ts、stable-run-command-execution.ts和package.json；没有扩展源码验收或执行测试。[DEC-049](../../../05-design-decisions.md#dec-049)与[首契约v1.0](03-first-engineering-contract-draft.md)已批准、未实现，其他建议不因本次一并获批。

## 1. 能力盘点：能复用什么，不能由名字推断什么

| 边界／实际路径与符号 | 已有能力／建议复用 | 新规则所缺及隔离要求 |
| --- | --- | --- |
| [run-identity.ts](../../../../src/core/domain/run-identity.ts) RunIdentity:4、createRunIdentity:21 | runId／seed／rulesVersion与冻结值 | 无角色、模板、具体委托身份或关闭资格；当前Zod对象不代表新恢复合同会拒绝多余字段 |
| [scene-instance-identity.ts](../../../../src/core/domain/scene-instance-identity.ts) deriveSceneInstanceIdFromRunFacts:31 | 从Run事实确定场景身份 | 派生含currentDay；跨夜持续现场不可直接每天重造 |
| [run-save-types.ts](../../../../src/state/run-save/run-save-types.ts) StableRunPhase:8 | format2，current-day-hub／scene-session／run-failure | 不含连续世界成功、生还失败及静态中枢；不能把旧run-failure改成万能终局 |
| [run-application.ts](../../../../src/state/run-application/run-application.ts) createStableRunApplicationCommand:40、executeStableRunApplicationCommand:70 | 明确命令族路由 | 新版本另接命令，不将UI直接写值作为新玩法入口 |
| [stable-run-command-execution.ts](../../../../src/state/command-execution/stable-run-command-execution.ts) executeStableRunCommand:69 | 校验、终局拒绝、身份连续、一次save；失败保留committedPhase | :89禁止普通命令改变RunIdentity。跨任务须独立受控边界，不为方便松绑 |
| [run-store.ts](../../../../src/state/run-store/run-store.ts) createStableRunStore:19、dispatch:33 | 私有setState、一次稳定phase替换 | 多监听器分别发奖／扣物／治病会造成半份事实，不能这样扩展 |
| [hospital-new-run-transaction.ts](../../../../src/app/hospital-new-run-transaction.ts) normalizeOrigin:86及主事务 | 仅noRun／failure；先验证再取熵，建初态并一次保存 | 不支持生还角色接续。禁止先重建角色再把旧家底覆盖回去 |
| [item-types.ts](../../../../src/core/inventory/item-types.ts) ItemInstance:15；[item-state-types.ts](../../../../src/core/item-state/item-state-types.ts) ItemState:24 | 真正实例身份、容器及耐久／电量状态 | 复用实体迁移，不能按摘要生成同类替身；钱包和任务件资格须另归属 |
| [run-loadout-snapshot.ts](../../../../src/core/run-loadout/run-loadout-snapshot.ts) allOwnedItems:78、normalizeItemStates:100、createRunLoadoutSnapshot:122 | 全物品集合及状态一致校验 | 新永久家底边界需另审，不能推出死亡继承 |
| [run-return.ts](../../../../src/core/run-return/run-return.ts) normalizeInput:23、buildRunReturnTransitionPlan:99 | 只接survived场景终态，sceneID去重，保留真实装备身体；任务物移task-storage | 旧return ledger只防场景重复交接，不防具体委托换ID。旧task-storage不是B式失败保管、重领或补交 |
| [condition-types.ts](../../../../src/core/condition/condition-types.ts) PlayerConditionSnapshot；[health-operations.ts](../../../../src/core/condition/health-operations.ts) applyHealthLoss／restoreHealth | 健康值与恢复操作纯职责 | 须审新病程／效果的周期，不能免费清伤或洗用药次数 |
| [world-threat.ts](../../../../src/core/world-threat/world-threat.ts) WorldThreatDefinition:14；[current-day-hub.ts](../../../../src/core/current-day-hub/current-day-hub.ts):198 | 旧terminal阈值有强制语义，旧Hub拒绝终末感染 | 新版“HP0才实际死亡”需要版本隔离，不只是改一个阈值 |
| [daily-run-state.ts](../../../../src/core/daily-state/daily-run-state.ts) DailyRunStateSnapshot:14及daily reset | 旧日额度状态 | 角色周期与本委托Day必须分开；新接任务不能再次清同周期额度 |
| [scene-launch.ts](../../../../src/core/scene-launch/scene-launch.ts) buildSceneLaunchTransitionPlan:374 | 当前日一次主要场景门禁，创建新scene及时钟 | 新世界同日合法跨图和持续驻留须隔离；不可直接复用此门禁 |
| [daily-settlement.ts](../../../../src/core/daily-settlement/daily-settlement.ts) buildDailySettlementTransitionPlan:276 | :292要求主场景，:298拒绝第七日；旧感染终局、休息恢复、伤势清除、日刷新 | Day7拒绝只是未实现边界，不是已有新召回；旧回血／清伤不得带入新病程 |
| [timed-scene-action.ts](../../../../src/core/scene/timed-scene-action.ts) createOutcome:93；[scene-combat-transition-plan.ts](../../../../src/core/scene-exploration/scene-combat-transition-plan.ts) | 旧时间耗尽／超时与强返伤害编排 | 新E0和合法截止不同，不复用旧强返债务或时间预算代替精力 |
| [enemy-persistent-state.ts](../../../../src/core/combat/enemy-persistent-state.ts) createEnemyPersistentCombatState:22；[scene-combat-types.ts](../../../../src/core/scene-combat/scene-combat-types.ts):25 | HP、意图和已解行动数；active／dormant互斥 | 连续现场可扩展，不能另建一套可改敌人账导致复活 |
| [scene-exploration-snapshot.ts](../../../../src/core/scene-exploration/scene-exploration-snapshot.ts):364；[scene-exploration-effects.ts](../../../../src/core/scene-exploration/scene-exploration-effects.ts):235 | 战斗与场景身体／装备镜像校验和同步 | 镜像是一次转移保持的投影，不是两位可以异步修改的owner |
| [hospital-scene-runtime.ts](../../../../src/content/hospital-v0.1/hospital-scene-runtime.ts) createHospitalSceneRuntimeBundle:32；[run-save-rules-registry.ts](../../../../src/state/run-save/run-save-rules-registry.ts):20 | 内容运行束及版本注册 | 当前registry形状是一mainSceneDefinitionId；新五图注入需新合同，非注册五次旧每日场景 |
| [random-stream.ts](../../../../src/core/random/random-stream.ts) createStreamId／drawUint32；[scene-search-materialization.ts](../../../../src/core/scene-search/scene-search-materialization.ts):80；[combat-risk.ts](../../../../src/core/combat/combat-risk.ts):52 | 种子、游标、命名流，搜索／战斗流绑定sceneInstanceId | 新现场身份必须明确随机锚点；跨图／跨夜不能洗结果，旧种子golden保持 |
| [run-save-codec.ts](../../../../src/state/run-save/run-save-codec.ts) canonicalizeStableRunPhase:131、deserialize:174 | 版本、格式、身份绑定与内容严格恢复 | 不会天然恢复新角色／委托／现场结构；要单独批准新版本和明确旧档处理，不能默补字段 |
| [scene-navigation.ts](../../../../src/core/scene-navigation/scene-navigation.ts) createPlayerNavigationKnowledgeSnapshot:122；[player-visible-scene-navigation.ts](../../../../src/core/scene-exploration/player-visible-scene-navigation.ts) | 已知路线与到达后的观察投影 | 可扩展跨图知识，禁止新界面直接读全图隐藏事实 |
| [player-visible-daily-settlement.ts](../../../../src/core/daily-settlement/player-visible-daily-settlement.ts) previewPlayerVisibleDailySettlement:109 | 按旧正式允许信息调用计划并输出stageAfter／healthAfter／outcome | 旧许可不是新感染隐藏未来的许可。新提示须另定安全投影，有限模型仅移除隐值，不宣称预测完整 |
| [use-stable-run-store-snapshot.ts](../../../../src/ui/run-store/use-stable-run-store-snapshot.ts):9；[stable-run-ui-app.tsx](../../../../src/ui/stable-run-ui-app.tsx) dispatchAndRecord:1728 | React订阅读取、正式命令、读取新canonical后态 | UI不得计算奖励／处罚／病程，也不借任务改动制定统一弹窗规则 |
| [production-composition.ts](../../../../src/app/production-composition.ts)、[production-bootstrap.ts](../../../../src/app/production-bootstrap.ts)、[main.tsx](../../../../src/main.tsx) | 当前医院composition，读取恢复错误分类 | 新版本接线缺失；本轮不增加生产入口，也不声称已有完整世界可试玩 |

## 2. 唯一所有权与生命周期（工程建议，未创建字段）

| 事实 | 唯一owner／生命周期 | 读取、变更与订阅边界 |
| --- | --- | --- |
| 角色身体、健康Effect及已选专长 | 生还角色；死亡终止当前可用状态 | 服务／药／日结请求修改；场景和战斗只保持同步投影，不能监听后另结一次 |
| 积分 | 角色钱包，仅余额与受控收支 | 成功／失败／购买事务提供已核验增减；余额不能拥有病情或决定任务资格 |
| 契约 | 只读版本化内容，世界／模板／具体委托绑定 | 描述成果、期限、返回点、奖罚；不靠UI拼标题产生新资格 |
| 具体委托资格 | 同角色具体委托的唯一canonical生命周期 | 终止结果直接决定关闭，不另持久化可改completed／claimed全集；执行记录仅引用 |
| 一次执行及现场 | 当前活动执行内持续的路线、来源、设施与敌人 | 读档继续与跨图不重建；结束后历史只读，不能供失败重接 |
| 角色真实周期／委托Day | 健康周期owner与任务期限owner分责 | 编排明确已结周期、一次衔接；UI、购买、读取不改日 |
| 物品与装备状态 | 实体所在唯一容器及ItemState | 迁移真ID；消费／安装／交付保留历史，禁止同时放在仓库和背包 |
| 可知信息 | 实际观察／取得的知识事实 | query只返回授权信息；不取熵、不执行危险、不写资格 |
| UI视图／提示／操作可用性 | 只读派生，非持久化第二真相 | 订阅整笔已提交状态；发受控命令，不能用几个监听器补齐结算 |

先核验全部前态与身份→纯计算完整后态→一次稳定提交→一次保存尝试与Store替换通知。实际接线依现有executor保存失败语义：内存已提交必须明确报告，不能再次发奖或重新扣日。这是未来契约；Python深复制拒绝和逐条字典不能证明生产原子性。

## 3. 相关测试实读（NOT RUN）

| 文件 | 阅读到的证据／不应扩大为 |
| --- | --- |
| [run-store.integration.test.ts](../../../../src/state/run-store/run-store.integration.test.ts) | 单次保存、拒绝零调用、继续恢复及保存失败保留内存；不覆盖新委托 |
| [run-save.integration.test.ts](../../../../src/state/run-save/run-save.integration.test.ts) | 版本与身份交叉、重复实体、伪造成功等严格负例；不是新Schema验收 |
| [run-lifecycle.integration.test.ts](../../../../src/state/run-lifecycle/run-lifecycle.integration.test.ts) | 第七日明确拒绝；不是完整末日处理已实现 |
| [hospital-new-run-transaction.test.ts](../../../../src/app/hospital-new-run-transaction.test.ts) | 新身份、验证先于熵、保存失败；不是生还角色连续任务支持 |
| [random-stream.test.ts](../../../../src/core/random/random-stream.test.ts) | golden、不可变与流隔离；新随机锚点需独立回归 |
| [action-execution-level.test.ts](../../../../src/ui/interaction/action-execution-level.test.ts)、[stable-run-view-model.test.ts](../../../../src/ui/presentation/stable-run-view-model.test.ts) | 旧交互分级和可见信息；新提示还须单独人工及自动核查 |

## 4. 版本隔离与第一切口

可自行提出的组织建议：新rulesVersion和content bundle隔离旧医院，把共同纯职责复用在明确适配层；新结构严格恢复而非默迁移。何时发布、保留旧入口／槽多久或显式清理，属于兼容承诺，须Owner在接线前决定。不能承诺永久维护两个完整游戏。

第一切口选窄的委托资格核心，因为旧RunIdentity、scene-return去重与new-run均不提供该能力；它可以在不动旧phase／保存／UI时独立验收。完整契约见[03](03-first-engineering-contract-draft.md)，正式覆盖素材见[01](01-current-baseline-and-adoption.md)。整个后续路线仍须阶段实审和Owner试玩。

## 5. 本次B5／B6定稿职责补充（2026-10-03，未实现）

首核心的唯一权威范围是单个角色与具体委托的窄生命周期事实。恢复候选与可信期望绑定分开；缺记录不是未接，结构合法、冻结或品牌不授予覆盖已有关闭事实的权力。无普通reset／reopen／replace／UI任意完成入口。不能从单个自洽值证明调用方从未丢弃历史；可信恢复安装、跨全部委托的活动唯一性／身份复用、合法终止结果及最新稳定边界均须后续接线验证，不能由本表宣称已保证。

“订阅只展示”仅限定展示订阅与提交后通知，不禁止规则体系在受控、有序、确定性的编排中读取正式前态并提出效果／计划。唯一协调入口组合验证后一次提交完整后态，不能由异步监听器补发奖罚、扣血或关闭。首核心只返回纯后态，没有完整生产事务提交权，不建事件总线、终局协调器、持久化或通知。

以上以[批准契约B5](03-first-engineering-contract-draft.md#b5)与[B6](03-first-engineering-contract-draft.md#b6)为完整正文；不是新源码能力或新增第二套工程契约。首核心完成即准确SHA实审，生产开工仍待独立任务授权。


<a id="doc-world-entry-002"></a>
## DOC-WORLD-ENTRY-002：O1／O2当前采纳附记

2026-10-03，依据[Owner实际批准](../entry-002/adoption/inputs/OWNER-approval-WORLD-ENTRY-002-ADOPTION-v1.0.md)及[获批稿限定](../entry-002/adoption/inputs/WORLD-ENTRY-002-ADOPTION-owner-review-v1.0.md)，O1指定规则／首批试用参数与G1契约、O2同次驻留持续现场及恢复／完整事务边界已批准；本次集中归档待准确SHA实审，生产新能力未实现，G1—G3未开工。

唯一当前入口：[DEC-050](../../../05-design-decisions.md#dec-050)；[试用配置v0.1](../../../content/infected-residence-core-test-config-v0.1.json)；[恢复补充合同v1.0](../../../engineering/residence-foundation/runtime-restore-supplement-v1.0.md)；[G1契约v1.0](../../../engineering/residence-foundation/energy-cycle-contract-v1.0.md)。只采纳获批子集，不把整份Draft、旧fixtures.config或R1字段草图全部升格。O3旧入口／旧槽发布安排仍OPEN；其他经济／商品、医疗细项、地图价格、战斗和专长参数不随同批准。

首身份核心d1d3b79 PASS与[8245cc6 R1专项PASS](../entry-002/adoption/inputs/AUD-8245cc6-WORLD-ENTRY-002-R1-review-v1.0.md)是前置历史，原213项作者有限验证／56项主线探针不算本轮检查。此前BLOCKED、待审及未实现记述保留当时身份；本附记更新局部采纳状态，不倒改旧DEC或[原首契约](03-first-engineering-contract-draft.md)。本轮仅文档／架构检查，结果见[本任务完成记录](../entry-002/adoption/DOC-WORLD-ENTRY-002-completion.md)；不据归档启动生产或宣布世界可玩。

上文源码盘点保留其原读取时点；当前首身份／关闭资格核心已在d1d3b79限定实审通过，源码定点复核仅用于合同关系核对。本轮不实现新增能力，也不将旧盘点改为重新源码认证。

原restore需要独立expected，只能形成同进度候选，不能直接充当冷boot安装。新补充合同已批准独立受控冷候选与唯一应用持有者的聚合／安装职责，但尚未实现；新周期G1先输出局部纯结果，持续现场G2、安装／保存G3后续分别实审。身体、物品、经济、终局业务齐备前不能半笔提交closed，也不新增通用Profile／任务SDK填空。


<a id="doc-world-entry-003"></a>
## DOC-WORLD-ENTRY-003 + ADDENDUM-01 采纳附记（2026-10-04）

批准与校勘：[Owner实际采纳](../entry-003/adoption/inputs/OWNER-approval-WORLD-ENTRY-003-ADOPTION-v1.0.md)、[ADDENDUM-01](../entry-003/adoption/amendments/step-semantics-01/DOC-WORLD-ENTRY-003-ADDENDUM-01-v1.0.md)。唯一正式入口：[DEC-051](../../../05-design-decisions.md#dec-051)、[四值试用配置](../../../content/infected-terminal-core-test-config-v0.1.json)、[A契约](../../../engineering/residence-foundation/terminal-core-contract-v1.0.md)、[终局恢复补充](../../../engineering/residence-foundation/terminal-restore-contract-v1.0.md)、[A→B→C门槛](../../../engineering/residence-foundation/terminal-batch-plan-v1.0.md)。

G4已审headless会话支持首次出发、move、reveal、普通整实例pickup/drop与A/C休整；死亡、关闭及战斗仍未支持安装。上文较早“G1—G3未执行”等描述仅属当时记录。新增正式合同规定A纯计划消费真实G1/G2结果，B联合严格校验与并列v2 codec，C才拥有完整current提交／保存权；尚未新增这些生产能力或接口。

正常返回空BodyStep数组与死亡非空步骤按来源分别校验，实际休整／截止保留原日结；不将有限模型字符串直接当生产BodyStep对象。真实内容事实桥、关闭历史、唯一积分事实与实物处分需随A/B/C落地；旧独立expected／O2与原v1不降级。五图任务件生产者、后续任务供给、CTB／医疗及玩家入口不由文档补成已实现。
