# ENG-RESIDENCE-SESSION-RESTORE-001（G3）：受控单一状态持有者与窄稳定态恢复

> 任务书 v1.0；日期：2026-10-04。
> **主线依据Owner既有任务下发权限、O2实际批准，以及G1-R1／G2限定实审PASS直接下发。收到完整包后执行，不再申请编制、开工或内部步骤批准。**
> 一个完整工程Goal：详细设计→受控冷候选→严格聚合与codec→唯一owner→故障／重入／组合测试→自查修订→完整检查→文档→普通commit／push。
> 本任务第4—9节明确本Goal工程合同和支持矩阵，不新增DEC、不改变已批准玩法，不直接办理公开存档或发布承诺。

## 1. Goal、依据和停止点

交付一个**没有玩家入口的、可实际进行字符串保存往返及受控状态安装的headless会话核心**。它能够严格恢复本任务支持的首次静态中枢／首份活动委托稳定现场，在唯一当前事实上执行受支持单边移动，并在写入失败时保留已提交内存供下一条命令继续。

本批不只是再写恢复草稿或mock一个保存成功的布尔值；必须实现真实codec、实际G1/G2组合和注入式存储端口。也不为让任务更长而纳入完整终局、战斗、五图、浏览器或角色连续任务内容。

| 项目 | 锁定值 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 起始完整SHA | d7953bbf96dc842d2953e019f950275cd693bf09 |
| 起点根tree | e452251fd6d1f75e058749ffb8d515cecba6c712 |
| 起点来源分支 | feature/residence-location-core-001，只读来源，不在其上交付G3 |
| 新建工程分支 | feature/residence-session-core-001 |
| Git权限 | 只在该新分支普通commit／push，不推其他分支、不merge／rebase／amend／强推 |
| 写入范围 | 第10节最多30条精确路径，不为凑数量创建空文件 |
| 停止点 | 完成提交后，等待主线准确SHA对新owner／保存接缝实审；不自动进入后续Goal |

批准与权威来源：

1. `docs/05-design-decisions.md`的DEC-049／050及仍有效的DEC-006、009、010、011、014、016、045／048局部保留条款。新连续驻留不倒改旧医院；背包计重按DEC-016，不能以较早DEC-015总重量描述否决当前容器分责。
2. `docs/engineering/residence-foundation/runtime-restore-supplement-v1.0.md`是已批准O2恢复／完整事务合同；同目录`energy-cycle-contract-v1.0.md`及原首身份契约保持。
3. `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/OWNER-approval-WORLD-ENTRY-002-ADOPTION-v1.0.md`及同目录获批稿第4.2、5节。O2批准不等于O3旧入口／旧槽发布选择已经作出。
4. 本包G2主线审查报告，锁定d7953bb；G1-R1限定PASS锁定942b2d9。原9bbf5aaa的NEEDS REVISION保留历史，不能倒改为当时通过。
5. `docs/design-drafts/world-infected-001/entry-002/03-next-engineering-goals.md#g3`是阶段导航；具体路径、格式和支持子集以本任务为准，不把历史模型字段与全部后续路线照搬为生产合同。

普通技术组织与白名单内自查修订由Codex自主完成。只有确需改变已批准机制、该支持矩阵或白名单之外文件时才停报具体冲突；不要把可自行解决的字段组织或测试安排交给Owner逐项指挥。

## 2. 接手、分支、真实基线

继续完成G2的Codex工程会话，重新读取实际状态和源码，不沿用上轮推断。完整阅读实际根／适用嵌套AGENTS及其要求的GDD、Slice、Architecture、DEC、相关Content。玩家查询复用现有G2安全投影，不制定新UIR或UI；必要时读取UIR现有信息边界。

先记录下列命令的实际输出及退出码：

```text
git rev-parse --show-toplevel
git remote -v
git rev-parse HEAD
git branch --show-current
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git worktree list --porcelain
git ls-remote --heads origin refs/heads/main refs/heads/feature/design-world-entry-002 refs/heads/feature/design-world-infected-world-001 refs/heads/feature/mission-lifecycle-core-001 refs/heads/feature/residence-energy-cycle-core-001 refs/heads/feature/residence-location-core-001 refs/heads/feature/residence-session-core-001
```

核对起点存在、来源对象、目标目录和新分支无冲突、没有他人未提交改动。由你从指定SHA建立新工程分支，不要求Owner操作Git；不从main或设计分支开始。重复收到同一任务时识别自己的已授权进度，不重建、reset或丢弃成果；无法解释的漂移先报告。

**任何生产写入之前，实际执行`npm run test:run`建立本轮基线并保存原始日志。** G2的115文件／2540项只是前次记录，不能预填为本轮成绩。依赖齐备不安装；确需恢复只按现有lockfile执行`npm ci`，不升级、不audit fix、不改锁文件、环境配置或检查阈值。

关机、重启、定时任务不在本工程权限内，不沿用上轮关机安排。不要读取或收集凭据、私人文件或无关环境数据。

## 3. 定点源码阅读

在implementation-notes中记录实际读取的入口、复用符号及未复用原因，不以文件清单冒充执行结果。

| 实际入口 | 本轮责任 |
| --- | --- |
| `src/core/mission-lifecycle/{index,controlled,validation,types}.ts`与原测试 | 保留原严格restore；仅在受控入口新增冷候选包装，不让候选自证现存历史 |
| `src/core/character-cycle/`、`residence-energy/`、`residence-config/`及G1测试 | 复用唯一身体、周期、配置、修订及view边界；不改G1，不重写其算法 |
| `src/core/residence-location/`全部公开／受控入口、支持文档与测试 | 复用G2真实移动、实例／知识／现场验证和签发计划；没有install权的候选不能直接变成Store |
| `src/content/infected-residence-core-v0.1/config.ts`与批准JSON | 唯一34叶运行时参数继续使用，不产生第二常量源、不注册新真实规则版本 |
| `src/state/run-store/`、`src/state/run-save/`、`src/app/production-bootstrap.ts`与相关测试 | 理解既有私有状态和错误分层；不得修改旧医院入口、旧codec、槽或registry；不能照抄会改变通知顺序的实现 |
| `src/core/quick-slot/`、`inventory/`、`item-state/` | fresh-hub也要验证真实容器、唯一实例与ItemState，不能用空对象掩盖缺失 |
| `package.json`、`scripts/validate-architecture.mjs`、`.github/workflows/ci.yml` | 按真实脚本建立验收；只读，不为本任务改规则、统计或依赖 |

新state层可使用已有`zustand/vanilla`私有store或一个同等窄的私有状态持有实现；不得换栈、暴露setState或另建通用状态框架。core仍不依赖state/content/React/IO。

## 4. 本Goal的支持矩阵（开发期子集，不是玩法规则）

### 4.1 必须支持的完整稳定态

| 状态 | 精确条件 | 本批可做什么 |
| --- | --- | --- |
| fresh-hub | 真正首次角色周期D1、G1 first-ready、HP>0；受控声明全集每份恰有一个unaccepted事实，无active／closed，无现场或执行；真实携带容器和ItemState齐全 | 从成功读取null后显式首次创建；合法已存字符串冷恢复；只读状态／安全查询与保存故障处理；不提供launch |
| active-world | 受控声明全集恰一active，其余明确unaccepted，无既往closed历史；首执行startCycle=1，D=T且T在1—7；HP>0；完整G2现场和携带物一致、pending=none，没有未完成战斗／立即结果 | 合法已有活动存档冷恢复；owner内部生成并提交受支持非战斗单边移动；读取安全知识；序列化往返 |

多个声明仅用于显式隔离测试，测试不注册为第二份玩家委托。首次创建工厂不任意挑选任务或生成活动现场；活动测试输入应由真实mission激活、G1及G2受控API生成后编码，不能给会话增加测试专用`setCurrent`旁路。

这两个状态共享一份角色身体、周期及revision；不要为了root方便再复制一份同名可写身体。active-world可直接包含一个G2快照；fresh-hub的携带物也应复用同一实际容器类型，不建立完整仓库或Profile。

### 4.2 明确拒绝而不是伪支持

本批整档安装不支持：任一已关闭历史的角色（包括生还return-due／deadline-ready）、死亡角色、战斗稳定决策点、pending立即后果、终局半结状态、第二份委托的活动历史、旧医院格式、未知内容／规则／格式版本。

**有closed事实时不能删掉它再称“无历史”，也不能把缺失记录补成unaccepted。** 新增窄冷解析函数须保留正确closed值及结果，聚合层再明确返回未支持；不篡改原事实。对两个active、跨身份、重复runId等不一致值应拒绝，不能仅以“暂不支持”掩盖已支持字段的非法组合。

限定无既往关闭历史，是本次headless最小支持矩阵，由本任务明确收口，**不是改成角色只能玩一次、禁止以后保存生还中枢或删除关闭历史**。完整关闭历史／ready的可信安装、角色接续、稳定战斗存档及死亡事务都有后续必补责任，contract-and-support及完成报告必须保留为OPEN。

正常返回、截止、休整、来源揭示、pickup/drop等既有G1/G2纯能力不删；它们只是本次session命令未接入。G3对未支持阶段严格拒绝，不意味着这些玩法不合法，更不允许接产品入口后利用拒绝逃避实际已发生后果。

## 5. 冷解析、配置来源与整档严格验证

### 5.1 新增受控冷候选，不放宽原restore

在`src/core/mission-lifecycle/controlled.ts`新增：

```text
parseMissionColdCandidate(raw, expectedBinding, scope)
```

具体TypeScript返回类型可内联推导，返回带明确cold-candidate标签的不可变窄候选，不安装、不初始化、不发奖。`expectedBinding`来自独立受控根角色和该scope中的明确声明，不从raw.binding复制；可复用现有`readValue`作严格形状、格式、声明和执行检查，不需要修改原validation或类型文件。

保留原`restoreMissionCandidate(raw, expected, scope)`完整含义与公开面，expected不得改可选，不修改／删减原103项身份核心测试。原controlled四个函数逻辑／正文保持；仅新增所需导入与一个冷候选入口，普通index不转出口。

冷启动没有现存内存历史：新冷候选证明格式、绑定与内部一致性，不证明这就是最新历史。已有current必须走owner禁止二次bootstrap／replace的边界，不能把“冷”当作任意旧态覆盖许可。测试应分别证明独立expected保留和新冷候选职责，不把二者说成同一个恢复保证。

### 5.2 本批技术格式（未公开的开发格式）

本任务明确新codec识别符为：

```json
{"format":"elevator-survival.residence-headless","formatVersion":1,"state":"<严格状态union的对象，不是此占位字符串>"}
```

该三字段根结构固定；state中的`phase`使用`fresh-hub`或`active-world`，详细字段由Codex在实现前设计并记录。不得把示例占位字符串作为运行时合法值。标识仅属于本Goal开发期headless codec，不加入旧RUN_SAVE_FORMAT_VERSION、旧registry、真实浏览器槽或产品rulesVersion，不承诺公开兼容或O3安排。

单独区分输入：没有读取到存档（存储返回null）、字符串不是JSON、JSON值为null／空对象／形状错误、未知format/version、未知规则/配置/catalog、已知但未支持阶段、读存储异常。损坏或不兼容不得转换为null，不自动clear、补字段、升级或new。

### 5.3 内容来源和整体验证顺序

受控composition在创建owner时提供只读的内容／规则策略，包含唯一G1配置、允许的rulesVersion、完整MissionDeclaration集合、G2 catalog及首次创建工厂。它们不能来自玩家命令或原始存档的可编辑目录。G3不建立新的通用内容注册系统。

冷读取时根角色ID可以来自严格解析后的存档根身份，它是待验证的身份值而非“当前历史证明”；其他嵌套角色必须与它一致。声明全集、允许规则／配置／catalog版本从独立受控策略取得，再建立与根角色绑定的scope。不能用raw.missions作为声明目录，不能用`lookup = () => true`放过未知版本，也不能要求真实冷启动凭空提供一个不存在的内存快照。

至少依次完成：严格根格式／phase→严格根身份及受控版本选择→完整声明集合与每份事实→执行与角色绑定、active数量、执行ID唯一→状态矩阵与D/start/T→完整G1身体、额度与数值→G2位置／现场／知识／来源／敌人／物品跨引用→稳定支持条件→完整不可变候选。

既有G1/G2校验所需的只读authority，在冷解析中可由**已核对的多处关联事实与独立内容策略**形成一致性投影；它不被称作已有current的独立期望。不能仅复制候选的status/binding后调用原restore，跳过上述整体验证，再宣称关闭／历史已受保护。进入ready以后authority必须取自owner唯一current，而不是命令传来的快照。

fresh-hub必须验证所有原始容器键、实际物品／ItemState、重复ID、数量、几何和携带边界。active-world复用G2严格校验，所有实体和状态只有一份；不得为了通过恢复把source已兑现当作另一份库存、丢掉地面状态或重建敌人。游标与来源标记及实体明显矛盾的受支持输入应明确拒绝；不要使用随机抽取来“修复”候选。

格式完整性、值合法性和内存新鲜度是不同责任。不得声称Object.freeze、签发句柄或本地revision能够证明整份离线旧档未被替换；本Goal没有服务器可信历史、签名或跨标签锁。

## 6. 唯一owner与bootstrap／创建状态机

### 6.1 一应用实例一个受控写者

owner构造在`src/state/residence-session/controlled.ts`中；普通会话只提供本任务允许的读取、bootstrap、显式首次创建及move请求入口。名称可在该边界内自定。不得公开`replace`、`loadRaw`、`setState`、`installCandidate`、任意initialState或提交外部LocationPlan的方法。

composition持有一个明确的会话域句柄，已成功认领的域不能再创建第二个writer；以相同域反复调用工厂必须在IO之前拒绝或返回同一个owner，选定一种并测试。域／句柄不由命令传入，不用一个可重建空对象的普通字段当“没有旧状态”的证明。测试冷启动新实例时用明确的新应用域与保存字符串副本，不能冒称这证明了跨标签互斥。

这个小型认领机制只限定单应用composition，不能推广为所有物理存储对象或浏览器标签的全局保证；不增加通用事件总线、全局Profile、跨世界供给或长期可写历史账。

### 6.2 必须具备的状态转换

| 当前状态／事件 | 允许结果 | 禁止 |
| --- | --- | --- |
| 尚未bootstrap → read成功null | 明确no-save，只建立首次创建前提，不造角色 | 自动建立角色或活动委托 |
| 尚未bootstrap → 合法受支持字符串 | 完整解析／验证后一次安装ready；不增玩法revision、不再保存、不重新建立现场 | 先装身体后补现场、先清来源再load |
| 尚未bootstrap → read异常 | read-error、无current、不可create | 视为no-save或删除槽 |
| 尚未bootstrap → 损坏／未知／未支持 | 分别保留错误状态和诊断，无current、不可create | load失败兜底new、丢字段后继续 |
| no-save → 显式create-first | 调受控首次工厂一次，验证完整fresh-hub后一次建立current并尝试保存 | 请求传完整身体／mission初态，或把已有存档当无档 |
| ready → bootstrap/create-first/replace类意图 | 拒绝；不再read、不生成新角色、不改变current | 首次或后续write失败后再次bootstrap旧槽 |
| ready → 合法move | 仅按第7节的完整顺序提交 | 导入调用方快照、传alreadyValid或外部plan |

bootstrap／factory／write／notify可能调用测试回调；进入它们之前就要有busy门禁。任何重入bootstrap/create/dispatch必须被拒绝，不再递归read或消耗第二份规则结果。只读查询可读取当前完整状态，不触发规则。

读异常后的显式retry-read可作为窄控制操作实现，但仅限尚无current且原错误为read-error；它不授予create，必须再次真实读取null才建立无档前提。损坏／未知档没有自动清理或新建出口。本Goal不需实现错误文件导出／删除界面。

首次创建revision可定义为0，因为没有前一玩法状态；在实现记录固定并测试，之后每个被接受的状态变更仅+1。首次工厂不使用时间、UUID或Math.random生成规则身份；测试身份／种子明确注入，新的真实玩家生成入口不在本Goal。

## 7. 唯一命令路径与提交顺序

### 7.1 本批仅接单边move

会话请求只表达`move`、目标edgeId、expectedRevision及最小必要身份绑定，不接受源快照、费用、效果、权限布尔、nextState或多边队列。所有G1/G2受控依赖在composition时绑定，不能从请求换掉。

owner使用唯一current构造G1/G2authority、调用真实G2`planResidenceMove`并验证签发计划仍属于当前完整前态。G2计划生成前后的身份／执行／catalog／revision要一致，后态恰为前态修订+1。只发生一次完整内存提交，不能身体一次、位置一次。

headless接口拒绝本批未支持的reveal/pickup/drop/rest/launch/close/combat/medical等会话命令；它们的G1/G2既有API和测试保持不变。查看走只读投影，不能把view转成noop计划或触发保存。

### 7.2 未支持效果是能力门禁，不篡改玩法

本批只消费可完整结束为生还、非战斗稳定节点的单边结果。受控目录明确的到达损血／暴露事件、活敌遭遇／pending、死亡或其他需后续协调的结果不在本批提交范围。资格必须来自真实catalog／current／G2结果，不接受`business_supported=true`之类调用方承诺。

对目录已声明的未支持到达事件先检查；其余以真实纯计划的`coordination`和完整后态检查把关。`stable-local-result`不是无需进一步验证的万能批准标志。既有G1普通行动流血可完整计算且生还时，允许按原规则提交；若会合法致死则该headless消费路径明确报未支持终局、零提交，不能忽略流血或先移动后拒绝。

拒绝不得安装位置／E、改变来源／游标、调用save或玩法notify。G2纯函数产生一个尚未提交的死亡／遭遇提案不等于真实应用已发生结果；这只在未开放玩家入口的支持隔离下成立，**不能移植为以后玩家规避合法死亡的机制**。

### 7.3 执行次序

```text
busy／已有current／请求严格结构与修订检查
 → 从唯一current和受控目录检查合法性、支持能力
 → G2真实纯计划（内部复用G1）
 → 校验签发计划／前态新鲜度／全部聚合后态与支持阶段
 → 预先生成已验证后态的保存字符串（不得提交后才发现无法编码）
 → 一次内存commit，revision只增加一次
 → storage.write一次尝试
 → 一次只读状态通知分发；保存失败单独记录
 → 返回committed及保存状态／通知异常信息，释放busy
```

合法查询、被拒绝意图以及未支持结果没有commit/save/玩法notify。读取错误／保存错误属于控制状态，不伪装成玩法结果或第二次角色revision；控制状态如有独立通知必须分开计数及说明，不能用它掩盖重复提交。

## 8. 存储、错误与订阅合同

存储只使用注入同步端口：`read(): string | null`、`write(serialized: string): void`。测试用内存、故障和重入端口，确实经过serialize→write→read→parse；不调用localStorage、文件系统、浏览器API，不实现真实槽适配器。端口异常与JSON/规则拒绝分别归类，不吞异常后默认成功。

写入失败发生在完整内存commit之后：owner保持ready和最新内存，标出save-failed；下一个合法命令从最新revision／位置／身体继续，不能reload旧字符串、重放上一意图、回滚、建立另一个store或重新发物。首次create的write失败同样不得回到no-save。

可以提供显式retry-save作为本Goal保存故障恢复的一部分；只重新编码／保存**当前**完整状态，不重新计算玩法、不增revision、不重发玩法notify，不接收旧字符串／旧计划参数。重试失败继续保留最新内存。下一次真实变更写入最新完整后态也可解除save-failed；不得开启异步后台定时重试。

订阅只读，回调在完整commit和保存尝试之后调用；一个listener抛错不撤销commit、不重跑效果、不阻断其他合法listener。回调尝试dispatch/create/bootstrap/retry-save按busy拒绝。回调可读到最新完整后态，不能修改返回的冻结快照或内部状态。

订阅注册／取消本身不产生玩法revision或保存；是否即时给初值须明确为纯读取，不能记成提交通知。公开诊断getState如暴露内部快照，应明确是headless/协调读取，不是player-safe；面向玩家的查询复用G2白名单投影，严禁把含seed的内部实例ID／完整raw错误对象直接作为玩家提示。

所有输入严格验证、输出不可变；可变调用方对象不能被意外冻结或修改。输出／接口遵守既有错误风格，已提交但save-failed不得抛成“命令完全没有执行”，导致上游重发。

## 9. 原生验收与逆向自查（本批一起完成）

以下是最低覆盖，不预设测试数量。测试使用真实G1、G2、mission核心及新codec/session；不得mock核心守卫、内部状态或JSON解析来凑PASS。只mock注入式IO、观察调用次数和明确故障；测试夹具不得由生产index导出。

| 组 | 原生正反例及组合 |
| --- | --- |
| S01 冷候选 | 未接／活动／四种closed结果分别严格解析并保持绑定；expectedBinding来自受控声明；交叉角色、world/template/commission/rules/contract、执行、缺多字段和坏值拒绝；原restore独立expected及K18/K19完整回归 |
| S02 根与版本 | 成功read-null不同于字符串null、{}、坏JSON、旧医院格式、错formatVersion、未知rules/config/catalog；各自错误不自动new或clear，无安装／保存 |
| S03 聚合 | 声明全集每项恰一事实；缺／多／重复／交叉绑定、两active、复用run、phase/body/D/T/site不符、重复实体／缺ItemState／pending矛盾均拒绝；closed不删成unaccepted |
| S04 支持矩阵 | fresh-hub和首active稳定态真实往返；活着closed-hub/dead/combat/历史接续明确未支持；正确closed窄候选不是可安装全档，不把拒绝当已实现终局保存 |
| S05 首次建立 | read-null后显式create一次；无bootstrap、read-error、坏档、已有current及重复create拒绝；工厂异常／非法后态零安装；create write失败仍ready，不能再造角色 |
| S06 一次bootstrap | 成功load一次安装，原revision和来源／现场／装备状态保持，不resave；ready后第二bootstrap不read；同域第二writer不能建立；读回调重入被挡，前置read-error显式重试不等同create |
| S07 真移动事务 | 真实G2相邻已知边、E1最后一动／E0下一动、一次流血、一次revision；至少三步连续命令，快照与字符串都完整；负数／过期／错绑定／view／多边／传plan旁路零提交 |
| S08 能力隔离 | 到达损血／暴露事件、遭遇活敌、pending、致死流血等未支持结果拒绝；位置/E/mission/source/cursor、write/notify次数不变，不用安全夹具掩盖危险目录 |
| S09 保存故障 | 首次创建和后续移动write抛错；完整内存保留，后续命令读取新态；旧请求不重复执行；retry-save保存当前而非旧态且无玩法revision／notify；不reload或重建 |
| S10 只读／重入 | 查询／注册订阅不提交；write和notify回调重入dispatch/bootstrap/create拒绝；listener抛错不影响已提交态及其他listener，不重播规则；传入/返回可变冻结边界验证 |
| S11 一致往返 | 用真实G2生成揭示／迁移／跨夜后的首active稳定夹具，经字符串IO冷恢复；保留claim、cursor、ground实例、ItemState、知识、敌伤／意图；不是手填相同qty或mock对象相等 |
| S12 历史与保护 | active当前变化后旧字符串／合法旧候选也不能replace；含closed档无法安装或兜底new；无任意install接口；原首核心103、G1五文件169、G2五文件115及旧全量测试保持；完整npm check与Git对象保护 |

S12的旧档保护限定**当前owner内**。本Goal不支持安装closed历史，因此不能把S12描述成“已完成生还关闭角色全流程恢复及防回滚”；该业务验收必须在后续真实支持阶段补齐。不要通过公开测试专用setter构造一个产品本来不能建立的current来声称已实现。

至少保留一条带准确计数的故障序列：冷恢复active r→move提交r+1/write失败→查询读取r+1→再次move提交r+2→旧r请求拒绝→显式保存重试不变r+2。分别记录内存提交、规则执行、read、write和通知分发次数；重入／回调错误不能增加玩法执行次数。

实现后在本批逆向检查：候选来源是否伪独立、无档前提是否由请求自报、closed是否被丢弃、第二bootstrap是否绕过current、多个owner是否竞争同域、订阅是否提前写值、编码是否太晚、保存失败是否导致回滚／重放、未知支持结果是否被假装安全。普通白名单问题直接修复；保留先失败后通过的记录。可用只读专项助手，根会话唯一写者和Git执行者，不递归扩任务。

## 10. 精确路径白名单（最多30条）

### A. 首身份受控入口的限定增量与新测试（2条）

```text
src/core/mission-lifecycle/controlled.ts
src/core/mission-lifecycle/cold-candidate.test.ts
```

controlled.ts仅新增上述冷候选函数及必要导入，不更改原四个函数。原index/types/validation/mission-lifecycle.test.ts均只读；不以补冷入口为由重构首核心。

### B. 新codec／严格聚合模块（6条）

```text
src/state/residence-save/types.ts
src/state/residence-save/validation.ts
src/state/residence-save/codec.ts
src/state/residence-save/index.ts
src/state/residence-save/residence-save.test.ts
src/state/residence-save/aggregate.test.ts
```

### C. 新会话owner与原生测试（9条）

```text
src/state/residence-session/types.ts
src/state/residence-session/commands.ts
src/state/residence-session/session.ts
src/state/residence-session/controlled.ts
src/state/residence-session/index.ts
src/state/residence-session/session.test.ts
src/state/residence-session/persistence.test.ts
src/state/residence-session/session.integration.test.ts
src/state/residence-session/test-fixtures.ts
```

生产不能import test-fixtures或G2的test-fixtures；仅测试可以复用已存在的真实G2测试夹具。公开面不暴露测试装态、任意effect、rawreplace；具体API命名及文件内拆分可在上述路径内自行组织。

### D. 本批交付文档（4条）

```text
docs/engineering/residence-foundation/g3/contract-and-support.md
docs/engineering/residence-foundation/g3/implementation-notes.md
docs/engineering/residence-foundation/g3/verification-results.json
docs/engineering/residence-foundation/g3/completion.md
```

中文正文，保留正式术语。contract-and-support记录实际支持／拒绝矩阵、状态机、API、错误分类和后续验收；implementation-notes先写设计再追加实现／12组真实测试名映射；验证JSON保留基线、实际命令和每次失败／修订，不用历史数量填成绩。

### E. 五输入原字节归档（5条）

```text
docs/engineering/residence-foundation/g3/inputs/ENG-RESIDENCE-SESSION-RESTORE-001-task-v1.0.md
docs/engineering/residence-foundation/g3/inputs/OWNER-authority-and-scope-G3-v1.0.md
docs/engineering/residence-foundation/g3/inputs/AUD-d7953bb-ENG-RESIDENCE-LOCATION-001-review-v1.0.md
docs/engineering/residence-foundation/g3/inputs/BASELINE-AND-INPUTS.json
docs/engineering/residence-foundation/g3/inputs/SHA256SUMS.txt
```

复制五件本包原件，不改历史状态或任务正文；SHA清单自身用原字节比较，不要求它自引用哈希。除本包外不重复搬运整库、旧ZIP或无关日志。

### F. 四份既有文档仅末尾追加（4条）

```text
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
```

追加本次G2实审PASS来源和G3实际实施／待实审状态及OPEN责任，旧字节完整前缀保留。不要把“headless两个稳定态”写成完整保存或UI已经通过。

其他一切路径只读，尤其G1/G2源码、全部旧测试、DEC和已批准合同、34叶配置、AGENTS、package/lockfile、scripts、CI、旧state/save/app/UI、真实content注册及浏览器槽。无新依赖、无G2修订、无通用SDK或事件总线。

## 11. 最终检查、Git交付与报告

真实执行定向新增测试及原身份/G1/G2回归，完成实际`npm run check`，按当前package.json覆盖architecture、typecheck、全量test和build。记录原始stdout、退出码、测试文件／展开用例数、净增及失败修订；定向与全量重复运行不累计新增测试。新codec字符串端口测试与真实浏览器IO分开，后者仍NOT RUN。

提交前逐项核对：所有改动都在30条白名单；五输入原件大小／SHA256／Git blob匹配；四原文档完整前缀保持；首身份原四函数保持；其余基线Git对象保持；G1/G2和批准参数原字节不变；新增相对链接真实有效；UTF-8/LF无BOM和新增行尾空白；测试过的源码与暂存／最终提交一致；普通、cached及本任务基线diff --check全部真实执行。

既有历史CRLF工作树差异必须区分原Git对象与checkout编码，不能把规范化副本谎称原字节。不得为了完整归档改原件，也不得修改空白规则、git attributes、hooks或使用--no-verify。无本轮新增空白例外；本包已预检，新异常应定位报告。

只显式暂存本任务修改路径，不`git add .`夹带其他成果。在目标分支一次普通commit，建议message：`feat: add controlled residence session and headless restore`；普通push `origin HEAD:refs/heads/feature/residence-session-core-001`。不为完成报告自引用SHA而amend；最终SHA与push回执在提交后消息提供。

若网络失败，可在保持原提交与配置的前提下重试普通push最多两次，随后以ls-remote确认。无法确认则如实REMOTE UNCONFIRMED，可在仓库外输出脱敏的离线审查包（最终受影响文件、基线、patch、Git对象及哈希），不通过关闭SSL、改remote/代理/证书/凭据或强推绕过。已推送成功不重复创建提交。

完成报告必须包含：

- 起始／最终完整SHA、父提交、新分支、commit/push结果与远端参照；本地实际工作区、普通／暂存diff。
- 四包交付结果：冷候选／codec与聚合／唯一会话及事务／原生测试与文档；实际修改文件与12组验收API/测试名。
- 本轮真实测试基线、定向、最终check、新增用例数；编译／测试首次失败与修订；作者／只读助手／主线实审分开。
- 两支持阶段、全部未支持阶段和真实IO范围；保存失败与重入计数见证；不声称closed历史、CTB、多标签或绝对防回滚已完成。
- 原件／保护对象／参数／编码链接与diff核对、发现冲突、未完成及越界检查、授权停止点。

结束在“等待WebGPT主线准确SHA对G3源码／headless恢复实审”。不自动新建后续Goal、不改Project Sources或ChatGPT项目配置；不因本批收口而关闭经济、三专长、工具箱、完整终局／战斗保存、O3或Owner试玩责任。
