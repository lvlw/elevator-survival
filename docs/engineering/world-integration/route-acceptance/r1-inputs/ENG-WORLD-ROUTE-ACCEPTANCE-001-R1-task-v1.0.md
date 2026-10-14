# ENG-WORLD-ROUTE-ACCEPTANCE-001-R1 完整限定返修任务书 v1.0

## 0. 目标与开工依据

修复E03-A验收基础设施两项问题：**F01默认CI长链超时，F02测试／程序异常被包装成路线正常结局**。一次完成复现、修复、自查、原生回归、冻结、负控、全量检查、报告及普通提交推送。不是新的世界设计或生产工程，不为全绿调参。

仓库`lvlw/elevator-survival`；准确起点`2258e1bad17ffb03297b691be51bf9bfe5883979`；起点parent`713dd376ddb60d20d9afaedaee4505e695f89d94`；tree`4c041d6a048acf5b7029f88e6f4bb4aaa8b87d24`。沿用`feature/world-route-acceptance-001`，不新建分支／worktree。

重新读取实际HEAD、branch、status、普通/cached diff及AGENTS。起点错误或有非本任务改动，报告精确情况，不reset/clean。读取本包审查及原E03-A任务、正式DEC049—052、world-content批次门槛、E02-S/R合同和当前新TEST实现。涉及候选查询术语仍遵循UIR当前约定，不新增玩家知识。

本任务已由主线按Owner既有权限下发。无需重新申请开工、逐字段或逐文件确认。

## 1. W1：保留真实基线并先复现

1. 实跑`npm run test:run`建立本轮基线。首先保留默认设置结果；可另外命令级`VITEST_MAX_WORKERS=2`建立对照，结束恢复环境。当前CI已知超时不要求工作停止在修前；保留实际失败用例与耗时，不要求本地恰好复制11个失败。
2. 读取CI156 run38451127806/job115482027719。官方执行为11个5000ms超时、4295通过、build skipped；不是作者两workers本地PASS被追改成失败。若状态／重跑已有变化，按attempt和准确SHA分别记录。
3. 将`evidence/native-exception-regression.test.ts.template`**原字节**复制至`src/content/infected-world-v0.1/acceptance/review-exception-regression.test.ts`，在修改route harness前先跑。模板包含9个原生用例，设置明确30s预算以免分类复现被旧5s预算干扰。
4. 模板调用真实read-null／S／默认种子：seed05真正死亡后再注入Error／真实Vitest AssertionError／带code异常；另在真实移动后注入未知code异常。不得改生产者、死亡后态、seed或draw来制造失败。TypeError／RangeError、合法死亡、成功和酒店条件不足是保护对照。
5. 模板在主线未原生执行，不能按主线16项隔离结果凑原生数字。导入、类型、fixture和超时不是异常分类语义失败；如实际已拒绝，记录最先拒绝点，不弱化校验。模板适配确有必要时先保存原字节尝试和故障，再记录最小适配，不删见证。

## 2. W2：F01测试执行时间预算及结构

### 2.1 本任务明确的局部覆盖许可

原任务禁止改timeout。现在主线基于CI实际5000ms失败，对以下文件中**完整原生路线／完整接续用例**，明确允许局部30000ms执行预算：

- `src/content/infected-world-v0.1/acceptance/route-hotel-bypass.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/route-hotel-benefit.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/route-segmented.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/route-toolbox.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/nine-combinations.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/cold-continuation.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/review-exception-regression.test.ts`

可以在相应test或明确的长链describe上设置，或引用可选TEST-only`e03-test-budget.ts`的命名常量。选择实际安装Vitest支持的写法；只使用既有依赖。

这不是放宽玩法断言：奖励、生命、费用、数量、来源、身份、完整结果比较、72分母及9种组合均不变。禁止全局改timeout/disable timeouts、改CI/配置/worker默认、旧测试加时、skip/todo/retry掩盖失败、删除慢种子、减少真实dispatch或读旧报告冒充实际执行。不得将本预算用来隐藏死循环；单用例仍有30s硬界限并报告最大/总耗时。

可在本批TEST范围内减少重复纯诊断序列化／明确fixture依赖，但每个默认样本仍从真实初始建立完整执行。四路线见证与cold接续必须各自保留完整语义验证；共享不可变真实前置须如实标记，不得将一次建立重复计作多次。不能手拼中间world或把setup测试的缺失当作正确业务失败。

### 2.2 CI与默认执行要求

修后至少一次在撤去本轮worker覆盖、与现有CI命令一致的默认环境下执行完整`npm run check`。修前/修后时间数据独立记录。默认测试失败时继续范围内修订；本地2workers通过不能替代默认CI结果。若受机器限制无法默认完成，明确报告范围及实际门槛，不能宣称F01关闭。

提交后核验准确SHA的CI；无法访问／仍在运行写UNCONFIRMED/in_progress，报告交给主线核验，不伪造PASS。网络失败可普通重试push，不自动改工作流、强推或amend追自身SHA。

## 3. W3：F02异常分类与真正路线结果

修复`e03-test-routes.ts`及必要的本批TEST policy/harness，不改P/R/S。

必须区分：
- 真正已提交success／death／合法失败／截止结果：据实际receipt记录，不凭异常字符串判定。
- 预先声明的路线条件缺失：如真实无消毒剂、合法材料不足，保留明确的route-stopped原因，不伪装死亡或已经失败结算。
- 确属当前实验允许捕获的业务拒绝：按已知类型、明确代码和步骤边界分类，并保存原始诊断；不能仅看任意Error的code属性。
- AssertionError、未知Error、程序／基础设施错误：**必须向外抛出，正常测试失败**。即便前一个真实动作已经死亡，也不得吞掉。

优先让真实终局通过显式正常返回结束route，而不是故意再执行非法动作再广泛catch。需要局部RouteStopped／RouteTerminal识别时仅TEST内小类型，不造通用框架。非法输入、伪能力、schema破坏和测试不变量失败不得一概当成玩家走错路。

本轮不能改变四条routePrefix/finishRoute的预编路线、合法选择策略、默认seed集合或随机算法来避开原问题。只允许终局后的控制流停止与错误传播所必需的调整；如真正发现生产/路线缺口，留下原生反例和WITH_FINDINGS，不调参或硬改expected。原63成功／9死亡作为旧作者记录保留；新执行结果如有变化须定位原因并单独报告。

原112项用例的验收意图、四route ID、72样本及酒店搜索记录必须保留。若重构setup组织确需改变技术用例计数，列清旧ID到新证据映射，新增／替换／删除分开，不以减少慢用例过关。原18份TS中的seed集合文件只读；其余不在白名单的旧测试全部只读。

新增原生保护包括：真实死亡不抛错、酒店缺条件不当死亡、成功不受影响；测试／程序异常在存活和死亡两类状态均失败；输入／current／真实死亡记录不被错误分类代码改写。任意code伪装不得通过。

## 4. W4：长链、冻结、负控与记录同步

1. 全部112原验收意图＋新增原生异常传播回归；原P/R/S及更早测试完整执行。
2. 四真实路线和全部72默认样本重跑，仍经S dispatch，不清敌、不替换current、不补物、不覆写draw。
3. 两轮冻结重跑：在运行前冻结本轮TEST源码、策略、共同seed集合；将规范化玩法报告逐字节比对。保留旧85份证据摘要、旧冻结manifest与新manifest分开。实际耗时不混入玩法字节一致性。
4. 至少两类仓库外语义负控：重新引入“death吞异常”应使原生错误传播测试失败；重新引入“任意code当route-stopped”应失败。失败必须业务断言，不能导入/fixture/超时冒充。原wrong-fee/wrong-restore控制可以重新执行并独立记账；未跑明确NOT RE-RUN。
5. 原作者4306本地PASS、原CI156失败、主线16项隔离、本轮作者原生与新CI各自记账。不能把所有异常/超时写成游戏角色死亡，也不累加成新增测试。
6. 查询矩阵和候选合同不因此获批。只需保留真实选择器泄露发现、支持分层与后续责任；术语可澄清4个领域phase／5类合法停点，active-world包含稳定与战斗决策点。不得实现opaque selector、公开新字段或偷偷下发下一工程。
7. 文档保留原历史；Markdown以追加R1为主；verification/route-results JSON若结构调整，完整保留旧对象到明确historical键，不回写过去结果。四共享文档仅末尾追加作者状态，不写主线已通过。
8. 只读审计告警仍是维护记录，本轮不需要重复audit或升级依赖。UI、浏览器、多标签、O3和Owner首玩OPEN。

## 5. 精确路径白名单（最多42条）

许可集合不是必须创建全部文件。新增TS仅TEST-only；除列出的新E03-A测试/helper，不修改任何其他生产或旧测试。可选budget helper不要求创建。

- `src/content/infected-world-v0.1/acceptance/e03-test-harness.ts`
- `src/content/infected-world-v0.1/acceptance/e03-test-routes.ts`
- `src/content/infected-world-v0.1/acceptance/e03-test-policy.ts`
- `src/content/infected-world-v0.1/acceptance/e03-test-observers.ts`
- `src/content/infected-world-v0.1/acceptance/e03-test-report.ts`
- `src/content/infected-world-v0.1/acceptance/route-hotel-bypass.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/route-hotel-benefit.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/route-segmented.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/route-toolbox.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/nine-combinations.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/cold-continuation.integration.test.ts`
- `src/content/infected-world-v0.1/acceptance/harness-contract.test.ts`
- `src/content/infected-world-v0.1/acceptance/review-exception-regression.test.ts`
- `src/content/infected-world-v0.1/acceptance/e03-test-budget.ts`
- `docs/engineering/world-integration/route-acceptance/completion.md`
- `docs/engineering/world-integration/route-acceptance/implementation-notes.md`
- `docs/engineering/world-integration/route-acceptance/verification-results.json`
- `docs/engineering/world-integration/route-acceptance/route-results.json`
- `docs/engineering/world-integration/route-acceptance/route-ledger.md`
- `docs/engineering/world-integration/route-acceptance/nine-combinations.md`
- `docs/engineering/world-integration/route-acceptance/query-contract-draft-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/query-field-matrix.json`
- `docs/engineering/world-integration/route-acceptance/next-engineering-contract-draft-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md`
- `docs/03-architecture.md`
- `docs/08-rule-implementation-traceability.md`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/ENG-WORLD-ROUTE-ACCEPTANCE-001-R1-task-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/OWNER-authority-and-scope-E03-A-R1-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/AUD-2258e1b-ENG-WORLD-ROUTE-ACCEPTANCE-001-review-v1.0.md`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/BASELINE-AND-SCOPE.json`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/SHA256SUMS.txt`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/source/e03-test-routes.ts`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/evidence/run-isolated-exception-review.cjs`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/evidence/isolated-exception-results.json`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/evidence/native-exception-regression.test.ts.template`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/evidence/ci156-failure-summary.json`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/evidence/ci156-observation-notes.md`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/evidence/input-integrity.json`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/evidence/source-integrity.json`
- `docs/engineering/world-integration/route-acceptance/r1-inputs/evidence/environment-notes.md`

旧`docs/engineering/world-integration/route-acceptance/inputs/`5份原件全部只读。新包14份文件全部原字节归档到r1-inputs的同名相对路径，包含source/evidence；SHA256SUMS只列其余13件，不要求哈希自包含。

所有未在上表中的路径不授权。实际需要额外路径，报告具体冲突；不提前扩目录、加依赖或改旧测试。

## 6. 最终验证、Git与停止点

- 原件SHA-256／Git blob、UTF-8、链接、原Markdown前缀和旧验证对象保全。
- 保护core/state/app/UI、全部旧代码／数据／规则、package/lock/CI对象；test-only无生产导入。
- 普通/cached/起点→最终diff-check为0。累计W01对`8c19ca0d28058cf743b41c8547cc2629c8eac767`真实exit2仅原两输入七处硬换行；不改原件、不配置忽略、不扩大。
- 允许同分支普通commit/push。禁止merge/main/其他分支push/force、改写旧提交、reset/clean非本任务改动。不新建worktree，不自行进入下一任务。

最终报告：起始/最终/真实父SHA/tree、全部修改文件、真实基线（默认及任何局部worker对照）、原生模板修前/修后、F01预算和最大耗时、F02分类规则、四路线／72样本、用例增删替换映射、冻结与负控、完整默认check及准确SHA CI、W01、未完成项、停止点。

**完成后停止，等待当前WebGPT准确SHA专项复审。查询合同归档／查询生产／UI／浏览器／O3均不得自动开始。**
