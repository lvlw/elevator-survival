# UI

React 只订阅 `StableRunStore` 的公开只读接口，并将 canonical `StableRunPhase` 投影为玩家可见的 ViewModel。组件不实现玩法规则、不直接保存，也不会在渲染或订阅过程中 dispatch。

`presentation/` 是纯 TypeScript 的白名单投影层；`hospital-v0.1/` 仅提供医院内容的显示文案。`run-store/` 使用 `useSyncExternalStore` 桥接 Store。`StableRunUiApp` 必须注入 Store 与 presentation dependencies。生产环境的默认 `App` 在没有活动 Run 时只显示诚实的未接入状态；开发环境会动态加载 `dev-preview/`，以正式构造器创建独立、内存态的 Hub／Scene／Combat／Failure 只读预览 Store。

当前是可替换的只读策略控制台。导航只显示**当前可通行相邻节点**，不是完整场景路线总览；阻挡路线和障碍需要未来正式的玩家可见导航查询。UI 尚未接入 New Run、命令按钮、React Provider、完整应用编排或任何玩法操作；开发预览和检查器只在开发环境存在，均不提供 mutation 能力。预览选择器只切换独立合法 Store，不发送 gameplay command，也不保存。
