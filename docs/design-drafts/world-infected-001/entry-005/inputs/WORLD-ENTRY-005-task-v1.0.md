# WORLD-ENTRY-005：E02活战斗与恢复接缝集中定稿任务 v1.0

## 0. 本次交付目标

这是一项**集中设计与验证任务**，不是生产开工，不重做世界设计。

承接已批准的DEC-052和已审E01-P/R/S，交付足够支持后续完整工程的E02合同候选：真实CTB遭遇／玩家与敌行动、分段退却／再入、快捷药物与日额、唯一身体／装备／敌人状态、胜退精力只结一次、合法死亡、活战斗保存及会话交接。把旧模块是否可复用、必须窄改哪些接口和技术格式一次查清；不得只再写一遍“将来要支持”。

W1—W4包括详细设计、数据核对、实际原生观察、有限边界验证、负控、交叉修订、冻结复跑、文档、commit／push。内部步骤由Codex自主组织，不逐函数要求Owner确认。

已有DEC-052玩法和38项＋103键配置不重开；真实需要改变机制或新增参数才列Owner待审。**没有新增Owner选择时，明确写“Owner无需新增玩法采纳”，不要为了流程人为凑出新的D编号或一轮全面采纳。** 技术合同仍由主线准确SHA实审后定稿，不能自行标为已批准。

## 1. 基线与开工核对

- 仓库：`lvlw/elevator-survival`。
- 起始SHA：`9c3c8a8c97c374bd1def6217c691137f3df10096`。
- 起始父SHA：`84eb6dff5e9d3238c3e651525b6ed28412132549`。
- 起始tree：`1333c0031b67ab47a9a0b832d7d372eaaf781079`。
- 起始src tree：`10501d897195173df2023b1ebd73f9f097228512`。
- 源分支：`feature/residence-content-supply-session-001`，只读。
- 本任务新分支：`feature/design-world-entry-005`。

设计会话上一次DOC-WORLD-ENTRY-004的状态已经过时。重新读取实际HEAD、branch、status、普通／cached diff和远端引用；不要用旧聊天推断当前工作区。由Codex建立新分支，不要求Owner手动操作。不reset、清理或覆盖他人改动；遇无关dirty状态、起点拿不到或同名分支冲突时，报告具体情况并停在安全位置。

先读实际AGENTS以及第2节来源；核对本包SHA256SUMS四项及五份文件。原件按第3节inputs路径原字节归档。

当前已知：E01-S为显式v3稳定四态＋十类命令封套，依赖候选外expected。新感染世界敌人文件只是持续敌人声明，并无新CTB生产者；旧combat模块虽有CTB能力，其数据、费用和保存接线不能直接当作新世界已完成。现有v3仍拒绝活pending，不能通过删除拒绝或清pending进入下一阶段。

## 2. 必读来源和权威区分

以下均在本任务起始SHA读取；条款以实际DEC及局部覆盖为准，不以旧候选标题反向否决已批准内容：

- `AGENTS.md`
- `docs/01-game-design-v0.1.md`
- `docs/02-vertical-slice.md`
- `docs/03-architecture.md`
- `docs/05-design-decisions.md`
- `docs/content/infected-world-entry-test-config-v0.1.json`
- `docs/content/infected-world-entry-content-v0.1.json`
- `docs/engineering/residence-foundation/content-supply-core-contract-v1.0.md`
- `docs/engineering/residence-foundation/content-supply-restore-contract-v1.0.md`
- `docs/engineering/residence-foundation/world-content-batch-plan-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-004/03-combat-medical-contract.md`
- `docs/design-drafts/world-infected-001/entry-004/04-specialties-tools-and-loadout.md`
- `docs/design-drafts/world-infected-001/entry-004/05-source-and-adoption-map.md`
- `docs/design-drafts/world-infected-001/entry-004/06-next-engineering-contracts.md`
- `docs/design-drafts/world-infected-001/entry-004/07-playable-and-release-gates.md`
- `docs/design-drafts/world-infected-001/entry-004/adoption/inputs/WORLD-ENTRY-004-ADOPTION-owner-review-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-004/adoption/inputs/OWNER-approval-WORLD-ENTRY-004-ADOPTION-v1.0.md`
- `docs/engineering/residence-foundation/content-supply-core/contract-and-support.md`
- `docs/engineering/residence-foundation/content-supply-restore/contract-and-support.md`
- `docs/engineering/residence-foundation/content-supply-session/contract-and-support.md`

另完整读取本包E01-S实审报告。源码至少定点覆盖：

- `src/core/combat/`当前入口、类型、快照／再入、行动调度、效果应用、行动检查点、敌人持续状态／风险和安全投影；由实际import追踪，不猜文件存在。
- `src/core/residence-location/`实际pending、到达、敌人、rest、knowledge和绑定。
- `src/core/residence-supply/`类型、authority、plans、history／provenance、medical／allocations、choices，以及受控动作入口。
- `src/core/character-cycle/`和`src/core/residence-energy/`日額、精力、死亡、实际时序；不得复制为新公式源。
- `src/core/residence-terminal/supply-terminal.ts`及当前受控死亡语义。
- `src/state/residence-save/supply-*`、`src/state/residence-session/supply-*`、现有`domain.ts`与旧v1/v2旁路边界。
- `src/content/infected-world-v0.1/`、旧医院战斗绑定及两份既有运行时配置；必须区分已批参数、旧版专用参数、测试注入和推导结果。

涉及未来玩家安全查询时读`docs/09-ui-design-record.md`的当前有效约定与相关UIR；本批不设计新弹窗体系、不制作UI。

## 3. 精确写入白名单

最多27条，仅以下文件；不是整个目录写入权。新增目录／文件由Codex创建。无必要的可选验证辅助文件可以不创建，但W1—W4交付不得缺失；不为凑数量创建空文件。

- `docs/design-drafts/world-infected-001/entry-005/00-owner-review.md`
- `docs/design-drafts/world-infected-001/entry-005/01-current-baseline-and-reuse.md`
- `docs/design-drafts/world-infected-001/entry-005/02-combat-lifecycle-and-order.md`
- `docs/design-drafts/world-infected-001/entry-005/03-single-truth-and-effects.md`
- `docs/design-drafts/world-infected-001/entry-005/04-active-combat-save-contract.md`
- `docs/design-drafts/world-infected-001/entry-005/05-approved-data-and-gaps.md`
- `docs/design-drafts/world-infected-001/entry-005/06-engineering-contracts.md`
- `docs/design-drafts/world-infected-001/entry-005/07-evidence-and-playtest-gates.md`
- `docs/design-drafts/world-infected-001/entry-005/validation/state-candidates.json`
- `docs/design-drafts/world-infected-001/entry-005/validation/check.py`
- `docs/design-drafts/world-infected-001/entry-005/validation/cases.json`
- `docs/design-drafts/world-infected-001/entry-005/validation/results.json`
- `docs/design-drafts/world-infected-001/entry-005/validation/negative-controls.json`
- `docs/design-drafts/world-infected-001/entry-005/validation/native-probe.test.ts`
- `docs/design-drafts/world-infected-001/entry-005/validation/vitest.probe.config.ts`
- `docs/design-drafts/world-infected-001/entry-005/validation/native-results.json`
- `docs/design-drafts/world-infected-001/entry-005/validation/README.md`
- `docs/design-drafts/world-infected-001/entry-005/completion.md`
- `docs/design-drafts/world-infected-001/entry-005/checks.json`
- `docs/design-drafts/world-infected-001/entry-005/frozen-manifest.json`
- `docs/design-drafts/world-infected-001/entry-005/inputs/WORLD-ENTRY-005-task-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/inputs/OWNER-authority-and-scope-WORLD-ENTRY-005-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/inputs/AUD-9c3c8a8-ENG-RESIDENCE-CONTENT-SUPPLY-SESSION-001-review-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/inputs/BASELINE-AND-INPUTS.json`
- `docs/design-drafts/world-infected-001/entry-005/inputs/SHA256SUMS.txt`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`

五份inputs归档路径和文件名必须一一对应原包。两个既有overview／decision-queue仅末尾追加，保全原字节前缀。其余既有文件（包括正式DEC、正式合同、entry-004源候选、源码、旧测试、配置、依赖及CI）全部只读。

需要额外写入路径时先报告确切文件及必要性；不得把只读源码临时改后再还原算作授权内操作。负控修改仅在仓库外副本，或在本目录隔离模型预设的负控开关中执行。

## 4. W1 — 已批规则矩阵与实际复用路径

交付`01-current-baseline-and-reuse.md`、`02-combat-lifecycle-and-order.md`和`05-approved-data-and-gaps.md`。

### 4.1 逐入口实查

按“可原样复用／需窄适配／仅旧版可用／尚未实现”列出实际文件、公开函数、返回类型、真值所有者、限制和原生探针。至少明确：

1. G2移动完成的立即结果、pending遭遇、HP0先死亡以及实际入场前节点怎样传给战斗；不能在后续自己猜退却目的地。
2. 旧CTB的玩家决策点、动作调度、敌意图推进和同时到期排序；实际代码怎样复用，哪些旧Scene Time路径必须绕开但不能全局修改。
3. `CombatEncounterSnapshot`含playerCondition、背包／装备／快捷／ItemState及enemy／usage。它可否只作瞬时计算投影；绝不可把整份对象与SupplyValue双持久化为两个可编辑身体／库存。
4. 新三敌的HP、伤口类型、伤口／暴露风险、动作周期、时钟参数与已批数据逐项绑定；现有通用scratch／lunge-bite标签是否足够表达各敌，不足处给最小扩展，不能直接把三个敌人都替换成旧医院同一行为。
5. 快捷绷带／镇痛、首绷效果、蓄力日额和真实份额消费，哪些旧函数需要受控新世界适配，哪些不可直接调用战外P医疗入口。
6. E01-P/R/S各自的现实类型、签发能力和只读限制。不得以候选伪接口承诺“无需改P/R就支持所有新态”。

### 4.2 时序必须写到可验收

按实际正式来源明确：触发行动→立即结果／死亡→活遭遇；首入／再入；玩家主要效果→应有流血→死亡短路；敌人行动→伤口／暴露真实随机顺序→后继意图；防御生命周期；退却准备及期间敌响应；胜利／退却／死亡；归还持续现场；正常返回／截止和冷恢复。

保留已批规则：胜利或合法退却只结一次`max(6,ceil(elapsedCTB/100)×4)`探索精力并截零，不能再叠旧Scene Time、另一笔逐招精力或退出流血。战中不日结，E0不能取消既已触发的结果。正精力最后一次移动到E0仍可能触发必须处理的战斗。

写清本场elapsedCTB的起点、再入场相对时钟、退出计费发生点和防重复证据。不要用当前全局时钟直接给下一场重复计费。HP0不等待计费而复活，死亡时已发生的消耗不得丢掉。

退却回本场真实入场前节点；持续敌人HP／意图／行动次数／风险游标不刷新；临时防御／逃跑进度不跨场，首次迟缓不重送。旁路不伪造敌人死亡。三专长驻留锁定、首绷和蓄力日额跨战／战外／读档保持。

不自行解释有争议的并发终局或增加隐藏规则；若现有DEC及其获批来源无法唯一决定，列明现象、来源和主推荐，而不是随意选择后记为已批准。

## 5. W2 — 唯一事实、受控效果和活战斗恢复合同

交付`03-single-truth-and-effects.md`、`04-active-combat-save-contract.md`及`validation/state-candidates.json`（后者只作明确标注的技术验证样本）。

### 5.1 唯一真值及效果组合

提供可审的候选TS类型／字段表和依赖方向图，至少包括：

- 稳定驻留、待处理遭遇、允许的活战斗停留点、已完成胜退、死亡的联合判别；不要简单增加`combat?: any`。
- 身体／日额、carried／ItemState、持续敌人、战中队列／临时防御、选择标记、来源份额各自唯一持有位置；瞬时投影不保存为第二真值。
- 输入只接受合法意图／绑定／revision／具体实例／目标，不接受伤害、骰值、胜负、任意后态或支持开关。
- 先验证原值与完整前态，唯一入口有序组合原生效果，再签发不可由JSON/clone伪造的计划。不得几个监听器分别扣血、耗物、结精力和保存。
- 快捷药物只消费真实一单位，并更新同一份origin/disposition、firstBandageUsed、quota和ItemState；禁止背包隔空使用或自动补快捷槽。
- 先治疗后受伤的步骤能被新来源验证，不套单调扣血旧协议，不通过负损血偷渡治疗。
- 新来源死亡由明确受控消费者一次关闭／清算；保留旧A正常H0空步骤、真实日结和R1 F01不变量，不全面放松旧验真。

### 5.2 新格式与状态接缝

v3含义已经锁定为稳定四态。建议考察独立后继格式（可提出formatVersion=4技术候选，须先核对当前实际版本占用），但本批不注册、不修改v3、不新增迁移承诺。具体结构在合同候选中一次定清，不将“将来补字段”留给三个工程反复协调。

分别写明：

1. 允许存／恢复的决策点，以及必须在一个同步事务内跑完的中间点。原子动作中间不被强制变成可保存玩家内容。
2. 入场后的第一可停点、玩家行动后的下一决策点、胜退后稳定点和dead；若要支持到期敌行动尚未解算的态，必须给出明确编排，而非默跳敌行动。
3. 冷候选与同进度恢复的独立expected来源；受控启动材料来自候选外，不准新owner从刚读入文本倒推expected后自证。主线未授权此处顺带解决浏览器自举、expected永久侧档或跨设备防回滚。
4. 活battle ID、具体委托／execution／配置／内容、入场来源、时钟／队列／意图／已行动次数／风险游标与持续敌人联合验证；拒绝错绑定、重抽、混用旧场队列、已退出再次结费等。
5. strict旧v1/v2/v3双向拒绝／显式入口策略。不得为了新战斗批量放宽既有测试，O3仍另门槛。
6. 一次完整计划→聚合→预编码→同域唯一current→write→只读notify；写失败保持最新结果，retry只保存。合法死亡只安装final dead，不先安装不完整HP0活动态。
7. 关闭后的收据／处分／样本／余额与旧历史继续保持，不能复用活动计划回滚关闭资格。

当原数据不足以验证某项历史真实性，准确标出需保留的最小原事实及保证边界，不以自洽校验宣称完整离线历史认证，也不建设通用事件溯源系统。

## 6. W3 — 有限合同验证、真实源码观察及负控

本批验证分两条证据线，不混成一个通过数量。

### 6.1 有限边界检查器

`validation/check.py`读取`cases.json`及`state-candidates.json`，只验证本次候选状态、来源与事务不变量，不另写整套战斗／全世界复制引擎。每项须给固定ID、来源、前态／命令／预期、支持类别、实际结果、mismatch和异常。

至少覆盖：首入／再入，E0触发，HP0入场前短路，敌先手／同时到期，主要效果／动作流血／死亡，胜退精力一次与两次误扣，CTB边界99/100/101及最低额，临时防御／退却准备，快捷药物无目标／错误位置／耗尽、首绷跨战跨夜、蓄力日额，来源消费重放，敌人状态回访，正常返回／截止不能跳战，活态及死亡冷恢复，错游标／绑定／revision，保存失败继续、重试与监听重入。

不必伪称全部完整实现。无法由有限模型验证的真实CTB可达性、生产整链或浏览器事项标UNSUPPORTED或NOT RUN，不计实现PASS；程序异常是失败，不是业务拒绝。

合法HP不足截零、合法HP0、正常H0空步骤和分段退却正例必须保留，不能靠全部拒绝过检查。

### 6.2 真实当前源码探针

`native-probe.test.ts`通过独立`vitest.probe.config.ts`执行，default src生产测试集合完全不改。探针只能读取现有源码及本目录隔离资料，不能改原函数／原测试让结果通过。

使用真实当前combat/G1/G2/P/R/S原生API观察复用能力与拒绝边界。重点确认：旧engine实际CTB与敌意图行为；初次／再入的持久字段；药物和日額的旧来源；现在S对活pending的拒绝；R对新态／错绑定的严格拒绝。测试注入依赖必须标TEST，不把旧医院配置或人工轨迹暗中称为新世界实际通关。

建议采用现有受控依赖工厂构造具体用例；除明确故障注入外，主张为“原生CTB”的测试不能stub掉对应CTB解析函数。不能复用的点应给出具体API/类型/错误和最小改造建议，而不是一律假想已经实现。

### 6.3 语义负控与冻结双跑

至少四类边界负控：重复退出计费；重置持续敌人／风险状态；回退药物消费／首绷／日額；错队列／来源／死亡绑定被误接纳。每类只禁用或破坏被测的一条候选约束，必须由语义mismatch检出并exit1；导入、类型、缓存权限或程序崩溃不算检出。

负控在隔离模型预设模式或仓库外副本执行，绝不临时修改src。保留具体失败ID、exitcode和异常计数，不改预期来制造“负控成功”。

冻结脚本、case、技术合同和输入后，有限套件独立双跑；确定性结果字节应一致。原生Vitest JSON有真实时间／耗时，不要求其整文件字节相同，不能为对齐结果删掉失败。原生探针在最终材料冻结后至少独立实跑一次；结果与有限套件分别记录。

## 7. W4 — 集中审阅与最多三个可执行工程合同候选

`06-engineering-contracts.md`按实际依赖提出最近最多三个完整Goal候选，推荐责任边界：

1. **E02-P**：活战斗纯核心和必要的P/G2/A窄适配，真实调度／装备／药物／退出精力／原计划死亡组合；不安装current。
2. **E02-R**：经前项实际类型锁定的新格式严格聚合／编解码及独立expected；不并入会话。
3. **E02-S**：完整入场、战中、胜退、死亡与稳定驻留交接，唯一owner及保存故障／重入／冷恢复长链。

可提出更好的最小拆法，但不得把新格式和唯一current等审查边界藏在一个巨型Goal里自动跨过，也不拆成需要Owner逐函数转发的小任务。

每个合同需目标、正式规则来源、前置准确SHA门槛（未发生的SHA写待前项实审，不捏造）、唯一事实所有权、候选API／输入输出、支持／拒绝状态、必要修改与只读路径、正反例／组合验收、实际检查命令、交付及停止点。涉及现有核心适配时，列到具体文件；不要一边要求改行为一边宣布该文件永远只读。候选路径不构成本任务或下一任务默认写入权限。

`00-owner-review.md`开头给当前能／不能做、主推荐和真实代价，随后将事项分为：已批准无需重选；主线可决定的技术定稿；真正须Owner新增选择（可为零）；验证／体验未支持。三敌、三专长、工具箱、无初粮、酒店可绕、七日和物品竞争保留，不借设计收口调参数。

`07-evidence-and-playtest-gates.md`明确真实CTB、实际分段突破、九组合和完整五图路线仍须原生与Owner体验；E03安全查询不能等同直接暴露getState；浏览器IO、多标签、自举独立材料及O3须后续专门接线。既有素材不在本任务启动采购或重做。

两份入口只追加“E01-S已审，E02合同候选已交待主线审”的真实状态，不将设计结果写成生产已实现。

## 8. 验收命令、范围与原件审计

按当时实际package脚本核对后执行：

```text
npm run validate:architecture
python docs/design-drafts/world-infected-001/entry-005/validation/check.py --cases docs/design-drafts/world-infected-001/entry-005/validation/cases.json --output <仓库外冻结运行结果>
npm exec vitest -- run --config docs/design-drafts/world-infected-001/entry-005/validation/vitest.probe.config.ts --reporter=json --outputFile=docs/design-drafts/world-infected-001/entry-005/validation/native-results.json
git diff --check
git diff --cached --check
git diff 9c3c8a8c97c374bd1def6217c691137f3df10096 --check
```

check.py还应提供`--negative-control <id>`和可指定output的接口，实际参数说明放validation/README.md。有限检查正常exit0、语义负控exit1；其它退出须说明，不吞stdout／stderr。

本批是设计／技术探针任务，不新增src生产测试；历史3621项不是本轮执行。起始／最终全量生产测试、构建、浏览器／真实Storage／Owner试玩未运行即NOT RUN，不用原生probe数冒充新增生产测试。若自查认为有必要额外只读运行现有测试，可以实跑并如实区分，但不得修改测试或凭失败扩大生产修复权限。

必须独立审计：

- 27路径白名单；五份inputs原字节／SHA-256／暂存及提交blob一致。
- 两份既有入口原字节前缀保持；正式DEC和已批合同、103键／193数值叶、原38值及源JSON均不改。
- 起始与最终`src`tree完全相同；AGENTS、package/lock、scripts、CI、tsconfig和旧测试全部保持；所有范围外Git对象与起点一致。
- 所有新增／变更相对链接和锚点有效；UTF-8、diff无新增告警。
- frozen-manifest不包含自身，不伪称已冻结尚未生成的输出；检查结果保留实际修订经过。
- W01只是历史原件七行，本任务新包和增量没有空白例外。若执行从旧P起点的累计检查，保留实际exit2／七行，不改W01文件、不加第八行。

日志可留仓库外并在checks中记录真实路径、摘要、命令与退出码；不因白名单未列日志而丢掉故障。不要运行npm audit fix或修改CI／构建阈值消除原告警。

## 9. Git及最终报告

只允许本任务新设计分支普通commit／push。最终记录start／parent／HEAD完整SHA、tree、分支、变更路径及统计、工作区状态、push实际结果和远端SHA；主线不冒称读取用户本地磁盘。记录参照main/S/R/原设计引用，不修改它们，不merge、不force。

最终报告标题`WORLD-ENTRY-005`，包含：W1—W4实际交付、规则复用与真实缺口、技术主推荐、真正Owner待决项数量及影响、有限检查／原生探针分开数量和未支持项、负控的语义失败ID、冻结双跑、原件／scope／src树保护、所有NOT RUN、最终SHA及停止点。实际模型配置无法核验时写未核验，不自行宣称切换。

**完成即停止，等待当前WebGPT主线准确SHA实文件审查。** 不自动正式落文或进入E02-P/R/S、E03、浏览器及玩家入口。
