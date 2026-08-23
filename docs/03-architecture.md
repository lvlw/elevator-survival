# 技术架构与模块边界

用途：记录项目技术架构、模块职责与边界。

> 本文记录已确认的技术职责和模块边界；具体实现以已确认 DEC、版本化配置和代码契约为准。

## 返回、整备与日结算职责

| 概念职责 | 边界 |
| --- | --- |
| 返回结算 | 接收撤离结果，转移物品，更新任务与 Profile 收藏，生成摘要并保存稳定的当前日中枢状态 |
| 中枢整备 | 处理治疗、制作、维修、拆解和整理，不推进日期 |
| 每日结算 | 计算全部日级 Effects，生成次日状态，推进日期与世界，并原子化保存 |
| 保存事务 | 避免半完成 Effects、重复消耗、重复奖励及 Run 与 Profile 写入顺序不一致 |

> 本节只规定职责，不固定类、函数、接口或实现名称。

## Run 生命周期与终止职责

| 概念职责 | 边界 |
| --- | --- |
| 生命周期管理 | 区分进行中、成功、失败和放弃 |
| 终止协调 | 接收明确终止结果，确定唯一类型与原因，冻结 Run、生成摘要、计算 Profile 保留并原子提交 |
| 存档层 | 终止 Run 不再作为活动 Run 恢复；终止事务不可部分提交；Run 与 Profile 写入一致 |
| 新 Run | 使用新的活动状态和种子 |
| 异常恢复 | 返回最近稳定边界，不作为手动回滚且不能刷新已确定结果 |

> 名称仅表达概念职责，不固定最终服务、类、函数或接口名称。

## 当前日中枢与场景生命周期职责

```text
CurrentDayHub
→ Scene Launch
→ Run Scene Session
→ Return / Termination
```

- `DailyRunState` 是“当日是否已经使用主要场景”的唯一日级状态所有者。正式启动原子地将其从未使用切换为已使用；主动／强制返回后保持已使用，只有成功生成次日状态的日结算重置该事实。
- Scene Launch 从严格的当前日中枢投影随身物品、玩家条件、Run 情报与每日医疗使用，并以 Run 身份、规则版本、当前日和正式场景定义确定性派生场景实例身份；不使用系统时间、UUID或环境随机。
- 正式内容层提供完整、版本绑定的 Scene runtime bundle。通用核心只读取注入的场景图、搜索、障碍、战斗遭遇、任务事件、医疗生命周期与设备充能等目录，不反向依赖具体世界内容。
- Run Scene Session 聚合 Scene 快照与 Scene 自身不修改的 Run 日级 context。Scene 中会变化的每日医疗使用、Run 情报、随身物品和 ItemState 只存在于 Scene 快照，不复制到 context。
- 生还返回与死亡终止都从同一严格 Session provenance 投影；返回读取终局 Scene 的情报和每日医疗使用，终止不能在 Scene 死亡后从旧中枢重新拼装另一套上下文。
- Session 恢复使用完整 runtime 校验 Scene、context、场景实例绑定和 Run storage／Scene 物理实例唯一性；Scene strict snapshot 要求 `remainingTime` 是0到当前 `rulesVersion` 的 `scene.totalTime` 之间的安全整数，超出范围的状态会拒绝而不修复。它还要求 `safe-returned`／`forced-returned` 位于正式返程安全节点、returned 玩家存活，并要求 `forced-returned` 的剩余时间为0。死亡 Scene 只要求生命为0，可以位于任意正式节点；损坏状态不会自动修复。

> 本节记录实现职责和状态所有权，不新增玩法数值或场景规则。

## 当前最小 Run 持久化职责

```text
正式稳定状态变更
→ 严格规范化输入阶段
→ 生命周期专用正式 handler
→ 严格规范化输出阶段
→ 校验 RunIdentity 连续性
→ 唯一 saveRunPhase
```

- 持久化层位于 `src/state/run-save/`，依赖 core 的正式构造与恢复规则；core 不反向依赖 state。
- 当前只保存当前日中枢、Scene Session 或 Run 失败三个互斥的稳定 Run 阶段，不保存事务中间态、Effect 计划、预览、派生负载档位或返程估算。
- 存档格式版本与玩法规则版本分离。未知格式或规则版本、身份审计不一致、损坏或伪造的正式快照均拒绝，不自动修复或迁移。
- 当前最小 stable mutation execution boundary 在调用 handler 前严格规范化输入并拒绝终止阶段，在 handler 完整提交规则结果后严格规范化输出；输入和输出使用同一正式规范化入口。
- 普通状态变更命令不得改变 `runId`、`seed` 或 `rulesVersion`。正式 mutation 成功后必须且只调用一次唯一 Run Save；规则拒绝、非法输出和 RunIdentity 不连续均不写入。
- 存储写入失败不回滚已经完成的内存规则结果；失败会连同已规范化的稳定结果显式返回，不重试 handler、玩法 Effects 或隐式保存。
- Success 仍是 DEC-028 定义的未来正式终局概念；当前规则版本没有 Success Resolver 或主线成功条件，因此不能构造、保存或恢复 `run-success`。
- Run 与 Profile 生命周期继续分离；当前已经实现无状态的 Headless Application 统一分派、最小 vanilla Store 和只读 React 展示桥接，但仍未实现完整 RunState、Profile 持久化、Success Resolver、Run Abandon 或 New Run。

## Stable Run 统一 Application 分派

```text
严格解析 application command family
→ 委托既有 lifecycle／scene／hub specialized router
→ specialized router 委托唯一 stable mutation execution boundary
→ 返回唯一 execution.phase
```

- `src/state/run-application/` 只是无状态 dispatch facade，只包装 lifecycle、scene 与 hub 三类既有正式应用命令；内部命令继续由对应 specialized constructor 严格规范化。
- Dispatcher 不维护第四套 phase matrix，不拥有玩法规则、规则版本分派、随机数、Effect、状态或保存策略；它也不直接调用 generic executor、Run Save 或 `storage.write()`。
- Lifecycle、Scene 与 Hub specialized router 继续拥有各自的应用层映射职责，generic executor 继续拥有 canonicalization、RunIdentity 连续性和唯一保存。每次 application dispatch 只委托一个 specialized router 一次。
- `execution.phase` 是下一条命令的唯一正式状态。确定性重放只属于自动化验收，使用正式 registry、Run seed、稳定阶段与应用路由，不在存档或阶段中保存 command history、replay log 或序号。
- 制作、拆解与大部分 React gameplay command wiring 尚未实现；当前已接入启动主要场景、活动场景移动、主要搜索、节点拾取、主动撤离、终止场景结算和医院防火门障碍的确认式 UI，展示与交互边界见后文。

## 最小 Stable Run Application Store

```text
canonical StableRunPhase
→ run-store 作为唯一前台长期 owner
→ dispatch application command
→ run-application 统一分派
→ execution.phase 替换唯一 Store phase
```

- `src/state/run-store/` 使用 `zustand/vanilla`，一个 Store instance 对应一个正在前台运行的 Run application session，并且只持有一个 canonical `StableRunPhase`。
- Store 创建时通过正式 `canonicalizeStableRunPhase()` 严格恢复调用方输入；从存档创建时只委托 `loadRunPhase()`。创建不写存档、无存档返回 `null`，损坏存档继续抛出且不清除、不修复、不迁移。
- Store 对外只暴露 `getState()`、`getInitialState()`、`subscribe()` 与 `dispatch()`；raw Zustand `setState` 保持私有，UI 不能任意替换 phase、生命、库存或战斗状态。
- `dispatch()` 只调用 `executeStableRunApplicationCommand()`，不直接调用 specialized router、generic executor、core resolver 或 Run Save。成功与存储失败都将 `execution.phase` 更新为当前内存真相一次；规则拒绝不更新、不通知订阅者。
- 存储失败后 Store 不回滚、不 reload、不重试；下一条命令从 committed in-memory phase 继续。Execution、result、Effects 和 persistence 状态只作为调用返回值，不进入 Store snapshot。
- Store 不拥有玩法、持久化、Profile、多个 Run、派生 Hub／Scene／Combat／Inventory 状态或命令历史；React 只通过公开只读 Store 接口订阅 canonical phase，展示投影不保存、不随机、不在渲染或订阅期间发送命令。

## 当前 React 展示与第一批命令职责

```text
StableRunStore public read API
→ useSyncExternalStore
→ pure player-visible ViewModel
→ React presentation
```

- `src/ui/` 只读取 Store 对外的 `getState()`、`getInitialState()` 与 `subscribe()`；不访问 raw Zustand API，也不在渲染、订阅或开发检查器中发送命令、保存或改变状态。已接入的确认按钮只调用公开 `Store.dispatch()`，不直接调用 application／specialized executor、core resolver 或保存接口。
- 通用 ViewModel 通过显式白名单向普通玩家展示 Hub、Scene、Combat 与 Failure 信息。节点地面物品、**当前可通行相邻节点**、当前节点明显障碍、相对敌人生命阶段、当前意图和正式返程预览继续复用 core 查询；当前不构造完整玩家已知地图。障碍只投影当前 active Scene、当前节点、尚未解决的正式障碍，选项资格由 core Preview 决定。内部 Run 身份、实例 ID、隐藏搜索结果、障碍随机轨迹、精确敌人生命、风险百分比和未来行动序列不进入普通 ViewModel。
- 医院 V1 的名称文案位于 UI 内容适配层；通用组件不硬编码医院物品、敌人或节点名称。开发环境的只读检查器可以查看严格 phase，但生产环境没有入口，且不提供 mutation。开发环境默认 `App` 未注入 Store 时可动态加载独立内存态预览：它只用正式构造器生成合法 Hub／Scene／Combat／Failure Store，选择示例不发送 gameplay command、不保存，也不是 New Run 或正式游戏入口；生产环境仍保持诚实的未接入状态。
- `src/ui/interaction/` 从 canonical phase、正式 registry、标签和纯 core preview 生成安全行动：主要场景启动、活动场景移动、主要搜索、显式节点物品拾取、主动撤离和终止场景结算。拾取草稿只保存玩家选择的数量、坐标与旋转，调用正式 pickup Preview；背包网格只投影正式几何并作为 anchor 选择，不自动摆放、整理、拆分或创建实例身份。显示与行动 Preview 都只显式投影正式返程、时间、超时损耗、资源与负重事实，不保存原始快照、Effects 或隐藏搜索结果。确认后每次只发出一条 `Store.dispatch()`；撤离先保存 terminal Scene，结算仍由下一条显式 lifecycle command 完成。
- 成功返回后的 Return Summary 只将生命周期 execution result 立即投影为本地、玩家可见的展示模型；它不是 Scene、Run Return、Hub 或 inventory 的状态 owner，关闭不发送命令。当前没有 New Run bootstrap、React Provider、完整 Application Store、UI 命令队列或终版美术。医院防火门障碍已接入正式安全 Preview 与确认分派；Scene 整理、任务事件、医疗、充能、战斗、中枢操作与日结算的 React command UI 尚未接入。展示层可被未来其他渲染技术替换，只要继续读取 canonical phase 并发送正式命令。

## 当前最小 Stable Run 生命周期命令路由

```text
严格解析 lifecycle command
→ 验证 command 与 canonical current phase 的合法组合
→ 按 current phase 的 RunIdentity 选择 rulesVersion 依赖
→ 调用生命周期专用 core resolver
→ 映射唯一 next StableRunPhase
→ 委托 stable mutation execution boundary 规范化并保存
```

| 当前稳定阶段 | 生命周期命令 | 下一稳定阶段 |
| --- | --- | --- |
| 当前日中枢 | 启动主要场景 | Scene Session |
| 当前日中枢 | 结束本日 | 次日中枢或 Run 失败 |
| 安全／强制返回的 Scene Session | 结算终止场景 | 当前日中枢 |
| 死亡 Scene Session | 结算终止场景 | Run 失败 |

- `src/state/run-lifecycle/` 是当前最小生命周期 command／phase 映射的应用层所有者，只覆盖主要场景启动、终止场景结算与结束本日；活动或战斗 Scene 不允许执行终止场景结算。
- Router 不拥有 Scene Launch、Return、Daily Settlement 或 Run Failure 规则，也不直接写存档；它按当前规范化阶段的 `rulesVersion` 读取正式依赖并调用既有 core resolver，随后委托唯一 stable mutation execution boundary。
- 终止 Scene 的位置、时间（包括 `remainingTime` 的0至当前 `scene.totalTime` 上限）和生命合法性属于 Scene strict snapshot invariant；Run Save 与 lifecycle settlement 都通过同一 Scene 恢复入口继承该校验，Router 不复制 returned 位置判断、时间上限或重新结算撤离。
- 每次调用只执行一个生命周期命令。最小 Store 只在调用方显式 `dispatch()` 时发出一条 command；终止 Scene 不自动连锁到 Return，结束本日不自动启动次日场景。React 已接入主要场景启动和终止 Scene 的显式结算；两者都只在玩家确认 Preview 后发出命令。
- 生命周期 resolver 的返回值仅用于展示或审计；`StableRunCommandExecution.phase` 是下一条命令的唯一正式状态输入，result、summary、Effects 和 preview 不形成并行状态或持久化字段。
- 本路由经统一 Application facade 对外分派，最小 Store 已通过该 facade 接入；React 已接入主要场景启动，完整 RunState、其余 lifecycle command UI 与命令队列尚未实现。

### 基础 Stable Run Scene mutation routing

- `src/state/run-scene/` 是当前基础 Scene 玩家 mutation 的应用层映射，覆盖移动、主要搜索、节点地面物品拾取、Scene 背包／快捷栏整理、主动撤离、障碍、任务事件、场景医疗、设备充能与战斗玩家行动。外层命令只携带明确路由 tag 与一个经过对应 core constructor 规范化的正式命令，不接受结果、Effect、风险结果、目标阶段或保存策略。
- Router 在通用 stable executor 完成当前阶段 canonicalization 后，从 canonical Scene Session 的 RunIdentity 取得 `rulesVersion`，再通过既有 Run Save registry 与 `getRunSceneRuntime()` 获取正式 runtime；它不导入具体医院内容、不缓存旧 runtime，也不从命令读取 Run 或 Scene 身份。
- 移动、搜索、拾取、整理、障碍、任务事件、场景医疗、设备充能和战斗玩家行动都调用既有 core resolver，并把正式 resolution snapshot 与 canonical Session context 交给 `createRunSceneSessionSnapshot()` 重建唯一下一 Session；主动撤离直接调用 Session 级 `resolveRunSceneSessionWithdrawal()`。Combat 命令结构、CTB、敌人行动、确定性随机、资源消耗、逃跑、终局和场景时间换算仍由 `src/core/combat/` 与 Scene combat integration 拥有。RunIntel、每日医疗使用、携带容器、ItemState、任务事件、警觉和战斗状态只存在于新 Scene snapshot，不复制到 context。
- Router 不直接调用 Run Save。每次只通过 `executeStableRunCommand()` 提交一个 mutation，由该通用边界验证 Run 身份连续性并执行唯一保存；规则拒绝不保存，写入失败返回已经规范化的 committed Scene Session，不重跑 resolver 或 Effect。
- Scene action 产生 `safe-returned`、`forced-returned` 或 `dead` 时，本次执行仍停在已保存的 `scene-session`。返回 Hub 或进入 Run Failure 必须由下一条独立的 `settle-terminal-scene` 生命周期命令完成；`StableRunCommandExecution.phase` 是下一命令的唯一状态输入。
- ongoing Combat 在每个玩家命令完整结算后保存一个稳定 Scene Session；胜利、逃跑或战败也只提交 Scene Session，terminal Scene 仍需后续显式生命周期命令结算。当前不支持战斗换装或完整背包整理；最小 Store 已通过统一 dispatcher 接入，React 已接入活动 Scene 的移动、主要搜索、节点拾取、主动撤离和医院防火门障碍，但 Combat command UI 与命令队列仍未接入。

### 基础 Stable Run Hub mutation routing

- `src/state/run-hub/` 是当前日中枢玩家 mutation 的唯一应用层映射，覆盖 Run loadout、Hub medical、Hub survival 与 Hub maintenance。外层命令只携带路由 tag 与一个由对应 core constructor 严格规范化的正式命令，不接受 snapshot、Effects、result、下一阶段、保存策略或 Run 身份。
- Router 只接受 canonical `current-day-hub`，从其 RunIdentity 取得 `rulesVersion` 并使用既有 Run Save registry 的 `currentDayHub` 与 `hubMaintenance` 依赖。注册表要求维护依赖与同版本 CurrentDayHub 依赖拥有同一对象身份；Router 不导入医院具体内容，也不复制物品生命周期、医疗或维护内容绑定。
- 四类命令分别调用既有 `resolveCurrentDayHubLoadoutCommand()`、`resolveCurrentDayHubMedicalCommand()`、`resolveHubSurvivalCommand()` 与 `resolveHubMaintenanceCommand()`；容器、目标资格、ItemInstance、ItemState、消耗、日级使用、工时、维修点与 waste 均由 core 拥有。resolver 返回的完整 CurrentDayHub snapshot 直接成为唯一下一阶段，不局部拼接并行 Hub 状态。
- Router 不直接保存。每次成功 mutation 只经 `executeStableRunCommand()` 写入唯一 Run Save 一次；规则拒绝不写入，存储失败返回已规范化的 committed Hub 且不重跑 resolver、Effect 或消费。`execution.phase` 是下一命令的唯一正式状态输入。
- Hub mutation 不推进日期、不启动 Scene、不中途执行 Daily Settlement，也不自动结束本日；End Day 仍是独立 `run-lifecycle` 命令。最小 Store 已通过统一 dispatcher 接入；制作、拆解与对应 React gameplay command UI 尚未实现。

## 场景时间结算职责

```text
最终移动成本 = ceil（基础移动成本 × 各项当前有效移动修正倍率）
```

- 场景时间、基础时间和最终成本均使用整数。
- 时间修正使用独立整数倍率，由整数分子和分母表达；负载模块将所有适用倍率相乘，并在全部修正完成后只进行一次最终向上取整。
- 中间计算可以使用 `bigint`，但最终结果必须是安全整数；超出安全范围时明确失败，不得静默溢出。
- UI预览与正式结算必须调用同一时间修正逻辑。负载模块计算最终移动或预计返程时间；场景事务只消费最终预计返程时间，不重复应用负载或伤势倍率。
- 行动开始前生成与规则引擎同源的时间和结果预览。
- 合法行动完整、原子化结算时间与 Effects 后，剩余时间最低截断为0。
- 行动越过零点时，结算完成后立即触发强制返程。
- 不允许保存行动只完成一半的状态。
- 战斗 CTB 时间与场景时间由独立系统处理；战斗场景时间按 DEC-031 计算为 `max（10，ceil（战斗累计CTB ÷ 100）×10）`，并在战斗结束后一次写回。

```text
验证行动
→ 计算最终时间成本
→ 展示行动后结果
→ 玩家确认
→ 原子化结算行动与 Effects
→ 剩余时间截断至0
→ 如时间为0则进入强制返程
```

> 本节不固定函数、类、类型或未来全部修正的最终组合公式。

## CTB 战斗结算职责

- 每个单位保存下次行动时间，行动效果立即结算，再增加自身 CTB 等待量。
- 同时间点使用确定性优先级：逃跑脱离完成、玩家、敌人。
- 行动延后直接修改目标下次行动时间。
- 风险使用固定等级映射，同一行动内多个风险检查按固定顺序消耗确定性随机序列。
- 结算顺序区分防具直接减伤、防具伤势防护、通用防御、感染暴露及其他标准化 Effects。
- 逃跑行动按以下概念流程处理：

```text
选择逃跑
→ 读取当前状态
→ 计算本次准备时间
→ 创建固定的脱离完成时间
→ 等待时间轴推进
→ 检查是否存在明确中断
→ 完成或中断脱离
```

- 当前状态读取发生在选择逃跑时，包括当前负重档位和当时已经存在的未处理轻度开放伤口；准备时长与脱离完成时间在计算后锁定。
- 脱离准备期间的普通直接伤害、流血或新增开放伤口继续写入玩家状态，但不触发反复计算，也不追溯修改本次计划完成时间；这些状态在逃跑成功后保留，并在未来新一次逃跑开始时进入新的状态快照。
- 只有失能、束缚、行动规则明确声明的逃跑阻断或未来经设计决策确认的中断效果可以中断、取消或改变当前脱离准备。感染护工当前没有此类行动。
- 战斗退出时将生命、伤势、意图和循环等持久状态，与延后、防御、脱离准备等临时状态分开。
- 重入战斗从保存的持久状态建立新的相对 CTB 时间，不刷新已确定意图或随机结果。
- 战斗实际 CTB 持续量在结束后一次换算并提交场景时间，战斗中不逐次扣除。
- 攻击、资源消耗和风险检查必须原子化，不能保存只完成一部分的状态。

> 本节只表达概念职责，不创建类、函数、接口或实现代码。

## 搜索、场景警觉与环境风险职责

- 每个搜索节点使用由 Run、场景实例、节点和主要搜索序号构成的独立派生随机子流；搜索、场景事件和战斗的随机子流彼此隔离。
- 搜索结果在逻辑上由场景实例创建时确定。实现可以延迟物化，但不能把决定延迟为会受搜索顺序、战斗随机消耗或重载影响的可变结果。
- 固定产出与加权抽取分别表达；加权池必须校验权重总和，抽取次数由内容定义。
- 节点的已揭示物品与玩家已拾取物品分别保存；未拾取物品在当前场景实例内持久，不得与仓库物品混合。
- 场景警觉属于场景运行状态。医院切片只使用未警觉和警觉，不使用累计噪声游标。
- 环境风险按以下概念顺序结算：

```text
读取事件事实
→ 读取有效防护
→ 计算最终风险等级
→ 如防护实际生效则生成完整度消耗Effect
→ 使用事件独立随机子流执行风险检查
→ 生成伤势或暴露Effect
→ 原子化提交场景、装备与玩家状态
```

- 防具风险修正、完整度消耗和风险检查顺序固定；完整度消耗取决于防护是否实际改变参数，而非随机结果。
- 风险预览与实际结算使用同一规则来源。搜索或风险事件不得保存为半完成状态，异常退出恢复至稳定事务边界。

> 本节只定义概念边界，不固定函数、类、接口或具体实现。

## 世界专属威胁、强制返程与日结算

- 通用架构承载可替换的世界专属持续威胁定义，不将感染固定为所有世界的必选系统。医院实例使用感染暴露、内部进展、玩家可见阶段、日变化、抑制效果和终末阈值；其他世界可以配置其他威胁。

```text
世界专属威胁定义
→ 暴露来源
→ 进展规则
→ 阶段阈值
→ 日结算变化
→ 抑制或治疗规则
→ 终末条件
```

- 强制返程使用同源预览与结算规则：

```text
锁定返程状态
→ 选择最短已知可通行路线
→ 计算修正后的预计返程时间
→ 计算确定性生命损耗
→ 原子化应用损耗
→ 生还则安全提取
→ 生命归零则 Run 失败
```

- 强制返程损耗不是攻击，不应用防具或战斗防御；事务不能停留在部分扣血、部分提取的中间状态。
- 日结算固定流程为：

```text
持续危险
→ 世界专属威胁进展
→ 饱食消耗
→ 有限恢复
→ 次日状态
→ 日期与世界推进
→ 原子化提交
```

- 任一阶段触发终止条件后，不执行后续普通阶段，不推进日期；日结算可以在内存中分段计算，但不能保存为可加载的部分结算状态。

> 本节只同步概念职责，不创建函数、类、接口或实现代码。

## 医疗物品、轻伤生命周期与规则配置

- 物品使用上下文分为战斗快捷栏、场景非战斗和电梯中枢；不同上下文可有不同时间成本，但必须读取同一物品规则来源。

```text
验证使用上下文与条件
→ 选择合法目标
→ 计算时间和效果预览
→ 玩家确认
→ 原子化消耗物品与应用Effects
→ 更新时间、返程估算和稳定存档边界
```

- 轻伤生命周期为：

```text
产生伤势
→ 可被处理、压制或移除
→ 参与当日日结算
→ 成功生成次日状态时自然消退符合条件的轻伤
```

- 日结算失败不生成次日状态，因此不执行普通自然消退或状态到期清理。
- 规则语义与测试值分离；具体测试数值集中在单一、版本化的规则配置来源，物品说明、可用性、预览、结算、UI摘要和自动化测试共同读取，派生结果不手工复制。
- 新 Run 绑定当前规则配置版本，活动 Run 保存绑定版本；数值更新不得静默改变活动 Run。迁移必须显式、可审计，确定性复现包含配置版本。

> 本节不固定配置文件名、字段、类型、加载方式或迁移代码。

## 时间透支与唯一终局事务

```text
验证
→ 预览
→ 锁定成本
→ 应用主要效果
→ 行动后状态检查
→ 生命终局检查
→ 时间与返程检查
→ 生成唯一结果
→ 原子提交
```

- 超时债务是由行动开始剩余时间和最终成本产生的派生状态；有效紧急撤离时间由锁定债务与行动完成后的真实返程状态共同计算。
- 随机伤势、物品、负重、位置和路线变化以行动完成后的真实状态进入返程计算；预览给出确定值、范围或分支。

```text
验证战斗行动
→ 锁定行动
→ 消耗资源
→ 应用主要效果
→ 玩家行动后流血
→ 玩家死亡检查
→ 敌人失能检查
→ 逃跑检查
→ 推进CTB
```

- 结果互斥：场景继续、安全返回、强制返程生还、战斗胜利、逃跑成功或 Run 失败。同一行动不能同时提交死亡与提取、胜利或逃跑。
- 玩家死亡具有最高终局优先级。同点事件顺序为已开始行动完成、玩家行动、敌人行动，但完成事件仍须经过行动后状态与死亡检查。
- UI预览、实际结算、回放和测试共用纯规则与配置版本；相同版本、种子、状态和行动必须复现相同唯一结果。

> 本节只同步概念事务，不固定代码文件、函数、类或接口。

## 装备维护与破损结算边界

- 维护层级与装备类别正交。耐久资源分为主动装备耐久、防具完整度、设备电量和实际单位数量。
- 主动耐久允许当前值至少1时最后一次破损使用；防具完整度允许当前值至少1时最后一次完整防护；设备电量与单位资源不允许透支。
- 基础维护工时是每日 Run 状态而非物品，每日只生成一次且不跨日；破损装备保留身份、尺寸、重量和最大值，普通维修不改变最大值。

```text
验证维修资格
→ 读取同一配置来源
→ 选择维修目标与分配
→ 预览材料、工时和浪费
→ 玩家确认
→ 原子消耗材料或维护工时
→ 应用耐久恢复
→ 更新稳定存档边界
```

- 材料维修量必须在本次操作中分配，未使用量不得成为隐藏永久资源。
- 临时攻击资格只由当前武器槽派生：武器槽为空，或当前装备武器不具备合法攻击能力时开放；背包和仓库中的武器不参与资格判断。
- 临时攻击资格不单独持久化，每次玩家可行动事件重新计算；破损攻击完整结算后才更新下一次行动集合。

```text
读取当前战斗状态
→ 检查当前武器槽
→ 生成武器基础攻击与签名行动
→ 当前武器不可用时生成临时攻击
→ 同时生成防御、逃跑、医疗等其他合法行动
```

- 背包武器不参与当前战斗攻击行动生成，不引入战斗中换装事务。UI、规则、预览、回放和测试共用同一资格逻辑。
- UI、规则、预览和测试共用版本化配置来源；相同配置版本、种子、状态和操作序列必须复现。
- 长期模拟基于平均收入、平均磨损和波动缓冲，不把第七天硬编码为边界，并须支持抽象三十日及更长验证。

当前配置版本的纵向切片测试预算为：

```text
标准基础周期：
确定性维护8
－基础磨损7
＝1点非累积恢复余量

普通撬棍周期：
确定性维护8
－基础武器5
－基础防具2
－撬棍1
＝0
```

- 每日基础维护工时当前测试值为3，由配置决定；每日只生成一次，不属于库存且未用部分不形成隐藏库存。
- 上述预算是配置版本绑定的测试数据，不是架构硬编码。UI、结算、存档、回放和测试读取同一配置来源。

> 本节不固定类名、函数名、文件名或 TypeScript 字段。
