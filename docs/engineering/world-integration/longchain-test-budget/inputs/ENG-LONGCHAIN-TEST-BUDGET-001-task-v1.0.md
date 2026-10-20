# ENG-LONGCHAIN-TEST-BUDGET-001 完整任务书 v1.0

## 0. 目标、依据与停止点

一次收口两个旧state测试文件中的完整长链执行预算，以及本机默认检查欠账。不是重做E03-A、再次修改F02或生产性能优化。

起始准确SHA：`de8f358d2d281eb4ff914d6ebc20f16986164701`

起始父SHA：`2258e1bad17ffb03297b691be51bf9bfe5883979`

起始tree：`785c2b6b4fedd369d46feddb3313a6ca558967d5`

沿用分支：`feature/world-route-acceptance-001`。不新建branch/worktree，不在其他分支交付。

依据：原E03-A-R1任务§2.2的默认检查门槛、本包准确SHA复审、Owner已有任务下发权限。本批允许普通commit／push到同名分支；不合并、不推main／旧分支、不强推。

F02已经专项通过，不再改`e03-test-policy/routes`。CI157的准确SHA已经远端4318项全过，不再写成最终UNCONFIRMED；但原作者当时无法核验、其本机4316通过／2超时的记录都保留。

## 1. W1：重新实查与基线

1. 核对本包摘要、实际HEAD/branch/status/普通及cached diff；读取实际AGENTS及其要求的正式入口。若工作区有非本任务改动，先报告，不reset/clean/覆盖。
2. 重新读取两份目标测试、其helper、实际package.json/测试配置和原R1报告。本任务不批准改变helper、配置或规则。
3. 记录Node/npm/Vitest、OS、CPU可用并发及实际测试环境变量；确认没有本任务重复启动的测试进程竞争。不要关闭Owner其他程序或擅自杀进程。
4. 以默认设置实跑一次`npm run test:run`。移除本任务临时worker覆盖并在结束恢复原环境，不改任何全局设置。既有超时不阻塞进入明确的两处预算修复；记录实际失败和耗时，不要求恰好复现2项，不把超时算成游戏死亡。
5. 只读核对CI157 run38494359598/job115626633068；失败的CI156与作者旧日志不能追改。网络不可用时沿用本包已核验回执并说明本次未再查询，不伪造新PASS。

## 2. W2：仅两处测试调用的局部预算

**本条是主线本次明确新增的写权限，不需要再向Owner申请。**

A. `src/state/residence-session/combat-longchain.integration.test.ts`：

只给标题为`read-null to three true CTB victories, real production/install/sample and H0 success uses only S`的普通`it`调用增加第三参数`30_000`。

B. `src/state/residence-session/supply-longchain.integration.test.ts`：

只给标题为`danger-cleared TEST cold prestate, ALL actual tasks/moves, failed install/save and %s`的`it.each(['success', 'voluntary-failure'])`调用增加第三参数`30_000`。这覆盖展开后的成功／主动失败两个长用例，不增加新用例。

两份原blob应分别为：
- combat：`64a9a5407944efa684128e3bec5980f9c1a6de02`
- supply：`c9c9cf3a46cf12ec888b7a97e5fb1d58f444a8f3`

要求：
- 只加这两个第三参数；可在紧邻处加一句说明局部长链预算的TEST注释，不进行格式化或重排。
- 测试函数体、断言、原ID、数据、旧TEST危险已解除前态的表述、辅助文件与其他测试都保持。不得修改P/R/S或缩短真实执行链。
- 不把30000ms变成全局timeout，不关闭timeouts，不改worker默认、retry/skip/todo、CI、package/lockfile或依赖。
- 不从content验收目录导入预算常量到state，避免增加无关跨层依赖。此处直接明确数值即可。
- 用去除所增第三参数后的源码token／AST比较，证明可执行测试正文与起点完全一致；注释可单独忽略。不能只说“看起来没改断言”。
- 两个文件共10项测试，预算调整展开影响3项；新增／替换／删除／净增均为0。不要把改预算包装成新增3项验证。

这修复的是检查执行预算的适配，不证明生产性能已经优化；默认CI曾经通过也不等于本机负载余量足够。

## 3. W3：默认完整门槛与对照

固定采用以下检查，不靠反复抽取一次绿灯：

1. 两份目标文件原生定向10项，默认设置，记录每项耗时。
2. 在最终测试字节冻结后，顺序完成两次默认完整`npm run check`，中间不改源码。全部测试必须执行；记录两次通过、失败、耗时和运行环境，不更改默认并发来代替要求。
3. 原E03-A的112项＋R1新增12项、四路线与72共同默认样本必须在完整测试中实际执行；原ID／策略／seed及错误传播测试不改。原85份证据摘要保留，不要求再造一套大报告或重搜seed。
4. 在仓库外临时副本任选一个目标长链，将真实成功金额断言从120改成错误值121，定向执行须得到业务AssertionError、exit1。主仓库保持未突变；不以导入／超时／fixture失败当负控成功。此项不是生产bug，也不是新仓库测试数量。
5. 若出现其他旧文件超时、语义失败或30秒仍不够，记录精确位置并停止相关收口。不得将许可扩成全仓加时，不升级依赖，不调规则；不得隐去失败只报后一次成功。
6. 新提交后核验准确SHA CI。能查询到的阶段和最终状态如实报告；仍运行或网络失败写UNCONFIRMED，不为追自身SHA循环amend。提交可以交付待审，但只有真实门槛满足才能建议关闭F01。

## 4. W4：审计、历史与Git

- 使用本任务精确12路径白名单；其余Git对象保持，包括F02、全部E03测试/helper、P/R/S、格式、规则及配置。
- 归档本包5份输入，逐字节及SHA256／Git blob核对，包含清单本身；清单只列其他4件。
- 新增本任务完成报告、实施记录及结构化验证JSON；日志可在仓库外保留并给出命令、退出码、实际摘要与定位。
- 仅在原route-acceptance的completion与first-play-and-release-gates末尾追加本次状态。历史失败、本次CI确认及新结果按时间／SHA分开，原字节前缀保持。
- 架构、类型、全量测试、build按真实package.json执行。保留既有大chunk与依赖告警，本次不负责修复。
- 普通、cached、起点至最终diff-check必须exit0。累计相对8c19ca0的W01保留真实exit2，仅原两输入七处硬换行；不改原件或新增例外。
- 普通commit/push仅现有同名分支；核对父SHA、tree、远端及工作区，其他分支不变。不要merge/rebase/amend/force。

## 5. 精确路径白名单（12条）

- `src/state/residence-session/combat-longchain.integration.test.ts`
- `src/state/residence-session/supply-longchain.integration.test.ts`
- `docs/engineering/world-integration/longchain-test-budget/completion.md`
- `docs/engineering/world-integration/longchain-test-budget/implementation-notes.md`
- `docs/engineering/world-integration/longchain-test-budget/verification-results.json`
- `docs/engineering/world-integration/route-acceptance/completion.md`
- `docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md`
- `docs/engineering/world-integration/longchain-test-budget/inputs/ENG-LONGCHAIN-TEST-BUDGET-001-task-v1.0.md`
- `docs/engineering/world-integration/longchain-test-budget/inputs/OWNER-authority-and-scope-LONGCHAIN-BUDGET-001-v1.0.md`
- `docs/engineering/world-integration/longchain-test-budget/inputs/AUD-de8f358-ENG-WORLD-ROUTE-ACCEPTANCE-001-R1-review-v1.0.md`
- `docs/engineering/world-integration/longchain-test-budget/inputs/BASELINE-AND-INPUTS.json`
- `docs/engineering/world-integration/longchain-test-budget/inputs/SHA256SUMS.txt`

新目录是本任务写许可，不声称已存在。除以上路径，任何新增或修改都须先报告精确冲突，不把整目录当白名单。

## 6. 完成报告与停止点

报告必须包含：起始／父／最终完整SHA和tree、分支、修改清单；实际默认基线；两处参数修改及正文等值证明；目标10项与两次全量默认结果；新旧测试增量（预期0）；负控业务失败；输入及范围／历史前缀／W01；准确SHA CI实际状态；仍未关闭项。

本项只整理测试执行预算，**未授权查询合同归档、查询生产、UI、浏览器、多标签、玩家入口、O3、第二委托或新阶段**。完成后停止，交当前WebGPT主线准确SHA复审。不让Owner逐文件、逐命令协调，也不自动执行后继任务。
