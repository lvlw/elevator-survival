# Visual Asset Slot Audit v0.1

> 本文件是 Presentation production audit，不是 gameplay rule source，不覆盖 DEC、Vertical Slice、Architecture 或 UIR。

## 1. 审计目的与边界

本审计基于 `85dc3820062fbd1313eba9c1b92a399835c85bda` 的实际 React Game Shell、Player-Known Map、Battle Stage、携带区和 Preview Dialog。它回答“第一批素材应交付什么、以什么生产规格交付”，不创建资产注册表，不改变 UI，不冻结最终绘画风格，也不把审计 ID 当作游戏、内容或存档身份。

现在适合做第一批素材尺寸审计，是因为 New Run、Hub、Scene、Combat、Failure、地图、携带区和确认对话框已经形成可复测的响应式容器；此前布局仍频繁变化，过早给出尺寸会把临时结构误当成长期合同。这里的 **Display** 是当前浏览器中的 CSS 像素；**Recommended source master** 是考虑最大实测显示、高 DPI 和裁切余量后的生产建议。后者通常大于前者，也不是永久的 canonical asset size。

当前 CSS 颜色、渐变、面板边框、按钮纹理和装饰线仍是可替换 Skin。审计只把容器用途、比例、主体安全区和玩家知识边界作为集成依据。

## 2. 浏览器实测

通过 Production New Run composition 与 DEV Preview canonical fixtures 实测。高度会随内容和滚动增长，以下尺寸均为测量时的 `width × height` CSS px；滚动条使可用内容宽度略小于 viewport。

| Viewport | Hub major stage | Scene major stage | Map canvas | Battle Stage | Enemy candidate box | Player candidate box | Carry panel | Carry/item candidate boxes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1280 | 793 × 741 | 793 × 1395 | 722 × 464 | 751 × 653 | 331 × 269 | 331 × 269 | 408 × 653 | 装备 117 × 111；快捷 179 × 99；背包格 56 × 35 |
| 1440 | 899 × 746 | 899 × 1404 | 828 × 464 | 857 × 657 | 384 × 269 | 384 × 269 | 462 × 653 | 装备 135 × 111；快捷 206 × 99；背包格 65 × 35 |
| 1600 | 972 × 751 | 972 × 1410 | 901 × 464 | 930 × 657 | 420 × 269 | 420 × 269 | 500 × 653 | 装备 147 × 111；快捷 225 × 99；背包格 71 × 35 |
| 768 | 722 × 731 | 722 × 1375 | 651 × 464 | 680 × 879 | 648 × 269 | 648 × 202 | 722 × 653 | 装备 221 × 111；快捷 336 × 99；背包格 108 × 35 |

补充实测：New Run card 在桌面为 672 × 1005、在 768 为 672 × 952；New Run Preview 为 544 × 511；Scene 行动 Preview 为 544 × 440；Failure stage 在桌面为 720 × 308、在 768 为 720 × 304。地图节点卡当前约 160 × 106～108，图例节点为 12 × 12；状态 chip 高约 26，Info Card trigger 为 16～22。

观察：768 下主栏和携带栏纵向堆叠，Battle actors 也纵向堆叠。背景与角色素材不得假定桌面双栏永远存在；重要主体应留在中央安全区。当前物品 UI 没有独立图标节点，表中的图标显示预算是基于实测宿主格推导的未来集成建议，不是现有 DOM 尺寸。

## 3. Asset Slot 总览

Asset Slot ID 仅供 Presentation production 追踪，不是 gameplay identity、Save identity 或 content definition ID。

### 3.1 容器与优先级

| Slot ID | Surface | Purpose | Current component | Current CSS hook | Priority | Display @1280 | Display @1440 | Display @1600 | 768 behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VIS-HUB-BG-01 | Hub | 让中枢整备有清晰场所感，同时不干扰清单 | `HubView` | `.game-stage.hub-stage` | NOW | 793 × 741 宿主 | 899 × 746 | 972 × 751 | 722 × 731，单栏；主体居中 |
| VIS-SCENE-BG-01 | Scene | 医院探索的统一低对比氛围底板 | `SceneView` | `.game-stage.scene-stage` | NEXT | 793 × 1395 宿主 | 899 × 1404 | 972 × 1410 | 722 × 1375，纵向内容长；背景需可延展 |
| VIS-SCENE-NODE-01 | Scene | 当前已知节点的小型气氛图 | `SceneView`（尚无图节点） | `.stage-heading` 邻近候选位 | NEXT | 建议显示不超过 320 × 180 | 不超过 360 × 203 | 不超过 400 × 225 | 约 100% × 180；置于地图信息之外 |
| VIS-COMBAT-BG-01 | Combat | 战斗舞台材质和空间感 | `BattleStage` | `.battle-stage` | NOW | 751 × 653 宿主 | 857 × 657 | 930 × 657 | 680 × 879，actors 堆叠 |
| VIS-COMBAT-ENEMY-01 | Combat | 感染护工公开生命阶段视觉 | `BattleStage` | `.battle-actor--enemy` | NOW | 331 × 269 宿主 | 384 × 269 | 420 × 269 | 648 × 269；同锚点替换 |
| VIS-COMBAT-PLAYER-01 | Combat | 玩家轮廓或 portrait | `BattleStage` | `.battle-actor--player` | DEFER | 331 × 269 宿主 | 384 × 269 | 420 × 269 | 648 × 202；角色方向未确认 |
| VIS-COMBAT-INTENT-01 | Combat | 强化当前公开意图，不透露未来队列 | `BattleStage` | `.battle-actor--enemy` 意图区候选 | NEXT | 建议 24～32 方形 | 24～32 | 24～32 | 24～32，随文字而非角色图缩放 |
| VIS-COMBAT-FX-01 | Combat | 已发生命中、伤害、破损的短暂反馈 | `BattleStage` | `.battle-stage__latest-result` 邻近候选 | NEXT | 覆盖 actor 内约 240 × 160 | 280 × 160 | 320 × 160 | 覆盖单 actor，不越过整个屏幕 |
| VIS-ITEM-ICON-01 | Carry/Dialog | 一套跨装备、快捷、背包、仓库和 Info Card 复用的物品图标 | `ItemCard` / `CarryPanel` / `BackpackGrid` | `.carry-slot`, `.grid-cell`, `.item-card-copy` | NOW | 宿主：117 × 111、179 × 99、56 × 35 | 135 × 111、206 × 99、65 × 35 | 147 × 111、225 × 99、71 × 35 | 宿主变宽；图标建议仍 32～48 方形 |
| VIS-STATUS-ICON-01 | HUD/Combat | 生命、饱食和异常状态的辅助识别 | `GameStatusBar` / `BattleStage` | `.status-chip`, `.hud-resource__label` | NEXT | 16～24 方形预算 | 16～24 | 16～24 | 保持文字标签，不变成仅图标 |
| VIS-MAP-NODE-01 | Map | 可选节点类别小图标 | `PlayerKnownMap` | `.known-map__node` | DEFER | 160 × 106～108 节点宿主 | 同 | 同 | 约 104 × 可变；CSS/SVG 已足够 |
| VIS-MAP-CURRENT-01 | Map | 当前位置 marker | `PlayerKnownMap` | `.known-map__node--current` | NEXT | 建议 18～24 方形 | 18～24 | 18～24 | 16～20；只覆盖已知当前位置 |
| VIS-MAP-RETURN-01 | Map | 已知安全返程端点 marker | `PlayerKnownMap` | `.known-map-return` / 已知节点 | NEXT | 建议 18～24 方形 | 18～24 | 18～24 | 16～20；不可暗示未知路径 |
| VIS-EVENT-FIRE-DOOR-01 | Scene/Dialog | 防火门事件的材质与方法识别 | `SceneView` / obstacle Preview | `.obstacle-block`, `.preview-dialog` | NOW | 建议最大 224 × 140 | 240 × 150 | 256 × 160 | 约 200 × 125，置于 544 宽对话框内 |
| VIS-OBJECTIVE-CASE-01 | Scene/Dialog | 样本箱目标物的明确识别 | Task Event / Return Result | `.task-event-method`, `.preview-dialog` | NOW | 建议最大 160 × 160 | 176 × 176 | 192 × 192 | 144 × 144；与 2×2 背包 footprint 不混淆 |
| VIS-FAILURE-MARK-01 | Failure | 终局标记或克制的背景印记 | `FailureView` | `.failure-stage` | DEFER | 720 × 308 宿主 | 720 × 308 | 720 × 308 | 720 × 304；文字必须优先 |
| VIS-NEW-RUN-ILLUSTRATION-01 | New Run | 新局选择的轻量氛围图 | `NewRunSetup` | `.status-card` | DEFER | 672 × 1005 宿主 | 同 | 同 | 672 × 952；不能挤压选择说明 |
| VIS-UI-SKIN-01 | Global | 最终面板、按钮和装饰 Skin | App shell | 多 selector | DEFER | 当前 CSS fallback | 当前 CSS fallback | 当前 CSS fallback | 当前 CSS fallback；UIR-008 明确可替换 |

### 3.2 生产规格与知识约束

| Slot ID | Aspect ratio | Recommended source master | Scaling | Crop policy | Safe zone | Transparency | Format recommendation | Variants | Player-knowledge constraint | Fallback | Future integration note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VIS-HUB-BG-01 | 16:9 宽幅 | 2560 × 1440 | cover | 允许四边各裁 10～18% | 中央 60% 保持低细节；右侧携带栏区域避免强对比 | opaque | WebP；保留无损源 | 1 | 不画未获得任务物或未来设施 | 现有渐变和 radial 背景 | 后续在 Hub stage 加 presentation-only background layer |
| VIS-SCENE-BG-01 | 16:9 可平铺/延展 | 2560 × 1440 | cover + 纵向柔性底色 | 桌面横裁，长页面下方可由纯色延展 | 中央 55% 低细节，地图区不可被纹理干扰 | opaque | WebP | 医院统一底板 1；节点差异留给独立槽 | 不出现未知门、工作人员通道、战利品或敌人 | 现有 Scene 渐变 | 仅作氛围，不能替代 Player-Known Map |
| VIS-SCENE-NODE-01 | 16:9 | 1280 × 720 | cover | 可裁左右 12%，不可裁掉已知节点主体 | 中央 70% | opaque | WebP | 只为已确认且高频节点逐步增加 | 插画只能表达玩家已到达/已知的当前节点 | 文字标题 | 需要先定义安全的 node-art mapping；本轮不建 registry |
| VIS-COMBAT-BG-01 | 16:9 | 1920 × 1080 | cover | 允许上下裁切，左右角色区保持安静 | 左右各 30% 可读；中心 VS 留空 | opaque | WebP | 医院隔离走廊 1 | 不出现未知敌人、隐藏出口或战利品 | 现有 Battle Stage 渐变 | 背景层位于 actor 信息和时间轴之后 |
| VIS-COMBAT-ENEMY-01 | 4:5 竖向主体 | 1024 × 1280 | contain | 不裁主体；容器宽时允许留白 | 主体在中央 70%，脚底/躯干锚点固定 | alpha | PNG 或 lossless WebP | 完好、受伤、重伤、濒危、失去能力 | 只按公开生命阶段切换；严禁逐 HP 变体 | 敌人文字卡 | 五张必须相同 framing、anchor、比例和主体基准位置 |
| VIS-COMBAT-PLAYER-01 | 4:5 | 1024 × 1280 | contain | 不裁主体 | 中央 70%，与敌人基线对齐 | alpha | PNG/WebP | 未定 | 正式主角外观未冻结 | 玩家文字卡 | **DEFER — character art direction unresolved** |
| VIS-COMBAT-INTENT-01 | 1:1 | SVG viewBox 或 128 × 128 | contain | 不裁 | 图形内缩 15% | alpha | SVG 优先 | 抓挠、扑咬；未来仅按公开意图扩展 | 只能显示当前公开意图，不显示未来行动序列 | 当前文字意图 | 图标与文字并存，颜色不能作为唯一语义 |
| VIS-COMBAT-FX-01 | 1:1 或 3:2 | 512 × 512 / 768 × 512 | contain/overlay | 可裁粒子边缘，不裁动作中心 | 中央 60% | alpha | PNG/WebP sequence；后续再评估 sprite | 命中、受伤、破损三类起步 | 仅在结果已 canonical committed 后显示 | 现有结果文字与 CSS animation | 未来消费 presentation result，不拥有伤害事实 |
| VIS-ITEM-ICON-01 | 1:1 | 512 × 512 | contain | 不裁物品轮廓 | 四边至少 12.5% 透明边距；统一光照和基线 | alpha | PNG/WebP；简单图形可 SVG | 每 definition 一张，不按容器复制 | 不画隐藏属性、未公开掉落或任务完成状态 | 物品名称、数量和资源文字 | 同一 source 用于装备、快捷、背包、仓库、列表、Info Card |
| VIS-STATUS-ICON-01 | 1:1 | SVG viewBox 或 128 × 128 | contain | 不裁 | 内缩 15% | alpha | SVG | 生命、饱食、世界威胁、流血、开放伤口、挫伤、镇痛、感染暴露、负重 | 不编码精确感染进展或隐藏数值 | chip 与文字 | 图标永不替代文本和 ARIA 名称 |
| VIS-MAP-NODE-01 | 1:1 | SVG viewBox | contain | 不裁 | 内缩 15% | alpha | SVG | 最多按公开节点类别 | 不提供 unknown、问号、秘密路线占位 | 现有 CSS 节点框 | 优先维持 SVG/CSS；有明确类别体系后再生产 |
| VIS-MAP-CURRENT-01 | 1:1 | SVG viewBox | contain | 不裁 | 内缩 12% | alpha | SVG | 1 | 只标 canonical 当前节点 | 金色 CSS 边框 | 作为已知节点装饰，不能生成新节点 |
| VIS-MAP-RETURN-01 | 1:1 | SVG viewBox | contain | 不裁 | 内缩 12% | alpha | SVG | 1 | 只标玩家已知且正式返程链可表达的端点 | 返程文字面板 | 不绘制未知路线，不推断隐藏工作人员通道 |
| VIS-EVENT-FIRE-DOOR-01 | 8:5 | 1280 × 800 | cover | 左右可裁 10%，门体不可裁断 | 中央 70% 门体；底部留文字安全区 | opaque | WebP | 关闭/已开启至多 2；方法差异不另做大图 | 未解决时不得画出门后房间或隐藏通道 | 障碍名称和选项文字 | 结果状态从 canonical obstacle result 选择，不由图片推断 |
| VIS-OBJECTIVE-CASE-01 | 1:1 | 1024 × 1024 | contain | 不裁 | 四边 15%；封条与轮廓清晰 | alpha | PNG/WebP | 1；损坏变体未确认，不制作 | “取得”不等于“安全入库/任务完成”，图片不能暗示后两者 | 任务物名称、尺寸、重量文字 | 插画与 512 icon 可共享设计，但交付不同 master/crop |
| VIS-FAILURE-MARK-01 | 16:9 | 1920 × 1080 | cover | 大幅允许裁切 | 中央文案区必须低对比 | opaque/alpha 均可 | WebP/PNG | 1 | 不编码未确认结局原因 | 当前红色渐变与文字 | 仅是只读 terminal 装饰，不引出新操作 |
| VIS-NEW-RUN-ILLUSTRATION-01 | 3:2 | 1440 × 960 | cover | 左右裁 10% | 中央 60% 低对比，选择控件区域空 | opaque | WebP | 1 | 不暗示未实现专长、Day 2–7 或未来世界 | 当前纯 CSS card | **DEFER — art direction and production bootstrap composition remain text-first** |
| VIS-UI-SKIN-01 | 按组件 | 尚不建议交付 | n/a | n/a | n/a | 可选 | SVG/9-slice 后议 | 未定 | 不创造规则语义 | 当前 CSS | **DEFER — UIR-008 当前 Skin 可替换** |

## 4. 敌人阶段与第一批策略

感染护工素材只能依赖玩家已经看到的阶段：完好、受伤、重伤、濒危、失去能力。所有阶段必须共享相同 framing、anchor、比例、镜头和主体基准位置，替换时不能引起布局跳动，也不能通过伤口数量、颜色层级或姿势细分泄漏精确 HP。

- Minimal First Pass：1 张感染护工“完好”透明主体，先验证 framing、遮挡和战斗可读性。
- Recommended First Pass：5 张公开阶段变体，构成一组可直接替换的静态阶段图。
- Later Polish：攻击姿态、受击瞬态和动画；只有 presentation event 路由与美术方向稳定后再做。

玩家 portrait/silhouette 当前标为 DEFER。正式角色外观、轮廓语言和换装表现尚未形成权威设计，继续使用 CSS/文字占位比提前生产一套可能被推翻的主角美术更安全。

## 5. Item Icon 与状态图标优先级

所有容器共用一套 1:1 透明图标，不为装备、快捷栏、背包、仓库、列表或 Info Card 分别生产。同一图标可按显示上下文缩放，数量、耐久、电量、完整度和任务状态继续由文字/状态 UI 表达。

| Priority | 医院物品候选 | 理由 |
| --- | --- | --- |
| NOW | 金属管、厚实外套、手电筒、绷带、隔离区门禁卡、密封病原样本箱 | 长期位于 HUD/携带区，或决定主线目标和路线识别 |
| NEXT | 撬棍、工具箱、通用电池、金属零件、电子元件 | 重要但出现时段更短，可在第一轮素材验证后补充 |
| DEFER | 其余完整物品图鉴 | 当前不应为未实现的完整七日内容批量生产 |

状态方面，生命、饱食、流血和负重适合最先验证 small semantic icon；开放伤口、轻度挫伤、镇痛、感染暴露和世界威胁可以作为 NEXT。所有图标保留文字标签，世界威胁/感染图标不得表达内部精确进展。

## 6. Map、事件与知识边界

路线、节点框和状态线继续由 SVG/CSS 负责。当前位置和返程 marker 可作为 NEXT 的小型 SVG；未知节点、问号、秘密路线 placeholder 和地图背景大图均不准备。Scene 背景、节点气氛图和防火门图不能画出尚未发现的门、工作人员通道、隐藏战利品或未来敌人。

隔离区防火门和密封病原样本箱值得成为首批事件/目标视觉：前者强化材质与互动语境，后者贯穿提取、背包和返回。但样本箱图片不能把“事件取得”表现为“安全提取”或“任务完成”。

## 7. Owner Preparation Pack — Visual v0.1

以下 15 个 source assets 是下一轮试玩的最小高价值包；推荐源尺寸不是永久合同。

| Priority | Asset | Count | Source size | Aspect | Alpha | Notes |
| --- | --- | ---: | --- | --- | --- | --- |
| NOW | 电梯中枢宽幅背景 | 1 | 2560 × 1440 | 16:9 | 否 | 中央 60% 低细节；不可画未来设施 |
| NOW | 医院隔离走廊 Battle plate | 1 | 1920 × 1080 | 16:9 | 否 | 左右 actor 区和中心 VS 留白 |
| NOW | 感染护工公开生命阶段组 | 5 | 每张 1024 × 1280 | 4:5 | 是 | 完好/受伤/重伤/濒危/失去能力；同 framing 与 anchor |
| NOW | 隔离区防火门事件插图 | 1 | 1280 × 800 | 8:5 | 否 | 中央门体，未解决态不展示门后空间 |
| NOW | 密封病原样本箱目标插图 | 1 | 1024 × 1024 | 1:1 | 是 | 不暗示已入库或任务完成 |
| NOW | 金属管 icon | 1 | 512 × 512 | 1:1 | 是 | 统一 item icon 系统 |
| NOW | 厚实外套 icon | 1 | 512 × 512 | 1:1 | 是 | 不把完整度画死 |
| NOW | 手电筒 icon | 1 | 512 × 512 | 1:1 | 是 | 不把当前电量画死 |
| NOW | 绷带 icon | 1 | 512 × 512 | 1:1 | 是 | 不暗示自动选择伤口 |
| NOW | 隔离区门禁卡 icon | 1 | 512 × 512 | 1:1 | 是 | 不暗示一次性消耗 |
| NOW | 密封病原样本箱 icon | 1 | 512 × 512 | 1:1 | 是 | 与目标插图同设计、独立 icon crop |

生产说明：感染护工阶段组计 5 个文件；整包合计 15 个 source assets。Raster master 至少覆盖最大实测 CSS 尺寸的约 2×，并保留原始分层/无损文件。背景最终 Web 交付可转 WebP，透明主体和 icon 可用 PNG 或 lossless WebP；SVG 只用于适合矢量表达的简单 marker/icon。

## 8. Do Not Prepare Yet

- 正式 Player 角色立绘：DEFER — character art direction unresolved。
- 完整五阶段敌人动画、复杂 battle animation spritesheet：静态阶段先验证。
- 全物品图鉴：完整七日内容尚未进入本轮。
- 地图背景大图、unknown node icon、问号和秘密路线 placeholder：会污染玩家知识边界。
- 最终 UI Skin、大量九宫格边框、最终按钮纹理和装饰花边：当前 Skin 可替换。
- Profile 图标、Day 2–7 场景图、其他世界：相关范围未实现。
- New Run 大型主视觉、Failure 结局插画：当前文字结构足够，先验证高频 gameplay surfaces。
- 未确认的样本箱损坏变体、任务完成徽章或奖励图：没有正式规则支持。

## 9. 总结

| Priority | Asset group | Count | Source size | Aspect | Alpha | Notes |
| --- | --- | ---: | --- | --- | --- | --- |
| NOW | Hub / Combat / enemy / item / event / objective | 15 files in Owner pack | 512～2560 px masters | 分类优化 | 混合 | 最少资产覆盖最高频试玩反馈 |
| NEXT | Scene node art、intent/FX、status icons、known-map markers | 按验证结果逐批 | 128 SVG viewBox～1280 × 720 | 1:1 或 16:9 | 多为 alpha | 先确认 art direction 与 presentation hooks |
| DEFER | Player、完整 Skin、地图底图、终局/New Run 大插画 | 未估算 | 不冻结 | 未冻结 | 未冻结 | 避免为未确认方向过早生产 |

## 10. Future Integration Notes

- 当前 React 中不存在正式 asset registry 或独立 `<img>` slot；后续应由 Presentation mapping 把安全的 ViewModel 状态映射为资源，不让资源文件决定规则。
- 敌人图由公开 health phase 选择；物品图由公开 definition presentation mapping 选择；地图 marker 只消费 Player Navigation Knowledge。
- 图片加载失败时必须继续使用本审计记录的文字/CSS fallback，不能阻断命令、预览、保存或恢复。
- 若后续布局调整导致宿主尺寸明显变化，应复测 display bounds；不要把本文件的推荐 master 当作强制 Renderer 合同。
