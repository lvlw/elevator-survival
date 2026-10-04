# DOC-WORLD-ENTRY-003-ADDENDUM-01：身体步骤按来源分支校验与原任务续办

版本：v1.0；日期：2026-10-04。性质：**主线确定载荷校勘与续办，不是新Goal、玩法变更、生产授权或检查失败豁免。**

本补充由WebGPT主线依据Owner已采纳的WORLD-ENTRY-003-ADOPTION v1.0、现有任务下发权限与原DOC-WORLD-ENTRY-003授权直接下发。无需再次申请授权，也不要求Owner重新决定正常返回是否补夜。原任务其他规则、Git限制、证据和停止点保持。

## 1. 确定处置与覆盖关系

原包DEC-051 C09和A契约§3把R1“死亡提案非空步骤”泛化成所有受控结果的共同前提；恢复合同§3也存在同类泛化表述。实际固定基线G1正常返回合法产生`steps=[]`，原测试明确断言为空。主线修订的是自己提供的归档文字，不能让Codex改G1、测试或补虚假步骤迁就载荷。

本补充规定：

- 正常H0成功／主动失败返回：当前G1身体步骤必须为`steps=[]`，正常生还、独立来源和前态、body/cycle保持及return-due绑定仍严格验证；只承接一次适用revision，不能追加夜、假BodyStep、noop或伤害。
- 真正死亡提案：非空且与G1/G2实际来源、结果及HP0短路一致；空、畸形或不一致的步骤仍拒绝。合法HP0仍一次消费，原R1保证不放宽。
- 实际休整／截止日结：保留原G1/G2产生的应有步骤，不能因为正常返回允许空步骤就免除日结。身体步骤不是钱包／实物／关闭事务日志，空身体步骤不代表跳过完整终局。

新增的矩阵文字是对原T04/T05验收边界的消歧；**本次仅文档，不执行或新增生产测试。**

效力优先顺序：本补充明确替换的载荷／路径及续办条件 > 原DOC-WORLD-ENTRY-003任务书、BASELINE中的对应项；其余按原任务执行。本补充不改Owner批准原话、获批稿、原DEC-001—050或原G1契约，不撤销此前R1专项PASS。

## 2. 从现有暂停成果继续

保持HEAD和最终提交预期父SHA：`c67fd4117065e2e0dbd1117cae4fbfaa83791599`。保持分支：`feature/design-world-entry-003`。

先重新读取实际仓库、AGENTS、HEAD、branch、status、普通／cached diff与远端引用，不能仅引用报告。主线本轮确认目标远端仍在该基线；用户本地磁盘未由主线访问。

Owner带回的暂停记录为：已有11件原始输入及completion/checks共13个本任务未跟踪文件，无已跟踪修改、无暂存；不得reset、clean、stash、覆盖或丢弃。核对实际文件归属和原件字节后，允许从这份本任务未完成工作区直接继续。原任务“干净开工／目标不存在”只针对最初开工，不用于否定已核实的本任务暂停成果。若出现非本任务改动或不同HEAD，停止报告具体冲突，不自动merge/rebase。

已完成的原11件归档、10项摘要和四参数检查可以保留为本任务此前执行记录；最终按有效输入和全部实际目标重新完成必要的整体检查。不重建分支/worktree，不另做“解除阻塞”小提交。

## 3. 输入与精确安装规则

本补充包只有6件：本指令、AMENDMENT-AND-INPUTS.json、SHA256SUMS.txt及approved-documents下三份修订载荷。新清单覆盖其余5件，不自哈希；新manifest列明旧／新载荷大小、SHA-256、Git blob和完整43条有效路径。

**原包及已归档11份原件全部保持原字节，包括原approved-documents、BASELINE及旧SHA清单。不要将新包覆盖解压到旧目录，不给旧原件“更新摘要”。** 原包保留为历史输入，三份旧载荷不再作为本轮对应正式目标的安装来源；该局部覆盖由本补充和新摘要可追溯。

| 正式目标 | 本轮有效安装来源及动作 |
| --- | --- |
| docs/05-design-decisions.md | 固定基线Git原字节＋恰两个LF＋本补充approved-documents/DEC-051-append.md；原001—050仍为完整前缀 |
| docs/engineering/residence-foundation/terminal-core-contract-v1.0.md | 与本补充approved-documents/terminal-core-contract-v1.0.md逐字节相同 |
| docs/engineering/residence-foundation/terminal-restore-contract-v1.0.md | 与本补充approved-documents/terminal-restore-contract-v1.0.md逐字节相同 |
| docs/content/infected-terminal-core-test-config-v0.1.json | 继续使用原包对应载荷，字节不变 |
| docs/engineering/residence-foundation/terminal-batch-plan-v1.0.md | 继续使用原包对应载荷，字节不变 |

三份修订载荷是全文替换输入，不是让Codex自己补丁改文。正式文档尚未安装提交，因此目标文件名／合同v1.0和DEC-051编号不改；校勘身份由ADDENDUM-01明确记录，不新增DEC-052，不修改格式家族、formatVersion=2、四参数或A→B→C次序。

原任务所有“全文匹配五份载荷”和BASELINE payload摘要校验改为**本表有效映射**：三份用本补充，两份用原包。原10项清单仍只负责旧11件历史输入完整性，不再用旧三份payload摘要要求新正式目标。不得同时要求正式目标既等于旧文又等于新文。

## 4. 有效白名单：原37条＋下列6条＝43条

原37条路径及其append/prepend/copy模式全部保留，仅替换§3指定的三份载荷。为可追溯归档新增且仅新增：

```text
docs/design-drafts/world-infected-001/entry-003/adoption/amendments/step-semantics-01/DOC-WORLD-ENTRY-003-ADDENDUM-01-v1.0.md
docs/design-drafts/world-infected-001/entry-003/adoption/amendments/step-semantics-01/AMENDMENT-AND-INPUTS.json
docs/design-drafts/world-infected-001/entry-003/adoption/amendments/step-semantics-01/SHA256SUMS.txt
docs/design-drafts/world-infected-001/entry-003/adoption/amendments/step-semantics-01/approved-documents/DEC-051-append.md
docs/design-drafts/world-infected-001/entry-003/adoption/amendments/step-semantics-01/approved-documents/terminal-core-contract-v1.0.md
docs/design-drafts/world-infected-001/entry-003/adoption/amendments/step-semantics-01/approved-documents/terminal-restore-contract-v1.0.md
```

补充包6件按自身相对目录原字节归档至`docs/design-drafts/world-infected-001/entry-003/adoption/amendments/step-semantics-01/`，不用归档ZIP、源码副本或仓库外校验脚本。完整路径并集见manifest的effective_allowed_paths，目录名不作递归白名单。

原37条的报告路径继续使用：

```text
docs/design-drafts/world-infected-001/entry-003/adoption/DOC-WORLD-ENTRY-003-completion.md
docs/design-drafts/world-infected-001/entry-003/adoption/checks.json
```

报告保留本次暂停经过和此前真实检查，追加ADDENDUM-01处置、三份旧新摘要、43条有效范围和实际续办检查结果。原11件＋补充6件共17份归档原件相互独立；原输入中的旧“非空”文字可以保留为历史，但任何新当前入口都必须指向修订后的正式目标，不能仍称旧载荷适用于所有提案。

## 5. 只读核对及文档验收

固定`c67fd4117065e2e0dbd1117cae4fbfaa83791599`读取以下实际源码，不修改它们：

```text
src/core/character-cycle/cycle.ts
src/core/character-cycle/cycle.test.ts
src/core/character-cycle/types.ts
src/core/residence-location/types.ts
```

最小语义对照：G1 normal-return不调用settleBody、保留初始化steps=[]并建立return-due；Day7正常返回原测试断言空步骤；合法期限生还有有序日结，致死结果有真实HP0短路。G2步骤是BodyStep对象，不抄有限Python字符串模板；原R1的固定producer表示不是生产格式。

文档层必须实际检查：

1. 原包10项摘要及11件归档字节仍匹配；补充5项摘要及6件归档字节匹配。检查旧新payload差异仅为此处步骤分流、对应验收消歧，没有价格、物品处置、日期或版本改变。
2. DEC完整旧前缀和精确追加公式；A及恢复合同完整匹配新载荷；其余两载荷匹配旧包；四值120/0/2147483647/20及G1原34值不变。
3. 三份修订目标都区分正常生还空步骤、实际日结步骤和死亡非空步骤；新增采纳附记不重复原泛化。引用旧输入的同名文件按“历史已被本补充局部替换”解释，不改原件掩盖历史。
4. 正式链接以实际目标位置检查；新补充归档中的三载荷链接也按目标映射解释，不因为它们在amendments目录就改写原字节。43条范围及所有保护对象检查；10原前缀、9原后缀规则保持。
5. 实际执行原任务的`npm run validate:architecture`与普通、cached、基线及提交后diff检查；保留真实退出码，不放宽断言、过滤告警或绕过hooks。临时脚本和详细日志放仓库外。

不运行生产测试、npm run check、模型/API探针、build、浏览器或Owner试玩来补本轮成绩，全部按实际写NOT RUN；没有新增生产测试。原task要求的其余验收、原文保全、来源分层及未批事项检查继续完成。主线本次只读核对源代码与测试文字并校验输入／修订包，未在用户环境执行命令；不要把它计为作者原生测试通过。

## 6. 完整交付与Git权限

无需再申请授权。把本补充与原任务合并为同一次DOC-WORLD-ENTRY-003完整交付：完成剩余归档／同步、自查修订、实际文档和架构检查后，允许一次普通commit及本分支普通push。可继续采用原建议commit消息。

```text
git push origin HEAD:refs/heads/feature/design-world-entry-003
git ls-remote --heads origin refs/heads/feature/design-world-entry-003
```

保持最终父SHA为`c67fd4117065e2e0dbd1117cae4fbfaa83791599`；不为本补充先单独提交、不为最终SHA自引用amend或另建回执commit。网络续办仍按原任务限制，查询失败如实报告；不推main／其他分支，不合并、不强推、不改历史或Git配置，不绕过hooks。

最终报告标题为DOC-WORLD-ENTRY-003 + ADDENDUM-01，提供起始／最终完整SHA、父/tree、实际路径、三载荷新摘要、17份原件保全、步骤语义消歧检查、架构/diff/链接结果、推送和真实远端、未完成项及停止点。提供一份最终报告即可，不必中途单独确认“非空已改”。

**交付后停止，等待当前WebGPT主线准确SHA文档实审。不执行A/B/C，不改生产、批准玩法、参数、保存格式实现、UI或发布O3，不进行关机／重启／定时操作。** 文档实审通过后，再由主线按既有权限另下发A完整工程。
