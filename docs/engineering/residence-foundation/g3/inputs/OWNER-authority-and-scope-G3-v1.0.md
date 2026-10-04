# G3：已有Owner授权与本批执行范围

记录日期：2026-10-04。该文件记录现有授权的来源与主线本次具体下发范围，不冒充Owner对新设计的额外发言。

## 1. Owner原有任务下发授权

Owner已在当前WebGPT主线明确表示：

> 下回这种你不能直接给我完整任务书么，还要让我授权，关于给codex任务书的事情，我全都授权你。

Owner还已要求评审通过后直接安排下一步，尽量让Codex一次完成较长完整批次，不再逐文件转发或重复申请编制任务书。

## 2. Owner对O1／O2的实际批准原文

```text
采用 WORLD-ENTRY-002-ADOPTION v1.0 的推荐：

批准 O1 局部规则、稿件明确列出的首批试用参数和 G1 契约；
批准 O2 的同次驻留持续现场规则及受控恢复／完整事务合同；
O3 旧入口和旧槽的发布安排留到公开发布前决定。

未列入的经济、商品、专长、医疗细项、地图价格及战斗参数不随同批准。

按已有任务下发授权安排集中正式归档和后续分批工程，
保留文档提交、各新生命周期及保存接缝的准确SHA实审，
不合并或推送main，不强推。
```

仓库原批准记录及获批稿位于`docs/design-drafts/world-infected-001/entry-002/adoption/inputs/`；正式O2恢复补充合同位于`docs/engineering/residence-foundation/runtime-restore-supplement-v1.0.md`。

## 3. 主线据此下发的本批权限

G2在d7953bbf96dc842d2953e019f950275cd693bf09完成限定实审PASS，具体证据与未执行项见同包审查原件。主线直接下发ENG-RESIDENCE-SESSION-RESTORE-001，起点为该SHA，建立feature/residence-session-core-001，按同包任务书最多30条路径一次完成详细设计、实现、严格正反例与组合测试、自查修订、最终检查、文档及普通commit／push。

执行权限仅限本工程分支；不merge、rebase、amend、强推或推main、G2/G1/设计等其他分支。本包的两个headless稳定态支持矩阵是本批工程范围，不是新的玩法限制或公开存档兼容承诺。

不修改已批准规则、参数、G1/G2或原严格restore；原首身份controlled.ts仅按任务新增冷候选入口。不得暗增钱包／终局／CTB／五图注册／专长／玩家入口／浏览器槽，不自动进入下一工程；G3完成即精确SHA实审。

上轮本地关机安排不延续为本批权限。项目配置、Project Sources及O3公开安排均不由本批更新。
