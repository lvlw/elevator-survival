# ENG-WORLD-PLAYER-QUERY-001 准确提交实审 v1.0

## 结论与适用范围

**PASS（本项 headless 玩家查询／选择接缝的限定源码实审）；未发现需要本轮返修的阻断项。**

- 受审完整 SHA：`394f59d3c5df2a65ce87186e8988982d76784a71`
- 父提交：`8cddbdc3243561aaef5eb9a4eb6bd74dcbca11f3`
- Tree：`0431a7f73abe7ce99c070887f6872489007175f0`
- 工程分支：`feature/world-player-query-001`
- 主线核验时远端同名分支指向上述提交。
- 本结论不批准新感染阶段阈值、UI／浏览器接入、O3、第二委托或后继生产开工；工程通过不等于完整 E03 或 Owner 试玩通过。

本轮使用实际 GitHub 提交、源码、作者原生测试及正式任务 ZIP，不以完成报告代替源码。主线没有取得可执行完整仓库，所有独立执行范围在下文明确；本结论不是无遗漏证明。

## 一、源材料和本轮审读

已完整读取实际任务包的任务书、权限和精确路径文件，及已批准查询合同的 24 字段和 Q01—Q12 工程责任。以本次精确 SHA 读取提交差异与关键源码，重点包括：

- `src/state/residence-session/player-facade.ts`、`player-context.ts`、`player-commands.ts`、`player-validation.ts`、`player-errors.ts`、`player-preview.ts`、`player-queries.ts`。
- `src/core/residence-combat/player-query.ts`；location 的 `player-knowledge.ts`、`items.ts` 及既有放置 owner；task 的 `player-query.ts`、`qualification.ts`、`shared-sources.ts`、`plans.ts`、`validation.ts`；supply 的 `player-query.ts`、`inventory-qualification.ts`、`medical-qualification.ts`、`cycle-adapter.ts`、`shared-validation.ts`；terminal 的 `player-query.ts`。
- 新增 `player-phases`、`player-fields`、`player-preview`、`player-stale`、`player-dispatch`、`player-privacy`、`player-compatibility`、`player-persistence` 测试及 `player-test-fixtures.ts`；查阅原 supply inventory 的真实 27/28/29 与拆合保护。
- 作者 `contract-and-support.md`、`verification-results.json` 和提交中的完成报告。

这是重点实读范围，不声称逐行完整重审所有旧 P/R/S、全部 58 文件、全部历史测试或 1410 个保护对象。作者的全范围字节审计、51 项新增测试、134 项 E03／预算回归及全量 4369 项，分别保留其作者身份。

## 二、关键判断

### 1. 选择器及对象绑定

`player-context.ts` 为当前对象生成冻结的 `{ selection: 'opaque' }` 句柄。实际身份保存在私有 Map，解析使用对象引用，不使用原 ID 的编码或哈希；不匹配／用途不符时没有替代目标。查询不建立或修改此表。

`player-facade.ts` 在显式建立、恢复或执行后的同步位置更新上下文，且 preview 先核对 owner.current 与 context.value 引用一致。未提交失败保持原句柄；已提交值更新后旧句柄失效，即使保存失败也不回到旧视图。retrySave 不重新构造上下文。

`player-commands.ts` 只在受控侧组装现有严格命令。用途白名单、显式材料／目标／位置和真实快捷单位绑定保留。普通 facade 的 resolve 只返回安全资格 DTO，不返回原命令或 authority。

### 2. 查询、未知信息与真实资格

实际投影使用白名单组成字段，不是序列化 current 后删除顶层 seed。当前位置、known edges／调查事实、本地来源、真实携带及终局摘要分别投影。敌人阶段复用现有 `selectEnemyHealthPhase`，没有另造三敌阈值；相对时间线只表达当前关系，不模拟下一行动。

隐藏 infectionProgress／pending 暴露不能直接成为 Preview 的 enabled 或详细拒绝原因。当前两类隐藏目标医疗保持 unknown；明确执行仍交原 S 正式校验。这是本合同已允许的界限，不能由本次实审升级为新的隐藏状态披露保证。

任务／来源／医疗／维护的纯资格抽取与原生产 owner 相连；背包几何调用既有放置函数。专项未发现通过 query 调用生产计划、CTB resolver、随机或消耗来试算的路径。旧语义全量等值仍以作者所跑保护回归和 CI 为证据，不冒称主线已重跑。

### 3. 保存及回调

新 facade 委托唯一旧 S；不自己签发完整玩法计划、安装 current 或实现 writer。已有 P 的最终死亡由 S 原路径完成，查询侧不追加死亡消费／奖罚。

write／原生通知回调期间，玩家读入口显式返回 transaction-in-progress；不会把旧上下文装作最新可执行。上下文构造失败时，已提交玩法不回滚、不再次保存，后续读为 projection-unavailable，程序错误仍可观测。

**UI 接线提示（不是本批新增阻断）：** 当前 `player.subscribe()` 在原生提交通知内取 query，所以收到的可能正是 blocked 视图；execute／受控 bootstrap／retry 返回时的视图才是本次完整结果。下一 UI 合同必须明确何时刷新 ready 视图，不能未经验证就把 subscribe 当作完整的 React 可渲染 store，也不能因此增加第二次 gameplay 通知、保存或提交。该行为在作者 player-persistence 测试中明确断言。

### 4. 需要继续保留的未完成门槛

- body.infectionWarning 仍明确 unknown：尚缺新世界已批准的公开阶段／提示映射。不能因界面需要自行定阈值、搬医院终末规则或用 unknown 宣称安全。
- 23 项公开映射／1 项 unknown 是本批作者实现分类；并不代表所有未来 UI Ghost／行动后果预测均已存在。
- 浏览器冷启动如何取得候选外独立材料、真实持久化及多标签 writer 防护，尚未工程验收。
- 当前只一份委托；无后继不等于死亡，也不生成继续委托按钮。
- UI、Owner 首玩和分段突破体验、O3 都未因本次 PASS 关闭。

## 三、主线实际独立执行

### 三份完整源码的 40 项隔离控制流检查

三份 target 文件：player-facade、player-context、player-commands。分别核对完整 Git blob 与实际提交相同；脚本读取原样全文后 TypeScript 转译，未改源码再测试。

- baseline：**40/40 符合，0 非预期异常**。
- 句柄泄漏负控：仅在仓库外转译输入中增加 rawId，**3 项业务断言失败，exit1**。
- 无匹配句柄 fallback 负控：仅在仓库外增加替代绑定，**9 项业务断言失败，exit1**。
- 涉及 opaque 载荷、引用稳定、复制／JSON／跨上下文／冷恢复拒绝、用途、显式命令材料与快捷单位、一次委托调用、未知资格显式执行、写失败后最新引用、retry 不重放、回调重入、错误传播和投影失败不回滚。

**执行限制：** 原 S、policy、core 聚合、完整资格、Zod 描述符解析、实际 24 字段投影和持久化使用明确的 TEST 适配器。此 40 项不是完整原生 P/R/S、51 项作者 suite、72 种子或全量 npm 复跑。没有把适配器自身的领域正确性计为生产证明；未知输入的 Zod 行为仅审读源码与作者原生测试。

### 原件指纹

从本会话实际 `ENG-WORLD-PLAYER-QUERY-001-Codex-Package-v1.0.zip` 读取原始 bytes：5 文件 blob、4 条给定 SHA-256及整个归档目录树均与精确提交匹配。目录 tree 为 `04ebc69109b4bfa2a6219481559303b9cf17f8ec`。该证明不扩展为所有工作区或暂存区都被主线直接读取。

### CI

- Run：39477235530，CI160，attempt1。
- Head：本次精确 SHA。
- Job：118816243673。
- 主线实际读取 run 及 jobs：completed/success；architecture、typecheck、test、build 均 success。
- **未下载完整日志重新统计**。252 files／4369 tests、432.29s是作者已披露的 CI 统计，不冒称主线独立重数。

## 四、环境、审计和停止

主线容器 Node v22.16.0；Git 2.47.3。GitHub DNS 解析实际失败。完整仓库归档获取也未成功，未建立原生执行仓库；没有运行 npm test/check、架构、浏览器、真实存储、多标签或 Owner 试玩。没有写入远端仓库、创建分支或改变 Owner 本地文件。

累计 W01 继续按原先两份输入七处硬换行的既有许可处理；作者真实 exit2 和本批增量 exit0 不互相改写。本轮没有新空白例外。

本项无需返修。建议下一步仅进行“首个可玩入口前的条件提示、UI更新时点和浏览器启动／保存合同”集中定稿候选，待必要 Owner 选择与准确 SHA 审查；不把本 PASS 当作这些生产实现授权。

## 可核对定位

- 提交：`https://github.com/lvlw/elevator-survival/commit/394f59d3c5df2a65ce87186e8988982d76784a71`
- CI：`https://github.com/lvlw/elevator-survival/actions/runs/39477235530`
- 本附件 evidence 下包括 source-integrity、input-integrity、ci160-summary、三种隔离运行 JSON和原样执行脚本。
