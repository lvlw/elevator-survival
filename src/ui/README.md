# UI

React 订阅 `StableRunStore` 的公开只读接口，并将 canonical `StableRunPhase` 投影为玩家可见的 ViewModel。组件不实现玩法规则、不直接保存，也不会在渲染或订阅过程中 dispatch；已接入的玩家确认操作只会调用公开的 `store.dispatch()`。

`presentation/` 是纯 TypeScript 的白名单投影层；`interaction/` 是纯 TypeScript 的正式命令与安全 Preview 投影层；`hospital-v0.1/` 仅提供医院内容的显示文案。`run-store/` 使用 `useSyncExternalStore` 桥接 Store。`StableRunUiApp` 必须注入 Store 与 presentation dependencies。生产环境的默认 `App` 在没有活动 Run 时只显示诚实的未接入状态；开发环境会动态加载 `dev-preview/`，以正式构造器创建独立、内存态的 Hub／Scene／Combat／Failure 预览 Store。

当前是可替换的策略控制台。已接入确认式 gameplay command wiring：中枢启动主要场景、活动场景移动、使用／不使用手电筒的主要搜索、**显式节点物品拾取**、主动撤离、终止场景结算，以及医院防火门 `scene-obstacle`。拾取必须由玩家明确选择数量与背包坐标；core 继续拥有堆叠、部分拾取、负重、实例身份和最终资格。防火门只列出正式 Preview 当前接受的方案；资源变化来自正式 Effect，强行撞门通过“未产生轻度挫伤／产生轻度挫伤”两个同源规则分支表达不确定结果，不显示本次隐藏随机结果。主动撤离使用正式 Preview，撤离只提交 terminal Scene Session，返回结算由另一条显式 lifecycle command 完成。成功结算后的返回摘要只是由执行结果和 canonical Hub 投影的本地展示，不是状态 owner。每个动作先由正式纯 Preview 投影为安全信息，确认后才通过 `Store.dispatch()` 发送一条正式 application command。导航只显示**当前可通行相邻节点**与当前节点尚未解决的明显障碍，不是完整场景路线总览。UI 仍未接入 New Run、React Provider、完整应用编排，以及 Scene 整理、任务事件、医疗、充能、战斗、中枢操作或日结算命令。开发预览和检查器只在开发环境存在；检查器不提供 mutation，预览选择器只切换独立合法 Store，不发送 gameplay command，也不保存。
