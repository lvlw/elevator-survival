# ENG-WORLD-PRESENTATION-C2-001 工程交付

工程实现与自动检查完成；原生功能/五档 CSS 几何已验证，**截图像素证据为 PARTIAL**。本报告不作主线验收、正式发布或后续素材采用批准。准确最终 commit、parent、tree、push 与该 SHA 的 CI 见交付消息及外部 `REPORT-FINAL.md` 回执；本文件不能包含自身 commit 的自引用 SHA。

## 起点、授权与 W0

- 仓库 `lvlw/elevator-survival`；分支 `feature/world-presentation-c2-001`。
- Base `4f349d97024151ac79aa099425ce83217ef47b31`；base tree `3ddf6b8097e9dec899dd3e3dc7de7c149672c930`。起始工作区、index、未推提交清单均为空。
- 任务 ZIP 在仓库外解压前，核对安全路径、CRC、manifest 的全部 9 个载荷文件的字节/摘要；10 个输入原件保存在 `inputs/`。包未提供 verify-package.py；执行的是 manifest 实际校验，未虚称运行不存在的脚本。ZIP SHA256 `d5bdac15cd96ee39d1557836d7648c7554b257b2c074f88a6e4fb954f3307217`。
- 完整读取本包 Owner 批准、TASK、合同、矩阵、SCOPE、15 图清单；复读真实 AGENTS、四份正式设计/架构/决策文档、相关 content，以及 UI 当前约定与相关 UIR（012/013/015）。没有创建 DEC/UIR。
- Owner 本轮批准三敌五态 15 图仅供独立 DEV 有限采用，玩家 v2 延期。旧 19 项 catalog 差异 patch 仍未应用。推荐配置是 GPT-6.1 Sol/high/Standard；本运行无法从工具独立确认模型 SKU、推理档及计费服务档，实际值记录为 UNCONFIRMED，不把推荐值当实测配置。工具协作模式 Default，Windows/PowerShell，Node 24.9.0、npm 11.6.0。
- 实际基线 `npm run test:run`：337 文件 / 4,858 测试通过，327.27s。原始回执见 `evidence/raw-logs.json` 的 baseline-test-run.log 项。

## W1：15 图入库与封闭映射

15 个 PNG 从 `8c962f90d9e4ef01ab46a5fc4b970d93c7c45c96` 精确复制到 `src/assets/presentation/world-battle-v1/`，合计 13,907,305 字节。源 Git blob、SHA256、字节、原生尺寸、candidate/registration 固定来源均核对，详见 `art-source-verification.json` 和批准清单。护工 1024×1280；装卸工重伤图为 **1121×1403**，其余装卸工/技术员图为 1122×1402，未统一重采样。

`approved-enemy-art.ts` 使用 15 个显式静态 import、冻结的三组五槽表和 own-property 检查；只从 A 的 known/visualKey 和合法 enemyStage 选择。未知、非法阶段、constructor/toString/__proto__ 都回退，不从地点、名称、Feed、HP 或 trace 推断。CI 入库测试读取当前 checkout 的 PNG 和批准清单，不依赖历史 Git 对象或网络。注册仅使用原 1536×1920 画布的 left/top/width，完整 PNG 等比呈现；没有裁图、改 alpha、修图或动画。

## W2：整组准备与真实接线

- 每个有效准备代只为当前组启动 5 个原生 Image；全部 load、native dimensions 和 decode 成功才整组 ready。任何成员失败、decode 拒绝、尺寸不符、显示错误或固定 10,000ms deadline 都使整代中性且终止重试。缺 Image/decode 能力保守回退，不吞程序错误。
- 同组换阶段、rerender、retrySave、C1 skip/reduce 不重准备或重置 deadline。真正新挂载可建立新代。StrictMode 的旧代、旧事件/解码/timeout 和旧阶段 DOM error 均被隔离。
- render 当下同时检查当前合法 key/stage、ready 组及有效挂载/代；不依赖事后 effect 清图。combat=null 的原组件退出立即清图。没有保留死亡/胜利后的失能姿态。
- JS 自持资源限当前组，无历史 Map；取消清监听/timer/不再需要的对象引用。已经开始的网络/解码不宣称物理取消，也不宣称 GPU 即时释放。
- BattleStage 只替换原敌人图层。原 name/stage/intent/timeline、玩家中性占位、ActionButton 顺序与 opaque 请求绑定保留。图片被动、无焦点/点击、无命中效果。尺寸同时受 actor 区可用宽高限制，未缩小正文或修改 Shell/Feed/HUD/C1 动画。
- 本批未修改 core、A/B1、BrowserOwner/controller、S/current、保存/expected、依赖、CI、入口或旧素材。原背景保持基线行为，不是本次采用。原 `main.tsx` 仍仅在 DEV 门控下进入此 UI；默认 build 成功不等于 C2 已纳入发布入口。

## W3：实际检查

| 检查 | 实际结果 |
| --- | --- |
| 新增及两处旧测试定向 | 8 文件 / 80 测试通过 |
| 合同指定组合（UI/preplay/browser/session/E03 acceptance） | 143 文件 / 1,234 测试通过，326.70s |
| 负控还原后的默认 npm run check | 架构 53 DEC / 347 core 文件通过；typecheck 通过；343 文件 / 4,929 测试通过；build 通过。测试阶段 395.53s |
| M1 任一图 ready 冒充整组 | 指定 loader 业务断言失败（exit 1） |
| M2 去掉 render 当前 key 约束 | T07 业务断言失败（exit 1） |
| M3 去掉有效代约束 | T08 迟到回调误伤业务断言失败（exit 1） |
| M4 篡改专用 TEST 清单副本摘要 | PNG SHA256 绑定断言失败（exit 1），不是语法/import 失败 |

四项负控均在 finally 中逐字节恢复，前后 SHA256 一致；未改批准原图。原始失败日志与还原摘要见 `evidence/raw-logs.json` 的 M*.log 项、`negative-controls.json`。初轮新测试的 helper 原型键取值、错误 revision 取值和测试类型问题已修正；保留初轮日志，没有删/skip 旧测试或放宽其他断言。

### 原生 React 浏览器

使用 Owner 本轮明确允许的现有 Edge **本地测试标签**，只访问新 origin `http://127.0.0.1:5232/`。运行原 Vite config、main.tsx、DEV React、BrowserOwner 和正式 PlayerSession/P/R/S。TEST 驱动只在本目录，未替换 Image/decode/A 视图或把静态评审页当游戏。补充 checkpoint 由真实生产者和 strict codec roundtrip 构造；标记隔离 origin，遇未标记数据拒绝覆盖。

24 个命名原始采样、原生逐帧日志及 6 张原 API JPEG 在 `evidence/`。已验证：

- read-null → 明确 setup → 真实开门/移动 → 护工战斗；真实防御和攻击后换受伤图。
- 装卸工真实入场，HTTP 延迟 11s 时键盘防御只增加 1 次保存/1 条反馈；超时后迟到 200 响应不能复活图片。真正冷挂载才重新准备并显示。
- 技术员真实活动场景，5 个 PNG HTTP 503 整组回退，仍可防御；新挂载正常加载后，实际攻击切到受伤图。
- 退却立即清图。原“本命令将导致死亡”知情确认保留，Tab 到确认/Enter 后实际 HP=0、终局无敌图；未人为设零来伪造姿态。
- 明确 TEST quota fault 产生真实保存失败，动作已生效/图片继续显示；retry 只保存、无第二条反馈，冷恢复零写入/零重播。
- 所有 14 个 ready 命名采样的 PNG 与公开名称/阶段对应、native 尺寸正确、pointer-events:none；alpha≥128 主体在实际 figures 内，动作区在视口内，无横向溢出。五档 CSS 视口 1920×1080、1600×900、1440×900、1366×768、1280×720 都实际运行。

| 原图 | CSS 视口 | API 原始像素 | 像素门槛 |
| --- | --- | --- | --- |
| 03-orderly-1920-ready.jpg | 1920×1080 | 1920×1080 | PASS |
| 05-orderly-1366-wounded.jpg | 1366×768 | 1366×768 | PASS |
| 06-orderly-1280-wounded.jpg | 1280×720 | 1280×720 | PASS |
| 12-porter-1600-ready-after-cold-mount.jpg | 1600×900 | 1600×569 | PARTIAL |
| 14-technician-failed-action-1280.jpg | 1280×720 | 1280×455 | PARTIAL |
| 15-technician-1440-ready-cold-mount.jpg | 1440×900 | 1440×512 | PARTIAL |

旧标签调试连接中断时停止了重复控制；Owner 自行关闭/重开 Edge 后明确允许一次重试，新标签恢复。新会话原 API 图含空白区域且像素不匹配；六张均保存原 bytes，没有补边、缩放、拼图或修图。故本批**不能整体宣告视觉 PASS**。准确像素/大小/SHA256、几何审核见 `browser-audit.json`。临时 viewport 最终 reset 成功；无安装/扩展/profile/OS 设置变更，未读取其他标签内容。服务已停止。

HTTP 日志三组分别只有各自 5 个不同 PNG。首次 200 Content-Length 合计护工 4,198,037、装卸工 5,144,681、技术员 4,564,587 字节；护工后续 20 个 304、装卸工 5 个 304、技术员另有 5 个明确故障 503。最初 ResourceTiming 数组为空，以 HTTP 原始日志记账；后续仅扩大 TEST ResourceTiming 观察容量。PNG 字节和 RGBA 算术均不是浏览器/GPU 内存测量，也不承诺 StrictMode/浏览器缓存只发一次请求。

15 槽的 renderer 覆盖不冒充 15 种原生可达状态。C16 系统 media=true、真实 zoom、390 继续 **NOT VERIFIED**，未重做同一无能力补验；Owner 完整体验 **NOT RUN**。

## 验收矩阵与 W4

| 项 | 结果/证据 |
| --- | --- |
| T01 | PASS：准确 base、clean 起点、实际基线 |
| T02 | PASS：15 图 exact-byte/native/placement admission；W0 Git 源核对、M4 |
| T03 | PASS：封闭 own-property identity/stage、unknown/原型键测试 |
| T04 | PASS：all-five gate 与 M1；未把测试全部留在 pending |
| T05 | PASS：load/decode/dim/display/timeout/missing capability，原生 503/迟到 |
| T06 | PASS：同组阶段/rerender/retry/skip/reduce 不重准备 |
| T07 | PASS：同步当前组约束与 M2 |
| T08 | PASS：代/卸载/StrictMode/旧 DOM error/旧 timer，M3 |
| T09 | PASS：pending/failed/ready 真实原 controls 链的一提交/一写入/B1；原生等待/失败动作 |
| T10 | PASS：退却/胜利/死亡/失权/冷恢复/保存失败重试（自动）；原生退出/死亡/重试/冷恢复 |
| T11 | PASS：3 敌原生活动/动作与 15 renderer 槽分账 |
| T12 | PASS：完整有序 DOM 比较同公开阶段的不同实际敌 HP、真实 seed、隐藏病程/暴露；公共变化正控 |
| T13 | PASS：仅两处允许旧测试迁移，旧 gameplay/死亡/隐私断言保留 |
| T14 | PASS：原 DEV React/正式事实、真实 PNG；见 24 采样，非静态评审页 |
| T15 | PARTIAL：五档 CSS 几何已验；三张新会话截图像素不匹配，原样保留 |
| T16 | PASS（有界行为/可得传输观察）：不宣称硬内存/GPU 测量 |
| T17 | 本地 PASS；准确交付 SHA 的 CI 另见最终回执 |
| T18 | 四个 existing 白名单文件；15 PNG、4 runtime、6 新测试/1 fixture 和本目录新增。3,252 个基线文件仅此四处改动；69 个既有本地项目 refs 不动。远端 push 前 35 refs 原始快照已保全；push 后精确核对另见最终回执。宿主内部 refs 仅记录 |

自查确认 action nav/player/C1 样式未改，原图/旧 catalog/规则/协议/保存/依赖/CI 均未改；无 merge/force/旧分支 push/新美术/发布。本批不重复源码 ZIP、全 patch 或整仓对象清单，主线从本分支 GitHub 精确 SHA 审查。

仍需主线审查准确 SHA 与实际视觉；新会话截图像素门槛 PARTIAL、上述 C16/Owner 门槛未收口。完成后停止，不自动进入 B2、整套 C、玩家/背景采用、合并或发布。

原始 CLI 输出以 `evidence/raw-logs.json` 无损封装：每项含原始文件名、字节、SHA256 和 base64；utf8View 供直接阅读。这样保留工具输出末尾原始空行，同时不放宽默认 git diff --check。原生 HTTP/逐帧 JSON-lines 日志仍为原字节文件。
