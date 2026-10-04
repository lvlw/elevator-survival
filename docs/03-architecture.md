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
- `continuity.sceneInstanceId` 是当前 Hub 生命周期的场景锚点，不能无条件解释为“最近已经返回的 Scene”。在医院一日当前范围内，Day 1 pre-first-launch Hub 的锚点是预绑定、即将首次启动的正式首日 Scene identity；普通返回后或次日 Hub 的锚点则是最近完成 Return Settlement 的 Scene identity。两种语义由严格状态条件区分，不增加第二个字段。
- Run Return Settlement 是 Return Ledger 新记录的唯一 owner。New Run、CurrentDayHub、Scene Launch、React 和 Store 均不得预填、伪造或提前写入返回记录；Scene 死亡和 Run Failure 也不写入。
- New Run initial constructor、`CurrentDayHub` strict restore 与 Scene Launch 必须共享一个纯 TypeScript 的确定性 Scene identity derivation owner，输入为 RunIdentity、`currentDay` 与 `sceneDefinitionId`。正式场景定义由当前 `rulesVersion` 对应的版本化内容依赖显式注入，generic core 不硬编码医院 ID。
- Strict `CurrentDayHub` restore 必须区分两个分支：Day 1、`mainSceneUsedToday = false`、空 Return Ledger 且 Scene identity 等于正式 Day 1 派生结果的 pre-first-launch Hub；以及继续要求 Ledger 包含生命周期锚点的普通返回后／次日 Hub。恢复不得自动补 Ledger、覆盖 identity、迁移或修复非法状态。

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
- 核心稳定快照恢复对背包摆放、装备和快捷栏执行严格字段／类型检查；规则绑定的 Hub、Scene 与内嵌 Combat 容器核对正式快捷位数量和可携带背包负重。初始化可显式构造空槽，但存档缺字段、假值、稀疏槽位和不可携带背包不能靠补全或归一化进入稳定阶段；仓库、装备和快捷栏不计入背包重量小计。
- 当前最小 stable mutation execution boundary 在调用 handler 前严格规范化输入并拒绝终止阶段，在 handler 完整提交规则结果后严格规范化输出；输入和输出使用同一正式规范化入口。
- 普通状态变更命令不得改变 `runId`、`seed` 或 `rulesVersion`。正式 mutation 成功后必须且只调用一次唯一 Run Save；规则拒绝、非法输出和 RunIdentity 不连续均不写入。
- 存储写入失败不回滚已经完成的内存规则结果；失败会连同已规范化的稳定结果显式返回，不重试 handler、玩法 Effects 或隐式保存。
- Success 仍是 DEC-028 定义的未来正式终局概念；当前规则版本没有 Success Resolver 或主线成功条件，因此不能构造、保存或恢复 `run-success`。
- Run 与 Profile 生命周期继续分离；当前已经实现无状态的 Headless Application 统一分派、最小 vanilla Store、只读 React 展示桥接、独立的 Headless New Run 创建事务及 New Run Setup React 接线，但仍未实现完整 RunState、Profile 持久化、Success Resolver 或 Run Abandon。

## Production Bootstrap、App Shell 与 New Run 职责

### Production Composition Root

Production Composition Root 负责创建 Browser Run Save adapter，提供规则版本 registry、presentation dependencies 与惰性的 Production RunIdentity／Web Crypto adapter，执行一次严格 bootstrap，并向 App 注入唯一 Store 或应用 Shell 状态。它在 React render 之外使用同一 storage 与 registry 创建 New Run dependencies；只有最终 Confirm 才通过 Headless New Run 事务消费环境熵。Composition Root 不拥有 gameplay rule、Run phase mutation、New Run 初始值、save schema、Daily Settlement 或 Profile。

### Production App Shell

Production App Shell 只允许拥有 `loading`、`ready(store)`、`no-run`、`load-error`，以及尚未确认的 New Run 实用装备选择草稿。它不复制 canonical gameplay facts，也不保存生命、日期、库存、任务、场景、战斗或 Failure reason 作为第二份状态。

### Strict Bootstrap

```text
Browser Run Save Storage
→ loadRunPhase / createStableRunStoreFromStorage
→ exactly one Store / null / error
```

- Bootstrap 复用既有 Browser adapter、save codec、规则 registry 与 strict restore，不实现第二套 JSON 解析、格式判断、版本判断或 phase 恢复。
- 合法进行中 phase 自动进入正式 UI；合法 `run-failure` 进入 Failure View；无存档进入 `no-run`；损坏、不兼容或存储读取失败进入阻塞错误。
- 损坏存档 clear 是显式应用恢复操作，不与 Run Abandon、Run Failure 或 New Run 共用语义。可读取但无法恢复的存档只有在不可逆 Preview 后确认才尝试清除一次；存储读取失败不假定 clear 可用。
- DEV Preview 是显式、独立的 DEV-only 入口，不再是默认 application bootstrap；它继续使用 `MemoryRunSaveStorage`、正式 constructor 和合法 canonical phase。

### New Run Application Boundary

```text
已确认的初始实用装备选择
→ 调用一次 RunIdentity 环境适配器
→ 正式、版本绑定的 initial phase constructor
→ 一次唯一保存尝试
→ 建立一个 StableRunStore
```

- New Run 创建新生命周期，不是对既有 StableRunPhase 的普通 lifecycle、Hub 或 Scene command mutation。
- 环境适配器是环境熵的唯一入口；Production 使用 Web Crypto，测试注入固定输出。core、React render／effect／subscription、Store 与医院内容均不生成身份。
- 正式 constructor 拥有完整 Day 1 `CurrentDayHub` 初始状态；React 不拼装生命、库存、ItemState、任务、世界威胁、每日状态、装备或快捷栏。
- 医院一日正式 initial phase constructor 必须以共享 Scene identity derivation 和版本化正式医院场景定义生成预绑定的 Day 1 `continuity.sceneInstanceId`，并创建空 Return Ledger。它不生成 Scene Session、不执行 Scene Launch，也不伪造 Return。
- 首次 Launch 必须重新派生并验证预绑定 identity，然后以同一 ID 建立 Scene Session；Launch 只切换当日主要场景使用事实，不写入 Return Ledger。首次真实 Return Settlement 后才记录该 ID。
- 从 `run-failure` 创建新 Run 时，直接写入新的完整 stable phase，不先 clear。首次保存失败后，单个新 Store 继续持有 committed in-memory initial phase；不回滚、重试、reload、重新生成身份或建立第二个 Store。

> 本节只记录职责，不固定最终类名、函数名、熵字节长度、编码或目录结构。Production Bootstrap、严格恢复 App Shell、玩家安全启动错误、显式清理、显式 DEV Preview、共享 Scene identity owner、Production RunIdentity adapter、正式 initial phase constructor、Day 1 pre-first-launch Hub strict restore、首次 Launch identity 一致性回归、Headless New Run application boundary，以及无存档／Failure 来源的 New Run Setup、显式三选一和 Preview／Confirm React 接线均已实现。

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
- 现有 lifecycle、Scene 与 Hub application command 均已通过最小 Store 接入 React 确认式 UI，展示与交互边界见后文。默认 Production Bootstrap 已通过同一 registry 建立唯一 Store 并注入展示依赖；New Run 通过独立事务接入 App Shell，不属于普通 stable command。Crafting、Salvage 与更完整的应用生命周期仍未实现。

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
- 通用 ViewModel 通过显式白名单向普通玩家展示 Hub、Scene、Combat 与 Failure 信息。节点地面物品、**当前可通行相邻节点**、Player-Known Map、当前节点明显障碍、相对敌人生命阶段、当前意图和正式返程预览继续复用 core 查询；地图只消费显式 player-visible navigation query，不读取完整 SceneGraph。障碍只投影当前 active Scene、当前节点、尚未解决的正式障碍，选项资格由 core Preview 决定。内部 Run 身份、实例 ID、隐藏搜索结果、障碍随机轨迹、精确敌人生命、风险百分比和未来行动序列不进入普通 ViewModel。
- 医院 V1 的名称文案位于 UI 内容适配层；通用组件不硬编码医院物品、敌人或节点名称。开发环境的只读检查器可以查看严格 phase，但生产环境没有入口，且不提供 mutation。开发与生产默认入口均执行真实 Production Bootstrap；仅开发构建在显式 `?dev-ui-preview=1` 时，才会在创建 Browser Storage 或执行 strict load 前动态加载独立内存态预览。预览继续只用正式构造器生成合法 Hub／Scene／Combat／Failure Store，选择示例不发送 gameplay command、不保存、不访问真实 Run 存档，也不是 New Run 或正式游戏入口。
- `src/ui/interaction/` 从 canonical phase、正式 registry、标签和纯 core preview 生成安全行动：主要场景启动、当前日中枢 Run Loadout、中枢医疗与生存补给、活动场景移动、主要搜索、显式节点物品拾取、七种 Scene 背包／快捷栏整理、主动撤离、医院防火门、感染护工战斗行动、医院样本箱任务事件、Scene 非战斗医疗与 Scene 非战斗电池充能。普通 revealed node pickup 可在玩家明确点击并输入数量后，以最新 canonical Scene 的 row-major 未旋转 first-fit 调用正式 Preview 选择摆放；该便利不移动既有物品、不自动旋转待拾取物、不另执行整理／拆分／合并命令，正式 pickup 继续按 DEC-017 补充兼容堆叠。任务物提取及 Scene 整理草稿则保留玩家明确选择的目标、快捷栏、坐标与旋转；背包网格只投影正式几何并作为 anchor 选择，不创建实例身份。Scene 整理的 player-safe Preview 白名单投影正式容器变化、数量、负重档位、零时间与即时返程估算，不携带实例 ID、审计、Effects 或 resulting snapshot；任务物放到节点必须显式确认。Scene 医疗与充能行动完全来自各自正式 selector，保留玩家明确选择的真实容器来源和目标；二者共用中性的正时间 Scene 行动安全投影，区分完成节点、返程目标、行动后流血死亡和紧急返程死亡。中枢医疗与生存行动同样只展开正式 selector 返回的真实仓库、背包或快捷栏来源及明确伤势目标，并通过同源零时间 Preview 展示物品消费、医疗效果、每日使用、饱食和威胁抑制事实；不自动寻找来源、目标或补充快捷栏。player-safe Preview 只对白名单投影同源主要效果、时间、流血、返程与终局事实。确认后每次只发出一条 `Store.dispatch()`；医疗、充能、撤离、战斗或任务事件产生的 terminal Scene 先保存 Scene Session，结算仍由下一条显式 lifecycle command 完成。
- 成功返回后的 Return Summary、Combat Action Result、Task Event Result、Scene Medical Result、Scene Battery Result、Scene Inventory Result、Hub Loadout Result、Hub Medical Result、Hub Survival Result、Hub Maintenance Result 与 Daily Settlement Result 只将 execution 前后的 canonical phase 及已发生的正式结果立即投影为本地、玩家可见的展示模型；它们不是 Scene、Combat、Run Return、Hub、任务进度、医疗、维护、充能、饱食、威胁抑制、日结算或 inventory 的状态 owner，关闭不发送命令。Production App Shell 除 `ready(store)`、`no-run` 与玩家安全的 `load-error` 外，只拥有未确认的 New Run Setup 草稿、Preview、错误与首次保存失败提示；无存档或 Failure 来源的 Confirm 直接调用 Headless New Run 事务并采用其唯一新 Store，不创建 `new-run` gameplay command。医院防火门、感染护工战斗行动、医院样本箱提取、Scene 非战斗医疗、Scene 非战斗电池充能、非战斗 Scene 整理、当前日中枢十二种显式 Run Loadout 整备、中枢医疗、中枢生存补给、五类中枢维护与普通日结算已接入正式安全 Preview 与确认分派。完整 RunState、UI 命令队列或终版美术仍未实现。日结算 player-safe 投影只公开已执行阶段的日期、生命、相对世界威胁阶段、暴露、饱食、恢复、轻伤清理和日级资源重置结果，不公开精确世界威胁进展、伤口身份、Effects、计划或快照；早期终止不伪装后续阶段已执行。React 不拥有 inventory、装备／快捷栏资格、医疗／充能／维护资格、材料兼容、资源恢复、浪费、日工时、目标合法性、时间、流血、返程、日结算或终局规则；展示层可被未来其他渲染技术替换，只要继续读取 canonical phase 并发送正式命令。

## Playable Game Shell Presentation Responsibilities

Playable Game Shell Upgrade 是当前 Owner Playability Review 的展示层升级方向，不是终版美术或新的玩法系统。Ghost Preview、Player-Known Map 与 Activity Feed 已按下述职责实现；DEV Reset 是与只读 Inspector 分离的 DEV composition utility。它旨在把现有工程验证控制台整理为低资产、可自然试玩的稳定游戏壳，并继续遵守同一数据流：

UIR-015 的一屏、分级确认与就地反馈方向已接入当前医院一日 Shell：同屏突出当前地点／战斗舞台、时间与返程预算、就地操作和底部共享日志；地图继续只展示同一 player-safe navigation query 的已知路线，当前实现为只读辅助视图，正式可执行相邻移动与主动返程位于房间 Travel Cluster。装备／真实 `6×4` 背包在主面板切换，两个快捷位常驻；布局切换不复制 loadout。具体响应式尺寸、资产槽和 Owner 后续浏览器体验复验仍待单独核验，不在 Architecture 中创造 UI 数值或玩法规则。

目标交互不再给所有行动强制套通用二次确认：输入明确的高频行动可单击执行；需要数量、放置、来源、目标或方案的行动在局部显式选择并执行；敏感／高风险操作的必要确认和逐行动分类待细化。Hover／Focus Ghost、Inline Preview 与必要确认继续只消费正式 player-safe 事实，零副作用，不将 Hover 变为前置条件；缺少必需输入或 stale 选择不得自动补足。单次明确执行仍只通过 `Store.dispatch()` 提交一条正式 command，由同一 executor 处理保存。减少结果弹框不等于自动结算 terminal Scene、自动结束本日、自动创建新 Run 或串联任何生命周期命令；保存失败、规则拒绝和不可逆操作保护仍有独立明确反馈。共享日志仅在已提交 execution 后由 Presentation 投影，不进入 Store、Save 或 core，也不驱动音效、动画或状态结算。

```text
Core / canonical state
→ player-safe query / preview
→ Presentation ViewModel
→ React Game Shell
```

- 游戏壳可以组织顶部核心状态、主要地图／场景／事件／战斗舞台、装备／快捷栏／背包统一携带区、固定操作区及可选日志／帮助区。装备栏、两个快捷位与 `6×4` 背包使用同一 canonical loadout truth，可提供完整展开和收拢摘要，不形成第二份携带状态。左右位置、宽度比例、按钮顺序、面板开合、CSS Grid、颜色与资产均为可替换实现细节；未来背景、贴图、图标、动画、Skin 或 Renderer 的替换不得改变玩法定义或实例身份。
- 生命与饱食可以在保留正式玩家可见数值的同时使用视觉状态条。Scene time／今日场景时间预算与 Combat CTB 必须保持不同概念：前者可显示当前剩余时间、正式返程预留与展示派生的安全余量；后者只向普通玩家投影相对行动先后，不显示 raw CTB 时间点。展示条不重新计算阈值或规则。

Ghost Preview 的正式展示流为：

```text
canonical phase
→ 正式 player-safe Preview
→ Ghost Presentation
```

- Hover／Focus Ghost 与局部 Inline Preview 只显示最重要的正式安全后果；它们不发送 command、不消耗 RNG、不保存、不修改状态，也不持有下一状态。UIR-015 的当前分级路径允许完整普通意图一次执行，需要参数的动作局部完成选择，只有敏感／高风险动作保留必要确认；每次执行仍只发送一条正式命令。
- 时间、返程、强制返程损耗、生命、负重、装备资源、玩家已知风险与相对战斗顺序都必须来自正式 player-safe Preview、canonical query 或版本化 catalog。缺少安全事实时扩展纯 query／Presentation 边界，不在 JSX 中补玩法公式。
- DEC-035 的风险换收益语义保持不变。Game Shell 只把是否仍可安全返程、预计强制返程损耗与预计生还／死亡前置到 Ghost 和正式 Preview，不把返程线变成行动硬锁。

Tooltip、Info Card 与 Mechanic Help 是玩家可解释性基础设施，解释物品、装备、快捷栏、状态、风险、主要行动、敌人公开状态、地图节点与路线。它们只消费版本化内容、player-safe metadata 与 canonical 玩家可见状态，不公开隐藏概率、随机种子、内部威胁精确进展、敌人精确生命、完整未来行动、隐藏路线或未获得情报。

Player-Known Map 的数据流必须为：

```text
Core / canonical player knowledge
→ explicit player-visible map query
→ presentation map model
→ React / SVG
```

四层边界均已实现：`src/core/scene-navigation/` 拥有场景实例内 canonical Player Navigation Knowledge 与严格内容／状态边界，`src/core/scene-exploration/player-visible-scene-navigation.ts` 只投影已发现节点名称、已知路线的当前可通行／阻塞状态和已知范围内的正式返程结果，`src/ui/presentation/player-known-map-view-model.ts` 生成不含 raw ID 的确定性展示模型，`src/ui/components/player-known-map.tsx` 负责 React／SVG Renderer。布局坐标、线条和视觉层级仅属于可替换的 Presentation 实现。

- 地图只展示当前节点、已到达节点、已知节点、已知可通行路线与已知阻塞路线；未知节点与路线完全省略，不以问号暗示其存在。
- 根据 DEC-045，Player Navigation Knowledge 是当前场景实例内的 canonical 玩家知识 owner，至少保存已发现节点、已到达节点和已知路线；当前通行或阻塞仍由正式 traversal、障碍与场景状态派生，不在知识状态中复制第二份动态通行事实。
- 场景初始化先把入口标记为已发现且已到达，再应用入口显式表层观察；首次到达节点同样先记录发现与到达，再应用内容明确声明的表层可见出口、路线和障碍。完整 SceneGraph 的邻接关系本身不构成玩家知识，搜索也只有在内容明确给出导航知识结果时才更新该状态。
- Player Navigation Knowledge 随 Scene mutation 原子更新，进入 Scene Session 的稳定保存与严格恢复，并只在同一场景实例内持续；它不默认跨日或跨场景实例。严格恢复拒绝未知／重复／图外引用、已到达但未发现、当前节点未到达等矛盾，不自动补全或修复。
- React 不读取完整 SceneGraph 后自行过滤，也不把 RunIntel 文本解释为路线。现有移动选项与返程计算同样先将正式可通行边限制在玩家已知路线内；未知的物理捷径不会成为行动或返程事实。Player-Known Map 只消费显式 player-visible navigation query，显示已知节点、已知可通行／阻塞路线与正式返程信息；Hover／Focus 的 Info Card 不发送命令、不保存也不改变知识状态。

Battle Stage Presentation 已实现低资产玩家／敌人舞台、玩家精确生命条、敌人阶段式生命表现、相对行动时间轴、Combat Hover／Focus Ghost、已提交结果的轻量反馈与同源 Activity Feed 过滤视图。它只消费 canonical phase 和正式 player-safe Preview：敌人阶段只使用正式的完好、受伤、重伤、濒危和失去能力，不显示精确 HP 或可反推精确 HP 的百分比条；相对时间轴只表达当前决策权及敌人是否会在下一次玩家决策前行动，普通 ViewModel、完整 Preview 和 DOM 均不携带 raw `currentCtb`、`playerNextActionCtb`、`enemyNextActionCtb`、行动 CTB 或完成 CTB。动画只在 canonical execution 提交后消费安全结果，不驱动规则或 Effect。未来阶段贴图属于 Presentation 扩展能力，不确认任何能够查看敌人精确 HP 的玩法。

Presentation Animation 只消费执行前展示、正式 execution result 与执行后展示：

```text
明确执行意图（当前实现通过 Confirm）
→ 正式 command
→ canonical execution
→ presentation animation
```

动画不得先行驱动规则，也不得通过动画完成回调决定命中、伤害或状态。轻微位移、抖动、飘字、阶段变化与时间轴 marker 位移均为可替换的非权威表现。

Presentation Activity Feed 的唯一 owner 是 Game Shell Presentation。它是 browser UI session 内已执行结果的玩家可见投影，可按 system、combat、inventory、scene、hub 与 lifecycle 分类；战斗日志过滤同一来源，不另建第二份日志真相。Feed 只在正式 command 已执行后，根据执行前后 canonical presentation facts 与 player-safe result 追加；Hover、Preview、取消、验证失败、只读查看、Tooltip 与地图 Hover 不追加。它不进入 StableRunPhase、Run Save、Profile、Hub 或 Scene，不影响下一条命令，不作为 Replay truth，刷新后不重建过去记录，只可用“已恢复当前游戏状态”标记新会话起点。

DEV-only Owner Playtest Reset 属于显式 DEV composition utility：

```text
开发测试：重新开始
→ 不可逆提示
→ 二次确认
→ 清除 Browser Run Save
→ 正式 no-run / New Run Setup
```

- 它与 UIR-004 的只读 Dev Inspector 分离，不是 Inspector 的 mutation 扩展，也不属于 core、run-store、run-lifecycle 或 run-application。
- 它不是 Run Abandon、Run Failure、gameplay command、作弊修改当前 phase 或生产功能；不得伪造终止、调用 raw `setState` 或改写 canonical phase。Production build 必须没有入口、按钮或可触达实现。

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
| 当前日中枢（当天主要场景已使用） | 结束本日 | 次日中枢或 Run 失败 |
| 安全／强制返回的 Scene Session | 结算终止场景 | 当前日中枢 |
| 死亡 Scene Session | 结算终止场景 | Run 失败 |

- `src/state/run-lifecycle/` 是当前最小生命周期 command／phase 映射的应用层所有者，只覆盖主要场景启动、终止场景结算与结束本日；活动或战斗 Scene 不允许执行终止场景结算。
- Router 不拥有 Scene Launch、Return、Daily Settlement 或 Run Failure 规则，也不直接写存档；它按当前规范化阶段的 `rulesVersion` 读取正式依赖并调用既有 core resolver，随后委托唯一 stable mutation execution boundary。
- 结束本日资格由 Daily Settlement 正式计划读取 `DailyRunState.mainSceneUsedToday`：规范化当前日中枢与结束本日命令后，先拒绝尚未使用当天主要场景的状态，再检查第七日终局边界。安全或强制返回都保留该日级事实；任务是否完成不构成结束本日的额外资格条件。Preview、Resolution、生命周期路由与 Store 共用这一 core 门禁，拒绝时不提交 Effects 或存档。
- 终止 Scene 的位置、时间（包括 `remainingTime` 的0至当前 `scene.totalTime` 上限）和生命合法性属于 Scene strict snapshot invariant；Run Save 与 lifecycle settlement 都通过同一 Scene 恢复入口继承该校验，Router 不复制 returned 位置判断、时间上限或重新结算撤离。
- 每次调用只执行一个生命周期命令。最小 Store 只在调用方显式 `dispatch()` 时发出一条 command；终止 Scene 不自动连锁到 Return，结束本日不自动启动次日场景。React 已接入主要场景启动、终止 Scene 显式结算和普通结束本日；三者都只在玩家确认正式安全 Preview 后发出命令。
- 生命周期 resolver 的返回值仅用于展示或审计；`StableRunCommandExecution.phase` 是下一条命令的唯一正式状态输入，result、summary、Effects 和 preview 不形成并行状态或持久化字段。
- 本路由经统一 Application facade 对外分派，最小 Store 已通过该 facade 接入；React 已接入主要场景启动、终止 Scene 结算与普通结束本日。New Run UI 使用独立创建事务而不进入本路由；完整 RunState、Day 7 最终解析、Success／Abandon 与命令队列尚未实现。

### 基础 Stable Run Scene mutation routing

- `src/state/run-scene/` 是当前基础 Scene 玩家 mutation 的应用层映射，覆盖移动、主要搜索、节点地面物品拾取、Scene 背包／快捷栏整理、主动撤离、障碍、任务事件、场景医疗、设备充能与战斗玩家行动。外层命令只携带明确路由 tag 与一个经过对应 core constructor 规范化的正式命令，不接受结果、Effect、风险结果、目标阶段或保存策略。
- Router 在通用 stable executor 完成当前阶段 canonicalization 后，从 canonical Scene Session 的 RunIdentity 取得 `rulesVersion`，再通过既有 Run Save registry 与 `getRunSceneRuntime()` 获取正式 runtime；它不导入具体医院内容、不缓存旧 runtime，也不从命令读取 Run 或 Scene 身份。
- 移动、搜索、拾取、整理、障碍、任务事件、场景医疗、设备充能和战斗玩家行动都调用既有 core resolver，并把正式 resolution snapshot 与 canonical Session context 交给 `createRunSceneSessionSnapshot()` 重建唯一下一 Session；主动撤离直接调用 Session 级 `resolveRunSceneSessionWithdrawal()`。Combat 命令结构、CTB、敌人行动、确定性随机、资源消耗、逃跑、终局和场景时间换算仍由 `src/core/combat/` 与 Scene combat integration 拥有。RunIntel、每日医疗使用、携带容器、ItemState、任务事件、警觉和战斗状态只存在于新 Scene snapshot，不复制到 context。
- Router 不直接调用 Run Save。每次只通过 `executeStableRunCommand()` 提交一个 mutation，由该通用边界验证 Run 身份连续性并执行唯一保存；规则拒绝不保存，写入失败返回已经规范化的 committed Scene Session，不重跑 resolver 或 Effect。
- Scene action 产生 `safe-returned`、`forced-returned` 或 `dead` 时，本次执行仍停在已保存的 `scene-session`。返回 Hub 或进入 Run Failure 必须由下一条独立的 `settle-terminal-scene` 生命周期命令完成；`StableRunCommandExecution.phase` 是下一命令的唯一状态输入。
- ongoing Combat 在每个玩家命令完整结算后保存一个稳定 Scene Session；胜利、逃跑或战败也只提交 Scene Session，terminal Scene 仍需后续显式生命周期命令结算。当前不支持战斗换装或完整背包整理；最小 Store 已通过统一 dispatcher 接入，React 已接入活动 Scene 的移动、主要搜索、节点拾取、主动撤离、医院防火门障碍、感染护工 Combat command UI、医院样本箱任务事件、Scene 非战斗医疗与电池充能，命令队列仍未接入。

### 基础 Stable Run Hub mutation routing

- `src/state/run-hub/` 是当前日中枢玩家 mutation 的唯一应用层映射，覆盖 Run loadout、Hub medical、Hub survival 与 Hub maintenance。外层命令只携带路由 tag 与一个由对应 core constructor 严格规范化的正式命令，不接受 snapshot、Effects、result、下一阶段、保存策略或 Run 身份。
- Router 只接受 canonical `current-day-hub`，从其 RunIdentity 取得 `rulesVersion` 并使用既有 Run Save registry 的 `currentDayHub` 与 `hubMaintenance` 依赖。注册表要求维护依赖与同版本 CurrentDayHub 依赖拥有同一对象身份；Router 不导入医院具体内容，也不复制物品生命周期、医疗或维护内容绑定。
- 四类命令分别调用既有 `resolveCurrentDayHubLoadoutCommand()`、`resolveCurrentDayHubMedicalCommand()`、`resolveHubSurvivalCommand()` 与 `resolveHubMaintenanceCommand()`；容器、目标资格、ItemInstance、ItemState、消耗、日级使用、工时、维修点与 waste 均由 core 拥有。resolver 返回的完整 CurrentDayHub snapshot 直接成为唯一下一阶段，不局部拼接并行 Hub 状态。
- Router 不直接保存。每次成功 mutation 只经 `executeStableRunCommand()` 写入唯一 Run Save 一次；规则拒绝不写入，存储失败返回已规范化的 committed Hub 且不重跑 resolver、Effect 或消费。`execution.phase` 是下一命令的唯一正式状态输入。
- Hub mutation 不推进日期、不启动 Scene、不中途执行 Daily Settlement，也不自动结束本日；End Day 仍是独立 `run-lifecycle` 命令。最小 Store 已通过统一 dispatcher 接入；Run Loadout 的仓库、背包、装备栏与快捷栏显式整理，以及中枢医疗、中枢生存补给、中枢维护和普通结束本日已接入 React。维护资格、目标范围、材料兼容、资源恢复、浪费、日工时与 Effect 结算均由 core 正式计划拥有；React 只显式选择来源、目标和分配，读取 player-safe Preview 后分派一次正式命令并展示已提交结果。Hub mutation 均为零场景时间；End Day 则继续由独立日结算计划推进日期或产生 Run Failure。每次确认只提交一条命令并保存一次。制作、拆解、Day 7 最终解析及其他终局 UI 尚未实现。

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

## 未来完整世界的已确认架构约束（未实现）

> DOC-WORLD-ENTRY-001（2026-10-03）范围校正：以下保留DEC-046—048原架构讨论；“新日重访是新Scene”不决定新连续驻留委托的执行身份。当前新委托同一活动执行跨图／跨日及终止关闭依[DEC-049](05-design-decisions.md#dec-049)，具体现场与保存结构仍待后续接线；旧医院不变。

DEC-046—048 为未来完整感染世界确认方向，而不是新增运行时类型、目录、Save schema 或 API。未来跨日重访必须让同一持续事实在稳定时点只有一个可变权威 owner；活动 Scene 与 Run 持续层不得各自保存可变敌人生命、来源库存或任务实体。真实物品继续以唯一 ItemInstance、数量和 ItemState 转移，来源兑现记录不得成为第二份库存；Return Ledger 仍只记录正式返回。

新日重访是新 Scene 与新当日预算，活动探索的严格恢复则恢复同一次 Scene 的节点、时间、战斗时序、物品和随机进度。明确持续的敌人、物理成果、一次性来源及其随机连续性需要未来正式 content、生命周期 owner、严格恢复和版本化实现；普通临时状态、Player Navigation Knowledge 与完整 Scene snapshot 不因此默认跨日。严格恢复未来须拒绝重复兑现、重复实体、已解除危险与可战斗副本并存等不可能状态，不得自动补全、回血或重抽。

当前工程没有完整 WorldState／RunState、完整世界地点进度、未来 Success Resolver、跨日重访实现或对应 Save 契约。分段突破虽被允许，Owner 实际试玩复审仍为 OPEN / NOT RUN；上述文字不构成实现授权。

## DOC-WORLD-ENTRY-001：已批准首资格核心职责（未实现）

归档日期2026-10-03。玩法依据为[DEC-049](05-design-decisions.md#dec-049)，唯一工程细则为[已批准首工程契约v1.0](design-drafts/world-infected-001/readiness/03-first-engineering-contract-draft.md)B1—B10；本节仅作职责导航，不新增玩法、API或保存结构。当前生产工程未授权、未开始。

| 职责 | 已批准边界及后续责任 |
| --- | --- |
| 窄生命周期owner | 只拥有同角色这份具体委托的互斥生命周期规则与纯转移；不拥有钱包、身体、现场、全Profile或长期Store，资格成立不是完整出发许可 |
| 可信输入与严格值恢复（B2／B4／B5） | 恢复候选与受控期望绑定分开；缺记录不等于未接，不以默认值、丢字段或解析合法候选覆盖已关闭事实；无普通reset／reopen／replace／任意完成入口 |
| 受控终止（B3） | 接收协调边界给出的、绑定当前执行的结果，不自行验证样本、计算奖罚或裁定死亡；纯后态不自带生产提交权 |
| 后续聚合与恢复安装（B5） | 谁持有唯一当前事实、首次建立／恢复安装权、跨全部委托活动唯一性及身份复用、合法终局与最新稳定边界须在真实接线前明确并验证；冻结／品牌／JSON不证明历史未丢失 |
| 体系响应与统一提交（B6） | 规则体系可在明确、有序、确定性编排中读取前态并提出效果／计划，由唯一入口组合验证成完整后态；展示订阅与提交后通知只读，不由多个异步监听器补扣血／奖励／关闭 |
| 保存与通知（未来接线） | 一次完整结果、一次保存尝试、一次Store后态替换通知；保存失败保留已提交内存并独立报错，不重跑玩法。首项不做协调器、事件总线、保存或通知 |
| 旧能力复用和隔离（B7） | 复用合法RunIdentity引用，但新边界先做自身严格检查；旧工厂的trim／对象解析及普通executor身份连续性不变，不能借医院New Run代替生还接续 |

候选目录src/core/mission-lifecycle/只为后续任务定位，不代表目录已存在或本轮写权。本次仅只读复核run-identity.ts、stable-run-command-execution.ts和package.json，不把既有能力盘点升级为新的生产实审。

## ENG-MISSION-LIFECYCLE-001：纯资格核心实现附记

2026-10-03，Owner本项执行授权解除此前首工程等待；上节“未实现／未授权”保留为DOC-WORLD-ENTRY-001归档时状态。现新增 [src/core/mission-lifecycle](../src/core/mission-lifecycle/index.ts)，作者实现完成、待准确SHA主线实审，未接玩家入口。

- index 只导出首次／继续／可接列表查询与严格恢复候选；[controlled](../src/core/mission-lifecycle/controlled.ts) 单独导出受控scope建立、首次事实、激活与四结果终止，均为纯函数。
- 唯一事实为角色／具体委托的未接、活动或关闭值。声明及完整执行绑定严格校验，复用RunIdentity与deepFreeze；恢复另接独立期望，候选包装没有当前事实安装权。
- 不拥有全角色Store、生命、钱包、现场、日期或保存。未来唯一owner负责首次／恢复安装、跨委托活动唯一性与身份复用，终局协调器核验真实结果并组成完整事务；普通订阅只读。
- 旧医院生产文件、普通executor身份连续性、phase、New Run及保存不变。详见 [实现记录](engineering/mission-lifecycle-001/implementation-notes.md) 与 [本轮验证](engineering/mission-lifecycle-001/verification-results.json)。本附记不批准其他玩法或工程。

本项交付状态补充：实现与全量检查完成，但原字节归档的前置审查行尾空格使完整暂存空白检查未通过，当前未提交／推送；等待主线处理输入保全与检查冲突。

## WORLD-ENTRY-002 当前状态附记（2026-10-03）

首资格核心在完整SHA `d1d3b7927c6733cff709a4bfd617fb1e85e7485a` 已通过[主线源码实审](design-drafts/world-infected-001/entry-002/inputs/AUD-d1d3b79-ENG-MISSION-LIFECYCLE-001-review-v1.0.md)。此前归档空白BLOCKED已依ENG-MISSION-LIFECYCLE-001-ADDENDUM-01解除，工程已普通提交并推送；保留上文历史过程，不将旧“未实现／未授权／未推送”误作当前状态。

该PASS仅限首身份／关闭资格纯核心，不含真实保存、全角色聚合、完整世界或玩家入口。[WORLD-ENTRY-002候选入口](design-drafts/world-infected-001/entry-002/00-owner-review.md)及[近期契约](design-drafts/world-infected-001/entry-002/03-next-engineering-goals.md)仍待审，未批准新生产规则、未执行下一工程。


<a id="doc-world-entry-002"></a>
## DOC-WORLD-ENTRY-002：O1／O2当前采纳附记

2026-10-03，依据[Owner实际批准](design-drafts/world-infected-001/entry-002/adoption/inputs/OWNER-approval-WORLD-ENTRY-002-ADOPTION-v1.0.md)及[获批稿限定](design-drafts/world-infected-001/entry-002/adoption/inputs/WORLD-ENTRY-002-ADOPTION-owner-review-v1.0.md)，O1指定规则／首批试用参数与G1契约、O2同次驻留持续现场及恢复／完整事务边界已批准；本次集中归档待准确SHA实审，生产新能力未实现，G1—G3未开工。

唯一当前入口：[DEC-050](05-design-decisions.md#dec-050)；[试用配置v0.1](content/infected-residence-core-test-config-v0.1.json)；[恢复补充合同v1.0](engineering/residence-foundation/runtime-restore-supplement-v1.0.md)；[G1契约v1.0](engineering/residence-foundation/energy-cycle-contract-v1.0.md)。只采纳获批子集，不把整份Draft、旧fixtures.config或R1字段草图全部升格。O3旧入口／旧槽发布安排仍OPEN；其他经济／商品、医疗细项、地图价格、战斗和专长参数不随同批准。

首身份核心d1d3b79 PASS与[8245cc6 R1专项PASS](design-drafts/world-infected-001/entry-002/adoption/inputs/AUD-8245cc6-WORLD-ENTRY-002-R1-review-v1.0.md)是前置历史，原213项作者有限验证／56项主线探针不算本轮检查。此前BLOCKED、待审及未实现记述保留当时身份；本附记更新局部采纳状态，不倒改旧DEC或[原首契约](design-drafts/world-infected-001/readiness/03-first-engineering-contract-draft.md)。本轮仅文档／架构检查，结果见[本任务完成记录](design-drafts/world-infected-001/entry-002/adoption/DOC-WORLD-ENTRY-002-completion.md)；不据归档启动生产或宣布世界可玩。

G1只产生单精力与身体周期纯规则的完整局部结果；不拥有全角色历史、钱包、现场、委托关闭、安装或保存。docs中的试用配置只是唯一获批参数归档，运行时唯一版本化来源由未来工程任务指定，core不得读取docs或复制多个常量源。

未来唯一应用持有者核对身体／周期／委托／位置／实体的一致性，各规则owner在确定有序编排中提出计划；完整后态一次提交、一次保存尝试、一次只读通知。写失败保留已提交内存，不由UI或异步订阅者补扣血／奖罚。持续敌人和来源只有一份事实，地面容器归属与活动执行绑定；关闭历史不给行动资格。

恢复补充允许后续新增受控冷候选解析并整档校验／一次安装；候选没有安装权，原restoreMissionCandidate(raw, expected, scope)与K18/K19独立期望要求保持。没有已有current的冷启动不能复制候选伪造期望；读取失败／损坏不兜底new，已有current禁止第二bootstrap／replace。具体API、保存格式、Profile和支持矩阵未由本次注册；旧医院与原首核心不变。

## G1 单精力／有序角色周期实现附记（2026-10-04）

DOC-WORLD-ENTRY-002 在 `9dfe21ef7f423c1e5d9801d26e4425b28444cf63` 已获[主线文档实审 PASS](engineering/residence-foundation/g1/inputs/AUD-9dfe21e-DOC-WORLD-ENTRY-002-review-v1.0.md)。本次按独立授权实现 G1；作者实现与检查记录见[实现说明](engineering/residence-foundation/g1/implementation-notes.md)及[实际验证](engineering/residence-foundation/g1/verification-results.json)，交付后仍待主线准确 SHA 源码实审，不倒改上述历史状态。

运行时仅 `src/content/infected-residence-core-v0.1/config.ts` 提供批准的 34 个数值叶；`residence-config` 只校验形状、配置绑定和安全整数。`residence-energy` 负责局部能量资格、独立已触发结果及命令绑定；`character-cycle` 持有一份局部身体／时钟输入，输出有序不可变计划。core 不反向读取 content/docs，也不注册产品 rulesVersion 或保存版本。

独立受控上下文核对角色、规则／配置、revision、当前执行、A/C 休整资格、最新关闭来源和真实不同待接委托。截止计算产生需与期限关闭一起提交的 ready 计划；消费 ready 才要求已有关闭事实。普通返回不补夜，due 出发读取最新身体，ready 消费不重结。计划没有安装、任务关闭、物品／钱包、保存或通知权；完整事务将来只提交一次。现有医院、首身份核心及其恢复接口不变。G2/G3、五图接线、完整战斗、玩家入口、真实保存和 Owner 体验仍未实施／未验收。

## G1-R1 查询／行动分类修订附记（2026-10-04）

`9bbf5aaa` 的专项实审发现 view 可进入行动计划（F01）。本批作者修复将 view 仅保留于 ResidenceQueryRequest／queryResidenceAction；执行 constructor、ResidenceActionRequest、Completion 与 provider 结果 schema 均排除 view，在 provider 前严格拒绝。四类 E0 免费可执行行动、付费行动及独立触发后果保持，周期生产代码不改。见[当前 R1 实现与测试映射](engineering/residence-foundation/g1/implementation-notes.md)。状态为 G1-R1 作者修复待准确 SHA 复审，不是主线 PASS；G2/G3、玩家入口及保存未接。


## G2 连续位置／持久现场作者实现附记（2026-10-04）

G1-R1 在完整 SHA `942b2d93916c649f4c2ec6cd399035151269d2ca` 已通过[限定源码复审](engineering/residence-foundation/g2/inputs/AUD-942b2d9-ENG-RESIDENCE-ENERGY-CYCLE-001-R1-review-v1.0.md)；原9bbf5aaa的NEEDS REVISION与此前历史记述保持原样。本批按独立G2授权实现纯核心，当前状态为作者实现／本地验证、待最终准确SHA主线源码实审，非主线PASS。

新增 residence-location 只组合一份G1身体／D/T／revision与同执行持续现场：单边移动、一次来源揭示、真实普通整实例拾取／留置、表层玩家知识及稳定来源／敌人游标。旧医院与G1生产实现、批准34项参数不改。真实实体／ItemState、道路／设施、敌人HP／已选意图／进度和来源兑现事实跨图及实际G1休整保留；查询不物化、不调用随机，不以未观察的远程真相冒充玩家知识。

局部计划只建议一次revision递增；遇敌／死亡明确要求后续完整协调，不能借移动或休整跳过战斗。三种正式委托关闭后活动位置为空，旧地面不可再操作，合法携带实体不因此销毁。严格值候选和局部计划均无保存、安装、关闭或全历史防回滚权。详见[合同／支持与验收映射](engineering/residence-foundation/g2/contract-and-support.md)及[本轮检查](engineering/residence-foundation/g2/verification-results.json)。

G3、五图注册、钱包、完整CTB／返回／截止、三专长、工具箱完整路线、玩家入口和真实存储仍属后续；浏览器／刷新／多标签与Owner分段突破、恢复负担体验为NOT RUN。O3及未批准内容／数值门槛不因本次作者测试关闭，不自动进入下一工程。

## G3 受控 headless 会话／冷恢复作者实现附记（2026-10-04）

G2 在 `d7953bbf96dc842d2953e019f950275cd693bf09` 已通过[限定源码实审](engineering/residence-foundation/g3/inputs/AUD-d7953bb-ENG-RESIDENCE-LOCATION-001-review-v1.0.md)。本次独立授权 G3 加 ADDENDUM-01 续办；上文历史记述不倒改。当前为作者实现／本地验证、待最终准确 SHA 主线实审，不是主线 PASS 或 Owner 体验通过。

新增技术 headless envelope 和唯一私有会话 owner：仅生还首次 fresh-hub、首次 active-world 的严格冷安装，以及真实 G2 非战斗单边移动；根身份、声明全集、任务／D/T／现场／携带实体与版本一并校验。新冷候选不替代原独立 expected restore，也无安装权。已有 current 禁止二次 bootstrap/replace；完整后态预编码后一次内存提交、一次写入尝试、一次只读通知；写失败保留最新内存，不重放，重入写操作拒绝。

详见[支持合同](engineering/residence-foundation/g3/contract-and-support.md)、[实现与续办记录](engineering/residence-foundation/g3/implementation-notes.md)、[实际检查](engineering/residence-foundation/g3/verification-results.json)。G1/G2 规则和 34 项参数、原医院存档／入口不改；普通源码无浏览器槽接线。关闭历史、完整终局／CTB、后续委托接续、五图、钱包、专长、玩家入口仍 OPEN；浏览器／多标签／Owner 分段突破与恢复负担体验 NOT RUN，O3 不由本批决定。

## G4 首次出发／驻留事务作者实现附记（2026-10-04）

G3 在完整 SHA `60e9c30732c5e22cfe9ff58b9b381de64b945180` 已通过[限定准确源码实审](engineering/residence-foundation/g4/inputs/AUD-60e9c30-ENG-RESIDENCE-SESSION-RESTORE-001-review-v1.0.md)。本批依独立 G4 授权扩展会话命令；此前历史正文、G3 当时仅 move 的合同保持原样。当前为作者实现／本地验证，待 G4 最终准确 SHA 主线实审，不是主线 PASS 或 Owner 试玩通过。

唯一 headless session 新接受受控首次 launch、一次来源 reveal、普通整实例 pickup/drop 与真实节点 A/C rest，保留 move。首次从真实 read-null、显式 fresh 创建开始；执行材料不来自命令。各规则仍由首身份及 G1/G2 正式入口拥有，完整后态经原 G3 aggregate/codec 后一次提交、一次保存尝试、一次通知，写失败保留内存且不重放。恢复不重建现场或重抽来源。存档仍为 `elevator-survival.residence-headless / 1`，核心代码和批准 34 项参数不改。

详见[G4 支持合同与 A01—A12 映射](engineering/residence-foundation/g4/contract-and-support.md)、[作者自查／修订](engineering/residence-foundation/g4/implementation-notes.md)及[实际验证](engineering/residence-foundation/g4/verification-results.json)。未支持的 pending/combat/death/closed 等完整结果继续不安装；该开发限制不是玩家避死玩法。完整终局、后续委托、钱包、战斗、五图、三专长、工具箱全路线、安全感染提示、玩家入口与浏览器存档仍为后续责任；O3 继续 OPEN，Owner 分段突破／恢复负担试玩及浏览器／多标签为 NOT RUN，不据此启动下一工程。


<a id="doc-world-entry-003"></a>
## DOC-WORLD-ENTRY-003 + ADDENDUM-01 采纳附记（2026-10-04）

批准与校勘：[Owner实际采纳](design-drafts/world-infected-001/entry-003/adoption/inputs/OWNER-approval-WORLD-ENTRY-003-ADOPTION-v1.0.md)、[ADDENDUM-01](design-drafts/world-infected-001/entry-003/adoption/amendments/step-semantics-01/DOC-WORLD-ENTRY-003-ADDENDUM-01-v1.0.md)。唯一正式入口：[DEC-051](05-design-decisions.md#dec-051)、[四值试用配置](content/infected-terminal-core-test-config-v0.1.json)、[A契约](engineering/residence-foundation/terminal-core-contract-v1.0.md)、[终局恢复补充](engineering/residence-foundation/terminal-restore-contract-v1.0.md)、[A→B→C门槛](engineering/residence-foundation/terminal-batch-plan-v1.0.md)。

本次确定“纯终局计划A→严格聚合／编解码B→唯一会话消费C”的职责，生产模块尚未新增。身份核心拥有具体委托资格／关闭；G1拥有身体／周期，G2拥有位置／现场；A一次消费受控事实、算奖罚与真实物品处置并产完整计划，无安装／IO权；B纯验证与codec无安装权；C才在预编码后一次替换current、一次写尝试、一次只读通知。写失败保内存，retrySave只重写最新状态，不重放玩法。

正常G1返回保留steps=[]，仍严校独立前态、body/cycle不变、revision+1与return-due；死亡必须保留真实合法非空步骤及HP0短路，实际日结不免步骤。新headless formatVersion=2仅是已定技术合同，B并列接口拒绝v1／未知版本，原v1接口及原独立expected不降级，不从候选自造expected。钱包由单一角色账户事实拥有，不另立冻结／备用余额；受控真实内容桥、v2实现和终局会话接线仍待后续工程，O3发布未决定。

## ENG-RESIDENCE-TERMINAL-001 A 作者实现附记（2026-10-04）

6438f7a 文档实审已通过；本批新增纯终局 A 与独立四值运行时依赖。普通入口仅查询资格／全奖容量；受控入口以完整前态权限组成正常返回／期限，或消费真实 G2 死亡原计划，生成身体、具体委托关闭、唯一余额、真实实物归属与被动收据的一笔 TerminalPlan。正常返回保留 G1 空步骤，死亡不重执行动作／周期／随机，不额外增加 revision。既成交付与本次终局处分分源；旧现场只有不可访问历史，没有第二份身体或可用库存。

这是作者实现／本地验证，仍待本批准确 SHA 主线源码实审，不是玩家可玩或体验 PASS。B 编解码、C 唯一会话安装、真实五图内容桥、保存、UI、O3 与 Owner 试玩保持未完成／未决定。详见 [A 实际支持与接口](engineering/residence-foundation/terminal-core/contract-and-support.md)及[交付记录](engineering/residence-foundation/terminal-core/completion.md)；正式规则仍以 [A 契约](engineering/residence-foundation/terminal-core-contract-v1.0.md)为准。
