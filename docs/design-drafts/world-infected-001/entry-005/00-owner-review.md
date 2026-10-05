<a id="doc-world-entry-005"></a>
## DOC-WORLD-ENTRY-005 技术定稿附记（2026-10-06）

[R1专项实审](adoption/inputs/AUD-464b59d-WORLD-ENTRY-005-R1-review-v1.0.md)确认准确SHA `464b59d657184636b897f72375eb6b61bd2c5786` 为限定PASS，F01／F02已关闭；不是整个世界或生产实现验收。[MAINLINE技术定稿](adoption/inputs/MAINLINE-technical-ratification-WORLD-ENTRY-005-v1.0.md)确定独立v4及E02-P→E02-R→E02-S逐项准确SHA停审，不新增玩法、DEC或参数；Owner无需新增玩法采纳。

正式技术依据：[P→R→S批次门槛](../../../engineering/residence-foundation/active-combat-batch-plan-v1.0.md)、[E02-P纯核心合同](../../../engineering/residence-foundation/active-combat-core-contract-v1.0.md)、[活战斗时序合同](../../../engineering/residence-foundation/active-combat-lifecycle-contract-v1.0.md)、[E02-R恢复合同](../../../engineering/residence-foundation/active-combat-restore-contract-v1.0.md)、[E02-S会话合同](../../../engineering/residence-foundation/active-combat-session-contract-v1.0.md)。

上述五份文件是同范围唯一有效工程合同入口；下方旧三项合同候选仅保留设计来源，不再作为平级待选或执行依据。

本次文档交付仍待当前WebGPT主线准确SHA文档实审；其后另行下发E02-P完整任务，不自动开工。E02／E03、玩家入口和浏览器未执行，O3未决定。[本轮报告](adoption/DOC-WORLD-ENTRY-005-completion.md)与[本轮检查](adoption/checks.json)只记本次实际文档核验。

以下原文（含R1附记）逐字节保留；其中“候选／待审／未定稿”、旧通过和旧失败均为当时历史状态，当前技术合同状态以上述附记为准。

---

# WORLD-ENTRY-005 — E02合同集中审阅

DESIGN / ENGINEERING REVIEW CANDIDATE，未正式落文、未执行工程。准确起点 `9c3c8a8c97c374bd1def6217c691137f3df10096`；E01-S限定PASS见[主线原件](inputs/AUD-9c3c8a8-ENG-RESIDENCE-CONTENT-SUPPLY-SESSION-001-review-v1.0.md)。

现有系统能做真实稳定驻留动作、来源消费、四态恢复和唯一会话保存；旧医院模块能算真实CTB。当前新世界还不能把活遭遇安装到会话，更没有三个新敌人的完整CTB生产者。**推荐 E02-P → E02-R → E02-S，每项准确SHA实审后才发下一项；活态采用独立v4技术候选，v3不扩义。** 代价是必须改造三个窄接缝：每敌动作数据、唯一事实适配及新来源死亡验真，不能只把旧快照塞进现有Save。

## 已批准，无需重选

[DEC-052](../../../05-design-decisions.md#dec-052)及[Owner实际批准](../entry-004/adoption/inputs/OWNER-approval-WORLD-ENTRY-004-ADOPTION-v1.0.md)优先于旧候选的“待采纳”标签。五图、酒店可绕、本地转运及指定样本、七日、失败不重接、正常H0不补夜、末日先结后召回保持；三专长、三工具、无初粮及电子材料竞争保持。原38值与103键／193数值叶不改；不把H2条件消毒剂变成固定赠送。

胜退按 `max(6,ceil(elapsedCTB/100)*4)` 一次结E，已触发战斗即使E0仍完整处理；快捷药物及日额真实延续。DEC-031/035既有同点排序和死亡优先级可确定本批时序，没有为流程新增玩法选择。

**Owner无需新增玩法采纳：本批新增玩法待决项为0。** 三敌的原生体验与平衡仍须后续复审；若工程发现必须改变已批机制或数值，须另提具体差异，不能把这里的0理解为永久免审。

## 主线技术定稿事项

| 主推荐 | 必须接受的工程约束 |
|---|---|
| [真实入场与CTB](02-combat-lifecycle-and-order.md) | 在实际移动前态取入场来源；G2到达已标encountered，不能误判首入为再入；整个触发及入场只提交一次 |
| [唯一事实与新死亡协议](03-single-truth-and-effects.md) | CombatEncounterSnapshot仅瞬时投影；身体、库存、敌人、日額和来源都只有一份；保留旧死亡验证，不用负伤害表达治疗 |
| [独立v4及expected](04-active-combat-save-contract.md) | 只保存玩家决策点／稳定点／dead；冷expected由候选外受控材料提供；不设计浏览器侧档或迁移 |
| [三项完整合同](06-engineering-contracts.md) | P纯计划、R严格codec、S唯一current分别审查；候选修改路径并非本次或下项自动授权 |

## 两条证据线与未支持

[有限检查](validation/results.json)验证固定边界关系，不生成真实战斗或证明路线可达；[原生观察](validation/native-results.json)调用真实旧combat/G1/G2/P/R/S，旧医院数值与TEST初态明确隔离。四类负控和冻结复跑见[检查](checks.json)、[验证说明](validation/README.md)。没有把历史3621项、旧路线、旧重复供给合计到本轮。

真实新世界三敌CTB长链、九组合完整路线、浏览器／多标签、E03安全查询、Owner分段突破和恢复负担体验仍未验收。旧可见战斗投影仍含raw CTB，不能直接当最终玩家视图。素材、商城、新委托、O3发布与旧槽安排不展开。[完成报告](completion.md)记录实际检查与修订；交付后停止等待当前WebGPT准确SHA实文件审查。


<a id="world-entry-005-r1"></a>
## WORLD-ENTRY-005-R1 限定返修（待准确SHA专项复审）

依据[主线审查原件](r1-inputs/AUD-df1c3ff-WORLD-ENTRY-005-review-v1.0.md)修复F01/F02；原34项在完整仓库修前复现17符合/17不符（12误接受、3异常、2误拒绝），与主线一致。上文106项、四负控及旧交付状态是df1c3ff历史，不代表曾覆盖这些缺口。

当前候选补上逐意图原值／结构检查、决策边界与实际场次死亡锚；正常H0空steps、E0到达、HP0入场前短路、治疗封顶、后续场次合法死亡均保留。没有新增玩法选择，Owner仍无需新增玩法采纳；技术修订仍待主线准确SHA实审。最新分类与未执行项见[本轮报告](completion.md#world-entry-005-r1)、[专项结果](validation/r1-review-results.json)。不自动正式归档或执行E02-P/R/S、E03。
