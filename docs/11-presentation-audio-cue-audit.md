# Presentation Audio Cue Audit v0.1

> 本文件是 Presentation production audit，不是 gameplay rule source，不覆盖 DEC、Vertical Slice、Architecture 或 UIR。

## 1. 审计目的与触发边界

本审计为当前 Game Shell、Scene、Combat、Hub 和生命周期界面定义可生产的声音候选。Cue ID 仅属于 Presentation production，不是 Effect ID、command ID、enemy instance ID 或存档身份。本轮不创建 AudioManager、资源管线、`AudioEvent[]`、`PresentationEvent[]`、Activity Feed、音乐系统或任何音频文件。

音频触发严格分为两类：

1. **Pure Presentation UI**：focus、非 gameplay 选择、打开/关闭信息或预览等本地交互。它们不代表游戏命令成功，且不应给每个 hover 都加声音。
2. **Gameplay Execution Feedback**：只有正式命令成功、canonical result 已提交后才播放。点击行动按钮当前只是打开 Preview；命中、拾取、开门、治疗、返程等成功声不得在 click/preview 时抢跑。

稳定顺序为：`Hover / Focus → Ghost → Click → Preview → Confirm → command → canonical execution → committed result → sound`。stale Preview、规则拒绝和执行前校验失败不播放成功 Cue。若 gameplay 已 canonical committed、随后 persistence write 失败，玩法结果声仍对应已发生事实；保存失败另播独立 System feedback，不能用静音暗示 gameplay rollback。

声音永远不拥有命中、伤害、CTB、Save、RNG、物品消费、敌人阶段或返程结果。它只消费 UI-local 事实或 canonical before/after/result。搜索掉落、污染判定、隐藏敌人、未知路线、未来意图和精确敌人 HP 在成为玩家可知事实前都不能由声音泄漏。

## 2. 统一 Source Master 建议

- 保留无损 master：WAV，48 kHz，24-bit PCM。
- 短促、干式 UI/Foley/战斗击打优先 mono；空间氛围、宽幅 transition 或未来 ambience 才考虑 stereo。
- 非 loop cue 的头部静音目标 0～10 ms，避免按下后感觉迟滞；尾部保留自然衰减，一般 50～250 ms，不以硬切制造 click。
- 若含多 variant，各文件保持相同瞬态位置、相近听感响度和命名结构；本审计不冻结最终 LUFS、peak、compressor 或 ducking。
- 需要 loop 的素材必须无缝、带明确 loop points；第一批不建议生产长环境循环声。
- Web runtime 可在未来从无损 master 转 Ogg/Opus、AAC 或项目最终选定格式；本轮不实现压缩、预载、并发或降级管线。

## 3. Pure Presentation / System Cue Audit

| Cue ID | Surface / Player purpose | Trigger semantics | Source truth | Timing | Must not fire on | Priority | Duration target | Mono / stereo | Source master recommendation | Variants | Concurrency | Future routing | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-UI-FOCUS | UI；键盘焦点确认 | 焦点首次进入高价值可操作控件 | UI-only | before command | 普通文本、disabled、重复 hover、自动 focus | DEFER | 40～80 ms | mono | 48k/24 WAV | 1～2 | 同时仅 1，节流 | local UI interaction | 静音，不影响可达性 |
| AUD-UI-SELECT | UI；明确本地草稿选择 | radio、placement、operation 等本地选择实际改变 | UI-only before/after local state | before command | hover、相同值重选、Preview cancel、规则拒绝 | NEXT | 60～120 ms | mono | 48k/24 WAV | 2 | 快速选择时限制叠加 | local UI interaction | 视觉 selected state |
| AUD-UI-PREVIEW-OPEN | Dialog；提示进入确认层 | 合法 Preview 被构造并打开 | UI-only + safe preview availability | before command | Preview 构造失败、disabled action | NEXT | 100～180 ms | mono | 48k/24 WAV | 1 | 替换前一个同类 cue | local dialog lifecycle | dialog 动画 |
| AUD-UI-PREVIEW-CLOSE | Dialog；退出确认层 | cancel/close 只读 Preview | UI-only | before command | Confirm 成功、phase change 自动失效 | DEFER | 70～130 ms | mono | 48k/24 WAV | 1 | 不叠加 | local dialog lifecycle | dialog 关闭动画 |
| AUD-SYSTEM-PERSISTENCE-ERROR | System；明确“已提交但保存失败” | 已建立 canonical / committed result 后，persistence write/save 失败 | committed execution + persistence write result | after committed execution | bootstrap load/restore/read error、规则拒绝、Preview、cancel、成功保存 | NOW | 250～500 ms | mono | 48k/24 WAV | 可与 load error 共用 1 个 source WAV，但 cue mapping 独立 | 高优先级，压过 UI click；不覆盖 gameplay result cue | application/store feedback | 明确“会话已提交、持久化失败”文案 |

## 4. Combat Cue Audit

敌人发声和受伤差异只能按公开阶段规划，不允许用更多层级编码精确 HP。当前意图只允许对应已经公开/已发生的行动，不预告未来队列。

| Cue ID | Surface / Player purpose | Trigger semantics | Source truth | Timing | Must not fire on | Priority | Duration target | Mono / stereo | Source master recommendation | Variants | Concurrency | Future routing | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-COMBAT-PLAYER-BASIC | Combat；基础攻击动作感 | canonical combat result 确认玩家基础攻击已执行 | formal execution result | after successful execution | click、Preview、cancel、rejection、临时攻击 | NOW | 180～350 ms | mono | 48k/24 WAV dry weapon Foley | 2 | 同一 action 仅 1 | combat result presentation | Battle Stage latest-result 文字 |
| AUD-COMBAT-PLAYER-CHARGED | Combat；蓄力击打重量感 | canonical result 确认签名蓄力击打已执行 | formal execution result | after successful execution | Preview、资格失败、未实际消费耐久 | NOW | 300～550 ms | mono | 48k/24 WAV | 2 | 不与 basic 同播 | combat result presentation | 动作结果文字 |
| AUD-COMBAT-ENEMY-SCRATCH | Combat；已发生抓挠 | canonical enemy action result 为抓挠 | formal execution result | after successful execution | 当前意图仅展示、未来队列、未行动 | NOW | 180～350 ms | mono | 48k/24 WAV | 2 | 每次敌人 action 1 个 | enemy action result | 伤害/状态文字 |
| AUD-COMBAT-ENEMY-BITE | Combat；已发生扑咬 | canonical enemy action result 为扑咬 | formal execution result | after successful execution | 当前意图展示、未执行的扑咬 | NEXT | 250～450 ms | mono | 48k/24 WAV | 2 | 每次敌人 action 1 个 | enemy action result | 伤害/状态文字 |
| AUD-COMBAT-PLAYER-HURT | Combat；玩家实际受伤 | canonical before/after 显示玩家生命下降或新增公开伤势 | canonical before-after | after successful execution | 风险 Preview、0 伤害、被护甲完全吸收 | NOW | 180～400 ms | mono | 48k/24 WAV | 2 | 可与攻击声串联，避免完全重叠 | result projection | HUD/伤势变化 |
| AUD-COMBAT-ENEMY-HIT | Combat；敌人实际受击 | canonical enemy phase/生命结果确认敌人受伤 | canonical before-after/result | after successful execution | attack click、miss/无伤害、Preview | NOW | 140～300 ms | mono | 48k/24 WAV | 2 | 与武器动作声短间隔串联 | result projection | enemy phase 与结果文字 |
| AUD-COMBAT-ENEMY-PHASE | Combat；公开生命阶段变化 | public enemy health phase 在 canonical state 中改变 | canonical before-after public phase | after successful execution | 同阶段精确 HP 变化、Preview | NEXT | 250～500 ms | mono | 48k/24 WAV | 最多按 5 个公开阶段；首批 2 通用 | 每次 phase transition 1 个 | ViewModel phase transition；未来 Activity projection | 阶段 chip |
| AUD-COMBAT-WEAPON-BREAK | Combat；装备正式破损 | canonical item resource 从可用降至 0 / broken | canonical before-after ItemState | after successful execution | 低耐久 Preview、未破损消费 | NOW | 250～500 ms | mono | 48k/24 WAV material-specific base | 2 | 高优先级，允许接在 hit 后 | item-state transition | 破损文字与禁用 action |
| AUD-COMBAT-BANDAGE | Combat；绷带已成功使用 | canonical medical result 已消费绷带并处理目标伤口 | formal execution result + before-after | after successful execution | Preview、非法目标、无消费、Scene/Hub 使用混淆 | NEXT | 350～700 ms | mono | 48k/24 WAV cloth Foley | 2 | 不叠加同类 | medical result presentation | 伤口/流血变化 |
| AUD-COMBAT-PAINKILLER | Combat；止痛药已成功服用 | canonical result 显示真实消费且 painkillerActive 改变 | formal execution result + before-after | after successful execution | 预防性非法使用、已生效拒绝、Preview | NEXT | 250～500 ms | mono | 48k/24 WAV | 1～2 | 同类不叠加 | medical result presentation | 状态 chip |
| AUD-COMBAT-ESCAPE-START | Combat；脱离准备开始 | canonical result 创建并锁定逃跑完成时间 | formal execution result | after successful execution | escape Preview、非法逃跑、普通受伤 | NEXT | 180～350 ms | mono | 48k/24 WAV | 1 | 不循环；同一准备只播一次 | combat result presentation | timeline ghost/状态文字 |
| AUD-COMBAT-ESCAPE-COMPLETE | Combat；正式脱离完成 | canonical result 确认 escape completed | formal execution result | after successful execution | 开始准备、被明确中断、Preview | NEXT | 300～600 ms | mono/stereo 可评估 | 48k/24 WAV | 1 | 与 safe/forced return 按事实择一，不全播 | terminal combat result | Scene status 文字 |
| AUD-COMBAT-VICTORY | Combat；敌人正式失去能力 | canonical result 进入 victory / enemy incapacitated | formal execution result | after successful execution | 濒危 Preview、未结束战斗 | NOW | 500～900 ms | stereo 可选 | 48k/24 WAV | 1 | 高优先级；抑制普通 enemy-hit 尾部 | terminal combat result | victory result panel |
| AUD-COMBAT-PLAYER-DEFEAT | Combat；玩家正式死亡 | canonical Scene/combat result 为 dead | formal execution result | after successful execution | death risk Preview、低 HP、save failure 单独 | NOW | 500～1000 ms | stereo 可选 | 48k/24 WAV | 1 | 高优先级，不与 victory 同播 | terminal result | Failure/terminal UI |

## 5. Scene Cue Audit

| Cue ID | Surface / Player purpose | Trigger semantics | Source truth | Timing | Must not fire on | Priority | Duration target | Mono / stereo | Source master recommendation | Variants | Concurrency | Future routing | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-SCENE-MOVE | Scene；节点移动已完成 | canonical Scene current node 实际改变 | canonical before-after | after successful execution | Move Ghost、Preview、非法边、未知路线 | NOW | 250～600 ms | mono/stereo 可评估 | 48k/24 WAV Foley | 2 | 新 move 可截断旧尾音 | Scene execution result | 地图当前位置变化 |
| AUD-SCENE-SEARCH-COMPLETE | Scene；主要搜索完成 | canonical search status 转为 searched，结果已成为玩家可见 | formal execution result + before-after | after successful execution | Preview、重复搜索拒绝、隐藏掉落尚未提交 | NOW | 300～650 ms | mono | 48k/24 WAV | 2 | 每次搜索 1 个 | Scene search result | 搜索结果/地面物列表 |
| AUD-SCENE-ITEM-PICKUP | Scene；真实物品拾取完成 | canonical before/after 显示指定 instance/quantity 从节点进入背包 | formal execution result | after successful execution | placement Preview、超重、拒绝、未实际转移 | NOW | 140～300 ms | mono | 48k/24 WAV | 2 | 快速连续时节流 | item transfer result | 背包/地面数量刷新 |
| AUD-SCENE-INVENTORY-TRANSFER | Scene；零时间整理被确认 | canonical inventory command 成功，容器/placement 改变 | formal execution result | after successful execution | 草稿变化、自动候选、Preview、no-op/reject | NEXT | 100～220 ms | mono | 48k/24 WAV | 2 | 快速整理可限制同类并发 | inventory result | 网格和快捷栏刷新 |
| AUD-SCENE-DOOR-CARD | Scene；门禁卡开门成功 | canonical obstacle result 确认 access-card option 已开门 | formal execution result | after successful execution | 仅持卡、Preview、非法资格；不得暗示消耗卡 | NOW | 250～500 ms | mono | 48k/24 WAV electronic/mechanical | 1～2 | 与通用 door-open 合并为一个结果序列 | obstacle result | edge/door status 变化 |
| AUD-SCENE-DOOR-CROWBAR | Scene；撬棍开门成功 | canonical obstacle result 确认 crowbar option 已完成 | formal execution result | after successful execution | Preview、无工具、被拒绝 | NOW | 350～700 ms | mono | 48k/24 WAV metal pry | 2 | 1 action 1 cue | obstacle result | 结果文字和路线开启 |
| AUD-SCENE-DOOR-TOOLKIT | Scene；工具箱方案成功 | canonical obstacle result 确认 toolkit option 已完成及结果公开 | formal execution result | after successful execution | Preview、隐藏电子元件结果尚未提交、资格失败 | NEXT | 350～700 ms | mono | 48k/24 WAV tools/mechanism | 2 | 与 pickup cue 按实际公开转移顺序区分 | obstacle result | 结果/地面物刷新 |
| AUD-SCENE-DOOR-FORCE | Scene；强行撞门已发生 | canonical obstacle result 确认 force-entry 已执行 | formal execution result | after successful execution | 风险 Preview、roll 未结算、拒绝 | NOW | 400～800 ms | mono/stereo 可评估 | 48k/24 WAV impact/door | 2 | 高瞬态，限制叠加 | obstacle result | alert/伤势/门状态文字 |
| AUD-SCENE-SAMPLE-EXTRACT | Scene；样本箱取得动作完成 | canonical task-event result completed 且真实样本物进入 Scene 携带状态 | formal execution result | after successful execution | extraction Preview、decline、非法 placement、尚未安全入库 | NOW | 350～750 ms | mono | 48k/24 WAV latch/container | 2 | 与 exposure/status cue 不叠加推断随机 | task-event result | 样本箱背包 footprint 与结果卡 |
| AUD-SCENE-SAFE-RETURN | Lifecycle；正式安全返回完成 | canonical withdrawal/terminal result 为 safe-returned | formal execution result | after successful execution | Return Preview、safe margin 显示、forced/dead | NOW | 500～1000 ms | stereo 可选 | 48k/24 WAV transition | 1 | 终局高优先级 | terminal Scene result；未来 Activity projection | safe-returned 状态 |
| AUD-SCENE-FORCED-RETURN | Lifecycle；正式强制返程完成或发生 | canonical result 为 forced-returned；若 dead 则使用 defeat 而非成功到达语义 | formal execution result | after successful execution | 风险 Preview、safe return、行动后即死亡且未返程 | NOW | 600～1200 ms | stereo | 48k/24 WAV transition/impact | 1 | 高优先级；不与 safe return 同播 | terminal Scene result | forced-return damage/status |

## 6. Hub / Run Lifecycle Cue Audit

| Cue ID | Surface / Player purpose | Trigger semantics | Source truth | Timing | Must not fire on | Priority | Duration target | Mono / stereo | Source master recommendation | Variants | Concurrency | Future routing | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-HUB-LOADOUT-CONFIRM | Hub；整备转移已完成 | canonical Hub loadout before/after 确认容器/槽位改变 | formal execution result | after successful execution | Preview、草稿、超重、stale/reject | NEXT | 120～260 ms | mono | 48k/24 WAV | 2 | 快速整理时节流 | Hub result presentation | 携带区刷新 |
| AUD-HUB-MAINTENANCE | Hub；维护完成 | canonical maintenance result 显示资源修复和工时/材料变化 | formal execution result | after successful execution | Preview、无工时/材料、拒绝 | NEXT | 350～750 ms | mono | 48k/24 WAV tools | 2 | 同一 command 1 个 | Hub maintenance result | 资源前后值 |
| AUD-HUB-MEDICAL | Hub；中枢医疗完成 | canonical medical result 显示消费和状态变化 | formal execution result | after successful execution | Preview、无资格、非法目标、0 变化拒绝 | NEXT | 300～650 ms | mono | 48k/24 WAV | 2 | 与物品转移声择主次 | Hub medical result | 玩家状态变化 |
| AUD-HUB-END-DAY | Hub；不可逆日结算确认已执行 | canonical lifecycle execution 离开本日 Hub | formal execution result | after successful execution | End Day Preview、cancel、Day7 rejection | NEXT | 500～900 ms | stereo 可选 | 48k/24 WAV transition | 1 | 与 daily settlement 串联或择一 | lifecycle result | 日结算 Result UI |
| AUD-HUB-DAILY-SETTLEMENT | Hub/Lifecycle；日结算结果已生成 | canonical next-day Hub 或 Run Failure 已生成 | formal execution result | after successful execution | Preview、未知错误、尚未结算 | NEXT | 500～1000 ms | stereo 可选 | 48k/24 WAV | 生还/失败最多 2 | 与 end-day cue 不堆叠抢占 | settlement result；未来 Activity projection | 结果对话框 |
| AUD-RUN-NEW-CONFIRM | New Run；新局已在当前会话原子创建 | Headless New Run transaction 已建立唯一 committed `StableRunStore` 与 Day 1 canonical phase | committed New Run transaction result | after committed New Run creation；不以首次 save 成功为前提 | New Run Preview、identity/validation failure、constructor failure、committed Store/phase 尚未建立 | NEXT | 500～900 ms | stereo 可选 | 48k/24 WAV | 1 | 高优先级；首次 save 失败时可与 persistence error 顺序并存 | bootstrap transaction result | 进入 CurrentDayHub，并以保存失败文案补充持久化状态 |
| AUD-SYSTEM-LOAD-ERROR | Bootstrap；严格恢复或读取失败 | production bootstrap 的 storage read、load 或 strict restore 明确失败 | strict restore/load/read result | after load/read/restore failure | persistence write failure、无存档、新局页面、成功 resume | NOW | 250～500 ms | mono | 48k/24 WAV | v0.1 可与 persistence error 共用同一个 source WAV，但 cue mapping 独立 | 同一 failure 只触发本 cue，不与 persistence error 同播 | application bootstrap feedback | 玩家安全错误卡与清除入口 |

### 6.1 System error 与 New Run 的唯一所有权

- `AUD-SYSTEM-PERSISTENCE-ERROR` 只拥有 canonical / committed phase 已建立后的 write/save failure。
- `AUD-SYSTEM-LOAD-ERROR` 只拥有 production bootstrap 的 storage read、load 或 strict restore failure。同一 failure 不会同时触发两个 system cue。
- 两个 cue ID 在 v0.1 可以引用同一个通用 System Error WAV；共享 source file 不合并 trigger semantics。
- `AUD-RUN-NEW-CONFIRM` 在 committed Day 1 Store/phase 建立后成立，不等待首次保存成功。若首次保存失败，允许依次表达 `AUD-RUN-NEW-CONFIRM` 与 `AUD-SYSTEM-PERSISTENCE-ERROR`：含义是“Run 已在当前会话建立，但未成功持久化”，不是假成功，也不表示 rollback。

## 7. 不可泄漏的声音语义

- 搜索：只在搜索完成、玩家可见结果已提交后播放搜索完成；不得按将要抽出的物品选声音。
- 污染和伤势风险：Preview 不用“成功/失败”声暗示 roll；提交后只能反馈已成为玩家状态的暴露/伤势，不播放 `roll` 或 exact probability 编码。
- 敌人：呻吟差异最多按完好、受伤、重伤、濒危、失去能力五个公开阶段；不以音高、层数或 variant 映射精确 HP。
- 地图：不为未知节点、隐藏工作人员通道或秘密路线播放接近提示。
- 意图：只反馈当前公开意图或已经执行的敌人动作，不用声音预告未来意图序列。

## 8. Owner Preparation Pack — Audio v0.1

首批建议覆盖 14 个 cue mappings、21 个音频文件（含 variants）。表中 System Error 一行使用 1 个 source WAV 服务两个互斥 cue mapping，因此 source file 只计一次。该最小包足够验证操作确认、搜索、门材质、战斗打击、受伤和撤离压力，不等于完整音频清单。

| Priority | Cue | Count/variants | Source spec | Approx duration | Trigger |
| --- | --- | ---: | --- | --- | --- |
| NEXT | AUD-UI-SELECT | 2 | 48kHz/24-bit WAV mono | 60～120 ms | 本地草稿选择实际改变；不代表 command 成功 |
| NOW | AUD-SYSTEM-PERSISTENCE-ERROR + AUD-SYSTEM-LOAD-ERROR | 1 个共享 source；2 个互斥 mapping | 48kHz/24-bit WAV mono | 250～500 ms | 前者只用于 committed 后 write/save failure；后者只用于 bootstrap read/load/restore failure |
| NOW | AUD-SCENE-MOVE | 2 | 48kHz/24-bit WAV mono | 250～600 ms | canonical current node 改变 |
| NOW | AUD-SCENE-SEARCH-COMPLETE | 2 | 48kHz/24-bit WAV mono | 300～650 ms | 搜索完成且结果正式可见 |
| NOW | AUD-SCENE-ITEM-PICKUP | 2 | 48kHz/24-bit WAV mono | 140～300 ms | 真实物品正式进入背包 |
| NOW | AUD-SCENE-DOOR-CARD | 1 | 48kHz/24-bit WAV mono | 250～500 ms | 门禁卡方案正式开门 |
| NOW | AUD-SCENE-DOOR-FORCE | 2 | 48kHz/24-bit WAV mono | 400～800 ms | 强行撞门正式执行 |
| NOW | AUD-COMBAT-PLAYER-BASIC | 2 | 48kHz/24-bit WAV mono | 180～350 ms | 基础攻击正式执行 |
| NOW | AUD-COMBAT-ENEMY-HIT | 2 | 48kHz/24-bit WAV mono | 140～300 ms | 敌人实际受伤 |
| NOW | AUD-COMBAT-PLAYER-HURT | 2 | 48kHz/24-bit WAV mono | 180～400 ms | 玩家实际失去生命/新增公开伤势 |
| NOW | AUD-SCENE-SAFE-RETURN | 1 | 48kHz/24-bit WAV stereo optional | 500～1000 ms | 正式 safe-returned |
| NOW | AUD-SCENE-FORCED-RETURN | 1 | 48kHz/24-bit WAV stereo | 600～1200 ms | 正式 forced-returned |
| NOW | AUD-COMBAT-VICTORY | 1 | 48kHz/24-bit WAV stereo optional | 500～900 ms | 敌人正式失去能力/战斗胜利 |

## 9. Do Not Prepare Yet

- 音乐系统、最终音乐主题、动态音乐 stem。
- 语音、旁白、角色台词和完整敌人 vocal set。
- 长环境循环声、全医院 ambience、Day 2–7 或其他世界 ambience。
- 完整五阶段敌人呻吟包、逐 HP 音频层级。
- 复杂 battle animation 同步 Foley 或逐帧 timing 套件。
- Profile、Achievement、Reward、Success/Ending cue。
- 所有物品的独立拾取声、完整材质矩阵。
- 最终 LUFS、compressor、ducking、spatialization 和并发参数；这些仍是可调 Presentation detail。

## 10. Activity Feed 与 Future Integration Notes

UIR-013 的 Presentation Activity Feed 尚未实现，因此目前不能把它假装成正式音频事件源。未来理想路径是从 canonical execution result 投影 presentation activity/event，再由 Audio presentation adapter 消费；在那之前也可以由现有 Store execution result 的只读 presentation 层触发，但不得保存 raw Effect、重放 resolver 或创造第二份 gameplay state。

Future Integration Note：

- 建立 Presentation-only cue mapping，输入限定为 UI-local event 或 canonical result/before-after；映射表不进入 core/save。
- 同一次 command 的多项结果需要 cue arbitration，避免攻击、命中、受伤、破损、终局全部同时堆叠；本审计仅记录并发原则，不冻结 mixer 参数。
- stale Preview、rule rejection 和 storage failure 必须各有明确路径；storage failure cue 与已发生 gameplay cue 可以并存。
- 浏览器 autoplay policy、用户音量/静音、资源预载、codec fallback 和 reduced-motion/感官可访问性需要后续独立实现任务。

## 11. Audit Summary

共审计 37 个 Cue：NOW 19、NEXT 16、DEFER 2。第一批 Owner Pack 覆盖 14 个 cue mappings / 21 个 source files；其中两个互斥 System Error cue mapping 共用 1 个 source WAV。

| Priority | Cue group | Count/variants | Source spec | Approx duration | Trigger |
| --- | --- | ---: | --- | --- | --- |
| NOW | execution-critical combat / scene / return / system | 19 cue definitions | 48kHz/24-bit lossless WAV；短 Foley 多为 mono | 140～1200 ms | canonical execution success 或明确 system error |
| NEXT | UI selection、次级战斗、Hub 与日结算 | 16 cue definitions | 同上；少数 transition 可 stereo | 60～1000 ms | UI-local selection 或 canonical result |
| DEFER | 高频 focus 与 dialog close | 2 cue definitions | 48kHz/24-bit WAV mono | 40～130 ms | 仅 presentation；需先验证噪声负担 |

无音频时所有流程继续依赖现有文字、状态、动画和错误反馈正常工作；缺失 cue 永远不能阻断 gameplay、Save 或严格恢复。
