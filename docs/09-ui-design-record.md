# UI 设计记录

用途：记录当前 UI 实现边界与已确认的展示决策。本文件不是产品规则权威来源，不覆盖 DEC、纵向切片或冻结报告。

## UIR-001：桌面优先的首版控制台

- 状态：Confirmed
- 日期：2026-08-23
- 范围：首版 React 展示层
- 问题：需要可验证的首个可玩展示面，但不应把首版响应式策略误写成永久设备限制。
- 已确认选择：以 1280–1600px 桌面宽度优先设计，窄屏只提供基础降级布局。
- 理由：首版重点是策略信息密度、清晰度与测试可控性。
- 必须遵守的契约：窄屏不能损坏状态阅读；不把“桌面优先”记录为“永久不支持移动端”。
- 可替换的视觉细节：断点、间距、栅格与色彩。
- 明确不做：移动端专用交互和原生应用适配。
- 复查触发条件：开始正式移动端范围或发现桌面信息密度不可读。
- 覆盖关系：无。

## UIR-002：功能型策略控制台

- 状态：Confirmed
- 日期：2026-08-23
- 范围：V1 只读策略展示
- 问题：早期验证需要准确可读、可测试的操作面，而非终版美术生产。
- 已确认选择：采用低资产、高可观察性的深色策略控制台。
- 理由：优先验证策略选择、结果解释与状态可见性。
- 必须遵守的契约：展示不能成为第二套玩法规则或状态真相。
- 可替换的视觉细节：排版、卡片边框、色彩和未来插画。
- 明确不做：终版美术、资产管线或叙事演出。
- 复查触发条件：进入正式美术方向或可玩性验证结束。
- 覆盖关系：无。

## UIR-003：点击、预览与确认

- 状态：Confirmed
- 日期：2026-08-23
- 范围：未来玩家命令交互
- 问题：策略命令需保持可解释与可确认。
- 已确认选择：使用点击、预览、确认作为正式交互前提；拖拽不是 V1 前置条件，未来可作为展示层增强。
- 理由：便于准确映射正式命令，并降低交互测试成本。
- 必须遵守的契约：UI 只能提交正式命令，不携带 Effect、结果或下一状态。
- 可替换的视觉细节：控件样式与预览布局。
- 明确不做：当前任务不接入任何真实玩法按钮。
- 复查触发条件：开始库存、地图或命令交互任务。
- 覆盖关系：无。

## UIR-004：开发期只读检查器

- 状态：Confirmed
- 日期：2026-08-23
- 范围：开发环境调试辅助
- 问题：需要观察严格快照事实，同时不能给 UI 绕过正式命令路径的能力。
- 已确认选择：仅开发环境可展开只读检查器，可显示内部精确事实，但不提供 setState、命令或 mutation。
- 理由：支持恢复边界与状态可观察性验证。
- 必须遵守的契约：生产环境无入口；检查器不触发保存、随机或状态修改。
- 可替换的视觉细节：展开方式、格式化和位置。
- 明确不做：生产调试菜单或运行时修改器。
- 复查触发条件：建立专门调试工具或生产可观测性方案。
- 覆盖关系：无。

## UIR-005：可替换的 V1 展示层

- 状态：Confirmed
- 日期：2026-08-23
- 范围：React V1 UI 架构
- 问题：需要先验证可玩性，而不锁死未来表现技术。
- 已确认选择：React V1 仅作为可替换的展示层；未来可以使用 Phaser 或其他渲染方案，只要继续读取 canonical 状态并发送正式命令。
- 理由：将玩法结算与表现技术解耦。
- 必须遵守的契约：核心规则保持纯 TypeScript；展示层不拥有玩法或第二份 Run 状态。
- 可替换的视觉细节：所有组件、渲染技术和美术表现。
- 明确不做：本任务不引入 Phaser、第二状态容器或 UI 规则引擎。
- 复查触发条件：进入地图表现、动画或替换渲染技术评估。
- 覆盖关系：无。

## UIR-006：开发期预览 harness

- 状态：Confirmed
- 日期：2026-08-23
- 范围：开发环境的只读 React UI 预览
- 问题：需要在尚未实现 New Run、Profile、真实启动流程和玩家命令控件前，验证 Hub、Scene、Combat 与 Failure 的展示，而不伪造活动 Run 或绕过正式恢复边界。
- 已确认选择：仅开发环境中，默认 `App` 未注入正式 Store 时显示“开发预览 / 不是活动 Run / 使用内存状态”横幅和场景选择器。每个示例都通过正式医院构造器与 resolver 生成合法 canonical phase，再创建真实 `StableRunStore`；预览仅使用内存 `RunSaveStorage`，Store 创建时零写入。
- 固定开发标识：Run ID 为 `dev-ui-preview`，seed 为 `dev-ui-preview-seed`。
- 预览范围：Hub、Scene、Combat、Failure；选择器只切换彼此独立的合法 Store，不发送 gameplay command、不保存、不读取或修改真实存档。
- 必须遵守的契约：不得使用类型断言、裸造非法 snapshot、raw Zustand `setState` 或 Store mutation；不是游戏入口、New Run、save slot、Profile、玩法拥有者或正式生命周期替代品。生产构建没有预览入口；生产环境未注入 Store 时保留诚实空白状态。
- 可替换的视觉细节：横幅、选择器布局和示例文案。
- 明确不做：New Run、自动启动、localStorage bootstrap、正式命令按钮、开发作弊操作或 UI 状态写入。
- 复查触发条件：实现正式 New Run／Scene Launch 启动流程、真实存档选择或交互式玩家命令 UI。
- 覆盖关系：无。

## UIR-007：正式 Production Bootstrap 与显式 DEV Preview 入口

- 状态：Confirmed
- 日期：2026-08-31
- 范围：默认网页入口、启动 loading、合法 Run 自动恢复、`no-run`、`load-error`、损坏存档清理、New Run Setup、`run-failure` → New Run，以及显式 DEV Preview 入口。
- 问题：当前开发环境默认 App 在未注入 Store 时自动进入 DEV Preview，而生产入口尚未编排严格单槽恢复、错误阻塞与 New Run Setup；需要让默认入口反映真实生产生命周期，同时保留安全、显式的开发预览。
- 已确认选择：开发与生产默认入口均执行真实 Production Bootstrap。默认 App 不再因为开发环境且未注入 Store 就自动进入 DEV Preview；DEV Preview 仍只存在于开发构建，但必须通过显式 DEV-only 入口触发。显式入口可以采用 query、独立 dev route、独立 dev entry 或其他不会进入生产构建的方式，具体形式属于可替换实现细节。
- 启动展示：启动期间可以显示“正在恢复 Run…”。加载过程保持0 gameplay dispatch、0 Run Save write、0 Run Save clear、0 RunIdentity generation。合法 Run 自动进入正式 UI，不显示 Continue 页面。
- `no-run`：无存档时显示“开始新的医院 Run”。在 New Run 尚未实现的短暂工程阶段，可以继续显示诚实的未接入说明；接入后展示固定初始装备摘要、实用装备三选一、专长暂缓说明和最终确认。
- `load-error`：损坏或不兼容存档显示玩家可理解的阻塞错误，不显示 raw save 或内部身份。清理继续采用 UIR-003 的点击 → 不可逆 Preview → Confirm；提示必须说明该操作会删除当前无法恢复的唯一 Run 存档，之后无法恢复其内容。取消不清理。
- Failure 与 New Run：合法 Failure View 继续显示终止摘要，可以通过“开始新的 Run”进入 New Run Setup。最终确认前说明新 Run 将替换唯一 Run 槽中的当前终止摘要；当前尚未实现 Profile 历史持久化，不得暗示该终止已经写入永久历史。活动 Hub 或 Scene 中不得显示 New Run。
- DEV Preview：UIR-006 的 DEV-only、内存 Storage、正式 constructor／resolver、合法 canonical phase、固定 dev Run ID／seed、无 gameplay mutation、无真实存档读写、无 raw `setState` 和生产构建无入口继续有效。UIR-007 只局部覆盖 UIR-006 的开发环境默认 App 无 Store 时自动进入 Preview；新的有效规则是默认入口走真实 Bootstrap，DEV Preview 只能显式进入。
- 必须遵守的契约：App Shell 不拥有 gameplay truth；加载错误不能静默回退；New Run setup 草稿不是 Run 状态；身份生成不能发生在 render；StrictMode 不能导致重复读取后的写入、重复清理、重复身份生成或重复 New Run；普通 DOM 不显示 raw save、runId、seed、rulesVersion 或内部存档结构。
- 可替换的视觉细节：loading 动画、卡片布局、错误图标、New Run 选项控件、DEV 入口形式和按钮文案的非语义细节。
- 明确不做：存档选择器、多个 Run slot、云存档、存档迁移 UI、存档修复器、Run Abandon、Profile 历史、成功终局、Day 7 Final Resolver、专长选择或玩家 seed 输入。
- 覆盖关系：UIR-007 局部覆盖 UIR-006 的默认进入方式；UIR-006 的 DEV-only、安全构造、内存存储、无 mutation 与生产无入口等约束继续有效。
