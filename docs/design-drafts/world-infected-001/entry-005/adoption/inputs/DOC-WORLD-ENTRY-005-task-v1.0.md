# DOC-WORLD-ENTRY-005 完整仅文档任务书 v1.0

## 0. 一次完成什么

将已审WORLD-ENTRY-005-R1技术合同正式归档：活战斗时序、唯一事实／真实来源／死亡协议、独立v4恢复、唯一会话及E02-P→R→S门槛；完成原件、入口同步、自查修订和普通commit/push。不重开玩法采纳，不新增DEC，不运行生产工程。

仓库：lvlw/elevator-survival。
起始SHA：`464b59d657184636b897f72375eb6b61bd2c5786`。
起始父SHA：`df1c3ff6979703b72bf76d73761b3915e59eb5b2`。
起始Tree：`f9d019450cdb1c77e2b45103cc5337481919c95c`。
受保护src tree：`10501d897195173df2023b1ebd73f9f097228512`。
分支：沿用`feature/design-world-entry-005`，不新建分支／worktree。

## 1. 开工与来源

由Codex定位用户直接附上的ZIP，在仓库外解压，Owner不提供解压路径。完整读取本任务书、MAINLINE技术定稿记录、R1实审报告、BASELINE-AND-INPUTS、五件approved-documents和SHA256SUMS。先运行同包只读verify-doc-package.py --package-only。

重新实查HEAD、分支、status、普通／cached diff、AGENTS及远端参照；须在指定SHA和干净工作区开始。发现其他工作或HEAD不符，停止报告，不reset或丢弃。重新读取AGENTS列出的实际规则材料以及DEC-031/035/036/049—052相关条款、entry-005的00—07及其R1附记、现有来源恢复及world-content-batch-plan。

原项目上传文档不替代仓库指定提交。主线技术定稿不等于Codex能自行新增玩法／DEC编号；不把历史candidate标签当作取消Owner已批准D01—D04。

## 2. 精确白名单：32条

最大允许集合如下；本项要求的原件／载荷／报告／入口应完整交付，不增加仓库临时文件。路径外文件全部只读。

- `docs/design-drafts/world-infected-001/entry-005/adoption/inputs/DOC-WORLD-ENTRY-005-task-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/adoption/inputs/MAINLINE-technical-ratification-WORLD-ENTRY-005-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/adoption/inputs/AUD-464b59d-WORLD-ENTRY-005-R1-review-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/adoption/inputs/BASELINE-AND-INPUTS.json`
- `docs/design-drafts/world-infected-001/entry-005/adoption/inputs/verify-doc-package.py`
- `docs/design-drafts/world-infected-001/entry-005/adoption/inputs/SHA256SUMS.txt`
- `docs/design-drafts/world-infected-001/entry-005/adoption/inputs/approved-documents/active-combat-batch-plan-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/adoption/inputs/approved-documents/active-combat-core-contract-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/adoption/inputs/approved-documents/active-combat-lifecycle-contract-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/adoption/inputs/approved-documents/active-combat-restore-contract-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/adoption/inputs/approved-documents/active-combat-session-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-batch-plan-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-core-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-lifecycle-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-restore-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-session-contract-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/adoption/DOC-WORLD-ENTRY-005-completion.md`
- `docs/design-drafts/world-infected-001/entry-005/adoption/checks.json`
- `docs/design-drafts/world-infected-001/entry-005/00-owner-review.md`
- `docs/design-drafts/world-infected-001/entry-005/01-current-baseline-and-reuse.md`
- `docs/design-drafts/world-infected-001/entry-005/02-combat-lifecycle-and-order.md`
- `docs/design-drafts/world-infected-001/entry-005/03-single-truth-and-effects.md`
- `docs/design-drafts/world-infected-001/entry-005/04-active-combat-save-contract.md`
- `docs/design-drafts/world-infected-001/entry-005/05-approved-data-and-gaps.md`
- `docs/design-drafts/world-infected-001/entry-005/06-engineering-contracts.md`
- `docs/design-drafts/world-infected-001/entry-005/07-evidence-and-playtest-gates.md`
- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`
- `docs/engineering/residence-foundation/world-content-batch-plan-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/completion.md`

## 3. W1：十一份原件归档

按BASELINE.archive_map将包内11件文件原始字节归档到entry-005/adoption/inputs/，保留approved-documents子目录；SHA256SUMS不包含自己是正常约定，归档自身字节仍须保全。原entry-005/inputs五件和r1-inputs十二件全部只读，不重新生成、不统一格式化。

本包不包含审查证据ZIP，无需从旧会话另取。R1实审报告已在包内，历史复现材料仍在仓库r1-inputs。不要把仅本轮审查的数据重算为作者新增验证。

## 4. W2：确定载荷安装，不改正式规则

将approved-documents五件分别逐字节安装到BASELINE.payload_map的正式路径。所有正式目标在起点必须不存在；若已有同名文件或发现确定载荷与实际规则冲突，停止相关安装并报告精确文件／条款，不能自己改正文、改原件、补假步骤或改生产代码。

五份正文是主线最终技术载荷，不需要Codex再生成同名候选；不要只复制历史TECHNICAL DRAFT标题当正式合同。v4数字是本次主线技术定稿，不伪称Owner新增玩法参数，也不注册任何运行时代码。

不修改docs/05-design-decisions.md，不创建DEC-053，不增改38值、103键／193数值叶、内容或candidate源JSON。不将有限模型字段、固定H1/H4、外部战斗轨迹、TEST低HP/E、expected.current完整夹具或346/350等检查数量当生产结构／能力证明。

## 5. W3：同步入口，保留历史字节

BASELINE.prepend_only_paths（entry-005的00—07）：只在原文前加入一段带独立锚点`doc-world-entry-005`的状态附记，然后分隔线＋原全文。原文逐字节保留为后缀，不能删除其中历史候选／失败／待审措辞；附记明确其历史身份。

附记内容应包含：R1准确SHA专项PASS、F01/F02关闭；五份正式技术合同链接；主线定稿v4与P/R/S顺序，不改玩法／参数；本次文档提交仍待准确SHA实审；E02、E03、浏览器及O3未执行／未决定。00/06指明同范围唯一有效合同入口，04区分有限dead夹具与正式生产最小锚，05强调表格是只读配置视图、不增参数源。

BASELINE.append_only_paths：仅末尾追加DOC-WORLD-ENTRY-005局部附记，原字节前缀完整。architecture/trace记录技术合同与实现未开始；overview/queue记录当前阶段；world-content-batch-plan追加E02新合同入口及独立停审，旧批次正文不重写；旧entry-005/completion追加本次归档导航，不覆盖原106／350／失败／冻结记录。

不更新Project Sources或项目配置；本轮无UI/Interaction/Presentation更改。旧v3固定语义不等于永久维护所有开发格式；O3发布承诺仍未决定。

## 6. W4：检查、自查及一次交付

实际执行并保留命令、退出码、摘要和失败修订记录：

```text
python <包目录>/verify-doc-package.py --package-only
python <包目录>/verify-doc-package.py --repo <仓库> --output <仓库外>/doc-working.json
npm run validate:architecture
git diff --check
git diff --cached --check
git diff 464b59d657184636b897f72375eb6b61bd2c5786 --check
```

provided verifier只做包摘要、payload、scope、前后缀和增量diff等检查，不能冒充所有语义／链接检查。另在仓库外编写只读审计或使用现有工具，核对新增／变更链接及锚点、UTF-8、source_blobs、11件输入、5件目标、14件历史前后缀、正式规则／配置／src及全部范围外Git对象不变。结果归入adoption/checks.json；不要把临时脚本放入未授权仓库路径。

来源配置摘要在BASELINE明确是source-declared，Codex必须对实际基线与交付逐字节重算，不把主线转录的来源摘要冒充已执行。本项所有新文件须无行尾空格。原W01只在累计从8c19ca0比较时存在，新增对照464b59d必须exit0；不能扩大空白例外、修改.gitattributes或git检查配置。

五份正文完整性自查至少覆盖：三敌不同profile；移动前首遇／from witness；HP0优先；同点排序；胜退一次E；真实快捷消费／首绷／日额；唯一body/items/enemy；新typed combat-death；正常H0空steps与实际日结；原值与expected自身strict；实际后继battle恢复；P/R/S独立停审；新旧版本双向拒绝；不新增玩法／DEC／参数／发布承诺。

本项不重跑／修改历史模型、350有限套件、23原生探针或原生成器，不运行E02。生产npm全量测试、typecheck/build、浏览器／真实Storage／Owner试玩不属于本次要求，未执行必须NOT RUN，新增生产测试0。架构结果以本轮实际为准，不预填历史52/289充当已跑。

## 7. Git与最终停止

允许普通commit/push本设计分支；网络失败可普通重试并核实远端。禁止merge、推main／其他分支、强推或自动生产开工。不得把文档归档推进解释为E02-P/R/S一起获执行权。

原件及正式目标在工作区、暂存、最终commit中逐字节核对。提交后运行：

```text
python <包目录>/verify-doc-package.py --repo <仓库> --ref HEAD --output <仓库外>/doc-committed.json
git status --short
```

完成报告为adoption/DOC-WORLD-ENTRY-005-completion.md，检查记录为adoption/checks.json。报告记录真实基线、32路径清单、11原件／5载荷／14历史保全、参数及链接结果、失败修订、规则冲突／未完成项及范围外事项。最终自身SHA/tree不强塞自身提交以制造循环；最终消息和仓库外提交后回执给起始／父／最终完整SHA与tree、branch、push/remote、工作区及停止点。

一次完成内部详细检查和修订，不要求Owner逐文件协调。最终停止等待当前WebGPT主线准确SHA文档实审；通过后主线另下发E02-P完整任务，不自动进入生产。
