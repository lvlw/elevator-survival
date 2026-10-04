# ENG-RESIDENCE-TERMINAL-RESTORE-001（B）：完整聚合与严格v2编解码

任务书v1.0；日期2026-10-04。**已由WebGPT主线依据Owner已批准的WORLD-ENTRY-003-ADOPTION、DEC-051、终局恢复合同、A→B→C次序及已有任务下发权限执行下发。完整读取后开工，不再逐步骤申请Owner授权。**

本文件定稿B的具体技术接口、支持范围、路径与验收，不改变正式玩法。一次完整Goal：详细设计 → 四态严格聚合 → 并列v2纯编解码 → 独立expected候选验证 → 原生正反例／两声明历史／旧接口回归 → 自查修订 → 文档、检查、普通commit／push。**不执行C，不接current安装、IO或玩家入口。**

## 0. 最终交付

让真实A产生的完整成功、主动失败、期限失败和死亡结果，以及真实首次fresh-hub／稳定active-world，能够作为同一v2格式家族中的完整值严格编码、解码和验证。恢复只得到值，不再清算、不生成权限、不安装、不保存。

这次不只是JSON.stringify包一层：必须完成根身份、两种配置、声明全集、任务、身体／周期、余额／收据、真实实例／ItemState及来源与历史之间的联合检查。未知、坏档、v1和未支持活动战斗不补字段、不回退fresh；合法已完整清算的死亡不能因旧v1不支持而被误拒绝。

## 1. 准确基线、分支及本项Git权限

| 项目 | 固定值 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 写入起始SHA | bfc6bd973eeb306df1e8ee916b2160c30b757cdf |
| 起始提交的父SHA | 6438f7a38939297225538cdd68af24201ed7d34f |
| 起始root tree | 8429346ed7e1e42cf383f68d859c08801c84908e |
| 新工程分支 | feature/residence-terminal-restore-001 |
| 前项审查 | 本包AUD-bfc6bd9-ENG-RESIDENCE-TERMINAL-001-review-v1.0.md，A限定PASS |
| 写入白名单 | §9及BASELINE-AND-INPUTS.json一致，最多28条精确路径 |
| 普通commit／push | 本项明确允许；只推同名新工程分支 |
| 停止点 | B最终准确SHA恢复接缝源码实审；不自动C |

允许在干净工作区普通fetch取得准确对象后，从以上SHA创建本分支。不能在A分支上交付B，不能从main／旧设计分支推测起点。先记录实际入口HEAD、branch、status、diff、origin和worktree；入口HEAD不同不等于任务失败，但写生产前必须已切换到指定基线的新工程分支。

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
git cat-file -e bfc6bd973eeb306df1e8ee916b2160c30b757cdf^{commit}
git show -s --format="%H%n%P%n%T" bfc6bd973eeb306df1e8ee916b2160c30b757cdf
git switch -c feature/residence-terminal-restore-001 bfc6bd973eeb306df1e8ee916b2160c30b757cdf
```

最后一条仅在前提满足且同名分支未存在时执行。若有本项同基线已归属成果，先核实再续办；有不明改动／不同历史／并行写者则保留并报告，不reset、clean、stash、merge/rebase或覆盖。无需Owner手动建分支或搬文件。

本项不允许amend、强推、合并、推main／A／设计／其他旧分支、改Git/SSL/remote/代理/凭据或跳过hooks。权限不含关机、重启或定时操作。main及旧工程参照见manifest；工作区和远端由Codex实查，不冒称主线访问Owner磁盘。

## 2. 原件与正式依据

输入包恰5件：本任务书、权限范围记录、A实审报告、BASELINE-AND-INPUTS.json、SHA256SUMS.txt。先核对4条摘要，再按§9原名原字节归档全部5件；清单本身直接比字节、不自哈希。不要把历史全包重复提交。没有新DEC或待安装参数载荷。

按实际AGENTS及适用嵌套规定，重新读取本准确提交的GDD、Vertical Slice、Architecture、DEC及相关content，不延续旧会话推断。核心阅读入口：

```text
AGENTS.md
package.json
scripts/validate-architecture.mjs
docs/01-game-design-v0.1.md
docs/02-vertical-slice.md
docs/03-architecture.md
docs/05-design-decisions.md                         # DEC-049/050/051及实体、恢复原则
docs/content/infected-terminal-core-test-config-v0.1.json
docs/content/infected-residence-core-test-config-v0.1.json
docs/engineering/residence-foundation/terminal-core-contract-v1.0.md
docs/engineering/residence-foundation/terminal-restore-contract-v1.0.md
docs/engineering/residence-foundation/terminal-batch-plan-v1.0.md
docs/engineering/residence-foundation/runtime-restore-supplement-v1.0.md
docs/engineering/residence-foundation/terminal-core/contract-and-support.md
docs/engineering/residence-foundation/terminal-core/implementation-notes.md
docs/engineering/residence-foundation/g3/contract-and-support.md
docs/engineering/residence-foundation/g4/contract-and-support.md
docs/design-drafts/world-infected-001/readiness/03-first-engineering-contract-draft.md
docs/design-drafts/world-infected-001/entry-003/adoption/inputs/OWNER-approval-WORLD-ENTRY-003-ADOPTION-v1.0.md
docs/design-drafts/world-infected-001/entry-003/adoption/amendments/step-semantics-01/DOC-WORLD-ENTRY-003-ADDENDUM-01-v1.0.md
```

源码须完整读当前A types/validation/authority/plans/settlement/dispositions/config/index及相应原生测试；原mission-lifecycle严格restore/cold；G1 body/clock读取；G2目录／来源实体／ItemState；旧residence-save的types/validation/codec/index和测试；G3/G4会话对旧v1的实际消费。manifest列出部分已核对blob便于开工校验，不替代相关源码阅读。

07仅覆盖导航，entry-003候选与Python模型只作历史来源。正式目标已包含空步骤消歧，不能用旧输入载荷否决当前规则。B不设计UI/Interaction/Presentation；不得把内部聚合导出称为玩家安全ViewModel。

## 3. W1—W4一次完成

| 工作包 | 交付 |
| --- | --- |
| W1 详细设计 | 新入口和旧入口隔离；受控policy来源；四态最小表示；冷候选与独立expected区别；A复用／B新增职责和测试计划 |
| W2 完整值与codec | 严格v2 envelope、四态联合校验、真实A结果无损往返、来源与处分历史、错误分类；无安装／IO |
| W3 原生组合与反例 | 正式规则创建的正例、两声明历史、cold与expected篡改、v1隔离、来源／实例／身体／钱包反例；规则调用与副作用独立计数 |
| W4 自查交付 | 旧身份/A/G1—G4回归、完整check、原件/旧对象/链接/字节范围核查、自主修订、文档和普通commit/push |

生产修改前先把详细设计写入本批implementation-notes.md，随后连续完成。不将这页变成需Owner逐项批准的小任务。只读助手可专项检查，主工程会话保持唯一写者及Git操作者；助手意见不算额外执行证明。

## 4. 本任务明确的新入口与职责

### 4.1 采用独立barrel，不修改旧导出清单

新增`src/state/residence-save/terminal-index.ts`，其运行时值导出集合固定为：

```text
TERMINAL_RESIDENCE_FORMAT
TERMINAL_RESIDENCE_FORMAT_VERSION
TerminalResidenceSaveError
createTerminalResidenceEnvelope
deserializeTerminalResidenceSave
restoreTerminalResidenceCandidate
serializeTerminalResidenceSave
validateTerminalResidenceAggregate
```

`terminal-controlled.ts`只值导出`createTerminalResidenceSavePolicy`。所需只读types可另作type export，不增加值导出。内部helper由Codex在白名单内组织；导出精确集合须有新测试锁定，不用arrayContaining、过滤或skip。

旧`residence-save/index.ts`、types/validation/codec和所有旧测试完全不改。旧7个值导出、v1版本检查、closed unsupported和G4默认消费者含义保持；在新terminal-compatibility.test.ts同时核对旧集合与旧拒绝，不需要修改旧断言来给新API让路。

这是本次正式B任务对候选文件组织的最终定位。来源候选曾列旧index作为可能写入路径，不是必须改旧接口的规则。本任务选择独立入口，避免同名API悄悄扩义。

### 4.2 纯接口契约

| 新接口 | 最低契约 |
| --- | --- |
| createTerminalResidenceSavePolicy | 只供可信composition配置：G1已签发配置、A终局已签发配置、受控rulesVersion、完整声明及各自TerminalPolicy/catalog；严格读取、复制、冻结必要数据并校验依赖绑定，无游戏current或IO |
| validateTerminalResidenceAggregate | unknown＋受控policy → 严格四态完整值。不得执行任务／周期／动作／随机、补字段或分配游戏身份；结果不是安装许可 |
| createTerminalResidenceEnvelope | 先严格验证state，再产唯一规范v2 envelope；不把TerminalPlan／authority／policy作为可保存内容 |
| serializeTerminalResidenceSave | 先完整语义校验再编码字符串；不得先JSON stringify/parse洗掉非法原字段、NaN、undefined、访问器或原型 |
| deserializeTerminalResidenceSave | string → unknown → 严格envelope及版本 → 冷态联合校验；只返回值，不重新清算或调用工厂。读不到值、格式不支持和错误不等于无档 |
| restoreTerminalResidenceCandidate | unknown候选＋必需的独立同进度expected＋受控policy → 无安装权的只读候选包装。expected不能省略、由候选生成或用可选标志跳过；§6明确同进度比较 |

具体TypeScript类型、参数内部组织与错误码细目由Codex在详细设计中确定，但以上名称、职责和支持范围固定。错误必须为稳定可测的语义错误，至少分清非法JSON/envelope、未知格式/版本、配置/绑定、非法状态、未支持阶段和expected不符；不将TypeError、崩溃或吞异常当拒绝通过。

新policy是技术受控依赖，不是游戏事实。不得持久化WeakMap/WeakSet、authority或可变历史；不添加全局单例current、second wallet、事件总线或通用Profile。受控policy创建与读取须拒绝形似但未认可的依赖句柄，并避免冻结或执行调用方未知对象/访问器。优先复用A与G1/G2的既有受控句柄。

### 4.3 精确版本与配置

```text
format = elevator-survival.residence-headless
formatVersion = 2
terminalConfigurationId = infected-terminal-core-test-v0.1
```

envelope外层恰为format、formatVersion、state。state中保留A的终局配置身份；G1 CharacterCycleState.identity.configurationId继续是原驻留配置身份，不拿终局ID替换。rulesVersion取受控依赖并全链严格绑定，不新增玩家版本或扩大注册表。

G1与A的运行时配置只读注入，四值120/0/2147483647/20和G1全部34项值不复制为B默认常量。只有技术格式字面量在B按本合同定义。新v2入口明确拒绝v1/未知版本，旧v1仍拒绝v2；不转换旧角色，不清除旧槽，不动O3。

## 5. 四态表示与联合验证

优先复用A的TerminalSnapshot用于active-world/living-hub/dead，只为fresh-hub增加最小所需类型。不能为复用A把fresh伪装active、把死亡临时抬HP或制造假mission。序列化保存值，不保存A计划签发能力。所有结构字段在新schema中明确，不能靠缺失字段默认空历史、0余额或fresh状态。

| 状态 | 本批必须支持／严格检查 |
| --- | --- |
| fresh-hub | 真实首次D1/first-ready，生还、声明全集均未接、钱包等于已批初始0、无既有执行/收据/处分/关闭现场；有受控目录引用与明确初始实物，不是清空旧角色按钮 |
| active-world | 唯一真实活动执行、正确根身份/声明/规则/G1配置/终局配置/catalog、合法D/T、全额奖励空间、真实现场/容器；可带合法旧关闭历史；本批仅活人非战斗稳定现场 |
| living-hub | 本次全部清算完成，HP>0、无active/site，最新closed/receipt/archive与return-due或deadline-ready严格相符；保留普通真实携出与旧仓，任务资产不能成为永久可用物 |
| dead | 实际HP0、活动任务已经以death完整关闭、余额及当时可用物不可继承，真实BodyStep/来源/处分齐备；不虚增死者周期、不伪造G1 death closure、不重写旧成功 |

A实际dead.character.clock可保留导致死亡的active时钟，任务事实已经closed；这是实际已审表示，不是未清算active-world。不得一律按clock.kind拒绝合法dead。真实致死到达在archive中留下combat-required属于不可继续的历史，可往返；活人当前pending战斗仍为未支持，不许清掉pending后接受。未支持的是战斗进行中的可恢复当前会话，不是所有带战斗字样的历史字段。

可复用旧v1的纯fresh校验来验证**已严格读取v2之后**的公共子结构，但不能用读取v1文件再补余额/历史的方式实现伪迁移。A readTerminalSnapshot不支持fresh，必须用真实首次分支而非改字段适配。只可调用既有纯校验／查询／构造值接口；不调用G1/G2规则计划、activate/terminate、A清算或内容工厂来“恢复”。

### 5.1 身份、声明与事实完整性

受控policy的声明／目录来自外部正式组成，不从档案自己的声明扩展支持版本。根角色及所有任务/执行/目录/处分/收据身份一致；无漏项、重复具体委托、双active、执行ID跨声明复用、未知版本或错configurationId。按声明顺序规范化前须完整校验，不能过滤未知条目或用去重掩盖重复。

冷启动可用严格根角色ID和外部受控声明构造校验scope，这是内部一致性的来源，不冒称拥有独立现存历史。整体自洽的离线伪造与用户回滚不在纯本地codec的防护承诺内。已有expected路径另见§6，不能用冷规则代替。

### 5.2 身体、周期、步骤与终局

保留G1正式字段、资源边界与周期关系，复用既有读取校验。最新return-due是正常成功／主动失败的关闭，body/cycle不在解码时变化；deadline-ready引用最新期限关闭，当前D与已结周期一致，旧任务T终止于7。旧ready不能给后来的真实周期提供永久豁免。

正常返回真实steps=[]仍合法；死亡必须真实合法非空步骤、最终HP0、原因／短路与来源相符；日结生还有序且包含end-cycle，死亡后不补end-cycle。检查收据/现值的联验，不重新执行伤害、感染增长、饥饿或任何规则来重建最终身体。每个source字段以原生产者记录语义解释，不抄Python字符串模板。

B应对phase/HP、latest source/D/T、终局类型/步骤、receipt revision、当前身体与已记录检查点作原生反例；旧历史只作已发生记录，不能把旧收据身体检查点强行等同于后来活动中的当前身体。不能以检查不足为由放宽A输入或修改正式规则；现有A复用以外的冷态一致性责任在B新路径中补齐。

### 5.3 钱包、真实实物与来源连续性

金额为合法安全整数、符合唯一配置和当前政策，active保持全奖空间；receipt金额/结果/任务/唯一键与余额/处分一致。禁止缺账、重复清算或凭解码补奖罚。既有receipt顺序、旧成功、旧罚和后来死亡的关系须一致，不加入商店/治疗或未来世界积分交易假设。

ItemInstance、ItemState、容器与历史归属一一匹配。复用实际catalog的实例、资源、几何、负重、装备/快捷位校验；不能把资源统一为100或把普通剩余耐久/电量改回来源初始值。真实处分与archive只有历史含义，不能把同实例同时列为背包、地面、仓库、已交付或不可用。

**来源实体检查不能在换codec时丢掉。** 阅读旧v1 validation.ts中的verifySourceEntities并按A的当前/仓库/处分/archive组织扩展本批责任：未兑现来源不能已有其派生输出，错误source/ordinal/定义/数量组合不能被归档后洗白；已兑现输出与声明可能结果相容，不因解码重新draw、重建缺物或刷新claimed/cursor。校验真实合法剩余状态，不把先前已消费/安装/交付误判为“必须仍在地面”。本批不新增拆分、消耗或任务生产者，仅承接已声明、已实际支持的表示。

样本成功需已审A认可的真实来源／定义／实例／资源和目标；任务件具体处置按DEC-051，不增加失败没收普通物。A因本期政策已有的资产与账链限制保持；不得自行扩成全未来任务通用奖励规则。

## 6. 冷候选与独立expected

`deserializeTerminalResidenceSave`与`validateTerminalResidenceAggregate`明确是冷值/内部自洽路径，不需要编造不存在的current。不因冷解码成功授予install/replace或初始创建资格。

`restoreTerminalResidenceCandidate`为同进度检查路径：expected是调用方从**另有权威且已验证的当前完整值**提供的独立输入。候选和expected均严格读取，在各具体委托上复用原`restoreMissionCandidate(raw, expected, scope)`的独立状态／执行／结果校验，再核对同一进度所需的完整聚合等价（身份、revision、身体/clock、余额、现场、实物和所有历史）。只允许相同已验证进度的值恢复；它不是接受更新状态、合并旧档或业务命令。

明确复制expected给局部只读校验不等于从candidate制造expected；不得在实现中取candidate.missions构造两份相同输入来号称独立。expected不得可选；不存在expected时由明确冷入口处理，不偷偷降级。

返回如`{ kind: 'terminal-residence-candidate', value: ... }`的纯只读值即可，不加入安装闭包、nonce、业务许可或持久化防回滚索引。B不保管current；C以后仍必须拒绝已有current后的二次bootstrap/replace/createFirst，不能凭B候选绕过。

原生测试须分别证明：合法冷解码无现存expected也可返回值；同一候选对独立正确expected可恢复；相同候选对真实closed/不同身份/revision/历史expected拒绝；已被改成内部自洽fresh的对象不能用warm接口盖掉已有closed。不要宣称冷自洽拒绝全部同时篡改历史的离线文件。

## 7. 原生验收B01—B12

正例必须使用真实TypeScript规则及A完整输出，不mock校验函数让值通过。不要求真实玩家内容：允许独立且明确的测试声明、目录、任务事实和初值。测试helper只在测试中引用，不进入新生产依赖。未来fixture参数绝不注册为第二个玩家委托。

| 编号 | 一次完成的验收 |
| --- | --- |
| B01 初始与活动 | 真实首次未接/first-ready/钱包0完整fresh的v2往返；通过正式G1出发、使命激活及G2建立现场得到活动值，不从“改phase”制造；往返后身体、实例、位置、来源及revision一致 |
| B02 四终局 | 用真实A生成正常成功、主动失败、期限生还、动作／休整／期限死亡，再经真正字符串codec往返；Day1/Day7两种正常返回steps=[]；不能只测手拼终态 |
| B03 原生历史链 | 从真实A成功/失败→真实第二测试声明出发/激活/现场→另一任务死亡获得完整链；分别往返旧closed＋新active及最终dead，旧收据/处分/archive原值不变 |
| B04 身份与声明 | 根或子角色、执行、mission、catalog、rules/G1 config/terminal config错绑定，未知／遗漏／重复声明、两active、复用execution等拒绝；不能靠去重或补未接修复 |
| B05 时序和步骤 | 正常due、期限ready、最新关闭/D/T/revision、旧source、死者周期、HP/phase矛盾、中间active＋HP0、空/错序/错误来源死亡步骤拒绝；合法dead archive有pending仍往返；活人pending不被清掉 |
| B06 钱包与收据 | P0/19/20/47真实失败、全奖恰到上限、活动超容量、错reward/penalty/forfeited、缺/重收据、处分引用矛盾拒绝；解码不入账也不生成余额第二真相 |
| B07 实例与来源 | 带低耐久/低电量/真实堆量/旧仓的合法值、真实揭示后地面与处分别；双归属/缺或多ItemState/错定义/资源越界/非法来源claimed组合/任务件泄漏/丢处分拒绝，无draw或刷新 |
| B08 独立expected | 正确同进度候选与独立expected；省略、交叉身份、旧revision、旧closed降格、改身体/钱/物/历史均拒绝。复用原mission restore并验证原K18/K19保证没有改变；冷边界与warm边界分别断言 |
| B09 v1隔离 | 同一个真实v1 fixture经旧接口仍合法、送新接口明确拒绝；v2送旧接口仍拒绝；未知format/version、缺版本和非法envelope拒绝，无隐式迁移/默认字段；旧index保持精确7值、新index精确8值、controlled精确1值 |
| B10 严格数据 | 非string、坏JSON、null/数组/类/访问器/非枚举/符号/循环或稀疏输入按现有纯数据约束明确语义拒绝；负/bool/字符串/小数/NaN/Inf/unsafe/缺/额外字段不被序列化洗白；不将异常崩溃计通过 |
| B11 纯度与确定性 | 冻结与可变输入，不修改/冻结调用者原对象；合法输出深只读、重复序列化稳定、反复解码等价；候选不恢复A/G2计划签发权。codec阶段G1/G2/A规划、activate/terminate、RNG、工厂、提交、写入及通知全0；计数在构造fixture后独立清零 |
| B12 完整回归与交付 | 原身份103/cold23、A156及G1/G2/G3/G4原测试完整保留并实跑；新定向与全check，所有旧对象/输入/配置/范围/链接/测试字节校验；新/替换/删除/净增分别报告 |

B11不要求为了“0次提交”在生产构造假session。规则函数用spy实际观察，必要storage观测可在测试环境进行；不存在的B安装/IO能力以公开API、源码依赖和相关计数共同说明，不将0 IO包装为真实保存故障验证。实际写盘故障与单owner重入归C重新验证。

体积／历史组合仅测本任务有限真实夹具；不新增无依据保存大小上限、任意迁移规则、全局运行历史框架或性能承诺。出现范围内错误直接自查修好；实质规则冲突或确需改A/旧接口时报告具体阻塞，不自行改规则或把合法支持缩成未支持。

## 8. 开工基线、检查与交付过程

新工程基线明确后、生产修改前实际执行：

```text
npm run test:run
```

父项133文件／2947项仅为参考，不能当本轮已运行。记录真实命令、退出码、数量、失败和日志。依赖未准备时可按未改lockfile运行npm ci，不增/升级依赖、不audit fix、不改检查阈值。基线失败先说明，不借本项修无关历史问题。

完成后至少实际执行：

```text
npm run test:run -- src/state/residence-save src/core/residence-terminal src/content/infected-terminal-core-v0.1 src/core/mission-lifecycle src/core/character-cycle src/core/residence-energy src/core/residence-location src/state/residence-session
npm run check
git diff --check
git diff --cached --check
git diff bfc6bd973eeb306df1e8ee916b2160c30b757cdf --check
```

package.json当前check包含architecture、typecheck、全测试、build，仍按实际文件执行。测试源码与实际提交必须相同；报告新增／替换／删除／净增，既有测试本任务不改，预期替换和删除为0。失败修订前后原始记录分别保留，复跑不算新增。

临时脚本、原始log/JSON与审计输出放仓库外；仓库只保留规定报告、必要摘要与路径。完成必须核查：

1. 5份inputs与输入包原字节／大小／SHA／Git blob一致；无新空白例外。清单按原名归档，不覆盖旧A/G4输入。
2. 实际变更是28路径集合子集。所有已存在生产源码、所有旧测试、依赖/配置/CI、正式DEC和合同、旧模型与报告对象不变；4份共享文档只末尾追加，完整原前缀保留。不得以CRLF工作树差异误报Git对象变化，记录Git对象与实际行尾，不改Git配置。
3. 新runtime无React、Zustand、state store、browser IO、系统时间、UUID或Math.random依赖，无反向导入content/测试helper的规则熵；不能靠新codec注册规则、生成身份或游戏结果。
4. 原G1 34值与终局四值／配置身份不变；序列化不重复数值常量。旧v1入口及G4默认行为、A导出与原身份expected保持。
5. 新doc相对链接／锚点有效；准确来源与作者/主线/CI各分层。输入报告只按其历史语境解读，不为适配归档链接改原件。
6. staged和最终commit读取的测试／runtime源码字节等于已验证内容；记录普通、cached、基线及最终diff检查实际结果。

全部通过后允许一次普通commit与同名分支普通push。最终以git show记录完整SHA/父/tree、实际push退出码及ls-remote值，核对旧参照引用未变和工作区干净。不要为记录自己的最终SHA再amend/二次回执提交；可在最终消息及仓库外报告写实收据。若网络失败，保留本地提交并如实报告未确认远端，不强推／关SSL或改凭据。

## 9. 精确路径白名单（最多28条）

以下与manifest完全相同；是集合上限，不要求为了凑数创建无用文件。除4份明确追加文档外，所有路径都是本任务新文件；未列路径一律只读。

```text
src/state/residence-save/terminal-types.ts
src/state/residence-save/terminal-policy.ts
src/state/residence-save/terminal-validation.ts
src/state/residence-save/terminal-history.ts
src/state/residence-save/terminal-expected.ts
src/state/residence-save/terminal-codec.ts
src/state/residence-save/terminal-controlled.ts
src/state/residence-save/terminal-index.ts
src/state/residence-save/terminal-test-fixtures.ts
src/state/residence-save/terminal-save.test.ts
src/state/residence-save/terminal-aggregate.test.ts
src/state/residence-save/terminal-history.test.ts
src/state/residence-save/terminal-expected.test.ts
src/state/residence-save/terminal-compatibility.test.ts
src/state/residence-save/terminal-purity.test.ts
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
docs/engineering/residence-foundation/terminal-restore/contract-and-support.md
docs/engineering/residence-foundation/terminal-restore/implementation-notes.md
docs/engineering/residence-foundation/terminal-restore/verification-results.json
docs/engineering/residence-foundation/terminal-restore/completion.md
docs/engineering/residence-foundation/terminal-restore/inputs/ENG-RESIDENCE-TERMINAL-RESTORE-001-task-v1.0.md
docs/engineering/residence-foundation/terminal-restore/inputs/OWNER-authority-and-scope-terminal-B-v1.0.md
docs/engineering/residence-foundation/terminal-restore/inputs/AUD-bfc6bd9-ENG-RESIDENCE-TERMINAL-001-review-v1.0.md
docs/engineering/residence-foundation/terminal-restore/inputs/BASELINE-AND-INPUTS.json
docs/engineering/residence-foundation/terminal-restore/inputs/SHA256SUMS.txt
```

四共享文档只追加当前A准确SHA限定PASS、B作者实现与支持范围、C未执行及各Gate；不改旧历史正文，不把本批作者check称为主线实审通过。B技术接口及验收细节写入本任务新文档，不回写正式恢复合同或旧工程完成报告。

## 10. 完成报告与强制停止

最终消息标题为`ENG-RESIDENCE-TERMINAL-RESTORE-001（B）`，必须含：

- 起始与最终完整SHA、父SHA、tree、分支、commit／push实际结果、远端确认及工作区；
- W1—W4完成情况、完整文件清单、B01—B12实际API／测试定位；
- 真实基线、定向／全量与check各退出码，新增／替换／删除／净增测试，失败和修订记录；
- 四态及四终局真实A输出的字符串往返、两声明历史、独立expected、旧v1拒绝／兼容的实际结果；
- fixture构造与codec验证阶段的独立规则调用计数、输入不变、零IO及明确未执行项；
- 保护对象／原件／配置／范围／链接／暂存和提交字节核查，规则冲突、未完成项和停止点。

本批无current持有者、bootstrap/createFirst/install/replace、存储适配器、真实保存故障、玩家UI、浏览器/多标签、新内容、战斗医疗、商品服务、专长／工具箱、出发前致死或O3发布实施。未执行项写NOT RUN，不拿已审A或历史设计探针充数。

交付后立即停止，等待当前WebGPT主线对最终准确SHA做B恢复接缝实审。**不自动进入C，不合并／推main，不强推，不关机／重启／定时，不修改Project Sources或项目配置。**
