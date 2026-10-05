# ENG-RESIDENCE-COMBAT-CORE-001（E02-P）完整工程任务书 v1.0

## 0. 本批目标与执行权

一次完成“真实三敌CTB、活战斗唯一事实、真实药耗／日額／持续敌人、胜退及新死亡消费”的纯核心工程：详细设计、必要窄重构、实现、正反例／组合长链、独立计数、语义自查修订、完整检查、文档及指定新分支普通commit／push。

这是生产工程授权，但**仅E02-P**。不实现E02-R的v4 codec，不实现E02-S的current／存储，不注册玩家入口，不跳过本批准确SHA源码实审。内部工作不要拆成Owner逐文件、逐函数、逐测试确认的小任务。

- 仓库：`lvlw/elevator-survival`。
- 起始准确SHA：`4166fb25ab2898ca602043fbddacbb88d3444fdf`。
- 起始父SHA：`464b59d657184636b897f72375eb6b61bd2c5786`。
- 起始tree：`88f85400fe094918c122bab87a6384eb97f7291f`。
- 起始src tree：`10501d897195173df2023b1ebd73f9f097228512`。
- 新工程分支：`feature/residence-combat-core-001`。
- 作者交付目录：`docs/engineering/residence-foundation/active-combat-core/`。
- 来源：Owner已批准WORLD-ENTRY-004-ADOPTION D01—D04；DEC-049—052及未被局部覆盖的031／035／036；DOC-WORLD-ENTRY-005五份正式合同；本包准确SHA文档PASS。

本任务由主线依据已有任务下发权限安排，不伪造新的Owner发言。允许普通commit／push上述新工程分支；禁止合并、推main／旧分支、强推及自动进入下一工程。

## 1. 附件、实际开工与必读来源

Owner直接附ZIP；由Codex定位，在仓库外安全解压，验证成员路径、SHA256SUMS和本包5件原始字节。无需Owner提供本地路径。按BASELINE的archive_map原字节归档，不能自动格式化输入。

先实查工作区／暂存、分支、HEAD、全部远端参照及AGENTS。保留其他工作，不能reset、clean、stash丢弃或回写旧分支。工作区干净时，正常fetch并核对指定提交，从上述SHA新建本工程分支；新分支起点必须精确一致。若同名分支已存在或有不明改动，停止说明，不强制重建。旧工程会话可能停在9c3c8a8，不能把旧会话基线当本次基线。

完整读取实际AGENTS要求的GDD、Vertical Slice、Architecture、DEC与相关content；涉及只读安全查询时读取09的当前有效约定及相关UIR。优先读取本批五份正式合同：

- `docs/engineering/residence-foundation/active-combat-core-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-lifecycle-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-restore-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-session-contract-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-batch-plan-v1.0.md`

再读取现有content-supply-core／restore合同、E01-P/R/S实际类型和接线；entry-005的复用／数据表仅作为有历史身份的导航，不能拿旧候选替代正式合同。不得把Project上传副本当成已同步的当前Git文件。

开工真实执行`npm run test:run`并保留完整输出与退出码。历史E01-S是179文件／3621项，仅供对照，不预填为本轮已跑。依赖缺失可按现有lock正常`npm ci`，不更新依赖、lock或修复审计告警；无法完成真实基线时停止实现并报告。

## 2. 范围与精确路径

最大许可集合共**116条**，不是要求全部创建或修改。只有需要完成本Goal的文件才使用；每个实际修改说明其合同依据。目录名、历史候选或本包read-only来源不构成额外写权。

A组只允许下述必要的纯核心窄适配／共用提取；现有导出、旧调用签名与返回／错误／随机／物品／日结语义保持。**所有起点已存在的测试文件和测试helper均只读**；新增测试放D组或C组明确新增helper，不为通过新测试改旧断言。新helper不可在生产import链出现。

B/C组是本任务明确批准的候选新增路径，不意味着它们已经存在；开工核对文件存在性，若发现同名旧模块或用途冲突先报告。E组中四份共享文档只尾部追加，原字节前缀完整；其他为本批新增。不存在路径外的“必要时自行扩展”。

### A. 既有生产窄适配（39条）

- `src/core/combat/combat.ts`
- `src/core/combat/combat-types.ts`
- `src/core/combat/combat-errors.ts`
- `src/core/combat/combat-dependencies.ts`
- `src/core/combat/combat-snapshot.ts`
- `src/core/combat/combat-validation.ts`
- `src/core/combat/combat-enemy-action-primary-plan.ts`
- `src/core/combat/combat-player-action-primary-plan.ts`
- `src/core/combat/combat-transition-plan.ts`
- `src/core/combat/combat-effect-application.ts`
- `src/core/combat/combat-selectors.ts`
- `src/core/combat/combat-risk.ts`
- `src/core/combat/combat-action-checkpoints.ts`
- `src/core/combat/enemy-persistent-state.ts`
- `src/core/combat/enemy-definition-catalog.ts`
- `src/core/residence-supply/types.ts`
- `src/core/residence-supply/validation.ts`
- `src/core/residence-supply/authority.ts`
- `src/core/residence-supply/plans.ts`
- `src/core/residence-supply/allocations.ts`
- `src/core/residence-supply/provenance.ts`
- `src/core/residence-supply/history.ts`
- `src/core/residence-supply/cycle-adapter.ts`
- `src/core/residence-supply/initial.ts`
- `src/core/residence-supply/controlled.ts`
- `src/core/residence-supply/inventory.ts`
- `src/core/residence-supply/medical.ts`
- `src/core/residence-supply/maintenance.ts`
- `src/core/residence-supply/queries.ts`
- `src/core/residence-task/actions.ts`
- `src/core/residence-task/sources.ts`
- `src/core/residence-task/transfer.ts`
- `src/core/residence-task/plans.ts`
- `src/core/residence-task/random.ts`
- `src/core/residence-task/validation.ts`
- `src/core/residence-terminal/supply-terminal.ts`
- `src/core/residence-terminal/supply-controlled.ts`
- `src/content/infected-world-v0.1/enemies.ts`
- `src/content/infected-world-v0.1/initial.ts`

### B. 新增共用内部适配（18条）

- `src/core/combat/combat-profile.ts`
- `src/core/combat/combat-profile-validation.ts`
- `src/core/combat/combat-legacy-profile.ts`
- `src/core/combat/combat-profiled-resolution.ts`
- `src/core/combat/combat-effect-reducer.ts`
- `src/core/combat/profiled-controlled.ts`
- `src/core/residence-supply/shared-types.ts`
- `src/core/residence-supply/shared-validation.ts`
- `src/core/residence-supply/shared-initial.ts`
- `src/core/residence-supply/shared-actions.ts`
- `src/core/residence-supply/shared-inventory.ts`
- `src/core/residence-supply/shared-medical.ts`
- `src/core/residence-supply/shared-maintenance.ts`
- `src/core/residence-task/shared-actions.ts`
- `src/core/residence-task/shared-sources.ts`
- `src/core/residence-task/shared-transfer.ts`
- `src/core/residence-task/shared-plans.ts`
- `src/core/residence-terminal/supply-settlement-shared.ts`

### C. 新增驻留战斗纯核心及内容绑定（25条）

- `src/core/residence-combat/types.ts`
- `src/core/residence-combat/schema.ts`
- `src/core/residence-combat/validation.ts`
- `src/core/residence-combat/dependencies.ts`
- `src/core/residence-combat/authority.ts`
- `src/core/residence-combat/plans.ts`
- `src/core/residence-combat/initial.ts`
- `src/core/residence-combat/entry.ts`
- `src/core/residence-combat/entry-witness.ts`
- `src/core/residence-combat/actions.ts`
- `src/core/residence-combat/projection.ts`
- `src/core/residence-combat/effects.ts`
- `src/core/residence-combat/trace.ts`
- `src/core/residence-combat/resources.ts`
- `src/core/residence-combat/risk.ts`
- `src/core/residence-combat/exit.ts`
- `src/core/residence-combat/history.ts`
- `src/core/residence-combat/terminal.ts`
- `src/core/residence-combat/stable.ts`
- `src/core/residence-combat/queries.ts`
- `src/core/residence-combat/controlled.ts`
- `src/core/residence-combat/index.ts`
- `src/core/residence-combat/test-fixtures.ts`
- `src/content/infected-world-v0.1/combat-profile.ts`
- `src/content/infected-world-v0.1/combat-initial.ts`

### D. 新增原生测试（21条）

- `src/core/residence-combat/entry.test.ts`
- `src/core/residence-combat/reentry.test.ts`
- `src/core/residence-combat/actions.test.ts`
- `src/core/residence-combat/enemies.test.ts`
- `src/core/residence-combat/effects.test.ts`
- `src/core/residence-combat/medical.test.ts`
- `src/core/residence-combat/usage-resources.test.ts`
- `src/core/residence-combat/exit.test.ts`
- `src/core/residence-combat/terminal.test.ts`
- `src/core/residence-combat/history.test.ts`
- `src/core/residence-combat/authority.test.ts`
- `src/core/residence-combat/validation.test.ts`
- `src/core/residence-combat/stable.test.ts`
- `src/core/residence-combat/integration.test.ts`
- `src/core/residence-combat/purity.test.ts`
- `src/core/residence-combat/compatibility.test.ts`
- `src/core/combat/combat-profile.test.ts`
- `src/core/combat/combat-profiled-resolution.test.ts`
- `src/core/combat/combat-legacy-compatibility.test.ts`
- `src/content/infected-world-v0.1/combat-profile.test.ts`
- `src/content/infected-world-v0.1/combat-integration.test.ts`

### E. 本批文档／原件（13条）

- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`
- `docs/engineering/residence-foundation/active-combat-core/implementation-notes.md`
- `docs/engineering/residence-foundation/active-combat-core/contract-and-support.md`
- `docs/engineering/residence-foundation/active-combat-core/completion.md`
- `docs/engineering/residence-foundation/active-combat-core/verification-results.json`
- `docs/engineering/residence-foundation/active-combat-core/inputs/ENG-RESIDENCE-COMBAT-CORE-001-task-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-core/inputs/OWNER-authority-and-scope-E02-P-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-core/inputs/AUD-4166fb2-DOC-WORLD-ENTRY-005-review-v1.0.md`
- `docs/engineering/residence-foundation/active-combat-core/inputs/BASELINE-AND-INPUTS.json`
- `docs/engineering/residence-foundation/active-combat-core/inputs/SHA256SUMS.txt`

不允许修改`src/state/**`、`src/app/**`、UI、旧医院内容与规则配置、G1、G2及mission-lifecycle；`src/core/combat/index.ts`、旧Supply/Task/Terminal ordinary index与旧精确导出测试保持只读。A组的controlled文件只能保持旧导出并提取内部依赖，不把新签发器塞进旧普通入口。新能力走本批独立controlled入口。

没有列出的旧A helper（例如plans/verifySteps、settlement-shared）保持只读：新来源复用既有钱包函数，不改金额；新治疗型死亡不能靠放宽旧verifySteps实现。若精确白名单确实不足，报告具体文件、调用链及所需最小变化，不能临时越界再还原，也不要求Owner手动逐文件协调。

## 3. W1：详细设计、真实profile和复用接缝

先在implementation-notes中完成实现方案和P01—P12映射，然后在本批授权内自行实施／迭代。普通技术命名和拆分不等Owner确认；改变正式机制、参数、生命周期、协议兼容承诺则停止该部分报告。

### 3.1 不复制整套旧医院

从既有运行时38值、103键／193数值叶及限定内容构造只读、受控的新世界profile；core不读取docs、content或state。三敌必须按definitionId/actionId绑定各自HP、首次敌CTB、两动作damage／wait／伤型／风险／弱点，精确保持正式L04表。装卸工的挫伤／240CTB不能仍按护工scratch执行。

为旧医院保持同值适配与原API验证；新入口不能伪造一整份改名的hospital FrozenRuleConfig，或把所有敌人都塞进infectedOrderly表以绕过检查。可提取共用CTB必要子规则／profile读取接口，旧API仍按其原约束解释。全套旧配置和旧数据JSON不修改，不增新调参目录或依赖。

初配管30、外套12等实际资源继续由P和现有ItemState目录产生；不引入旧医院6／4初值。新受控content composition不注册到玩家默认入口，不生成第二真实委托。旧createInfectedSupplyDependencies和buildInfectedSupplyEnemies的默认输出保持，新增profile／组合走独立工厂；意图元数据与真正动作一致，最终玩家投影属于E03。

### 3.2 旧引擎的真实适配，不删验真

实际`resolveCombatPlayerAction`先build计划，再调用会再次build比较effects的`applyCombatEffects`。不得在新死亡消费者或历史验证里调用它们重算已经发生的结果，也不得给旧public加任意skipValidation／trusted=true开关。

允许把同一CTB计划生成、effects应用和profile读取作内部窄提取：新受控路径一次求值已发生的战斗，再凭私有签发能力应用其真实结果；旧外部effects入口继续完整拒绝伪effects。不能把整份旧引擎复制到residence-combat当第二实现。是否提取哪个内部函数由详细设计确定，范围仍限§2。

**调用数如实分层**：新路径的正式CTB求值、随机检查、应用、验真和A消费分别计数；旧API的历史自校验重建不冒充新逻辑只调用一次，也不能靠清零计数隐藏重放。新消费／验证增量不得再次生成伤害、风险、药效或CTB。

### 3.3 新聚合与旧P的稳定动作

CombatValue采用独立pure协议（名称由P详细设计锁定），继承唯一character／carried／itemStates／site／warehouse／任务／钱包／来源历史事实。活battle只引用当前持续敌人及必要entry、queue、checkpoint；不并列保存可独立修改的CombatEncounterSnapshot、body、enemy、库存或dailyUsage。

战后必须继续真实P任务／来源／拾放／拆合／药食／维护／G1休整／A返回。当前Task actions与旧SupplyAuthority、readSupplyValue及issueSupplyPlan强耦合，因此本书明确允许P与Task无版本共用校验／reducer的窄提取。旧协议本身仍strict，旧签发能力不能用于新协议；不通过删除combat／新receipt、假换protocol骗取旧P计划，更不能在新模块逐动作复制同一公式。

可采用从完整新聚合验证后提取真正领域子值给原G1/G2的方式，这与伪装旧SupplyValue不同。G2移动／pending／knowledge既有规则不修改。战斗数据／新历史必须始终由新聚合完整验证，不能被中途遗漏。

## 4. W2：真入场、CTB、持续敌人与胜退

### 4.1 入场和revision

从真实初始材料发放、首次出发及单边移动开始。EntryWitness必须在P/G2移动前捕获from/to/edge、当前执行、敌实例及原encountered/count/risk；到达后G2已标encountered，不能把真正首遇误判为重入。普通请求只有合法意图／edgeId和当前revision，不传退却点、battleId生成值、敌结果或首遇标记。

移动的真实立即身体结果先完成；HP0只沿原移动死亡分支结束，不建立活战斗；最后一次正E不足额移动结束E0，仍处理已触发敌人。一次move+entry与一次玩家动作+全部敌响应+勝退／死亡各只推进外层revision一次。内部局部revision的组合必须受控且有验证，不把after.revision任意覆盖成想要值。

首入0/70、0/150、0/60；再入0/50。battleId用执行＋入场revision＋敌实例的确定性来源，禁止系统时间／UUID／Math.random。合法再入不改变旧HP、intent、count或risk，不重送首次迟缓、旧防御或逃跑进度。

### 4.2 动作、死亡优先与真实伤型

完整执行正式L02顺序：当前玩家主效果及真实资源／治疗→该动作流血→HP0优先→敌HP0胜利→尚需处理的敌响应。普通致胜主效果发生在当前CTB，不虚加一段恢复时间收费。

同点为已开始动作完成（含退却完成）→玩家机会→敌机会。一次动作可能有多个敌响应，不能只测试一个；敌直接致死后不再抽伤势／暴露或推进下个intent/count。真实挫伤不生成开放伤口／出血，撕裂与咬伤按源profile生成。

外套本击正资源仍给完整保护并真实耗1；后续失效。防御先甲后减半向上取整，风险保护按正式来源，抵一次或到期。逃跑准备锁定选择时负重／伤口／镇痛，期间新增伤口不追改时长；严格早于完成点的敌响应仍结，同点完成后结应有流血，HP0则不能成功退回。

战斗中仅真实快捷绷带／镇痛和正式动作；其他药食、维护、整理、移动、休整、返回、deadline禁止。E0不能取消已触发战斗，也不为允许战中动作每招另扣同一笔探索E。

### 4.3 随机与持续状态

继续使用统一、可注入、带种子的随机来源。新风险域绑定执行／catalog／持续敌实例／既有行动计数／actionId／purpose，不含battleId、日期或重入次数；来源搜索与战斗风险不同域。原每子流drawIndex=0不等于site累计riskDrawIndex，不能混作一个游标。原始无暴露不新增暴露抽取；伤势降为none仍按正式既有调用约定记录。

每个实际风险检查只形成一次真实后果并推进唯一累计事实；直接致死不补风险。新伤口身份须与该执行和持续动作源确定绑定，既有旧医院伤口ID语义不倒改。跨场／跨日／保存候选纯校验不重抽，后继TEST声明也不得碰撞旧伤口或来源。纯值验证不得用重新抽样证明记录。

### 4.4 胜退一次E与现场

生还胜利／合法退却按本场实际elapsed，且只一次扣`max(6,ceil(elapsed/100)*4)`并截零；从已批准运行时读6/100/4，不散落硬编码可调副本。覆盖0、99、100、101、201边界。没有独立可由UI调用的chargeExitFee，不能叠旧Scene Time、超时债、每招E、退出额外流血或日结。

退却返回真实EntryWitness.from；胜利留敌节点，原敌HP0及解除危险事实来自真实胜利。旁路不是杀敌。ClosedBattleReceipt联结本场ID、执行、入退revision、结果、elapsed和E前后；重复同场／旧计划／错节点拒绝。敌状态与风险是site同一条记录，跨图、休整、再入不恢复HP／意图／计数或来源。

## 5. W3：来源消费、新死亡、稳定接续与最小证据

### 5.1 真实快捷消费与G1额度

战中不调用仅允许稳定点的planSupplyMedical，也不另复制一套医疗规则。复用实际合格目标、condition和来源份额操作，窄组合一次消费槽中明确instance的一单位，形成medical disposition和CombatUseWitness；slot置空、ItemState及allocations、药效、firstBandageUsed一起变化。

quantity省略或安全整数1；空槽、背包／地面／仓库远程物、无目标、HP0、多余wound、布尔数量或任意结果字段在效果前拒绝。首绷总恢复是2而不是1+2，已用后为1；战中／战外共用同一标记，跨夜／退却不清。镇痛不回血不治伤不止血。消费后的份额不能重新出现在可用容器。

蓄力唯一额度来自G1 remaining，合法使用真扣；再入／只读校验不归还，真正生还周期才刷新。钝击延后按基础140＋对应弱点60；只有护工声明弱点。真实耐久不足但正余额允许最后一次完整行动再截零；0资源不提供有效管攻击，仍保留已批准临时攻击替代。

### 5.2 新治疗型死亡消费

明确新的CombatBodyTrace分支，区分治疗／直接损血／动作流血／伤势／暴露。原始数值及各域在覆盖／截零／清退前校验，邻接HP连续；伤害实扣min(before,requested)，治疗封顶；非HP步骤不能改HP，HP0后没有继续药效／风险／事件。

动作原始死亡计划只在受控纯组合内部存在、无安装／保存资格；交consumeCombatDeath一次消费并得到完整final dead计划。消费者绑定完整独立before、deps、场次／执行／revision及私有能力，校验真实非空trace后复用同一A关闭、真实处分和钱包清算；不重算CTB、随机、药物或旧G1，不再加revision。普通入口不能上传任意death result或将成功随意勾选。

旧consumeSupplyDeath／G2死亡／verifySteps与R-F01含义保持。先治疗后再被敌人致死使用新typed来源，不以负伤害或放宽旧单调BodyStep绕过。正常H0使用真实G1 steps=[]；实际休整／截止仍按各自应有步骤、幅度和任务日资格，不把“空步骤合法”推广到死亡。

死亡保留本场真实敌伤／击杀、药耗／资源／风险／CTB；玩家死亡优先，不结成功奖励、不卡着等待生还退出扣E而复活。旧任务成功、样本交付、安装、处分与旧罚原记录不倒改。死亡关闭一次，不复制余额或另造继承钱包。

### 5.3 够用但不膨胀的历史

P为R提供可联合验证的真实EntryWitness、最近DecisionWitness、ClosedBattleReceipt和新CombatDeathReceipt：绑定执行／内容／规则／profile、实际边两端、场次及revision，实际队列变化原因／敌行动数与risk区间，资源／日额／消费引用，终局实际来源和typed trace。

battle只引用当前唯一敌人，不保存第二身体／库存；不可操作历史与当前可用事实分开。不使用Python固定H1/H4／首场ID／完整case.before作为生产字段设计。后继实际场次死亡能按自身证据校验；字段名在P详细设计定稿并交给R，不能把待R定义当作缺证据的借口。

只保存本阶段必需证据，不保每次全量body、副钱包或通用事件流。纯候选的自洽不是离线历史真实性或全局防回滚。P可以有严格纯值解析／查询供自身签发和测试，但不实现v4字符串reader、恢复安装权或浏览器自举。

### 5.4 战后完整接续

真实退却→稳定医疗／任务／维护／合法休整→同敌再入→胜／死必须能通过同一新聚合接续。稳定场景没有combat数据丢弃，没有初配重发，也不会把敌人、日额、firstBandageUsed或来源重新初始化。初始发放和原任务生产仍真调用既有P共用实现。

四终局和正常H0空步骤／Day7异地先结后召回继续通过真实G1与A；战斗中不可deadline，稳定后再按正式资格处理。新协议也支持测试专用的旧成功／旧失败历史保全，不注册第二真实任务或会话continue-next入口。E02-P不要求E03九组合全部通关，但不能为某路线通过删敌、改参数、白送药粮或预设completed。

## 6. W4：原生验收、故障反例与自查修订

按正式P合同十二组逐项建立API／测试文件／具体用例／反例／计数定位。未覆盖写明缺口，不用测试总数替代矩阵。

| 组 | 本批交付证据 |
| --- | --- |
| P01 | 三敌profile逐动作对照批准数据；旧医院profile／API同值回归；未知profile或非法数值拒绝 |
| P02 | 真初配／出发／单边移动／门／首入；G2到达标记与移动前证据；E0到达、HP0入场前短路 |
| P03 | 实际非默认from、重入0/50、HP/意图/count/risk保留、不重送首遇、错场次拒绝 |
| P04 | 真实多个敌响应、玩家／敌同点、致胜当点、直接致死短路、三敌伤型／风险不混用 |
| P05 | 外套＋一次防御／到期；逃跑锁定、新伤不延长、同点完成、流血致死不回节点 |
| P06 | 真快捷绷带／镇痛份额和无目标反例、治疗封顶→再受伤／死亡、首绷跨战／战外保持 |
| P07 | 140/200控制差异、G1日额、末次耐久／0资源替代、外套本击保护及下一击失效 |
| P08 | 生还胜退0/99/100/101/201费用、E不足截零、一次ClosedBattleReceipt、重复或错场拒绝 |
| P09 | typed新死亡、原before及签发校验、原行动一次而A消费增量零重放、最终只dead |
| P10 | 新协议下真实任务／来源／拆合／医疗／维护／休整继续；H0空steps、Day7截止、旧F01保持 |
| P11 | 错依赖／身份／内容／raw number／selector、JSON／clone／stale／跨作用域、可变输入不被修改或冻结 |
| P12 | 真实退却→休整→同敌再入→胜／死长链、三敌各自原生见证、两声明TEST历史及全旧路径回归 |

真实通路使用正式生产者，不mock CTB结果、手填胜利、直接清enemy、伪造风险或写completed。TEST低HP/E/已有伤口或专用历史前态可以用于边界，但逐例标注来源；核心首入和持续战斗长链不得用“危险已解决”跳过本批要实现的战斗。99/101等纯算术边界可隔离测试，另保留真实CTB退出链，二者不混记为可达路线。

最少单列这些独立调用计数：初配／activate；P/G2 move与G1 action/cycle；新CTB计划求值与敌行动；真实风险draw／累计cursor；快捷消费／origin／disposition；胜退E结算；死亡消费及terminate。构造夹具之后才能清零观测；夹具计算与被测消费增量分开。死亡消费者与纯历史校验不增加action、cycle、CTB、draw、治疗、发物或奖罚次数；不以只看最终相等掩盖重放。IO/current/通知在本批均为0／未接线，不冒称保存恰好一次。

原生反例至少覆盖F01/F02精神：原始布尔／负数／小数／超安全整数、额外键、steps/null／未知tag、非法原HP被后态覆盖、实际场次与错误场次、HP0后继续事件、错消耗引用；程序异常不能算合格语义拒绝。随机生产者真正抛错时原值不变、无签发结果；异常须如实透出，不用大catch吞掉。

自查后执行至少四类有意义的语义负控（仓库外导出副本或临时测试注入，明确记录所禁用约束）：首入误判／敌持续值重置、重复费用或消费回滚、原始值／错场次误接受、新死亡消费者重放。测试必须因错误业务结果或额外真实调用而失败；导入／类型／目录／缓存权限失败不计负控成功。负控不写入生产开关，不暂改白名单外文件再还原。正常版最后重跑，负控和正式验证不混算。

## 7. 范围外与冲突处理

本批不改G1精力／疾病／日周期公式、G2既有移动／pending规则、首身份核心、不重接／钱包规则及38/103参数；不修改v1/v2/v3 reader／codec／session／精确导出和任何旧测试，不注册v4。新增技术纯协议不等于改变既有格式。

不做E02-R／S／E03；不接current、存储适配器、浏览器IO、多标签、React／UI、玩家入口、安全ViewModel全接线、商城／身体服务、新敌／新委托、跨未来改专长或O3。不自动修依赖告警或构建chunk阈值，不引入新库／通用事件总线／任务SDK。

普通详细设计疑点在正式合同内自主处理并留说明。实际规则矛盾、白名单不足、必需修改旧测试或兼容承诺变更须停在明确边界报告，由主线处理；不能用新测试绿色推定核心机制已获批准。不为赶工把不支持状态清空、改成成功或宣称全路线可玩。

## 8. 检查、输入保全与W01

实际执行并记录命令、退出码、关键输出、源码指纹及失败修订：

```text
npm run test:run
npm exec vitest -- run src/core/residence-combat
npm run check
git diff --check
git diff --cached --check
git diff 4166fb25ab2898ca602043fbddacbb88d3444fdf --check
```

第二行仅为新核心定向入口；另外必须覆盖D组实际新增的旧CTB适配／content测试，以及所有受影响旧combat／hospital／E01-P/R/S及终局回归；按真实文件清单执行，不能用上行一个目录代替。最后完整check含architecture、typecheck、test、build；不以之前运行或旧CI替代最终实测版本。

范围检查：全部修改／新增路径在116条内；所有起点既有测试／helper、state/app/UI、规则配置、AGENTS、依赖、CI/scripts及其他范围外Git对象不变；A组变动附逐项必要性。四共享文档原字节前缀、五输入原字节与SHA256／blob、正式五合同、38值及103键193叶和内容保持。比较受保护Git对象使用Git canonical blob，不能将Windows工作树CRLF误报成越界；指定输入／合同／历史前缀仍严查规定原字节，不改属性或检查配置。

W01累计起点为`8c19ca0d28058cf743b41c8547cc2629c8eac767`，仅：
- `docs/engineering/residence-foundation/content-supply-restore/inputs/ENG-RESIDENCE-CONTENT-SUPPLY-RESTORE-001-task-v1.0.md`第7—9行；blob `921bfac5ee42b7a95684f83357a748ddf231bb76`。
- 同目录`AUD-8c19ca0-E01-P-review-v1.0.md`第3—6行；blob `76f01dfb2bb2fa303da88ab0296c6c48e94550c0`。

七处旧硬换行只保留历史累计exit2，原件不改；本任务所有新差异、输入和报告必须exit0，无第八处例外，不把累计exit2改写成全干净。正常／cached／起点增量／累计检查分别记账。

完成报告与verification-results只写已有真实结果，保留首次失败、修订和未支持；不得将作者、CI、主线、历史或重复执行累计成新增测试。生产文件数由当前架构命令实报，不预填289。可以只读查询准确SHA的CI；不能核验写UNCONFIRMED，不能冒称PASS或更改workflow。

## 9. 文档交付与Git停止点

本批implementation-notes包含实际共享边界、protocol／字段与最小证据、CTB复用及一次求值方案、旧接口保持、所有自查修订。contract-and-support给十二组映射、public/controlled精确导出、支持／拒绝阶段和后续R所需字段。共享四文档只追加本批实现与NOT RUN边界，不改正式合同或回写历史PASS。

只允许在`feature/residence-combat-core-001`普通commit／push。提交前原件与实测源码／暂存核对，提交后再核对最终blob与测试快照、父链、tree、远端同名引用、旧分支参照及干净工作区。网络故障可普通重试，不强推、不合并、不推main／设计或旧工程分支。

最终报告至少给：起始／父／最终完整SHA、tree、branch/message、文件清单；真实测试基线和最终检查；新增／替换／删除／净增（旧测试0修改）；P01—P12；三敌真实CTB及首入／再入／稳定接续；独立调用计数；负控；原件与参数／保护对象／W01；push与CI实际状态；冲突／未完成／未执行范围及停止点。自身最终SHA/tree不硬写入自身提交造成循环，最终消息和仓库外回执给出。

**交付后立即停止，等待当前WebGPT主线准确SHA纯核心源码实审。不自动执行E02-R/S或E03，不把纯计划通过当存档／会话／试玩通过。**
