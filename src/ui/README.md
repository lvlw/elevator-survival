# UI

React 订阅 `StableRunStore` 的公开只读接口，并将 canonical `StableRunPhase` 投影为玩家可见的 ViewModel。组件不实现玩法规则、不直接保存，也不会在渲染或订阅过程中 dispatch；已接入的玩家确认操作只会调用公开的 `store.dispatch()`。

`presentation/` 是纯 TypeScript 的白名单投影层；`interaction/` 是纯 TypeScript 的正式命令与安全 Preview 投影层；`hospital-v0.1/` 仅提供医院内容的显示文案。`run-store/` 使用 `useSyncExternalStore` 桥接 Store。`StableRunUiApp` 必须注入 Store 与 presentation dependencies。生产环境的默认 `App` 在没有活动 Run 时只显示诚实的未接入状态；开发环境会动态加载 `dev-preview/`，以正式构造器创建独立、内存态的 Hub／Scene／Combat／Failure 预览 Store。

当前是可替换的策略控制台。已接入确认式 gameplay command wiring：中枢启动主要场景、活动场景移动、使用／不使用手电筒的主要搜索、**显式节点物品拾取**、主动撤离、终止场景结算、医院防火门 `scene-obstacle`、感染护工 Combat scene player actions，以及医院样本箱 `scene-task-event`。战斗与任务事件 UI 只从 player-safe core query 读取合法行动和可公开的确定性事实；raw Preview、Effects、精确敌人生命、精确污染概率与隐藏随机结果不进入普通 ViewModel。每次确认仍只通过 `Store.dispatch()` 发送一条正式 application command，胜利、逃跑、战败、任务事件超时及强制返程不自动连锁下一生命周期。

拾取必须由玩家明确选择数量与背包坐标；样本箱提取必须明确选择 2×2 放置 anchor 与旋转。core 继续拥有堆叠、负重、放置资格、稳定实例身份、污染风险、外套消耗、时间和返程终局；React 不自动整理或提前宣告任务完成。取得样本箱只提交 Scene，安全返回后仍由显式 lifecycle settlement 将同一实例转入任务储存区。成功结算后的返回摘要、战斗行动结果和任务事件结果只是由 execution 前后 canonical phase 投影的本地展示，不是状态 owner。UI 仍未接入 New Run、React Provider、完整应用编排，以及 Scene 整理、非战斗医疗、充能、中枢操作或日结算命令。当前 React command 范围为 Launch、Move、Main Search、Pickup、Obstacle、Task Event、Withdraw、Combat Action 与 Terminal Scene Settlement。开发预览和检查器只在开发环境存在；检查器不提供 mutation，预览选择器只切换独立合法 Store，不发送 gameplay command，也不保存。
