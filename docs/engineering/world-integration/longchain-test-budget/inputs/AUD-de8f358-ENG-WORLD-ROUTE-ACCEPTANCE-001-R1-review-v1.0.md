# E03-A-R1 准确提交专项复审

受审 SHA：`de8f358d2d281eb4ff914d6ebc20f16986164701`

父 SHA：`2258e1bad17ffb03297b691be51bf9bfe5883979`

Tree：`785c2b6b4fedd369d46feddb3313a6ca558967d5`

分支：`feature/world-route-acceptance-001`

## 1. 结论与有效性

**R1限定源码修复通过；整体交付维持 WITH FINDINGS。F02关闭；F01的E03局部预算与默认CI故障已修正，本机两项旧长链默认执行欠账尚未关闭。**

没有发现需要继续改写异常分类或真实路线策略的阻断项。保留四路线及共同八seed／九组合的有限验收资产；不宣称总体胜率、最优策略、完整E03、UI、浏览器保存或Owner首玩通过。

此前没有实际读取本提交、仅依据完成报告作出的“深审通过”“CI仍未确认”“不需要立即修”等回复，不作为主线准确SHA实审依据。本报告依据本轮实际远端读取和独立执行重新形成，替代那些无来源支撑的状态判断。

下一项限定为旧长链测试预算收口，不是再次返修F02。此前禁止修改的两个旧文件，须由新任务明确增补许可；不能从本报告推导通用测试／性能／CI改造权限。

## 2. 本轮确认的远端事实

- 提交、父提交、tree与分支引用均匹配交付。提交diff包含37条路径，全部落在原R1的42条许可集合内。
- `src/core`、`src/state`、`src/app`、`src/ui`目录Git对象与2258e1b基线一致。因此，本次R1没有引入这些生产实现或旧state测试的源码变更。
- 原5份任务输入和R1新14份输入，分别从实际上传ZIP重建完整Git目录对象，与受审提交匹配：`fdf6de42db496cd9d91af9d676c0009ec8c7c4b3`、`c1b1bc5200342bc3758af626d7c67e29e6a42c40`。两个SHA256清单同时核对通过。
- 未直接读取Owner本地磁盘。工作区干净及其他远端分支不变仍以作者交付记录为证；本轮独立确认了本工程远端引用。

## 3. F02源码与原生测试审阅

实际阅读当前 `e03-test-routes.ts`、`e03-test-policy.ts`、未改动的 `e03-test-harness.ts`、新异常回归和冷恢复测试，以及预算文件、相关diff与作者记录。

### 3.1 正常领域终局与测试异常已分离

`executeRoute`不再根据“当前角色已死亡”或任意`Error.code`吞错。仅识别：

1. TEST内部的`CommittedRouteTerminal`：类型、真实最新收据引用、当前revision与phase同时匹配；
2. `active-world`且无活战斗时的明确`RouteConditionMissing`。

其余异常原对象重抛。最后据真实收据形成`death`并清空failure，仅在正常返回或上述合法控制信号之后执行，不会重新截获已重抛的AssertionError。

`requireActiveRoute`位于后继移动的邻边查找、取物查找及休整后继续之前。这使真实死亡可以停止预编路线，而不必先制造另一个非法命令再广泛catch。私有控制信号是TEST流程机制，不是可持久化领域事实或生产权限。

### 3.2 原生模板适配有实际依据

新回归在真实`makeHarness/send`返回点观察原S已提交的死亡后再注入错误；没有把“没有触达fight注入点”算成语义检出。测试检查注入确实发生一次、捕获的正是原错误对象，以及已提交current、disk、write、notify不变。

作者原模板3通过／6失败中5项未到达注入点；最小适配后修前5通过／4语义失败，修后12通过，保留为作者证据。CI157实际执行了这12项并通过。它们与主线隔离检查分别记账，不相加称新增原生测试。

### 3.3 相邻检查

`cold-continuation`改为按路线惰性创建真实前态。单独按标题过滤某条接续测试时，不再依赖前一个setup测试恰好运行。缓存的是已经通过真实路线建立的前态／检查点，不以手拼快照代替路线。原策略正文与共同seed集合没有为吞错修复而改写。

此判断不把所有可能的恶意TEST代码都纳入防御保证；正常错误传播、终局停止、错收据／旧修订号控制信号属于本次检查范围。

## 4. F01：新的CI事实与未解决的本机欠账

主线通过实际run、job和**完整job日志**核实：

- CI157：run `38494359598`，attempt 1，job `115626633068`；准确SHA为de8f358；最终`completed / success`。
- 默认命令为`npm run test:run`／`vitest run`，日志步骤未设置本轮worker覆盖。
- **242 files／4318 tests全部通过**；耗时413.29秒。
- 架构52 DEC／329 core、typecheck及build均通过；大chunk告警保留。
- 旧combat长链首用例4202ms；旧supply长链成功3437ms、主动失败2818ms，均在该CI运行中通过。
- E03四路线单项约6238／6543／7523／6352ms，均在明确批准的30000ms局部预算内通过。

必须同时保留作者本机事实：默认check为4316通过、两项保护旧S超时（6513／5102ms），exit1，build skipped；其后独立build通过。**远端通过不改写这次本机失败，也不证明默认预算在不同机器／负载下已经稳定。**

源对象未变、定向原样通过、CI默认全量通过，支持“现有长链执行预算余量不足／受运行负载影响”的判断；但没有做CPU／内存剖析，不能据此断言全部根因已经定位，或排除既有性能成本。测试wall time也不是玩家单次点击耗时。

本轮不将整体F01标为完全关闭。推荐仅为两个旧文件中三个展开长链用例明确赋予30秒硬预算；正常规则与断言不变。下一提交须重新完成默认完整check并核验准确SHA CI，不能只选择一次绿灯覆盖失败历史。

## 5. 主线独立执行

已执行的43项检查使用两份完整Git指纹匹配源码中的六个原样AST声明：`CommittedRouteTerminal`、`isTerminalCurrent`、`requireActiveRoute`、`isCommittedRouteTerminal`、`RouteConditionMissing`、`executeRoute`。

| 执行 | 结果 |
| --- | --- |
| 原样R1选段 | 43符合／0断言失败／0程序异常，exit0 |
| 仓库外重新引入death吞错 | 17业务断言失败／26对照通过，exit1，0程序异常 |
| 仓库外重新引入code吞错 | 8业务断言失败／35对照通过，exit1，0程序异常 |

覆盖合法成功／死亡／失败控制流、存活及死亡后的Error／AssertionError／带code错误／非Error、条件停止的合法与非法上下文、错收据引用／旧revision／错phase／其他当前值信号。检查保留输入引用及值不变。

**边界：routePrefix、finishRoute、makeHarness及快照等依赖是明确的适配器。这不是原生P/R/S或完整路线执行。** 主线容器实际拉仓库时DNS失败；没有在容器复跑124项、72条样本或全量npm。远端CI原生、作者本机原生及主线隔离证据严格分开。

复现：设置`TYPESCRIPT_PATH`指向已安装TypeScript后，在附件目录运行`node evidence/run-review.cjs`；两个可选参数为`death-swallow`和`code-swallow`。源码完整Git blob会先核对。

## 6. 保留与停止点

- 四路线与72样本仍为固定策略／固定有限seed的原生验收，不升级为九组合平衡或首次玩家体验。
- 查询选择器泄露、24字段支持分层及下一查询合同保持候选状态。本次没有批准新玩家知识，也没有下发查询／UI／浏览器工程。
- W01仅原两份归档七处硬换行；累计exit2仍真实保留。主线本轮没有在完整checkout重跑累计diff，因此W01具体行告警沿用已核验历史及作者本轮记录，不冒称本轮独立全量diff执行。
- 不要求Owner重新选择已批准玩法或逐项协调技术问题。

**立即安排：ENG-LONGCHAIN-TEST-BUDGET-001。只收口既有三条展开长链的执行预算与检查记录；完成后准确SHA实审，再审定安全查询后续。**

## 7. 精确来源定位

所有仓库链接均锁定受审SHA，不以分支未来内容替代：

- `src/content/infected-world-v0.1/acceptance/e03-test-policy.ts`
- `src/content/infected-world-v0.1/acceptance/e03-test-routes.ts`
- `src/content/infected-world-v0.1/acceptance/review-exception-regression.test.ts`
- `src/content/infected-world-v0.1/acceptance/cold-continuation.integration.test.ts`
- `src/state/residence-session/combat-longchain.integration.test.ts`
- `src/state/residence-session/supply-longchain.integration.test.ts`
- `docs/engineering/world-integration/route-acceptance/completion.md#e03-a-r1`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/ENG-WORLD-ROUTE-ACCEPTANCE-001-R1-task-v1.0.md` §2.2
- CI：`https://github.com/lvlw/elevator-survival/actions/runs/38494359598`

附件`evidence/ci157-summary.json`为主线读取完整日志后的摘记，不是完整日志原字节归档。作者完整链接、CPU归因、逐个受保护对象检查未由主线重新执行的部分，不借本报告升级为独立验证。
