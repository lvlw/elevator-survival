# DOC-WORLD-ENTRY-005 准确SHA文档实审 v1.0

审查日期：2026-10-06。
结论：**PASS；正式技术归档通过，可另行下发E02-P完整工程。**

## 1. 准确基线与结论边界

- 仓库：`lvlw/elevator-survival`。
- 受审SHA：`4166fb25ab2898ca602043fbddacbb88d3444fdf`。
- 父SHA：`464b59d657184636b897f72375eb6b61bd2c5786`。
- Tree：`88f85400fe094918c122bab87a6384eb97f7291f`。
- 远端分支：`feature/design-world-entry-005`，读取时指向受审SHA。
- src tree：`10501d897195173df2023b1ebd73f9f097228512`，与已审E01-S相同。

通过的是32路径范围内的技术合同归档，不是E02生产实现、活战斗恢复、浏览器或完整世界体验。没有新增玩法采纳要求；不新增DEC-053，不修改DEC-052／38值／103键配置。E02-P/R/S仍分别授权与准确SHA停审。

用户本地工作区干净、暂存和push经过来自作者报告；主线没有访问用户磁盘。本轮主线独立读取GitHub提交、远端引用、root tree、归档目录和正式正文。

## 2. 五份正式正文

五件均以实际完整正文阅读，并与本会话所附DOC任务ZIP的确定载荷独立重算Git blob比对：

| 正式文件（均在docs/engineering/residence-foundation/） | Git blob | 结果 |
| --- | --- | --- |
| active-combat-batch-plan-v1.0.md | a8c09b916fdd29a5ddf9cedd1dd0349764aa0421 | MATCH |
| active-combat-core-contract-v1.0.md | 227b7438abda5b9a3abf645d4d92942379bcb638 | MATCH |
| active-combat-lifecycle-contract-v1.0.md | 91ac8ef6ed47b059e4ac55af761a80a034f9d1fa | MATCH |
| active-combat-restore-contract-v1.0.md | 0a3bbca9ad13daf4cc48719f04611e84817238ec | MATCH |
| active-combat-session-contract-v1.0.md | 0adc431f0878a12f610af9e1957c1be9d080734d | MATCH |

时序／来源合同保留真实移动前首遇判断、三敌独立profile、同点优先、HP0优先和胜退一次E；不借旧Scene Time或额外行动流血。

纯核心合同明定唯一body／实物／持续敌人，新CombatEncounterSnapshot只作瞬时求值投影；typed combat-death与旧单调身体步骤分支隔离，消费原计划而不重跑CTB／随机／治疗。

恢复合同明定独立v4、实际场次及严格expected，并明确Python夹具的完整case.before／expected.current不是生产必须永久另存的全部前态。v1/v2/v3原义不放宽，双向版本拒绝，浏览器/O3及永久兼容承诺没有混入。

会话合同仍为唯一domain/current、完整验证及预编码先于提交、写失败保留内存、retry不重放。P不执行R/S；普通commit/push不等于merge或main授权。

## 3. 原件、变更与历史

原DOC ZIP的SHA-256实际重算为：
`00d2bfc6429606e6d4ddf303e61e0aa5e52329c81d0002df029d9503b1f9b6d1`。

原ZIP内11文件以字节重算整个Git目录：
- inputs tree：`f4f3b1e6101a20cf4da11c24e81d02a18715a482`，与远端目录一致。
- approved-documents tree：`3a34f75a8f47e4f2822c238b76e51a9fa002d273`，与远端子目录一致。
- 六件顶层原件blob逐一匹配；五件载荷由子目录整体指纹及正式目标blob分别覆盖。

主线阅读实际提交变更清单与附记hunk：32条路径对应11原件、5正式合同、2报告和14入口。旧入口使用8处前置／6处尾部附记；实际差异没有把旧候选、旧失败或历史结果改成已实现。checks.json为165118字节，GitHub提交patch为null；主线没有将缺patch假称已全文读取。作者报告的完整仓库审计与全量链接检查仍仅作为作者证据。

root tree同时保持src、AGENTS、package.json/lock、scripts、.github不变。正式DEC及参数未出现在变更清单；本轮未另外下载整份远端仓库逐对象重算1129个保护对象，不宣称完成该全量复跑。

W01仍仅原E01-R任务书7—9行、原E01-P审查报告3—6行的七处硬换行。它们不在本次新增差异中；没有新增例外或修改检查配置。作者的本轮增量干净不等于从8c19ca0累计比较也干净。

## 4. 主线实际执行与未执行

| 证据 | 本轮状态 |
| --- | --- |
| 原DOC ZIP supplied verifier --package-only | 实际32项通过；仅包内部检查 |
| 原ZIP→远端Git指纹核验脚本 | 实际40项全部匹配；含包摘要、11原件目录、5正式目标等，部分与package-only检查重叠，不相加包装 |
| 五份正式合同全文、实际变更及14附记 | 已阅读／定点核对 |
| 作者--repo/--ref提交后130项、独立129项审计及154链接 | 主线未完整复跑；作者证据 |
| 主线完整仓库克隆 | DNS解析失败，未形成完整本地Git仓库；随后使用GitHub连接器读取准确对象 |
| 生产npm/架构/typecheck/build、CI、历史350模型／23探针 | 本轮主线NOT RUN；不把历史CI或作者架构结果算新增 |
| 新世界真实CTB、v4 IO、浏览器、多标签、Owner试玩 | NOT RUN，后续Gate |

复现材料中的verify-fingerprints.py、remote-fingerprints.json、fingerprint-results.json及package-only.json精确记录方法。远端指纹是主线连接器实际返回值的转录；脚本重算输入原字节，不伪装为能自行联网验证远端引用。

## 5. 下一工程的必要接缝核对（不是本次生产实审）

为编制E02-P任务，另外定点读取当前AGENTS及核心实际入口：
`src/core/combat/combat.ts`、`combat-effect-application.ts`、`combat-dependencies.ts`；
`src/core/residence-supply/types.ts`；`src/core/residence-task/actions.ts`；
`src/core/residence-terminal/supply-terminal.ts`；`src/content/infected-world-v0.1/initial.ts`。

两处需要提前给清写权限：
1. 旧resolve内部调用applyCombatEffects，而后者会再次构建计划比较effects；E02死亡消费者不得借该路径重算。新受控一次求值路径可窄抽取共享应用器，但旧任意effects输入的验证不可删，不能公开skipValidation开关。
2. 任务actions同时耦合旧SupplyValue协议、authority、readSupplyValue及签发器；新协议若要战后继续真实任务，必须允许旧P任务／来源与供给的无版本共用逻辑窄抽取。不能一面要求继续真实生产、一面把这些必要路径全部禁止，也不能删除combat/history伪装旧SupplyValue。

上述属于已定P合同的技术实现边界，不新增规则。任务将明确列入必要路径，同时保护G1、G2、身份、旧reader/session与全部既有测试。

## 6. 可核查仓库入口

所有引用固定到受审SHA，而非分支浮动版：
- commit：`https://github.com/lvlw/elevator-survival/commit/4166fb25ab2898ca602043fbddacbb88d3444fdf`。
- 正式合同：`https://github.com/lvlw/elevator-survival/tree/4166fb25ab2898ca602043fbddacbb88d3444fdf/docs/engineering/residence-foundation`。
- 原件：`https://github.com/lvlw/elevator-survival/tree/4166fb25ab2898ca602043fbddacbb88d3444fdf/docs/design-drafts/world-infected-001/entry-005/adoption/inputs`。
- 作者报告：`https://github.com/lvlw/elevator-survival/blob/4166fb25ab2898ca602043fbddacbb88d3444fdf/docs/design-drafts/world-infected-001/entry-005/adoption/DOC-WORLD-ENTRY-005-completion.md`。

**停止点：DOC-WORLD-ENTRY-005文档PASS。主线可按已有权限单独下发E02-P；本报告不独自授予R/S或合并权。**
