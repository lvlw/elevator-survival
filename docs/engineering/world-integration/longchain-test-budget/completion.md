# ENG-LONGCHAIN-TEST-BUDGET-001 完成报告

状态：LOCAL_DEFAULT_GATES_PASS；准确提交 CI 与主线源码复审在提交后单独核对，不提前宣称 F01 已获最终关闭。

## 起点与范围

起始 SHA／本批父提交：de8f358d2d281eb4ff914d6ebc20f16986164701；起始父 SHA：2258e1bad17ffb03297b691be51bf9bfe5883979；起始 tree：785c2b6b4fedd369d46feddb3313a6ca558967d5。分支 feature/world-route-acceptance-001，起始工作区／普通 diff／cached diff 全为空；没有新建分支或 worktree。

仅两处旧测试调用增加 30_000ms 第三参数，展开影响 3 项；测试仍为 242 files / 4318 tests，新增／替换／删除／净增均 0。12 条许可全部使用：4 modified / 8 new；生产文件、配置、worker 默认、CI、依赖和 F02 均不变。

## 实际执行

| 命令／证据 | 本轮实测 |
| --- | --- |
| 原样默认 test:run | 242 files / 4318 tests；4316 PASS / 2 timeout，283.85s，exit1 |
| 默认两文件定向 | 2 files / 10 tests PASS；逐项耗时见验证 JSON |
| 默认完整 check 1 | 242 files / 4318 tests PASS；282.93s；架构/typecheck/build PASS，exit0 |
| 默认完整 check 2 | 242 files / 4318 tests PASS；296.04s；架构/typecheck/build PASS，exit0 |
| 原 E03 额外原生定向 | 13 files / 124 tests PASS；含原112＋R1新增12、72共同默认样本；报告时标区间 211.331s |
| 仓库外语义负控 | 真实成功金额120误断言121，业务 AssertionError，exit1，2019.167ms |

默认基线失败精确位置：combat-longchain.integration.test.ts:7 的真实三敌任务链 5869ms；supply-longchain.integration.test.ts:19 的 success 展开 5290ms，均触发原5000ms。没有其他文件失败。全部命令没有 CI、VITEST_MAX_WORKERS、NODE_OPTIONS 或 E03_REPORT_DIR 覆盖；两次完整检查按固定顺序执行，源码中间未改，不以选择一次绿灯覆盖失败。

四路线、九组合、共同八seed及F02错误传播断言保持，实际124项全过。72样本仍按原断言63成功／9真实死亡；这是固定策略与有限样本，不是总体胜率或Owner体验。旧85份证据及其摘要原样保留，本轮未再生成替代大报告。

## 正文等值与负控

通过已安装 Rolldown 的 TypeScript AST 核验两个唯一标题调用：原2参数／新3参数，新增参数只为30_000。去掉新增参数后全AST deepEqual；从新文件移除新增逗号／参数后整份源码逐字节等于起点。callback文本及其SHA-256不变，具体blob与摘要见[验证记录](verification-results.json)。不是只说断言看起来没变。

负控只在仓库外完整测试副本改变金额断言，真实S成功链仍执行，得到 expected120/121 的业务AssertionError；无导入／fixture／超时错误。主仓库没有突变；副本其余4项被标题过滤，不计作仓库skip或新增验证。

## 历史、CI、审计

CI157 run38494359598/job115626633068 本轮重新读取 run/job/完整decoded日志，准确de8f358、attempt1、completed/success，242/4318全过，413.29s，架构/typecheck/build PASS。该新确认不改写作者旧UNCONFIRMED时点、本机旧4316/2失败或CI156 4295/11失败。

五份输入逐字节保全、四项给定SHA-256匹配，清单自身另计SHA-256/Git blob；最终index/commit原件、允许路径、链接和历史前缀在Git阶段复核。其余1403份tracked工作字节保持；786份TypeScript冻结指纹 7a40498b028d2263dffd0f1a29ef72bff532777b3f56826b7bc4a11e2698e7f8 在两次完整检查间与之后保持。两个共享文档仅末尾追加，历史JSON和85原始输出均未改。

普通／cached／起点至最终增量 diff-check 要求exit0并在交付回执复核；累计相对8c19ca0实际exit2仅原两输入七处硬换行，无新增例外。保留既有>500kB chunk警告，不改配置消警告。

默认Git/OpenSSL连接失败，单次命令Windows schannel读取远端成功；未改全局／本地Git配置或关闭证书验证。普通commit/push只当前工程分支，最终SHA/parent/tree、远端其他分支与新CI在提交后实际报告，不amend追自身SHA。

## 修改路径（12项）

- src/state/residence-session/combat-longchain.integration.test.ts
- src/state/residence-session/supply-longchain.integration.test.ts
- docs/engineering/world-integration/longchain-test-budget/completion.md
- docs/engineering/world-integration/longchain-test-budget/implementation-notes.md
- docs/engineering/world-integration/longchain-test-budget/verification-results.json
- docs/engineering/world-integration/route-acceptance/completion.md
- docs/engineering/world-integration/route-acceptance/first-play-and-release-gates.md
- docs/engineering/world-integration/longchain-test-budget/inputs/ENG-LONGCHAIN-TEST-BUDGET-001-task-v1.0.md
- docs/engineering/world-integration/longchain-test-budget/inputs/OWNER-authority-and-scope-LONGCHAIN-BUDGET-001-v1.0.md
- docs/engineering/world-integration/longchain-test-budget/inputs/AUD-de8f358-ENG-WORLD-ROUTE-ACCEPTANCE-001-R1-review-v1.0.md
- docs/engineering/world-integration/longchain-test-budget/inputs/BASELINE-AND-INPUTS.json
- docs/engineering/world-integration/longchain-test-budget/inputs/SHA256SUMS.txt

## 未完成项与停止点

本轮范围内无未完成实现或规则冲突；本机默认门槛两次通过，不宣称生产性能已优化或任何负载都通过。准确新SHA CI和主线复审属于提交后核验／审查。安全查询合同与生产、UI、浏览器、多标签、玩家入口、O3、Owner首玩与分段体验仍未批准／未执行；不启动后继工程。

过程、工具尝试及外部原生日志定位见[实施记录](implementation-notes.md)和[结构化验证](verification-results.json)。
