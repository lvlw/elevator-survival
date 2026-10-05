# WORLD-ENTRY-005 完成报告

本记录为提交前交付检查；最终完整SHA、父SHA、tree及普通push/远端实证由交付消息和仓库外Git回执给出，不能在本提交自身正文预填其哈希。起点 `9c3c8a8c97c374bd1def6217c691137f3df10096`，父 `84eb6dff5e9d3238c3e651525b6ed28412132549`，起始tree `1333c0031b67ab47a9a0b832d7d372eaaf781079`，新分支 `feature/design-world-entry-005`；src tree固定 `10501d897195173df2023b1ebd73f9f097228512`。

## W1—W4

- W1：[真实复用矩阵](01-current-baseline-and-reuse.md)、[时序](02-combat-lifecycle-and-order.md)、[数据](05-approved-data-and-gaps.md)。旧CTB有真实调度能力；新敌仅静态声明，G2到达首遇标记、挫伤/控制弱点、首绷/日额/份额均需窄适配。
- W2：[唯一事实](03-single-truth-and-effects.md)与[独立v4恢复合同](04-active-combat-save-contract.md)。同一身体/实物/敌人，无第二可编辑快照；治疗后死亡独立新来源，旧H0空steps和旧死亡验真保留；冷expected必须来自文本外。
- W3：[有限结果](validation/results.json)、[原生结果](validation/native-results.json)、[语义负控](validation/negative-controls.json)。脚本/contract/输入共21文件冻结，两个独立Python进程复跑字节相同，原生最终冻结后实跑；异常没有当业务拒绝。
- W4：[集中审阅](00-owner-review.md)、[E02-P→R→S三个完整候选](06-engineering-contracts.md)、[真实体验门槛](07-evidence-and-playtest-gates.md)。既有两个入口仅追加状态；Owner无需新增玩法采纳，新增玩法决策0项。技术定稿待主线准确SHA实审。

## 实际检查

有限106项固定预期全部匹配：36个支持边界、67个预期拒绝、3个UNSUPPORTED；103项有限关系检查不是106项生产实现。原生23项通过，单独统计，不冒充新世界真实CTB/新格式支持。架构命令实际exit0：52 DEC、289 core生产文件。

四类负控各exit1、异常0，具体语义失败ID：

- duplicate-exit：X-repeat-debit、X-replayed-receipt。
- persistent-reset：P-reset-hp/count/risk/intent。
- consumption-rollback：P-reset-first、P-reset-quota、M-origin-rollback、M-first-rollback、Q-rollback。
- binding-acceptance：T-wrong-source、T-wrong-battle、R-bad-revision/risk/battle/queue/entry/execution、R-full-compare、R-dead-wrong-source、R-dead-wrong-battle。

[checks.json](checks.json)保留真实命令、退出码、开发失败和修订。原生开发18/20、19/20的夹具/错误码问题保留；修到20/20后新增观察，再到21/21和23/23。有限从98增加4个死亡来源及4个原值反例到106；原值层首跑104/106的诊断优先级问题也按原预期修正并保留；未改生产规则或原测试，不重跑旧模型。

独立外部审计检查27路径、UTF-8及57条相对链接/锚点、五份归档原字节、两入口字节前缀、1102个范围外Git对象及三种diff检查；暂存和提交blob继续按同一审计复核后交付。原38配置、103键/193叶、限定内容、候选源JSON、DEC/批准合同、src/旧测试/AGENTS/依赖/CI/scripts均不修改。无本轮空白例外，历史W01不扩展。

## 未完成与停止点

起始/最终全量生产测试均NOT RUN，新增生产测试0；生产typecheck/build、浏览器/真实Storage/多标签、Owner试玩均NOT RUN。历史3621与本轮探针不相加；完整五图、九组合、三敌原生接线和分段突破体验仍未验收。没有执行E02/E03，没有注册玩家入口、迁移v3、决定O3或新内容。

实际模型/推理配置未能独立核验，不声称切换。无已发现规则冲突；技术合同和有限证据的限制如上，不能以自洽恢复保证离线全历史认证。仅授权新设计分支普通commit/push，提交前远端及范围门槛须通过；结果见最终交付。完成停止等待当前WebGPT主线准确SHA实文件审查，不自动正式归档或生产工程。
