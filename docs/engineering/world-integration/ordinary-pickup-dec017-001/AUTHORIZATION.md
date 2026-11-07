# 限定增量授权记录

原始 ZIP 未修改，原包仍只含 README、TASK、ACCEPTANCE、SOURCES、HANDOFF 五文件。

## 第一次增量

Owner 原文：“选择第1项，批准本任务四处必要接口接线。此消息作为 ENG-WORLD-ORDINARY-PICKUP-DEC017-001 第6节的增量授权，原任务其他边界不变。”

BASE a84adc827e56c4d8d01d4f8b541a90c9f35a6523；继续 feature/world-ordinary-pickup-dec017-001，不重置工作区，不重跑已完成基线。

| 路径 | Owner 限定范围 | 实际改动 |
|---|---|---|
| src/core/residence-supply/player-inputs.ts | 普通可堆叠拾取数量及纯并堆/剩余放置描述；不取消其他必需参数 | pickup 候选标记 stackable/whole，仅对应拾取添加 quantity 描述 |
| src/core/residence-combat/player-query-types.ts | 本次安全预览结果类型；不授权战斗规则 | 新增 OrdinaryPickupPreview 及可选 pickup 字段 |
| src/state/residence-session/player-commands.ts | 必要数量、放置转发，保留 strict/opaque/身份/revision | pickup 字段白名单仅新增 quantity，原转发链保持 |
| src/state/residence-session/player-types.ts | 普通拾取公开 Preview 类型，其他语义保持 | 可选 pickup 结果引用安全类型 |

允许同目录直接回归；不得删除、skip 或降低旧断言。行为只适用于 ordinary && stackable；数量为原始安全正整数；核心计算，UI 仅显示/发意图；公开预览不含实例 ID、来源份额、完整计划或隐藏状态；不提交、不保存、不用随机。存档格式、生命周期、任务件、数值、依赖均不改变。

## 第二次增量

Owner 原文：“批准第1项，授权两处 pickup 严格命令构造器同步修改。这是 ENG-WORLD-ORDINARY-PICKUP-DEC017-001 的第二次限定白名单增量，原任务目标和其他授权边界不变。”

新增仅 `src/state/residence-session/combat-commands.ts` 与 `src/state/residence-session/supply-commands.ts`：inventory 的 kind=pickup 严格结构增加 `quantity: positiveSchema.optional()`、`placement: placement.optional()`。

Owner 要求完整保留 z.strictObject、原始正整数校验，不接受负数/零/小数/布尔/数字字符串；普通不可堆叠仍须合法完整放置。纯并堆可省格位，产生新堆叠必须由正式放置资格认可。task-pickup/task-drop 及其余分支不变，任务件不得进入 ordinary pickup。禁止 as any、宽松 unknown、绕过构造器。允许直接构造器回归及必要的窄兼容适配。

实际两个文件各改一行，其他严格 schema 原样。直接回归 `ordinary-pickup-constructors.test.ts` 覆盖上述非法输入、额外字段、任务拾取与其他命令必需参数。

## 剩余链路只读核对

实际路径：React → BrowserControls/Preplay → readPlayerRequest → opaque 解析/resolvePlayerCommand → createCombatSessionCommand → qualifyPlayerCommand / 原保存拥有者 dispatch 再构造严格命令 → planCombatInventory → planSharedInventory → 原 context.read/issue → 原 current/单次写保存。旧 supply-session 对应 createSupplySessionCommand → planSupplyInventory → 同一 planSharedInventory。

已逐层核对 Preview、资格、安全确认、提交、重试与冷恢复；无需其他生产路径授权。保存历史旧测试需两个独立堆叠的夹具，通过原白名单内 `src/core/residence-task/test-fixtures.ts` 的 TEST arranger 执行正式拆分保留前提；没有修改 residence-save 文件或其防篡改断言。

Git 仍只允许当前任务新分支普通 commit/push；不合并、部署、清档，不改其他 worktree。
