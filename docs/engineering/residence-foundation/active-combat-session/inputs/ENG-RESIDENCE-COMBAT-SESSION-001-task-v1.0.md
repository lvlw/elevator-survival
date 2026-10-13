# ENG-RESIDENCE-COMBAT-SESSION-001（E02-S）完整工程任务书 v1.0

日期：2026-10-13。

## 0. 一个完整 Goal 与授权停止点

在已审真实 E02-P 和严格 E02-R/v4 上，完成**显式活战斗唯一会话、真实命令完整提交、headless保存故障／重试／重入及冷恢复**。一次完成详细设计、实现、原生正反例与长链、自查修订、完整检查、文档、普通commit／push；不要求Owner逐函数或逐测试协调。

- 起始准确SHA：`29a018a2ad64f8d5cbe56257381568bf3527cd08`。
- 起始提交父SHA：`55fbf0f48e6a76bea3030bd77354528816581776`。
- 起始Tree：`b7abd390b7a94d3367a79876588e87c1850feeac`。
- 源分支：`feature/residence-combat-restore-001`。
- **新建交付分支：`feature/residence-combat-session-001`。** 不在R、P、设计或main分支上交付。
- 本任务依据Owner既有规则批准／分批执行和任务下发权限，以及随包R1专项PASS下发；不需要再次逐步申请开工。
- 完成后准确SHA会话／保存故障实审，**不自动进入E03、浏览器、UI或O3**。

本任务不创造玩法、DEC、新版本或玩家内容。现存 `formatVersion=4` 的含义保持；不把formatVersion加到5以绕过恢复拒绝。

## 1. 开工实查与资料

定位用户附上的原ZIP，在仓库外解压；完整读取5件输入并核对SHA256SUMS。保持原件字节，后续只将原件复制到本任务inputs精确路径；不将整个复审证据包或历史仓库复制进新工程目录。

重新实查Git HEAD/branch/status/diff、远端可读引用，以及实际AGENTS要求的正式背景。起点不符、非本任务工作区改动或目标分支已含其他工作时保留现场报告；不reset、rebase、amend或覆盖。允许普通fetch核对远端；分支从上列完整SHA建立。

完整读取当时 `AGENTS.md`，按其要求阅读GDD/Vertical Slice/architecture/DEC及相关content背景。重点正式依据：

- `docs/05-design-decisions.md` 当前有效DEC-049—052及未被覆盖的战斗来源；新世界与旧医院按适用范围区分。
- `docs/engineering/residence-foundation/active-combat-lifecycle-contract-v1.0.md`。
- `active-combat-core-contract-v1.0.md`、`active-combat-restore-contract-v1.0.md`、`active-combat-session-contract-v1.0.md`、`active-combat-batch-plan-v1.0.md`（均位于上述engineering/residence-foundation）。
- `content-supply-restore-contract-v1.0.md` 的统一提交、保存和通知条款。
- P 的 `controlled.ts/actions.ts/entry.ts/stable.ts/initial.ts/plans.ts/authority.ts/queries.ts`，以及R实际 `combat-*`与`shared-supply-history.ts`；特别是本次刚修复的 `combat-body-history.ts`。
- 旧S的 `supply-session/composition/commands/expectation/proposals/persistence/initial/types` 及 `domain.ts/types.ts`，只读核对，不复制旧协议假设。

**开工实际运行完整 `npm run test:run`。** 允许命令级 `VITEST_MAX_WORKERS=2`，记录并恢复之前环境值；不得修改timeout、配置、旧测试或过滤“全量”。历史4032及CI154不代替本轮实跑。保留失败、超时、重试的真实经过。

## 2. 精确路径白名单（最多41条）

这是最大许可集合，不要求创建所有可选文件。生产全部采用新的combat前缀，旧P/R、旧会话与共享domain只读；不存在目录级任意写权。4份旧共享文档只在末尾追加。

1. `src/state/residence-session/combat-types.ts`
2. `src/state/residence-session/combat-composition.ts`
3. `src/state/residence-session/combat-commands.ts`
4. `src/state/residence-session/combat-initial.ts`
5. `src/state/residence-session/combat-expectation.ts`
6. `src/state/residence-session/combat-proposals.ts`
7. `src/state/residence-session/combat-persistence.ts`
8. `src/state/residence-session/combat-session.ts`
9. `src/state/residence-session/combat-queries.ts`
10. `src/state/residence-session/combat-index.ts`
11. `src/state/residence-session/combat-controlled.ts`
12. `src/state/residence-session/combat-test-fixtures.ts`
13. `src/state/residence-session/combat-test-observers.ts`
14. `src/state/residence-session/combat-test-routes.ts`
15. `src/state/residence-session/combat-session.test.ts`
16. `src/state/residence-session/combat-domain.test.ts`
17. `src/state/residence-session/combat-initial.test.ts`
18. `src/state/residence-session/combat-expected.test.ts`
19. `src/state/residence-session/combat-actions.test.ts`
20. `src/state/residence-session/combat-medical.test.ts`
21. `src/state/residence-session/combat-stable.test.ts`
22. `src/state/residence-session/combat-terminal.test.ts`
23. `src/state/residence-session/combat-persistence.test.ts`
24. `src/state/residence-session/combat-reentry.test.ts`
25. `src/state/residence-session/combat-history.test.ts`
26. `src/state/residence-session/combat-longchain.integration.test.ts`
27. `src/state/residence-session/combat-compatibility.test.ts`
28. `src/state/residence-session/combat-atomicity.test.ts`
29. `docs/engineering/residence-foundation/active-combat-session/completion.md`
30. `docs/engineering/residence-foundation/active-combat-session/contract-and-support.md`
31. `docs/engineering/residence-foundation/active-combat-session/implementation-notes.md`
32. `docs/engineering/residence-foundation/active-combat-session/verification-results.json`
33. `docs/engineering/residence-foundation/active-combat-session/inputs/ENG-RESIDENCE-COMBAT-SESSION-001-task-v1.0.md`
34. `docs/engineering/residence-foundation/active-combat-session/inputs/OWNER-authority-and-scope-E02-S-v1.0.md`
35. `docs/engineering/residence-foundation/active-combat-session/inputs/AUD-29a018a-ENG-RESIDENCE-COMBAT-RESTORE-001-R1-review-v1.0.md`
36. `docs/engineering/residence-foundation/active-combat-session/inputs/BASELINE-AND-INPUTS.json`
37. `docs/engineering/residence-foundation/active-combat-session/inputs/SHA256SUMS.txt`
38. `docs/03-architecture.md`
39. `docs/08-rule-implementation-traceability.md`
40. `docs/design-drafts/world-infected-001/01-world-overview.md`
41. `docs/design-drafts/world-infected-001/10-decision-queue.md`

如果发现必须修改白名单外的旧生产源码、schema、policy、expected、domain、旧测试或依赖才能完成，先报告精确冲突，不自行扩大范围、不临时改后还原。不通过整目录重构／批量改名绕过白名单。

## 3. W1：详细设计、唯一会话和受控启动

### 3.1 独立入口、共享domain

在新 `combat-controlled.ts` 提供显式会话构造门面；`combat-index.ts`只导出必要类型、错误或只读接口，不向普通消费者提供构造、任意replace、reset、install、上传effects/nextState或签发权限。新会话可使用现有错误类别，或在新combat-types中定义自己的明确类别，不改旧错误合同。

**直接复用 `domain.ts` 的同一注册／占用集合。** v1/v2/v3/v4同域只允许一个writer；新会话不是独立combat Store。组合材料验证通过后再占域；非法composition不能消耗尚可用domain。所有同型／交叉方向均需测试，不能只测v4-v4。共享domain不冒充多标签锁。

唯一current持有完整P `CombatValue`。getState只作受控诊断；诊断中完整世界／来源／敌人记录不可宣称为最终玩家安全ViewModel。只读query复用已有 `queryResidenceCombat`／`queryCombatTerminalEligibility`；不在S重算伤害、物资、日额、资格、病程或奖罚，不提前扩写E03知识图／UI。

### 3.2 composition边界

建议延续旧S角色：受控v4 policy、同步read/write字符串端口、`startup: first|existing`、独立初始材料提供者及无候选参数的cold expected提供者。实际签名可在本批详细设计内收口，语义不能缩减。

组合对象／端口／回调逐层严格检查形状、允许键、数据属性和调用资格。复制合法端口外壳，不能冻结或修改调用者拥有的对象；不得执行getter来“验证”。拒绝已知async/generator函数；普通函数返回thenable也必须在实际调用时识别并拒绝／标记故障。read的合法结果仅string/null，write成功仅符合原同步合同的void；Promise、false、undefined-read、数组等不解释为无档或成功。

未知实现异常保持可诊断，不用全局catch包装成合格业务拒绝；IO边界和监听异常可以按正式合同转成明确故障状态。组合依赖不能从UI传入任意规则、配置、效果或开关。

### 3.3 冷启动、首次建立和单调拒绝

冷expected必须先于候选存在；提供者不接收候选文本、解析后value或刚读到的origins/battle。既有启动中，应在进入候选读取／解码前固定并严格验证本次外部expected；无效材料不得落为新角色。不能把expected塞进同一个v4外壳后称为候选外独立事实。

只有**真实read-null、startup明确允许首次、无既有进度证据、初始材料严格合法**时，才可调用真实 `establishCombatInitial`。不手造初配、不复制物品、不刷新身体、积分或其他任务。首次材料中的execution、seed、工具／专长作为独立初始锚保留；后续expected不可从initial origins反推。

读到任何非空坏档、未知旧版本、错误锚、非字符串返回或已知非首次／已关闭材料后，首次创建资格不能经retryRead→null重新打开。已有current以后禁止bootstrap/retryRead/再次createFirst覆盖；不能重新发初配或重开原委托。无存储内容但startup为existing仍应blocked。

read-error只表示读取失败，不等于无档。允许在明确未安装current的受控错误状态重试；资格单调规则须实际测试。成功冷加载只读1次、严格decode1次、安装current1次，不写盘、不通知玩法、不授出可调用的P签发能力。

## 4. W2：真实P命令与完整原子提交

### 4.1 命令和P复用

先校验原请求的strict键、整数、ID、nested command，再比revision、phase和实际battle。非法当前阶段请求尽量在玩法生产者之前拒绝；后态错误则如实记录已执行的纯函数，但current/write/玩法通知必须为0。

至少接入：首次depart、稳定move/source/task/task-transfer/inventory（含真实拆合、快捷迁移）、medical、maintenance、rest、正常deliver/withdraw与deadline，以及活战斗command。稳定与活战斗分流严格；活战斗不可用move/rest/task/return/deadline跳过响应。战中只允许P当前正式战斗命令，快捷消费锁定真实slot/instance/目标及单单位，不能隔空用背包药或自动装填。

S层combat请求须绑定当前实际场次（可用独立battleId/expectedBattleId字段），在转交P之前核对并按P实际strict请求形状传递；不得把S附加绑定字段直接塞入P而迫使P放宽schema。外层意图不能指定HP、roll、敌人后态、胜负、pending或费用。已关闭／dead无新任务入口。

**不能照搬旧Supply的死亡后处理。** 当前 `resolveResidenceCombatAction` 本身已调用一次raw计划并在死亡时消费一次，返回完整CombatPlan；稳定P动作或移动也可能已经返回producer=terminal的final dead。推荐直接使用这些正式完整入口，再 `assertCombatPlanCurrent`；不得再消费、终止或结算一次，也不能因命令不是terminal便拒绝合法terminal生产者标签。需要使用raw死亡token时，必须显式仅走一次受控分支，不把它先装成HP0活动态。

所有P调用绑定当前完整独立before与正确deps，通过现有authority构造与计划验真，不用结构相似或revision相等替代WeakMap签发验证。clone/JSON/旧计划/异执行/异依赖/异作用域必须拒绝；代码不得自建绕过P能力的plan。

### 4.2 完整事务顺序

一笔事务：

`busy → strict命令/完整before → 真实P组合(含应有的一次死亡消费) → 原计划验真/身份及连续性核对 → R完整聚合 → v4预编码 → current一次替换 → write一次尝试 → 一批只读通知 → finally释放busy`。

移动＋入场、玩家动作＋全部到期敌响应＋胜退／死亡，各只推进一个外层revision、只提交一个完整停点。不得先安装pending、临时防御、逃跑准备、待扣费victory、HP0 active或部分库存，再靠回调补齐。

预编码前的提交expected可以从**已经完整before绑定且签发验真成功的P结果**与保留的独立初始材料产生，同时校验合法进度变迁。这不是从不可信冷档自证。冷加载expected、同进度expected、已验证原生提交expected必须在文档和类型角色上分清；不要求不现实地在规则求值之前预知随机后果，也不把未经验真任意snapshot当生产结果。

完整后态无效、未签发、错误绑定或预编码失败：无current替换、无write、无通知，原输入／权威expected不变。纯生产工作若已做，分别报告真实调用次数；不能把“零提交”写成“所有函数都没执行”。

### 4.3 必须保留的特殊终局

双方归零仍最终dead；已击杀敌的真实none与敌仍活的匹配combat-required按R-F01联合验证，均可以保存／读回。不能补胜退费、奖励、后继意图、随机或恢复敌HP。死亡的当前site为null、实际现场留archive。

真实生还胜利／退却一次扣本场E，E0仍处理已触发战斗；正常H0/Day7 H0使用真实空steps；异地Day7只在合法稳定点先日结，HP0死亡、存活失败召回。战后立即维修／维护流血死亡保持P-R2语义，无需先整理或移动。首绷、真实消费、材料安装、日额、旧成功/失败/处分与来源不因恢复而重置。

## 5. W3：保存故障、重入及实际headless长链

### 5.1 最新内存与retrySave

write失败后保留最新current及全部已提交后果，设置save-failed。下一合法命令从最新内存继续，不能重读旧档、rollback或重发材料。`retrySave`只以current及受控保留材料重新验证／编码并写入；不重跑P/CTB/RNG/发物/用药/日结/退出E/终止/奖罚，不改revision，不替换current引用，不重复玩法通知。

write故障及listener异常不撤销已发生的current提交。所有listener读同一完整提交快照；单个listener失败不阻断其他listener。展示只读，规则响应由同步有序编排组合，不新增通用总线或异步监听扣值。

### 5.2 重入

read、初始材料、cold expected、生产者、验真、聚合、encode、write、通知及retry的每个外部/可观察回调点，递归dispatch/create/restore/retry均被busy保护拒绝；finally始终释放。无效composition不占域，已占域不能另建writer“恢复”。只读诊断可读哪一版值明确，不泄漏可变别名；订阅回调不能修改current。

对同步端口返回thenable、抛错、监听器抛错及内部实现异常分别测量。不得让异步write后来完成时覆盖更新current；本批不接异步存储。

### 5.3 四组故障链（每组内部可多支，必须独立计数）

| 组 | 原生过程和必须证明 |
| --- | --- |
| F-A 首建/入场 | 真实read-null→真实初配→首次depart→真实move触发首场；在初配/出发/入场写失败后继续，初配实例及场次只生成一次，重复命令拒绝。 |
| F-B 战中消费 | 真实玩家决策点→快捷绷带或镇痛→到期敌响应→另一动作；写失败、继续、再失败、retry只存最新；真实药物单位/firstBandageUsed/日额/敌count/risk保持。至少一条风险有真实非零抽取的链，不能全用零风险来声称随机不重播。 |
| F-C 胜退接续 | 真实退却或胜利写失败→预先携带材料的立即维修→合法休整→同敌再入→胜/死；至少两个失败点与最新保存/冷恢复，历史退出费、敌伤、资源和处分不重置。 |
| F-D 关闭/死亡 | 正常H0成功/主动失败、期限和死亡分支；重点双方归零、敌仍活死亡、治疗后死亡、立即维护致死。写失败/重试/冷读均保持一个final终局，不出现HP0活动中间提交、复活、双扣费/重领奖。 |

每条统计至少：G1 action/cycle、G2/P操作、CTB resolver/plan/reducer、raw death consumer、activate/terminate、来源/物品发放、use/recipe、draw、规则计划签发、R aggregate/encode/decode、read/write尝试、current替换、通知批次及listener数。先形成合法测试初态，再独立清零；首次真实首建链另明确计入初建。retry和新cold owner单独增量，不与前半链混算。

新模拟进程只恢复**最后真正成功写入的字节及匹配的独立启动材料**。必须有“较新内存尚未落盘便销毁owner”的对照，明确只会恢复旧已写状态，不宣称未落盘进度跨进程恰好一次。测试提供的expected须与那份成功写入记录配套，而不是最新未落盘内存。

### 5.4 原生长链

至少一条全程从新会话read-null开始，经真实初配/出发、三敌实际CTB、来源/搬运/安装/真实样本交付和成功返回的已有路线；全程用S dispatch，不直接替换current，不把已跑P路线后态当S首建。可以使用明确、可注入且合法的测试风险抽样策略，报告它，不冒称多seed平衡。

各三敌至少一条真实退却→稳定治疗或维护→休整→再入→胜或死链。实际身体边界低HP/E等只用于标注的局部对照；真实首入／真实再入不得清敌、改defeated或手设completed。读取P/旧fixture作导航，不修改原helper；需要S专用路线放新combat-test-routes。

五类完整停点：first-hub、稳定active-world、活战斗玩家决策点、living-hub、dead。覆盖首场/再入/后继场、刚消费快捷药后、刚立即维修后和本轮两种敌终态。冷恢复后与未中断分支执行相同P命令，完整结果应等值；codec/加载阶段与后续动作计数分开。

两份TEST声明历史沿用已有隔离范围：旧成功/失败及交样、安装、处分不得被后继真实战斗死亡倒改。第二声明不注册玩家入口；旧历史为条件fixture时明确标注，不把它算本轮完整首玩。

## 6. W4：自查、负控、验收和交付

### 6.1 十二组验收映射

| 组 | 必须提供实际API/测试定位 |
| --- | --- |
| S01 | v1/v2/v3/v4全部16种有序同型/交叉占域组合，非法组成不占域。 |
| S02 | 真实null→初配/首次出发/移动入场；启动资格单调与不重发。 |
| S03 | 冷expected候选外来源、五停点、错误锚/旧版本/坏档不new、已有current不覆盖。 |
| S04 | 三敌真实CTB、同点/防御/逃跑/日额/装备末次资源及E0战斗。 |
| S05 | 快捷真实单位/目标/首绷、镇痛、治疗后死亡与拒绝。 |
| S06 | 胜退→立即维修/稳定任务来源/真实拆合消费/休整→同敌再入。 |
| S07 | 生还一次E、四委托终局、双方归零与敌仍活死亡、H0空steps及Day7。 |
| S08 | 完整before、签发/clone/stale/错deps/错场次、无效后态/预编码失败零部分提交。 |
| S09 | 四组故障链、最新内存继续、retry仅保存、未落盘丢失的真实边界。 |
| S10 | 每个回调重入、异常隔离、finally释放、只读引用保护。 |
| S11 | 两声明TEST旧关闭/处分/来源/钱包历史保全；无第二玩家内容。 |
| S12 | 原接口/格式/配置保护，全量回归、独立计数和五停点继续等值。 |

至少三类仓库外语义负控，用相同真实期待识别：取消/绕过计划验真或完整预编码，retry重放原命令，绕过共享domain或busy防护。选择真的由目标约束保护的见证；若上游已拒绝，不删除上游规则制造漏洞。负控错误为业务断言失败，不以导入、类型、缓存权限或fixture错误算通过。无生产开关，不修改仓库旧测试或临时旧源码。

### 6.2 最终检查

实际新增定向、受影响P/R/旧S/domain回归，最终完整 `npm run check`（按实际package脚本），两workers允许且完整记录。原P102+58+38、原R169+44及全部更早测试/HELPER字节保持；复跑次数不累计为新增。读者不必依赖这些历史数猜当前实际总数，以本轮基线和测试清单核对。

逐项核验新diff允许路径、源码及测试与暂存/最终commit字节一致、5件输入原字节/摘要、4旧共享文档原byte前缀、5正式合同、现存批准配置/内容和所有范围外tracked对象。扫描新增循环依赖，不新增包、CI或配置。

普通、cached、起点到最终commit的增量diff-check必须exit0。W01累计比较起点仍为 `8c19ca0d28058cf743b41c8547cc2629c8eac767`；仅旧两份输入的七处原硬换行允许累计exit2，不消改原件，不改whitespace配置，不扩大例外。任何本包新增空白警告须先解决，不推导“归档原件一律例外”。

### 6.3 完成记录

四份工程记录包含：起始/父/最终完整SHA及tree、分支与文件清单、真实基线、失败与修正、测试新增/替换/删除/净增、S01—S12定位、四组故障链及cold/retry分项计数、真实首建与条件fixture区分、五停点及双方归零读回、负控、全部检查、W01、输入字节和保护审计、冲突/未完成项、停止点。

同包复审报告只归档为原证据；不得称本任务已经主线PASS。GitHub CI可核验时报告精确SHA和当前状态，不能核验写UNCONFIRMED。浏览器真实存储、多标签与Owner试玩写NOT RUN。不得为了写自己的最终SHA反复amend；精确SHA可在提交后回执中给出。

## 7. Git权限与范围外

允许此任务新建指定工程分支；检查完成后普通commit，并仅 `git push origin HEAD:feature/residence-combat-session-001`。网络失败可普通重试；所有其他分支引用只读。不merge、不推main/旧分支、不强推、不重写历史。

不修改P/R、旧CTB、G1/G2/身份、旧session/domain、v1-v4格式、批准规则/参数/内容、依赖/CI；不执行E03、浏览器Storage适配器、多标签、React/UI、O3、商城/身体服务/后继真实任务或九组合平衡调参。不为“兼容旧档”给新玩家静默迁移。

**完成后停止，给当前WebGPT主线新的准确SHA进行会话／headless保存故障实审，不自动进入下一Goal。**
