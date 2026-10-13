# ENG-RESIDENCE-COMBAT-RESTORE-001-R1 完整限定返修任务书 v1.0

## 0. 一次完成什么

修复R-F01：真实攻击击杀敌人后，本动作流血使玩家HP0，P保留敌人死亡及none pending；v4不得将该合法final dead误拒绝。只修恢复联合条件，不改战斗或死亡规则。

起始SHA：`55fbf0f48e6a76bea3030bd77354528816581776`。
父SHA：`9ada1bd76c768b7bcff676b263e4533854064909`。
Tree：`94b8f203cb97957ddb3ede1598b5e4938f81a7d9`。
沿用分支：`feature/residence-combat-restore-001`，不新建分支／worktree。

无需Owner重新采纳玩法；本任务由主线按已有授权下发。普通commit/push仅限该分支，完成停止，不进入E02-S/E03。

## 1. 开工与真实基线

先定位所附ZIP，在仓库外解压，读取任务书、审查原件、权限、BASELINE和SHA256SUMS。核对实际HEAD、branch、status、diff及实际AGENTS要求的正式背景文件；错起点或出现非本任务修改，保留现状报告，不reset覆盖。

完整读取正式 active-combat-lifecycle-contract-v1.0.md L02/L03、core合同P05、restore合同R02—R06、batch计划，以及当前combat-body-history、combat-history、P的effects/terminal与共享清算。已有规则与schema不需要重开设计。

允许命令级 `VITEST_MAX_WORKERS=2` 执行完整`npm run test:run`作为真实本轮基线，结束恢复环境；不得改配置、测试超时或过滤全量。作者3988及CI153不代替本次开工实跑。

## 2. 精确白名单：最多27条

生产只允许前两条；第二条仅在R-F01实际场次／归档联合约束需要时修改，不要求使用全部路径。原169测试及全部更早测试／helper只读，新增测试用下面新路径。四共享文档和旧MD记录仅末尾追加。

1. `src/state/residence-save/combat-body-history.ts`
2. `src/state/residence-save/combat-history.ts`
3. `src/state/residence-save/combat-review-simultaneous-death.test.ts`
4. `src/state/residence-save/combat-review-simultaneous-purity.test.ts`
5. `src/state/residence-save/combat-review-simultaneous-fixtures.ts`
6. `docs/03-architecture.md`
7. `docs/08-rule-implementation-traceability.md`
8. `docs/design-drafts/world-infected-001/01-world-overview.md`
9. `docs/design-drafts/world-infected-001/10-decision-queue.md`
10. `docs/engineering/residence-foundation/active-combat-restore/implementation-notes.md`
11. `docs/engineering/residence-foundation/active-combat-restore/contract-and-support.md`
12. `docs/engineering/residence-foundation/active-combat-restore/completion.md`
13. `docs/engineering/residence-foundation/active-combat-restore/verification-results.json`
14. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/ENG-RESIDENCE-COMBAT-RESTORE-001-R1-task-v1.0.md`
15. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/OWNER-authority-and-scope-E02-R-R1-v1.0.md`
16. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/AUD-55fbf0f-ENG-RESIDENCE-COMBAT-RESTORE-001-review-v1.0.md`
17. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/BASELINE-AND-SCOPE.json`
18. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/SHA256SUMS.txt`
19. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/source/combat-body-history.ts`
20. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/source/effects.ts`
21. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/source/supply-settlement-shared.ts`
22. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/evidence/run-isolated-review.cjs`
23. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/evidence/isolated-results.json`
24. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/evidence/source-integrity.json`
25. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/evidence/input-integrity.json`
26. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/evidence/environment-notes.md`
27. `docs/engineering/residence-foundation/active-combat-restore/r1-inputs/evidence/native-simultaneous-death.test.ts.template`

发现必须修改其他生产源码、schema、policy、expected、原helper或旧测试才能完成，停止报告精确冲突，不能自行扩大范围或临时改后还原。

## 3. W1：先做完整仓库原生复现

将同包`evidence/native-simultaneous-death.test.ts.template`原字节复制到新`combat-review-simultaneous-death.test.ts`，**在改生产代码前运行**，记录每项真实结果及最先失败点。

模板使用真实初配／出发／H1开门、实际入场及三次CTB动作。只有入场前HP6／流血是明确TEST边界；不会清敌、手造死档或补body事件。另用HP7对照保留玩家生还胜利。

主线17项是依赖适配的隔离检查，原生模板只做过语法转译，未做原生运行。不要为了匹配主线数字造失败。如果模板前置依赖、API、类型或断言有问题，保留原件和首次输出，说明原因后只修新增测试夹具；这些不计语义检出。若真实P已拒绝合法双方归零且因此无法生成final dead，报告准确拒绝点，不能擅自改P或伪造后态。

原模板期望：P生成final dead、敌HP0/defeated、无生还闭场收据／费用／奖励、归档pending none；其完整v4聚合／编码／解码／same-progress应接受。原敌存活死亡和生还胜利也保持。模板是最小起点，不替代本批全部相邻验证。

## 4. W2：最小恢复条件修复与相邻保护

在既有P完整验证之后，以这条实际combat-death的entry、decision、归档同一敌人和最终结果联合判断pending：

- 敌仍活：归档必须保留实际对应的combat-required，不可随意clear。
- 本次主要效果确实使该敌HP0／defeated且随后玩家动作流血死亡：归档保留真实none，不复活敌人或恢复不存在的pending。
- 两类都必须是final dead、角色HP0、真实非空typed trace、同一个执行／battle／revision／敌实例／归档位置、正确死亡收据与处分引用。

不能只给所有dead档允许none；不能只看candidate中的一个布尔值。可以复用上游P已经验证的敌状态与DecisionWitness关系，再增加本R分流断言，不重算CTB或伤害。校验不修改任何候选／expected。

不改变正常活战斗停点的严格pending规则；不将同归零归为victory、补胜退精力、发奖励、补抽风险或再关闭一次。不能删除trace、使用伪造source、负伤害、修补字段或从档自身生成独立expected。

保持P原F01/F02/F03、真实立即维修及维修致死；旧G1/P死亡流血／休整来源、Day6/Day7和正常H0空steps保持。

## 5. W3：原生组合、零重放、负控

集中补齐：

1. 原生攻击击杀＋动作流血HP0：真实final dead经aggregate、serialize、deserialize及same-progress均接受；encode/decode再编码字节稳定，输入／expected／committed不变，结果冻结。
2. 对照：同一路线多1HP为真实生还胜利；敌仍活的直接伤害死、动作流血死、治疗后死仍严格接受。至少覆盖首场与后继／再入的本场身份，不能写死护工、首场revision或H4。
3. 反例：敌仍活却none、敌已死却伪造活pending、其他enemyId／node／battleId、复活敌HP、错typed终点／来源／金额／收据、改死为生、未知额外字段。合理利用已有上游拒绝，不以删除P保护制造负控。
4. 新冷恢复点前，外部expected由原始真实生产／提交记录先固定，再准备candidate/wire；保持独立完整committed比较。无法读取的dead对象不能用被篡改后的expected兜底。
5. 独立监测四接口的合法及拒绝分支：CTB求值/计划/归约、P动作/药物/材料、G1/G2、随机、身份激活／终止、IO和通知均无重放。与夹具生产／后续真实动作分开清零，不累加。
6. 至少两类仓库外语义负控：恢复旧过强pending要求，应使合法双方归零正例失败；撤销必要的pending/实际敌终态联合约束，应使对应非法记录被错误接受并产生业务断言失败。若其他层已拦截，选择真正覆盖目标约束的见证，不放松生产校验以凑数字。程序／import／fixture错误不计成功负控。

保持原169项和全部更早用例字节，不修改预期或删测。原P/R1/R2等历史负控若本轮不跑，明确NOT RE-RUN，历史记录保持。

## 6. W4：全量检查、原件和完成报告

本轮新增定向测试、原169项、P原102+58+38、旧v1/v2/v3及E01-R死亡历史和受影响跨模块回归；最终按实际package执行完整`npm run check`，命令级两workers允许，超时／配置／依赖／CI不改。

归档本包14件输入到上述r1-inputs精确路径，原件字节不改；SHA256SUMS不自校验，其他13项逐件核验。原inputs及所有P/R1/R2历史原件保护。

四份共享文档／旧Markdown只追加作者R1状态，不把主线尚未审查写成PASS。verification-results.json保留本批前完整对象，可放historical.e02RDelivery，不用新结果覆盖旧证据。

验证精确白名单、测试/helper原字节、批准合同／配置／core及scope外Git对象、UTF-8、相对链接、实际测试源码与暂存/commit字节。普通/cached/起点至最终增量diff必须exit0。

W01累计比较基线`8c19ca0d28058cf743b41c8547cc2629c8eac767`仍保留真实exit2，仅原E01-R任务书7—9行及旧审查原件3—6行七处硬换行；不扩大，不修改旧原件或whitespace设置。它不是本次返修原因。

## 7. 授权、交付与停止点

允许该分支普通commit及`git push origin HEAD:feature/residence-combat-restore-001`；网络失败允许普通重试。不得merge、rebase、amend、force、推main或旧分支。

最终报告：起始/父/最终完整SHA及tree；真实开工基线；原生修前逐项和修后结果；新增/替换/删除/净增；合法死亡与错误pending成对证据；实际独立expected与零重放；负控真实退出码；全量检查、W01、原件及范围；CI当前实际状态；冲突/未完成项。

未授权E02-S/E03、current、Storage实现、浏览器、多标签、UI、O3或其他玩法。完成即停止，等待当前WebGPT主线准确SHA专项复审，不自动进入下一工程。
