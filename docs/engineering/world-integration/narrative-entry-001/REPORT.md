# ENG-WORLD-NARRATIVE-ENTRY-001 作者交付报告

本批把P01–P06与H01–H07接进原DEV React游戏，保留工单之后的原游戏；不是独立预览、对白播放器或完整中后段。范围依据为[原任务书](task-inputs/TASK.md)、[叙事合同](task-inputs/NARRATIVE-CONTRACT.md)、[交互合同](task-inputs/INTERACTION-CONTRACT.md)、[内容边界](task-inputs/CONTENT-SCOPE.md)、[验收](task-inputs/ACCEPTANCE.md)及[SCOPE](task-inputs/SCOPE.json)。两份v0.2原件和11项manifest条目逐字节校验，未改其历史身份。

BASE `5e4a38b1d32719f3f7478ecee824c8efae454b8c`；分支 `feature/world-narrative-entry-001`。原工作区HEAD恰为BASE，但含未提交HTTP实验，故在独立干净worktree实施，不纳入、不覆盖这些文件。核对实际AGENTS及相关01/02/03/05/09和正式content。推荐配置GPT-6.1 Sol/high/Standard；实际模型、推理档和服务档位均 **UNCONFIRMED**，工具不能核验这些菜单或运行配置。

## 普通提交与职责

| 包 | 提交 | 内容 |
| --- | --- | --- |
| M1 | `c6b9a44d912dc423e7815f43347311b285ab860c` | 窄公开知识、真实探索回执、独立scope/ordinal、原独占owner下的附属阅读记录 |
| M2 | `c7a88539d468059ec5ee23a819092792101d0d02` | 中枢序章、明确准备、真实出发、医院首段、护工短过渡、工单悬念及真实DOM测试驱动 |
| M3 | 本报告所在新分支HEAD | 唯一工具直用、hover/focus短说明、F1完整说明、物品用途、门方法分组、紧凑结果、回归/负控/原图 |

FINAL/PARENT/TREE及准确SHA的CI在提交并推送后读取，随最终交付回执给出；本报告不伪造一个包含自身的提交SHA。只普通commit/push本新分支，不merge、强推、移动main/baseline/旧refs、SSH或部署。

## 实现边界

PlayerReadyView只追加有限`narrative`，包括已知片段、真实工单/供电调查/工具箱产物及正式配置任务摘要。公开信息不取书签，不输出隐藏事件、ID、seed、敌人精确HP或随机轨迹。实际dispatch返回的commit.current与原前态、解析命令、revision和同一工具实例绑定；消耗取两态ItemState差额，包含截零及0，不按配置费率或Feed猜。探索回执失败独立报告`explorationDiagnostic`，不能把真实提交改成拒绝、回滚或重发。原控制器单次adopt/publish组织增文，B1/C1/C2原模块不改。

阅读记录是原namespace下一个有界sidecar，复用原锁常量与活owner，不造第二writer。绑定reservation的generation/角色/执行/版本，13个有限key，read/skipped/dismissed各自记录。只有显式ACK写；游戏save-failed时留内存，由显式retrySave成功后协调flush。损坏、错身份/版本、未来revision、未知事实标记都不能清档、补物或解锁正文；sidecar写失败只给独立提示，游戏checkpoint保持。恢复不自动补播，已知记录可主动看。

P01–P05翻页和“靠墙休息”都是呈现，不建立身份、物品、日结或存档；略过仍到完整任务告知。P06明确选工具与专长，原createFirst与depart分开。H01只从新departure，广播只从新到达H1，搜索/拾取/开门文字只从提交结果，工单仅真实workorder。先power-survey的反应另有正式命令测试；没有“亲口听周衡”分支。护工初见非阻断，胜利只写“你握着武器又等了片刻，才稍稍松开手。”死亡及原参数/L3/详情优先。没有文字门禁、积压队列、定时器结算或工单后游戏锁。

直用便捷只针对已明确lit/crow/toolbox/card方法，公开必要输入仅item且候选恰好1件；多候选、缺方法、材料、数量、格位和医疗均不推广。完整opaque请求继续原preview/capture/L3/execute；真正必死且有替代的唯一撬棍方法仍先保护确认，取消零效果。hover/focus只读，F1保留；绷带文案引用正式配置说明基础与生存首次总量，不据隐藏资格改变。原普通拾取first-fit与任务件显式摆放保留。

## 测试与负控

基线实际运行原`npm run test:run`：350文件/5041项PASS，见[日志](baseline-test-run.log)。最初外部node_modules junction的Vite缓存写被拒；改为复制原依赖字节、隔离缓存，不改package/lock、worker或全局预算。一次sandbox启动停滞已中断并单独保留日志，成功命令未据历史成绩冒充。

M1定向19项、M2定向38项、M3相关45项、补充边界24项及兼容适配54项分别有日志；这些集合有重叠，不累加成测试总数。原R1生命周期/地图两个文件17项在相关回归内；A/B1/C1/C2及E03在原全集内，不另堆重复矩阵。

首次完整check为355文件、5069项，其中10项旧断言/DOM入口适配失败，5059通过，见[原失败日志](check-before-test-adaptation.log)。修正仅在授权测试范围：剥离新增narrative/exploration字段后严格比较旧DTO；Feed增文先按回执精确验证再比较原文本；单项工具下拉被移除的用例改走真实item+placement表单，原存档、提交、通知、隐私及opaque不变断言继续精确。没有删除/skip旧用例、增加超时、放宽写次数或改CI。

还原后的最终原`npm run check`：**PASS，355文件/5069项全部通过，架构、类型、默认test:run和build均成功**，见[final-check.log](final-check.log)。相对基线净增5文件/28项；不把定向集合与全集相加。准确FINAL SHA的原CI只在最终推送后核验，不把BASE的CI185或其他SHA当成本批通过。

四类临时语义变异全部被业务AssertionError检出，并finally逐字节还原；[执行脚本](run-negative-controls.mjs)、[结果及恢复hash](negative-controls.json)和四份negative日志可复核。包括未查工单提前公开、retrySave重发回执、唯一照明搜索重复dispatch（实测dispatch2而非1）、退役owner继续写书签（字节相等断言失败）。不是类型或模块加载失败；`-t`未选中项是该定向运行的正常过滤，最终全集不skip。

## 原生主视口与遗留

原DEV浏览器实跑新玩家首段，固定1920×1080 CSS、DPR1，四张未编辑原图和详细操作/固有尺寸/几何测量见[browser-review.md](browser-review.md)。原生到达H7并调查，没有注入facts；冷恢复不重播，工单后继续去岗亭。浏览器error记录为空。页面右侧已有扩展小标保留原状。

原生浏览器故障注入、多标签竞争：NOT RUN，使用确定性真实React/原owner测试。Owner亲自体验、完整剧情时长/代入感、完整中后段、B2、玩家v2、第二世界、所有浏览器兼容及服务器验收：NOT RUN/不在本批。原非比例地图滚动/布局欠账保留。实际模型/effort/tier不可核验。未发现需要改core、旧档或独占协议的真实玩法冲突。

范围逐文件与输入hash检查见[scope-audit.json](scope-audit.json)；生产改动限白名单，原S/current、core、residence-save、checkpoint/reservation/v4/schema/lease、身份熵、已审表现模块、入口、依赖、CI和旧资产不改。完成后停等主线代码与实际画面实审，不安排Owner试玩、不自动继续或部署。
