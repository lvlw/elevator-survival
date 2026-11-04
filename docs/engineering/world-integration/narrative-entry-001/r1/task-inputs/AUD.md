# AUD-afbb0178｜首批叙事接入主线实审 v1.0

日期：2026-11-04。仓库：`lvlw/elevator-survival`。

## 结论和立即动作

**NEEDS R1；保留原三个提交，不整体revert，不重建首段系统。**

使用另一条Codex会话、另一项目会话提供旁证，都不直接证明产物失效。本结论来自本项目原任务、准确SHA源码、原始CI日志、Owner上传四张图和两个实际纯模块的隔离检查，不采信另一会话的PASS作为本项目验收。

已看到有价值的实际接线：受控公开知识、原执行链的探索回执、原锁下的附属阅读记录、真实序章路径、工单解锁、唯一工具直用与轻提示。没有发现足以要求废弃整个实现的核心／存档破坏证据。

但P06情境化准备及主场景底部叙事尚未按原稿落实；探索回执还有一处实际语义误分类与一处防御性诊断缺口。因此本批不能签整体验收PASS。不是追加宏大美术项目，也不是以未完成的其他分辨率为理由退回。

## 1. 审查基线

- BASE：`5e4a38b1d32719f3f7478ecee824c8efae454b8c`
- M1：`c6b9a44d912dc423e7815f43347311b285ab860c`
- M2／FINAL parent：`c7a88539d468059ec5ee23a819092792101d0d02`
- FINAL：`afbb0178fc29a533487fa5208b71ba92b94354c5`
- TREE：`be2f2ff3f72fb2d12334b33abcbd5b26c65f33e7`
- 分支：`feature/world-narrative-entry-001`，本轮回读仍指向FINAL。

远端比较为相对BASE三个提交；已审改动没有涉及core、原游戏存档schema、依赖、CI或旧图片。没有检查用户本地磁盘，因此工作区干净、HTTP实验的隔离保全按作者报告记录，不冒称主线直接验证。没有重新普查全部远端refs，也没有复刻整仓做Git树审计。

## 2. 发现项

### F01｜R1必修：情境化准备未完整呈现，却直接标记P06已读

依据：原v0.2 P06、CONTENT-SCOPE、N2/N7、I4；实际 `components/setup-panel.tsx`。

现有流程确实有序章、日记、任务以及真实准备选择，但P06进入的仍是原来的工具／专长配置页面。没有显示获批的“补给柜”与“生前习惯”叙事，仍以“独立DEV封闭首玩／确认创建／不读取旧档”等工程措辞占据玩家主画面。`content.ts`虽有P06文本，准备过程未调用它；确认创建时却无条件追加 `{key:'P06',state:'read'}`。

这不是“radio控件不能用”，也不是要求新画柜子。问题是已授权的场景内容没有随真实准备流程发生，记录又声称该段已读。

修订：复用现有中枢与物品资源，呈现短的补给柜观察、规定初配的只读展示、工具选择和“生前的习惯”三专长；保留实际效果可读及真实创建／出发分离。创建后只对实际呈现并明确结束的片段记read；略过/未呈现不得伪造。技术保存限制可以保留在适当的帮助或次级说明里，真实保存失败警告不得隐去。

### F02｜R1必修：普通叙事做成上方的大信息卡，阅读管理动作暴露过多

依据：I4明确要求中央场景下方有界叙事；N4／v0.2要求普通发现轻量、重要段至多三张短卡。实际 `story-panel.tsx`、场景接线及Owner四图。

药房、工单都显示在中央场景上部的大块卡片中，完整段落与“读毕／略过本段／收起”三个动作同时出现。它能传达内容，但不等于已完成约定的底部短叙事节奏。截图只证明有内容、可见主操作，不证明玩家已经有代入感。

修订：一个共享的底部叙事区域；普通搜索/拾取一条短反应，下一次合法动作即可自然退场；重要工单按相邻语义分少量短卡，清楚区分旁白、角色和中枢声音，原全文可回看。正常路径一个主要继续/关闭动作即可；略过为次级。后台read/skipped/dismissed区分保留，不把三个状态都变成每次必看的同级按钮。参数、正式确认、死亡、失权及保存警告继续优先。

这项不是重新设计整套三栏、地图、人物或多分辨率；只把本任务已经承诺的叙事场面做好。

### F03｜R1必修：酒店交换被误报成搜索

依据：`narrative-entry/receipt.ts`对所有成功source生产使用 `kind:'search'`；`issuer.ts`据此追加“搜索完成，现场现有N件物品”。真实 `T1-exchange` 同样是source，但属于两种药品换粮的原子交换，不是地面搜索，产物进背包。

当前H03场号只对H1/H2签发，所以**没有证据说酒店交换会播放H03搜索对白**。错误位于新探索回执的种类及其Feed追加文本，不是交换库存结算。

主线将实际receipt和issuer模块的Git blob核对后转译执行，用明确标注的最小合成输入复现：T1-exchange输出 `kind:'search', story:null, revealed:0`，文本“搜索完成，现场现有 0 件物品。” 真实交换路径的存在另由已有 `supply-faults.test.ts` 核对；主线未独立执行完整原生酒店路线。

修订：按受信任的正式声明语义区分真实搜索与原子交换等source；本批不支持的交换不发新探索回执，保留原交易结算/原反馈。不得为消除误报删除酒店入口或新增一套中段剧情。补一次真实酒店交换的facade/controller回归，验证无search回执且交易只提交/消费/保存一次。

### F04｜R1必修：受支持行动的投影不一致被静默当作“无回执”

依据：原N3要求不支持与受支持但投影异常分开。receipt中revision、角色／site绑定不符、实际工具状态缺失等均直接return null；facade只在抛异常时设置 `explorationDiagnostic='projection-unavailable'`，null会变成普通无附加结果。

主线隔离复现了受支持H2照明搜索中“角色绑定不符”和“提交后工具状态缺失”两种输入：都返回null且不抛出。因此不符合已约定的可诊断失败语义。

**这是防御性接缝缺口，不是已发生跨角色串档、数据损坏或正常核心提交可达的证明。** 原核心校验仍在，未建议改核心规则。

修订：先判支持范围，明确允许的终局/无叙事场合可以无回执；受支持且存活的已提交行动，如果绑定或必要资源见证异常，应走受控诊断，不改成rejected，不重发行动，不写假的数值。由小型结构化结果或专用错误完成均可；无须新总线。补真实facade下的受控故障注入，保留一次原提交和原保存，并证明诊断出现。必须避免给所有不支持动作一律报警。

## 3. 已确认并应保留的实现

- 任务数字在 `content.ts` 通过 `entryBrief` 引用正式配置，当前公开知识也从deps配置读取；未发现“120/20/7写死在React”的问题。
- H03文本已按 receipt.method 区分lit与非lit，也区分有无揭示物品；**不是无手电也显示光束**。R1不要误修这条。
- P02的“靠墙休息”确实只在查看显示屏后出现；略过另有独立路径。不要把看图时已经查看过的状态误判为提前泄漏。
- 原执行链仍负责玩法，探索文字纳入原单次adopt/publish，非追加一次玩法dispatch/checkpoint。
- 工单正文依正式事实，不由书签解锁；已有新React测试覆盖真实调查、回看、冷恢复与失权旧点击。
- 唯一工具补全保留原preview/capture/confirmation/execute；非唯一和额外参数不自动替玩家决策。
- 原A/B1/C1/C2与上一轮两处R1修复不应随本次修订推倒。

## 4. 验证证据分账

| 来源 | 本轮采用的证据 | 限制 |
|---|---|---|
| 作者基线 | 350文件／5041项 | 作者报告与基线日志路径；不是主线本地运行 |
| 作者新增 | 净增5文件／28项 | 定向集合有重叠，不累加 |
| 准确FINAL的CI #186 | 355文件／5069项；架构、类型、测试、构建成功 | 主线已读取run、job与原始日志；不代表剧情体验通过 |
| 作者四类负控 | 作者报告检出并还原 | 主线未重新执行负控，不冒称独立复跑 |
| 主线隔离运行 | 两个实际纯模块，6个观察案例：3个正向控制、3个问题表现（归于F03/F04两项） | 最小合成输入，非整仓回归、非完整P/R/S链、非浏览器 |
| 主线视觉审看 | Owner提供的4张1920×1080 PNG | 实际查看与解码；未独立重跑浏览器，也未宣称PNG与仓库截图逐字节绑定 |

本地整仓测试NOT RUN。此前整仓归档获取受网络解析限制，本轮没有因此要求Owner重复打源码包。隔离脚本首次查找TypeScript安装路径失败，修正为本机npm全局路径后正常执行；失败不计游戏测试结果。

CI安装日志仍有7项告警（2 moderate、5 high）。本轮没有完整公告与可达性分析，不作安全通过结论，不升级依赖、不audit fix。

## 5. 视觉逐图

1. 中枢：世界目标与日记/任务入口已实际出现；“看到叙事”成立，但当前仍是信息面板表现，不能据此宣布精致场景完成。
2. 准备：工具/专长可选、效果可读；F01成立，需补P06情境并减少开发者文案占主画面。
3. 药房：真实结果、物品与原行动区域并存，频繁ⓘ已减少；F02成立，普通搜索反馈不应占上方大卡。
4. 工单：实际署名与停运悬念可见；F02同样成立。截图不独立证明调查前隐藏，由已读源码和测试支撑。

不因本轮截图重新要求修地图、390、zoom、DPR2、系统媒体true；这些沿原范围记录。现有右侧浏览器扩展图标也不作为游戏缺陷。

## 6. 后续授权停止点

推荐直接在当前feature分支从FINAL追加R1普通提交。没有必要revert三次提交、退回旧UI或重复搭建叙事记录。R1完成后主线再审准确SHA及四张相关新画面；不自动部署、不安排Owner先替作者测试。

## 精确来源

- [作者报告](https://github.com/lvlw/elevator-survival/blob/afbb0178fc29a533487fa5208b71ba92b94354c5/docs/engineering/world-integration/narrative-entry-001/REPORT.md)
- [准备页](https://github.com/lvlw/elevator-survival/blob/afbb0178fc29a533487fa5208b71ba92b94354c5/src/ui/infected-world/components/setup-panel.tsx)
- [序章](https://github.com/lvlw/elevator-survival/blob/afbb0178fc29a533487fa5208b71ba92b94354c5/src/ui/infected-world/narrative-entry/prologue.tsx)
- [正文与配置](https://github.com/lvlw/elevator-survival/blob/afbb0178fc29a533487fa5208b71ba92b94354c5/src/content/infected-world-v0.1/narrative-entry/content.ts)
- [回执](https://github.com/lvlw/elevator-survival/blob/afbb0178fc29a533487fa5208b71ba92b94354c5/src/state/residence-session/narrative-entry/receipt.ts)
- [facade诊断边界](https://github.com/lvlw/elevator-survival/blob/afbb0178fc29a533487fa5208b71ba92b94354c5/src/state/residence-session/player-facade.ts)
- [反馈发放器](https://github.com/lvlw/elevator-survival/blob/afbb0178fc29a533487fa5208b71ba92b94354c5/src/app/infected-preplay/narrative-entry/issuer.ts)
- [原子交换原有测试](https://github.com/lvlw/elevator-survival/blob/afbb0178fc29a533487fa5208b71ba92b94354c5/src/state/residence-session/supply-faults.test.ts)
- [叙事UI](https://github.com/lvlw/elevator-survival/blob/afbb0178fc29a533487fa5208b71ba92b94354c5/src/ui/infected-world/narrative-entry/story-panel.tsx)
- [新React测试](https://github.com/lvlw/elevator-survival/blob/afbb0178fc29a533487fa5208b71ba92b94354c5/src/ui/infected-world/narrative-entry.test.tsx)
- [准确CI #186](https://github.com/lvlw/elevator-survival/actions/runs/41682103211)

原任务及v0.2原件继续以本批已归档 `docs/engineering/world-integration/narrative-entry-001/task-inputs/` 为依据；其权威身份不因本审查而整体改写。
