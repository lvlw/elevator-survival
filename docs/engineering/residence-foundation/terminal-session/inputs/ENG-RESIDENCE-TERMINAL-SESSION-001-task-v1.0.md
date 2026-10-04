# ENG-RESIDENCE-TERMINAL-SESSION-001（C）：v2会话完整终局提交与headless恢复

任务书v1.0；日期2026-10-05。**本项已由WebGPT主线依据Owner已有后续分批授权、正式DEC-051及A/B准确SHA实审PASS下发。完整读取后执行，不再逐步骤申请Owner授权。**

## 0. Goal与停止点

一次完成受控v2会话：真实无档首次创建与首次出发、既有G2活动操作、A四终局与真实动作／休整死亡消费、B完整预编码和冷恢复、唯一current提交、同步存储端口的写失败与重入处理、原生长链和反例、自查修订、文档与本工程分支普通commit／push。

重点是将“已结出且合法的死亡／关闭结果”真正完整提交并可恢复，不继续用开发期拒绝HP0来撤回合法结果。新内容、战斗、医疗、玩家界面与浏览器IO不在本项。普通C受控流程只开放本期首次委托；不是自动接下一真实任务。

完成立即停止，提交完整SHA到当前WebGPT主线进行源码／headless恢复实审；不自动开始内容接线、发布或下一Goal。

## 1. 精确基线、分支及Git权限

```text
repository = lvlw/elevator-survival
base_sha = b9b1e0fee0e779669ca40e088ac9a867016bff82
base_parent = bfc6bd973eeb306df1e8ee916b2160c30b757cdf
base_tree = e8939c6d65075e630e3960b619daa50de0eb9b53
base_src_tree = 05ed81d551d318a58b1a9005b493c4566936ef87
new_branch = feature/residence-terminal-session-001
```

A准确SHA为bfc6bd973eeb306df1e8ee916b2160c30b757cdf，B准确SHA为本次base。B实审报告原件在本包；本任务不修改其对象身份。远端11个参照引用见BASELINE-AND-INPUTS.json。远端main仍为a76e9c1c998051fc1643b6e0c3d53443fa55feed，不从main或旧会话HEAD开始。

开工由Codex实际执行并保存：仓库根、remote、HEAD及parent/tree、branch、status含未跟踪、普通／cached diff、worktree和远端heads。必须确认本地实际起始为指定提交且无无关改动；原会话若在B分支，则由Codex从指定base新建本工程分支，不让Owner手建。已存在同名分支时先核对归属，不覆盖或reset未知成果。网络／环境确实阻塞须如实记录，不把不可查询判作已同步。

本项明确授权新建上述分支，白名单内修改、普通commit并push至origin同名分支。不推main、设计、A/B或G1—G4分支，不合并、不强推、不rebase/amend改已交付历史，不绕过hooks或检查，不修改Git安全／SSL／凭据／代理配置。提交／推送失败保留成果和真实退出码，不丢弃本地提交。原任务权限不是无限延续，只有本项白名单与停止点生效。

## 2. 必读材料与权威

先完整核对本包五件原件和SHA清单；再读取当前实际AGENTS.md及其要求的docs/01、02、03、05与相关docs/content。涉及UI的后续任务另读UIR；本项不制定UI或交互弹窗规则。

本项直接依据：

- `docs/05-design-decisions.md`的DEC-049、050、051，尤其051 C01—C12与正常steps=[]消歧；旧医院版本不倒改。
- `docs/engineering/residence-foundation/terminal-restore-contract-v1.0.md`、`terminal-batch-plan-v1.0.md`、`terminal-core-contract-v1.0.md`、`runtime-restore-supplement-v1.0.md`。
- `docs/design-drafts/world-infected-001/entry-003/adoption/inputs/OWNER-approval-WORLD-ENTRY-003-ADOPTION-v1.0.md`及获批稿；`adoption/amendments/step-semantics-01/`原补充只是历史依据，不改原字节。
- 唯一已批参数：docs/content/infected-residence-core-test-config-v0.1.json的34值；infected-terminal-core-test-config-v0.1.json的四值。运行时直接使用现有受控句柄，不复制配置、不新建默认金额。
- A全部生产接口／测试与本项相关的G1/G2、mission-lifecycle实际类型；B的8份生产文件、6份测试、专用helper及B01—B12。
- 原`src/state/residence-session/`全部生产及7份测试／helper，原v1保存测试、B兼容／纯度测试对旧会话的交叉导入。

冲突按正式规则与批准范围处理，不拿历史“待审／未实现”否决已批准新方向。普通实现组织在本任务内自行设计；改变规则、版本、支持承诺或白名单须报告具体冲突，不自行扩大。有限Python模型和源文件名候选不取代当前真实API。

## 3. 本任务确定的技术接入方式

### 3.1 显式v2会话；旧v1不自动转义

采用新增`terminal-controlled.ts`中的`createTerminalResidenceSession(domain, composition)`。composition显式使用B的受控TerminalResidenceSavePolicy；新入口只使用B v2codec，不自动探测并迁移v1。旧`createResidenceSession`、旧controlled／index、旧v1codec和默认G4入口保持原义。

普通新`terminal-index.ts`仅值导出`TerminalResidenceSessionError`、`createTerminalResidenceSessionCommand`；可以另导出types。新受控`terminal-controlled.ts`仅值导出`createTerminalResidenceSession`及`createResidenceSessionDomain`，后者必须复用原domain发行体系。策略构造调用B已有`createTerminalResidenceSavePolicy`，不要创建第二份策略工厂、规则注册或普通入口安装函数。

这是本次明确的C接口／测试组织选择：原批次计划对“旧死亡拒绝测试改为支持”的验收目的，落实到**新v2对照回归**；旧v1拒绝测试继续检测旧接口，不把旧消费者悄悄换到v2。新v2必须逐类证明相同合法死亡情形已完整关闭和持久化，不能以旧测试仍绿替代支持。此选择不增加游戏phase或永久双产品维护承诺。

### 3.2 同一个domain只准一个写入者

现有session.ts内部的发行／占用WeakSet需抽到本任务新`domain.ts`，让原v1和新v2共用。只迁移技术身份／占用检查与注册，不把current、钱包、存储缓存或任务历史放入domain模块。session.ts原`issueResidenceDomain`／`buildResidenceSession`及其调用含义保持；只允许为共享domain作必要导入、封装和占用调用调整，其他旧业务代码不改。

无效composition不能提前消耗合法domain；有效构造后，同domain再次创建v1或v2均拒绝，包括反向顺序。新domain不是抹历史许可或浏览器跨标签锁；不同测试应用域仍可独立冷恢复。普通请求不可传入新domain来重建已有current，不新增release／reset／replace。

### 3.3 原v1／B测试辅助不可全局改写

旧`src/state/residence-session/test-fixtures.ts`被原v1codec和B兼容测试引用，全部保持只读。C新增自己的terminal-test-fixtures，明确提供v2受控声明／完整目录策略。不得把旧fixture改成v2，再修改旧测试期望掩盖兼容问题。B、A及旧核心全部源码／测试保持原字节；出现真正基础缺陷则报最小复现，不在本项白名单外偷改。

## 4. W1：详细设计与受控内容事实桥

在写生产代码前于implementation-notes记录：单一current所有者、domain共享、v2组合依赖、各phase可用命令、body／mission／balance／carried／warehouse／archive等字段由谁承接、各验证与commit顺序、错误码及测试安排。无需等Owner逐项批准。

composition仅提供已签发B策略、同步字符串存储端口、真实首次工厂及首次execution材料provider等本项必要依赖。捕获受控端口／函数，不在运行中读取可被外部改写的composition属性。不存在普通命令提供的终局outcome、reward、success／supported、完整后态或任意callback。

活动上下文须从当前B完整值、独立受控策略和当前mission得出，建立本次动作的G2 authority及A TerminalAuthority；不能从请求抄权威。A政策中的H0／供电／转运／样本来源只是角色映射，完成事实来自当前site、真实实例及来源。未接五图任务生产者时，**测试文件**可以用已有A/B方式构造绑定完整身份的内容事实，不导出测试工厂、不加公开grant/patch/current替换后门。

规则生产者和v2终局格式已经存在：不创建事件总线、通用命令SDK、另一个钱包、第二份可变任务集合或“lastSaveState作为规则前态”。A/B读出的冻结值／WeakMap是技术边界，不宣称可以防止用户离线回档。

## 5. W2：真实动作和完整终局事务

### 5.1 首次创建、首次出发及奖励空间

`bootstrap`真实读取null才产生no-save，随后显式`createFirst`调用受控工厂一次。B验证完整fresh、revision0和真实声明后预编码，才一次commit/write/notify。坏档、旧版、缺字段、read异常不能走首次工厂；createFirst失败不得产生半角色或消费任务。

首次launch严格核对命令、根身份／revision／commission、fresh／first-ready D1、真实未接及目录匹配；无provider或不合法资格在调用前拒绝。用A的全奖容量查询／守卫，**在execution provider、G1周期、随机和提交之前检查空间**；不得硬编码120、截奖、造冻结余额。

合法首次launch只一次调用正式身份激活、G1 depart和G2现场建立，保留身体、实物／ItemState、仓库、余额和声明全集；只承接一次revision，首次空身体步骤不造夜。返回v2 active，不遗失TerminalSnapshot的其他字段。

**容量验收分层**：当前合法fresh余额固定0，且受控配置已保证初始全奖空间，因此高余额不足的合法fresh本来不存在。不得放宽B或公开setBalance来制造伪正例。至少验证A查询恰满／差1，C实际使用的窄容量预检函数在不足时provider／周期／随机／commit均0，以及坏fresh经owner在工厂／恢复验证阶段被阻止。明确这些层级；不宣称测试了不存在的高余额合法新角色出发。仍须在真实launch路径保留守卫，为后续合法供给衔接提供正确接缝。

普通C仅支持本期首次launch；living/dead不借另一commission ID重开当前委托，不产生新的任务供给。后继新任务激活前的出发日结死亡继续是独立Gate。

### 5.2 活动操作保留真实G2结果

v2命令支持launch、move、reveal、pickup、drop、rest及deliver／withdraw／deadline；查询不作为行动命令。move逐一真实边，reveal遵守一次性来源，pickup/drop仍只执行现有G2允许的整实例操作，不能将任务件标ordinary绕过提取。rest复用实际节点A/C资格及一次G2→G1周期。E0合法免费行为不因此被统一禁止。

调用G2前核对完整绑定与revision，保留当前余额、missions、仓库及旧history等非G2所有字段。G2计划必须由原函数签发且绑定本次完整局部前态；先验证签发，再消费一次。非致死活动结果应保留既有身份／周期连续性、rest的现场／实物保持，并通过B完整聚合；不拷贝伤害／负重／随机公式。

对实际`death-required`：先由**旧完整current**和受控策略建立A authority，然后把**原始G2计划**交A `consumeResidenceLocationDeath`一次，验证A完整计划新鲜度，再B验证／编码最终dead。不把中间active＋HP0先交B活态校验来拒绝合法死亡；不重跑G1/G2/RNG，也不再多加revision。

新v2可接受当前G2已支持的声明式到达healthLoss／exposuresAdded及其真实后果，不能照抄旧G4“非零到达效果一律拒绝”来漏掉真实primary死亡；这不新增事件／CTB引擎。若已死亡并含到达pending，保留A/B已支持的不可访问历史；若仍生还却有待战斗，继续明确未支持且不部分安装，不假胜利、不跳过战斗。生产玩家入口仍未开放，不将开发拒绝宣传为免死玩法。

### 5.3 正常交付、主动失败和稳定截止

deliver／withdraw／deadline只接受意图和binding／expectedRevision，经A实际资格查询与`planResidenceTerminal`消费；C不得接受调用方指定outcome或自行推导样本、金额、病程公式。正常达标只允许明确交付；不达标可失败；错误意图不自动换另一结果。

G1 normal-return的真实steps=[]保持，正常成功／失败不补夜；A内部已调用G1，C不另调用。期限Day7异地stable才进入A，一次G1日结，生还ready／失败或真实dead短路，C承接结果。全奖120、失败最多20、角色初始0与上限全部由已签发配置拥有。

A TerminalPlan核对完整旧态及签发，真实实例／资源与收据、旧家底、不可用资产及历史由A产生，C只完整承接，不在存储、监听或UI另清算。

### 5.4 一个提交入口、明确错误阶段

| 顺序 | 必须成立 | 失败后状态 |
| --- | --- | --- |
| 意图前置 | 严格普通数据、合法命令／绑定／revision／phase／来源／必要容量 | 零业务provider／计划／随机，current不变、write0、notify0 |
| 一次规则结果 | 真实G2结果或A终局；签发／完整前态匹配 | 已调用如实计数，但非法结果不安装，原对象不改写 |
| 完整聚合／预编码 | B验证整个后态并生成v2字符串，适用revision恰一次 | 错误在current替换前阻止，不能半关闭／半钱包；合法受支持结果必须能通过 |
| 提交 | 唯一owner一次替换完整current | 所有子状态同步发生 |
| 持久化 | 一次完整write尝试 | write失败仍保留最新current，标记未存；不回滚、不重读旧档 |
| 通知 | 一次只读通知批次，各listener异常隔离 | 异常不撤销提交，不中断其他listener |
| retrySave | 仅编码并写当前最新值 | 不再调用动作、身份、清算、随机或玩法通知 |

编码可以重复纯校验，但不能因此重放规则。禁止把B同进度`restoreTerminalResidenceCandidate`当任意后态提交验证器：合法next本来不同于old；正常动作应通过签发／旧态校验及B后态校验，不从next复制expected自证。有current后也不开放candidate替换接口。

## 6. W3：冷恢复、只读查询和原生长链

### 6.1 会话生命周期

新v2保持unbootstrapped／no-save／read-error／blocked／ready与独立persistence诊断，四种游戏phase从B得到。bootstrap只能无current且未bootstrap；只读操作不推进病情。读取成功的字符串只经B反序列化、完整冷安装一次，不再建任务、结周期、发奖、移物、写盘或通知。

无current的read-error或blocked可经显式retryRead重试读取；不能以重试为名清档、自动new。已有current一律拒绝第二bootstrap、retryRead、createFirst与replace；write失败也不能例外。只有真实null允许createFirst。

同步端口必须按合同返回string／null和完成一次同步写；不得增加异步监听结算。需要异步浏览器／跨标签职责时报告后续Gate，不用Promise执行另一个后台写入流程。原始保存错误不得被诊断成no-save。

queryKnowledge复用G2安全查询，只在活动稳定的可支持状态提供已知地图，不在closed访问旧地面。新queryTerminalEligibility在活动使用A安全查询，fresh/living/dead返回明确无终局操作的只读值；不会因查询执行清算。getState与内部订阅可以暴露只读headless诊断完整值，但必须标注包含内部身份／种子，**不是玩家展示模型**，不借本任务制定UI。

### 6.2 必须是实际长链，不用预设状态覆盖全部入口

至少一条链从真实read-null→createFirst→launch→原G2搜索／拾取／跨图／留置／休整／回访→H0主动失败或合法死亡→保存→新domain冷恢复开始。完整起点／终点与中间提交均要真实owner完成，不用手写active替代首次出发。

正常成功、任务件处置等尚缺真实五图取得／设施生产者的路径，可以从已有A/B受控内容测试夹具形成的**合法完整active档**开始，再由C实际交付、一次提交、写入和冷恢复。报告必须区分这类起点与fresh长链；不能为了声称fresh到成功全链而给owner加测试patch／grant后门或注册占位内容。

完整两个受控声明的历史测试：用已审A/B原生生产者建立旧成功／旧失败／旧期限与下一活动的合法进度，作为新owner真实冷启动输入，再经C真实动作／休整死亡或返回，保存恢复后核对旧任务、收据、实物历史不改写；当前周期仍按G1处理，旧ready不会永久免日结。后继出发发生在独立测试生产者时如实标记，不称C已经提供第二次玩家launch。

### 6.3 保存失败、重入和反例必须可观察

至少独立完成并分别计数：①正常终局write失败→重复意图拒绝→retrySave最新→冷恢复；②reveal write失败→pickup→rest write失败→后续合法终局→retrySave→冷恢复；③原G2实际致死动作／休整→终局write失败→dead保留→业务拒绝→retrySave→冷恢复。失败扣款、成功奖励、来源cursor、真实实例及周期只发生一次，不按写次数累加。

按真实spy分别计数G1、G2各操作、A计划／consume、terminate、execution provider、首次factory、随机draw、内存引用替换、read、write尝试、通知批次／listener调用。夹具生产计数与会话运行清零分开；G2消费阶段只计增量。内存提交应从current引用实际变化独立观察，不能仅统计“返回committed”。

在读取、factory、execution provider、原生规则函数受控调用、预编码、write、listener、retrySave期间尝试写操作重入；busy拒绝且外层结果一致。规则故障注入只用于明确负例；正例不得用mock结果替代真实A/B/G1/G2。监听错误隔离，unsubscribe不创造结果。

## 7. C01—C12验收矩阵

| 编号 | 最低原生验收 |
| --- | --- |
| C01 单owner／隔离 | v1→v2、v2→v1及同型重复domain均拒绝；无效composition不抢占；克隆domain拒绝；新独立域可冷恢复；原v1回归不改。 |
| C02 首次链／容量 | 真实read-null首次构造及launch，身份／目录／D1／身体实物承接；容量预检按5.1分层证明在provider前；坏档／旧档／无provider不初始化。 |
| C03 活动操作 | move/reveal/pickup/drop/rest实际G2、E0免费和正E截零、一次来源／全实例／跨图跨夜，非自有钱包与历史保持，B可编码。 |
| C04 四终局 | H0成功和失败各Day1/Day7，错误分流拒绝；deadline生还／流血／感染／饥饿死亡；正常空步骤、due／ready、单revision；pending和H0截止拒绝。 |
| C05 G2死亡 | move／reveal／A-C休整、primary到达死亡及被动pending历史；一次结果消费，无重算／复活／重复revision；活着pending仍不支持。 |
| C06 聚合与提交 | A原计划／G2原计划绑定，B预编码先于current替换；逐命令一次引用替换／write／通知；畸形结果和编码失败零部分提交，输入对象不改不冻结。 |
| C07 冷恢复 | fresh/active/living/dead真实字符串读回；无factory／规则／随机／write／notify；未知格式v1坏档分开；无current显式retryRead；有current拒绝所有重建。 |
| C08 保存故障 | 至少三类独立故障链完整计数；包括成功／失败终局及死亡write失败；内存不回退，retrySave仅写最新，无双奖双罚、来源重抽、实例复制、重复日结。 |
| C09 重入／通知 | read/factory/provider/规则/编码/write/listener/retry各接缝写重入拒绝；listener throw隔离；不同调用顺序不会出现另一个current或半事务。 |
| C10 历史与无内容 | 两声明真实历史冷输入→C当前消费→冷恢复；旧成功／扣罚／处分不改，旧ready不免当前后果；唯一真实委托关闭后静态、不可重接且无新供给。 |
| C11 安全查询／API | 新普通2值／受控2值精确断言；拒绝view／close(outcome)/外部plan/supported/patch；玩家安全查询无精确隐藏感染／seed，技术getState清楚区分。 |
| C12 全套与保护 | 实跑A156、B188、身份103／cold23和G1/G2、旧v1/G3/G4以及全量；38参数值（34+4）及旧对象保护、inputs字节、共享前缀、准确提交和远端。 |

本矩阵是必须落实的行为，不规定最低测试数量或可通过改expected达成的数量目标。每行映射实际API、测试文件／用例和错误阶段；原生执行、注入负例、静态检查及未执行分别记录。

## 8. W4：自查、文档与精确白名单

本项最多**33条精确路径**，未列即只读；不是整个目录写入权限。新辅助文件按需要创建，不要求凑满33条；不得为了小重构越界。可选terminal-owner.ts只能承载该v2会话内部统一提交辅助，不能再存第二份current或做通用框架。

```text
src/state/residence-session/session.ts
src/state/residence-session/domain.ts
src/state/residence-session/terminal-types.ts
src/state/residence-session/terminal-commands.ts
src/state/residence-session/terminal-context.ts
src/state/residence-session/terminal-launch.ts
src/state/residence-session/terminal-transitions.ts
src/state/residence-session/terminal-session.ts
src/state/residence-session/terminal-controlled.ts
src/state/residence-session/terminal-index.ts
src/state/residence-session/terminal-owner.ts
src/state/residence-session/terminal-test-fixtures.ts
src/state/residence-session/terminal-session.test.ts
src/state/residence-session/terminal-actions.test.ts
src/state/residence-session/terminal-endings.test.ts
src/state/residence-session/terminal-persistence.test.ts
src/state/residence-session/terminal-reentry.test.ts
src/state/residence-session/terminal-history.test.ts
src/state/residence-session/terminal-compatibility.test.ts
src/state/residence-session/terminal.integration.test.ts
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
docs/engineering/residence-foundation/terminal-session/contract-and-support.md
docs/engineering/residence-foundation/terminal-session/implementation-notes.md
docs/engineering/residence-foundation/terminal-session/verification-results.json
docs/engineering/residence-foundation/terminal-session/completion.md
docs/engineering/residence-foundation/terminal-session/inputs/ENG-RESIDENCE-TERMINAL-SESSION-001-task-v1.0.md
docs/engineering/residence-foundation/terminal-session/inputs/OWNER-authority-and-scope-terminal-C-v1.0.md
docs/engineering/residence-foundation/terminal-session/inputs/AUD-b9b1e0f-ENG-RESIDENCE-TERMINAL-RESTORE-001-review-v1.0.md
docs/engineering/residence-foundation/terminal-session/inputs/BASELINE-AND-INPUTS.json
docs/engineering/residence-foundation/terminal-session/inputs/SHA256SUMS.txt
```

其中只有旧session.ts与四个共享文档可修改：session.ts限3.2的domain抽取；四共享文件只末尾追加当前C状态／B审查入口及未支持Gate，保存完整base字节前缀。其余列名在此基线应是新增，开工核对存在性。旧commands/types/controlled/index/launch/transitions以及旧test-fixtures和全部旧测试不改。旧session的其他业务分支、输出和既有导出保持；不能把新v2业务偷偷写回旧路径。

本项九份文档产物（4工作报告＋5输入）由Codex归档，原包五件按原名原字节到terminal-session/inputs，不改SHA文件适配内容、不把历史B报告改成C通过。contract-and-support写真实C支持与上表；implementation-notes含设计和失败修订；verification-results记录命令、退出码、结果指纹／矩阵／三故障链计数；completion记录实际交付。

不修改正式DEC、A/B及原G1合同、所有已批准配置、原审查档、旧医院、工程检查配置、依赖、UI素材、Project Sources或项目配置。不新增DEC编号或再开正式归档任务。

## 9. 必须实际执行的检查

在任何生产改动前于本工程实际运行`npm run test:run`建立基线；已知历史参考139文件／3135项只是对照，不能预填为本轮结果。固定依赖安装仅按现有lockfile需要执行，不更新package/lock、不运行audit fix。环境阻塞要准确说明，不能借取消测试缩短任务。

完成并修订后执行：

```sh
npm run test:run -- src/state/residence-session src/state/residence-save src/core/residence-terminal src/content/infected-terminal-core-v0.1 src/core/mission-lifecycle src/core/character-cycle src/core/residence-energy src/core/residence-location
npm run check
git diff --check
git diff --cached --check
git diff b9b1e0fee0e779669ca40e088ac9a867016bff82 --check
```

全check依实际package.json包含architecture、typecheck、test、build。保留真实输出、退出码及失败修订记录；原构建大chunk和依赖告警如实记录，不调阈值、不凭本轮称安全审计已完成。未执行真实浏览器／多标签／Owner试玩均写NOT RUN。

自查相邻输入与权限，不只使当前正例变绿；尤其检查：新路径仍有旧v1codec导入、旧业务HP0拒绝残留、重复G1、额外revision、内部归档ground变可用、同domain双owner、保存失败后重读、任务件夹具进入普通命令、读取错误被当null、capacity仅在终局检查等。观察到基础缺陷但白名单不足时给最小反例与定位，不暗改A/B。

检查全部base跟踪对象：除session.ts限域diff及四追加文档外均保持Git blob；既有CRLF检出差异与Git对象分开记录，不改属性/换行配置。所有新增源码／测试在最终测试后再核对暂存及提交字节；最后测试后改源码必须重跑对应与全check。输入UTF-8／摘要原字节、全部新增相对链接／锚点、配置值、精确导出及无不当跨层／循环依赖同时自查。

## 10. 提交、交付与停止

一次完成本批内部设计→实现→测试→自查修订→文档→最终检查，再普通commit／push。不按功能拆成Owner多次转发，不自动启动下一Goal。不要为在报告中自引用最终SHA而追加空提交或amend；最终SHA／parent／tree放提交后报告。

提交后实查：完整SHA和父、tree、基线到提交name-status/stat/完整diff检查、输入blob及实测源码指纹、status／普通／cached diff、远端11个参照及新工程分支。只push本同名工程分支；远端查询失败写REMOTE UNCONFIRMED，不宣称交付同步。

最终报告必须包含：W1—W4；起始／最终完整SHA、tree、分支和push回执；修改文件清单；真实测试基线与最终；新增／替换／删除／净增分开；C01—C12；各原生／夹具／注入证据；三类故障链独立计数和冷恢复零规则证据；session.ts最小共享domain改动及旧v1回归；冲突与未完成；未支持／NOT RUN；越界核查及停止点。

**停止点：当前WebGPT主线对本批准确SHA源码／headless恢复实审。** 不合并、不推main或其他分支、不强推、不执行关机／重启／定时。当前世界尚未可玩，不借C通过跳过任务内容、CTB、医疗、专长、工具箱、UI／安全提示、浏览器和Owner体验。
