# E02-P-R2 准确SHA专项源码复审 v1.0

日期：2026-10-13。
结论：**PASS。F03关闭；承接前轮F01/F02修复及本轮保护回归，E02-P可进入独立E02-R工程。**

## 1. 准确基线与适用范围

- 受审提交：`9ada1bd76c768b7bcff676b263e4533854064909`。
- 父提交／本轮起点：`8512c991adb353775ffa4785599a011e419a81fa`。
- Tree：`8a0c09f43fb3be66a2ff07cf64b928aa6e1a7862`。
- 远端分支：`feature/residence-combat-core-001`，本轮连接器实读仍指向受审SHA。
- 报告和实际提交显示32文件：9修改、23新增；其中20件是原件归档。不是新增了13632行游戏逻辑。
- 本结论是F03专项复审，承接前轮已经完成的P及R1阅读；不宣称重新逐文件完整审计此前全部实现。
- 没有修改用户仓库、推送、合并或执行生产开发。用户本地status与其他分支未变属于作者报告；主线直接核对的是远端受审引用和提交对象。

## 2. F03修复为何成立

唯一生产差异在`src/core/residence-supply/shared-maintenance.ts`。

旧实现把资源恢复和材料消费后的私有主效果候选交给`context.read(next)`。这时G1尚未提供完成动作的身体和revision，最新战斗记录与角色revision相同，正确的最新资源保护会把合法维修候选误认成已完成检查点的篡改。

新实现保留原配方、资源恢复、总池、目标、费用与精力资格检查；然后调用真实`supplyBodyAction`，把真实身体／revision和主效果组合完整，交原`context.issue`签发。

防护没有被删除：

1. `planCombatMaintenance`先经`stable`和`readAuthorizedCombat`验证完整原始before及独立authority；不能用维修给非法before背书。
2. 生还提案进入`issueCombatPlan`，再次调用完整`readCombatValue`并要求外层revision恰好增加1。
3. 维护HP0进入既有稳定死亡分支：先校验原供给事实及真实BodyStep，一次关闭／处分，再经同一完整签发层读取final dead。不公开HP0活态，不丢真实恢复和材料消耗。
4. `trace.ts`最新资源绑定、`history-context.ts`／`history-queue.ts`和F01/F02校验均保持原字节，没有skipValidation、任意revision参数或额外玩家空命令。
5. 旧供给维护仍由旧协议自己的原始读取、签发和死亡消费承担原责任，不把新CombatValue删字段冒充旧SupplyValue。

本轮没有发现需要再次返修F03的阻断项。普通读取对已经完成的当前值继续严格；合法私有候选不冒充可安装状态。

## 3. 原生测试阅读：作者证据，不算主线执行

完整阅读了三份新增测试的正文与相关签发／旧协议接缝：

- `review-maintenance-regression.test.ts`：29项。原七项模板保留，材料在入场前由实际来源取得；真实CTB退却／胜利后立即修管、修外套；工具箱与充电、15总池多目标／部分恢复、错误命令、原始资源篡改及后续再入／死亡／H0返回。
- `review-maintenance-purity.test.ts`：6项。真实调用计数、维护致死保留恢复与材料、非法before零生产、无效配方的部分纯求值、非法私有资源后态到最终验证时拒绝，未谎报此前已经调用的纯函数为零。
- `review-maintenance-compatibility.test.ts`：3项。旧Supply协议的真实来源／维护、生还与旧死亡消费及协议互拒。

作者实测：起始201文件／3781项；最终204文件／3819项；新增38、替换0、删除0。命令级`VITEST_MAX_WORKERS=2`，没有改旧测试超时／配置。此前默认并发超时仍是历史失败，不被后来的低并发通过覆盖。

原模板修前5通过／2失败、修后7通过，以及作者仓库外两类原生负控，属于作者的原生执行记录；主线本轮没有在完整仓库重复执行这些Vitest命令。

## 4. 主线实际执行与结果

### 4.1 同一32项隔离见证的前后复跑

沿用R2输入包的冻结32项检查。旧source保持原件；修后副本只应用准确提交的实际维修差异，并逐文件重算Git blob和SHA-256，与连接器在受审SHA返回的指纹对照后才执行。

| 源码 | 实际结果 |
| --- | --- |
| R1起点`8512c991…`七份原样源码 | 32项：28符合、4误拒绝、0异常；exit1 |
| R2`9ada1bd…`七份准确字节源码 | 32项：32符合、0不符、0异常；exit0 |

原F01/F02的20项裁剪见证继续全部符合。四个立即维修见证（胜／退×机械／外套）均恢复为合法，原始资源篡改仍拒绝。所有输入及TEST依赖值保持不变。

维护见证观察到资源恢复、配方候选、G1适配器及签发适配器各1次；这些是隔离适配器计数，不能替代作者真实原生函数计数。

### 4.2 独立外部语义负控

基于修后副本分别执行，不改仓库：

- 恢复旧中途完整读取：4个立即维修正例重新失败，28符合／4不符，exit1、异常0。
- 删除最新资源保护：2个原始资源篡改见证被误接受，30符合／2不符，exit1、异常0。

这两组是主线的隔离负控，不是重跑作者的原生2／3失败命令，也不与旧P／R1负控累计。

### 4.3 证据边界

实际执行7份原样TS：`history-context.ts`、`history-queue.ts`、`history.ts`、`trace.ts`、`validation.ts`、`stable.ts`、`shared-maintenance.ts`。

脚本用TypeScript转译函数正文；外层schema、供给聚合、授权／签发外围、资源、配方、G1和部分基础工具仍是明确适配器，输入是裁剪TEST见证。**不是原生完整`readCombatValue`／CTB／G1／来源守恒／npm或持久化测试。**

主线容器尝试获取完整Git仓库时因`Could not resolve host: github.com`失败，退出128；连接器读取仍正常。因此没有主线全量npm执行，未编造容器生产测试结果。

## 5. 输入与字节核验

从当前对话真实挂载的三份ZIP，独立重算每个blob及递归目录Git tree，与准确提交直接读到的目录比较：

| 归档目录 | 件数 | 独立计算／远端相同tree |
| --- | ---: | --- |
| `active-combat-core/inputs` | 5 | `e59555f0f0edf35bf20a3b8070934a9c609f1f87` |
| `active-combat-core/r1-inputs` | 16 | `b062407a753397964026257977cd81f7372a18cc` |
| `active-combat-core/r2-inputs` | 20 | `ce7b4596dc935c09502206414c5a3618fe46c0f1` |

41份原件全部匹配。此项证明这些原件目录的完整字节，不等于完整仓库归档或Project Sources同步。

本轮源码blob：新维修`f98e81469f9cf74d027f7d531210f030fcd72752`；最新资源保护`68effd34e29472b29424f5434c42e741c6915a75`、完整读取`8b96d1a500ceee1e68351da7a927576ec7512ddb`及签发`5f99f787ef48317c7fc217f24298b4fc29cbabde`保持。

作者40路径白名单、历史文档前缀、链接及完整范围外对象审计没有在主线全套复跑。主线读取了实际提交差异、唯一生产改动、三份新增测试和相关上下文；不得把作者全部检查写成主线新执行。

## 6. CI与保留告警

准确SHA对应CI #152，run `38278040514`，job `114908222086`。本轮连接器直接核验为`completed / success`；architecture、typecheck、test、build四步骤均success，不再是作者当时观察的in_progress。

本轮核验的是workflow／job阶段状态，未重新下载CI完整日志以独立统计3819项；3819是作者完整本地检查记录。两者不叠加为新增验证。

W01承接原两份输入七处Markdown硬换行的既有批准；作者累计检查仍为exit2，R2增量exit0。主线未在完整Git副本重跑该累计命令，不将其写成全部干净。构建大chunk仍是作者保留告警，不本轮调阈值。

## 7. 下一步及不得越过的边界

**E02-P在本专项审查范围收口，可从受审SHA单独下发E02-R。** 正式依据为已有`active-combat-restore-contract-v1.0.md`与`active-combat-batch-plan-v1.0.md`，不是重新批准玩法。

E02-R须以真实P值实现独立`formatVersion=4`，绑定候选外expected、五类完整停点和实际场次死亡；严格区分旧G1／供给死亡和combat-death，保留F01/F02/F03回归。已经完成的资源值必须严格验证，但真实P继续行动产生的新完成值不能被旧记录误拒绝。

E02-R没有current或存储写权；E02-S继续保留独立会话／保存故障实审。E03真实路线／九组合／安全查询，浏览器、多标签、UI、Owner试玩与O3均未通过本审查。

## 8. 可核查来源

以下均锁定本报告受审SHA，可由仓库实读；本报告不替代这些正文：

- `src/core/residence-supply/shared-maintenance.ts`，原始输入与主效果至最终签发顺序。
- `src/core/residence-combat/stable.ts`、`plans.ts`、`authority.ts`、`validation.ts`、`trace.ts`，原始before／最终值／死亡接缝。
- `src/core/residence-combat/review-maintenance-*.test.ts`，作者原生三文件。
- `docs/engineering/residence-foundation/active-combat-core/completion.md`、`implementation-notes.md`、`contract-and-support.md`，作者分层记录。
- `docs/engineering/residence-foundation/active-combat-restore-contract-v1.0.md`，R01—R06。
- `docs/engineering/residence-foundation/active-combat-batch-plan-v1.0.md`，B02—B05。
- GitHub commit／ref与CI #152实际连接器读取。

复核附件提供独立前后执行、负控、七份源码指纹和41份原件指纹。没有原生npm／浏览器／Owner试玩证据。
