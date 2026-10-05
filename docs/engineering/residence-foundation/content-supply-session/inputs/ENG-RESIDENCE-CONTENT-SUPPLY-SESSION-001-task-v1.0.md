# ENG-RESIDENCE-CONTENT-SUPPLY-SESSION-001（E01-S）完整工程任务书 v1.0

## 0. 一次完成什么

将已审E01-P真实任务/供给生产者和已审E01-R-R1严格v3接入**显式、同域唯一的headless会话**。一次完成首次初配/出发、世界任务与药食维护、整实例及份额操作、四终局、严格冷恢复、保存失败/重试、重入和原生长链、自查修订与交付。

本项不是浏览器/UI任务，也不是继续设计药效、价格或战斗；它完成E01方向的第三个真实责任边界。完成即停准确SHA实审，不自动进入E02/E03。

- 起始SHA：`84eb6dff5e9d3238c3e651525b6ed28412132549`。
- 起始tree：`327e3474a3f6b90d156f6e34dbbcc0288f7efe87`。
- 起始的父SHA：`346902461c3fd1f01ec88132d4d2e7c3ef1d50bd`。
- 原分支：`feature/residence-content-supply-restore-001`只读。
- 新分支：`feature/residence-content-supply-session-001`。
- 普通commit/push：仅新分支允许；不merge，不推main/其他分支，不强推。

## 1. 开工与来源

Owner直接附本ZIP。自行定位附件、在仓库外解压；核对同包任务、权限、R1复审报告、BASELINE-AND-INPUTS.json及SHA256SUMS。5份原件逐字节归档到本任务`inputs/`；不用Owner填写路径或手动建分支。

重新实查repo/origin、HEAD、branch、status、普通/cached diff、远端当前分支与参照分支。起点不符或存在非本任务修改时停止报告，不能reset、stash或丢弃。切换模型/上下文后同样重新核对，不继承未验证推断。缺输入或正式约束冲突时先给具体文件/行和影响，不擅改规则。

完整读取实际AGENTS以及其要求的GDD/VS/Architecture/DEC和相关内容，重点入口：

- `docs/05-design-decisions.md`：DEC-049—052及后续实际覆盖。
- `docs/engineering/residence-foundation/content-supply-core-contract-v1.0.md`。
- `docs/engineering/residence-foundation/content-supply-restore-contract-v1.0.md`：R01—R08。
- `docs/engineering/residence-foundation/world-content-batch-plan-v1.0.md`。
- P、R工程目录内当前contract-and-support/implementation-notes及R1记录。
- `src/state/residence-save/supply-*.ts`，尤其policy/expected/history/codec；原v1/v2入口与测试。
- `src/state/residence-session/domain.ts`、`controlled.ts`、`terminal-session.ts`、`terminal-controlled.ts`及已有测试。
- P的supply/task受控入口、authority/plans/types、initial/controlled、medical/maintenance/inventory和A的supply-controlled。

先实跑`npm run test:run`建立本任务基线。169文件/3494项是起点历史对照，不能不运行就写本轮已通过。中断/失败保留真实退出码；配置或版本不匹配先报告，不自行换依赖。

## 2. 修改路径：最多35条

以下是最大允许集合，不要求全部创建。除了4份共享文档均为新增文件；**所有现存生产源码、旧测试、R1源码及格式均只读**。详细内部设计可在这些路径中自主拆分，不逐文件向Owner请示。

- `src/state/residence-session/supply-types.ts`
- `src/state/residence-session/supply-commands.ts`
- `src/state/residence-session/supply-context.ts`
- `src/state/residence-session/supply-initial.ts`
- `src/state/residence-session/supply-expectation.ts`
- `src/state/residence-session/supply-proposals.ts`
- `src/state/residence-session/supply-persistence.ts`
- `src/state/residence-session/supply-session.ts`
- `src/state/residence-session/supply-composition.ts`
- `src/state/residence-session/supply-index.ts`
- `src/state/residence-session/supply-controlled.ts`
- `src/state/residence-session/supply-test-fixtures.ts`
- `src/state/residence-session/supply-session.test.ts`
- `src/state/residence-session/supply-initial.test.ts`
- `src/state/residence-session/supply-operations.test.ts`
- `src/state/residence-session/supply-terminal.test.ts`
- `src/state/residence-session/supply-persistence.test.ts`
- `src/state/residence-session/supply-reentry.test.ts`
- `src/state/residence-session/supply-compatibility.test.ts`
- `src/state/residence-session/supply-longchain.integration.test.ts`
- `src/state/residence-session/supply-faults.test.ts`
- `src/state/residence-session/supply-expected.test.ts`
- `docs/engineering/residence-foundation/content-supply-session/implementation-notes.md`
- `docs/engineering/residence-foundation/content-supply-session/contract-and-support.md`
- `docs/engineering/residence-foundation/content-supply-session/completion.md`
- `docs/engineering/residence-foundation/content-supply-session/verification-results.json`
- `docs/engineering/residence-foundation/content-supply-session/inputs/ENG-RESIDENCE-CONTENT-SUPPLY-SESSION-001-task-v1.0.md`
- `docs/engineering/residence-foundation/content-supply-session/inputs/OWNER-authority-and-scope-E01-S-v1.0.md`
- `docs/engineering/residence-foundation/content-supply-session/inputs/AUD-84eb6df-ENG-RESIDENCE-CONTENT-SUPPLY-RESTORE-001-R1-review-v1.0.md`
- `docs/engineering/residence-foundation/content-supply-session/inputs/BASELINE-AND-INPUTS.json`
- `docs/engineering/residence-foundation/content-supply-session/inputs/SHA256SUMS.txt`
- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`

## 3. W1：会话组成、初次建立与独立冷启动

### 3.1 显式v3入口和单owner

使用新的`supply-index.ts`及`supply-controlled.ts`，不改旧普通/terminal barrels或默认消费者。普通入口不暴露任意install/replace、SupplyAuthority/Policy内部材料、工厂或会话域伪造器。构造入口与诊断接口的界限在文档和精确导出测试中固定。

直接复用已有`domain.ts`的issue/assert/claim职责。v1、v2、v3在同一已签发domain内只能一名writer；不能为v3另建与旧版本不互通的占用集合，不释放占用以绕过已存在current。非法composition须在占域前拒绝；clone/普通空对象不是domain。不同domain只代表不同受控应用实例，不代表浏览器跨标签锁或允许任意重建角色。

组成只接已签发R policy、严格同步storage端口、候选外受控启动材料以及必要的首配材料提供者。复用原同步`read(): string|null`、`write(text): void`语义；拒绝异步函数/生成器等不支持组合，运行时非字符串read/Promise或非void write明确失败，不谎报saved。不要引入真实localStorage/文件持久化adapter、通用事件总线或新的状态库。

唯一可编辑玩法状态是私有`current: SupplyValue|null`。session status、busy和保存结果是技术状态，不复制第二套身体、钱包、来源或任务历史。保留严格外部版本/初始执行锚，但不额外持久化派生expected成为第二玩法真相。

### 3.2 首次无档与真实初配

必须从真实端口`read() === null`和明确首次资格开始。未知错误、坏档、旧格式、错误expected、不支持阶段都不是no-save；不调用首配工厂“救档”。已有current或已知非首次/关闭事实时禁止createFirst、重新bootstrap或任意replace。

`createFirst`阶段由受控首配材料提供者给出原P建立函数所需材料；会话必须实际调用`establishSupplyInitial`，不是接受工厂手拼的任意SupplyValue。输入限制到character、声明/执行和出发前选定工具/专长等原P所需字段，严格验证；不用系统时间、UUID或Math.random提供规则身份/种子。材料失败时无current/写盘/通知，如已经调用纯工厂如实计数。

首配产生revision0的first-hub，原四实物、完整资源及无初粮遵守P；完整R验证/预编码后才一次current、一次write和一批通知。保存失败后重复createFirst必须拒绝，不能重新发物。工具/专长在本批createFirst之前作为受控准备选择，不新增已建立初配的reset/重选命令。

首次`depart`使用实际P `planSupplyDeparture`（内含原身份激活、G1、G2），不得照抄旧v2 launch另做一套；不新建执行ID、不重发初配。已活动、已关闭、死亡或无真实新委托均不能再次depart。首配材料/初始化中没有暗建第二玩家委托。

### 3.3 本批冷启动材料的明确技术边界

当前R的decode要求完整独立expected，**本任务不放宽此接口，也不假装单一存档字符串就能自举出独立expected**。

冷恢复由候选外的受控composition提供`provideColdExpectation()`或等价独立材料。此入口不得接收storage返回的text/解析对象作为参数；实现中不先解析候选提取phase/revision/mission/initial origins再制造expected。可缺省该能力以支持仅首次建立，但读到非空记录却无独立expected必须blocked，不能自动创建。

测试独立保留此前真实生产/已提交记录的expected，在将字符串交给新会话**之前**固定。外部expected的生产部署来源、浏览器槽路由及可信锚保存由后续接入契约负责；这不是Owner手工维护侧车文件的任务，也不授权本轮建第二持久状态。报告必须写“受控独立启动材料下的headless恢复”，不写“已实现完整浏览器冷启动”。

首次expected从独立policy和首配材料的实际角色、声明、execution构造并先严格校验，而不是从首配结果initial origins提取；首配结果反过来与它匹配。首次材料选定的initial binding/execution在owner内保持，后续不能从外部命令改写。

加载非空字符串时：读一次、取得独立expected、真实R decode（含F01/R-GUARD）、严格检查支持阶段，然后安装一次current。加载不发初配、不执行任何玩法、不写盘、不发玩法通知。取得expected的回调也受busy保护；异常/畸形值不得变为no-save。

read失败可显式retryRead；一旦current非空不能重新读旧档覆盖。已观察到非空记录或独立材料表明非首次后，retryRead突然读null不能放开createFirst清除已知进度。旧v1/v2字符串保持blocked而非静默迁移或删档。

## 4. W2：受控内容事务与完整终局

### 4.1 命令只表达意图

实现无冲突的严格命令联合和类型（命名可在W1内定稿）。至少覆盖下列现有P能力，均通过唯一dispatch提交：

| 意图族 | 必须复用的真实生产者 |
| --- | --- |
| 首次出发 | planSupplyDeparture |
| 单边移动、A/C休整 | planSupplyMove / planSupplyRest |
| 固定/随机来源、T1交换 | planSupplySourceReveal |
| 供电/核对/手工/组件/模块/谨慎及直接样本/安装等 | planSupplyTaskAction |
| 原任务件整实例拾取/放下 | planSupplyTaskTransfer |
| 普通拾放、格位、拆合、快捷迁移 | planSupplyInventory |
| 六类战外药食 | planSupplyMedical |
| 机械池/外套/工具箱/充电 | planSupplyMaintenance（取其plan，保留resourceResult） |
| 成功/主动失败/截止 | planSupplyTerminal |
| 已发生的新来源死亡 | consumeSupplyDeath；实际G2路径如使用则只走对应原生消费者 |

如普通move与inventory内部move重名，在会话层用明确namespace/包装表达，不能按缺省字段猜意图。包装层只转发原字段，不复制费用、药效、容量或来源公式。校验kind/允许键、原始安全整数、expectedRevision、当前阶段；把具体目标/材料/格位合法性交真实P校验，不让命令上传body、balance、completed、effects、nextState、plan、authority、支持开关或新的binding。

current与受控policy提供完整前态和规则依赖，通过`createSupplyAuthority`签发当前动作能力。统一使用policy持有的同一dependencies，避免对象身份不一致破坏原能力绑定；不能把请求方的自报值作为authority依据。

### 4.2 原计划一次消费，后态不得提前安装

取得P真实计划后用`assertSupplyPlanCurrent`核对签发、完整基态、依赖绑定和revision。clone、JSON来回、同revision改库存/身体、旧计划或其它dependency计划必须拒绝；不靠仅结构相似证明。

正常行动：验证完整后态（R严格聚合）及唯一revision推进，预编码，再一次替换current。生产者已签发的计划经验真后可用于构建受控next expected；这不是从不可信冷档自证。首配initial锚保持，非本执行任务/旧收据/处分不得被任意改变。next expected由已知前态+受控命令类别+验真原计划确定，不能使用泛用“对任意对象自建expected”校验器。

死亡行动：先消费原始P死亡计划形成完整dead值，再R验证和预编码，**只安装最终dead一次**，不先安装HP0 active，不重跑动作/日结/随机/用药或再加revision。terminal plan不能再当死亡行动消费第二次。真实move/task/source/rest/maintenance死因分开测，不把“所有死亡拒绝”从旧开发态带回来。

正常H0返回仍用P/A→G1真实空steps，身体不补夜；异地Day7截止用真实有序周期与HP0短路，不能改来源或免结算。失败只结一次，已关闭不重接；living-hub静态无后继任务入口。

### 4.3 活pending仍不支持，不成为免死/跳战规则

活着的移动后态若含combat-required，完整拒绝本开发阶段安装，不清pending、不删除敌人、不先保存扣费/位置片段；如已经调用P，报告实际调用而不是“全部0”。该开发限制写入支持矩阵，不是正式绕战玩法或完整五图可玩结论。

必须先区分真实HP0与活pending。合法动作致死且现场也标combat-required时，死亡优先交原消费者完成；不能用活战斗未接入作为理由丢掉合法死亡。E02负责活战斗协调，不在本批加占位战斗状态/自动胜利。

### 4.4 只读输出

复用已有`querySupplyKnownObjects`，诊断getState/订阅明确不是玩家ViewModel。普通查询不签发authority、不改revision、不执行抽取/周期，不暴露隐藏感染/种子/原来源内部身份给未来玩家界面。详细玩家安全投影仍属后续E03，不能自行在React组件重算。

不为凑接口建立通用效果总线；规则响应只在明确同步编排中组合。普通展示订阅保持只读。

## 5. W3：保存故障、重入与真实headless恢复

### 5.1 统一顺序

严格请求/前态→原计划签发与验真→必要的死亡消费→R完整后态验证→完整serialize预编码→一次current替换→一次write尝试→一批只读通知。

初始化同样先完整预编码；冷载入只装已验证候选，不补保存/通知。current替换是整个SupplyValue引用替换，不分别写库存、来源、专长、余额和phase。预编码失败时无部分提交；发生过的纯生产者调用如实计数。

保存失败：current已经是新值，返回save-failed/诊断。下个合法动作从最新内存继续，不能读旧字符串重算或回滚。`retrySave`仅重编码并write最新current，不再次调用provideColdExpectation/首配材料、动作/日结/随机/实例/终局，不重复通知；不能静默自动循环重试。

写失败或监听失败不得撤销已提交成功/失败/死亡。监听异常逐个隔离，一监听失败不阻断另一监听；错误不包含隐藏规则明细的玩家解释。

同进度候选验证仍有R独立完整committed比较。会话不新增对外任意restore/replace；内部需要验证候选时使用已知current而不是候选自身。先后两次合法same-revision值不因外观一致取得重复提交权限。

### 5.2 重入与同步端口

busy覆盖bootstrap/retryRead/createFirst/dispatch/retrySave的整个读、启动材料、首配、P生产者、R验证/编码、write和通知区间。回调递归调用任何写入口必须拒绝，不排队偷偷再执行一次；只读getState/query按当前稳定事实查询，禁止改状态。

composition校验先于claim，复制控制外壳而不冻结调用方可变对象；函数/句柄按实际已有受控契约引用。读写回调返回Promise/thenable或畸形值如实失败，不把未完成异步IO算成功。

外部故障用Vitest spy/mock或测试端口，不新增生产可注入任意后态/任意写current的测试后门。断言异常释放busy，后续合法操作可继续；写失败后不重读，observer抛错不重复整笔。

### 5.3 必须独立统计的故障链

每条支线先完成必要夹具，再单独清零规则/存储计数；cold owner另计。明确是否包含首次建立提交。至少完成：

1. **首次保存/出发链**：真实read-null→首次建立写失败→重复建立拒绝→depart→保存失败→重复depart拒绝→retrySave最新值→新会话冷恢复。初配只发一次、身份只激活一次；失败重试不产生新seed/run。
2. **来源/消费链**：真实初次起点，reveal随机来源写失败→拾取→真实拆合/快捷迁移→合格自救或食物消费写失败→rest或另一合法操作→retrySave→cold。已用来源不再抽，已用单位/首绷不恢复。六药/四维护各自另有真实合法/拒绝覆盖，不要求全塞同一路。
3. **材料竞争/安装/终局链**：明确标记危险已解决的TEST合法冷前态（保留敌人），真实材料取得/搬运/安装写失败→重复安装/双花拒绝→实际H0成功或合法主动失败写失败→retrySave→cold。成功、失败各有一条；任务成果不由completed标记预置替代。至少一组先维修消耗材料后缺料安装拒绝，或反向竞争。
4. **死亡链**：移动、来源/任务、维护、休整死亡至少按来源成组验证；完整dead写失败→重复动作/关闭拒绝→retrySave→cold，不重复消费、修装备、结周期或清钱包。Day7截止生还与死亡、H0空步骤独立覆盖。

每条统计真实G1 action/cycle、P task/reveal/medical/maintenance/inventory、G2实际调用、R encode/decode、随机draw、origin/实例签发、mission activate/terminate、A消费、材料提供者、storage read/write、current引用变化和通知批次。一个新死亡通常有“行动纯计划+终局纯计划”两次签发但只有一次current提交，不能把这些混成同一个计数。

新cold owner读1、规则/实例/写入/玩法通知0。外部expected的受控读取单独计数，不能写成decode推导。只有memory port的故障与读回证据，不宣称真实浏览器或磁盘落盘。

模拟新进程时，若之前write确实失败，冷恢复只能拿到最后成功保存的字符串及对应独立启动材料；不能把未落盘内存视为跨进程持久成功。此限制不允许当前owner回滚或重放。

## 6. W4：验收矩阵、对照和交付

| 验收 | 本批必须交的原生证据 |
| --- | --- |
| S01 | v1/v2/v3同型与双向交叉同域单owner；非法composition不占域 |
| S02 | read-null、外部首配材料、真实P初配/出发；九个工具×专长组合至少真实建立/锁定 |
| S03 | 独立cold expected、错seed/phase/revision/版本拒绝；已current禁止bootstrap/retryRead重建；坏档不变首次 |
| S04 | 真实单边移动、一次来源、任务生产、原实例搬运、普通拆合快捷、份额/ItemState保持 |
| S05 | 六类E0合格药食、无目标拒绝；15总池/外套/工具箱/充电及材料竞争；首绷和日额不重置 |
| S06 | 成功/失败/截止/死亡真实终局；正常空steps、HP截零、Day6局部周期/Day7行动及截止 |
| S07 | 能力和完整前态、无效原计划、同revision改值；验证/预编码失败无部分提交 |
| S08 | 上述四组故障链逐项真实计数，最新内存重试，无重复初配/随机/消费/安装/奖罚 |
| S09 | 读/启动材料/工厂/生产者/编码/写/通知重入；两监听异常隔离、busy释放 |
| S10 | 四态真实端口冷恢复；P两声明历史保存后保留旧成功/失败；TEST接续不变第二玩家命令 |
| S11 | 旧v1/v2/v3源码/测试不改；F01四坏历史加载blocked；活pending开发拒绝与合法死亡优先 |
| S12 | 精确公开导出、只读查询、全量check、原件/参数/白名单/保护对象及真实未运行边界 |

至少一条长链从默认真实read-null/初配/出发开始，走合法安全路线并成功保存/冷恢复；不能所有测试都从预置active起步。复杂成功路线可以使用独立标记的危险已解决TEST冷前态，再真实生产全部任务成果；它不证明CTB或完整五图通关。要验证受傷自救，可用独立声明的合格身体TEST初始材料或真实既有生产者，不能修改会话私有current。

沿用P/R既有原生测试/工具时不修改旧文件。新专用fixture位于本任务路径；TEST中可使用已有twoDeclarationFixture/原生产者生成合法第二声明前态，生产dispatch仍拒绝living-hub再次depart。不得为了组合测试给玩家新增continue-next。

自查范围为上述会话/恢复/来源接缝，重要反例必须断言语义错误和副作用计数，不能用任意toThrow把类型/导入异常算通过。对“commit前完整验证”和“retrySave不重放”分别做小型语义负控，限定仓库外临时副本；或提供等强度的真实注入反例及明确控制说明，不把启动失败算检出。

需要基线之外路径/修改P/R字段才可完成时，报告具体冲突停止，不通过删旧测试、放宽reader、加通用后门解决。普通实现细节自主修订，不把任务拆成Owner逐函数转发。

## 7. 必跑检查与文档保全

按实际package实跑：

```sh
npm run test:run
# 开工基线完成后，实现/定向测试/修订。
npm run test:run -- src/state/residence-session/supply-session.test.ts src/state/residence-session/supply-initial.test.ts src/state/residence-session/supply-operations.test.ts src/state/residence-session/supply-terminal.test.ts src/state/residence-session/supply-persistence.test.ts src/state/residence-session/supply-reentry.test.ts src/state/residence-session/supply-compatibility.test.ts src/state/residence-session/supply-longchain.integration.test.ts src/state/residence-session/supply-faults.test.ts src/state/residence-session/supply-expected.test.ts
npm run test:run -- src/state/residence-save src/core/residence-supply src/core/residence-task src/core/residence-terminal src/state/residence-session
npm run check
git diff --check
git diff --cached --check
```

允许在上述指定新测试路径内安排用例（未创建的可从定向命令移除并在报告列实跑命令），但不能漏S01—S12。旧P91项、R129项（含F01 22）、原B/C和全部旧测试必须完整保留；测试数量是事实，不是为了凑门槛删/改断言。

本任务必须验证从起点84eb6df到工作区/暂存/最终的全部差异exit0。归档5份本包原件的工作树/索引/最终blob逐字节一致；4份共享文档只末尾追加本次状态，不前插、不倒改原文；所有白名单外跟踪对象与起点相同。配置103键/193叶和原38值保持。

**W01继承方式**：原R输入两份文档七行只读保留。8c19ca0到最终的累计检查保留真实退出码（当前已知exit2），只可有任务第7—9行及旧审查第3—6行七处；此对照不能代替本任务增量exit0。任何第八处、新原件差异或新增警告都不在W01内。不能改.git/config、.gitattributes或阈值。状态写清“增量PASS；累计WITH_APPROVED_W01_ARCHIVE_EXCEPTION”，不要谎报累计干净。

CI、作者本地、主线复核与Owner体验分层。新报告记录每次实跑命令/时间/退出码、失败修订、负控、真实计数及可追溯证据。日志可在仓库外保留并在verification JSON记录路径/摘要；不能超白名单塞日志。

## 8. 范围外和停止点

不修改P/R/G1/旧A/B/C、旧v1/v2或v3格式/expected/测试。旧domain和所有既有生产文件本轮只读；不借“抽取共享逻辑”扩大重构。不得新增规则配置、默认内容、依赖、CI修改或万能SDK。

不做E02活战斗、E03完整路线/玩家安全投影、React/UI、真实浏览器IO、多标签、O3、商城/身体服务、第二真实委托或未来改专长。不得为路线全绿调参或删敌人。本项的headless存储端口测试不代表真实浏览器存储已经接入。

完工前自查，普通commit/push仅新分支。最终消息和completion/verification须包含起始/父/最终SHA与tree、分支、修改文件、范围/保护检查、实际测试基线、新增/替换/删除/净增、S01—S12、四组故障链分项计数、四态冷恢复的独立expected来源、真实未支持、全部check/W01、远端核验及未完成项。final SHA不能写到产生该SHA的同一个文件作为自引用，最终消息报告精确值。

完成后必须停止，等待当前WebGPT主线准确SHA会话及保存故障实审；不自动执行下一项。Owner无需再授权任务书或逐步骤确认。
