# WORLD-ENTRY-003：终局、奖罚清算与关闭态恢复准入

> v1.0；2026-10-04。
> 主线依据Owner既有任务下发／后续批次推进权限、已确认方向及G4限定PASS下发。
> **这是一项集中设计与验证长任务，不是生产工程、正式DEC归档或剩余数值批准。**
> 在本批范围内一次完成 W1—W4、交叉自查修订、普通commit／push和完成报告。不要让Owner逐文件协调。

## 1. 目标、基线和停止点

目标：给下一批真正处理“成功、失败、期限失败、死亡”的工程提供可审、可落文、可实现的最小合同。现有G4仍拒绝完整终局、死亡和战斗安装；本批不直接删除这些保护，而是把资格、身体、任务实物、积分、周期来源与可恢复后态一次设计清楚。

| 项目 | 要求 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 起始完整SHA | 7ca547ab8ab4f411d1102a79baf8c0796f4b082c |
| 起始root tree | 4b5a39ef32f5b24e2cfa56076403bf301654324e |
| 起点来源 | feature/residence-actions-core-001，只读；不能在其上交付本设计 |
| 新设计分支 | feature/design-world-entry-003，从指定SHA建立 |
| 改动范围 | 第8节最多21条精确文档／设计验证路径；src全部只读 |
| 提交权限 | 本任务的新设计分支普通commit和同名push；不推main、旧设计或工程分支，不合并、不强推 |
| 停止点 | 交回最终准确SHA供主线实文件评审；方案及待审数值由后续采纳批准后再正式落文、另发工程 |

这是接在已通过G4之后的局部准入，不重做五图世界设计，不另开第二委托，不把完整世界包装为一个不可审的工程Goal。

## 2. 必须重新读取的事实来源

原设计会话的基线已过时。先读取实际根及嵌套AGENTS、GDD、Vertical Slice、Architecture、DEC及相关Content；依当前权威顺序解释。本文不覆盖正式DEC或Owner原确认。

重点来源（均在固定SHA读取）：

1. `docs/05-design-decisions.md` 的DEC-049/050及相关较早终局、物品、保存条款；`docs/07-decision-supersession-index.md`仅辅助定位覆盖。
2. `docs/design-drafts/world-infected-001/10-decision-queue.md`、`04-main-mission.md`、`11-points-hub-recovery.md`、`05-resource-economy.md`。
3. `reviews/endgame-candidates-v1.1.md`（文件名不等于正文版本）及其003D原确认；`reviews/mission-retry-options-v0.1.md#owner-confirmation-003c`；涉及完整成功／重伤同奖时读取实际003A确认入口。保留原确认与待正式落文的区别。
4. `entry-002/adoption/inputs/WORLD-ENTRY-002-ADOPTION-owner-review-v1.0.md`及实际Owner批准；`docs/content/infected-residence-core-test-config-v0.1.json`。
5. `docs/engineering/residence-foundation/runtime-restore-supplement-v1.0.md`、`energy-cycle-contract-v1.0.md`、G2/G3/G4实际支持合同与实现记录；本包G4审查。
6. 源码：首身份public/controlled/validation及K18/K19；G1 cycle/types/validation；G2 movement/sources/items/controlled/validation；G3 aggregate/codec/session；G4 launch/transitions/session及对应原生长链和故障测试。
7. 旧医院的run-return／run-termination／run-save只作复用与历史语义比较，不能按旧一日版本倒改新世界。涉及提示与只读地图时读`docs/09-ui-design-record.md`当前约定。

交付来源表必须将每个新候选条款映射到文件、章节和固定SHA，并标注：正式生效／Owner已确认待落文／推荐Draft／测试夹具／历史比较／未支持。不要把queue上方的旧状态当作最新；同文件后续采纳和精确提交优先核对。

## 3. 不得重开或偷换的方向

核对原件后落实以下既有方向，不要求Owner再次在它们之间选择：

- 当前唯一委托为《封锁区·未完成的转运》；完整履约与指定样本真实携回缺一不可。访问地图数量、隐藏感染值或拥有同名假物不能代替资格；酒店可绕开。
- 同角色这份具体委托正式成功／失败后不能换执行ID、标题或重建初态重接。同一活动内跨图、回访、退却、休整和读档继续仍合法。
- 完整履约且合法生还按任务声明同奖，重伤不减奖；成功120仍是待审数值，不是已获准常量。
- 当前委托失败生还收入0，仅一次扣min(当前积分,20)，不造债、不叠旧罚、不额外没收普通合法携出物；不推广为所有未来任务保底。
- 普通合法携出物保留实例、数量、耐久、电量和既成效果；任务件、权限、未携出物不变永久普通资产。不得用来源罚或“新物优先消耗”重写主案。
- HP0才实际死亡；死亡不把此前成功、交付、安装、消费或已扣罚记录改写成未发生。下一角色不继承原角色当前积分和可用家底。
- 正常合法返回（包括Day7）不补夜；先完成本次全部清算，再进入静态中枢。没有下一份真实内容就停留，不造继续按钮、不触发病程、不判角色死亡。
- Day7异地稳定截止先完成当期流血／感染／饥饿等后果，仍活才失败召回；不跳过战斗、HP0不召回、不造旧任务Day8、不重复结同周期。
- 已批准O1参数与公式不修改；O3旧入口／旧槽公开安排继续留到对应发布阶段。本批不承诺永久双产品或静默迁移。

这些摘要只用于防误读。原件不足以确定的具体处置必须标Draft并给主推荐，不借摘要补成已确认规则。

## 4. 四个工作包，一次完成

### W1：终局规则、真实资格与必要参数

产出局部条款候选和来源采纳表，覆盖success、voluntary-failure、deadline-failure、death四种结果及相互排斥关系。明确完成判断、正常返回许可、主动止损、截止触发、动作／日结实际死亡的各自生产者；区分玩家意图与受控事实。禁止UI提交success=true、dead=false或其他“完成凭证”来取得权限。

必须逐项说明：样本在地面／实际背包／已交付／丢失时的资格；设施完成事实来自谁；真实返回位置／路径／已触发危险怎样验证；样本已经取得但其他目标未完不能算成功；任务失败不等于角色死亡。没有正式答案的任务件失败处置要给清晰Draft建议及玩家代价，不隐式留永久物，也不无依据额外没收普通物。

把当前经济主规格中的“终局工程必要子集”单独列出：成功奖励候选、角色初始余额与数值上限／溢出策略、当前已确认失败政策、只读结果与一次入账的关系。每个数值注明来源、状态和将来消费者。不要把int32上限、初始0、120、20/40/80服务或商品目录一起当成此前已批准。

`config-candidate.json`仅含本次必要候选及逐项状态，不复制G1已有34个参数作为第二配置。商品、治疗、补给兑换可用现有Draft举说明例，但不并入默认采纳集。既定价格未变也不能冒称已批准。

余额溢出不能通过截奖、先关委托后报错或空对象回退处理。比较旧Draft的“接取前预留入账空间”与本次最小可用策略，给单一主推荐；明确它对现有G4首次出发的新增前提和未来必要修改，不在本设计执行。

### W2：完整终局事务与真实资产处置

给出最小所有权图和逐步事务表，不建完整Profile、通用任务SDK或通用事件总线。明确唯一任务事实、钱包、身体／D/T、现场、携带容器、物品状态、任务交付、不可用资产和历史记录各由谁持有，哪些只是引用／只读结果。

每种终局必须列：合法前态、意图、独立事实、规则顺序、完整后态、非法请求零副作用、已执行的合法死亡结果如何提交、保存失败行为。不能先提交closed再靠监听器补奖罚／转移物品，也不能将合法死亡当非法请求回滚为生还。

围绕实际G4代码说明未来怎样移除“死亡整体拒绝”的开发限制，接住G1/G2已产生的完整结果而不重跑动作、流血、感染或抽样。把成功正常返回、失败正常返回、Day7稳定期限与动作／休整死亡分别落实，覆盖来源ready/due、最新关闭身份及同周期只结一次。

任务专件真实移交／注销与普通物延续不能只用数量字典模拟生产方案；使用当前真实实例和ItemState关系。已留在旧世界的物品只能作为不可访问的历史，不得另在中枢重建。没有钱包／任务实物完整处置就不得把下一工程描述为可提交真实终局。

设计中不得新造玩家万能close命令；近期headless消费层也必须从真实任务／返回／周期生产者获得资格。尚未接五图时允许明确标识的受控内容夹具验证，但不能使用由请求传入的“业务已支持”布尔值。

### W3：关闭态恢复、故障与有限反例

现有G3 envelope只支持fresh-hub及无closed历史的首active-world。给出新增living-hub／dead及活动历史的候选表示、支持矩阵、版本与旧headless格式处理建议；不要将现有v1静默扩义。是否新技术版本以及对研发夹具如何显式拒绝／转换须列为合同候选，和O3浏览器发布承诺分开。

恢复核对根身份、声明全集、关闭事实、钱包、真实物品引用、任务处置、身体／cycle/clock与phase。原restoreMissionCandidate的独立expected保持；冷候选只做内部一致性，不冒充现存历史。已有current禁止二次bootstrap、replace、重建未接事实重领奖；格式解析、语义验证、安装、保存权限分开。

实现有限设计验证：至少覆盖第5节，记录正例、预期拒绝、故障和未支持，不预设漂亮总数。不用旧213项或G4的2791项冒充新方案验证。冻结正文/配置/模型后两次独立进程复跑；结果一致；负控必须由同一套断言发现实际语义错误而不是脚本崩溃。

至少提供四类可选择负控：重复清算、HP0仍召回、借旧ready免结新周期、关闭态降格重接。负控不得写入生产源码；原baseline、输入、旧模型和正式配置均只读。

可增加只读现有API探针，真实运行现有G1/G2/G4的提案／拒绝边界以证明消费者接缝；必须分开“当前代码真实行为”和“未来候选模型”。不mock核心校验返回true后称生产支持。未运行原生探针就标NOT RUN并解释，不让它与有限模型通过混淆。

### W4：集中审阅页与近期完整工程批次

`00-owner-review.md`开头给主推荐、玩家代价和此刻需要Owner确认的具体变化，建议最多3组真正决策，不把二十个API字段交给Owner。已确认方向列为保留事实，不再要求选择。参数采纳范围必须逐键明确，不能让一句“采用推荐”意外批准整包经济。

准备最近最多3个完整工程Goal候选，说明依赖、来源、目标、接口、精确候选写入路径、范围外、原生验收、文档/输入路径和准确SHA停审点。按可独立实审的层次分工，而不是逐函数拆任务。可以比较“终局纯核心→会话完整提交→关闭恢复”的组织，但不能提前认定三个任务都已获执行批准。

每个合同须指出原有精确导出／不支持阶段测试需要同步的最小范围，防止再次出现“新增入口但禁止变更精确导出断言”的任务冲突。技术草案不能擅自给新DEC编号或注册生产format/rulesVersion。

另列下一次可玩版本还欠：真实战斗与医疗、三专长差异、工具箱完整路线、五图实物与任务接线、玩家安全提示/结果摘要、低资产UI、浏览器和多标签、O3、Owner首玩。只标负责阶段和准入依赖，不把这些全部永久排除或塞进本次终局工程。

## 5. 最低验证矩阵（本批有限模型，不是生产通关路线）

| 组 | 必须覆盖 |
| --- | --- |
| T01 完整成功 | 真实样本＋实际目标＋合法生还；重伤同奖；单一缺项不成功；普通战利品少不减任务声明奖励 |
| T02 正常失败 | P=0/19/20/大于20，收入0与一次min(P,20)，真实普通物保留；不隐式卖物、不叠旧罚 |
| T03 截止 | Day7稳定，先血→感染→饥饿、任一阶段死亡短路；生还才召回；不Day8、不跳未结束战斗 |
| T04 正常返回 | Day7正常返回不补夜；静态中枢不结下一周期；无真实新委托不消费ready/due |
| T05 死亡历史 | 活动动作／休整的实际HP0完成终局；不复活；当前可用资产不继承，旧成功／交付／消费历史保持 |
| T06 实例处置 | 样本与普通件、背包／装备／地面／已交付分层；同实例不双归属，不重建满耐久，不拿旧地面回城 |
| T07 幂等 | 重复结果、换execution/title、刷新终态、保存失败后再次点击，不能再奖／再罚／再交付 |
| T08 恢复 | 合法living-hub/dead候选；字段丢失／交叉身份／缺closed／两active／借旧ready／phase与HP不合各拒绝 |
| T09 事务故障 | 校验失败零提交；完整结果提交后write失败保留内存；retrySave仅存最新；重入无第二次规则结果 |
| T10 数值和意图 | 负数、小数、bool、非有限／不安全数、余额／revision溢出；不得以合法后态掩盖非法输入 |
| T11 未支持与边界 | CTB/第二真实委托/旧档发布没有实现时明确未支持，不用占位数据宣称内容可玩 |
| T12 跨文档一致 | 条款、候选参数、所有权、状态机、验证期望和近程合同一致；已批34参数与原件不变 |

可扩展同范围反例，但不通过放松预期或静默删除难例提高通过率。每项用稳定ID绑定条款和断言；未支持项不是通过项，负控检出不是新增玩法用例。

## 6. 执行与检查

开工核对实际HEAD、branch、status、普通/cached diff、origin和worktree；无他人改动且指定SHA可用后新建本设计分支。不从旧设计分支或main出发，不reset、amend、merge/rebase或丢失已存在工作。本地由Codex实查，主线没有访问Owner磁盘。

输入包5件核对SHA256SUMS，原字节归档到entry-003/inputs；本包不含新增空白例外，不改Git/SSL/代理/CI/依赖。

建议实现下列确定CLI并记录真实命令和退出码：

```text
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --output <仓库外run1.json>
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --output <仓库外run2.json>
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control duplicate-settlement --output <仓库外negative1.json>
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control death-recall --output <仓库外negative2.json>
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control old-ready --output <仓库外negative3.json>
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control reopen --output <仓库外negative4.json>
npm run validate:architecture
```

正常两跑退出0并核对结果字节／稳定结果摘要一致；四类负控退出1、有明确失败ID且非运行崩溃。运行时间等不稳定元数据另记，不为字节一致伪造时间。用`validation/results.json`保存最终汇总与可复现运行、来源指纹，不存第二份可编辑规则。源脚本、fixture和配置冻结后如再修改，重做冻结两跑。

检查：精确路径、所有src/正式DEC/配置/历史输入对象保护、两份共享文档完整原前缀、5原件大小/摘要/blob、UTF-8/LF、相对链接和锚点、候选数值状态、普通/暂存/基线/最终提交diff --check。最终提交的验证脚本和夹具必须等于已测试字节。

这是设计任务，不要求用全量生产测试冒充未来模型验证；生产测试／构建／浏览器未运行即NOT RUN。下一真正工程仍须另建实际npm基线并执行check。可读地记录自查及助手证据归属，主会话为唯一写者；助手只能只读评审。

## 7. Git交付与完成报告

在范围内自主完成修订，不逐工作包停下来请Owner批准。全项收口后普通commit（建议`docs: prepare terminal settlement and closed restore entry`）及`git push origin HEAD:refs/heads/feature/design-world-entry-003`；不推其他分支、不强推、不合并、不改历史。

网络失败最多两次普通重试并ls-remote核验；仍失败保留本地提交、报告REMOTE UNCONFIRMED，可在仓库外生成对象核验离线审查包。不降低网络安全设置。

报告必须包含：起始/最终完整SHA、父SHA、分支、实际文件；W1—W4；三层证据区分；主推荐与真正待批项；12组验证覆盖；正例/拒绝/故障/未支持/不符数；冻结两跑与负控；原件/保护对象/diff/链接；commit/push；未完成项及停止点。

**完成停止，等待主线准确SHA实文件评审。** 不进入候选工程、不自行正式落文、不修改Project Sources或项目配置，不执行关机／重启／定时任务。

## 8. 精确路径白名单（最多21条，不要求创建空文件凑数）

以下路径均相对仓库根；未列路径只读。可选只读API探针两件不做就不创建空占位。

```text
docs/design-drafts/world-infected-001/entry-003/00-owner-review.md
docs/design-drafts/world-infected-001/entry-003/01-source-and-adoption-map.md
docs/design-drafts/world-infected-001/entry-003/02-terminal-outcomes-and-settlement.md
docs/design-drafts/world-infected-001/entry-003/03-state-ownership-and-restore.md
docs/design-drafts/world-infected-001/entry-003/04-next-engineering-contracts.md
docs/design-drafts/world-infected-001/entry-003/05-validation-and-open-gates.md
docs/design-drafts/world-infected-001/entry-003/config-candidate.json
docs/design-drafts/world-infected-001/entry-003/validation/check.py
docs/design-drafts/world-infected-001/entry-003/validation/fixtures.json
docs/design-drafts/world-infected-001/entry-003/validation/results.json
docs/design-drafts/world-infected-001/entry-003/validation/review-notes.md
docs/design-drafts/world-infected-001/entry-003/validation/current-api-probe.mjs
docs/design-drafts/world-infected-001/entry-003/validation/probe-results.json
docs/design-drafts/world-infected-001/entry-003/completion.md
docs/design-drafts/world-infected-001/entry-003/inputs/WORLD-ENTRY-003-task-v1.0.md
docs/design-drafts/world-infected-001/entry-003/inputs/OWNER-authority-and-scope-WE003-v1.0.md
docs/design-drafts/world-infected-001/entry-003/inputs/AUD-7ca547a-ENG-RESIDENCE-ACTIONS-001-review-v1.0.md
docs/design-drafts/world-infected-001/entry-003/inputs/BASELINE-AND-INPUTS.json
docs/design-drafts/world-infected-001/entry-003/inputs/SHA256SUMS.txt
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
```

最后两份仅末尾追加G4本次PASS指向、entry-003候选入口、待审状态与保留Gate；完整原字节前缀不变。它们不是本批新的规则主规格。其余已有正式合同、DEC、Content、G1—G4报告／inputs／测试／源码、package/lock、AGENTS、scripts、CI全部只读。
