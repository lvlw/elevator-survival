# ENG-RESIDENCE-ACTIONS-001（G4）：首次出发与活动驻留事务链

> 任务书 v1.0；日期：2026-10-04。
> 已由 WebGPT 主线依据 Owner 既有任务下发／后续分批工程权限，以及已确认 O1/O2、DEC-049/050 和 G3 实审 PASS 下发。收到完整包后直接执行，不再逐步骤请求 Owner 批准。
> 一个完整 Goal：详细设计 → 受控首次出发 → 揭示／拾取／留置／休整事务 → 保存故障与冷恢复组合验证 → 自查修订 → 完整检查 → 文档 → 本分支普通 commit/push。
> 这是新的 headless 消费接口授权，不是修改玩法，不是把 G3 当时未支持的接口倒改为当时已有；本任务完成即停审，不并入终局、战斗或玩家入口。

## 1. Goal 与固定基线

让同一个真实会话从成功 read-null、显式首次创建开始，经过首次委托激活，连续完成移动、来源揭示、普通整实例拾取／留置及合法原位休整，并将每笔完整结果纳入既有保存／恢复与故障处理。不得用预造 active 存档代替这条新端到端路径。

| 项目 | 固定要求 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 起始完整 SHA | 60e9c30732c5e22cfe9ff58b9b381de64b945180 |
| 起始根 tree | cd5ced1ff8be1ee7def4df2cf2ac43e66f1a93a1 |
| 起点来源分支 | feature/residence-session-core-001，只读来源，不在其上交付 |
| 新工程分支 | feature/residence-actions-core-001，由 Codex 从指定 SHA 创建 |
| 允许修改 | 第9节最多27条精确路径；不是必须创建27个文件 |
| 提交权限 | 本新分支普通commit与同名push，不推其他分支、不合并、不强推、不改历史 |
| 停止点 | 最终准确SHA交回WebGPT主线，实审首次激活与跨日事务；不得自动下一Goal |

本批不是完整驻留通关：没有玩家入口、真实五图、医疗消费、战斗、终局或奖罚。使用现有受控测试图和唯一已批准配置，不把测试成本、背包尺寸和商品等扩为真实内容批准。

## 2. 依据、接手与权限

### 2.1 必须读取的规则与源码

先读取实际根与适用嵌套 AGENTS.md，并按其要求读取 GDD、Vertical Slice、Architecture、DEC 和相关 Content。涉及只读玩家查询时读取当前 UIR 安全信息约定；本批不改变 UI/Interaction 分级。

重点依据：

- DEC-049 的角色／具体委托／一次执行、首次激活、活动继续和关闭事实资格。
- DEC-050 的正E最后一动、E0合法免费行为、原位A/C休整、有序身体周期、同次驻留持续现场；首批34个数值及排除项不变。
- `docs/engineering/residence-foundation/runtime-restore-supplement-v1.0.md` 的完整一次提交、保存失败保留内存、严格恢复和单owner边界。
- 同目录 `energy-cycle-contract-v1.0.md`、原首身份契约与G2/G3实际合同。G3的历史“只支持move”仅是当时接口范围，由本任务在第4节明确扩展，历史正文不重写。
- 本包 `AUD-60e9c30-ENG-RESIDENCE-SESSION-RESTORE-001-review-v1.0.md`：G3在准确SHA的限定PASS，不等于终局／战斗／浏览器已通过。
- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/OWNER-approval-WORLD-ENTRY-002-ADOPTION-v1.0.md`；本会话Owner已授权主线直接下发后续批次，不能推导为修改核心机制或发布兼容的全权授权。

定点阅读实际 `mission-lifecycle` 的 public/controlled/validation/tests，G1 `character-cycle`、`residence-energy`、`residence-config`，G2 `residence-location` 全部相关入口与测试，G3 `residence-save`、`residence-session` 全部源码与六份新测试，当前 package.json 和 CI/check脚本。记录具体复用符号与不复用理由；不得用读文件清单代替实际理解。

### 2.2 本地状态及新基线

在任何生产改动前记录真实 HEAD、branch、worktree、status、普通/cached diff、origin及远端参照。主线不访问Owner本地磁盘，由Codex实查。

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
npm run test:run
```

核对指定基线、目标分支与目录无冲突且没有他人未提交改动后，建立 `feature/residence-actions-core-001`。不要从main、设计或G2分支开始，不做merge/rebase/reset/amend。重复收到同一任务时识别自身进度，不丢弃成果。

**实际跑本轮 `npm run test:run` 并留原始日志。** 上轮121文件/2681项仅是历史参照，不能预填为本轮执行。依赖齐备不安装；确实缺失才按现有lockfile执行npm ci，不升级、不audit fix、不改锁、SSL、代理或检查配置。

本任务不含关机、重启、定时任务或无关私人文件操作。

## 3. 本批支持矩阵与唯一事实

存档仍是既有 `elevator-survival.residence-headless` / 1，根结构及已支持的 fresh-hub / active-world 表示不变。无需新增存档格式、持久化 authority、第二身体／时钟／任务账或生产 rulesVersion。

| 当前完整状态 | 本批允许的会话操作 | 约束 |
| --- | --- | --- |
| unbootstrapped / read-error / blocked / no-save | 原G3控制状态机；no-save后显式createFirst | read-null才开放创建，不新增clear/replace或自动恢复 |
| fresh-hub | 原查询／retrySave；新增受控首次launch | 只从真实D1/first-ready、全部明确未接的当前状态出发；只能激活当前受控catalogRef对应的声明 |
| active-world，生还非战斗稳定现场 | move、reveal、pickup、drop、rest，以及原只读与保存重试 | 一条命令一笔事务；使用现有G1/G2规则，没有任意plan/effect提交口 |
| pending、combat、死亡、任一closed历史、return-due/deadline-ready、后续委托历史 | 继续拒绝安装／提交 | 不丢字段，不制造新委托，不兜底fresh；后续责任OPEN |

所有完成后仍为受支持生还稳定态的操作才纳入本批提交。合法规则会产生死亡／战斗提案时，不得删掉后果；开发期headless消费层拒绝未支持的完整结果、零提交，沿用G3隔离。不能把此限制用于以后玩家逃避真实死亡；玩家入口继续不接。

## 4. 一次实现的接口与规则组合

### 4.1 请求分类

由 `ResidenceSessionCommand` 的明确联合表达以下六类意图；继续保留已有 move 类型以免无关回归。全部原始输入严格校验，执行类型与runtime schema一致：

| kind | 字段与意义 |
| --- | --- |
| launch | `identity`（ResidenceIdentity）、`expectedRevision`、`commissionId`；fresh尚无执行binding，不接受玩家提供runId/seed/catalog/初态 |
| move / reveal / pickup / drop | 复用原G2对应LocationCommand完整字段；不要再增加cost/permission/effect/nextState或多边数组 |
| rest | `binding`（LocationBinding）、`expectedRevision`；A/C由真实节点和当前事实决定，不由请求选A或声明安全 |

查询继续只读，`view`不是命令、不产生noop计划。不得引入force、alreadyTriggered、business_supported、skipDeath或类似绕过字段。

普通session index可继续只导出constructor、错误与类型；组合／首次物料入口仍放在受控模块，不公开setCurrent、installCandidate或commitExternalPlan。内部拆分可用第9节两个候选私有文件，不要求预建空模块。

### 4.2 首次launch：新接缝，必须一次完成

首次创建仍只创建fresh-hub，不自动出发。launch从**owner唯一current**读取根身份、声明全集、catalogRef、身体、携带物和revision。selected commission须为该catalogRef的受控声明，并在唯一事实数组中明确unaccepted。其他声明仅为隔离反例，不提供第二份玩家委托供给。

执行物料来自composition注入的窄受控函数，不来自命令或存档临时字段，不使用Date/UUID/Math.random。允许在原composition类型上增加可选的首次执行提供者（精确名称在设计记录定下）：

- 旧G3调用方未配置该能力时仍可运行已有bootstrap/move；launch明确不可用，不提供默认假执行。
- 查询、非法请求、过期revision、非fresh状态、错声明、已激活或不匹配目录时，提供者0次调用。
- 真正合法的launch尝试，在busy保护下调用提供者至多1次；严格复制校验完整RunIdentity与规则绑定。提供者异常／非法返回不得安装、保存或通知。
- 返回只是执行标识／种子材料，不是任意初态、来源重置或安装权；同一已提交launch即使write失败，重发也不得再次调用它或再激活。
- 回调不能在此处重入bootstrap/create/dispatch/retrySave；不要建立常驻第二owner或持久化执行材料镜像。

使用现有首身份 `activateMission` 产生被选委托的活动事实，其他事实逐项保持；使用G1 `planCharacterCycle(kind=depart)` 的真实首次出发分支；使用G2 `establishResidenceLocation` 首次建立同执行现场。具体内部调用先后由Codex在无副作用提案内组织，但**不得先提交active再建立body/site**。

必须保持：首次D1不补昨日；真实身体、E、伤势、药效、额度、携带实例／状态不被免费刷新；角色周期不凭空推进。出发到entry只建立正式初次现场／合法表层知识，不搜索来源、不生成另一个任务。若入口现场需要未支持战斗等协调，整笔headless launch不安装。

最终fresh→active后态必须整体通过原G3验证、预编码，再以原current为前态一次提交：revision恰+1，只有被选事实从未接到活动，新site完整绑定同角色／声明／执行／catalog。一个domain仍只有一个writer。不能用构造旧active存档并重新bootstrap模拟launch。

### 4.3 active驻留操作

- move：保留G3真实G2单边移动。每条边重新检查；E0不能新开移动；既有到达事件／遭遇／死亡能力拒绝保持。
- reveal：owner生成独立当前G2上下文，调用真实 `planResidenceSourceReveal`。正E、同节点、显式可见来源、未兑现与条件满足才执行；固定来源不抽取，随机来源只按既有稳定锚点抽取一次。结果留在真实地面，不自动入包；满包不阻止合法揭示，后续拾取仍要几何／负重校验。不能把任务提取改名为reveal或pickup。
- pickup/drop：调用真实 `planResidenceItemTransfer`，只支持当前稳定节点普通整实例／整堆。pickup必须显式摆放，drop仅从现有背包转到当前地面。不拆分、不隐式合并、不得删后按初始状态重建，原durability/charge/数量随同实例迁移。E0合法且不另结行动流血；不能拾取远程／未知／关闭世界的物体。
- rest：调用真实 `planResidenceLocationRest`，由当前真实位置给出A/C并复用G1全套周期规则。T1—6合法跨日、生还才推进；T7不允许伪造旧任务Day8。按流血→感染→饥饿处理，不免费回血／治伤／止血／修物；C将E重设85而不是补至至少85。现场、来源、物品、敌人进度、知识和随机锚点跨夜保持，不调用initialization。

不增加医疗消费、装备/快捷栏操作、设施安装命令、NPC交换、自动寻路或世界内容注册。它们不是本批“整理/留置”的隐含部分。

### 4.4 按操作验证连续性，不放宽成任意后态

所有操作最终走一个提交入口；不要复制六份保存/通知逻辑。可以抽内部纯转换函数，但不能为此创建通用事件总线或外部可写计划口。

- move/reveal/pickup/drop：身份、执行、任务事实、角色周期和活动clock保持；revision恰+1；只允许各自G2计划的局部差异。
- rest：同角色／执行／任务事实，D和T恰由真实G1周期推进一次；startCycle不变，现场与实物保持；不能为兼容rest把全部clock连续性检查取消。
- launch：严格fresh→首active，按第4.2节核对；不是把原move的“clock不变”检查简单删除。

G2签发计划继续 `assertResidenceLocationPlanCurrent`；launch的多模块提案以本次current、revision、独立受控物料和完整聚合验证组成，不能把未签发外部对象塞进G2计划守卫蒙混。所有候选仍无独立安装权。

## 5. 保存、恢复与重入：六类事务统一保障

保持原顺序：busy／意图与revision → 真实规则提案 → 完整聚合与受支持结果校验 → 序列化 → 一次内存提交 → write一次尝试 → 只读通知一次分发。

写失败不回滚、不bootstrap、不重建现场；后续命令读取最新current。显式retrySave不接受旧字符串，不运行规则、不增长revision、不重发通知。launch失败写入后不能再创建同委托；reveal失败写入后不能重抽／重发实物；rest失败写入后不能重复结同周期；拾取／留置失败写入后不能复制实例。

首次执行提供者、factory、read、write、notify均需保持重入写操作拒绝。监听异常不撤销已经提交的结果，也不阻断其他listener。诊断内部快照含seed，不是UI view model；玩家查询复用G2安全投影，不泄露未抽来源、远程危险或种子。

本批不改 `residence-save` 生产schema/codec/format；其现有表示已能容纳真实G2揭示/迁移/跨日后态。若实查发现必须改变持久化语义，不可用宽松schema或删除来源检查绕开；报告具体最小冲突。正常接口分类与允许测试更新无需逐项请示。

## 6. 原生验收（本批一次完成）

下面是最低责任，不预定测试数量。使用真实identity/G1/G2/G3 API和字符串codec，只对IO、受控执行材料和计数观测作测试替身；不得mock核心守卫返回true。

| 组 | 必须验证 |
| --- | --- |
| A01 首次入口 | read-null→createFirst→launch真实链；无档权限不足、缺提供者、错声明／目录、旧revision、活动态再launch都在物料提供者前拒绝；非法物料／工厂失败零安装 |
| A02 首激活后态 | 真实activateMission+G1首次depart+G2首次现场；唯一活动事实、完整执行绑定、D1/T1、body/携带实例保持、revision+1；fresh任意身体不得借launch刷新；入口遇敌明确未支持 |
| A03 揭示 | 固定/随机来源、满包留地、一次来源耗尽、正E超余额最后一次；未知/远程/缺条件/E0拒绝且不抽取；真实已兑现再请求拒绝原因准确 |
| A04 实例迁移 | 整实例与整堆、耐久/电量保留、显式摆放；重叠/越界/超负重/部分量/隐式摆放/远程/任务物拒绝；E0免费、无额外行动流血 |
| A05 原位休整 | 真A/C与E95→85，受伤/暴露/饱食/药效/额度有序处理；T6→7，T7休整拒绝；不重建site、来源、敌人、知识、实物或随机cursor |
| A06 支持能力 | 新launch入口遭遇、move到达损血/暴露、活敌、reveal或rest的合法致死提案均不伪装稳定；所有拒绝零提交/写/通知，不隐去后果；产品入口保持未接 |
| A07 长链 | 从真实read-null开始至少执行launch→reveal→pickup→move→drop→rest→回访→再pickup的链；只从前一步owner.current继续，逐步核对一次revision/write/notify，不用预置active绕过首激活 |
| A08 冷往返 | 在launch后、揭示后、拾取/留置后、跨夜后分别经serialize→注入存储→新隔离domain恢复；严格前后等价；恢复不resave/observe/draw；恢复后继续下一个真实操作 |
| A09 故障幂等 | launch/reveal/transfer/rest分别注入write失败；current保留、旧请求拒绝、retrySave仅存最新；特别证明来源不重抽、实例不重复、周期不二结、执行材料不再提供 |
| A10 重入与只读 | 执行材料提供者及write/notify里重入所有写操作BUSY；查询/register/cancel纯只读；throwing listener隔离；可变输入不被意外冻结/修改，返回深只读 |
| A11 类型/分类/拒绝质量 | 六类严格联合；view继续查询专用；cost/nextState/flags/多边/seed注入拒绝；不同阶段正确拒绝，不靠多一个未知字段使反例误通过；各case核对期望错误及计数 |
| A12 回归与范围 | 原identity103和cold23、G1/G2原测试、未变G3恢复/错误/域/存储保障、完整check；配置34叶与批准键值、旧源码/保存/规则/输入原件保护 |

至少保留两条带独立计数的真实会话故障链：

1. 首次launch提交r+1/write失败→重复launch拒绝→reveal成功→retrySave仅保存当前。分别数执行材料调用、mission激活、规则提案、内存提交、read/write/notify；不能把函数调用、规则结果和提交混为一数。
2. reveal提交失败写入→pickup→rest提交失败写入→旧rest拒绝→retrySave→新隔离应用冷恢复。核对来源cursor、同一实例状态、唯一D/T及完整快照，不以qty相同代替身份。

原G3测试存在“本批不支持reveal/pickup/drop/rest/launch”的历史限定。允许在第9节列明的测试文件内更新相应断言/名称为G4当前分类，并补对应合法与非法路径；不得删掉真正的关闭/回滚/view/恢复保证。历史141项数量保留历史，不承诺新版本每个旧测试标题永远不变；新增、替换及净增分别报告。原身份核心测试本批完全只读，不再沿用G3 ADDENDUM写权限。

## 7. 自查、记录与工作包

一次完成W1（接口设计/首次激活）、W2（驻留操作与统一提交）、W3（恢复/故障/重入/长链原生测试）、W4（逆向自查、文档和Git交付）。普通细节在白名单内自主处理，不在每个文件/函数之间要求Owner确认。

实现前在G4 implementation-notes记录：唯一状态、请求联合、受控执行材料来源、逐类连续性检查、G3兼容方式和真实调用顺序。完成后反向检查：是否重新初始化已活动site；是否把source claim当库存；是否删除严格校验来接rest；是否在失败写入后再激活/抽样/结算；是否以预构造active代替launch；是否把未支持致死当新玩法豁免；是否让UI或通知者变成写者。

可用只读专项助手审查首激活/故障链，根会话是唯一写者和Git执行者；没有用助手就如实NOT RUN。记录所有失败和修订，不能将作者自查称主线独立审查。

## 8. 检查与交付

本轮真实基线 `npm run test:run`；最终按实际package.json执行 `npm run check`（architecture→typecheck→tests→build）。运行新增定向与原identity/G1/G2/G3回归，并保存原始日志、退出码、展开测试数、修订记录。重复运行不算新增测试。浏览器/真实新槽/多标签/Owner试玩仍NOT RUN。

核对五输入原件逐字节、大小/SHA256/Git blob；SHA清单本身不自引用。四份共享文档只末尾追加G3 PASS和G4作者状态／OPEN责任，原字节前缀保持。G3历史交付文档及原inputs只读；后续状态由G4合同和追加记录说明，不倒改当时支持范围。

按基线Git对象核对其余保护文件，区分已有checkout CRLF与Git字节，不靠修改attributes、whitespace、hooks、CI或--no-verify绕过。显式暂存本任务文件，不git add .夹带。实际执行普通、cached、基线至工作区和基线至最终提交的完整diff --check。源码在最终测试后、暂存后和commit中的指纹必须一致；本包无新增空白例外。

全项收口后本工程一次普通commit，建议message `feat: add controlled first launch and residence action transactions`；普通push `origin HEAD:refs/heads/feature/residence-actions-core-001`。不向main或来源分支推送，不合并/强推，不amend仅为自引用SHA。若网络失败最多重试两次普通push，保留原提交并用ls-remote确认；无法确认如实报告，可生成仓库外离线审查包，不改网络安全配置。

最终报告至少给出起始/最终完整SHA、父SHA、分支、文件清单、W1—W4、12组API/真实测试映射、原生基线/定向/全量/check、实际新增/替换/净增、两条故障链计数、来源/格式/保护对象检查、推送和远端引用、所有未完成项/冲突及停止点。无需Owner逐文件整理。

## 9. 精确路径白名单（最多27条）

A. 会话层代码（既有5条，候选私有拆分2条）：

```text
src/state/residence-session/types.ts
src/state/residence-session/commands.ts
src/state/residence-session/session.ts
src/state/residence-session/controlled.ts
src/state/residence-session/index.ts
src/state/residence-session/launch.ts
src/state/residence-session/transitions.ts
```

B. 会话层测试与唯一测试夹具（7条）：

```text
src/state/residence-session/session.test.ts
src/state/residence-session/persistence.test.ts
src/state/residence-session/session.integration.test.ts
src/state/residence-session/test-fixtures.ts
src/state/residence-session/launch.test.ts
src/state/residence-session/operations.test.ts
src/state/residence-session/operation-persistence.test.ts
```

C. G4交付文档（4条）：

```text
docs/engineering/residence-foundation/g4/contract-and-support.md
docs/engineering/residence-foundation/g4/implementation-notes.md
docs/engineering/residence-foundation/g4/verification-results.json
docs/engineering/residence-foundation/g4/completion.md
```

D. 五件原输入归档（5条）：

```text
docs/engineering/residence-foundation/g4/inputs/ENG-RESIDENCE-ACTIONS-001-task-v1.0.md
docs/engineering/residence-foundation/g4/inputs/OWNER-authority-and-scope-G4-v1.0.md
docs/engineering/residence-foundation/g4/inputs/AUD-60e9c30-ENG-RESIDENCE-SESSION-RESTORE-001-review-v1.0.md
docs/engineering/residence-foundation/g4/inputs/BASELINE-AND-INPUTS.json
docs/engineering/residence-foundation/g4/inputs/SHA256SUMS.txt
```

E. 四份共享文档仅末尾追加（4条）：

```text
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
```

未列路径只读。特别保护整个 `src/core/`（含原103项及新cold测试）、G1/G2实现与测试、G3 `residence-save` 生产及测试、旧医院state/app/UI、DEC/已批准合同/配置/真实content注册、AGENTS、package/lockfile、scripts和CI。上轮对旧身份测试的一行例外不延续到本轮。

## 10. 明确范围外与停止点

不实现：完整返回/截止/死亡/关闭历史安装，钱包/120奖励/失败清算/商城/身体服务，真实CTB/医疗/装备或专长规则，三专长选择机制变更，五图及真实费用/节点注册，工具箱路线补设计，浏览器槽/存档迁移/多标签锁/公开兼容策略，React/UI/素材或玩家入口。

这些责任继续保留：三专长差异、工具箱全路线、安全感染提示、完整终局与稳定战斗保存、O3及Owner真实首玩。不能因本批未接而永久取消，不把新headless操作链称为可试玩完整世界。

本次任务的最后操作是提交准确SHA和交付报告，停止等待主线实审。不要自动做后续终局/经济/战斗阶段，不修改Project Sources或ChatGPT项目配置。
