# AUD-ba865ea-UI-V1-INTEGRATION-001 v1.0

日期：2026-11-02。审查方式：GitHub准确SHA直读；不依赖作者源码ZIP。

## 结论与下一步

**NEEDS R1：新版UI确实接入原DEV游戏，但终局与操作内容层有一处必须补齐的生命周期衔接；同时完成原地图补充已要求的歧义端点保守处理。** 不回滚M1—M3、不重新设计、不继续铺多分辨率。Owner暂不试玩。

代码审查不是完整视觉验收。本轮没有取得新提交截图的可视像素；报告里的截图路径、文字与几何数据不代替主线看图。R1回包时随附现有四张主桌面原图即可，不重拍五档、不交源码ZIP。

## 准确基线与核对范围

- BASE：`c5abeda4861710325a123e8321a314423525f8df`。
- FINAL：`ba865ea05cedac84d661969992683349cca7a519`。
- 唯一parent：`ac98a2bac0fe2b728783c5b1d8a20e4777f6b412`。
- tree：`7d34277c26ce2d3990fcd9568a6d48693378041a`。
- 远端工作分支：`feature/world-ui-v1-integration-001`，本轮回读与FINAL相同。
- GitHub compare：ahead 3，behind 0。改动位于原任务UI目录、获准35张新增运行PNG及本任务文档目录；未见core/state/app协议、持久化、根入口、依赖、CI、旧设计和C2敌图路径改动。
- 主线没有读取Owner本机；“工作区干净/旧本地refs保持”属作者陈述，不据远端推断本地事实。
- 主线没有重新重建整仓Git树，也没有要求重复源码交付。

## 最新验收范围

按Owner后发的视口补充，只以一个主桌面视口核验完整UI和必要长内容可用性。现有报告已有1920×1080/DPR1核心证据，R1沿用该档，不再重新调查或切换矩阵。1280等已做证据可保留作补充；390、真实zoom、DPR2及跨设备精修不是R1新增任务，也不能冒称已全面验收。

本轮远端输入目录可见原任务与地图追加，未见完整的视口收窄文件；不能据此推断Codex故意忽略追加。R1随包附原视口收窄文件，今后以此为优先。不要为历史归档缺项专门重跑测试或拆除已完成响应式代码。

## 已确认的实际进展

1. 原`app.tsx`导入新CSS并连接同一GameShell；未用iframe或原型SCREENS替代运行状态。原choose/execute/confirm、single-flight、BrowserOwner与B1/C1接缝未在本批另建第二套。
2. GameShell确实变为左目标/只读图、中央场景、右携带和紧凑底栏，信息层与物品详情已落在运行组件中，不是只加敌图。
3. 药房使用专门公开地点映射；未搜索时不显示空结果框，搜索、实际地面物、取空和重新查看仍读正式view。已读原生链测试包含重开零source/draw/dispatch/write。
4. `ItemInspectionProvider`依opaque selector引用查找当前实物；旧选择失效时即时不渲染详情，并不按名称替换其他实例。
5. 地图图形/文字数据均来自公开map，保留有向边、反向不对称、环、当前/上次观察、未知通行，点击只更新展示选择；但重复全名歧义处理尚有R1-02缺口。
6. 24公开场景、19物品封闭映射与获准资源已接入；这是源码接线判断，不冒充主线逐图解码或美术终验。

## R1-01：药食/维护内容层在终局后残留（P2，修复后才能收口）

位置：`src/ui/infected-world/components/game-shell.tsx`第21、24、33、39行。

`utilitiesOpen`是本地状态；入口按钮检查`utility.length > 0`，但内容层只检查`utilitiesOpen`。当同一GameShell从活动态重绘为dead/living-hub或没有该类动作的上下文，操作列表变空，却仍然生成标题为“药食与维护”的ContentLayer。

主线用**准确Git blob的实际GameShell源码**在保持hook状态的隔离宿主中执行：初始无层→点击药食与维护→1层/1操作→传入dead正式形态的view、actions为空→WorldStage已收到dead，但仍有1个操作层/0操作。手动关闭可以移除，故不是永久死锁，也没有证明伤害/结算错误。

`ContentLayer`本身为全屏fixed的模态覆盖层。结合其实现，可判断旧操作面板会覆盖终局展示；本轮未进行真实浏览器像素复现。正式维护导致死亡并非新增规则假设：现存`src/state/residence-session/combat-terminal.test.ts`有`stable immediate maintenance death ...`用例和一次提交/保存断言，本轮已读取。

修复要求：在渲染当下结合现有point/phase及当前正式动作集合，停止展示失效操作层；合理清理本地打开状态和焦点，但不新判死亡、不改规则、不触发执行/保存。不要每次view更新一律关闭仍有效的参数流程。保留正常可操作上下文下的菜单行为。

必须补实际React/原BrowserOwner链回归：从该入口进入合法维护，按正式参数和必要保护确认，产生实际死亡后终局可见、旧操作层消失、恰好一次命令/写入；再覆盖保存失败与仅保存重试，以及普通存活维护不误关/误取消其他必要流程。纯render边界可补living-hub/无动作条件，但不能称这些都是从该按钮可达的真实路线。

## R1-02：地图全名重复时静默连接到最后一个节点（P3，随本批补齐已有合同）

位置：`src/ui/infected-world/components/knowledge-map.tsx`第18—19、38—40行。

`new Map(positions.map(...))`对重复`place + ' / ' + name`静默覆盖，图线取最后一个，选择详情的`find`却取第一个。地图补充明确约定：端点缺失或同名歧义只保留公开路线文字，不猜测节点。

主线用准确源码及**合成公开投影边界**执行：两个同一公开全名节点＋一个终点＋一条源端歧义路线，输出1条几何边；期望是不画这条无法唯一定位的边、保留文字。普通唯一端点正控仍正常输出1条边。

**没有证据表明当前五图内容已经存在这个重复全名，不能宣称当前玩家已经走到了错图。** 这是已有约定的防误连缺口，修复只需唯一性判定/保守呈现，不增加私有ID、安全查询字段或布局引擎。

测试同时覆盖同区域同名歧义、不同区域同短名但完整名不同的合法情况、缺端点、唯一正控及只读零提交。选择详情也不能静默取第一项。

## 验证分账

| 来源 | 本轮掌握的证据 |
|---|---|
| 作者基线 | 报告/结构化账：343文件、4929测试通过 |
| 作者新增 | 报告：5新测试文件、增加95项；主线读过shell/items/map新增测试与相关运行源码 |
| 作者组合 | 报告/结构化账：147文件、1328测试通过 |
| 作者最终check | 报告/结构化账：348文件、5024测试通过，架构/类型/build成功 |
| 独立CI核对 | 精确SHA的CI #184（run 41322920513）、check job 124896759463及各步骤SUCCESS；本轮未重新下载全量job原日志 |
| 主线独立执行 | 两个准确模块的隔离复现＋四个正控；证据见`independent-reproduction.json`，不是新增玩法测试、真实React DOM或浏览器运行 |

主线未本地跑5024全量，没有把作者、CI与隔离复现累加。三项作者负控的结构化回执已读，本轮未独立执行mutation。已知7项依赖告警承接历史，未在本轮取得新的完整公告或修复结论。

## 视觉与交付限制

本轮容器直取raw GitHub图像失败（域名解析失败）；web通道同图返回cache miss，下载工具亦未取得文件。Browser在当前会话仅暴露读标签页，不具备本轮重新捕获游戏画面的接口。因此**没有读取新截图真实像素，不签整体视觉PASS**。

不因此要求重跑全浏览器。R1报告随附已有四张原JPG：
- `30-final-pharmacy-revealed-1920.jpg`
- `31-final-pharmacy-empty-reopened-1920.jpg`
- `22-actual-2x2-detail-1920.jpg`
- `17-natural-battle-1920.jpg`

来源都在本任务`evidence/`。明确它们是ba865ea阶段的原图，不冒称R1重新拍摄。可直接上传，或只把这四张放入VISUAL-ONLY.zip；不含源码和素材库。R1不改普通布局时不重拍；新增行为用实际React回归先验证。若现有授权浏览器可用，可补一张同主视口的终局清层结果，不扩视口矩阵或操作Owner日常profile。

## 下一步授权停点

直接转交随附`ENG-WORLD-UI-V1-INTEGRATION-001-R1`，在原分支以ba865ea为准确起点追加普通提交。只改两处运行组件及相应测试，其他成果保留。完成后交准确SHA与必要原图，主线复审；Owner试玩仍暂停。不要让Owner代跑重现，不合并main，不扩新玩法/新美术/B2。

## 可核查源文件

- [作者REPORT](https://github.com/lvlw/elevator-survival/blob/ba865ea05cedac84d661969992683349cca7a519/docs/engineering/world-integration/ui-v1-integration-001/REPORT.md)
- [GameShell](https://github.com/lvlw/elevator-survival/blob/ba865ea05cedac84d661969992683349cca7a519/src/ui/infected-world/components/game-shell.tsx#L21-L39)
- [ContentLayer](https://github.com/lvlw/elevator-survival/blob/ba865ea05cedac84d661969992683349cca7a519/src/ui/infected-world/components/content-layer.tsx)
- [KnowledgeMap](https://github.com/lvlw/elevator-survival/blob/ba865ea05cedac84d661969992683349cca7a519/src/ui/infected-world/components/knowledge-map.tsx#L12-L40)
- [实际维护死亡既有用例](https://github.com/lvlw/elevator-survival/blob/ba865ea05cedac84d661969992683349cca7a519/src/state/residence-session/combat-terminal.test.ts)
- [app真实执行接缝](https://github.com/lvlw/elevator-survival/blob/ba865ea05cedac84d661969992683349cca7a519/src/ui/infected-world/app.tsx)
- [药房回归](https://github.com/lvlw/elevator-survival/blob/ba865ea05cedac84d661969992683349cca7a519/src/ui/infected-world/ui-v1-shell.test.tsx)
- [地图回归](https://github.com/lvlw/elevator-survival/blob/ba865ea05cedac84d661969992683349cca7a519/src/ui/infected-world/ui-v1-map.test.tsx)
- [结构化验证账](https://github.com/lvlw/elevator-survival/blob/ba865ea05cedac84d661969992683349cca7a519/docs/engineering/world-integration/ui-v1-integration-001/evidence/validation-summary.json)
- [CI #184](https://github.com/lvlw/elevator-survival/actions/runs/41322920513)
