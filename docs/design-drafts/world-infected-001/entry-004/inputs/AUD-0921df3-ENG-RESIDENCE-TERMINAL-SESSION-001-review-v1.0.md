# ENG-RESIDENCE-TERMINAL-SESSION-001（C）：准确提交源码／headless 恢复实审

标识：AUD-0921df3-ENG-RESIDENCE-TERMINAL-SESSION-001 / v1.0。
评审日期：2026-10-05。结论：**PASS（原 C 契约限定范围），无需返修。**

## 1. 结论与直接推进

C 的显式 v2 会话、共享 domain、首次创建／出发、既有 G2 操作、A 完整终局、B 预编码及冷恢复、同步端口保存故障和重入边界符合本项任务。此结论不是五图可玩、完整战斗医疗、浏览器保存或 Owner 体验通过。

下一批主线下发 WORLD-ENTRY-004：在已存在的世界设计和本次实际代码之上，集中收口真实五图任务生产者、战斗／医疗／物品消费、三专长／工具箱及近期工程准入材料。该任务仅做设计与隔离验证，不自动采纳新规则或参数，不启动下一生产工程，不合并 main。

## 2. 固定对象、权限和范围

```text
repository = lvlw/elevator-survival
commit = 0921df3f219f368479d1bf3401d8fecddc0d5f71
parent = b9b1e0fee0e779669ca40e088ac9a867016bff82
tree = f835130ec111dcb387619168cd8bfccce7c72963
src_tree = 98c840dd0b6b1a6cc014df4ac9165bc94bf2c794
branch = feature/residence-terminal-session-001
message = feat(state): commit residence terminal sessions
```

已从 GitHub 核对提交、父提交、tree、目标远端及全部十二个当前分支引用。main 仍为 a76e9c1c998051fc1643b6e0c3d53443fa55feed；设计、A/B、G1—G4 等原十一参照保持原值。本地工作区／暂存区干净属于作者交付回执，主线不声称访问 E: 盘。

提交改动 32 路径，位于原最多 33 条白名单内。新增生产文件 9 份、测试 8 份及测试 helper 1 份；旧生产仅 session.ts 的共享 domain 抽取。另有本项报告与输入、四份既有文档附记。可选 terminal-owner.ts 未创建。旧 v1 的 command／codec／测试未被改写，A/B、首身份、G1/G2、依赖、规则和配置不在该提交差异中。

依据包括本项原任务包、DEC-049/050/051、终局恢复补充和 A→B→C 门槛。原任务包五件输入实际重新计算大小／SHA-256／Git blob，与准确提交目录对象匹配；详见 evidence/input-fingerprints.json。

## 3. 源码与测试审查

### C01：同一技术域只有一个写入者

新增 domain.ts 只拥有 issued／claimed 技术注册，不拥有 current、余额或历史，无 release/reset。旧 session.ts 改为共用检查及占用；新 terminal-controlled 直接重导出原 createResidenceSessionDomain。新组合先验证并捕获受控策略、同步端口和 factory/provider，最后占域；无效组合不提前消耗 domain。

terminal-compatibility.test.ts 覆盖 v1/v1、v2/v2、v1→v2、v2→v1、伪造域、无效组合后仍可合法构造。它证明单运行时同域，不证明浏览器跨标签锁。

### C02／C03：真实首次链和驻留操作

terminal-launch.ts 在执行材料 provider 前检查身份、首次阶段、声明／目录、revision 与 A 全奖空间；真实首次激活、G1 depart、G2 建立各一次。当前合法 fresh 钱包本来为 0，高余额容量负例正确分成 A 窄查询、C 实际守卫故障注入及坏 fresh 拒绝，未放宽 B 造伪正例。

terminal.integration.test.ts 从 read-null、createFirst、launch 出发，经过来源揭示、真实整实例搬运、跨图、C 休整、回访取物、H0 失败返回和字符串冷恢复，共十二次完整提交。它不是五图成功通关。成功资格采用 A/B 受控内容夹具，是本任务明许的消费者证据。

G2 移动／揭示／拾取／留置／休整均使用既有生产者。非 G2 的余额、仓库、委托和历史从旧 current 承接；E0 合法免费操作保持。非零到达效果不再照搬旧 v1 的统一拒绝。活着的待战斗仍明确拒绝整体安装，未被宣传为玩家避战机制。

### C04／C05：四终局和一次原死亡消费

H0 正常成功／失败经 A 调用 G1，保留 steps=[]、不补夜，错误终局意图不自动转为另一种结果。Day7 异地稳定截止由 A/G1 执行真实有序日结，生还 ready、死亡短路、不生成旧任务 Day8。

terminal-transitions.ts 在行动前从完整 current 建立 A authority。收到 G2 原计划后先验签发；death-required 分支先交 A consume，再检查 A 完整计划，最后才交 B。未把 active＋HP0 中间提案塞进 B 活态校验，未重做动作／周期／随机或额外推进 revision。

原生测试分别覆盖移动、固定／随机揭示、A/C 休整、感染／饥饿和 primary 到达死亡；以对象同一性断言确认交给 A 的就是真实生产者原计划。到达死亡的 pending 仅作为被动历史保留，不启动战斗。

### C06—C09：完整预编码、唯一提交、失败和重入

terminal-session.ts 只有一份闭包 current。合法后态先 validateTerminalResidenceAggregate，再 serializeTerminalResidenceSave，再替换 current、尝试 write、分发一批只读通知。复制签发计划、错误前态或编码失败不得半安装；编码失败与提交后的存储失败不混淆。

写失败保留新 current，后续规则继续用它。retrySave 只重新编码及保存最新值，不回读旧档、不补规则、不通知。监听异常用被动诊断隔离，不撤销终局。所有变更入口均在 BUSY 守卫内，读取／factory／provider／规则／编码／写入／通知期间重入被拒绝，查询和取消订阅不产生游戏结果。

同步端口是明确前提；异步函数被拒绝，普通函数返回 Promise 的违约被诊断而不宣称同步成功。本审查不承诺任意恶意异步端口的执行隔离或真实进程崩溃的绝对恰好一次。

### C07／C10／C11：恢复、历史和信息权限

bootstrap 仅无 current／unbootstrapped 可用；retryRead 仅无 current 且 read-error／blocked 可用；只有真实 null 后才允许 createFirst。有 current 即使写失败也不能再次 bootstrap、retryRead、createFirst 或替换。四态字符串冷恢复不执行规则／随机／保存／通知。

两声明测试的旧成功／失败／deadline 及第二活动由已有真实纯生产者建立，C 从该合法冷状态继续消费，旧收据／处分／归档保持。旧 ready 不能免除第二活动的应有休整后果。C 本身不开放第二 launch 或任务供给。

普通值导出、受控值导出各两个，命令九类；不提供 setCurrent、install、grant、close(outcome) 或任意 patch。queryKnowledge 与 queryTerminalEligibility 复用正式安全查询；getState／订阅中的完整 current 是 headless 诊断，不是玩家 ViewModel，不能直接交新 UI。

## 4. 证据分层与实际执行

| 来源 | 本轮证据 | 边界 |
| --- | --- | --- |
| 作者当前本地 | 基线 139 文件／3135 项；定向 41／1099；最终 147／3274；新增 139、替换 0、删除 0；check 通过 | 读取作者记录，不冒充主线完整复跑；失败修订经过保留 |
| 远端准确提交 CI | CI #139，run 37224337424，job 111500765574；完整日志核对架构 51 DEC／257 core、类型、147／3274、构建成功 | 与作者分开，重复执行不累计新增测试 |
| 主线源码阅读 | 9 份新增生产、8 份测试、helper、旧 session 接缝、范围与报告，原任务逐项对照 | 不称全仓库或全部组合无缺陷证明 |
| 主线字节检查 | 5 件输入原件完整指纹；实际隔离执行的 3 件 TS 源码 Git blob 与准确提交一致 | 未逐字节复跑作者全部 888 对象／24 链接审计 |
| 主线独立控制流执行 | 47 项，47 符合预期，0 失败；Node v22.16.0／TypeScript 5.8.3 | 执行原样 C 会话／域／类型；底层规则、查询、command、校验、codec 均是明确替身，不是原生 G1/G2/A/B 或全量 npm |

主线隔离检查覆盖同步组合、占域、无档与恢复生命周期、完整提交前故障、写失败保内存、最新值重试、冻结隔离、不同阶段／重入、监听和冷安装。其 47 项不是新增生产测试，不能与作者 139 或 CI 3274 相加。

主线容器没有原生完整仓库／所需依赖；直接 Git 取仓尝试遭 DNS 失败。实际证据由可访问的 GitHub 准确提交、CI 全日志和本包隔离复现组成。没有运行主线全量 npm、真实浏览器存储、多标签、Owner 试玩或依赖安全审计。

CI 保留既有 chunk 警告及 npm 的 4 项依赖审计提示（2 moderate、2 high），还有 runner action 运行时警告；本提交未更新依赖／阈值，本 PASS 不等于安全审计通过，不借此插入未授权升级。

## 5. 不关闭的后续门槛

真实五图图谱与任务件／设施／转运生产者、战斗进出与持续敌人、实际药食／维护／三专长／工具箱、低资产游戏 UI 和安全提示、浏览器读写及多标签、O3 旧入口／旧槽和人工体验仍有独立责任。

当前代码的来源整实例校验与医疗消费／拆合、待战斗恢复／死亡签发等接缝，下一设计批需明确检查及提出必要扩展，不能以旧代码临时不支持为新玩法永久上限，也不能仅删除拒绝条件冒充接线。

生还角色仍只有当前具体委托内容；无新任务停静态中枢，不因无内容判死。38 项已批准配置（G1 34＋终局 4）保持；未批准商品／服务／医疗／地图／战斗／专长数值不随 C PASS 生效。

## 6. 复核包使用

附件包含原样会话控制流源码三件、Git 指纹、47 项探针脚本与原始输出、输入指纹和范围／CI 摘要。它不是完整仓库或浏览器复现包。运行方式及被替换依赖写在 evidence/README.md；原生玩法保证主要由源码阅读和准确提交 CI 回归支持。

无需 C 返修；不合并 main。主线按既有任务下发权限交付 WORLD-ENTRY-004，仅文档与隔离验证，完成后准确 SHA 实审，采纳／正式归档／生产仍各有门槛。
