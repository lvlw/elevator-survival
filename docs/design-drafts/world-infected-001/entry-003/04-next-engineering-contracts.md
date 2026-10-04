<a id="doc-world-entry-003"></a>
## DOC-WORLD-ENTRY-003 + ADDENDUM-01 采纳附记（2026-10-04）

批准与校勘：[Owner实际采纳](adoption/inputs/OWNER-approval-WORLD-ENTRY-003-ADOPTION-v1.0.md)、[ADDENDUM-01](adoption/amendments/step-semantics-01/DOC-WORLD-ENTRY-003-ADDENDUM-01-v1.0.md)。唯一正式入口：[DEC-051](../../../05-design-decisions.md#dec-051)、[四值试用配置](../../../content/infected-terminal-core-test-config-v0.1.json)、[A契约](../../../engineering/residence-foundation/terminal-core-contract-v1.0.md)、[终局恢复补充](../../../engineering/residence-foundation/terminal-restore-contract-v1.0.md)、[A→B→C门槛](../../../engineering/residence-foundation/terminal-batch-plan-v1.0.md)。

以下仍是原工程候选；唯一当前A契约与A→B→C门槛见上方正式入口。A产纯TerminalPlan且无安装／保存权；B在A准确SHA实审后由主线锁定实际接口与路径；C等待A/B通过再消费完整结果。不得将此候选路径或未来SHA冒称现有模块。

ADDENDUM-01按真实G1/G2来源划分正常返回空步骤、死亡非空步骤和真实日结，T04/T05同步消歧。本任务只完成文档归档，不执行任何工程、不注册内容；文档准确SHA实审仍是下一停止点。

---

**以下完整原文为来源候选与历史记录；涉及本次已采纳范围，以顶部正式入口为准，其余仍保留原状态。**

# 最近三项完整工程合同候选

**全部DESIGN DRAFT／未获执行授权。** 不是本轮生产白名单。基准源码为 `7ca547ab8ab4f411d1102a79baf8c0796f4b082c`；必须先完成本批准确SHA实审、Owner局部采纳及另行正式落文，才可下发任一工程。未知未来起始SHA不能虚填成当前HEAD或main。

主推荐次序：A终局纯核心→B完整聚合与严格新编解码→C会话完整提交。先接会话再补关闭保存会留下不可恢复的真实终局，因此不采用。每批只解决一个可独立审查能力，但不拆成逐函数任务。

## 共通执行与准确SHA门槛

每份正式下发包必须填写唯一40位起始SHA、tree、分支、前项实审最终SHA与Owner采纳原件、精确路径白名单、SHA256SUMS；不得用“最新”或当前设计分支推测。下列`inputs/task.md`等名称是候选固定归档路径，最终发包若原名不同，须在执行前把完整白名单一次订正，不由执行者扩写。

开工读取AGENTS及实际源码，建立真实`npm run check`基线，保留测试数／退出码／现存失败；结束原生正反例与组合故障测试、全check和架构检查，报告新旧测试计数。普通commit/push只至正式任务指定工程分支；最终报告完整SHA、parent、tree和远端实值，停在**该准确提交的主线源码实审**。不自动执行下一批，不合并main。下面文件均为未来候选写入范围，本设计不会创建或修改它们。

## A：终局资格、积分与实物清算纯核心

**目标**：一个完整、不可部分应用的TerminalPlan，包含本次关闭、钱包、真实ItemInstance/ItemState处置、身体／cycle来源、既成历史；没有会话安装、保存或玩家入口。

依赖：本批C01—C10已按状态采纳；失败20及样本必要等已确认方向正式落文；三个数值、任务件细则与容量策略的批准明确逐键。读取既有mission-lifecycle、character-cycle、residence-location受控提案及原生测试，不改首身份契约／G1公式。

接口候选：普通入口只暴露只读资格／结果查询与类型；受控入口由实际任务内容／返回／周期生产者构造并绑定完整前态，意图仅H0交付、H0失败撤出、稳定截止。包括rest在内的G2动作死亡消费原始LocationPlan，保留真实休整地点资格；仅正常返回／期限由受控组成直接获取一次G1 CyclePlan。G1计划不是不可伪造凭证（只有identity/revision base），须由组成私下调用并绑定完整前态再交A，不能接请求提供的结构化计划。任务事实的夹具工厂只在测试文件，不能在普通命令加入supported／success／dead证明。新模块校验死亡后快照，不能调用只支持active/living的G2恢复器强行通过。

**R1验收补充：** A在任何清退、关闭、revision覆盖或步骤索引前校验原死亡提案完整结构/原数值/独立前态与非自有字段、非空合法步骤序列。允许合法HP0但不提前修值，按副本消费；增加原值非法和合法数值越权反例及生产者一次/零提交证据。有限模型保留输入revision的约定不可照搬实际G2已递增的提案。

近期不实现五图任务生产者；以真实实例与受控任务内容夹具原生组合验证消费者，明确没有真实任务入口。所有合法输入先验证后执行，不靠公开`close(outcome)`万能接口。金额guard在纯核心可查询；真正launch接入由C完成。

候选精确写入路径（未列即只读）：

```text
src/core/residence-terminal/types.ts
src/core/residence-terminal/validation.ts
src/core/residence-terminal/config.ts
src/core/residence-terminal/config.test.ts
src/content/infected-terminal-core-v0.1/config.ts
src/content/infected-terminal-core-v0.1/config.test.ts
src/core/residence-terminal/settlement.ts
src/core/residence-terminal/controlled.ts
src/core/residence-terminal/queries.ts
src/core/residence-terminal/index.ts
src/core/residence-terminal/test-fixtures.ts
src/core/residence-terminal/terminal.test.ts
src/core/residence-terminal/terminal.integration.test.ts
src/core/mission-lifecycle/mission-lifecycle.test.ts
src/core/mission-lifecycle/cold-candidate.test.ts
docs/content/infected-terminal-core-test-config-v0.1.json
docs/engineering/residence-foundation/terminal-core/contract-and-support.md
docs/engineering/residence-foundation/terminal-core/implementation-notes.md
docs/engineering/residence-foundation/terminal-core/verification-results.json
docs/engineering/residence-foundation/terminal-core/completion.md
docs/engineering/residence-foundation/terminal-core/inputs/task.md
docs/engineering/residence-foundation/terminal-core/inputs/authority.md
docs/engineering/residence-foundation/terminal-core/inputs/review.md
docs/engineering/residence-foundation/terminal-core/inputs/baseline.json
docs/engineering/residence-foundation/terminal-core/inputs/SHA256SUMS.txt
```

新候选参数文件仅在逐键批准后创建，不复制G1的34参数。唯一运行时生产者为候选`src/content/infected-terminal-core-v0.1/config.ts`，通过terminal/config严格校验形成受控版本化句柄；core只接收依赖句柄，不读取docs、不抄四份数字。content原生测试逐键对照批准JSON及配置身份；B/C显式注入同句柄，不另造常量、默认配置或注册玩家内容。mission两测试路径仅允许补组合独立expected／拒绝降格证据，不放松K18/K19；不改mission index精确导出。新terminal index须精确导出断言，受控API不进入普通index。若实际实现需要修改G1/G2 API，当前候选范围不足，应先在发包前修合同，不能借此直接扩大工程。

原生验收：四终局及互斥；真实样本位置/定义/来源/任务事实；完整重伤同奖／少普通物同奖；P0/19/20/47；缺资格不扣钱不转物；Day7正常无夜／截止逐阶段致死；消费G1/G2结果一次且随机/动作计数不增；留地不回城、实例/资源不重建；旧交付/安装/消费和旧成功不改；金额空间/安全整数/revision溢出/伪造前态拒绝；旧expected仍独立。必须有完整两个受控声明的历史夹具证明旧成功＋后来另一活动任务真实死亡；出发日结在新任务激活前致死属后续协调Gate，不给旧成功补death关闭。而非沿用本设计子组件见证冒充。

不含：session、codec安装、商店/治疗/CTB/UI、第二真实委托、正式DEC及旧医院规则。交付A源码准确SHA后停止；B依赖A实审通过，不因A测试成功自动开启。

## B：完整聚合、关闭态严格验证与新编解码

**目标**：fresh/active/living-hub/dead均有严格的完整候选表示与纯编解码，支持终局实物／钱包／历史一致性；不授予bootstrap／replace／写盘能力。

依赖：A准确SHA实审通过；新技术格式采纳、v1显式拒绝／研发夹具处理已正式明确。默认v1接口行为保持，新增**并列**terminal格式接口供C以后显式消费，避免B暗中扩大旧session支持。

候选精确写入路径：

```text
src/state/residence-save/terminal-types.ts
src/state/residence-save/terminal-validation.ts
src/state/residence-save/terminal-codec.ts
src/state/residence-save/terminal-save.test.ts
src/state/residence-save/terminal-aggregate.test.ts
src/state/residence-save/index.ts
src/state/residence-save/aggregate.test.ts
src/state/residence-save/residence-save.test.ts
docs/engineering/residence-foundation/terminal-restore/contract-and-support.md
docs/engineering/residence-foundation/terminal-restore/implementation-notes.md
docs/engineering/residence-foundation/terminal-restore/verification-results.json
docs/engineering/residence-foundation/terminal-restore/completion.md
docs/engineering/residence-foundation/terminal-restore/inputs/task.md
docs/engineering/residence-foundation/terminal-restore/inputs/authority.md
docs/engineering/residence-foundation/terminal-restore/inputs/review.md
docs/engineering/residence-foundation/terminal-restore/inputs/baseline.json
docs/engineering/residence-foundation/terminal-restore/inputs/SHA256SUMS.txt
```

接口：unknown→严格解析→冷候选语义验证→完整序列化；无安装／IO。R1明确中间active＋HP0死亡提案不能由B冷安装或伪装最终dead，B的dead分支只验证已完整清算的终态。调用现有mission独立expected校验；冷候选不得伪装现存历史。dead专用验证复用合法body读取，不把G1 CycleClosure新增death或用active假的mission去骗G2。新技术format名字和version由正式采纳后确定，本批设计不预注册。

原生验收：四合法终态roundtrip，active携带既有closed历史（两声明仅测试），根身份/声明缺失/两active/缺账/金额不符/重复清算键/实例双归属/资源越界/任务件泄漏/处置缺失/最新source与D/T不符/phase与HP不符均拒绝；v1送新接口拒绝，未知版本拒绝，无自动补齐；候选读写无副作用且重复解码不奖罚。独立expected的篡改拒绝与冷候选非防回档边界须有测试说明。

旧`aggregate.test.ts`中closed unsupported、`residence-save.test.ts`中v1及未知version断言**保留在旧接口**；另加新接口支持断言。`index.ts`变更配套精确导出测试，不能把旧API同名改为支持新阶段。现有G4死亡/关闭拒绝此批仍成立。无需修改旧types/validation/codec实现；若不得不改变其默认行为须先修合同，不偷换任务。

不含：会话current、储存适配器、玩家UI、O3旧槽转换／发布、G1公式、A规则变更。交付B准确SHA源码实审；只有完整编解码通过后才能下发C。

## C：受控终局生产者消费与会话一次完整提交

**目标**：headless会话从真实受控前态和一次G1/G2提案获得终局，把关闭/奖罚/实物/body/clock/历史一次安装并保存；移除相应死亡整体拒绝，同时保留其余未支持保护。提供H0返回与Day7异地稳定截止（H0拒绝截止，走正常返回）的受控资格桥，仍不注册五图玩家内容。

依赖：A/B准确SHA实审、正式合同与版本明确、受控任务上下文的绑定方式可审。首次出发在任何provider/周期/随机前检查钱包容量；失败不消费执行ID、不产生提案。

候选精确写入路径：

```text
src/state/residence-session/types.ts
src/state/residence-session/commands.ts
src/state/residence-session/controlled.ts
src/state/residence-session/index.ts
src/state/residence-session/launch.ts
src/state/residence-session/transitions.ts
src/state/residence-session/session.ts
src/state/residence-session/terminal.ts
src/state/residence-session/test-fixtures.ts
src/state/residence-session/terminal.test.ts
src/state/residence-session/launch.test.ts
src/state/residence-session/operations.test.ts
src/state/residence-session/session.test.ts
src/state/residence-session/session.integration.test.ts
src/state/residence-session/operation-persistence.test.ts
src/state/residence-session/persistence.test.ts
docs/engineering/residence-foundation/terminal-session/contract-and-support.md
docs/engineering/residence-foundation/terminal-session/implementation-notes.md
docs/engineering/residence-foundation/terminal-session/verification-results.json
docs/engineering/residence-foundation/terminal-session/completion.md
docs/engineering/residence-foundation/terminal-session/inputs/task.md
docs/engineering/residence-foundation/terminal-session/inputs/authority.md
docs/engineering/residence-foundation/terminal-session/inputs/review.md
docs/engineering/residence-foundation/terminal-session/inputs/baseline.json
docs/engineering/residence-foundation/terminal-session/inputs/SHA256SUMS.txt
```

接口：新的受控composition显式采用B格式；普通dispatch只读意图/绑定/revision，不接受outcome或调用方supported证明。资格桥从当前受控任务事实、现场、路径到达和pending状态导出authority；夹具工厂必须绑定具体内容/执行/版本，普通请求不可更换工厂。返回／截止用一次G1结果，G4 living动作仍原路径，死亡进入A完整消费而非重跑；一次commit后写完整B格式。只读摘要不包含隐藏精确感染或内部种子。

R1组合验收：C保留生产者已调用一次的事实，非法提案零安装/写/通知且内存/磁盘/原提案不变；合法HP0一次完整提交，write失败后retrySave不再消费生产者或补扣伤害，不以一律拒绝死亡取得通过。

最小旧断言同步：`operations.test.ts`六类death拒绝改为对应完整dead结果及负例；`session.integration.test.ts`旧death reject长链改完整关闭恢复；`session.test.ts`对close/combat/medical的旧断言拆开，万能close／combat／medical仍拒绝，新增受控返回意图及精确导出；保存/重入/通知throw/写失败原断言仍保留。新format与构成须同步test-fixtures和persistence两测试，不能只更改业务case躲开旧支持表。

原生验收：首次出发空间不足时factory/随机/cycle/commit/write全0；成功/两失败/动作和休整死亡完整安装；合法死亡不回滚复活；期限生还ready和正常due读档一致；恢复不二次奖罚/交付；write throw后内存完整、retrySave仅写、不再调用动作/生产者；重入和旧revision、重复click、关闭改title/execution、bootstrap/replace拒绝；两声明夹具检验旧ready不免以后周期，已有成功历史不被后来死亡改写；无下一真实任务保持中枢且不触发病程；玩家提示仅另阶段，不用技术诊断冒充UI。

不含：实际五图任务内容注册、CTB/医疗、特殊回城道具、付费重访、新任务供给、O3决定、浏览器UI及旧档自动迁移。纯headless链完成不称为可玩版本。交付C准确SHA后停止主线源码实审，再另定内容/交互工程。

## 文档同步与范围纪律

三批各自只写上述新合同/实现/验证/完成记录及五份输入，不回写原G1—G4历史支持报告或获批首契约。若正式下发要求更新GDD/架构/阶段总表，应在其新任务白名单逐路径增加；本候选不会让执行者按“相关文档”自行扩写。所有未来新增测试属于各工程，不能记成本设计已执行或已批准。
