# DOC-WORLD-QUERY-001 完整任务书 v1.0

## 0. 目标、依据、Git与停止点

一次归档主线已技术定稿的玩家安全查询合同、24字段清单及下一完整工程契约；同步实际入口并完成核验。不是重开世界设计，不是query／UI生产开发。

起点SHA：`7a3acd3855aefdde68fdaed13ebe037f3e9bd6de`；父SHA：`de8f358d2d281eb4ff914d6ebc20f16986164701`；tree：`17d43169891e71e5e5686ccff8271f98b49800c7`。沿用`feature/world-route-acceptance-001`，不新建branch/worktree，不在旧设计分支交付。本任务只需当前Codex会话执行文档归档。

依据本包MAINLINE技术定稿记录、准确SHA预算复审以及Owner既有任务下发权限。普通commit／push只当前同名分支；不merge/rebase/amend、main或强推。完成后准确SHA文档实审，不自动开工下一工程。

## 1. W1：原件与实际基线

由你定位Owner直接附的ZIP并在仓库外解压，不要求Owner手动解压或填写本地路径。完整读取本包10份文件；SHA256SUMS只列另9件，清单自身另计指纹。检查包内UTF-8、路径及载荷摘要。

重新核对实际HEAD／branch／status／普通和cached diff，读取AGENTS要求的正式入口及当前DEC/UIR与相关P/R/S事实。工作区有非本任务修改则先报告，不reset/clean覆盖。核对基线记录三份candidate Git blob；必须与指定起点一致，不从聊天还原文档。

归档本包10份文件到`docs/engineering/world-integration/player-query/adoption/inputs/`，保留目录与原字节，含清单、脚本和approved-documents载荷。原E03-A／R1／预算任务inputs、历史报告和失败记录只读。

## 2. W2：确定技术载荷安装

按BASELINE-AND-INPUTS.json三条source→target安装原字节：
- `approved-documents/player-query-contract-v1.0.md` → `docs/engineering/world-integration/player-query/player-query-contract-v1.0.md`
- `approved-documents/player-query-field-contract-v1.0.json` → `docs/engineering/world-integration/player-query/player-query-field-contract-v1.0.json`
- `approved-documents/player-query-engineering-contract-v1.0.md` → `docs/engineering/world-integration/player-query/player-query-engineering-contract-v1.0.md`

不新增DEC／UIR，不修改DEC-052、38项和103键配置或真实内容；不注册任何运行时接口、不创建生产源码。

定稿只覆盖同范围技术边界，旧DEC仍为玩法权威。三个文件不是已生产实现证明，3/12/9是基线支持快照；不改成24字段全部PASS。不把未知预测、隐藏感染或未知侧门公开化。

遇到确定载荷与实际有效条款冲突，报告文件／行／具体影响并停在该处，不能自行改载荷、重写原玩法或让旧医院规则吞掉新世界已确认方向。普通附记格式、相对链接和报告错误可在本任务范围自行修订。

## 3. W3：八处入口与历史附记

以下八份既有文档只末尾追加，保留原字节前缀：
- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`
- `docs/engineering/world-integration/route-acceptance/completion.md`
- `docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md`
- `docs/engineering/world-integration/route-acceptance/query-contract-draft-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/next-engineering-contract-draft-v1.0.md`

附记应写清：预算任务主线PASS、F01已关闭而历史exit1保留；F02维持；三份正式query技术合同入口；旧query／next-engineering候选仅该局部被替代；实际query未开工；UI／browser／多标签／O3／Owner体验仍OPEN／NOT RUN。候选24字段原JSON保持原字节，不重写过去的DRAFT状态。

不可用追加说明宣布生产能力已完成，或把headless通过写成试玩通过。不要修改无关阶段史或所有档案的状态标签。

## 4. W4：实际检查、报告与交付

至少执行：

1. 包内部核验，及仓库目标／archive全部字节、SHA-256和Git blob核验。
2. 三载荷全文一致；24字段无遗漏／重复，3/12/9基线统计与五停点一致；源candidate起点blob核验。
3. 精确23路径核验；八原正文前缀完整；其余基线tracked对象不变；无src、依赖、配置、CI、参数和旧测试改动。
4. 所有新相对链接／锚点、UTF-8和新增差异空白检查。普通／cached／起点→最终diff-check均exit0；W01累计如执行仍真实exit2仅原七行，不加例外。
5. `npm run validate:architecture`真实执行。文档任务不要求重跑全量生产测试、历史模型／探针、路线实验、typecheck、build或试玩；未运行则NOT RUN，不复制4318历史数字成新验证。
6. 本包`verify-doc-package.py`为只读辅助，不替代语义／链接／架构和Git审计。任何工具失败保留实录，不通过改校验逻辑伪造PASS。
7. 写`docs/engineering/world-integration/player-query/adoption/DOC-WORLD-QUERY-001-completion.md`和`docs/engineering/world-integration/player-query/adoption/checks.json`，区分作者、主线旧审查与本轮实际证据。报告三份载荷、10原件、八附记、所有实际检查、冲突／未完成及越界检查。
8. 普通commit／push只当前分支；核对最终完整SHA、parent/tree、远端和status。不要为报告自身SHA循环amend；提交后回执另报。CI若查询须标明准确新SHA实际状态，不能用CI158冒充文档新提交通过。

## 5. 精确路径白名单（23条）

- `docs/engineering/world-integration/player-query/player-query-contract-v1.0.md`
- `docs/engineering/world-integration/player-query/player-query-field-contract-v1.0.json`
- `docs/engineering/world-integration/player-query/player-query-engineering-contract-v1.0.md`
- `docs/engineering/world-integration/player-query/adoption/DOC-WORLD-QUERY-001-completion.md`
- `docs/engineering/world-integration/player-query/adoption/checks.json`
- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`
- `docs/engineering/world-integration/route-acceptance/completion.md`
- `docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md`
- `docs/engineering/world-integration/route-acceptance/query-contract-draft-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/next-engineering-contract-draft-v1.0.md`
- `docs/engineering/world-integration/player-query/adoption/inputs/AUD-7a3acd3-ENG-LONGCHAIN-TEST-BUDGET-001-review-v1.0.md`
- `docs/engineering/world-integration/player-query/adoption/inputs/MAINLINE-WORLD-QUERY-001-ratification-v1.0.md`
- `docs/engineering/world-integration/player-query/adoption/inputs/OWNER-authority-and-scope-DOC-WORLD-QUERY-001-v1.0.md`
- `docs/engineering/world-integration/player-query/adoption/inputs/DOC-WORLD-QUERY-001-task-v1.0.md`
- `docs/engineering/world-integration/player-query/adoption/inputs/BASELINE-AND-INPUTS.json`
- `docs/engineering/world-integration/player-query/adoption/inputs/SHA256SUMS.txt`
- `docs/engineering/world-integration/player-query/adoption/inputs/verify-doc-package.py`
- `docs/engineering/world-integration/player-query/adoption/inputs/approved-documents/player-query-contract-v1.0.md`
- `docs/engineering/world-integration/player-query/adoption/inputs/approved-documents/player-query-field-contract-v1.0.json`
- `docs/engineering/world-integration/player-query/adoption/inputs/approved-documents/player-query-engineering-contract-v1.0.md`

这些新目录只是本任务创建许可，非宣称已经存在。列表之外任何新增／修改都须报告精确冲突；不把整目录或下一工程候选路径当许可。

## 6. 未授权内容

无query生产、P/R/S改写、v4修改、selector实现、UI／React、浏览器IO／多标签、玩家入口、O3、素材制作、第二委托、商城、身体服务、专长规则改变、参数／依赖／CI变更。无main、合并、强推和自动后继工程。

## 7. 最终报告与Owner操作

交付最终完整SHA、父SHA/tree、分支、12项预算任务通过的承接状态、本轮实际修改清单与检查、原件／载荷／前缀／范围核验、推送与远端状态、NOT RUN和停止点。完成即停止，等待当前WebGPT主线准确SHA文档实审；不要要求Owner逐文件或逐命令确认。
