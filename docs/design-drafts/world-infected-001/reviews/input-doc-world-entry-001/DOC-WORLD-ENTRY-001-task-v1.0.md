# DOC-WORLD-ENTRY-001：局部规则归档与首工程契约正式收口

> 版本：v1.0；主线下发日期：2026-10-03。
> 类型：已获 Owner 授权的仅文档长任务。不是生产工程任务。
> 工作方式：一次完成读取、归档、局部同步、检查、自查修订、普通提交与推送、交付；不要把内部步骤拆成需要 Owner 逐项批准的小任务。
> 停止点：文档已提交并推送到指定设计分支，等待主线准确 SHA 实文件评审。不自动启动首核心工程。

## 0. 本任务的目标和授权

将 Owner 已批准的 `WORLD-ENTRY-001-owner-review-v1.0.md` 中 A、B 准确落到仓库：A 成为范围限定的正式 DEC；B 成为唯一当前首工程契约。同步必要入口，让后续工程不依赖历史聊天就能判断规则、边界、未完成项和停止点。

本轮不重新设计感染世界，不重开失败重接 A/B 选项，不补经济参数，不实现任何生产模块。首工程契约获批不等于首工程已经获准执行。

| 项目 | 唯一约定 |
| --- | --- |
| 仓库 | `lvlw/elevator-survival` |
| 起始完整 SHA | `ecd8fc33729d385c07ecd9f93b53914b01cdb37a` |
| 唯一允许工作／推送分支 | `feature/design-world-infected-world-001` |
| 下发时远端 main（只读） | `a76e9c1c998051fc1643b6e0c3d53443fa55feed` |
| 批准依据 | 同包 Owner 实际批准记录，以及获批稿件 A／B；C 为来源与局部覆盖定位，D 为本任务范围依据 |
| 正式编号 | **本任务由主线明确指定 `DEC-049`，标题为“新感染委托的身份、单次驻留与终止关闭”** |
| 编号依据 | 主线已核对固定提交的正式 DEC 末条为 DEC-048；该文件 Git blob 为 `0903acc93b75aa55e0b34a8b1177ff00dac7d080`。Codex 开工仍须复核，不自行顺延或再创其他编号 |
| Git 权限 | 允许本任务普通 commit／push 到指定设计分支；禁止 main 写入、merge、rebase、强推及扩展推送范围 |
| 实现状态 | 本轮所有新增生命周期能力均为未实现；旧医院源码、运行入口和保存含义不变 |

Owner 批准原话在 `OWNER-approval-WORLD-ENTRY-001-v1.0.md` 中逐字转录。本任务只把其中“按稿件范围”具体化为以下路径与执行要求，不增加玩法批准。

## 1. 输入包与原件保全

输入包解压目录应位于仓库外，四个文件保持同目录：

1. `DOC-WORLD-ENTRY-001-task-v1.0.md`：本任务书。
2. `WORLD-ENTRY-001-owner-review-v1.0.md`：获批稿原件，必须完整读取。
3. `OWNER-approval-WORLD-ENTRY-001-v1.0.md`：本次实际批准与权限记录。
4. `SHA256SUMS.txt`：前三个文件的 SHA-256，不包含清单自身。

先核对清单；获批稿原件必须为 36532 字节，SHA-256 必须为：

```text
524d9be60709d0a8b9cbff6cdf771253c0761f1dd4e75552767f905c36e420db
```

可使用 `sha256sum -c SHA256SUMS.txt`，或等价 Python 标准库校验。输入缺失、字节不符或只有聊天摘要时，停止写入并说明缺失文件；不能根据旧会话记忆重建获批原件。

完成开工检查后，将四个文件按原字节复制到第 3 节指定输入目录。不格式化、不换行转换、不修改原稿历史状态；本任务书和批准记录也保持原字节。包内清单仅用于输入保全，不宣称证明仓库或全部设计包完整。

不需要重新索取 004 审查 ZIP、旧项目说明或全部历史设计附件；本轮直接采用已获批 A／B 中的两项审查补充，相关原始仓库确认按下面定点查阅。

## 2. 开工检查与最小必要阅读

### 2.1 先确认仓库、本地与远端

在写入或复制输入归档之前执行并记录以下检查，使用实际输出而非上一会话结论：

```bash
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git ls-remote --heads origin refs/heads/feature/design-world-infected-world-001 refs/heads/main
git rev-parse ecd8fc33729d385c07ecd9f93b53914b01cdb37a:docs/05-design-decisions.md
```

确认实际仓库是 `lvlw/elevator-survival`，当前分支及 HEAD 与第 0 节完全一致；普通／cached diff、tracked／untracked 状态均干净，两个远端引用与第 0 节一致。另记录本地 main 引用（不存在则如实记录），结束时验证未改变；不把本地 main 自动假定为远端 main。

可为读取远端执行普通 fetch，但不得 pull、自动换基线、合并或 rebase。基线、分支或工作区异常时，保留现状，报告实际差异与影响后停止；不要 reset、clean、stash、删除、隐藏或带入他人改动。不要在报告中输出含凭据的远端 URL。

若 DEC-049 已被占用、DEC 文件 blob 不匹配，或本任务拟新建路径已有异内容，停止并报告，不自行使用 DEC-050 或覆盖别人的产物。

### 2.2 阅读真实文件

先完整读当前实际 `AGENTS.md`，遵守其及适用子目录指令。按其要求读取：

- `docs/01-game-design-v0.1.md`、`docs/02-vertical-slice.md`、`docs/03-architecture.md`、`docs/05-design-decisions.md`；本轮重点为 DEC-003／006／007／009／010／011／014／023／028／041—048 的相关范围。
- `docs/07-decision-supersession-index.md`、`docs/08-rule-implementation-traceability.md`；相关 Content 定点读取 `docs/content/scenes.md`、`items.md`、`events.md` 的身份、返回与持续边界。旧医院参数和历史含义不能被新版倒写。
- 不做 UI／Interaction／Presentation 设计；凡引用其具体约定，先读 `docs/09-ui-design-record.md` 当前有效约定与相关 UIR，不修改它。

在 `docs/design-drafts/world-infected-001/` 定点读取：

- `01-world-overview.md`、`04-main-mission.md`、`10-decision-queue.md`。
- `readiness/01-current-baseline-and-adoption.md` 至 `04-evidence-and-playtest-gates.md` 四份现有文件。
- `reviews/mission-retry-options-v0.1.md#owner-confirmation-003c` 和 `reviews/endgame-candidates-v1.1.md#owner-confirmation-003d` 的当前确认及必要上下文；003B 推荐 B 是历史，终局文件名 v1.1 不代表正文仍是 v1.1。

只读复核 `src/core/domain/run-identity.ts`、`src/state/command-execution/stable-run-command-execution.ts` 及 `package.json`，用于核对契约所依赖的现有边界与检查脚本，不借此扩大源码盘点或开发。无需重读整个设计历史。

原获批稿 B10 的 npm 基线、生产测试与实现要求是**未来首工程的合同**，不是本次仅文档任务的开工指令。本轮执行第 6 节的文档验收。

阅读后简短反讲本次目标、实际基线、允许范围与停止点，然后继续完成任务；没有实质冲突时，不再请求 Owner 批准普通编辑、链接或检查方法。

## 3. 精确写入白名单

除下列路径外一律只读。允许集合不是要求制造无意义改动；某入口已充分准确可不改，但须在报告说明。

### 3.1 允许局部修改的 12 个现有文件

```text
docs/05-design-decisions.md
docs/07-decision-supersession-index.md
docs/01-game-design-v0.1.md
docs/02-vertical-slice.md
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
docs/design-drafts/world-infected-001/readiness/01-current-baseline-and-adoption.md
docs/design-drafts/world-infected-001/readiness/02-source-gap-and-ownership.md
docs/design-drafts/world-infected-001/readiness/03-first-engineering-contract-draft.md
docs/design-drafts/world-infected-001/readiness/04-evidence-and-playtest-gates.md
```

### 3.2 只允许新建的 6 个交付文件

```text
docs/design-drafts/world-infected-001/reviews/input-doc-world-entry-001/DOC-WORLD-ENTRY-001-task-v1.0.md
docs/design-drafts/world-infected-001/reviews/input-doc-world-entry-001/WORLD-ENTRY-001-owner-review-v1.0.md
docs/design-drafts/world-infected-001/reviews/input-doc-world-entry-001/OWNER-approval-WORLD-ENTRY-001-v1.0.md
docs/design-drafts/world-infected-001/reviews/input-doc-world-entry-001/SHA256SUMS.txt
docs/design-drafts/world-infected-001/reviews/doc-world-entry-001-checks.json
docs/design-drafts/world-infected-001/DOC-WORLD-ENTRY-001-completion.md
```

前四项只复制输入原件；后两项记录本轮真实检查和完成情况。可用仓库外临时文件或内联脚本运行检查，不向仓库新增通用检查框架、脚本依赖或额外设计文档。

### 3.3 明确禁止

不修改 `src/`、`public/`、生产测试、`package.json`、lockfile、构建／类型／测试配置、CI、`AGENTS.md`、UIR、README、医院 Freeze、Content 正文与数值；不注册新 rulesVersion、玩家入口、运行时 schema 或占位模块。

不修改设计目录内其他文件，尤其 `04-main-mission.md`、原始 Owner 确认、004 及更早报告、既有 evidence、历史 Python 脚本／结果／清单。它们仍可作为来源读取；本轮通过白名单内的当前入口标明局部采用关系，不全包刷新历史状态。

不把 ZIP 提交仓库，不复制整个设计目录，不上传或替换 Project Sources，不修改 ChatGPT 项目设置。需要白名单外实质修改时，记录准确路径和原因；不自行扩大范围。

## 4. 正式落文与同步要求

### 4.1 只追加 DEC-049

在 `docs/05-design-decisions.md` 末尾追加：

```text
## DEC-049：新感染委托的身份、单次驻留与终止关闭
```

旧文件内容作为完整前缀保留，DEC-001—048 及其历史正文不删不改。需要导航与覆盖提示，放在新增 DEC、覆盖索引和当前入口，不回头改旧条文原意。

新增条目的状态写明“已确认（局部生命周期规则；实现另行授权，当前未实现）”；批准日期为本次实际确认日期 2026-10-03，归档日期按实际执行日期分别记录，不伪造原始确认时间。链接批准原件和本次授权记录，注明正式编号由本任务明确指定。

**决策正文采用获批稿 A1—A6 全部内容，不漏段、不扩大语义。** 可以调整嵌入 DEC 所必需的标题层级、段落位置与相对链接；不增改正文规则句。A1—A6 只是定位，不是另一套决策编号。

覆盖与保留按获批稿 C2 在本条相关范围表达：

- 当前新连续驻留委托允许同日合法跨图、同一活动执行跨日；局部覆盖旧每日一个主要场景及“每天新探索”对当前新版本的解释，不改旧医院。
- 委托／执行关闭与生还角色延续分开；关闭后不可借换执行 ID、标题、种子、版本或空初态重接；正式返回已经关闭的委托不因旧中枢活动语义重新开放。
- 保留唯一终止、真实履约／合法返回、已发生死亡优先、历史只读、严格恢复与禁止回滚；不用医院 New Run 模拟生还角色接续。
- 具体奖罚、HP／病程公式、日期结算、来源／知识细节、保存格式、跨委托聚合和 UI 都不在 DEC-049 中补定。B5／B6 属于工程合同细化，不另创玩法或通用事件规则。

A5 不应被扩写成完整死亡清算合同。失败 20 及末日先结后召回仍是此前 Owner 已确认方向，不能恢复为待选；但不因本条把 003D 的整套结算、成功 120 或其他参数一起纳入本次正式化。

新增条目须自包含读懂 A 的内容，不能只写“按附件执行”。正式玩法权威仍在 DEC，不以覆盖索引或工程契约替代它。

### 4.2 在既有路径收口唯一首契约

只在下列文件维护当前首工程契约，不另建平行当前契约：

```text
docs/design-drafts/world-infected-001/readiness/03-first-engineering-contract-draft.md
```

文件名保留以维护链接；更新标题／状态，明确：**首工程契约 v1.0 已获 Owner 批准，未实现，生产工程另行授权；整包世界设计仍是 Draft v1.4。**

以获批稿 B1—B10 完整替换旧首项契约正文，保留全部语义段和 K01—K22 验收矩阵。允许嵌入所需的标题层级和相对引用调整，不增加新字段、接口签名、测试参数、功能或验收范围。

保留原“最多四阶段”路线表；第一项的批准状态按本次更新，后三阶段继续只是目标、依赖及门槛，不升级为已批准执行任务。清除与当前 B 相冲突的平行旧首项正文，历史版本从固定提交读取，不在同一页面留下两份都称当前的契约。

必须保留以下关键界限，不能为简短而删去：

- 生命周期资格不是完整合法出发；首次激活与终止是纯转移，不是玩家入口或完整事务提交权。
- 世界、模板、具体委托、角色、执行与版本绑定；缺记录不是从未接取；恢复候选与可信期望绑定分开。
- 窄值严格恢复拒绝未知／缺失字段及交叉组合；合法候选解析不能授权覆盖已有关闭事实；无普通 reset／reopen／replace／任意完成入口。
- 只看到一个自洽值不能证明没有丢弃过去的历史；品牌、冻结或 JSON 解析不是可信恢复来源证明。跨全部委托活动唯一性、可信恢复安装、完整终局事务和真实持久化是后续责任，不可虚报已保证。
- 接收受控协调边界结果，不由 UI 任意设置成功；不校验真实样本、奖罚或 HP，也不提前实现终局协调器。
- 展示订阅与提交后通知只读；体系可在有序、确定性规则编排中提出效果，由唯一入口组合提交。不是多个异步监听器补值，不为首工程建事件总线。
- 旧 RunIdentity、普通 executor、phase、保存与随机含义不变；候选 `src/core/mission-lifecycle/` 不是本轮写权。
- 首工程未来必须重跑真实 npm 基线、完整检查，完成即按准确 SHA 实审，不等待凑三个任务。

### 4.3 六份正式文档的局部同步

| 文件 | 允许且需要达到的结果 |
| --- | --- |
| `05-design-decisions.md` | 按 4.1 追加 DEC-049，明确来源／适用／局部覆盖／未实现 |
| `07-decision-supersession-index.md` | 为 DEC-049 增加范围限定的覆盖与保留导航，不写成其他旧 DEC 整段失效 |
| `01-game-design-v0.1.md` | 在新版身份、每日循环与生命周期相关入口增加范围说明和正式引用；旧医院说明不能被全局换词重写 |
| `02-vertical-slice.md` | 说明旧医院验收不变；新首核心规则／契约已批但工程未授权、未实现；保持三专长等后续验收责任 |
| `03-architecture.md` | 记录 B 的窄所有权、可信输入、统一提交、只读通知和后续聚合责任；标注未实现，不创建玩法 |
| `08-rule-implementation-traceability.md` | 增加“局部规则及契约已批准、未实现”的追踪条目；候选路径标候选，不填已有源码／测试／PASS |

### 4.4 六份设计当前入口的局部同步

| 文件（相对设计目录） | 同步重点 |
| --- | --- |
| `01-world-overview.md` | 增加本次局部正式化入口，区分 DEC-049／首契约获批与整包 Draft，明确停在仅文档提交待审 |
| `10-decision-queue.md` | 仅关闭本次身份／驻留／关闭与首契约的待批项目；保留其他待审；改清“订阅只展示”的适用范围 |
| `readiness/01-current-baseline-and-adoption.md` | 已采纳表及拟覆盖表准确指向 DEC-049 的子集；不能把全部新世界已确认方向都称正式落文完成 |
| `readiness/02-source-gap-and-ownership.md` | 保持原源码盘点的基线与证据身份，补 B5／B6 的工程职责说明；不把历史盘点升级成本轮源码验收 |
| `readiness/03-first-engineering-contract-draft.md` | 按 4.2 成为唯一当前已批准首契约；保留后续路线边界 |
| `readiness/04-evidence-and-playtest-gates.md` | 更新首项准入状态，引用当前契约验收；其他生产／恢复／试玩门槛保持未执行，旧有限证据不重记通过 |

新增状态附记要清楚注明时间与本任务。原文所述 004 自身工作及停止点继续按当时历史解释。其余未修改的 Draft 正文涉及本次子集时，由当前入口指向 DEC-049；不得声称全设计包已经逐文件同步。

### 4.5 状态不得越级

以下不能随本次变成正式数值、已实现或体验通过：奖励 120、身体服务 20／40／80、六商品目录和价格、精力／容量／病程参数、三专长效果、工具箱完整路线、安全感染提示、新保存结构、旧档发布安排、第二真实任务及未来供给。

保留 003C 已选 A、003D 已确认失败条款与先结后召回的原始确认身份；不要重复征询、不改旧原话，也不以尚未整体落文为由否定新方向。只把本次批准的 A 子集正式写入 DEC。

## 5. 自主工作与修订边界

自行决定不改变语义的段落组织、必要导航、相对链接、锚点及检查方法。发现普通引用、排版、遗漏同步或与获批稿不一致，直接在白名单内修复并重验，不把每个文件变成新任务。

可以调用只读辅助审查：一个查来源／覆盖／状态，一个查契约完整性／信任边界。所有写入与 Git 操作由本任务执行者统一负责；辅助审查不拥有规则批准权，也不是主线独立实审。工具不可用时自行交叉检查并如实标注，不虚构 Agent 审查。

新的玩法选择、生命周期变化、兼容承诺、参数批准或必须新增的范围外文件，不自行解决为正式规则。对真正阻塞准确归档的问题停止并报告具体矛盾；无关的后续欠账记录后继续完成本任务。

不要开展新的路线模拟、重复跑历史经济账或撰写完整世界实现任务。不得用新设计方案替换已批准 A／B。

## 6. 必须实际执行的文档验收

### 6.1 检查项目

将实际命令、退出码、检查范围、结果、失败与修复记入 `reviews/doc-world-entry-001-checks.json`；语义对照与解释写入完成报告。不得只写一个总 PASS。

| 检查 | 必须验证的事实 |
| --- | --- |
| 输入原件 | 同包清单全部匹配；归档前后四文件字节相同；获批原稿保持既定 SHA-256 |
| 编号与旧正文 | 基线末条 DEC-048；本轮只新增 DEC-049；旧 DEC 文件全部原字节作为前缀保留；无其他新 DEC |
| A 正文完整性 | A1—A6 每段映射到 DEC-049；只允许标题层级和链接位置等结构调整，正文不增删语义；列逐节对照 |
| B 正文完整性 | B1—B10 及 K01—K22 全部落入唯一当前契约，旧冲突正文不再并列为当前；列逐节对照 |
| 白名单 | 检查相对起始 SHA 的全部改动及新文件，无删除、重命名或白名单外变更；检查未跟踪文件，不仅检查 tracked diff |
| 历史与生产未变 | 所有非白名单路径相对起点无 diff，特别是生产、配置、Content、Freeze、原始确认和既有证据 |
| 文本与链接 | 变更文档严格 UTF-8；新增／变更的本地文件引用与锚点存在；目标符号和相对路径正确；不把只查变更范围说成全仓链接检查 |
| 身份与状态语义 | 只读／受控变更、局部／聚合、规则已批／实现未做、作者／主线／历史证据分开；无全局替换“待审→通过” |
| 范围保留 | A4 新旧适用准确；经济、专长、保存、真实终局及玩家入口未随同批准；后三阶段仍不获执行权 |
| Git 与最终交付 | commit 前检查和准确提交后的 diff 检查均记录；分支、远端、工作区及 main 未变均有实际结果 |

输入原稿的历史状态、代码路径和历史引用不为通过文本检查而改字节。自动工具无法可靠解析的 Markdown 锚点可手工逐项核对，明确自动／人工范围；不能把无法判断写成自动通过。无需引入新依赖，可使用 Git 与 Python／Node 标准能力。

至少执行：

```bash
# 编辑完成后；未跟踪文件由白名单检查另查
git diff --check
git diff --cached --check
git diff --name-status ecd8fc33729d385c07ecd9f93b53914b01cdb37a
git ls-files --others --exclude-standard

# 暂存后；核对本次完整拟提交内容
git diff --cached --check
git diff --cached --name-status ecd8fc33729d385c07ecd9f93b53914b01cdb37a

# 正式提交后；必须对提交里的实际文件再检查
git diff --check ecd8fc33729d385c07ecd9f93b53914b01cdb37a HEAD
git diff --name-status ecd8fc33729d385c07ecd9f93b53914b01cdb37a HEAD
git status --short --untracked-files=all
```

对白名单、UTF-8、链接与正文映射运行实际检查，记录使用的命令／方法和结果。仅有 `git diff --check` 不能证明规则正确或范围完整。新增检查结果文件、完成报告也必须纳入最终路径与文本检查。

### 6.2 不误用测试证据

本轮是文档任务，不要求生产 `npm run test:run` 基线或 `npm run check`，不要求浏览器、真实保存恢复、玩法模拟或 Owner 试玩。未执行分别写 NOT RUN（仅文档／未接线），不能以旧 170 项、27 项或历史 2153 tests 替代。

若实际仓库指令、现有 hook 或 CI 要求额外检查，遵守并记录真实结果，不跳过 hook、不改配置或依赖来获得通过。自然触发的远端 CI 与本地执行分开记录，未核对的 CI 不标通过。

B8 的 K01—K22 是未来工程验收条件，不是本轮新增 22 项生产测试。文档一致性检查也不能改称首核心已通过。

## 7. 提交、推送与停止

在检查与自查修订完成后，把实际修改的白名单文件逐项暂存，不用 `git add .` 或其他覆盖未知范围的暂存方式。确认 staged 内容仅属于本任务且无未处理阻塞。

允许普通 commit，建议提交信息：

```text
docs: formalize mission identity and first-core contract
```

优先一个完整文档提交；若提交后发现本任务内的问题，可以追加修正文档提交再重验。不得循环 amend 写自指 SHA，不改写既有提交历史。

推送前再次读取远端设计分支与 main，确认没有并发变化；存在漂移或拒绝时停止推送并如实报告，不强推、不拉取合并、不自行换基线。只有本任务检查完成、无阻塞且远端满足预期，才执行一次明确分支的普通推送：

```bash
git push origin HEAD:refs/heads/feature/design-world-infected-world-001
```

推送后读取 `git rev-parse HEAD`、`git status --short --untracked-files=all` 及远端两分支引用；核对远端设计分支等于最终完整 SHA、远端 main 仍为起始只读 SHA、本地 main 引用未改变。失败则记录真实退出码和已完成部分，不能写“已推送”。

**禁止 merge、rebase、强推、推 main、推其他分支／标签、开启后续生产开发、注册玩家入口、擅自发布或替换 Project Sources。** 当前仅有该文档任务的 commit／push 权限，不延续到下一项工程。

完成后停止在：

> DOC-WORLD-ENTRY-001 文档已提交，等待主线对最终准确 SHA 的实文件评审；生产工程未授权、未开始。

这里不是 Design Freeze、生产验收或试玩通过。即使作者检查全部通过，也不自行宣布主线实审通过。

## 8. 交付要求

### 8.1 仓库内完成报告

`DOC-WORLD-ENTRY-001-completion.md` 至少包含：

- 目标与实际结果；起始完整 SHA、分支、实际开工本地／远端状态及只读 main。
- 全部变更文件及作用；未改的允许入口说明原因。
- A1—A6 → DEC-049、B1—B10／K01—K22 → 当前契约的完整对照；必要的结构／链接调整说明。
- 语义自查：局部覆盖、无重接旁路、受控终止、严格恢复可信边界、统一提交／通知、历史不倒改及范围未扩。
- 所有实际检查命令／方法、范围、退出码、失败和修复；指向检查 JSON。
- 本轮未运行的生产测试、浏览器、真实存档恢复、历史模型及试玩；作者自查／辅助审查／待主线实审分别记录。
- 规则冲突、未完成项及真正阻塞；无阻塞也须保留后续经济、专长、工具箱、安全查询、保存和体验门槛。
- 越界检查及授权停止点；不声称 Project Sources 已同步。

仓库内报告不可能自包含所在提交的最终 SHA：可以写“最终 SHA 见提交后的交付消息；本文件所属提交可定位本轮交付”，不要填假 SHA，也不要为更新该字段不断 amend。检查 JSON 同样记录其实际检查前态／工作树依据，不伪装为已经运行过未来最终提交。

### 8.2 提交后的最终回复

先给 Owner 一个短摘要，不再要求逐文件处理：

```text
状态：COMPLETE / BLOCKED / PARTIAL（按实际）
任务：DOC-WORLD-ENTRY-001
起始 SHA：<完整值>
最终 SHA：<实际 git rev-parse HEAD 完整值>
分支：feature/design-world-infected-world-001
commit／push：<实际结果；远端匹配与否>
工作区与 main：<实查结果>
交付报告路径：docs/design-drafts/world-infected-001/DOC-WORLD-ENTRY-001-completion.md
检查：<实际执行摘要；未运行项目标 NOT RUN>
阻塞／未完成：<具体情况>
停止：仅文档完成，等待主线准确 SHA 实审；未启动生产开发。
```

再补足提交后实际检查和必要细节。最终 SHA、push 结果、远端核对和提交后检查在这条交付消息准确报告，不需要另造“已实审”文件。Owner 将这条消息交回主线即可；不要求 Owner 手动 commit、push、复制正文进正式文档或自行协调后续工程。
