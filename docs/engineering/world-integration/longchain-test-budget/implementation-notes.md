# ENG-LONGCHAIN-TEST-BUDGET-001 实施记录

## 依据与边界

起点 `de8f358d2d281eb4ff914d6ebc20f16986164701`，父提交 `2258e1bad17ffb03297b691be51bf9bfe5883979`，tree `785c2b6b4fedd369d46feddb3313a6ca558967d5`；沿用 `feature/world-route-acceptance-001`，初始普通／cached diff 和 status 均为空。

完整读取本包[任务书](inputs/ENG-LONGCHAIN-TEST-BUDGET-001-task-v1.0.md)、[权限记录](inputs/OWNER-authority-and-scope-LONGCHAIN-BUDGET-001-v1.0.md)、[准确 SHA 复审](inputs/AUD-de8f358-ENG-WORLD-ROUTE-ACCEPTANCE-001-R1-review-v1.0.md)、[基线及 12 条许可](inputs/BASELINE-AND-INPUTS.json)、[摘要清单](inputs/SHA256SUMS.txt)。五份输入原字节复制，清单四项 SHA-256 全部匹配，清单自身另计摘要与 Git blob。

重新核查 AGENTS、GDD、Vertical Slice、Architecture、相关 DEC-049—052 与 Content 边界、两目标测试、combat/supply fixtures 与 routes、package.json、vite.config.ts，以及原 R1 任务与实际完成记录。本任务不改玩法、生产性能、F02、任何 helper 或 E03 测试。

## W1：实际默认基线和环境

Windows 10 Pro；Node v24.9.0；npm 11.6.0；Vitest 4.1.10；OS availableParallelism=12。CI、VITEST_MAX_WORKERS、NODE_OPTIONS、E03_REPORT_DIR 均未设置；未调整全局或命令级测试并发。普通进程清单读取首先被沙箱拒绝，随后获准只读 CIM 核对：只有本任务的一棵 Vitest 主进程／worker 树，没有重复测试主进程；没有停止 Owner 程序。

原样默认 `npm run test:run`：242 files / 4318 tests，4316 PASS / 2 timeout，exit 1，283.85s。两个失败均为本次指定调用：combat 完整三敌任务链 5869ms；supply 成功长链 5290ms，均触发原 5000ms 硬预算。没有其他文件失败，不把超时当角色死亡。

CI157 本轮重新实际读取 run 38494359598、job 115626633068 和完整 decoded job log：准确 de8f358，attempt 1，completed/success；242 files / 4318 tests PASS，413.29s，架构／typecheck／build PASS。原作者当时网络不可用的 UNCONFIRMED 和本机 4316/2 失败仍是当时真实记录，不追改。CI156 的 4295/11 超时失败也保留为独立历史。

## W2：唯一源码增量及正文等值

仅在两份原调用闭括号之前加第三参数：combat `},30_000)`；supply 参数化调用 `}, 30_000)`。后者仍为 success、voluntary-failure 两次展开。合计影响 3 项，文件仍各 5 项；新增、替换、删除、净增均 0。不加跨层常量导入、不重排、不加默认配置。

原 blob：combat `64a9a5407944efa684128e3bec5980f9c1a6de02`；supply `c9c9cf3a46cf12ec888b7a97e5fb1d58f444a8f3`。修改后 blob 分别为 `fbe01336c6aa57f5056d17a96d1b23f75463bf46`、`e3689797ecf1b0979ac5830fed90dad788e43849`。

仓库外脚本使用已有 `rolldown/utils.parseSync` 解析 TypeScript ESTree：按原唯一标题定位调用，核对原 2 参数／新 3 参数、第三参数 literal/raw=30000/30_000；删除该参数并忽略节点位置后，整份 AST deepEqual。两份 callback 原始文本 SHA-256 相同；从新源码移除新增逗号和参数后，整份文件与起点逐字节相同。这比只检查断言行更强，覆盖全部函数体、夹具、seed、策略和其他测试。

该外部校验首次尝试了当前原生 TS7 不再提供的 JS parser API，随后改用仓库已安装的 Rolldown；首个 ESM import 使用 Windows 绝对路径而非 file URL，报 ERR_UNSUPPORTED_ESM_URL_SCHEME，修正外部脚本后完成上述 AST 实测。没有安装工具、修改依赖或把工具错误计为语义检出。

## W3：冻结、真实负控及完整门槛

定向默认两文件 10/10 PASS；逐项实际耗时见[验证 JSON](verification-results.json)。冻结全部 786 个 tracked TypeScript 文件的原始字节，组合 SHA-256 `7a40498b028d2263dffd0f1a29ef72bff532777b3f56826b7bc4a11e2698e7f8`。两次完整默认检查之间及之后继续核对，既有 F02、124 项 E03 和 72 默认样本源码无变化。

仓库外复制 combat 测试，仅适配相对导入位置，并把真实成功链中的 `expect(v.balance).toBe(120)` 改成 121。定向原生执行该完整链，得到 `AssertionError: expected 120 to be 121`，exit 1，2019.167ms；未发生导入、fixture 或超时失败。过滤未选中副本内其余 4 项，不计为仓库 skip 或新增测试。主仓库断言始终为 120。

两次完整默认 `npm run check` 的真实结果和原 E03 额外定向记录见[完成报告](completion.md)与[验证 JSON](verification-results.json)。完整检查顺序固定；不靠连续抽取一次绿灯抹去默认基线的两项超时，不修改中间测试字节。既有 >500kB chunk 告警保留，不作性能优化结论。

## W4：审计和交付约束

所有 tracked 工作字节在编辑前留摘要；除 12 条许可外的 1403 份文件保持。两份共享文档只追加：原 completion 前缀 18946 字节，SHA-256 `885605c081f38c34ce2ceece8218e169f77604ec3184bca3bb04b25f30ab2ee3`；原 gate 前缀 1887 字节，SHA-256 `a2a45f7aef95c5a2bc8b0776862e9fc634575a09be4990d0e22396227ca81d8d`。历史 JSON、85 份原证据、全部旧输入、生产文件、规则、内容、保存格式、配置、依赖、CI 和 AGENTS 均不改。

累计相对 8c19ca0 的 diff-check 实际 exit 2，仅旧 content-supply-restore 两份 inputs 的 3—6、7—9 行共七处硬换行；不修改原件、不新增例外。普通、cached、起点增量和新文件检查单独保留真实结果。no-index 新文件 exit 1 且无输出只表示相对 NUL 有内容，不是 whitespace error。

默认 Git/OpenSSL 读取远端两次 SSL_ERROR_SYSCALL；单次命令使用 Windows `http.sslBackend=schannel` 后正常读到全部 21 个 heads，目标仍为 de8f358。未改 Git 配置、代理、证书验证或分支。后续普通 push 同样使用这一单次 TLS 后端，不 force，不推其他分支。

这里只适配有限长链测试的硬预算，不证明生产性能优化、总体平衡、Owner 体验或所有负载下均稳定。准确提交 SHA、父/tree、push 和该 SHA CI 由提交后回执补充，不 amend 追自身 SHA。安全查询合同仍候选；UI、浏览器、多标签、玩家入口、O3 和 Owner 体验仍未执行，完成即停。
