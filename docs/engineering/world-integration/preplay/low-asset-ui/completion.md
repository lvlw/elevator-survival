# ENG-WORLD-LOW-ASSET-UI-001 作者交付

状态：作者实现、默认检查与浏览器验证完成，等待准确 SHA 实审；截图包与 Git 收据见下文最终记录。该文件不批准 Owner 体验、O3、发布或后继工程。

## 起点与范围

- 起始 SHA：`0ac23bc3654d69c3d0a6289d5d9e97ce30c69164`。
- 新工程分支：`feature/world-low-asset-ui-001`；起始普通／cached diff 和 status 为空。
- 默认实测基线：287 test files / 4554 tests PASS，348.74s；不是沿用历史报告数字。
- 输入包六份原件经原核验脚本核对后按字节归档。最大许可 96 条，不要求创建全部候选文件。
- 详细设计、失败修订与同源委托见[实施记录](implementation-notes.md)；U01—U10、unknown 和实际支持见[矩阵](contract-and-support.md)；Owner 操作指南见[指南](owner-playtest-guide.md)。

## 实现

显式 DEV `?dev-infected-world=1` 在医院 bootstrap/storage 之前分流；非 DEV 忽略参数，旧 preview 优先。唯一 browser owner 随 React 生命周期启停，原 controller／S／锁／checkpoint 不变。Stage-First 界面覆盖明确初选、五停点、当前房间、只读地图和单边导航、真实来源及结果重开、背包／快捷／任务／药食／维护／战斗／终局。

必要 `describeAction` 从正式配置和同源纯资格形成只读输入说明，当前 opaque handles 替换内部引用。显式数量／位置／旋转／材料／目标／机械单总池；最终资格和支付仍由正式 Preview 决定。普通整实例拾取便利不扩展到任务物或自动整理。没有新 current、writer、规则公式、保存格式或隐藏答案试算。

六图标及准确公开房间使用既有资产；缺图中性占位。当前敌人 DTO 缺安全名称／definition，因此不猜三敌贴图，统一中性对手占位。隐藏医疗目标继续 unknown；not-guaranteed 不称安全；D1 只显示批准当前粗档。

## 原生与真实 DOM

两条完整链由真实 React 控件和 DOM 事件推进，非页面脚本调用 owner.execute：

- A：read-null→明确初选→首次出发→三敌及真实材料／搬运／安装→显式样本 2×2 放置→H0 成功。保留默认 RNG，未清敌或补物。
- B：独立空档→真实材料→受伤与退却→立即付费维修→绷带→休整→保存失败只保存重试→冷恢复→原敌再入→合法止损。没有重复规则结算。

低 HP、Day7、两类死亡 checkpoint 是单列严格 TEST 补充，不冒充空档主链。独立 spy 检查 S dispatch/current/notice/producer/draw，浏览器 controlsCalls 与它们分账。

关键计数：单次维护、战斗和正式终局均 1 dispatch / 1 current / 1 native notice / 1 checkpoint attempt；维护材料及资源只支付一次。返回确认打开／取消、地图／菜单／编辑为零 gameplay/IO。保存失败仍为一次提交；retry 为 0 dispatch/current/notice/draw，1 encode/write。正常 H0 返回周期入口调用一次但 steps=[]，不额外过夜。

## 自查、负控与保护

默认 full-check-1 为 309 files / 4647 tests PASS。其后新系统屏坏档分流缺陷经修前原生 DOM 复现，局部修复并新增 3 项；修后 faults 7/7、相邻 13 项及 typecheck PASS。第一次浏览器 5/6 的 TEST 驱动失败和第二次 6/6 均独立保留，不倒改为最终证据。

三类仓库外语义负控共 4 个 AssertionError；逐类恢复后通过。T02 修前真实 Windows junction 误放行，修后 24/24，恢复旧预检负控 3 项语义失败，恢复后 24/24；原浏览器执行后缀 17023 bytes 保持。路径计算、注入权限故障和实际 Windows junction 分账，不承诺恶意并发换链防御。

1627 个保护对象、旧测试／helper、规则／参数／v4／domain／P/R/S／依赖保持；5 份共享文档只追加作者附记，未增加 DEC/UIR。W01 七处与 W02 一处原件保留；本批新差异须 exit0，累计原始 exit2 不改写为通过。

## 最终收口记录

最终默认 `npm run check` exit0：architecture 53 DEC / 347 core production files，typecheck PASS，309 files / 4650 tests PASS（301.89s），build PASS。本批新增 22 个测试文件／96 项，替换0、删除0、净增96。旧 E03 四路线及72默认样本随完整默认套件通过，旧测试／helper 原字节未变。唯一新增 core production 是纯输入说明。

最终 browser-3：已安装 Edge 155，7/7 组 PASS，console warning/error=0。实际 localStorage／Web Locks、五停点刷新、同源同分区占用、真实 BFCache persisted=true／显式重获独占、两类敌终态死亡与当前生产 dist 忽略 DEV flag 均通过。A 84 条公开 DOM 步骤，Day4／HP2／sample delivered／reward120；B 18 条公开 DOM 步骤，Day2／HP11／voluntary-failure。B 六次注入 checkpoint 失败保留最新内存，retry 仅增加一次写入，execute／confirm 零增。计数口径见 verification-results，不把 controlsCalls 冒充 S dispatch。

源码／测试／UI validation 972 文件指纹：`7d24f76548789660d7f92c2dcfbc1284de4f940d07fb373a322de150af50f848`。真实浏览器另含 public／dist 的1011文件前后指纹：`c91bb4a0ff7cc872ee8777cc26f3c49d6a7726725064b0529dc73c2b3c229f83`。最终暂存／blob 相等及实际 commit/parent/tree、推送／CI 在提交后外部收据和最终回复核对；本报告不反复 amend 以包含自身 SHA。

十二张最终截图已逐张看图，桌面主控件可见，窄屏正常纵向滚动、无横向溢出。真实键盘菜单／地图读零 IO／execute／confirm，焦点与窗口边缘通过。实际截图 ZIP 路径与摘要在本节后续交付项中记录，不打包 profile 或存档。

审阅包实际路径：

```text
C:\Users\zjl\AppData\Local\Temp\world-low-ui-work-7640c8e31d10409fbad30a9ce96ed7ce\ENG-WORLD-LOW-ASSET-UI-001-UI-REVIEW-ASSETS-v1.0.zip
```

- 大小：4,037,163 bytes。
- SHA-256：`559a1ed3b8f40567934e0ce875dfe6d559b19ac39ef5487e01cf9a857ef76934`。
- 37 个文件：12 PNG、浏览器／运行时摘要、视觉说明、实际原生日志及负控／T02／系统屏复核证据，含36项 payload 摘要清单和清单自身。
- ZIP CRC 全部通过；逐项 bytes/SHA-256 匹配，无多余项。未包含 profile、checkpoint/reservation 存档或浏览器二进制。

实际变更共87条许可路径（15修改、72新增）：8份旧src最小接线／委托，3份纯输入／目录生产文件及6个对应测试，新UI组件／样式／交互和16个UI测试，6份原输入、作者报告／浏览器工具，5份共享文档末尾附记及旧工具T02两路径。精确逐文件清单由 staged diff／最终 commit 提供；未使用的9条候选路径不创建空壳。

提交前新差异、普通／cached diff-check 要求 raw exit0；累计检查如前述仅 W01/W02 raw exit2。作者报告与归档不把这些历史原件空白改写掉。源码及运行时已冻结，后续只完成核验、一次普通 commit 和本分支 push；准确 SHA CI 在推送后读取，提交前不预填 CI PASS。

字节核验口径：本批87条变更全部是 LF，working bytes 与 staged blob 逐项相同。首次扩大到整个972文件集合做 raw blob 比较时，另检出6个从未修改的 mission-lifecycle 旧文件既有 CRLF checkout（controlled/index/test/queries/types/validation）；它们从起始基线起的 raw 指纹不变，HEAD/index 完全相同，仅 checkout CRLF 对应 Git LF。其余966文件 raw 相同，六文件按既有 Git EOL 规范化后相同。本批不改这六个保护文件、不新增空白例外，也不将“全库972 raw bytes 均等于 blob”冒充通过；完整原始失败和精确 EOL 核验保存在仓库外 staged 收据。

## 未覆盖及停止点

Owner 自由首玩／分段与九组合体验、平衡、其他浏览器、真实 OS 配额／权限耗尽、断电持久性、最终 Art/UI/Audio 品质均 NOT RUN。依赖审计历史 404 仍 UNCONFIRMED，未升级依赖。准确 SHA 源码／保存接缝／浏览器／视觉实审待主线；O3、清档、迁移、永久双入口和第二委托未批准。

本任务不开始后继工程、不合并、不推 main 或其他旧分支、不强推。

## ENG-WORLD-LOW-ASSET-UI-001-R1 作者补修交付

起点 `2e3d13a52ada1fdcd9848574e918b97db43cb0c2`，沿用 `feature/world-low-asset-ui-001`，工作区／索引最初干净。默认实测基线309 files／4650 tests，exit0，307.71s。输入包9份原件、8个SHA256及两内嵌ZIP的CRC通过；66路径最大许可，不扩大旧96集合。

修前12项真实DOM AssertionError保留；UI-01完整行动独立L0、UI-02六条能力与任务件中文、UI-03安全opaque候选菜单、V01会话保存说明已补齐。文案来源、U01—U10对应与两份旧测试定位更新见[r1/wording-and-test-map.md](r1/wording-and-test-map.md)。未改规则、参数、core/state/app、P/R/S、controller/browser owner、锁／保存或入口；L1仍一次点击，隐藏医疗目标与未知后果不被改称安全。

最终默认 `npm run check` exit0：architecture53 DEC／347 core production files，typecheck PASS，314 files／4672 tests（350.39s），build PASS。新增5测试文件／22项，替换0、删除0、净增22。原A/B真实DOM链、E03四路线／72默认样本实际回归；原策略／seed不变，不宣称全部样本通关。源码／测试与TEST运行工具980文件SHA256：`02dcbb377a4b2504409f1cbb9de11c1cd737e78bbf29b621c4c33b774a625639`，后续不改已测字节。

L0打开／切换／Focus／关闭0 dispatch/current/native notice/read/write/draw/签发/消费；源搜索／无输入调查主点击1次各为1 dispatch/current/notice/write。合法快捷绷带上下文仍原opaque，1正式消费／写入，无refill；保存失败保最新内存，retry仅1 encode/write，0 dispatch/current/notice/draw。两类仓库外负控分别实际AssertionError exit1、逐类还原exit0，仓库源码和索引不变。

真实Edge155最终8/8组PASS，页面console warning/error=0；第一次受限GPU崩溃／CDP超时独立保留，不冒充浏览器验收。12张本轮新截图均逐张查看：桌面、390px说明／菜单／医疗参数、恢复提示、失败保存、样本护具支付／2×2放置均可读。A仍84条DOM公开步骤、Day4/HP2/样本交付/奖励120；B18条、Day2/HP11/合法止损，6次注入写失败与仅保存重试分账。同源同分区竞争、真实BFCache命中／显式重获、五停点刷新、两类敌终态死亡和当前生产dist忽略DEV参数均保留通过。浏览器controls/publications/IO不冒充原生S计数。

审阅ZIP（仓库外，42文件／12 PNG／41项payload清单）：

```text
C:\Users\zjl\AppData\Local\Temp\world-low-ui-r1-work-cacc0b1ef0924981b4c42020eee9af38\ENG-WORLD-LOW-ASSET-UI-001-R1-UI-REVIEW-ASSETS-v1.0.zip
```

大小3,865,123 bytes；SHA-256 `d0935de4bd653f2d6462c7534445c94469eb2899f066609415b29f899027b3da`。CRC及逐项bytes/SHA256全部通过；无profile／存档／浏览器二进制。逐图记录见[r1/visual-review.md](r1/visual-review.md)，实际计数见[r1/browser-results.json](r1/browser-results.json)，工程检查见[r1/verification-results.json](r1/verification-results.json)。

1669保护对象零变化，十份旧文档只追加；R1普通／暂存／起点增量要求raw exit0。历史ff2b79f仅W02一处raw exit2，8c19ca0累计仅W01七处＋W02一处raw exit2，不改原件，不增加例外。原负控／T02未全数重跑，记NOT RE-RUN；首次外部审计工具编码错误及未建报告链接的失败保留，最终范围／前缀／原件／链接／暂存blob另核。

本次按授权普通commit/push至原工程分支；准确完整SHA、parent/tree、远端全分支对比及CI在提交后外部收据／最终回复报告，不amend补写自身SHA。Owner体验、O3、真实OS配额/ACL／断电、其他浏览器、完整无障碍及最终美术NOT RUN。CI166依赖摘要2moderate/4high与本机audit404 UNCONFIRMED分别保留，未升级。停止等待准确SHA源码／浏览器／视觉复审，不自动进入下一阶段。
