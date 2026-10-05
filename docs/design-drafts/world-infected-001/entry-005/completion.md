# WORLD-ENTRY-005 完成报告

本记录为提交前交付检查；最终完整SHA、父SHA、tree及普通push/远端实证由交付消息和仓库外Git回执给出，不能在本提交自身正文预填其哈希。起点 `9c3c8a8c97c374bd1def6217c691137f3df10096`，父 `84eb6dff5e9d3238c3e651525b6ed28412132549`，起始tree `1333c0031b67ab47a9a0b832d7d372eaaf781079`，新分支 `feature/design-world-entry-005`；src tree固定 `10501d897195173df2023b1ebd73f9f097228512`。

## W1—W4

- W1：[真实复用矩阵](01-current-baseline-and-reuse.md)、[时序](02-combat-lifecycle-and-order.md)、[数据](05-approved-data-and-gaps.md)。旧CTB有真实调度能力；新敌仅静态声明，G2到达首遇标记、挫伤/控制弱点、首绷/日额/份额均需窄适配。
- W2：[唯一事实](03-single-truth-and-effects.md)与[独立v4恢复合同](04-active-combat-save-contract.md)。同一身体/实物/敌人，无第二可编辑快照；治疗后死亡独立新来源，旧H0空steps和旧死亡验真保留；冷expected必须来自文本外。
- W3：[有限结果](validation/results.json)、[原生结果](validation/native-results.json)、[语义负控](validation/negative-controls.json)。脚本/contract/输入共21文件冻结，两个独立Python进程复跑字节相同，原生最终冻结后实跑；异常没有当业务拒绝。
- W4：[集中审阅](00-owner-review.md)、[E02-P→R→S三个完整候选](06-engineering-contracts.md)、[真实体验门槛](07-evidence-and-playtest-gates.md)。既有两个入口仅追加状态；Owner无需新增玩法采纳，新增玩法决策0项。技术定稿待主线准确SHA实审。

## 实际检查

有限106项固定预期全部匹配：36个支持边界、67个预期拒绝、3个UNSUPPORTED；103项有限关系检查不是106项生产实现。原生23项通过，单独统计，不冒充新世界真实CTB/新格式支持。架构命令实际exit0：52 DEC、289 core生产文件。

四类负控各exit1、异常0，具体语义失败ID：

- duplicate-exit：X-repeat-debit、X-replayed-receipt。
- persistent-reset：P-reset-hp/count/risk/intent。
- consumption-rollback：P-reset-first、P-reset-quota、M-origin-rollback、M-first-rollback、Q-rollback。
- binding-acceptance：T-wrong-source、T-wrong-battle、R-bad-revision/risk/battle/queue/entry/execution、R-full-compare、R-dead-wrong-source、R-dead-wrong-battle。

[checks.json](checks.json)保留真实命令、退出码、开发失败和修订。原生开发18/20、19/20的夹具/错误码问题保留；修到20/20后新增观察，再到21/21和23/23。有限从98增加4个死亡来源及4个原值反例到106；原值层首跑104/106的诊断优先级问题也按原预期修正并保留；未改生产规则或原测试，不重跑旧模型。

独立外部审计检查27路径、UTF-8及57条相对链接/锚点、五份归档原字节、两入口字节前缀、1102个范围外Git对象及三种diff检查；暂存和提交blob继续按同一审计复核后交付。原38配置、103键/193叶、限定内容、候选源JSON、DEC/批准合同、src/旧测试/AGENTS/依赖/CI/scripts均不修改。无本轮空白例外，历史W01不扩展。

## 未完成与停止点

起始/最终全量生产测试均NOT RUN，新增生产测试0；生产typecheck/build、浏览器/真实Storage/多标签、Owner试玩均NOT RUN。历史3621与本轮探针不相加；完整五图、九组合、三敌原生接线和分段突破体验仍未验收。没有执行E02/E03，没有注册玩家入口、迁移v3、决定O3或新内容。

实际模型/推理配置未能独立核验，不声称切换。无已发现规则冲突；技术合同和有限证据的限制如上，不能以自洽恢复保证离线全历史认证。仅授权新设计分支普通commit/push，提交前远端及范围门槛须通过；结果见最终交付。完成停止等待当前WebGPT主线准确SHA实文件审查，不自动正式归档或生产工程。


<a id="world-entry-005-r1"></a>
## WORLD-ENTRY-005-R1 完成记录

本段续记返修，不覆盖上文df1c3ff历史。起点df1c3ff6979703b72bf76d73761b3915e59eb5b2，起点父9c3c8a8c97c374bd1def6217c691137f3df10096、tree6262d1aa53a8103f14b6e7e930af95f3bf17ad7d；沿用feature/design-world-entry-005。最终提交的父为该起点；完整最终SHA/tree与普通push／远端回执由最终消息和仓库外记录给出。

F01：逐操作原字段、数值、布尔、容器、选择器及决策边界先验，expected本身严格校验，缺字段／缺锚明确语义拒绝。F02：死亡trace直接使用真实场次前态，联结独立终局锚、执行及entryRevision；不复制首场、不删除sourceBattle检查，不重算任何效果。首场、再入和后续场次合法死亡保留；正常H0空步骤、E0到达及HP0入场前短路保持。

| 实际检查 | 修前／修后 |
|---|---|
| 原34专项原样复现 | 17符合/17不符（12误接受、3异常、2误拒绝），exit1；修后34符合、异常0、exit0，原件不变，与主线无差异 |
| 原106有限项 | 修前106符合；修后原ID/预期/分类全部保留，5个死亡夹具明确纠正真实前态，删除0、替换ID0 |
| 新增有限回归 | 244项：18支持边界、226预期拒绝；净增244；其中31项复用主线固定非UNSUPPORTED见证，不额外累计为独立新能力 |
| 冻结总套件 | 350符合：54支持边界、293预期拒绝、3未支持，异常0；34个输入冻结，两次独立进程输出字节相同 |
| 原生观察 | 修前／冻结后均23/23，新增0、删除0、跳过0；仍是现有CTB/G1/G2/P/R/S观察 |
| 六类语义负控 | 各exit1、异常0；分别检出2/4/5/14/2/4个语义mismatch，合法后续死亡误拒绝亦被检出 |
| 架构 | 实际exit0，52 DEC／289 core生产文件 |

12份本包原件归档，原五份输入保持；旧checks和旧manifest完整装入historical.original。原106分类、34项修前实际输出、5个夹具原／新值、所有最终命令／退出码与摘要分别在[checks](checks.json)、[修订用例](validation/r1-regression-cases.json)、[专项结果](validation/r1-review-results.json)、[冻结记录](frozen-manifest.json)。来源和版本边界仍为技术候选，Owner无需新增玩法采纳；不据有限结果宣布新世界可玩。

最终范围、UTF-8、相对链接／锚点、输入原字节／历史前缀、保护对象和三种diff检查按实际审计写入checks的r1.scopeAudit；暂存及提交对象在普通commit前后继续核对。原38值、103键配置、内容、生产src、测试、正式DEC／已批合同、依赖、CI／scripts不变；无R1空白例外。此前辅助调用ModuleNotFoundError未执行负控，未计通过，经过保留在07。

起始／最终生产全量测试均NOT RUN，新增生产测试0；生产typecheck/build、新世界真实CTB、浏览器、真实Storage、多标签和Owner试玩均NOT RUN。未执行E02-P/R/S或E03，未决定O3，未启动正式归档。实际模型／推理配置无法独立核验，不声称切换；无发现已批规则冲突。完成授权范围后仅等待当前WebGPT主线准确SHA专项复审，不自动下一工程。

首次348项冻结与暂存审计通过后，最后相邻检视补上活态场次ID—入场revision关系及两项反例；中间实际结果仍保存在freeze-1和manifest历史，最终重新冻结350项双跑与23项原生观察。未以旧结果代替新代码验证。

最终工作区及暂存对象实审：33/36白名单路径、253相对链接／锚点、34冻结输入、12新／5旧原件与历史前缀、1107范围外Git对象均通过；普通／基线／cached diff --check均exit0、无新增告警。暂存回执已存checks；提交后对象与远端核验在仓库外继续留痕。


<a id="doc-world-entry-005"></a>
## DOC-WORLD-ENTRY-005 技术合同定稿附记（2026-10-06）

[主线技术定稿](adoption/inputs/MAINLINE-technical-ratification-WORLD-ENTRY-005-v1.0.md)以 `464b59d657184636b897f72375eb6b61bd2c5786` 的[R1专项PASS](adoption/inputs/AUD-464b59d-WORLD-ENTRY-005-R1-review-v1.0.md)为依据，关闭F01／F02。本次只正式安装五份技术合同，不新增玩法、DEC或参数，Owner无需新增玩法采纳。

当前同范围正式入口：[P→R→S批次门槛](../../../engineering/residence-foundation/active-combat-batch-plan-v1.0.md)、[E02-P纯核心合同](../../../engineering/residence-foundation/active-combat-core-contract-v1.0.md)、[活战斗时序合同](../../../engineering/residence-foundation/active-combat-lifecycle-contract-v1.0.md)、[E02-R恢复合同](../../../engineering/residence-foundation/active-combat-restore-contract-v1.0.md)、[E02-S会话合同](../../../engineering/residence-foundation/active-combat-session-contract-v1.0.md)。

上文原WORLD-ENTRY-005及R1报告、106／350有限项、23项原生观察、修前失败与冻结结果均保持原字节、原提交与原证据身份。本轮没有重跑模型、探针或改写这些结果，也没有将主线专项复审计作作者新增测试。

本次[归档报告](adoption/DOC-WORLD-ENTRY-005-completion.md)与[实际检查](adoption/checks.json)独立记账。E02／E03、玩家入口、浏览器存储及多标签未执行，O3未决定；不承诺永久维护开发格式，不自动进入生产。当前停止点为WebGPT主线准确SHA文档实审。
