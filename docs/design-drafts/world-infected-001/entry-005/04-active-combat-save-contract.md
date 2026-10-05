<a id="doc-world-entry-005"></a>
## DOC-WORLD-ENTRY-005 技术定稿附记（2026-10-06）

[R1专项实审](adoption/inputs/AUD-464b59d-WORLD-ENTRY-005-R1-review-v1.0.md)确认准确SHA `464b59d657184636b897f72375eb6b61bd2c5786` 为限定PASS，F01／F02已关闭；不是整个世界或生产实现验收。[MAINLINE技术定稿](adoption/inputs/MAINLINE-technical-ratification-WORLD-ENTRY-005-v1.0.md)确定独立v4及E02-P→E02-R→E02-S逐项准确SHA停审，不新增玩法、DEC或参数；Owner无需新增玩法采纳。

正式技术依据：[P→R→S批次门槛](../../../engineering/residence-foundation/active-combat-batch-plan-v1.0.md)、[E02-P纯核心合同](../../../engineering/residence-foundation/active-combat-core-contract-v1.0.md)、[活战斗时序合同](../../../engineering/residence-foundation/active-combat-lifecycle-contract-v1.0.md)、[E02-R恢复合同](../../../engineering/residence-foundation/active-combat-restore-contract-v1.0.md)、[E02-S会话合同](../../../engineering/residence-foundation/active-combat-session-contract-v1.0.md)。

下方有限dead恢复的 `expected.current`／`case.before` 是独立TEST夹具；正式生产恢复按恢复合同的最小外部锚及实际场次核验，不要求永久保存完整before。v4由主线技术定稿，未注册运行时；旧v3含义保持不等于承诺永久维护所有开发格式。

本次文档交付仍待当前WebGPT主线准确SHA文档实审；其后另行下发E02-P完整任务，不自动开工。E02／E03、玩家入口和浏览器未执行，O3未决定。[本轮报告](adoption/DOC-WORLD-ENTRY-005-completion.md)与[本轮检查](adoption/checks.json)只记本次实际文档核验。

以下原文（含R1附记）逐字节保留；其中“候选／待审／未定稿”、旧通过和旧失败均为当时历史状态，当前技术合同状态以上述附记为准。

---

# W2 — 活战斗恢复与会话合同候选

TECHNICAL DRAFT；具体联合类型见[03](03-single-truth-and-effects.md)。起点源码只注册residence-headless 1/2/3；`src/state/residence-save/{types,terminal-types,supply-types}.ts`实际常量分别1/2/3，4仅出现在拒绝测试。推荐同family独立`formatVersion:4`，未在本批注册。原v3永久保持本次稳定四态定义，不暗加活战斗字段。

## envelope与支持矩阵

候选精确外壳`{format:'elevator-survival.residence-headless',formatVersion:4,state:CombatValue}`，无额外键。所有union逐层strict；旧receipt不转换，新combat-death单独验证。受控content/规则/103配置/38配置/随机算法版本绑定由policy而非文本选择。

| 边界 | 保存／恢复 | 处理方式 |
|---|---|---|
| first-hub、living-hub、稳定active-world | 是 | 完整既有历史、来源与周期验证；combat=null或stable判别 |
| 入场第一玩家决策点、每次动作后的玩家决策点 | 是 | site.pending仍为同enemy的combat-required，combat=decision；hp和敌hp均正，current=playerNext<=enemyNext |
| 活pending但尚未初始化队列／敌响应drain／退却准备 | 否 | 同步事务内跑完至决策点或终局；不能先安装再用监听器补结 |
| 胜利／退却结束 | 是，合并成稳定驻留 | 消费一次ExitReceipt，清combat、清pending、归还真实节点/敌人，费用已结；无“待扣费的胜利” |
| 合法死亡 | 是，仅final dead | 当前site=null，归档现场与新来源非空trace相连，关闭及处分已完成，不保存hp0活动态 |
| 任意v1/v2/v3装到v4入口或v4给旧入口 | 否 | 显式版本拒绝；没有迁移、猜版本、清槽、fallback new或对旧测试放宽 |

防御在一次完整动作内被消费或到期；逃跑准备同步结完，故保存值不含可编辑temporaryDefense/escapeProgress。队列不是客户端传入意图，也不恢复一个已到期但未处理的敌行动态。

## 绑定、队列与随机连续性

EntryWitness精确字段：`binding、battleId、entryRevision、fromNodeId、toNodeId、edgeId、priorEncountered、priorEnemyActionCount、priorRiskDrawIndex、arrivalBodySteps`。from/to必须为实际移动边两端；新current位置是to，持续敌人实例属于该节点，同executedmission/config/catalog。entryRevision只来自真实移动计划；from不能从“默认上一安全点”猜测。

BattleDecision仅存相对本场`currentCtb/playerNextActionCtb/enemyNextActionCtb`和当前checkpoint；没有第二enemy或body。决策点要求HP>0、敌HP>0、未关闭、pending绑定相同、enemy已遇未死；current=playerNext<=enemyNext，所有数值安全整数，时钟差计算预查溢出。稳定点不能残留活battle或重复exitId。

DecisionWitness字段：`kind:entry|action、actionRevision、inputIntent、startCtb、endCtb、playerNextBefore/After、enemyNextBefore/After、delayApplied、enemyActions[]、useDispositionIds`。enemyActions逐条记录`actionId、atCtb、persistentCountBefore/After、riskBefore/After、injury/exposure trace引用`；必须按已批动作周期推进，time增量只能来自相应action CTB或本次合法延后。只保存最近checkpoint，Entry与ClosedBattle摘要保留；不逐步重跑整场证明。

风险候选沿用现有统一随机算法及按enemy/actionCount/actionId/purpose地址化的子流，scene域换成受控的具体execution＋catalog稳定域，**不含battleId／日期／重入次数**。每条原生子流drawIndex仍0；site.riskDrawIndex作为累计真实风险检查数唯一事实，在实际检查时单调增加，checkpoint记录其区间用于核验；不把它误传成旧每子流游标。原始无暴露跳过该项；伤势降至none沿用旧调用仍有记录。累计值与持久行动count/意图及记录联合验，不凭cursor单独“证明随机”。致死直接伤害依旧引擎短路，不推进后继intent/count；死亡trace明确记已发生攻击，不能恢复后再执行。

原记录不足以重建所有过去风险检查时不能杜撰：从新E02首次真实动作开始形成新证据；本期没有旧v3迁移承诺。所有现有来源drawIndex与敌风险分域；搜索、消费、读档和只读预览不能推进战斗随机。生还退却保留risk；胜利不可再入，死后不重开。

## 独立expected与保证边界

候选`CombatExpectation`精确组成：既有`identity/phase/revision/cycle/missions/initial`，加受控`configurationId/contentId/catalogVersion/randomAlgorithmVersion`及`boundary:stable|active|dead`。active另带`battleId/entryRevision/entryEdge/from/to/enemyId/queue/intent/count/risk`的完整锚；dead另带最新closure binding/outcome/source/battleId及trace摘要。外部可选择预持有完整CombatValue作为同进度锚；必须先于读入候选存在。

冷启动由composition的无文本参数`provideColdExpectation()`提供，测试可由先前真实已提交值/受控初始材料生成后单独保有。新owner不得读到字符串后复制其字段自建expected。first启动仍仅真read-null和受控初始发放；读取失败/损坏/未知版本不能免费重建。

同进度`restoreCombatCandidate(raw, independentCommitted, expected, policy)`对两个完整值独立校验再全值相等；旧关闭、余额、所有物／消耗／样本／敌人事实不能因局部expected相同被回滚。冷启动只有外部锚和存内证据时，保证锚定字段及内部一致性；如果连同历史和外部材料都被重写，没有离线全历史真实性／防回滚保证。任何hash是完整性比对，不是签名或真实性证书。

浏览器如何持久取得独立expected、跨设备、多标签和O3均未授权，故不承诺“直接浏览器读一个文本即可首次恢复v4”。这不阻止headless用独立TEST端口验证恢复合同。

## 唯一current与完整事务

候选S门面沿用同一个`ResidenceSessionDomain`的占用协议；v1/v2/v3/v4同时尝试占有同域第二owner应拒绝，不新增单独combat domain。当前domain实现不需要改玩法，必要共享代码抽取保持原路径行为。

一次命令：busy→strict intent/fullbefore→真实P组合→若HP0消费原death计划→assert能力与结果连续性→R全聚合验证→预编码成功→唯一current一次安装→write尝试→只读notify→释放busy。若validate/producer/aggregate/encode失败：零安装、零write、零notify。死亡只提交最后dead，没有临时hp0活动current。

写失败后最新内存及revision/receipt仍生效，标记save-failed；允许从此最新内存继续下一合法命令。`retrySave`只核验、编码、write最新current，不重复CTB、抽签、用药、扣E、奖罚、日额、安装或通知；其失败也不回滚。write及notify内部重入命令/创建/恢复/重试都BUSY；监听报错隔离且不成为玩法事务。

恢复只安装已验证候选，不重演effects。关闭态没有旧site可操作入口；旧active计划无法覆盖closed。E02-S须原生测入场→决策→退却→实际休整→再入→胜利/死亡→冷恢复及多次写失败组合；本轮有限事件表仅约束次序，当前S原生N20只证明已有稳定命令故障语义。


## R1 独立锚与实际场次（技术候选，取代旧检查器的固定首场做法）

expected自身也须strict校验：安全整数revision、真实布尔enemy标记、整数队列、phase对应的null／数组分支，提供current时先验完整原值及其与外层锚的一致性。Python的True==1、False==0不能证明一致；terminal必要键验证在任何下标访问之前。

本轮有限形状保持：dead冷恢复仍需要候选外expected.current作为终局锚，并需要case.before中的该场combat前态作为入场／原身体证据；缺任一者明确语义拒绝。它们是独立TEST输入，不是新增生产保存字段。active冷恢复可只持现有最小锚、current=null；同进度恢复必须有完整current。候选更一般的冷启动最小材料合同不因此被改成“永远必须全量committed”。

terminal.battleId同时匹配该场前态和独立终局锚，binding匹配执行；入场revision绑定场次、终局revision接续该动作，node使用实际场次。再入场及后续场次可合法死后冷恢复／同进度恢复，敌count/risk不归零；错误执行／场次／缺独立锚仍拒绝。不从候选复制expected，不删除绑定，也不从示例首场补造历史。

原106中5个死亡恢复夹具曾以stable H1/revision10作before，却带battle11终局；已明确纠正为真实combat H4/HP1/revision11→dead revision12，保留原ID、trace及接受／拒绝预期。旧／新完整夹具与理由见[修订账](validation/r1-regression-cases.json)，原件／历史不改。

活态候选及提供的完整独立锚还须各自验证battleId与execution／entryRevision／enemyId的关系；相同错误ID同时出现在两者中不能靠等值放行。最小冷锚、完整冷锚分别有错入场revision反例，合法第二场活态继续保留。
