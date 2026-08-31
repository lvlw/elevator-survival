# State

应用状态适配、持久化边界及 UI 与纯规则核心之间的协调。当前已实现最小 Headless Stable Run Application Store、React `useSyncExternalStore` 桥接与 `StableRunUiApp`；Store 只持有 canonical Run phase 并发送正式命令，不拥有玩法、Profile 或多个 Run。生产 bootstrap、Provider 或等价应用编排仍未接入，当前边界不代表完整 Application framework。

## 当前最小 Run 持久化边界

`run-save/` 只持久化已经由核心规则完整提交的稳定 Run 阶段：当前日中枢、Run Scene Session 或 Run 失败。三者使用互斥的 tagged union，并作为一个完整、版本化的值写入唯一 Run 存档槽。

读取顺序为严格 JSON 与 envelope 校验、存档格式版本校验、规则版本注册表分派，再调用对应 core 正式恢复入口。损坏、伪造、未知版本或不满足正式快照不变量的存档会失败，不会修复、升级或回退为新游戏。

本边界不拥有游戏规则，不保存事务中间态、Effect 计划、预览或派生缓存。`command-execution/` 只接受严格恢复后的非终止阶段，在生命周期专用 handler 完成正式规则结算后重新规范化输出、验证 Run 身份连续性，并通过唯一 Run Save 写入一次。规则拒绝、Effect 不匹配、终止输入和跨 Run 输出均不写入；存储失败不会回滚已提交的内存结果。

Success 仍是 DEC-028 定义的未来正式终局概念；当前规则版本没有 Success Resolver 或主线成功条件，因此不能构造、保存或恢复 `run-success`。

## 当前统一 Application 分派

`run-application/` 提供无状态的 Headless Application 统一入口，只包装并严格分派 lifecycle、scene 与 hub 三类既有正式应用命令。外层只接受 exact plain `{ kind, command }`，内部命令分别复用 `createStableRunLifecycleCommand`、`createStableRunSceneCommand` 与 `createStableRunHubCommand`，不复制第四套内部命令解析或 phase matrix。

Dispatcher 每次只委托一个 specialized router 一次，不直接调用 `executeStableRunCommand`、Run Save 或 `storage.write()`。各 specialized router 继续拥有命令到 core resolver 的映射，generic executor 继续拥有 canonicalization、RunIdentity 连续性与唯一保存；`execution.phase` 仍是下一条命令的唯一正式状态。

确定性 replay 只存在于自动化测试，使用正式 registry、Run seed、稳定阶段和统一 dispatcher；不会把 command history、replay log 或 sequence number 写入 StableRunPhase 或 Run Save。现有 lifecycle、scene 与 hub 命令已由 Store 和 React UI 通过本 facade 调用；Crafting、Salvage 命令及 UI，以及生产 bootstrap 仍未实现。

## 当前最小 Stable Run Store

`run-store/` 使用 `zustand/vanilla`，是一个前台 Run application session 中唯一长寿命的 phase owner。Store snapshot 只包含一个经过正式 strict restore 的 canonical `StableRunPhase`；Hub、Scene、Combat、库存、条件和日级状态均从该 phase 读取，不复制为 Zustand state。

Store 对外只暴露 `getState`、`getInitialState`、`subscribe` 与 `dispatch`，不暴露 raw Zustand `setState`。创建时调用 `canonicalizeStableRunPhase` 且不写存档；从 storage 创建只调用 `loadRunPhase`，无存档返回 `null`，损坏存档抛错并保持原值。

`dispatch` 只调用统一 `executeStableRunApplicationCommand`。成功或存储失败都用返回的 `execution.phase` 更新 Store 一次；规则拒绝不更新。存储失败后 committed in-memory phase 仍是当前真相，Store 不回滚、不 reload、不 retry，下一命令从该内存阶段继续。Execution、result、Effects 与 persistence response 不进入 Store snapshot。React hook 和只读展示／确认式命令 UI 已实现；生产 Provider 或等价 bootstrap 编排仍未接入。

## 当前最小生命周期路由

`run-lifecycle/` 严格解析并路由三个应用生命周期命令：启动主要场景、结束本日和结算终止 Scene。它只允许当前日中枢启动场景或结束本日，只允许经过 Scene strict restore 证明位于正式返程安全节点且玩家存活的安全／强制返回 Scene 进入正式 Return，其中强制返回必须处于零剩余时间；死亡 Scene 进入正式 RunFailure，活动与战斗 Scene 不能结算终止场景。

Router 根据 canonical current phase 的 RunIdentity 从既有 Run Save registry 取得正式版本依赖，调用现有 Scene Launch、Run Return、Daily Settlement 与 RunFailure 入口，再委托 `executeStableRunCommand` 规范化结果、验证身份并写入唯一存档。returned Scene 的位置、时间与生命校验只存在于 Scene strict snapshot：`remainingTime` 必须是0到当前规则 `scene.totalTime` 之间的安全整数，超出范围会拒绝而不修复；Run Save 和生命周期结算复用该入口，Router 不复制或补算撤离规则。Router 不直接保存；`execution.phase` 是下一条命令的唯一状态输入，resolver result、summary 和 Effects 不形成第二份应用状态。

三类现有 lifecycle 命令 `launch-main-scene`、`settle-terminal-scene` 和 `end-day` 已接入 React 确认式交互。当前仍未实现 command bus、Profile 持久化、完整 RunState、生产 bootstrap／Provider 编排、Day 7 Final Resolver、Success Resolver、Run Abandon、New Run、多个存档槽、存档历史及迁移。

## 当前基础 Scene mutation 路由

`run-scene/` 严格解析并路由十类 Scene 玩家命令：移动、主要搜索、节点地面物品拾取、Scene 背包／快捷栏整理、主动撤离、障碍、任务事件、场景医疗、设备充能和战斗玩家行动。外层命令只包含路由 tag 与对应 core command；Combat 行动及既有障碍选项、任务事件放置、医疗来源／目标、充能实例、边、照明、拾取与整理规则仍由共享 core constructor 与 resolver 决定。

Router 只接受 canonical `scene-session`，按其中 RunIdentity 的 `rulesVersion` 从既有 registry 获取正式 Scene runtime。移动、搜索、拾取、整理、障碍、任务事件、场景医疗、设备充能和战斗玩家行动将 core resolution snapshot 与原 canonical context 重新交给严格 Session constructor；主动撤离调用既有 Session 级入口。Combat 的 CTB、敌人行动、资源消费、逃跑、场景时间和确定性随机继续由 Combat core 与 Scene combat integration 结算。Router 不导入医院内容、不复制 runtime、Session context、Scene mutable truth、随机数或 Effect。

所有成功结果只由 `executeStableRunCommand` 写入唯一 Run Save 一次；规则拒绝不写入，存储失败返回已经规范化的 committed Scene Session，且不重跑 resolver。产生安全返回、强制返回或死亡时仍保存为 `scene-session`，不会自动进入 Hub 或 Run Failure；下一步必须显式调用生命周期结算。`execution.phase` 是下一命令的唯一正式状态输入。

ongoing Combat 每个玩家命令后保存完整稳定 Scene Session；胜利、逃跑或战败也只提交 Scene Session，terminal Scene 不自动结算。十类现有 Scene router 命令均已通过最小 Store 与 React 确认式 UI 接入。战斗换装、完整战斗背包整理、战利品和多目标仍未实现，不属于当前路由缺陷。

## 当前基础 Hub mutation 路由

`run-hub/` 严格解析并路由四类当前日中枢玩家命令：Run loadout、Hub medical、Hub survival 与 Hub maintenance。十类整备命令、医疗来源和目标、两类生存物品以及五类维护操作都复用各自 core constructor 与 resolver；Router 不拥有物品容器、ItemState、医疗效果、日级使用、饱食、威胁抑制、维护工时、材料、维修点或 waste 规则。

Router 只接受 canonical `current-day-hub`，按其 RunIdentity 的 `rulesVersion` 从既有 Run Save registry 取得正式 CurrentDayHub 与 Hub Maintenance 依赖；维护依赖必须与该版本 CurrentDayHub 依赖同源。Router 不导入医院内容、不复制生命周期目录或内容绑定，也不局部拼接第二份 Hub 状态。

所有成功结果只由 `executeStableRunCommand` 写入唯一 Run Save 一次；规则拒绝不写入，存储失败返回已经规范化的 committed Hub，且不重跑 resolver、Effect 或物品消费。`execution.phase` 是下一命令的唯一正式状态输入。Hub mutation 不推进日期、不启动 Scene、不执行 Daily Settlement；End Day 仍由 `run-lifecycle/` 的独立命令处理。Run Loadout、Hub Medical、Hub Survival 和 Hub Maintenance 已通过最小 Store 与 React 确认式 UI 接入；Crafting、Salvage 命令及 UI 仍未实现。
