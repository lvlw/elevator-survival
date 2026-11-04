# ENG-WORLD-NARRATIVE-ENTRY-001-R1 交付报告

本轮接续原M1—M3，完成F01—F04集中修订。酒店交换不再生成搜索回执；受支持已提交动作的投影见证故障有安全诊断；P06实际呈现补给柜与生前习惯；游戏内叙事位于中央场景下方，普通反馈轻量，工单最多三张短卡。没有重做叙事底层、地图或既有UI，没有部署或安排Owner试玩。

## 版本与执行环境

- 仓库：`lvlw/elevator-survival`。
- BASE：`afbb0178fc29a533487fa5208b71ba92b94354c5`。
- BASE parent：`c7a88539d468059ec5ee23a819092792101d0d02`。
- BASE tree：`be2f2ff3f72fb2d12334b33abcbd5b26c65f33e7`。
- 分支：`feature/world-narrative-entry-001`，追加普通提交；原三个提交保留。
- 本轮唯一提交的parent应为BASE。FINAL、PARENT、TREE和准确SHA的CI在提交后生成的仓库外交付回执及最终回复中逐字列出；避免在同一提交的报告中制造自引用SHA。
- 实际代码目录：`E:/projects/传奇私服调整记录/world-narrative-entry-001`，已通过`git worktree list`核实属于本仓库；不是借用其他项目授权。
- 主工作区`E:/projects/elevator-survival`仍在`5e4a38b1d32719f3f7478ecee824c8efae454b8c`；原HTTP未提交实验逐文件SHA256对照保全，见`protection.json`，未带入本分支。
- 推荐Sol/high/Standard；实际模型、推理和服务档位均为**UNCONFIRMED**，工具不暴露可核验配置。Windows PowerShell，原npm脚本；本地测试仅环境变量`VITEST_MAX_WORKERS=2`，未改脚本或超时。

## W0：来源、规则与保全

任务包在仓库外验证ZIP CRC和全部manifest条目。ZIP SHA256：`1ad93ac80e44851f7f0ec55fb8ee6bca9dd2cf418d46207ed738d24bccacfb9a`。包内没有`verify-package.py`。原始TASK/AUD/ACCEPTANCE/SCOPE及附带复现原件另存`task-inputs/`，未倒改原归档。

按实际AGENTS和指定规则/UIR核对，以本项目AUD和本包为准；原归档合同、CONTENT-SCOPE、v0.2首段剧本及节奏稿仍是输入。其他项目审查没有扩权。W0实际运行`npm run test:run`：355文件、5069测试通过，570.73秒，exit 0。历史计数没有代替本轮运行。

## W1：准确回执与提交后诊断

`receipt.ts`先按正式source声明判断支持的搜索模式，再检查投影见证。`atomic-exchange`及不支持的辅助生产者返回无探索回执；不拒绝酒店交易。正式catalog来自facade依赖，不按label、地点、HP或Feed猜分类。

支持且存活的动作校验revision、角色身份、现场绑定及其缺失、已有任务执行绑定、必要工具实例及资源见证。异常统一抛出不含隐藏身份的通用错误，复用原facade的`projection-unavailable`诊断。真实committed、原提交/存储/通知维持一次；不回滚、不重放。死亡、终局及真正不支持动作仍允许无回执。实际1→0和0→0资源截零语义保留。

新增正式酒店路径测试：真实H2生产、拾取、移动到T1、facade/controller交换；验证口粮产物、无搜索Feed/新回执、一次dispatch/写入/通知及重复旧输入被拒绝。四种受控投影故障只篡改投影器参数，不篡改canonical current：角色绑定、缺失现场、缺失资源、缺失必要工具绑定；原正式照明搜索仍成功，产生诊断且仅提交/保存/通知一次，retry无新动作。这不是正常游戏可达串档的证据。

## W2：P06与底部叙事

P06真实准备页使用已采用中枢/物品图，显示金属管、厚实外套和绷带的规定初配，注明确定准备时发放；三工具像柜内选一件，直接显示既有效果；三专长接在“生前的习惯”短叙事之后。无默认选择、无提前熵/发物。`确定准备`仍只调用原confirmSetup；出发仍是独立depart。原保存/迁移帮助降为次级可访问说明。

P06内容显示且明确确定准备才记录read；点击略过准备叙事则记录skipped。P05和回看同源告知成功/失败正式结束均不可重接，失败收入0、最多扣现有积分、不负债；数字继续取正式entryBrief。

叙事移至WorldStage后方同一中央列，正文有界；搜索、拾取、开门仅短反馈和一个收起入口，下一合法操作直接继续，自动退场不记read。H07实际调查后分旁白、停用工单（含周衡署名）、玩家反应三卡，单一主继续/读毕及次级略过；卡间继续不写checkpoint/书签，最终显式ACK才读毕。全文回看保留，收起为dismissed。原hook身份/失权守卫未改；参数/保护确认出现时当帧让位，不把对白变成玩法门禁。

## W3：失败回归、负控与最终检查

运行明细见`checks/execution-summary.md`。两份R1新测试最初放入准确afbb隔离源码快照，7项均以业务断言失败，覆盖交换误分类、缺诊断、P06缺场景/略过、上方反馈和工单无节奏；缓存EPERM启动失败不计为业务失败。修复后新旧叙事定向通过。另对准确afbb源码副本重放最终九项新回归以保存原始证据，九项均业务失败，见`checks/base-red.log`和`base-red.json`；该重放发生在实现后，不伪称为最初运行。相邻63文件首轮9项失败仅为旧“确认创建”按钮文案，窄改为“确定准备”，保留全部选择、资格、数量、保存、随机和锁断言；最终完整check覆盖全部。

自查追加现场/必要工具绑定缺失用例：修改前2失败、3通过；补修后四文件15项通过，原始日志为`checks/self-review-before.log`和`self-review-after.log`。这两处受控故障没有声称正常游戏已产生坏提交。

两类负控在仓库外最终源码副本执行并逐字节还原：把atomic-exchange重新归入search，真实酒店断言失败；把P06强制记read，略过分支断言失败。均为AssertionError，非编译或工具启动失败，见`negative-*.log`及`negative-results.json`。实际worktree未运行变异。

最终**原`npm run check`**在全部修订及负控还原后运行，原始日志/exit随附；包括architecture、typecheck、全量test:run（含既有E03）和build。没有修改依赖、CI、timeout或跳过测试。最终357文件、5078测试通过，561.10秒，architecture 53 DEC/347 core、typecheck和build通过，exit 0；准确SHA CI见交付回执。不把先前5076项通过的轮次冒充追加两项后的最终运行。

旧测试只适配按钮名、H07分卡路径，以及把两条静默null断言加强为诊断异常；没有删除、skip或宽松化其余断言。A/B1/C1/C2、工具直用、原参数/保护确认、保存失败/retry、冷恢复与书签绑定回归均由原全集覆盖。

## 浏览器与四张原图

真实原DEV React：`/?dev-infected-world=1`，本机仅监听127.0.0.1:5261。固定1920×1080 CSS、DPR1，使用本任务新IAB测试标签，不接管日常Edge profile。没有故障注入服务或checkpoint注入，没有清除Owner数据。最终JPEG均1920×1080，复制原始字节，未缩放、补边、拼图或后处理；逐图字节/hash/capture方法见`screenshots/manifest.json`。

| 原图 | 实际内容 |
|---|---|
| [01-hub.jpg](screenshots/01-hub.jpg) | 原生P02中枢观察、显示屏与任务入口 |
| [02-preparation.jpg](screenshots/02-preparation.jpg) | 真实补给柜、三件初配图、三工具、生前习惯与三专长 |
| [03-search.jpg](screenshots/03-search.jpg) | 真实照明药房搜索后物品和下方轻量反馈，原搜索/行动可达 |
| [04-workorder.jpg](screenshots/04-workorder.jpg) | 真实调查后第2/3张工单短卡，署名与原行动区域同时可见 |

原生路径实际创建/出发各一次，H0→大厅→药房，照明直用，实际精力96→88、电量消耗1，发现绷带和消毒剂；实际拾取两物后取空、重新查看不再付搜索费；大厅→后勤控制间，未调查前DOM无周衡，实际调查84→80，再显示三卡。实际reload恢复后勤控制间且无自动叙事重播。保存故障和失权旧ACK由真实React测试及受控故障测试覆盖，不冒称在原生浏览器触发了存储故障。

四图来自两个新origin：`127.0.0.1:5261`承载真实创建至工单路径；`localhost:5261`只重走准备前场面并截中枢/P06，没有在那里创建角色。不是同一角色的连续四帧，也不是Owner数据。普通截图API曾裁右；最终三图用原生fullPage，中枢图直接用完整1920×1080视口clip捕获（其fullPage曾有1112高）；不使用事后图片裁切凑尺寸。所有本任务标签已关闭，临时视口覆盖已reset；本机测试服务交付后仅停本任务进程。

## R01—R14与边界

| 范围 | 证据与结论 |
|---|---|
| R01、R03 | 新state facade/controller酒店与4类受控投影故障；通过 |
| R02、R04、R07、R08、R10—R12 | 原叙事/state/browser/UI相邻及最终完整check；保持原断言；通过 |
| R05—R06 | 新React补给柜/习惯、略过不记read和一次真实创建；原9初配组合继续通过 |
| R09 | 新React旧ACK失权无效，加既有L2/L3/死亡/异常/保存回归；当帧抑制原叙事 |
| R11、R13 | 原供电知识变体回归、真实调查与下方三卡原图；主视口实际复核 |
| R14 | 原完整check与准确SHA原CI（交付回执）；原三提交保留 |

## 修改清单、自查与停止点

共16个源码/测试路径：receipt、player-facade、content、prologue、setup-panel、app、game-shell、world-stage、story-panel、ui-v1.css；两份新narrative-r1测试；既有state/UI narrative-entry测试、setup测试和route-test-fixtures。另新增本`r1/`报告、任务原件、检查证据和四图。完整路径见`protection.json`。

全部变更按SCOPE逐路径核对。core、S/current、保存/expected、BrowserOwner、A/B1协议、C1/C2消费者、地图、main入口、原稿、图像资产、依赖及CI未改。无SSH/部署、强推、合并、清档或移动旧分支/标签。保全其他worktree及HTTP实验。

没有已知阻断性未完成实现；主线代码与视觉实审尚未进行，不能以全绿测试代替主线结论。未做额外分辨率矩阵、C16能力补验、Owner体验、外网或发布验证；这些不在本轮范围。准确SHA CI如遇外部平台阻塞将逐项在最终回执标明。交付后停止，不自动部署或继续中后段、美术、B2。
