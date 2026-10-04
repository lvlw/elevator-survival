# ENG-RESIDENCE-TERMINAL-001（A）：终局资格、积分与真实实物清算纯核心

任务书v1.0；日期2026-10-04。**本项已由WebGPT主线依据Owner已有后续分批权限、已批准DEC-051及本包文档实审PASS下发。完整读取后执行，不再逐步骤申请Owner授权。**

一次完整Goal：详细设计 → 只读资格与受控终局 → 真实G1/G2结果消费 → 最小钱包／实物／历史完整计划 → 原生正反例及组合测试 → 自查修订 → 最终检查 → 文档与普通commit／push。**不执行B/C，不在A内接保存或玩家入口。**

## 0. 最终应交付什么

交付纯TypeScript终局模块与唯一运行时四值配置依赖。终局计划同时包含身体/周期承接、正确具体委托关闭、钱包实际结果、真实ItemInstance/ItemState最终归属和被动收据／既成历史，不让调用者分别应用“钱”和“任务关闭”。

四类结果：完整成功、合法主动失败、期限生还失败、合法动作／休整／期限死亡。正常返回不补身体日结；合法HP0必须被完整承接，而不是回滚成生还。所有资格、来源、数值和原提案必须先严格校验。

这是完整计划生产者和消费者，不是完整Profile、通用任务SDK、世界内容、会话owner、存储或UI。A通过也不能宣称新世界可试玩。A只验证B所需的值域与一致性，不提前实现字符串codec或安装API。

## 1. 唯一基线、分支与Git权限

| 项目 | 锁定值 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 写入起始SHA | 6438f7a38939297225538cdd68af24201ed7d34f |
| 父SHA | c67fd4117065e2e0dbd1117cae4fbfaa83791599 |
| root tree | 2afeb4504960b23585f5eb9b718473e2b3e4d161 |
| src tree | 4d28340ad020950e90bbbed1dc0b902a7f6880db |
| 新工程分支 | feature/residence-terminal-core-001 |
| 允许写入 | §8与BASELINE-AND-INPUTS.json相同的最多36条精确路径 |
| 普通commit／push | 仅本工程及同名远端分支，明确允许 |
| 强制停止 | A最终准确SHA源码实审，不自动继续B/C |

工程会话可能仍停在G4旧分支，**允许在工作区干净时读取/取得指定新基线后创建新分支**；进入会话时HEAD不是6438不等于必须重做旧工程。记录入口HEAD，写任何源码前必须新分支HEAD等于上述准确基线。不移动、merge/rebase或push旧分支，不从“最新main”开始。

至少核对并保存真实结果：

```text
git rev-parse --show-toplevel
git remote -v
git rev-parse HEAD
git branch --show-current
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git worktree list --porcelain
git ls-remote --heads origin
git cat-file -e 6438f7a38939297225538cdd68af24201ed7d34f^{commit}
git show -s --format="%H%n%P%n%T" 6438f7a38939297225538cdd68af24201ed7d34f
```

干净且对象核对通过后，由Codex执行`git switch -c feature/residence-terminal-core-001 6438f7a38939297225538cdd68af24201ed7d34f`。允许普通fetch取得准确对象。若同名分支已存在，先查是否本项同基线未完成成果；不覆盖不同历史、不重复建分支。发现他人/范围外改动时保留并报告，不reset、clean、stash掩盖，不要求Owner手动搬文件。

主线能读远端，不能读Owner电脑。main及旧分支参考值见manifest；开工和完成仍由你实际核对。不得amend、强推、合并main、改remote/SSL/代理/凭据或绕过hooks。不执行关机、重启或定时操作。

## 2. 输入与正式依据

包内5件：任务书、授权与范围、本轮文档审查报告、基线manifest、SHA256SUMS。先核对清单，再把5件按原字节归档至§8指定inputs，不把整个ZIP或历史大包重复入库。清单不自哈希；其自身与输入文件做直接字节核对。包内无待安装的新DEC或参数载荷，正式规则已经在仓库。

按实际AGENTS及适用嵌套规则读取GDD、Vertical Slice、Architecture、DEC与相关content。核心来源以本次准确SHA为准：

```text
AGENTS.md
docs/01-game-design-v0.1.md
docs/02-vertical-slice.md
docs/03-architecture.md
docs/05-design-decisions.md                      # DEC-049/050/051及相关实体/恢复原则
docs/content/infected-terminal-core-test-config-v0.1.json
docs/content/infected-residence-core-test-config-v0.1.json
docs/engineering/residence-foundation/terminal-core-contract-v1.0.md
docs/engineering/residence-foundation/terminal-restore-contract-v1.0.md
docs/engineering/residence-foundation/terminal-batch-plan-v1.0.md
docs/engineering/residence-foundation/runtime-restore-supplement-v1.0.md
docs/engineering/residence-foundation/energy-cycle-contract-v1.0.md
docs/engineering/residence-foundation/g2/contract-and-support.md
docs/engineering/residence-foundation/g4/contract-and-support.md
docs/design-drafts/world-infected-001/readiness/03-first-engineering-contract-draft.md
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/OWNER-approval-WORLD-ENTRY-003-ADOPTION-v1.0.md
docs/design-drafts/world-infected-001/entry-003/adoption/amendments/step-semantics-01/DOC-WORLD-ENTRY-003-ADDENDUM-01-v1.0.md
package.json
scripts/validate-architecture.mjs
```

需要玩家查询信息边界时只读docs/09-ui-design-record.md当前有效约定；本项不设计UI、弹窗或Presentation。07覆盖索引辅助定位，不替DEC创造规则。entry-003候选／有限模型／旧输入只作来源和反例导航，**不作为并列当前规则或生产Schema**。不复跑历史模型来“修绿”新DEC造成的旧保护指纹差异。

正式A契约已包含ADDENDUM空步骤消歧，直接以正式目标为准，不再读旧inputs载荷来否决修订。普通内部设计在范围内由Codex做；实质规则冲突才停止相关实现并给出具体句子／接口，不自行补玩法。

## 3. 一次完成的四个工作包

| 工作包 | 一次交付 |
| --- | --- |
| W1 详细设计与最小依赖 | 权威/唯一所有权/完整前态/四结果类型/来源信任边界、严格终局配置、现有API与新接口映射、测试规划 |
| W2 纯终局与真实结果承接 | 只读资格/金额空间、受控正常返回与期限、真实G2动作/休整死亡消费、完整TerminalPlan与原提案严格校验 |
| W3 实物、历史和对抗验证 | 实例/资源/容器及任务处置、单次钱包/关闭、真实两声明后来死亡、来源伪造/数值/空步骤/重放反例及独立调用计数 |
| W4 自查与交付 | 原生定向/组合、全check、原件及范围/旧对象保护、文档状态、普通commit/push及完整报告 |

生产前将设计写入implementation-notes.md，再连续完成W1—W4；不把该设计页变成另一个需Owner确认的小任务。可安排只读辅助审查，主工程会话保持唯一写者和Git操作者；助手意见不是额外执行证据，不把测试数相加。禁止先交一版无真实接口的模型占位来宣称A完成。

## 4. 现有API接缝与纯核心结构约束

| 现有位置／能力 | 本项应采用 | 不得推导 |
| --- | --- | --- |
| mission-lifecycle/controlled.ts：createMissionScope、activateMission、terminateMission | 使用真实具体委托绑定和正式终止函数生成关闭值；保护其原四入口及新增冷候选原含义 | terminateMission本身不含钱包／身体／实物，不能单独当完整清算提交 |
| mission-lifecycle普通restore及cold候选 | 需要同进度验证时保留独立expected；冷候选只读值域 | 从待验候选复制expected、重建空事实或换ID解除已关闭 |
| character-cycle/cycle.ts：planCharacterCycle | 正常返回/期限由A受控组成私下调用一次，然后完整绑定前态；身体步骤按真实结果承接 | CyclePlan只带identity/revision base，不能把结构相似对象当不可伪造凭证 |
| residence-location/movement.ts及普通index：assertResidenceLocationPlanCurrent | G2原生LocationPlan使用其签发与完整前态核对；核对后按真实结果消费 | clone、JSON往返或只有base字段相同就授予计划权限 |
| residence-location/controlled.ts：planResidenceLocationRest | 直接消费该LocationPlan及原G1结果，保留地点A/C合法性 | 另调G1再结一次、让请求随意选择休整地点/模式 |
| inventory、item-state、quick-slot及G2目录依赖 | 复用实例、资源、容器、几何和负重校验；新处分仅组织真实归属 | 数量钱包替代实例、统一资源上限100、任务件恢复满值 |
| 当前state/residence-save、residence-session | 只读了解B/C需要何种完整结果与现存支持限制 | A导入state、扩写codec、安装current或移除G4门禁 |

具体新函数名、最小类型组织和文件拆分由Codex在列明路径内决定，文档与精确导出测试必须一致。建议使用严格构造后的只读依赖及完整计划，必要的签发/前态登记只能是技术能力索引，不得暗中持有第二份游戏current或可变奖励账。

普通terminal/index只导出真正只读查询、所需错误类及类型；受控创建、规则组成、计划签发／消费和测试工厂不进入普通index。不得为方便测试增加公开的任意close(outcome)、setCurrent、install、replace、commitExternalPlan或信任supported布尔入口。受控路径也须验证上下文／来源权限，不是换文件名就可任意填成功。

真正五图任务件／设施／转运生产者不在本项。允许在新测试helper中建立明确绑定角色/真实声明/执行/目录/规则与配置的**测试内容事实**，以及真实ItemInstance/ItemState/容器，检验消费者。不能让普通命令携带完成事实、费用、seed、样本凭证或后态；不把纯测试工厂导入生产。A不硬编码五图节点或把酒店访问数当通关条件，当前H0等角色位置由受控内容声明映射。

## 5. 必须实现的合同

### 5.1 严格输入、来源与一笔计划

完整输入必须覆盖根角色与版本、G1配置身份、终局配置身份、声明全集与唯一active、当前独立身体/周期/现场、钱包、全部有关实例及归属、任务资格和已关闭/已处分历史。只建立本项必须的值结构，不造完整Profile或通用任务框架。

在调用生产者之前拒绝非法请求形状、版本/绑定/revision、无资格阶段以及已可判定的安全算术错误。对已签发结果，必须在覆盖任何原字段前验证原结构、数字、完整前态和非自有字段、来源/结果一致性。已有规则调用必须如实计数；不能将“没有完成计划”写成“没有调用过生产者”。

所有运算排除NaN/Infinity、bool、字符串、小数、负数、超安全范围、缺字段与未知字段，不用取整/默认值/裁剪洗白非法输入。只允许正式规则规定的HP/精力截零和失败有限扣款；它们不是一般输入修复器。

有效原提案采用副本消费，不修改或冻结调用者原对象，不覆盖后才校验。完整终局只承接一次已有G1/G2 revision，不为钱包与关闭再加一次。相同合法输入保持确定性；技术提案签发不是持久化的第二事实。

### 5.2 正常返回、期限和死亡的步骤分流（本次重点）

| 分支 | 必须原生验证 |
| --- | --- |
| Day1—7合法H0正常成功／主动失败 | G1真实steps=[]、outcome alive、deathCause=null、requiresDeadlineClosure=null；body/cycle/额度保持、revision恰一次、return-due全部来源字段正确；空身体步骤不跳过关闭/钱/物 |
| Day7异地稳定期限生还 | 一次G1，cycle-bleeding→infection→hunger→end-cycle真实非空步骤；deadline-ready与requiresDeadlineClosure对应最新任务和已结周期，角色周期可前进但旧任务不产生Day8 |
| G1期限死亡或G2动作／休整死亡 | 非空合法BodyStep对象数组、来源/原因/顺序/最终HP0短路一致；先验数组再索引末项，不追加死亡后的end-cycle，不虚增死者周期 |

正常H0达到全部资格只接受显式成功；不完整才允许显式失败，错误意图拒绝后保持原态，不自动改投另一个分支。正常Day7也不补夜。期限只在Day7异地稳定且没有未结战斗/立即结果时启动；H0不能拿期限入口补一夜，E0或现实时间不自动截止。

真实G2死亡方案使用原签发对象与完整旧态。测试必须验证调用方复制或篡改不能取得签发权限；受控G1私下调用结果也须有完整前态约束，不能仅验证id/revision相等。验证不重执行伤害、周期、随机、物品效果；不是把模型固定流血字符串模板移植到生产。

终局dead结果另有完整值校验；不可伪造active使命或临时抬HP以通过只支持其他阶段的恢复器，不给现有CycleClosure加death字面量。不清掉真实效果/位置/来源/pending历史来凑可保存后态。支持范围内的真实HP0必须得到完整dead计划；未实现的实际战斗解析仍明确不支持，不扩为CTB工程。

### 5.3 唯一四值依赖与钱包

使用docs/content/infected-terminal-core-test-config-v0.1.json已批准内容，键恰好：

```text
success_reward = 120
initial_balance = 0
balance_max = 2147483647
failure_penalty = 20
configurationId = infected-terminal-core-test-v0.1
```

configurationId是依赖身份，不是第五个经济参数。唯一运行时生产者为src/content/infected-terminal-core-v0.1/config.ts，经terminal/config.ts严格校验/冻结后导出受控依赖。core不读取docs、不反向导入content、不含第二份默认金额；B/C将来只注入同一依赖。原G1的configurationId和34项值保持原样，不能用终局ID替换它。

不新增玩家rulesVersion或放宽版本注册；核心使用受控输入并全链绑定现有版本值。测试采用显式测试声明/版本，不把测试字面量注册到生产入口。

提供纯金额空间资格：P<=max−声明全奖；活动态也保持全奖空间。空间不足无副作用；**接入实际launch是C，不修改G4 launch。** 当前无世界积分交易，不建冻结/备用余额。成功合法生还按120足额，重伤、少普通战利品不减奖；失败收入0且只min(P,20)，P0/19/20/47均准确；死亡收入0、罚0、当前可用余额0。不自动卖物、造债或叠旧医院粮金罚。

收据为被动事实：绑定角色/具体委托/执行/结果/周期及本次金额、处分引用，与唯一余额/任务事实联合一致。显示/读取不清算。不用一个可变“已领奖ID列表”代替真实任务关闭，也不持久化能由唯一状态派生的第二余额。

### 5.4 真实物品、任务资产和历史

生还普通合法携出保留原实例、数量、资源和已有效果；旧中枢普通家底不额外没收。任务件分类与指定样本来源由受控声明决定，不按显示名，不将普通金属/布料误作任务件。

真实背包中的正确样本且其余目标完成方能成功；地面、已另交、毁失、同名假物或错定义/来源/执行/ItemState不授予成功资格。失败携回正确样本记部分交付且无积分，携回未安装专件交回，当地权限失效；不可领回续做。未携出地面只保留不可访问历史，不先搬回中枢再处理。

死亡仅处理当时仍可用的背包/装备/快捷位/仓存等资产及余额，使其不可用/不继承；已安装/交付/消费/毁失及旧成功/旧罚不改写。保留必要真实处分并引用实例，不造第二份可用库存。

每个实例唯一归属，ItemState精确匹配定义与资源；不删后重建、不恢复满值、无隐式拆堆/合堆/补槽。不要把“整实例迁移”误为要求可变JS引用相同；纯快照可以复制值，但实例身份和真实资源必须连续。源生产者已执行的合法物品变化须承接，不重新抽取或制造同名替代物。

### 5.5 历史、幂等与支持矩阵

必须有**真实两份明确测试声明**的组合：旧委托正式成功的完整A输出 → 另一个独立声明的活动事实/现场 → 真实G2动作或休整死亡 → 新A死亡清算。旧成功、收据、已交付/安装/消费与旧罚不被改写。使用实际使命与G1/G2入口建立必要中间事实，夹具只提供受控内容/初值，不手工拼一个假closed结果冒充A输出。

这里是消费者历史组合，**不是注册第二玩家任务、实现未来接任务系统或支持新任务激活前衔接死亡**。后者仍是后续Gate；不得给未激活任务伪造death、也不修改旧成功。测试独立声明须明确自己的适用政策，不把20自动推广为所有任务。

重复关闭、旧revision、改执行/标题/规则版本、重建空事实均不能利用现存权威历史重领或改结果。A无current安装权，不能宣称单个纯函数阻止了调用方丢弃全部历史；说明调用方/未来C的唯一状态责任。同进度恢复expected独立，冷候选不承诺反离线回滚。

## 6. 原生验收：T01—T12一次完成

合同原矩阵全部保留，以下是执行证据要求，不是预设测试数。测试全部在真实TypeScript模块；正例和完整链不使用替代规则模型。观测可用spy但不替换正例结果。必要畸形生产者反例可在测试内部mock/注入故障并明确归类，**不得为负测新增生产后门**。

| 组 | 重点原生正例与反例 |
| --- | --- |
| T01 资格/成功 | 完整、重伤、少普通物同奖；两个目标缺一、样本真实容器/定义/来源/执行/资源错误、不要求酒店；查询零规则调用/零修改 |
| T02 失败/分流 | P0/19/20/47、一笔有限罚；达标失败拒绝、不达标成功拒绝；错误无副作用、不自动替换意图 |
| T03 期限 | 合法Day7异地生还；血/感染/饥饿分别致死短路；H0、非Day7、pending/战斗与非法数字拒绝；真实角色周期和taskDay分别断言 |
| T04 正常返回 | 至少Day1与Day7各自成功/失败四原生例；真实steps=[]、身体/周期保持和一次revision；篡改为非空、错误outcome/原因/期限标记/return-due/前态均拒绝；不能靠“数组非空”验权限 |
| T05 死亡消费 | 真实G2移动/揭示等动作以及A/C休整死亡、真实G1期限死亡；保留真实费用/来源游标/物品与身体后果；动作/周期/随机不多调用；死亡空/畸形/错序步骤和假来源拒绝 |
| T06 实物/历史 | 普通物、旧仓、样本部分交付、专件/权限、地面隔离、真实耐久/电量/数量；双归属/资源越界/假定义拒绝；完整两声明旧成功后来死亡 |
| T07 权限/重放 | 原生签发可消费，结构复制/JSON往返/错误完整base不可冒充；旧revision、closed换ID、伪完成布尔拒绝；新普通及受控导出有精确集合断言 |
| T08 完整结果 | body/clock/D/T/最新source/任务/收据/钱包/处分引用一致；中间HP0与最终dead分开；无第二事实；B编码/安装仍NOT RUN |
| T09 拒绝/副作用 | 输入前拒绝：生产者计数0；非法结果拒绝：如实计数已调用1、完整计划0，原态/原提案不变；有效消费复制一次、零IO/提交；可变与冻结输入均测 |
| T10 严格值/溢出 | 负/bool/小数/NaN/Inf/unsafe/缺/额外字段；合法数值但越权改钱包/历史/归属；满奖恰到上限、超一拒绝、revision/D安全溢出先验；死亡清零不能洗白非法值 |
| T11 明确不支持 | CTB/医疗、玩家内容、安装/保存/会话、未知技术模式无默认回退；普通查询无隐藏感染/seed泄漏；不造新任务/出发前死亡入口 |
| T12 回归/交付 | 配置逐键/身份、原身份103及cold23等原断言保留、G1/G2/G3/G4现有回归和完整check；保护对象/范围/原件/文档/提交一致性 |

给出至少三类实际计数记录：正常返回；期限（生还和至少一种死亡）；G2已签发死亡（动作和休整）。分别计G1周期调用、G2生产者调用、随机draw、正式terminateMission调用、A完成计划与外部IO。已有G2计划进入A前的调用与A消费阶段增量分开；A内动作/日结/随机增量应为0，正常/期限受控组成只取一次G1，终局额外revision为0。没有会话，不能把“返回对象一次”冒称一次真实内存提交/保存。

旧身份测试103与cold23等数量仅作为历史导航；以实际基线为准。原K18/K19/K20语义和精确导出不弱化。若只需在新terminal测试覆盖组合，优先不改旧测试；§8两条旧测试仅作为必要的新增回归预授权，不要求凑变更数。

完成前做一次接口/规则反查：正常无步骤不被误杀、日结不被免除、死亡不被回滚、输入不被覆盖洗白、真实G2 revision不再加1、签发与权威不由候选自证、实例没有双真相、核心没有保存/玩家依赖。发现范围内问题在本批修完，不返回给Owner逐个协调。

## 7. 实际基线、检查与原始记录

新分支基线明确后、改生产前必须实际执行：

```text
npm run test:run
```

124文件／2791项只是G4历史参考，本轮不得预填。记录命令、退出码、文件数、展开测试数、失败、日志位置。基线失败须说明并停止相关生产改动，不借本项修历史无关问题。

完成后至少实际执行：

```text
npm run test:run -- src/core/residence-terminal src/content/infected-terminal-core-v0.1 src/core/mission-lifecycle src/core/character-cycle src/core/residence-energy src/core/residence-location src/state/residence-save src/state/residence-session
npm run check
git diff --check
git diff --cached --check
git diff 6438f7a38939297225538cdd68af24201ed7d34f --check
```

以当时实际package.json为准；当前check含架构、类型、全测试、build。必要时可按未改lockfile执行npm ci以准备测试环境，不增加或升级依赖，不运行audit fix，不改检查阈值。构建告警与真实失败分开；失败修订后复跑不算新增测试。未跑浏览器/真实保存/试玩写NOT RUN。

临时脚本和全量日志放仓库外。仓库保留规定验证记录和必要可核查摘要，记录源码对象及实际测试覆盖；无需把全部控制台日志塞进文档。必须核对：

1. 所有5份输入与外部包原字节/大小/SHA/Git blob相同；无行尾空白例外、不改原件。
2. 正式DEC/两配置JSON/三终局合同/原首/O2/G1合同及历史模型/输入不变；原G1 34值、终局四值只读oracle一致。
3. 实际变更是最多36条集合子集；除两条必要测试新增外，所有既有生产源码/测试/依赖/配置对象不变；四共享文档只末尾追加完整保留基线前缀。
4. 无旧v1、G4 consumer、浏览器/React/随机熵新接线；新core无state/content反向依赖，生产不导入测试helper；不造循环依赖。
5. 新测试源码、运行时源、暂存及提交对象一致，不能测旧代码然后提交其他字节。新增/替换/删除/净增分别列明。
6. 所有新增当前文档链接/锚点核验；输入报告中的历史路径按所记录来源解释，不改原件来修相对路径。

如果确有规则/白名单冲突，停止受影响部分并明确具体路径/现有断言/最小请求；不自行扩范围、吞失败或强行升级规则。普通函数拆分和反例修正不需要Owner确认。

## 8. 精确路径白名单（最多36条）

未列路径只读；目录名不是递归授权。新文件只创建实际所需，不为凑数量创建空占位。正式规则与配置JSON已经归档，**本工程不再写它们**。

### 8.1 新终局模块与运行时内容依赖（21条）

```text
src/core/residence-terminal/types.ts
src/core/residence-terminal/validation.ts
src/core/residence-terminal/config.ts
src/core/residence-terminal/config.test.ts
src/core/residence-terminal/authority.ts
src/core/residence-terminal/plans.ts
src/core/residence-terminal/dispositions.ts
src/core/residence-terminal/settlement.ts
src/core/residence-terminal/controlled.ts
src/core/residence-terminal/queries.ts
src/core/residence-terminal/index.ts
src/core/residence-terminal/test-fixtures.ts
src/core/residence-terminal/terminal.test.ts
src/core/residence-terminal/terminal.integration.test.ts
src/core/residence-terminal/validation.test.ts
src/core/residence-terminal/history.test.ts
src/core/residence-terminal/step-semantics.test.ts
src/core/residence-terminal/authority.test.ts
src/core/residence-terminal/queries.test.ts
src/content/infected-terminal-core-v0.1/config.ts
src/content/infected-terminal-core-v0.1/config.test.ts
```

### 8.2 现有测试的最小新增回归权限（2条，可不修改）

```text
src/core/mission-lifecycle/mission-lifecycle.test.ts
src/core/mission-lifecycle/cold-candidate.test.ts
```

仅允许必要import及独立新组合断言；旧测试的现有行为断言、K18—K20、普通/受控精确导出集合和原restore保证保持，不skip/删除/arrayContaining/过滤、不整文件格式化。本项不新增mission-lifecycle导出，因此没有修改旧导出预期的授权；新terminal的导出测试写在新模块自己的测试文件。

### 8.3 共享文档只末尾追加（4条）

```text
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
```

按各自职责写简短阶段说明：6438文档实审已通过，A作者实现/验证待准确SHA实审；B/C、内容/保存/体验未完成。保持全部基线字节为完整前缀，不改旧“未实现/待审”的历史正文。指向新A报告和正式合同，不创造玩法。

### 8.4 本项四份交付记录（4条）

```text
docs/engineering/residence-foundation/terminal-core/contract-and-support.md
docs/engineering/residence-foundation/terminal-core/implementation-notes.md
docs/engineering/residence-foundation/terminal-core/verification-results.json
docs/engineering/residence-foundation/terminal-core/completion.md
```

contract-and-support.md写实际支持与接口/矩阵映射；implementation-notes.md保留设计及修订；verification-results.json分层记录命令、数值、计数、保护检查、未执行；completion.md写完整交付与停止。它们不是替换正式A契约的另一个规则源。

### 8.5 包内五件原字节归档（5条）

```text
docs/engineering/residence-foundation/terminal-core/inputs/ENG-RESIDENCE-TERMINAL-001-task-v1.0.md
docs/engineering/residence-foundation/terminal-core/inputs/OWNER-authority-and-scope-terminal-A-v1.0.md
docs/engineering/residence-foundation/terminal-core/inputs/AUD-6438f7a-DOC-WORLD-ENTRY-003-review-v1.0.md
docs/engineering/residence-foundation/terminal-core/inputs/BASELINE-AND-INPUTS.json
docs/engineering/residence-foundation/terminal-core/inputs/SHA256SUMS.txt
```

输入清单不自哈希，清单本身须与外部输入直接相同；不重复归档旧大ZIP，不移动Project Sources。

## 9. 明确范围外与完成报告

除上述新模块/内容依赖和两条可选测试外，**首身份核心、G1/G2全部生产实现、G3/G4 session/save、所有既有玩家入口/旧医院、正式DEC/合同/配置、依赖/lock/构建/CI/AGENTS**不改。禁止B新codec、C完整会话提交、真实五图任务生产者/注册、CTB/医疗/专长/工具箱、钱包消费/商店/治疗/价格/解锁、第二真实委托、新Profile/事件总线、浏览器/多标签、旧档迁移/清理/O3及UI。不得将不支持项永久删除或称作玩家免死机制。

结束只在全部范围内检查通过后普通commit，push到同名新工程分支。可用：

```text
git push -u origin HEAD:refs/heads/feature/residence-terminal-core-001
```

commit前确认暂存仅本项变更；不使用--no-verify，不强推，不推旧分支。提交后再查完整SHA/parent/tree、基线diff --check、输入blob、工作区及远端实际引用。网络失败保留本地提交和真实退出码，最多有限普通重试，不声明未核实的远端成功、不改网络安全配置。

最终回当前WebGPT的报告必须以ENG-RESIDENCE-TERMINAL-001（A）开头，包含：起始/父/最终完整SHA及tree、分支及push实值；W1—W4结果与全部文件；真实开工基线/定向/全check；新增/替换/删除/净增测试；T01—T12的API和用例定位；正常返回/期限/G2死亡的独立计数；原件/配置/保护/范围/diff；失败和修订；规则冲突、未完成及NOT RUN；授权停止点。

提交内报告不能包含尚未产生的自身最终SHA；最终SHA和推送/提交后回执写在提交后的消息，不为补自引用再amend或多造回执commit。作者完成、CI通过与主线准确SHA实审分别记录，不能自称本项已获主线PASS。

**完整交付后停止等待主线准确SHA源码实审；不自动执行B/C或合并发布，不做关机/重启/定时操作。**
