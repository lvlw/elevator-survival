# ENG-WORLD-MISSION-MAP-UX-001

本轮将任务说明与地图接入原DEV React：左栏是简短成果和当前线索，详情解释供电→装接、指定样本携回及原交付资格；默认地图只画当前建筑已知房间，世界层只画已知建筑及公开跨区联系。定位、切层和回当前位置全为临时只读展示，真实移动仍走原命令与成本。

## 版本、来源与环境

- BASE：`95cab5ad79e31d63aae93d97ab901c716cf75f89`，BASE tree `80545de7ac6efa8a2fcda4110a0fa071a3100419`。
- 分支：`feature/world-mission-map-ux-001`。
- worktree：`E:/projects/elevator-survival-worktrees/world-mission-map-ux-001`，从BASE新建，独立依赖由原lockfile离线npm ci产生，没有修改package/lock。
- M1 `fbd9c27466830786f1f053ee74004ddc8ca0cb84`；M2 `a2f55e6107bf1cad5896cdcc7b5af1eb6b3b7c61`；M3详情自查 `9cc16db49517184df057d43e2ed8da46552da842`；M3隐私及绕线自查/最终源码 `887eafd9f3c9bc29f46a5a266ba00deaf0143c6d`。
- 最后另有普通证据提交；其parent为上述最终源码提交。完整FINAL/PARENT/TREE、普通push回执与准确FINAL CI在提交后生成的仓库外交付回执及最终回复中列出，避免在同一提交内制造自引用SHA。证据提交不得修改源码。
- 模型、推理档位、Standard服务配置：实际均 **UNCONFIRMED**。推荐沿用此前Sol/high/Standard，不据此声称实际已核验。
- 任务ZIP SHA256：`effb78f725cef0f4e26aadffa5e945049e7e0889045a099a264c298e9207c30b`；仓库外解包、CRC及所有MANIFEST条目通过；包内无verify-package.py。所有原输入见`task-inputs/`，Owner两张反例保留原字节，不把裁图当完整视口或绑定BASE的原生证据。
- 已按实际AGENTS核对项目身份、当前职责/DEC-052、DEC-053、相关content与UIR；本包只覆盖任务说明与两层地图呈现，不改游戏规则、知识揭示、终局或存档。

## M1：任务说明与知情线索

`mission-guidance-copy.ts`保存本包定稿正文；`guidance/model.ts`只消费当前PlayerReadyView的tasks、narrative、map、location、可见task actions与terminal。没有导入玩法catalog、读背包名字推任务件、读Feed或用剧情书签授权线索。已知目标还需通过完整公开名唯一性检查；不知道具体房间时只定位已知区域或保留调查方向。

`MissionGuide`的摘要与详情共用该模型、正式brief和copy：详情有委托目的、供电先于装接、指定样本原物、当前成果、可选已知线索、H0返回点、期限/奖励/失败结束说明。携带不等于交付；样本在身上时不再建议提取。恢复供电后只提示剩余装接；成果齐备但远离H0时指引携回，不隔空交付。到达设备不当成调查、调查不当成恢复；终局没有旧任务线索。

工单正式可见动作改名“调查停用工单”，只补content label，不增加动作或提前展示署名。真实React测试验证点击一次仍是一次dispatch/current/notification/checkpoint。

只读“在地图查看”切换共享地图scope并高亮公开目标，追踪选择仅在UI会话内。参数/保护确认、BrowserOwner和原A/B1/C1/C2消费者未改。

## M2：本地房间图、世界建筑图

`map/projection.ts`以公开完整名称建立唯一端点索引。默认层筛当前建筑；跨区出口仍标真实源房间和公开目的建筑，节点详情显示精确公开端点/方向/观察。世界节点来自公开node的place集合，连线只来自真实公开跨区route；内边不会变自环。多个出口合并只合并视觉通道，保留所有原始有向route及其状态、观察，详情不将旧观察当实时许可。

`map/layout.ts`只有纯展示坐标和确定性直角绕线。医院九房间使用有限展示排版；只放公开输入中存在的节点，其他公开名称使用通用位置及原文记录退路，不引用完整世界节点表补知识。通道避开房间矩形，对非端点房间留出额外间隙；交叉用深色底线分层，无路口圆点。双向合并的方向、受阻/未知与上次观察仍逐项可读。

主要标签15 CSS px，节点96×44；医院原生九房间全部落入250×320画布。左栏高度886、scrollHeight886；地图client/scroll都为250×320。移除重复抬头/地点尾栏，简短图例让位给地图；详细路线与帮助按需查看，不用滚动小图获取基本结构。展开图使用同一公开模型，不替代小图可用性。

同建筑移动不随机重排；真实跨建筑提交后当帧使用新建筑默认层。世界点建筑只查看内部，回当前位置只恢复当前区域视图。没有地图移动、自动寻路、传送、费用变化或额外writer。

## M3：检查及实际修订

### 基线与回归分账

1. 开工在新worktree实际运行原test:run，357文件/5078项通过，606.75s。但该轮与后续接线时间重叠，**不把它作为固定源码基线**。
2. 因此另用`git archive BASE`建立仓库外不可变源码快照，运行同一原test:run：357文件/5078项通过，607.19s，exit0；`checks/baseline-exact.log`和exit为本轮基线。依赖仅链接本任务已安装版本，不使用Owner浏览器或存档。
3. 新增两文件10项：React7项、纯map3项。正式React链覆盖样本先取→真实调查/供电→装接→携回→原交付；另有供电先做链。还覆盖早期线索隐私、工单一次提交/保存、跨区真实成本/落点、地图零dispatch/current/checkpoint/entropy和失权旧按钮无效。纯map覆盖分层/跨区过滤/无自环、全名歧义/缺端点、医院10条通道避开节点与稳定位置。
4. 相邻9文件56项通过，随后正式状态链扩展发现并修复公开供电标签应为“恢复供电”；地图旧选择回归也发现并修复anchor变化后旧选择复活。定向最终4文件21项通过。
5. 原完整check抓到useId导致四项既有隐私DOM比较失败；**原privacy.test.tsx未改**，生产改为简图/展开图稳定marker。随后原隐私＋本批5文件26项通过，10.69s。没有把生成ID差异冒称真实隐藏种子泄漏。
6. 真实像素自查发现详情末段裁切，合并重复工单提示、成果同行和三列线索，保留完整正文/字号。旧地图几何测试保留44px节点门槛。最终源码类型检查通过。
7. 两类合同负控：外区房间漏进local；把sample carried改为已交付。均只在仓库外最终源码副本变异，具体业务AssertionError/exit1，逐字节还原；见negative日志/JSON。实际worktree未变异。
8. 两轮被自查修订取代/中断的check日志保留，**不记PASS**。最终源码冻结后再运行原`npm run check`，包含既有E03；以`checks/final-check.log`和exit为准，准确统计/结论另列于交付回执。未扩timeout、删skip或修改CI/依赖。

所有本地命令沿用原脚本，仅设置`VITEST_MAX_WORKERS=2`控制本机并发；准确FINAL CI使用仓库原workflow。负控/隔离复现/相邻回归不累计包装成新增测试数。

### 旧测试适配

- `src/ui/infected-world/ui-v1-map.test.tsx`：从“全部建筑/逐条曲线”改为当前建筑和合并通道绘制，保留所有原始方向、状态、隐私、环路及零副作用；节点高度门槛44px保留。
- `src/ui/infected-world/ui-v1-review-map.test.tsx`：原8项歧义/同短名/失效/只读场景均保留，按两层切换检查对应绘图，同时完整原路线文字、状态和副作用计数不放宽。
- `src/app/infected-browser/narrative-entry.test.ts`、`src/state/residence-session/narrative-entry.test.ts`、`src/ui/infected-world/narrative-entry.test.tsx`、`src/ui/infected-world/narrative-r1.test.tsx`：原“现场互动”确为workorder，只机械替换为“调查停用工单”，原提交/保存/随机/身份断言保持。
- 原隐私、战斗、保存、资格等其他测试未改；没有删测试或skip。

## 四张最终原生原图与操作回执

所有最终四图实际来源源码：`887eafd9f3c9bc29f46a5a266ba00deaf0143c6d`。其后的证据提交源码须逐blob一致。实际DEV React原npm run dev，只监听127.0.0.1:5307；本任务新IAB origin，不接管日常Edge，不改缩放/系统设置。1920×1080 CSS、DPR1；原生完整视口矩形捕获（API clip 0,0,1920,1080）JPEG固有尺寸逐图解码1920×1080，不裁切/缩放/拼图/补边。`screenshots/manifest.json`含字节/SHA256，`metadata.json`含原DOM几何及原生路径。自查早期帧已替换，不纳入本次交付四图。

| 原图 | 实际证明内容 |
|---|---|
| [01-mission.jpg](screenshots/01-mission.jpg) | 样本已携带，供电/装接未完成；已查工单，当前已知供电所线索，不提前显示柜房；正文、返回/期限与三条线索同屏，body client=scroll=749 |
| [02-hospital.jpg](screenshots/02-hospital.jpg) | 当前医院后勤控制间；九个已知医院节点、10合并通道/20有向事实；250×320无滚动，主标签15px，旁侧信息不裁切 |
| [03-hotel.jpg](screenshots/03-hotel.jpg) | 当前酒店安置点，只有入口/安置点两房间；只读选入口可见医院前室、供电所配线廊等公开出口及旧观察；未混医院房间网 |
| [04-world.jpg](screenshots/04-world.jpg) | 任务线索定位供电所建筑高亮；此时实际已知五建筑、四公开区域联系/八方向；没有尚未调查的柜房，当前位置仍酒店 |

原生路径：明确新测试角色crow/engineer，原出发一次；H0→H1→原撬棍开门→H4真实战斗（蓄力一次、普通攻击两次，HP12→10、战后E90→78）→H5原谨慎提取，明确背包1,1放置，E76→66、样本真实携带。随后H4/H1/H3/H6/H7揭示医院分支回路；药房与转运平台仍可为已知未到达。工单点击一次E56→52；未调查前无署名，调查后保留原三卡。H7→H1→H0→T0（48→40，8E）→T1（40→38）。没有导入完成facts/checkpoint或改规则。

第一遍只读看供电所内部再回当前位置，仍酒店/安置点、E38；原正式测试另以精确计数证明零dispatch/current/checkpoint/entropy。最终源码冷恢复同一任务origin的该角色，未自动重播剧情；重新采最终四图，先记录T1→T0→H0→H1→H7为36→28→26→24，跨区8E、默认医院层。全页API其后得到1905×1112自然文档图，未将它冒称1920原图；最终再次自然恢复同一H7测试档，用完整视口原生API取任务/医院图，实际H7→H1→H0→T0→T1为22→20→12→10，再取酒店/世界图。不是事后裁图或更改视口矩阵。两个方向的跨区均沿原入口，不自动去大厅。

任务浏览器标签已关闭、临时viewport已reset；本轮所有5307测试Vite均已停（最终PID见protection/runtime），5307不再提供服务；Owner原5277 PID25444保持运行且原origin数据未清。自动测试的memory ports/正式生产者夹具与原生浏览器分账，不冒称Owner体验通过。

## 白名单与保护

生产只改许可的game-shell、knowledge-map、ui-v1.css、player-query标签；新增mission-guide、guidance/model、map/layout/projection、展示copy。ContentLayer未改，焦点/Esc仍走原层。完整路径见保护清单。

core、规则、协议、保存/expected、BrowserOwner、生产controller、A/B1/C1/C2、旧素材/catalog、叙事已审组件、依赖和CI均未改。既有HTTP实验留在主worktree，新工程分支没有合入；原叙事Owner worktree保留BASE。仅新任务分支普通commit/push；旧分支/标签/main/baseline不移动。宿主内部refs只记录，未主动修改。

## 验收与停止

A01保护/版本与A14检查见准确交付回执；A02—A05由真实任务链、早期/供电先做/样本先取/原交付与原图证明；A06—A09由实际本地/世界像素、公开投影测试、原8项歧义及原隐私反事实证明；A10—A13由零副作用、原跨区及既有生命周期/参数保护/保存测试证明。测试与原生像素分别记账，没有用静态原型或全绿代替主线可用性结论。

未扩中后段剧情、多分辨率、玩法或美术；未SSH/部署/合并或安排Owner先玩。当前没有已知阻断性工程遗留；主线准确SHA代码与四图可用性实审尚未进行。详尽空间物理比例、路径自动规划、隐藏材料攻略并非本轮功能。完成后停止，不进入下一批。

最终本地结果：原npm run check exit0；359文件/5088项通过，559.67秒；架构53 DEC/347 core、typecheck及build通过。准确FINAL CI提交后单独核对，不能以本地PASS替代。
