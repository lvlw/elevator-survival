# 依据、实查与参考边界

## 本轮Owner输入

`owner-inputs/01-task-objectives.png`与`02-sidebar-map.png`是原上传字节。反馈焦点：不知道任务去哪里做什么；小地图被各建筑节点、箭头、说明和滚动挤占。它们不是整屏截图，不据此反推分辨率，也没有独立验证其运行SHA。

主线本轮读取远端`feature/world-narrative-entry-001`，仍为`95cab5ad79e31d63aae93d97ab901c716cf75f89`。设计任务以该准确提交为起点，不把本地服务/服务器版等同于该提交。

## 准确仓库来源（全部ref=95cab5ad79e31d63aae93d97ab901c716cf75f89）

- `docs/09-ui-design-record.md`：当前有效约定，主舞台、一屏、只读已知地图、Travel Cluster与确认分级。
- `docs/05-design-decisions.md`：DEC-052 D02等，24节点/29双向连接、五图可自由顺序、实际任务件与H0返航；不增玩法。
- `src/state/residence-session/player-types.ts`：既有公开任务/地图DTO。
- `src/state/residence-session/player-queries.ts`：任务状态和sample的真实来源；observed不等于调查事实。
- `src/core/residence-location/player-knowledge.ts`：已知节点与边，当前/上次观察，合法移动查询。
- `src/core/residence-task/player-query.ts`：当前可见机会，条件未满足时不假造可执行。
- `src/content/infected-world-v0.1/content.ts`：实际连接与动作声明。主线读其内容核对模型，不授权React读取全表补未知。
- `src/content/infected-world-v0.1/player-query.ts`：workorder目前未明确命名而退化为“现场互动”。
- `src/ui/infected-world/components/knowledge-map.tsx`：当前全部已知节点混画、固定列数与滚动画布；本轮替换此呈现。
- `src/ui/infected-world/components/game-shell.tsx`：当前摘要复用于详情；本轮拆成共用模型、不同信息层级。
- `src/state/residence-session/player-preplay-types.ts`：公开预览与必要输入仍读原接口。

访问形态：GitHub连接器原文件读取；未改远端，未运行本轮游戏代码。原R1通过的准确SHA/CI属于上轮证据，不冒充新任务基线。

## 外部参考（只借信息组织，不采用任何第三方图像资产或玩法）

### FINAL FANTASY XIV：任务跟踪与详情/地图的联动

官方UI指南明确：任务列表展示任务与目标；任务标题打开日志，目标打开地图位置。借鉴“简短跟踪—完整说明—地图定位”的分工，不照搬自动导航或完整地点揭示。
https://na.finalfantasyxiv.com/uiguide/know/know-hud/hud-name.html

### Starfield：按观察尺度拆层

Bethesda官方Starmap说明分Planet/System/Galaxy视图。只借鉴“不同尺度看不同对象”，本项目只有建筑内部/世界两层，不增星图、连续缩放、快速旅行或地理比例。
https://help.bethesda.net/app/answers/detail/a_id/61656/~/starmap---starfield

### Resident Evil 2：房间/通道的可辨识表达

本轮通过图像检索实际查看其地图截图：命名房间、清楚通道、区域/楼层切换和当前标记比密集数据箭头易于建立空间印象。只借房间化表达；本项目没有完整建筑平面实测，不臆造墙壁比例。尤其不照搬能泄漏未发现物的“搜索完成”着色规则。
截图参考来源（未打包、未作素材许可）：
https://www.gamesradar.com/resident-evil-2-remake-film-roll-trophy/
Capcom官方Web手册此次直接访问403，不能写成已逐页阅读；不拿第三方攻略替代本项目正式地图。

## 本轮设计选择

主推荐：任务正文和知情线索＋当前建筑房间简图＋建筑级世界图＋只读定位。外部作品不是本项目规则来源；本轮用户授权与现有正式规则决定实际行为。
