# W4 — 最近三项工程合同候选

ENGINEERING CONTRACT DRAFT / NOT AUTHORIZED。本批只交下列三项，不执行。主线先准确SHA审本批技术合同并正式定稿精确写入白名单，再分别下发P/R/S；Owner无需重复采纳已有玩法。不存在的前项SHA写待实审，不用设计提交冒充工程起点。

## 共用约束与验收账

规则：[DEC-052](../../../05-design-decisions.md#dec-052)、DEC-049/050/051身份／周期／清算、DEC-031/035/036未被局部覆盖的CTB／防护／伤势／破损规则；[唯一数据](05-approved-data-and-gaps.md)原字节及原38值锁定。旧医院和v1/v2/v3语义不改，正式规则不因候选自动改变。只注册受控headless能力，不接玩家、浏览器、多标签、O3、商城、新世界或新委托。

每项开工先核实际Git、AGENTS、已正式合同和前项准确SHA实审；真实运行起始测试基线。开发／验收命令均为 `npm run validate:architecture`、`npm run typecheck`、定点`npm exec vitest -- run <该批实际新增测试路径>`、`npm run test:run`、`npm run build`、`git diff --check`与暂存检查；记录命令/退出码及起始/最终文件数、用例数、新增/删除/替换/重复复跑，不预填当前历史3621。

交付各自实现说明、支持/拒绝矩阵、完整正反例/组合及实际输出、前后完整SHA/tree/src树、显式文件清单与普通push回执；网络不确认就写UNCONFIRMED。只推该工程任务届时指定的新分支；不推main／本设计分支、不强推、不合并。每项完成立即停在主线准确SHA源码实审，不自动下项。

下列是**后续任务的精确路径候选**，不是本轮写权；新增测试/工程记录目录和名字在任务下发时一并锁定。不得用“整个src目录”授权替代。

## E02-P：活战斗纯计划及真实来源组合

**目标**：由真实初始发放及P移动入场，运行三个已批敌人profile的真实CTB；身体、装备、药物、日额、持续敌人、胜退E及死亡形成单个完整纯计划。它不安装current、不写save、不修改R/S支持矩阵。

**前置准确SHA**：E01-S `9c3c8a8c97c374bd1def6217c691137f3df10096`已限定PASS；开工基线须主线指定含其及本批正式合同的准确提交，**待本批实审与正式落文**，不能自动沿用9c3开工程。

**所有权/API**：采用[03类型与来源合同](03-single-truth-and-effects.md)。候选受控`createResidenceCombatPolicy`、`planCombatEntry`、`planCombatAction`、`assertCombatPlanCurrent`、`consumeCombatDeath`；输入是完整before+authority+严格意图，输出immutable CombatPlan/最终dead计划。public只暴露安全值读取／合法命令资格，不能导出签发器或可上传effects入口。

P稳定生产者必须能接续战斗后的真实身体、来源及敌人。最小建议将既有P的只读facts核验/消费/reducer从完整旧protocol入口中抽为内部共用操作，旧入口仍要求原SupplyValue／原签发能力；新组合在自己的完整CombatValue验证及能力内调用这些操作。不能删掉新history字段伪装成旧SupplyValue取得计划；也不能每个稳定动作另复制一套玩法。返回H0／deadline由同一共用A结算组成新协议计划，新combat-death分支保持独立。

**支持**：稳定移动→立即结果/死亡→首入/再入；玩家决策→真实敌响应；三敌各自伤型风险；快捷绷带/镇痛、首绷、管日额；胜/退/死；战后稳定旧P任务/医疗/维护和G1休整继续。**拒绝**：未结pending跳转、假来源/JSON计划/旧revision、非法原值、无目标/背包远程药、HP0用药、用户指定骰值、敌已死重开、重复费、旧协议混入；中间drain/escape不可保存。

**必要现有改动候选**（行为需适配处不假称永远只读）：

- `src/core/combat/combat-types.ts`、`combat-dependencies.ts`、`combat-snapshot.ts`、`combat-validation.ts`：增加独立受控profile/入场接口，旧接口仍接受旧同值规则。
- `src/core/combat/combat-enemy-action-primary-plan.ts`、`combat-player-action-primary-plan.ts`、`combat-transition-plan.ts`、`combat-effect-application.ts`、`combat-selectors.ts`、`combat-risk.ts`：逐动作数据/伤型/弱点/恢复投影及稳定随机域，真实CTB不可stub。
- `src/core/residence-supply/types.ts`、`validation.ts`、`authority.ts`、`plans.ts`、`allocations.ts`、`medical.ts`、`history.ts`、`controlled.ts`、`cycle-adapter.ts`：提取共同facts/reducer与窄能力组合；保留旧入口限制、消费及首绷验真。
- `src/core/residence-terminal/supply-terminal.ts`、`supply-controlled.ts`：共用终局清算与独立新death消费，旧source验证不扩口。
- `src/content/infected-world-v0.1/enemies.ts`、`initial.ts`：受控新profile绑定；静态旧字段兼容；不把测试初态注册为内容。

**新增候选文件**：`src/core/residence-combat/{types,validation,authority,plans,entry,actions,effects,history,controlled,index}.ts`、`src/content/infected-world-v0.1/combat-profile.ts`；工程发包时逐项展开，未用的不得凑数。定点测试候选`src/core/residence-combat/{entry,actions,effects,history,terminal,integration}.test.ts`，原受影响模块回归保持，新增条件必须有合法对照。

**只读边界**：G1 `character-cycle/`与`residence-energy/`的公式/周期；G2真实移动/pending/knowledge规则及原runtime配置；mission-lifecycle关闭规则；旧scene-combat/SceneTime、v1/v2/v3 reader和session；正式DEC、38及103配置/限定内容、依赖与CI。如需改变上述受保护行为，先由主线审明确差异，不用临时改后还原绕权。

**必须原生验收**：真实H0→H1→开门→H4包含最后正E超余额/E0入场及HP0入场前死亡；三个敌人的首入/再入/意图/挫伤与咬伤、tie/防御/逃跑锁定；heal→伤害死亡、伤害截零、最后击杀却流血死；真实药1单位来源/首绷跨战跨夜/日额只由G1刷新；真实退却→休整→同敌再入→胜/死；退出CTB99/100/101/201边界及一次扣费。组合验证H0空steps、真实截止/休整非空、旧死亡F01相邻原值、旧成功处分不倒改。原有限样本仅给反例，不算这些实现PASS。

**停止**：纯核心结果及源码准确SHA实审；不以纯计划通过宣称保存/会话/全路线完成。

## E02-R：v4严格聚合、编解码与独立恢复

**目标及前置**：锁定经P实审的真实类型与profile，完整实现[04合同](04-active-combat-save-contract.md)。起始SHA **待E02-P准确SHA实审**；不得凭候选字段先写迁移。无current、IO、生产者重放或浏览器自举。

**所有权/API**：候选`createCombatResidencePolicy`、`validateCombatResidenceAggregate`、`serializeCombatResidenceSave`、`deserializeCombatResidenceSave`、`restoreCombatCandidate`；接收unknown/字符串及独立expected，输出只读value/candidate/string，无安装能力。新reader只4；旧1/2/3严格拒绝4，新4拒绝1/2/3。没有同槽自动升级或坏档清空。

**支持/拒绝**：first-hub、stable active、decision active、living-hub、final dead；拒绝未结pending/敌先待结/escape进度、hp0活动态、错队列/entry/execution/config/risk、重复费用、消费回滚、旧history被删除/改写、假dead trace、同进度候选换物换余额、文本自建expected。

**必要路径候选**：新增`src/state/residence-save/combat-{types,schema,policy,validation,history,expected,codec,index,controlled}.ts`，测试`combat-{roundtrip,compatibility,history,expected,regression,purity}.test.ts`。现有`supply-history.ts`、`supply-validation.ts`可窄抽取无版本含义的被动历史检查为新`shared-supply-history.ts`，旧reader入口及其稳定拒绝不改变；若无需抽取则保持只读。P已审types/history/validators、G1/G2/A及所有content/正式配置只读；不能把R验证问题通过重算玩法覆盖原值。

**联合验收**：五类边界冷恢复、同进度完整值对照、外部expected在文本前保有；击退后药/修复/休整再入的真实checkpoint；治疗后致死的类型分支；关闭receipt/样本/余额/处分及来源不复活；风险/行动count/队列/entry联合反例；每个允许停点往返后再交真实P产生同结果；旧v1/v2/v3双向拒绝和正常H0空steps原回归。序列化失败不得造候选支持标志；类型/导入崩溃不能算语义拒绝。

**检查/报告/停止**：按共用全量命令、完整运行基线及support矩阵交源码SHA；待主线实审，不安装current、不接S、不自动G1或O3迁移。

## E02-S：唯一owner、活战斗完整事务与故障长链

**目标及前置**：在同域一个current中接好入场、动作、退却/胜利/死亡、稳定P动作、合法返回/截止与v4冷恢复。起始SHA **待E02-R准确SHA实审**，同时必须含P通过版本；不能先放宽旧S使pending逃过R。

**API及所有权**：候选`createCombatSession(domain, composition)`；composition给受控policy、storage、initial materials和候选外cold expected。`bootstrap/createFirst/dispatch/retrySave/subscribe/getState`语义继承S；getState仅诊断，E03可见查询另门槛。只有此owner安装current，其余P/R/A输出无安装权；域占用与既有版本共用。

**支持/拒绝**：02/04完整允许停点与生产者组合；拒绝多owner、第二bootstrap、跨协议命令/计划、活战中move/rest/return/deadline、输入随意设CTB/骰值、跨execution/旧revision/监听器重入、write失败回滚或retry重演。真HP0只提交最终dead，不先发布半成品。

**候选新增路径**：`src/state/residence-session/combat-{types,commands,composition,initial,expectation,proposals,persistence,session,index,controlled}.ts`，测试`combat-{bootstrap,actions,continuity,restore,failures,reentry,compatibility}.test.ts`；如确有共用抽取，现有`domain.ts`、`supply-proposals.ts`、`supply-expectation.ts`、`supply-persistence.ts`、`supply-session.ts`列为窄改候选。旧S类型支持矩阵和旧三版本能力不扩义；不得新增全局combat Store或独立writer注册表。

**只读边界**：已审P/R、G1/G2/A、配置/内容及浏览器IO。若session需要修改纯规则才完成，退回相应主线契约审查，不在S里补第二结算。

**原生组合验收**：真实初始→移动→入场第一决策→多次敌响应→药物→退却→休整→同敌再入→胜利/死亡→返回或截止→冷恢复。用实际来源/材料/份额，不以fixture清敌代替胜利。每个可存点注入write失败，继续命令再失败后retry只写最新；encode失败零安装；read错误与坏档不new；回调内dispatch/retry/create/restore BUSY；通知异常不回滚已提交结果。spy只计调用，不stubCTB，读取恢复不抽签/用药/扣E/结夜。

**检查/停止**：真实完整新链和旧路径全量回归、准确SHA源码实审；E03五图九组合/安全查询、玩家和浏览器、多标签/O3均仍待独立授权。
