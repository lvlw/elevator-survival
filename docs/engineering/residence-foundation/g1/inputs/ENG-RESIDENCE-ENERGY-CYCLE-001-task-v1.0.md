# ENG-RESIDENCE-ENERGY-CYCLE-001：G1单精力与有序角色周期完整工程

> 任务书v1.0；下发日期：2026-10-04。
> **已由WebGPT主线依据Owner采纳及接续任务下发权限授权执行，不需要再申请编制、开工或内部步骤确认。**
> 当前只执行G1，一次完成配置、详细设计、实现、正反例与组合测试、自查修订、文档、检查及普通commit／push。
> **最终停止点：本工程最终提交已交付，等待准确SHA源码实审；不得自动进入G2／G3，不合并main。**

## 0. Goal与玩家影响

下游获得可注入配置的纯TypeScript能力：计算一条合法行动的精力后态、有资格行动／已触发结果的局部身体后果，以及有序日级身体／周期计划。把正精力最后一动、E0边界、实际死亡短路、正常返回不补夜、期限衔接不重结等落实为可测试代码。

这是一个完整工程Goal，不拆成让Owner逐函数转发的小任务。内部可分成四包：配置和精力、身体和周期、联合反例／只读交叉审查、检查和交付。四包都在本次做完。

本轮没有新玩家入口，不接五图、钱包、完整终局、CTB、UI或保存。G1完成不等于新世界可玩；后续完整业务与体验门槛保留。

## 1. 基线、分支、Git权限

| 项目 | 本次锁定 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 起始完整SHA | 9dfe21ef7f423c1e5d9801d26e4425b28444cf63 |
| 新工程分支 | feature/residence-energy-cycle-core-001 |
| 来源设计分支 | feature/design-world-entry-002，远端应仍指向起点 |
| main参考 | a76e9c1c998051fc1643b6e0c3d53443fa55feed |
| 原设计分支参考 | feature/design-world-infected-world-001 → 6b48b3de6521d9a9c296754a4d8135c7f7c7ca35 |
| 首核心工程分支参考 | feature/mission-lifecycle-core-001 → d1d3b7927c6733cff709a4bfd617fb1e85e7485a |
| 本次权限 | 从指定SHA新建本工程分支；仅§7白名单内实现／修订；允许本工程分支普通commit／push |
| 禁止 | 推main、推任一设计／旧工程分支、合并、rebase、强推、amend历史、reset／clean丢弃改动、绕过hooks或关闭SSL校验 |

这是首身份核心之后的新工程，不是继续文档归档。继续既有独立Codex工程会话时，必须重读当前仓库，不把旧会话HEAD、diff、规则和配置推断当事实。由Codex建分支，Owner不用手动操作。

先执行并保留真实输出：

```text
git rev-parse --show-toplevel
git remote -v
git rev-parse HEAD
git branch --show-current
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git worktree list --porcelain
git ls-remote --heads origin refs/heads/main refs/heads/feature/design-world-entry-002 refs/heads/feature/design-world-infected-world-001 refs/heads/feature/mission-lifecycle-core-001 refs/heads/feature/residence-energy-cycle-core-001
```

确认origin是正式仓库、工作区干净、起点对象可读、受保护远端引用一致，目标分支不存在时才执行：

```text
git switch -c feature/residence-energy-cycle-core-001 9dfe21ef7f423c1e5d9801d26e4425b28444cf63
```

当前工作分支不必事先是设计分支；可以从任一干净工作区直接按精确起点建分支，不移动其他分支。缺对象可普通fetch。发现他人改动、目标分支已有不同成果、远端漂移或目标新文件已有内容，停止相关写入并报告具体冲突，不自动stash／覆盖／合并。重复收到本任务时，先判断是否同一任务的继续，不能重置已完成成果。

本任务允许普通commit／push的权限不自动延伸到下一工程。无需新建worktree；确有工作区冲突先报告，不制造平行写者。

## 2. 来源、阅读与规则权威

输入包五件：本任务书、OWNER-authority-and-scope-G1-v1.0.md、AUD-9dfe21e-DOC-WORLD-ENTRY-002-review-v1.0.md、BASELINE-AND-INPUTS.json、SHA256SUMS.txt。先验证清单四项，完整读取任务、授权范围和审查；随后按原字节归档到§7指定inputs。清单自身也原字节保留。

必须读取实际AGENTS.md及适用嵌套规则。遵守正式DEC优先于Slice、GDD、Content的顺序。先按AGENTS读取背景，再集中读取以下**起始SHA的正式当前依据**：

- docs/05-design-decisions.md：DEC-050全文、DEC-049及相关旧时间／日级／伤势／恢复条款的覆盖关系。
- docs/content/infected-residence-core-test-config-v0.1.json：唯一已批准数值子集。
- docs/engineering/residence-foundation/energy-cycle-contract-v1.0.md：唯一G1契约，E01—E04、C01—C06、R01—R02必须逐组映射。
- docs/engineering/residence-foundation/runtime-restore-supplement-v1.0.md：只用于界定后续owner／恢复责任，不能提前实施。
- docs/design-drafts/world-infected-001/entry-002/adoption/inputs/WORLD-ENTRY-002-ADOPTION-owner-review-v1.0.md及同目录实际Owner批准记录。
- docs/03-architecture.md、docs/08-rule-implementation-traceability.md的当前有效附记；相关docs/content/items.md、scenes.md、events.md用于保留身体与动作词义，不搬入未采纳的新世界数值。

仅作案例／历史导航：entry-002的原R02—R07、R1周期矩阵、r1-regression-summary及原有限检查。不能把原fixtures全部config、Python实现、expected.json或连续历史草图作为新的生产权威；本轮不改或重跑这些历史模型。

实际源码定点阅读：

```text
src/core/config/deep-freeze.ts
src/core/config/index.ts
src/core/condition/condition-types.ts
src/core/condition/health-operations.ts
src/core/condition/同目录实际身体构造、校验与相关测试（现场查找现有符号，不预设文件名）
src/core/daily-state/daily-run-state.ts
src/core/daily-state/daily-medical-usage.ts
src/core/world-threat/world-threat.ts
src/core/daily-settlement/daily-settlement.ts
src/core/scene/timed-scene-action.ts
src/core/domain/run-identity.ts
src/core/mission-lifecycle/全部现有生产文件及相关测试
src/state/command-execution/stable-run-command-execution.ts
package.json
scripts/validate-architecture.mjs
```

上述源码阅读是找复用与隔离点，不授予修改权。条件校验文件名不存在时，通过实际目录找现有符号，不新建同名假模块。不要求Owner定位源码。

开工即实际运行`npm run test:run`，**在生产写入之前**建立本轮基线。历史2256不预填；缺依赖时可按原lockfile执行必要`npm ci`并记录，不升级／改锁文件／运行audit fix。基线失败须报告，不通过删旧测试或改配置掩盖。

## 3. 已授权的实现自由与共同限制

Codex负责本范围内详细类型、函数名、错误码、拆分及验证设计，不要求Owner逐字段选择。先在implementation-notes.md写需求复述、状态矩阵、依赖方向、威胁边界和预期，再实现／测试／修订；不必等Owner逐项批准普通技术选择。

核心必须纯TypeScript，不导入React、Zustand、state、UI、content或docs，不使用文件IO、时间、UUID、环境随机、保存或订阅。允许复用既有Zod、deepFreeze／DeepReadonly及语义一致的纯函数；不增加依赖。

不复制旧医院daily-settlement或world-threat改名：旧每天一主场景、免费维护、过夜回血／清伤、终末感染硬失败、时间透支债务不可进入新规则。旧文件和原首身份核心保持不变。

本任务中任何“恢复／校验”仅指本模块输入／窄值的严格验证，不实现冷启动、全聚合、存储安装或浏览器格式。所有计划无提交权；局部成功不等于完整世界命令合法。

## 4. 唯一运行时试用配置——本任务明确落点

### 4.1 文件与依赖

本任务明确授权：

- `src/core/residence-config/`的指定文件只提供本G1参数形状、版本绑定、严格校验／冻结及必要安全整数纯辅助，不含当前世界数值常量，不发展为通用配置平台。
- `src/content/infected-residence-core-v0.1/config.ts`是**本轮唯一可执行参数来源**。只声明当前`configurationId`及已批准`config`值，使用纯配置工厂校验／冻结后导出。不得再建立并行生产JSON、第二默认表或模块内硬编码阈值。
- 内容配置导入core校验，运行调用者向精力／周期函数注入同一冻结配置；core不能反向导入content。
- `docs/content/...json`保持只读批准归档，不作为运行时读取源；文档和不可变输入档案不是第二个可执行配置源。
- 不修改`src/content/index.ts`、现有rule-config／save registry、production-composition或任何玩家入口。新文件被测试直接读取，不注册真实新任务／rulesVersion。

### 4.2 准确范围

保留文档配置标识`infected-residence-core-test-v0.1`，不把它等同执行rulesVersion或保存格式。可执行数据只取正式JSON的configurationId与config，不把status／scope／approval文字当玩法字段。

34个数值叶严格与正式JSON相等，递归键集合不增不减：limits.days/energy/hp/satiety；rest.A/C；health指定流血、暴露、抑制、感染增长／伤害分段、饱食后果；三个quota。由自动化一致性测试核对，文档读取只能在测试或仓库外检查脚本里，不能进入生产依赖。

禁止带入prices、load、movement_contusion、combat_energy、limits.grid/max_weight、rest_nodes、medical、绷带和口粮使用效果、奖励／罚额、工具或专长参数。cost=2/8等只可作通用算法测试夹具，不定义真实地图价格。

配置是受控只读依赖。未知／不匹配配置标识、缺多字段、错类型、负值／非有限值／不安全整数和不合法阈值表须拒绝；不得在函数中回退为“默认100”。本轮支持哪个版本由受控注入和明确期望绑定，不由UI任意传入一个同名对象授予规则权威。允许隔离测试验证不同合法输入，但不能在运行时提供换配置／热改数值入口。

## 5. 单精力、身体后果与角色周期合同

### 5.1 单精力与动作粒度

按正式契约实现只读查询和纯转移／计划：当前E、动作类别、free/paid成本、稳定／已触发上下文、受控身份和修订绑定，以及请求的期望修订。上游负责世界位置、真实资源、路线／容量等完整资格；G1检查其自身输入与明确受控前提，不提供玩家`eligible=true`通用执行口。

付费新探索要求E>0；一次条件合法的单边／搜索／明确互动成本超过余额仍完整执行后截0。free必须cost=0，paid必须正安全整数；动作类别与成本种类不符要拒绝，不能把move改free跳门禁。多边仅在测试组合中逐边调用真实入口，E0后不再启动下一边；不实现路径队列或自动导航系统。

E0仅保留各自合法稳定上下文中的查看、整理、已揭示物拾取、药食自救等**局部能量资格**，不替代真实目标／实例／容量／药限检查，也不实现相应物品效果。维修、充能、NPC交付、装接等世界新行动不能E0启动。

已触发战斗／流血／立即结果与“新开行动”分开：正E开始后归零不能取消已触发后果。受控效果计划需绑定同一前态与执行，失败验证不得调用效果提供者、取熵或部分改变身体。无需实现CTB、敌人或战斗保存；不得用可由UI随意勾选的`alreadyTriggered`声称具备完整世界授权。

有资格行动后流血使用已批准bleed_action尺度；不能给查询、整理或免费非战斗药食额外结行动流血。只是消费受控行动完成事实的纯规则，不新增药物命令或战斗调度。避免同一行动在精力模块和周期模块各扣一次流血。

涉及成本倍率时使用显式受控有理数／等价可审计表示，倍率本身非地图／伤势参数批准。全部因子、乘积和最终统一向上取整值须安全，最后才扣E／截零；禁止逐步取整改变成本或用截零掩盖非法成本。

### 5.2 唯一身体与有序日级结果

使用现有身体语义组织最小严格数据：HP、bleeding、实际伤口／挫伤、镇痛、待转换暴露；新感染进展、饱食、精力、抑制及本角色周期额度各仅一份。可复用PlayerConditionSnapshot的类型／校验／纯操作，或写最小显式适配，但不复制同一字段到两个可写对象。不要用`injury:0`占位并宣称已经保全所有伤势。

顺序必须是：完整自身前提校验→流血→感染→饥饿→仅生还者结束周期效果／重建额度／推进时钟／重设E。每段HP0即形成合法死亡结果并短路，未执行段保持原值。输入结构检查与效果短路不同：非法输入先拒绝；不能靠“反正前段会死亡”放过坏数据。

感染：旧进展取基础增长，使用实际暴露和当期实际抑制；增长最低0、不反向治疗既成感染；转换后清暴露，再按新进展取HP损耗。大于等于120且HP>0仍生还，不封顶停病，不强制清HP。

休整不回血、不止血、不治伤、不修物、不充能、不补库存。生还才清当期镇痛／抑制及重建指定日额度；不是建立新的使用药物／金属管具体效果。药限不得借改任务名、跨图或读取重置。A/C为内容上游已验证的休整类型，本模块不创建节点清单或开门资格。

明确返回完整局部不可变后态、已执行有序步骤、alive/death结果及可核验原因。死亡是合法计划结果，不作为拒绝回滚；本模块不关闭任务、不处置钱包／物品、不把结果安装到Store。

### 5.3 时钟、正常返回与一次衔接

当前角色周期D、活动T、执行开始周期等取最小必要事实；当活动时保持D与start/T相符。最新终局／执行／已结周期来自独立受控上下文，不从请求自证。G1不存完整missions历史、claimed集合或第二关闭账，不把有限Python的连续历史全集强加为永久产品框架。

需要覆盖下列窄模式：

| 模式 | 本模块结果边界 |
| --- | --- |
| 合法世界A/C休整 | 仅Day1—6且对应上游休整条件成立；结当期，活才D+1/T+1及E重设；死不建新日 |
| 正常返回周期处理 | 含Day7均不结夜、不改身体／E／药效／额度；形成待结周期含义，不实现返回奖励或任务关闭 |
| Day7稳定异地截止的周期部分 | 先当期身体后果；死则无新日／ready，活才下一D与E重设；不产生旧任务T8或自动召回 |
| 首次实际D1出发的周期部分 | 受控首次前提成立，不补不存在的昨日；一次消费首次ready，不重复初始配装 |
| 最新期限已结ready后的合法出发 | 必须核对最新期限关闭、委托、完整执行及已结周期与当前D；消费ready但不再清刚在中枢使用的药效／额度，不再结日 |
| 正常返回due后的合法出发 | 先真实不同委托及其余前提，按最新整备后状态结应有周期；活才新D；死保留旧已成功／失败历史且不激活新任务 |
| 没有真实可接委托／无效或过期请求 | 不触发健康损耗、不消费ready、不重建任何状态；错误与合法无内容查询分清 |

期限周期计算与终局关闭是同一未来完整事务的不同计划。**计算截止时不能要求调用者预先提交closed来获得ready**：可以输出绑定本次活动执行的待提交周期／ready计划，未来协调器与正式关闭结果一次验证提交。消费既有ready时则必须匹配受控最新已关闭期限事实。此区别不允许G1自己实现关闭或伪造已提交终局。

ready不能是永久免检bool；必须有必要来源绑定。错角色／具体委托／执行／规则或配置版本、旧周期、最新正常返回却带旧deadline ready、不可能D/T均明确拒绝。原首核心不改，测试中的另外声明仅隔离夹具，不提供第二份玩家内容。

revision来自唯一受控前态，纯计划可携带基线绑定／下一修订建议但没有安装权。组合同一行动／周期结果时不能让两个子模块分别commit或各自永久维护revision；完整事务未来只递增一次。本轮用局部测试harness演示重复／过期拒绝，不能据此声称已实现全聚合并发或防回滚。

## 6. 验收：真实测试，不搬运Python成绩

完整覆盖已批准G1契约全部12组，实施说明逐组映射**实际函数、测试名称与已运行结果**；不要仅写“已覆盖”。单元测试与跨模块组合均执行，不能只有数字算术而无实际导出入口链。

最低独立见证（具体测试由Codex一次写齐）：

- E1/cost8→E0；再次开边拒绝；E0已触发结果仍能产生合法局部伤害／死亡；免费和付费每类资格、稳定／非稳定与cost种类错配。
- 冻结及可变输入均不被修改／冻结；输出深只读；重复query、同输入纯计算确定；非法前提不消费效果、危险或随机。
- 数值边界：负值、布尔、小数、字符串、NaN/±Infinity、MAX_SAFE_INTEGER外、缺多字段、未知配置／身份／修订；包括“输入坏但截后看似合法”、乘积及ceil溢出、D和revision递增边界。
- 旧I59→69、89→104、110→130；I110有实际抑制15→115；I0有／无暴露、抑制使增长截0；转换后暴露清除，不能复用旧I计算HP损耗。
- HP2且未止血日结：先流血死亡，感染／饱食／新日不执行；HP3/I110/食4：感染后HP0、食仍4；独立饥饿致死；I≥120且HP足够仍活。
- C休整E95→85、E0→85，A→100；旧伤口、挫伤、流血状态及不属于本模块的装备见证保持，不以凭空修物通过测试。
- 正常Day7返回E0也不加夜；期限日结活者只建下一D不建旧T8；首次D1、due、合法期限ready及错／旧／缺来源分别覆盖。
- `截止→中枢当周期已有药效/额度→消费ready→新活动正常返回→下一次due`组合：首次不重结／不清刚用额度，之后新周期仍结。没有不同委托则全过程不触发出发伤害。
- `正常成功历史→未来合法出发日结致死`局部组合：旧结果不可改death，当前无新执行，不反向撤销旧成果；只在测试harness验证不接终局产品。
- 运行时唯一配置与正式JSON精确键／值一致；原configurationId匹配，核心不反向import docs/content。独立固定预期允许出现在测试中，不成为第二生产常量源。

检查类型保证和运行时严格校验的区别；不能靠TypeScript类型把全部坏输入测试变成“传不进来”。沿用项目错误惯例，拒绝原因稳定且可断言；不吞异常并返回未接或默认身体。

允许只读专项审查助手，但根会话唯一写者与Git执行者。至少完成一次按“重复周期／ready旁路”“非法数字／副作用”“范围／唯一来源”逆向阅读的作者自查并在本批修订。助手意见不算主线独立实审；测试次数不相加包装。

## 7. 精确白名单（29条，源码槽位无需为了凑数建空文件）

### 7.1 只可新增的源码／测试槽位17条

```text
src/core/residence-config/types.ts
src/core/residence-config/validation.ts
src/core/residence-config/index.ts
src/core/residence-config/residence-config.test.ts
src/core/residence-energy/types.ts
src/core/residence-energy/validation.ts
src/core/residence-energy/energy.ts
src/core/residence-energy/index.ts
src/core/residence-energy/energy.test.ts
src/core/character-cycle/types.ts
src/core/character-cycle/validation.ts
src/core/character-cycle/cycle.ts
src/core/character-cycle/index.ts
src/core/character-cycle/cycle.test.ts
src/core/character-cycle/energy-cycle.integration.test.ts
src/content/infected-residence-core-v0.1/config.ts
src/content/infected-residence-core-v0.1/config.test.ts
```

这些目录现在由本任务明确授权，不因旧候选提到路径自动获得无限目录写权。可在这些文件内选择合理拆分，无需建无用途文件；至少真实交付配置、精力、周期和跨模块组合测试。不得创建其他源码路径；确有合同无法在槽位满足的问题，报告必要最小扩展，不擅自改旧文件。

### 7.2 四个既有文档只末尾追加本项状态／映射

```text
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
```

完整保留基线原文，追加本轮真实状态：DOC-WORLD-ENTRY-002在9dfe21e已主线PASS；G1按本任务执行、作者完成待源码实审；独立配置与纯结果分工；G2／G3及真实体验仍未接。不要把原历史“待审”逐处改掉，不把本轮实现写成主线PASS。

### 7.3 三个新交付记录与五个原件归档

```text
docs/engineering/residence-foundation/g1/implementation-notes.md
docs/engineering/residence-foundation/g1/verification-results.json
docs/engineering/residence-foundation/g1/completion.md
docs/engineering/residence-foundation/g1/inputs/ENG-RESIDENCE-ENERGY-CYCLE-001-task-v1.0.md
docs/engineering/residence-foundation/g1/inputs/OWNER-authority-and-scope-G1-v1.0.md
docs/engineering/residence-foundation/g1/inputs/AUD-9dfe21e-DOC-WORLD-ENTRY-002-review-v1.0.md
docs/engineering/residence-foundation/g1/inputs/BASELINE-AND-INPUTS.json
docs/engineering/residence-foundation/g1/inputs/SHA256SUMS.txt
```

原件按字节复制，ZIP不入库，hash清单含自身原件比较。其他临时日志、自查脚本、失败输出和试验材料放仓库外；必要证据摘要进入三份记录，不额外扩充仓库报告。

### 7.4 明确保护

除上述槽位不产生任何仓库差异。特别保护：全部既有src、原mission-lifecycle、旧医院、state／app／UI、random与golden、原DEC001—050、两份已批准合同、正式JSON、原首契约、历史设计／测试证据和inputs、package／lock、AGENTS、scripts、.github、tsconfig、vite、gitattributes。新配置文件不是production注册授权。

无钱包／奖罚／购买／服务、完整医疗消费、地图价或节点内容、敌人CTB／战斗费用／武器技能、专长、工具箱路线、Player-safe UI、浏览器保存／迁移／多标签、全角色Profile、冷候选适配、世界／任务供给SDK、O3发布。不要用这些补满工作时长。

## 8. 检查、报告与交付

完成 targeted 实际测试并修订后，执行当前package里的完整链：

```text
npm run check
```

该链按当前package依次执行architecture、typecheck、test:run和build；逐阶段报告真实结果。针对性测试可按实际新增测试路径执行，不预填测试数量，不用旧213／56或历史2256代替本轮基线。第一次失败、修订和复跑分别记录。

临时检查脚本允许在仓库外写，必须覆盖：新源码依赖方向及无环境熵、配置34数值叶及键集合、所有拒绝无输入修改、全部验收组实际映射、五原件与Git index／blob、四文档原前缀、白名单与所有非白名单对象未变、UTF-8/LF与新增链接、完整普通／暂存／基线diff。

本次输入包无行尾空白；仍需独立检查。不存在新空白例外，不过滤新告警、不改Git配置或hooks。父版本已有历史归档空白不属于本次新差异，也不要求修旧原件。

至少实际执行：

```text
git diff --check
git diff --cached --check
git diff --check 9dfe21ef7f423c1e5d9801d26e4425b28444cf63
git diff --name-status 9dfe21ef7f423c1e5d9801d26e4425b28444cf63
```

未跟踪文件另纳入白名单检查，不能以git diff看不到为通过。按明确文件暂存，不使用`git add .`混入他人文件。报告更新后重新暂存并核验完整index与测试源版本。

报告内容：

- implementation-notes：需求复述、职责与数据所有权、详细设计选择、实际API/错误、配置注入、12组验收映射、已实现与后续责任。不是平行玩法或替换批准合同。
- verification-results：起始SHA、真实环境／Git前态、实际baseline、targeted及最终check各退出码／数量／关键输出、失败修订、配置／指纹／白名单／链接／diff证据、自查与助手证据分层、NOT RUN。
- completion：改动文件、可交付能力、风险与未完成、范围外和停止点。最终SHA以所属提交和提交后消息为准，不为自引用反复amend。

所有检查满足后按本任务授权普通提交，建议message：`feat: add residence energy and character cycle core`。推送只允许：

```text
git push origin HEAD:refs/heads/feature/residence-energy-cycle-core-001
```

提交后复核最终完整SHA、相对起点diff／原件blob／保护对象、工作区与远端同名分支；其他参照分支不变。网络失败可在本任务内再尝试一次普通push／查询；不更改SSL、remote、证书、代理或凭据配置。持续失败则保留本地提交，准确报告PUSH BLOCKED／REMOTE UNCONFIRMED，不重做实现、重复commit或向其他分支推送。

最终报告可直接贴回WebGPT：

```text
ENG-RESIDENCE-ENERGY-CYCLE-001（G1）：COMPLETE／BLOCKED，待主线准确SHA源码实审。
起始完整SHA：...
最终完整SHA：...（未提交则如实说明）
分支：feature/residence-energy-cycle-core-001
配置／精力／周期／组合验证结果：...
真实baseline：...；新增测试：...；最终npm run check：...
配置一致、原件、范围、diff检查：...
普通commit／push、远端与工作区：...
冲突／未完成／后置：...
真实保存、浏览器、Owner试玩NOT RUN；无新玩家入口。
已停止，未执行G2／G3，未推main或其他分支。
```

G1完成即实审，不等待凑满三个Goal。不要自行宣布全世界冻结、体验通过或生产发布，不自动启动下一阶段。
