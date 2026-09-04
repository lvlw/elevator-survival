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

## UIR-008：Playable Game Shell 与游戏感标准

- 状态：Confirmed
- 日期：2026-09-03
- 范围：Owner Playability Review Round 2 前的普通玩家展示层方向。
- 问题：现有工程验证控制台能够证明功能和规则正确，但大量面板、密集定义列表、长篇规则说明与开发控制台式数字不足以支持可靠的玩家体验和平衡判断。
- 已确认选择：下一阶段定义为 Playable Game Shell Upgrade。普通玩家 UI 采用低资产但稳定的游戏壳，形成明显主舞台、视觉化核心资源、主次信息层级、游戏化操作区域与即时反馈；正确的信息不能只依赖文字堆叠，功能可用也不等于可以长期保持工程控制台体验。核心资源和战斗信息优先通过状态条、进度条、阶段条、地图、时间轴、图标／卡片与即时数值反馈表达，长文案只作辅助说明。
- 概念结构：顶部用于今日时间、生命、饱食与世界威胁等核心状态；主要区域承载地图、当前场景、事件或战斗舞台；角色区域把武器／防具／实用装备、两个快捷位和 `6×4` 背包整合为同一携带面板，可提供完整展开与收拢摘要；底部或固定区域承载主要操作；系统日志、机制说明与详细数据属于可选辅助层。不同场景和战斗密度只能改变同源展示，不得创建第二份 loadout 状态。
- 必须遵守的契约：继续使用 Core／canonical state → player-safe query／preview → Presentation ViewModel → React Game Shell。Game Shell 不拥有生命、时间、路线、敌人生命、背包／装备资格、随机结果或返程公式，不形成第二份玩法状态。
- 可替换的视觉细节：左右位置、宽度比例、按钮顺序、面板开合、CSS Grid、颜色、字体、背景、图标、贴图、动画、Skin 与 Renderer。展示资产可逐步替换，不改变 gameplay definition 或 ItemInstance 身份。
- 明确不做：终版美术、正式资产生产、复杂动画系统、完整七日 UI，或把当前某一布局冻结为永久产品规则。
- 复查触发条件：Playable Game Shell 完成并恢复 Round 2 Review；进入终版美术、替换 Renderer 或完整七日信息架构时。
- 覆盖关系：扩展 UIR-005 的可替换展示层；局部更新 UIR-002 的主视觉方向，保留其策略信息完整、低资产验证和不成为第二套规则的约束，但普通玩家主界面不再以工程控制台为长期目标。

## UIR-009：核心资源视觉化与 Ghost Preview

- 状态：Confirmed
- 日期：2026-09-03
- 范围：生命、饱食、Scene time 预算与行动前轻量预估。
- 问题：精确数字和完整 Preview 虽然正确，但不足以让玩家持续感知资源状态、返程安全线与下一行动的主要代价。
- 已确认选择：玩家生命同时展示精确 HP 与生命条；饱食同时展示当前值与视觉状态条；Scene time 预算至少展示当前剩余时间、正式预计返程预留，以及展示派生的安全余量（当前剩余时间减正式当前返程估算）。安全余量不持久化，状态条不得重新计算正式阈值。
- Ghost Preview：Mouse Hover 或 Keyboard Focus 显示约三至五项最重要的玩家安全后果；Click 打开完整正式 Preview；Confirm 才发送一条正式 Command。可视联动可以包括 Scene time、返程预留、安全余量、HP、负重、装备资源、玩家已知风险与相对战斗顺序。
- 强制返程：DEC-035 继续允许玩家用生命与恢复空间换取额外探索收益，不把返程线变成行动硬锁。行动前应优先在 Ghost Preview 显示能否安全返程、预计强制返程损耗与预计生还／死亡，并在完整 Preview 再次确认。
- 任务事件：玩家先理解谨慎／直接等方案的时间成本、公开风险、防护改变、装备资源成本与已知主要结果，再选择任务物品背包位置并正式确认；不能先要求选择 `2×2` 位置才解释方案差异。
- 必须遵守的契约：Ghost Preview 为0 dispatch、0 save、0 RNG consumption、0 state mutation，不持有下一状态。所有规则敏感值只来自正式 player-safe Preview、canonical query 或版本化 catalog；事实缺失时扩展纯 Presentation／player-safe query，不在 JSX 中补公式。任务事件只显示正式的无／低／中／高／极高风险及当前防护后的等级，不泄露本次 roll、实际结果、内部百分比或 random trace。
- 可替换的视觉细节：Ghost 卡片位置、持续时间、动画、条形样式、颜色、图标和关键后果的排序。
- 明确不做：用 Hover 代替完整 Preview、Hover 自动确认、UI 自算返程／伤害／负重／装备损耗／感染／行动顺序，或禁止玩家确认可承担的越零行动。
- 复查触发条件：正式 player-safe Preview 无法提供必要安全事实；输入方式不支持 Hover；新增多角色、并行行动或新的时间资源时。
- 覆盖关系：扩展 UIR-003 的 Click → Preview → Confirm；Ghost 是完整 Preview 前的轻量只读层，不替代 UIR-003 的正式确认边界。

## UIR-010：Tooltip、Info Card 与机制可解释性

- 状态：Confirmed
- 日期：2026-09-03
- 范围：普通玩家可查询的规则说明与上下文信息。
- 问题：玩家不应因为没有参与设计而猜测感染、流血、防护、镇痛、维护或强制返程等基础机制的含义与处理方式。
- 已确认选择：建立通用 Tooltip、Info Card 与 Mechanic Help 基础设施，至少覆盖物品、装备、快捷栏、状态、风险标签、主要行动、敌人公开状态、地图节点和地图路线。除正式谜题、未知情报或需要调查的内容外，玩家应能查询机制是什么、主要影响、何时生效及主要处理方式。
- 感染说明：普通玩家应能理解感染暴露会在日结算中推动感染恶化，感染阶段会影响生存并最终可能导致本局失败；同时可以了解消毒、感染抑制与避免暴露等正式解决方向。
- 必须遵守的契约：说明事实来自版本化内容、player-safe presentation metadata 与当前 canonical 状态。默认不公开隐藏概率、随机种子、内部世界威胁精确进展、敌人精确 HP、完整未来行动、隐藏路线、未获得情报或其他内部身份。
- 可替换的视觉细节：Tooltip／Info Card／Help 的触发方式、尺寸、位置、图标、分层与文案长度。
- 明确不做：把完整内部规则表直接暴露给普通玩家、将推测写成机制事实，或新增未确认的感染治疗、敌人侦察和情报规则。
- 复查触发条件：新增正式知识等级、扫描能力、百科系统、可访问性输入方式或本地化约束时。
- 覆盖关系：扩展 UIR-001 与 UIR-002 的信息可读性要求；不改变既有玩家知识边界。

## UIR-011：Player-Known Map

- 状态：Confirmed
- 日期：2026-09-03
- 范围：第一版 Scene 地图及路线信息展示。
- 问题：地图需要帮助玩家理解已知空间和返程选择，但直接遍历完整 SceneGraph 会泄露隐藏节点、秘密路线和未获得情报。
- 已确认选择：地图是玩家当前已知场景空间关系的展示投影，概念状态至少支持当前节点、已到达节点、已知节点、已知可通行路线与已知阻塞路线。未知节点和路线完全不显示，不使用问号反向暗示其存在。
- 数据边界：Core／canonical player knowledge → explicit player-visible map query → presentation map model → React／SVG。React 不读取完整 SceneGraph 后自行过滤，也不依据节点定义猜测发现、到达或阻塞状态。
- 节点与路线信息：对正式已知的对象可以通过 Hover／Focus Info Card 展示名称、到达／搜索状态、从当前位置的已知移动成本、玩家可知返程信息、已知资源倾向与已知障碍；不能显示隐藏事实。
- 必须遵守的契约：若 canonical truth 与现有 query 不足以表达发现、到达或已知阻塞，未来工程必须停止地图该子项并报告缺少 player-known truth，先增加正式 player-visible query 或 knowledge owner，不能由 UX 层创造知识规则。
- 可替换的视觉细节：SVG、CSS 或 DOM 渲染、节点形状、连线、缩放、布局算法、颜色与信息卡样式。
- 明确不做：公开完整 graph、以问号泄露隐藏节点、推断秘密路线、改变探索发现规则或扩大玩家情报。
- 复查触发条件：正式玩家知识状态加入新的发现层级、地图情报、秘密路线揭示或跨场景地图时。
- 覆盖关系：落实 UIR-005 的可替换渲染边界，并继续遵守 DEC-013 与 DEC-024 的真实状态／玩家情报分离及已知返程信息约束。
- 规则依据：DEC-045 已进一步确认 canonical Player Navigation Knowledge、表层观察驱动发现、已知路线与当前通行状态分离及严格恢复边界；UIR-011 继续只记录展示与交互选择，不成为导航知识规则来源。

## UIR-012：战斗舞台与相对时间轴

- 状态：Confirmed
- 日期：2026-09-03
- 范围：低资产 Combat Presentation。
- 问题：当前战斗工程面板能显示事实，但缺少明确舞台、相对节奏与执行反馈；同时不能为了视觉化泄露精确敌人生命或 raw CTB。
- 已确认选择：战斗升级为低资产舞台，概念上敌人在左上、玩家在右下，双方有明显状态；独立高关注区域展示相对时间轴，中央承载行动反馈、飘字、轻量动画与战斗日志，底部或固定区域承载玩家行动。具体位置不是永久布局规则。
- 生命与时间轴：玩家显示精确 HP／最大值与生命条。敌人只显示完好、受伤、重伤、濒危、失去能力的正式阶段，可使用阶段式视觉条，但宽度不得反推精确 HP。普通玩家时间轴只显示相对行动顺序、相对先后与行动后的顺序变化，不显示 raw `currentCtb`、`playerNextActionCtb` 或 `enemyNextActionCtb`。
- Ghost 与反馈：Hover 战斗行动可以基于正式 Preview 显示玩家／敌人 marker 的幽灵位置、下一次决策前谁会行动及正式延后造成的相对变化。执行成功后可播放轻微位移、碰撞、抖动、HP／阶段条变化、飘字和 marker 位移。
- 战斗日志：重点记录谁执行了什么、公开结果、HP、装备资源、公开状态、敌人阶段与公开意图变化，保持简洁，不变成长篇规则文档。
- 必须遵守的契约：动画只在正式 canonical execution 后消费执行前展示、execution result 与执行后展示，不驱动命中、伤害、状态或结算。敌人阶段、意图与相对顺序来自正式 player-safe query／Preview，不在 React 解释 CTB 规则。
- 可替换的视觉细节：双方具体位置、舞台构图、marker 坐标、贴图、动画时长、飘字、阶段条样式和日志布局。架构须支持未来按阶段替换敌人图片／姿态。
- 明确不做：复杂动画系统、精确敌人 HP／百分比血条、raw CTB 数字、确认某种装备可扫描精确 HP，或让动画回调决定玩法结果。
- 复查触发条件：新增多敌人、队伍、正式扫描能力、复杂行动队列或更换战斗 Renderer 时。
- 覆盖关系：扩展 UIR-002 的战斗信息展示和 UIR-005 的可替换表现层，不改变现有 Combat CTB 或敌人生命公开规则。

## UIR-013：Presentation Activity Feed

- 状态：Confirmed
- 日期：2026-09-03
- 范围：普通 Game Shell 与战斗舞台共享的会话内事件历史。
- 问题：玩家需要理解已经发生的行动与成本，但不能为此创建持久化命令历史、Replay 状态或第二份 gameplay truth。
- 已确认选择：建立 session-local presentation history。唯一 owner 是 Game Shell Presentation；来源为正式 command execution、执行前后 canonical presentation facts 与正式 player-safe result。Feed 可以按 system、combat、inventory、scene、hub、lifecycle 分类，普通系统日志显示合适的全部事件，战斗舞台过滤同一 Feed 的战斗事件，不建立另一份战斗日志真相。
- 追加规则：只在 command 已执行之后追加。Hover、打开 Preview、取消、验证失败、只读查看、Tooltip 与地图 Hover 不产生日志。记录必须使用正式成本与结果，例如搜索时间与0时间拾取不能被展示文案改写。
- 生命周期：只在当前 Browser UI Session 内有效，不进入 StableRunPhase、Run Save、Profile、Hub State 或 Scene State，不影响下一条命令，不作为 Replay truth。刷新后不重建过去命令历史，可以用“已恢复当前游戏状态”作为新会话起点。
- 必须遵守的契约：Feed 只保存已经发生结果的 player-facing text／event projection，不保存 Effects、TransitionPlan、原始 snapshot、隐藏随机轨迹或内部命令身份；关闭、筛选与滚动不发送 gameplay command。
- 可替换的视觉细节：显示位置、折叠、筛选、保留条数、时间样式、图标、动画和具体玩家文案。
- 明确不做：Run gameplay history、Save history、Replay log、分析埋点、规则驱动日志，或从刷新后的当前状态伪造过去操作。
- 复查触发条件：正式 Replay、跨会话历史、战报导出、Profile 统计或遥测系统立项时。
- 覆盖关系：扩展 UIR-005 的 Presentation 职责；战斗日志是同一 Feed 的展示过滤，不覆盖 UIR-012 的战斗舞台职责。

## UIR-014：DEV-only Owner Playtest Reset

- 状态：Confirmed
- 日期：2026-09-03
- 范围：Owner 本地反复试玩的开发环境重开工具。
- 问题：Owner 需要快速清除当前浏览器 Run 存档并回到正式 New Run Setup，但现有只读 Inspector 不允许 mutation，正式 Run Abandon 也尚未设计。
- 已确认选择：在显式 DEV playtest composition 中提供“开发测试：重新开始”。流程为点击、不可逆提示、二次确认、清除当前 Browser Run Save，再进入正式 `no-run`／New Run Setup。可以复用 Browser storage adapter 的 `clear()`，但不得进入默认生产生命周期。
- 必须遵守的契约：该工具是 DEV composition utility，与 UIR-004 的只读 Dev Inspector 分离；不属于 core、run-store、run-lifecycle 或 run-application，也不是 Inspector mutation 扩展。Production build 无入口、无按钮、无可触达实现。
- 可替换的视觉细节：入口位置、按钮文案非语义细节、警告样式与确认控件。
- 明确不做：Run Abandon、Run Failure、gameplay command、把活动 Run 转为 Failure、伪造 termination、raw `setState`、修改 canonical phase、生产重置、Profile 清理或作弊菜单。
- 复查触发条件：正式 Run Abandon、生产环境重置／删除存档、多存档槽或 Profile 管理被设计并确认时。
- 覆盖关系：与 UIR-004 并列且严格分离；UIR-004 Inspector 继续只读。沿用 UIR-007 的 Production Bootstrap／`no-run` 边界，但不改变其生产入口与存档恢复规则。
