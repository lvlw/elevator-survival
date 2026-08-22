# State

应用状态适配、持久化边界及 UI 与纯规则核心之间的协调。本阶段不创建正式 Store。

## 当前最小 Run 持久化边界

`run-save/` 只持久化已经由核心规则完整提交的稳定 Run 阶段：当前日中枢、Run Scene Session 或 Run 失败。三者使用互斥的 tagged union，并作为一个完整、版本化的值写入唯一 Run 存档槽。

读取顺序为严格 JSON 与 envelope 校验、存档格式版本校验、规则版本注册表分派，再调用对应 core 正式恢复入口。损坏、伪造、未知版本或不满足正式快照不变量的存档会失败，不会修复、升级或回退为新游戏。

本边界不拥有游戏规则，不保存事务中间态、Effect 计划、预览或派生缓存。`command-execution/` 只接受严格恢复后的非终止阶段，在生命周期专用 handler 完成正式规则结算后重新规范化输出、验证 Run 身份连续性，并通过唯一 Run Save 写入一次。规则拒绝、Effect 不匹配、终止输入和跨 Run 输出均不写入；存储失败不会回滚已提交的内存结果。

Success 仍是 DEC-028 定义的未来正式终局概念；当前规则版本没有 Success Resolver 或主线成功条件，因此不能构造、保存或恢复 `run-success`。

## 当前最小生命周期路由

`run-lifecycle/` 严格解析并路由三个应用生命周期命令：启动主要场景、结束本日和结算终止 Scene。它只允许当前日中枢启动场景或结束本日，只允许经过 Scene strict restore 证明位于正式返程安全节点且玩家存活的安全／强制返回 Scene 进入正式 Return，其中强制返回必须处于零剩余时间；死亡 Scene 进入正式 RunFailure，活动与战斗 Scene 不能结算终止场景。

Router 根据 canonical current phase 的 RunIdentity 从既有 Run Save registry 取得正式版本依赖，调用现有 Scene Launch、Run Return、Daily Settlement 与 RunFailure 入口，再委托 `executeStableRunCommand` 规范化结果、验证身份并写入唯一存档。returned Scene 的位置、时间与生命校验只存在于 Scene strict snapshot：`remainingTime` 必须是0到当前规则 `scene.totalTime` 之间的安全整数，超出范围会拒绝而不修复；Run Save 和生命周期结算复用该入口，Router 不复制或补算撤离规则。Router 不直接保存；`execution.phase` 是下一条命令的唯一状态输入，resolver result、summary 和 Effects 不形成第二份应用状态。

当前仍未实现完整 Application command routing、全部 Hub／Scene 玩家 mutation 路由、Profile 持久化、完整 RunState、Zustand／UI 编排、Success Resolver、Run Abandon、New Run、多个存档槽、存档历史及迁移。

## 当前基础 Scene mutation 路由

`run-scene/` 严格解析并路由五类 Scene 玩家命令：移动、主要搜索、节点地面物品拾取、Scene 背包／快捷栏整理和主动撤离。外层命令只包含路由 tag 与对应 core command；合法边、照明选择、拾取数量／摆放、整理变体和撤离资格仍由共享 core constructor 与 resolver 决定。

Router 只接受 canonical `scene-session`，按其中 RunIdentity 的 `rulesVersion` 从既有 registry 获取正式 Scene runtime。移动、搜索、拾取和整理将 core resolution snapshot 与原 canonical context 重新交给严格 Session constructor；主动撤离调用既有 Session 级入口。Router 不导入医院内容、不复制 runtime、Session context、Scene mutable truth 或 Effect。

所有成功结果只由 `executeStableRunCommand` 写入唯一 Run Save 一次；规则拒绝不写入，存储失败返回已经规范化的 committed Scene Session，且不重跑 resolver。产生安全返回、强制返回或死亡时仍保存为 `scene-session`，不会自动进入 Hub 或 Run Failure；下一步必须显式调用生命周期结算。`execution.phase` 是下一命令的唯一正式状态输入。

障碍、任务事件、场景医疗、设备充能、战斗玩家行动、Hub mutation、完整 Application Store、Zustand 与 UI 仍未接入本路由。
