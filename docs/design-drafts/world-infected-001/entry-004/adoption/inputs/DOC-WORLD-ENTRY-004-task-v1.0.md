# DOC-WORLD-ENTRY-004：真实五图、战斗药食与来源契约集中正式归档

任务书v1.0；日期2026-10-05。**由WebGPT主线依据Owner已实际采纳WORLD-ENTRY-004-ADOPTION v1.0及既有任务下发权限下发，无需再次申请开工或逐步骤确认。**

本次只做文档：原件归档、唯一DEC-052追加、103键试用配置与限定内容、来源恢复合同、首生产者契约与批次门槛、状态同步、自查修订、检查、普通commit／push和报告。不是E01/E02/E03开工包。

## 0. Owner此刻的操作与附件处理

Owner将本ZIP直接附给刚完成WORLD-ENTRY-004-R1的同一个Codex设计会话；不要求Owner解压、填写绝对路径、手动复制文件或建分支。由你定位附件，在仓库外临时目录解压并核对，保持原包不变。ZIP不可读时报告确切附件问题，不从历史聊天拼出替代任务。

本包是一个集中任务，W1—W4在范围内一次完成；普通链接、状态附记和检查脚本操作自行处理，不拆为Owner逐文件转发。只读辅助审查允许，根会话独占实际写入和Git操作；不得将同一作者自查包装为主线独立验收。

## 1. 精确起点、引用和权限

| 对象 | 本次锁定 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 起始SHA | 612ac6673223cc93237184892e6713e789a9dce1 |
| 父SHA | 0362460b259cba6ea160e79ad04a6cb14181cef0 |
| root tree | b4a24ed36d181bb86fdd26c0339fe765c933255b |
| src tree | 98c840dd0b6b1a6cc014df4ac9165bc94bf2c794 |
| 分支 | feature/design-world-entry-004，沿用，不新建分支／worktree |
| 旧DEC最大编号／本次唯一追加 | 051／052 |
| 可改路径 | §5及BASELINE-AND-INPUTS.json相同的44条精确文档路径 |
| commit／push | 允许本任务普通commit和同名分支普通push |
| 停止 | 最终准确SHA文档实审；不自动进入E01-P或其余工程 |

重新实查本地HEAD、branch、origin、status、普通／cached diff、worktree和远端refs；主线没有读取Owner本地磁盘。远端参照13项在BASELINE中列明，本项只能更新目标分支，其他12项不由本任务改变。

```text
git rev-parse --show-toplevel
git remote -v
git rev-parse HEAD
git rev-parse HEAD^{tree}
git branch --show-current
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git worktree list --porcelain
git ls-remote --heads origin
```

可普通fetch读取已知对象；干净且必要时可切到指定现有分支，不移动其他分支。HEAD和目标远端须符合起点；有他人改动、来源缺失、路径已占用或引用漂移，先报具体冲突，不自动merge/rebase、reset、clean或覆盖。

不合并、不推main／其他分支、不强推、不amend／改历史、不绕过hooks、不改Git remote、代理、SSL、凭据或依赖。任务不主动安排关机／重启／定时操作，也不覆盖Owner在Codex另行明确下达的当次电源指令。

## 2. 原件、正式载荷与阅读

包内13件：根目录7件和approved-documents六件；SHA256SUMS覆盖其余12件，不自哈希。全部13件按相同相对路径归档到entry-004/adoption/inputs；不归档ZIP本身，不重复搬入前置审查大包。

先核对摘要、获批稿、Owner实际批准、R1实审及本任务、BASELINE和六份确定载荷。**获批稿及审查原件内的“待采纳／不授权归档”保留当时字节，以随后实际批准和本任务更新当前状态，不能改原件来消除历史措辞。**主线未声称Owner逐字起草了确定技术正文。

按照当前实际AGENTS及嵌套规则，读取GDD、Slice、Architecture、DEC和相关Content。固定基线必要阅读：

- DEC-049/050/051及新世界相关物品／装备／战斗／医疗来源；07仅辅助定位。
- entry-004/00—07、content-candidate.json、parameter-candidate.json及R1完成记录／验证边界。模型、fixtures、freeze和checks只作历史证据，不修改／重跑它们。
- 原地点、任务、资源、事件、专长、readiness；遇普通细节先查原文，不用Owner重复解释已确认方向。
- A/B正式合同、runtime-restore-supplement、E01候选及C实际支持；只读核对G1步骤、G2来源／任务限制、A新来源死亡接缝、B整输出和C九命令。
- 现有items文档及相关源码，明确quickEligible不等于战斗用药资格、样本谨慎／直接两个方案，不能把有限模型子集倒当新玩法限制。
- package.json与scripts/validate-architecture.mjs。仅为后续安全查询／UI门槛作引用时读取UIR当前约定，不新增UIR、不设计界面或统一弹窗。

发现确定载荷与实际批准／正式规则有实质矛盾时，停相关归档并报具体行、来源和影响；不得自行选更宽解释或改生产代码。链接／排版问题按本文保全约束解决，不能擅改六份载荷字节。

## 3. 四包一次完成

| 工作包 | 本次交付 | 禁止扩大 |
| --- | --- | --- |
| W1 | 13份输入原字节、实际批准导航、基线与来源核对 | 不替换Project Sources、不把候选确认文字冒作批准 |
| W2 | DEC-052精确追加、唯一103键配置和内容数据 | 不改旧001—051／38值、不增加H2固定消毒、不调参 |
| W3 | 来源恢复合同、E01-P纯核心首契约、E01→E02→E03及内部停审门槛 | 不创建源码占位、不注册v3／玩家rulesVersion、不自动执行工程 |
| W4 | 指定23份入口同步、自查修订、文档／架构／diff／范围核验、commit／push及报告 | 不把作者或历史验证计作本轮新增生产测试 |

## 4. 唯一正式目标和字节规则

### 4.1 DEC-052

基线docs/05-design-decisions.md完整blob必须为`c739151493cd8b5e46e03d25008ea0fb128c3e14`。新文件必须严格等于：

```text
Git基线DEC原字节 + b"\n\n" + approved-documents/DEC-052-append.md原字节
```

原001—051不strip、不重编码、不格式化；保留旧“排除／未实现”历史。只新增052，含D01—D12局部条款。不把本任务当新增其他DEC编号权限。

### 4.2 五份整文件载荷

| 包内approved-documents文件 | 唯一正式目标 |
| --- | --- |
| infected-world-entry-test-config-v0.1.json | docs/content/infected-world-entry-test-config-v0.1.json |
| infected-world-entry-content-v0.1.json | docs/content/infected-world-entry-content-v0.1.json |
| content-supply-core-contract-v1.0.md | docs/engineering/residence-foundation/content-supply-core-contract-v1.0.md |
| content-supply-restore-contract-v1.0.md | docs/engineering/residence-foundation/content-supply-restore-contract-v1.0.md |
| world-content-batch-plan-v1.0.md | docs/engineering/residence-foundation/world-content-batch-plan-v1.0.md |

各目标逐字节复制对应载荷；inputs只是不可变原件，不是另一份可编辑的当前参数。正文相对链接按正式目标编写，**归档原件内的相对链接应在其正式目标上下文核验**，不要因inputs内不能直接点击而修改原件。原获批稿／前置审查保留各自历史或包内相对上下文，不假造仓库落点。

配置严格取锁定参数源的104个draft键中的103个value，排除grant.H2-random；数值叶193，原数组次序和结构不变。新配置只引用原两配置的38值，不复制其数值。主线已核对完整参数源Git blob，Codex仍须从本地固定Git对象独立比较，不凭字段数量代替逐值核对。

内容data精确取锁定源九个字段（identity/maps/nodes/edges/items/sources/actions/enemies/goal）；**唯一结构修改**为sources[id=H2-random].grants由grant.H2-random改null。choices、weights、节点、连接、动作、敌人等均不变；保留的origin／note／technicalMapping是来源说明，正式采纳状态以外层metadata和DEC为准，不表示额外运行时注册。H2按choices、weights、unit工作，无第二固定消毒剂。新增metadata不创造玩法字段。

两个源JSON在基线保持原字节；不得修改候选来迁就载荷。不得把fixtures中的外部CTB／伤害／磨损、局部初态、主线探针子集、route expected或Python字段移入正式配置。

### 4.3 版本和首工程门槛

来源恢复合同在获批新格式方向内明确**E01稳定来源扩展使用headless formatVersion=3**，当前仅文档定位，不写入生产registry、reader或存档。旧v1/v2语义与原测试保留，无静默迁移；E02活战斗格式及可保存点在其契约另定。O3旧医院入口／旧槽发布未决定，不据此建清档或永久并行维护承诺。

E01-P是首项完整纯生产者工程；E01-R是新聚合／codec；E01-S是唯一current与保存故障。具体R字段依P实际纯值在R任务中锁定，每项都须准确SHA停审。三者仍共同构成原E01方向，不删掉来源消费／恢复责任，不自动三个工程一起开工。E02/E03仍在后续，不顺带授权UI、浏览器或后继委托。

### 4.4 同步责任

每份附记按文档职责简写，指向实际批准、DEC052、配置／内容、首契约、恢复合同和批次门槛，不机械粘整份规则。

GDD／Slice说明当前新世界正式采纳范围及旧医院保留，不改核心愿景；Architecture／Traceability区分已有C、已批未实现的新来源与活战斗、后续codec和current唯一性；supersession只辅助局部覆盖，不能废止整条旧DEC。

overview／queue／readiness关闭本次D01—D04待采纳子项，同时保留具体结构和工程尚未执行、商城／服务／未来改专长／O3等未定。当前新数据是试用，不把历史194/24/31/41升格为生产或体验通过。

entry-004八份入口及原地点／任务／资源／事件／专长文档顶部放本次采纳附记，完整旧正文作为历史后缀保留；明确仅被本次覆盖的子集生效，旧其他数值和旧有限模型表示不并行作为当前规则源。

## 5. 精确路径白名单：44条

除下面路径，不得产生任何仓库差异；目录名不表示递归许可。不得新增生产源码、测试、占位模块、仓库运行脚本、依赖或CI配置。

### 5.1 唯一DEC精确追加（1）
```text
docs/05-design-decisions.md
```

### 5.2 既有文档仅末尾追加（10）
```text
docs/01-game-design-v0.1.md
docs/02-vertical-slice.md
docs/03-architecture.md
docs/07-decision-supersession-index.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
docs/design-drafts/world-infected-001/readiness/01-current-baseline-and-adoption.md
docs/design-drafts/world-infected-001/readiness/02-source-gap-and-ownership.md
docs/design-drafts/world-infected-001/readiness/04-evidence-and-playtest-gates.md
```

每份必须以基线Git完整字节为前缀；只能增加本次状态附记，不改旧段落。

### 5.3 来源入口仅顶部新增采纳附记（13）
```text
docs/design-drafts/world-infected-001/entry-004/00-owner-review.md
docs/design-drafts/world-infected-001/entry-004/01-current-production-and-gaps.md
docs/design-drafts/world-infected-001/entry-004/02-world-content-and-mission-contract.md
docs/design-drafts/world-infected-001/entry-004/03-combat-medical-contract.md
docs/design-drafts/world-infected-001/entry-004/04-specialties-tools-and-loadout.md
docs/design-drafts/world-infected-001/entry-004/05-source-and-adoption-map.md
docs/design-drafts/world-infected-001/entry-004/06-next-engineering-contracts.md
docs/design-drafts/world-infected-001/entry-004/07-playable-and-release-gates.md
docs/design-drafts/world-infected-001/03-location-design.md
docs/design-drafts/world-infected-001/04-main-mission.md
docs/design-drafts/world-infected-001/05-resource-economy.md
docs/design-drafts/world-infected-001/06-event-pack.md
docs/design-drafts/world-infected-001/07-enemy-continuity.md
```

每份必须以基线Git完整字节为后缀；新附记与旧正文明确分隔，不在旧全文中替换状态或数字。

### 5.4 五个正式目标和两份报告（7）
```text
docs/content/infected-world-entry-test-config-v0.1.json
docs/content/infected-world-entry-content-v0.1.json
docs/engineering/residence-foundation/content-supply-core-contract-v1.0.md
docs/engineering/residence-foundation/content-supply-restore-contract-v1.0.md
docs/engineering/residence-foundation/world-content-batch-plan-v1.0.md
docs/design-drafts/world-infected-001/entry-004/adoption/DOC-WORLD-ENTRY-004-completion.md
docs/design-drafts/world-infected-001/entry-004/adoption/checks.json
```

五目标按确定载荷复制，报告由作者按本次真实执行写入。报告不得自填当前报告所在的最终SHA再追逐提交；最终完整SHA／parent／tree以提交后消息给出。

### 5.5 包内十三件逐字节归档（13）
```text
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/AUD-612ac66-WORLD-ENTRY-004-R1-review-v1.0.md
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/BASELINE-AND-INPUTS.json
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/DOC-WORLD-ENTRY-004-task-v1.0.md
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/OWNER-approval-WORLD-ENTRY-004-ADOPTION-v1.0.md
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/SHA256SUMS.txt
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/WORLD-ENTRY-004-ADOPTION-owner-review-v1.0.md
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/approved-documents/DEC-052-append.md
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/approved-documents/content-supply-core-contract-v1.0.md
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/approved-documents/content-supply-restore-contract-v1.0.md
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/approved-documents/infected-world-entry-content-v0.1.json
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/approved-documents/infected-world-entry-test-config-v0.1.json
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/approved-documents/world-content-batch-plan-v1.0.md
docs/design-drafts/world-infected-001/entry-004/adoption/inputs/verify-doc-package.py
```

verify-doc-package.py仅是输入归档中的只读文档辅助，不注册npm脚本、生产能力或新依赖。不可修改任何输入文件来绕过检查。

## 6. 实际验收与自查修订

### 6.1 开始时

先实查Git状态和参照，再运行仓库外原包辅助（OUT路径由你选择仓库外的本任务临时目录，不写入输入包或其他用户文件）：

```text
python <包目录>/verify-doc-package.py --phase input --repo-root <实际仓库> --out <仓库外>/doc004-input.json
```

它只做文档包／固定源／基线核对，不执行游戏模型或生产测试。若环境没有Python，可用现有工具等价独立核验并留下命令／结果，不安装依赖、不降低下列验收。

### 6.2 归档完成后

```text
python <包目录>/verify-doc-package.py --phase final --repo-root <实际仓库> --out <仓库外>/doc004-final.json
npm run validate:architecture
git diff --check
git diff --cached --check
git diff 612ac6673223cc93237184892e6713e789a9dce1 --check
```

另逐项核验：

1. SHA清单12件、归档13件工作树／暂存／提交blob一致；六载荷字节、DEC精确追加、23份旧全文前缀／后缀保全。
2. 103键和193叶逐值及完整结构对照；两个原38配置原字节不变；H2无固定载荷引用，内容data只发生指定一处结构变更；不靠数量相等冒充全值相等。
3. 新增／变更Markdown相对链接和锚点有效，按正式目标／正确历史上下文处理输入原件，不将外部E:/或旧sandbox路径当当前仓库有效链接。记录实际检查集合、数量及例外依据，不笼统宣称所有历史链接都有效。
4. 架构检查预计只多一条DEC至52、core仍257；以实际输出为准。失败必须查明，不改校验器、阈值、依赖或生产代码来适配。
5. 全白名单外基线对象、src、原合同、历史验证／freeze、原候选JSON、package/lockfile、AGENTS和CI不变。对新增未跟踪路径也核对范围与空白，不能只看tracked diff。
6. 自查交叉核对：采纳原文→DEC／配置／内容；源字段→载荷→契约；已有G1正常steps=[]→新死亡来源分支；旧v2整输出→v3有界份额而非删校验；R/S停审→不自动开工；先治疗再流血不能套旧死亡步骤冒充同一来源。
7. 模型／生产测试、本次构建、浏览器／多标签／试玩均NOT RUN；本任务不要求重跑历史模型或生产check来包装文档验证。新增生产测试0。实际没有做的安全审计也不得称通过。

普通排版／链接和附记缺项在范围内一次修订再复验。原件若出现空白告警或正文实质冲突，保留原始退出码／诊断并报告，不修改原件或擅设豁免。当前包预检没有已知行尾空白例外。

### 6.3 提交与推送

全部验收后只暂存白名单实际文件，查看完整cached diff及name-status，不把检查临时产物纳入仓库。普通commit一次完成本批；提交后逐文件核对实测工作树、暂存记录与提交blob，运行：

```text
git diff 612ac6673223cc93237184892e6713e789a9dce1 HEAD --check
git rev-parse HEAD
git rev-parse HEAD^
git rev-parse HEAD^{tree}
git status --short --untracked-files=all
git diff --stat 612ac6673223cc93237184892e6713e789a9dce1 HEAD
git push origin HEAD:refs/heads/feature/design-world-entry-004
git ls-remote --heads origin
```

推送权限只限该分支，核对目标完整SHA及其余12参照。网络失败可在本次权限内最多再普通重试一次，不改SSL／代理／remote，不强推。仍失败保留本地提交、报告REMOTE UNCONFIRMED与真实回执，不为更新报告另amend；主线在拿到准确提交后实审。

## 7. 完成报告和停止点

完成消息标题DOC-WORLD-ENTRY-004；包含起始／最终完整SHA、父SHA、tree、branch、真实commit/push／远端结果、文件数、实际Git状态，W1—W4交付、52DEC架构输出、参数／内容／原件／链接／前缀与范围结果；失败与修订、冲突、未完成项及NOT RUN清楚分列。附完成报告和checks路径，但不要求Owner手动逐份核对。

本地检查、历史作者证据、主线先前实审和远端CI分别列；没有重跑不能算新增验证，CI没有真实查询就写未核验。checks保留命令、退出码、实际日志路径／摘要和字节指纹，不能只填PASS。

完成后停止，等待当前WebGPT主线准确SHA文档实审；不自动正式注册内容、运行E01-P/R/S、E02/E03或UI／浏览器。Owner只需把最终报告贴回当前WebGPT，不必再授权“是否生成任务书”，也不修改Project Sources或项目说明。
