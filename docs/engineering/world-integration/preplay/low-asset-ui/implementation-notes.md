# ENG-WORLD-LOW-ASSET-UI-001 实施记录

## 起点与 W1

- 实际 HEAD：`0ac23bc3654d69c3d0a6289d5d9e97ce30c69164`，原分支 `feature/world-browser-owner-001`，工作区及暂存区为空。
- 新分支：`feature/world-low-asset-ui-001`。六份包内原件经原核验脚本 exit0，按原字节归档。
- 实跑默认 `npm run test:run`：287 files / 4554 tests PASS，348.74s；未设置 worker、NODE_OPTIONS 或 timeout。原始日志在仓库外本轮 work 目录。
- Node v24.9.0 / npm 11.6.0；读取 AGENTS、GDD/VS/Architecture/DEC、当前 UIR 与三正式 preplay 合同及实际 player/controller/browser 源码。

## 接缝与最小详细设计

现有 PlayerRequest 已支持所有正式参数，但 PlayerAction 只给 family/label/method/cost。配方、维护总池、多输出几何与有条件医疗目标没有公开输入说明。仅增加受当前 opaque action 绑定的纯 `describeAction` 通路；同源配置/纯资格给出输入候选，正式 inspect/execute 仍最终裁定。未知搜索输出不进入说明；隐藏医疗资格不用于筛选。

React 通过 effect 生命周期创建一个 browser owner，稳定订阅桥仅保留安全 snapshot；StrictMode 的清理会停用旧 owner，重挂创建新 owner，不复用已 dispose 对象。默认入口不构造新 owner；新 DEV 分支在医院模块动态加载/存储/bootstrap 之前选择。旧 preview 优先。

| 操作 | 视图与参数 | 选择来源 | 提交 |
| --- | --- | --- | --- |
| 初选/首次出发 | 三工具、三专长显式选；已初配锁定 | 静态公开目录 / 当前安全 view | confirmSetup / execute |
| 单边移动、休整 | 当前 Travel Cluster / 身体说明 | 当前公开 action | execute，必要保护由 controller 决定 |
| 搜索/容器/任务方法 | 房间就地方案、工具、材料、声明产物格位 | describeAction + 真实 carried handles | 一次完整 PlayerRequest |
| 普通整实例 pickup | 点击后未旋转 row-major，逐格正式 Preview | 真实 ground handle | 仅首合法请求 execute 一次；无位置手动 |
| 任务取得/搬运、交易 | 显式格位/旋转/多输出 | 声明几何 + 真实 handle | execute，不使用 first-fit |
| 整理/拆合/快捷/留置 | 真实 footprint、右键及键盘菜单，显式源/目标/数量/槽 | 安全 carried/ground + 输入说明 | execute；关键任务留置用既有保护 |
| 六类药食 | 显式实际物品、公开伤口 ordinal/挫伤目标 | 输入说明；隐藏目标 Preview unknown | execute，不自动选目标或批量 |
| 维护/充电 | 实际材料、目标、机械共享总池分配 | 同源说明 + 正式 Preview 支付 | execute，一次消费 |
| 战斗 | 当前意图/阶段/相对顺序/快捷行动 | 已有 combat actions | execute，不读取敌 HP/CTB |
| 四终局 | 正式终局选择与结果 | terminal DTO / metadata | execute→必要 confirm，无自动后继 |
| 保存重试/重获独占 | 保存失败/占用/失锁独立系统条 | 当前 browser owner | retrySave / acquire，禁止重发玩法 |

## 展示安排

中央房间/战斗为主舞台；已知地图为辅助只读图，正式单边移动在 Travel Cluster。右侧携带面板装备/背包切换、两个快捷位常驻。详细结果/机制在局部层，最近六条安全 Feed 可见；窄屏堆叠完整可达。

当前战斗 DTO 不提供敌人安全名称/definition，因此不按地点、意图或内部身份猜贴图；使用中性对手占位。已公开且准确对应的物品/房间资产可复用，不冒用护工扮演其他敌人。

## 验证记录原则

原生/真实 DOM/真实浏览器/截图/Owner 体验分账。两条 DOM 长链必须操作真实 React 控件，不能以 owner.execute 或路线 helper 代替。W01/W02历史原件保持；本批所有新差异要求 raw exit0。保存故障注入与真实 OS 配额失败分账；未经实际执行的 Gate 记 NOT RUN。

## 自查修订与失败保留

- StrictMode 的同步 effect 探测最初会使第二 owner 撞上本页尚在取得的旧锁。新 hook 仅把首次 acquire 排到可取消微任务，清理先停用旧 owner；不为外部 occupied 自动排队或重试。
- 新 TEST 驱动最初按纯按钮文字匹配，未容纳按钮内资源说明；又曾把新 current 的 opaque handles 当作稳定身份追踪同名堆叠。修订仅在新 TEST 驱动：按完整可访问动作匹配，整实例拾取以公开新增占格对应 DOM tile，不跨 current 重用句柄。不动旧 E03 策略或 helper。
- B 链最初 charged→escape 未产生伤势，绷带没有合法目标。新 UI 测试改为真实 basic→charged→escape，先实际受伤，再立即维修和绷带；未改生产规则或强设伤势。
- 真实正常 H0 返回调用周期入口一次但 steps=[]；新测试原先把“没有过夜”误等同函数零调用，现分别断言入口一次、空 steps、任务日／cycle 不变。没有给正式结果添加假步骤。
- CSS raw/inline 在 Vitest 被 stub；新样式契约测试以 TEST-only 源码读取检查局部样式，不增加依赖或改工程类型边界。其他初期新测试中的中文材料名、严格候选 value 包装和 AssertionError 构造问题已保留失败并修正，未弱化旧断言。
- 第一次真实浏览器运行 browser-1：5/6 组通过，补充死亡组因新 TEST 按钮文字匹配失败；第二次 browser-2：6/6 组通过。最终加入生产构建忽略 DEV 参数、真实键盘／地图与完整运行时指纹后另跑 browser-3，不以旧轮次代替最终字节。
- 默认 full-check-1：309 files / 4647 tests、architecture/typecheck/build 全通过，测试 307.61s。其后独立复核发现新 SystemScreen 以 view 真值分流，合法 outer checkpoint 但坏 v4 payload 被错误引导到 synchronize。修前原生 DOM 用例实际失败；只改新组件按安全 status/reason 区分 load-blocked 与 projection-error。新增三项回归覆盖坏档重试读、有 current 的投影重建零 IO、读失败重试不发物，7/7 faults 定向通过。最终全量检查须另记，不把第一轮数值改写。
- 仓库外三类语义负控实际执行：隐藏 data-* 身份泄露、移除 pointer double-click 抑制、移除非 DEV guard，分别由隐私、重复休整计数／任务日、入口隔离 AssertionError 检出。三类共四个具体 AssertionError，逐类恢复后定向 PASS；仓库与 Git 索引不变。没有把导入、类型、fixture 或超时算语义检出。

维护边界：没有修改 P/R/S、domain、G1/G2、v4、旧 CTB、参数、旧测试／helper 或依赖。唯一新增 core production 文件是纯输入说明；其余旧 src 的差异仅入口接线和只读委托。最终实际数字、指纹和 NOT RUN 以 verification-results 与 completion 为准。
