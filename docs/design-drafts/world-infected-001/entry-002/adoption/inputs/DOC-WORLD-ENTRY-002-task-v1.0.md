# DOC-WORLD-ENTRY-002：O1／O2集中正式归档与G1契约收口

> 任务书v1.0；日期：2026-10-03。
> **已由WebGPT主线根据Owner实际批准及任务下发权限直接下发。收到完整输入包后执行，无需再次申请开工或逐步骤批准。**
> 这是一次完整的仅文档任务：原件归档、正式条款、唯一试用参数、恢复补充合同、G1契约、相关状态／索引同步、自查修订、检查及普通commit／push。
> **停止点：本任务提交已推送，等待主线准确SHA实文件评审。不得自动执行G1／G2／G3。**

## 0. 本轮到底交付什么

把Owner刚批准的WORLD-ENTRY-002-ADOPTION v1.0变成可直接作为下一工程依据的准确仓库材料。不是重开设计，不是重新评审R1，不是把整个Draft或213项有限模型移植到生产。

本任务明确新增且只新增DEC-050。`approved-documents/`包含主线依获批子集整理的具体归档正文；它们的标题／目录／配置标识是本任务的文档定位，不代表新增玩法或Owner逐字批准了新的生产Schema。Codex不能自行取更宽的候选源扩写它们。

本次结束时必须同时清楚：O1指定条款／参数与G1契约已批准；O2持续现场和恢复／完整事务合同已批准；G1／G2／G3仍未实现、未由本任务开工；O3发布安排与所有排除项仍OPEN。首身份核心d1d3b79的PASS保持。

## 1. 精确基线、分支和权限

| 项目 | 本任务锁定 |
| --- | --- |
| 仓库 | `lvlw/elevator-survival` |
| 起始完整SHA | `8245cc61a59a6404984129415bf8aac904926ce0` |
| 工作分支 | `feature/design-world-entry-002`，沿用现有分支，不新建分支或worktree |
| 已通过首核心 | `d1d3b7927c6733cff709a4bfd617fb1e85e7485a`；仅作为前置能力，不回退到该点开本任务 |
| 远端main参考 | `a76e9c1c998051fc1643b6e0c3d53443fa55feed` |
| 正式DEC起点 | 当前最大049；完整文件blob见BASELINE-AND-INPUTS.json |
| 允许写 | §5精确文档白名单；允许任务内自主组织普通同步、自检和修订 |
| 提交与推送 | 明确允许本任务普通commit／push至`origin/feature/design-world-entry-002`，无需再向Owner申请 |
| 禁止 | 合并、推main／其他分支、强推、amend历史、reset／clean丢弃改动、绕过hooks、改Git空白规则、实施下一个Goal |

Owner已授权主线按审查节点接续下发工程；这不等于Codex自己在本任务通过检查后就可以继续写生产。文档实审后，下一工程由主线给出届时准确SHA、分支、路径和提交权限。

### 开工检查

完整读取实际`AGENTS.md`及适用的嵌套规则；本会话旧推断不得替代当前读取。执行并记录仓库根、remote、HEAD、branch、tracked／untracked状态、普通及cached diff、worktree和各相关远端引用。

至少检查：

```text
git rev-parse --show-toplevel
git remote -v
git rev-parse HEAD
git branch --show-current
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git worktree list --porcelain
git ls-remote --heads origin refs/heads/main refs/heads/feature/design-world-entry-002 refs/heads/feature/design-world-infected-world-001 refs/heads/feature/mission-lifecycle-core-001
```

在干净且全部基线核对一致的情况下允许切到指定现有分支；缺对象可普通fetch，但不得移动其他本地分支。目标HEAD／远端目标分支不同、目标新文件已存在或有他人改动时先报告具体冲突，不自动重置、合并、stash、覆盖或清理。用户本地事实由你实际读取，主线的远端记录不替代本地检查。

## 2. 输入、批准依据与阅读责任

包根六件：本任务、获批稿原件、实际Owner批准记录、8245cc6专项复审原件、BASELINE-AND-INPUTS.json、SHA256SUMS.txt。`approved-documents/`四件为确定归档载荷。SHA清单覆盖其余九个文件，不自列SHA清单自身。

先核对全部输入哈希，再完整阅读获批稿、实际批准、前置审查和四份载荷；原获批稿“等待Owner选择”保留历史原貌，不影响另存实际批准。原件不得改字、改换行、重排或删行尾。

当前正式权威继续为已确认DEC>Slice>GDD>Content；新内容以Owner批准范围及本次明确归档正文落文后生效，不能用旧医院局部门禁否决新驻留。按照实际AGENTS读取GDD、Slice、Architecture、DEC和相关Content；涉及这里只读的信息边界还应读取实际UIR速查及有关约定，但本任务不修改UIR或新立交互规则。

针对性必读固定基线：

- `docs/05-design-decisions.md`的相关时间／日级／终局／持续对象及DEC-049；`docs/07-decision-supersession-index.md`只辅助定位。
- `docs/design-drafts/world-infected-001/entry-002/00-owner-review.md`至`03-next-engineering-goals.md`，特别R02—R07、R1周期矩阵、冷启动／事务和G1。
- 同entry-002的`04-source-map-and-debts.md`、completion及R1审查修订定位；readiness/01—04的职责和当前基线。
- 原已批准首契约、首身份核心的类型／查询／controlled／validation及原测试的相关边界，只读核对，不以本次重复读取冒称新源码实审。
- `validation/fixtures.json`的config及来源；只读取并提取批准子集核对，**不修改任何模型／夹具／预期／运行记录，不运行旧模型充新增证据**。
- 实际`package.json`与`scripts/validate-architecture.mjs`；不增加依赖或修改检查器。

G1详细接口实现由未来Codex工程完成；本任务只收口已批准合同，不在文档中提前设计一套完整Profile或Save SDK。

## 3. 一次完成的四个工作包

| 包 | 本任务内容 | 不得扩大 |
| --- | --- | --- |
| A 原件与批准 | 按原字节归档本输入包十份文件，链接实际批准及准确审查 | 不复制旧完整设计包／旧ZIP／审查探针，不改原件状态 |
| B 正式规则／参数 | 原DEC文件末尾追加指定050，复制唯一数值子集JSON，更新覆盖与引用 | 不自行注册051，不把整份config批准，不改旧001—049正文 |
| C 唯一工程合同 | 复制O2恢复补充与G1契约，明确与原首契约关系和未来执行停止点 | 不放宽原restore，不同时留两份“当前G1”，不执行G1或注册runtime |
| D 同步与验收 | 更新指定文档有效入口、规则／参数／实现／历史证据分层；自检修订、暂存、普通提交推送与报告 | 不再请求逐文件许可；不以文件多为由扩到源码或全世界设计 |

允许同一任务内使用不写仓库的只读交叉审查协助核对；根会话为唯一写者和Git执行者。普通格式／链接／同步疑点在本任务内解决，真实批准冲突停止相关归档并报告，不自行选择更宽版本。

## 4. 确定正文、唯一来源和具体落文方式

### 4.1 只追加DEC-050

`approved-documents/DEC-050-append.md`是本次主线指定的**完整追加正文**，从`<a id="dec-050"></a>`开始。本文件中的Markdown相对链接按目标`docs/05-design-decisions.md`编写。

先从Git基线取DEC完整原字节；核对blob为`f172de6ae7eecaaa126dd519d3dc7d2b279ad3b9`，原最大049、无050。目标文件必须严格等于：

```text
baseline_DEC_bytes + b"\n\n" + DEC_050_payload_bytes
```

不要strip、整理、重编码或统一旧段换行；以Git基线字节为准保护001—049。只能本条新增050；所有编号、正文、局部范围和排除项按载荷，不增写并行解释取代正式句子。若发现载荷与实际批准冲突，报告具体句子，不自行改规则。

旧DEC-049的历史“当前未实现／另行授权”等状态不在原条文内倒改，当前状态通过本次同步入口解释。新050中“尚未实现”指其新增精力／周期／持续与恢复能力，不抹去已通过身份核心。

### 4.2 归档载荷与三个新目标

| 输入载荷 | 唯一当前目标 | 操作 |
| --- | --- | --- |
| `approved-documents/DEC-050-append.md` | `docs/05-design-decisions.md` | 仅按§4.1追加 |
| `approved-documents/infected-residence-core-test-config-v0.1.json` | `docs/content/infected-residence-core-test-config-v0.1.json` | 整文件原字节复制 |
| `approved-documents/runtime-restore-supplement-v1.0.md` | `docs/engineering/residence-foundation/runtime-restore-supplement-v1.0.md` | 整文件原字节复制 |
| `approved-documents/energy-cycle-contract-v1.0.md` | `docs/engineering/residence-foundation/energy-cycle-contract-v1.0.md` | 整文件原字节复制 |

三个新目标与对应载荷逐字节相同；不要让不同命名的第二配置／合同同时承担“当前”权威。`inputs/approved-documents`仅留不可变任务输入，不是运行时或另一套可编辑规则源。

配置只包含获批稿第3节九行列明的字段组。独立检查目标JSON的config递归键和值，严格等于源fixtures.config的对应子集；metadata仅定位本次文档，不是生产rulesVersion／saveFormat／mission ID。任何额外的prices、load、战斗、医疗使用效果、grid／max_weight或rest_nodes均不得进入批准配置。

原`fixtures.json`完整config继续是旧有限证据参数；不得删除其中未批字段、修改它来伪装一致，或声称213项已按新生产配置重新通过。下一工程如何提供唯一版本化运行时值，由主线届时任务锁定；当前不创建`.ts`、生产注册表或让core读取docs。

恢复补充不改原`restoreMissionCandidate(raw, expected, scope)`，不改原已批准首契约字节；冷解析仅新增受控路径，具体实现后续。原K18/K19和既有PASS继续有效。G1契约已批准≠G1已获当前文档任务写源码许可。

### 4.3 同步入口的内容要求

所有当前有效附记要同时说清：

- 正式规则入口是DEC-050；唯一试用配置和两份合同是上述目标；原批准、原件和本轮完成记录可以追溯。
- O1仅包含指定规则与试用参数；O2持续现场／恢复合同批准；O3待公开发布前决定；其他数值、内容和工程不随同升级。
- 8245cc6的R1有限专项PASS与d1d3b79首核心PASS均是前置历史；本轮只文档检查。生产新能力未实现；不是完整世界冻结或体验通过。
- 原001—049及原首契约不倒改；原模型、原213项／56项、旧BLOCKED和之前批准状态保留历史身份，不能拿旧“待审”否认本次局部采纳。
- 状态“已批准、待文档实审、未生产接线”与“未批准／未支持／未执行”分开，不给所有行统一打PASS。

各文件最小同步职责：

| 文件组 | 应同步什么 |
| --- | --- |
| GDD／Slice | 新旧适用边界、共享精力／连续驻留／无免费治疗、来源链接；旧医院验收不改，新世界仍未可玩 |
| Architecture | 唯一事实、纯G1与未来owner分工、冷候选／安装／完整提交／只读通知，原恢复不放宽 |
| Supersession index | 050逐项局部覆盖和保留，不让索引自己新创规则或宣布旧版本整体废止 |
| Traceability | O1/O2正式与试用来源→当前实现状态→未来测试入口；G1／G2／G3保持未实现，不预填目录存在 |
| 设计overview／queue | 只关闭O1所批子集／G1契约与O2边界；O3和经济、专长、工具箱、战斗、UI、保存体验门槛继续OPEN |
| readiness/01 | 更新采纳状态与版本差异；老药物／费用等Draft继续独立，不整包升级 |
| readiness/02 | 加当前能力与未来依赖附记，明确首核心不能直接做冷boot，新补充尚未实现，不倒改旧源码盘点 |
| readiness/04 | 正式档与工程实审门槛，历史／本轮证据区分；G1前真npm基线与真实保存／Owner首玩责任保留 |
| entry-002/00—03 | 顶部增加当前采纳附记与唯一目标链接；保留完整原候选正文作来源。G1指向本次唯一合同，G2/G3仍后续候选；引用本次采纳限定而不是从旧表扩大参数 |

## 5. 精确写入白名单（30个文件）

**除下面30条外不允许产生仓库差异。** 所有新目录只为这些指定文件建立，不是递归写入白名单。不得新增空目录占位、通用模板、仓库脚本或新的工程计划包。

### 5.1 一个既有文件精确追加

- `docs/05-design-decisions.md`：严格按§4.1整段追加。

### 5.2 十个既有文件仅末尾追加当前附记

- `docs/01-game-design-v0.1.md`
- `docs/02-vertical-slice.md`
- `docs/03-architecture.md`
- `docs/07-decision-supersession-index.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`
- `docs/design-drafts/world-infected-001/readiness/01-current-baseline-and-adoption.md`
- `docs/design-drafts/world-infected-001/readiness/02-source-gap-and-ownership.md`
- `docs/design-drafts/world-infected-001/readiness/04-evidence-and-playtest-gates.md`

以每份基线Git字节为完整前缀，仅追加新附记；不改历史段、不删旧冲突经过、不做全文件格式化。各附记的事实允许按文件职责精简，但不得遗漏批准边界和指向。

### 5.3 四个候选入口仅顶部增加当前采纳附记

- `docs/design-drafts/world-infected-001/entry-002/00-owner-review.md`
- `docs/design-drafts/world-infected-001/entry-002/01-local-rule-amendments-draft.md`
- `docs/design-drafts/world-infected-001/entry-002/02-runtime-restore-contract.md`
- `docs/design-drafts/world-infected-001/entry-002/03-next-engineering-goals.md`

将新附记放在完整旧字节之前，旧文件为完整后缀；不要在原候选中局部删“待审”、改旧表或把旧验证状态改成新结果。新附记明确正文为原候选历史，当前批准只按载荷及获批稿，避免两个平行当前合同。

### 5.4 三个新权威文件及两份交付记录

- `docs/content/infected-residence-core-test-config-v0.1.json`
- `docs/engineering/residence-foundation/runtime-restore-supplement-v1.0.md`
- `docs/engineering/residence-foundation/energy-cycle-contract-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-002/adoption/DOC-WORLD-ENTRY-002-completion.md`
- `docs/design-drafts/world-infected-001/entry-002/adoption/checks.json`

前三份按载荷复制；报告按§7填写。旧entry-002/completion、原R1记录、所有旧inputs、原readiness/03首契约、docs/06及Content旧文件都不在修改范围。

### 5.5 十份输入归档，保留相对目录及原字节

- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/DOC-WORLD-ENTRY-002-task-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/WORLD-ENTRY-002-ADOPTION-owner-review-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/OWNER-approval-WORLD-ENTRY-002-ADOPTION-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/AUD-8245cc6-WORLD-ENTRY-002-R1-review-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/BASELINE-AND-INPUTS.json`
- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/SHA256SUMS.txt`
- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/approved-documents/DEC-050-append.md`
- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/approved-documents/infected-residence-core-test-config-v0.1.json`
- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/approved-documents/runtime-restore-supplement-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/approved-documents/energy-cycle-contract-v1.0.md`

归档复制整个包的十份文件到指定inputs层级，ZIP本身不入库。SHA256SUMS仍按同目录相对路径校验，其自身也须与输入包原字节相同。载荷内按目标位置写的相对链接不在归档副本内改写；当前入口只使用本轮实际目标链接。

## 6. 明确范围外

禁止修改所有`src/**`、`scripts/**`、`.github/**`、`AGENTS.md`、`package.json`、lockfile、tsconfig、vite配置、`.gitattributes`与Git配置；不新增或运行生产实现，不安装／更新依赖、不修安全告警、不调整检查阈值。

不修改任何旧验证模型、fixtures、expected、results、run-record、自查／审查原件或旧任务输入；不把本次当R2返修，不重新做完整世界设计。不能因来源仍含旧待批措辞就扩大白名单。

不新增DEC-051或其他编号，不另写UIR，不为界面统一弹窗。钱包／完整奖罚、身体服务、商品、医疗具体使用、装备、地图成本、节点清单、专长、工具箱完整路线、CTB、新保存、Profile、供给SDK、玩家入口和O3发布执行均不纳入。

三专长差异、分段突破、工具箱路线、信息安全、旧槽安排、真实保存和Owner首玩不能因为本次排除而删除；在状态附记保留相应阶段责任。

## 7. 验收、自查与证据

### 7.1 必须实际执行的文档检查

临时核对脚本／结果放仓库外；仓库只保留本任务两份交付记录。你可在任务内编写自己的文档核对脚本，无需Owner逐行指导。检查不能仅匹配标题或统计文件数，必须校对实际正文／字节与参数。

| 检查 | 必须观察到并记录 |
| --- | --- |
| 输入 | SHA清单九项匹配；十份归档与输入包逐字节相同，包含清单自身；归档Git blob／大小可复核 |
| DEC | 旧全文前缀与Git基线完全相同；追加后态严格等于§4.1公式；编号001—050连续且不重复，无051；新050正文与载荷无遗漏或增改 |
| 两合同 | 新目标与载荷全文相同，原首契约blob未变；候选入口正确指向唯一G1和补充合同，原expected与K18/K19边界未减弱 |
| 参数 | 仅批准键全集，逐键值与获批稿表及基线fixtures子集相同；无未批字段混入，metadata不冒充生产标识；旧fixtures字节未变 |
| 附记与状态 | 十份旧文件完整前缀、四份候选完整后缀保全；批准／试用／未实现／后置分层准确；O3与其余排除项保留 |
| 链接 | 新DEC、两合同、配置、批准记录、归档与当前附记的新增／变更链接及锚点有效；相对路径以实际目标位置核对 |
| 文本 | 新写文本严格UTF-8、LF、无BOM／行尾空格；输入原件不为风格改字节；无笼统空白例外 |
| 路径／保护对象 | 实际差异精确落在30条内，所有预定交付齐全；src／scripts／.github／依赖／AGENTS／原首契约／旧证据及其他非白名单Git对象均不变 |
| 架构文档检查 | 按实际package执行`npm run validate:architecture`，记录实际输出和退出码；不是生产测试或build |
| diff | 普通、完整暂存、相对起始SHA的diff --check均执行，真实退出码保留；不得过滤掉新告警后称全部通过 |

链接检查不要为输入档案重写历史链接。对归档载荷中的目标相对链接，应检查它安装到正式位置后的有效性；历史引用不可用时标出其证据身份，不让它成为当前唯一导航。发现当前正式链接错误须在允许的新附记中修复；指定载荷本身错误需报告，不静默改载荷指纹。

旧任务三行空白在本次基线内，不为当前新增文件豁免。主线已检查本包无行尾空白；你仍须独立检查原件和完整差异。本任务没有任何新的空白例外，没有`--no-verify`或修改core.whitespace等权限。

### 7.2 明确不算本轮验证

本任务不要求`npm run test:run`、`npm run check`、构建、浏览器、真实存档、模型重跑或Owner试玩，统一记录NOT RUN。只运行上述文档／架构检查不等于生产通过；不要为了数字好看执行旧Python再作为本次新规则证明。原213、56及旧2256数字只能带原任务／提交／作者／主线标签引用。

作者自查与本会话只读助手审查分别记录。不得使用“COMPLETE”替代精确文档比较，不冒称WebGPT主线已审本轮最终SHA。

### 7.3 两份仓库交付记录

`DOC-WORLD-ENTRY-002-completion.md`至少包括：任务和起始完整SHA、实际分支；Owner批准来源；四包产物与唯一目标；全部修改文件；具体检查与退出码；新增生产代码／测试均0；历史证据和本轮文档检查分开；冲突／未完成／排除项；commit／push权限与停止点。

文档可以写“最终SHA见本文件所属提交及提交后交付消息”，不伪造尚不存在的SHA，不为自引用反复amend。不写成“等待Owner批准O1/O2”；当前应是“已批准、集中归档完成、等待本次准确SHA实审，生产未开工”。原获批稿待审字样作为原件不改。

`checks.json`至少记录：输入路径／大小／SHA-256／Git blob；起始／最终保护对象；30路径白名单和实际集合；DEC新旧和载荷检查；参数精确键／值比较；合同和候选权威关系；链接与编码结果；检查命令／退出码／输出摘要；自查发现和修复；NOT RUN；最终交付回执取值方式。记录实际结果，不预填PASS或测试数量。

## 8. 提交、推送、交付和停止

所有检查通过后，使用精确路径暂存本任务文件，审阅完整cached diff；不得`git add .`将不属于任务的文件一起提交。报告更新重新暂存后，再核完整diff与输入／正文指纹。普通提交建议消息：`docs: adopt residence rules and core contracts`。

提交后实际执行并报告：

```text
git rev-parse HEAD
git show --stat --oneline HEAD
git diff --name-status 8245cc61a59a6404984129415bf8aac904926ce0 HEAD
git diff --check 8245cc61a59a6404984129415bf8aac904926ce0 HEAD
git status --short --untracked-files=all
git diff --check
git diff --cached --check
git push origin HEAD:refs/heads/feature/design-world-entry-002
git ls-remote --heads origin refs/heads/feature/design-world-entry-002 refs/heads/main refs/heads/feature/design-world-infected-world-001 refs/heads/feature/mission-lifecycle-core-001
```

提交和推送后再次确认工作区、原件及正式正文blob、保护对象和其他分支引用。不要为了把最终SHA再写入当前提交而做amend；最终消息给准确回执即可。push失败保留本地提交并报告，不强推、不借其他分支继续。

最终消息请让Owner可以直接贴回WebGPT主线：

```text
DOC-WORLD-ENTRY-002：COMPLETE，待主线准确SHA实文件评审。
起始SHA：...
最终SHA：...
分支：...
普通commit／push及远端核对：...
四个工作包结果及唯一正式入口：...
本轮文档／架构检查、原件／参数／旧正文／diff结果：...
新增生产代码／测试0；生产测试／构建／真实保存／浏览器／试玩NOT RUN。
仍待审／未实现：O3、其余未批准数值内容、G1—G3生产实施与相关体验门槛。
冲突／未完成／越界检查：...
已停止，等待主线准确SHA实审，不进入G1、不合并或推main。
```

本任务到此结束。文档归档实审后，主线按已授予权限直接安排G1完整工程；不要让Owner再拼材料、逐文件指挥或申请编制任务书。
