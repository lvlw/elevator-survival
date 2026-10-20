# 下一单项工程候选：感染驻留玩家安全查询与受控选择接缝

状态：DRAFT / NOT AUTHORIZED。不预填未来 SHA，不启动实现；须先经过当前 E03-A 准确 SHA 实审和主线技术审定。

## 目标与真实依赖

在已审 P、R、S 上一次交付严格、显式白名单的只读玩家查询，以及不泄漏真实 selector 的最小受控命令选择接缝。不改玩法数值、保存格式、来源语义或原生产者；不接 React／浏览器／多标签。真实依赖为 CombatValue、原 v4 unique session、G2 canonical knowledge／investigation witnesses、TaskCatalog、ItemState、三专长及原生资格 owner。

## 接口与不变量候选

- `queryPlayerResidenceSession()` 读取 current，按四稳定态形成判别 union；不拥有 current、不保存下一状态。
- 首次未确认的选择只引用获批工具／专长 catalog，禁止默认发物。
- 地图只显示 canonical 已知内容；remote route 明确 last-observed，本地可行动方向经正式资格 owner。禁止全图、自动多边队列和对未知侧门的占位提示。
- 来源与 ground 接 E01 正式事实；未揭示产出不可见，来源机会不能由 query 物化。
- 物品与伤口只提供 session-local opaque command selector；raw seed／execution／origin ID 不进入显示值。绑定表不得含可变状态副本或权限绕过；提交仍走 S、最新 canonical 资格和 revision。
- Combat 只提供正式当前意图、公开五阶段、相对顺序与已知动作成本／资源，不返回精确 enemy HP、CTB 或完整未来序列。安全 preview 不调用 resolver 探知隐藏随机。
- 身体提示只依据允许的当前公开事实和正式安全 metadata，缺预测合同为 unknown。不得把旧医院感染终末死亡条件移植到新 HP0 规则。
- 保存失败使用唯一会话持久化反馈；终局保留真实结果与静态无后续内容，不发新任务。

## 拟精确路径（候选，不是写许可）

1. `src/core/residence-combat/player-query-types.ts`
2. `src/core/residence-combat/player-query.ts`
3. `src/core/residence-combat/player-query.test.ts`
4. `src/core/residence-task/player-query.ts`
5. `src/core/residence-task/player-query.test.ts`
6. `src/core/residence-location/supply-knowledge.ts`
7. `src/state/residence-session/combat-player-query.ts`
8. `src/state/residence-session/combat-player-query.test.ts`
9. `src/state/residence-session/combat-queries.ts`
10. `src/state/residence-session/combat-types.ts`
11. `src/state/residence-session/combat-session.ts`
12. `src/state/residence-session/combat-index.ts`
13. `src/state/residence-session/combat-controlled.ts`
14. `docs/engineering/world-integration/player-query/contract-and-support.md`
15. `docs/engineering/world-integration/player-query/verification-results.json`

实际任务须依据受审 E03-A 和现存接口再锁定必要路径，不能据此自动扩权。需要抽资格 owner 时先报告具体生产接缝，不用 query 调 resolver；原 protocol／P/R/S 保存测试保持。

## 反例与验收

知识相同而 seed、未揭示掉落、隐藏感染或远程危险不同：显示字段、选项和拒绝说明不应形成隐藏通道。真实公开变化要有成对正例。遍历嵌套字段与 selector 的编码，不仅检查顶层 seed。当前 native selector 含 seed／execution 的反例必须被关闭。

验证未知选择器、跨会话／恢复后 selector、旧 revision／battle、getters／NaN／稀疏数组、末日与死亡短路；query／preview 不得生产、随机、写、通知或签发。拒绝不能把未知感染未来包装成确定生还；不允许全 raw current 经 JSON 转换后返回。

四路线、九组合默认样本继续可复跑；新增针对 query 的正反例、独立计数与语义负控，实跑基线及完整 npm check，原件／范围保护。普通 commit／push 仅在另行指定的新分支。完成即准确 SHA 查询边界实审，禁止自动进入 UI 或 O3。

## R1 术语与审查状态附记

领域phase仍四种：first-hub、active-world、living-hub、dead。合法完整停点按恢复/查询职责分五类：首次中枢；active-world稳定点；active-world完整玩家战斗决策点；生还中枢；完整死亡。活战斗不新增第五领域phase，不能被“稳定四态”字样漏出候选验收。

R1只修TEST执行预算/异常分类；本合同仍DRAFT/未授权，不实现opaque selector，不扩大玩家知识。真实item ID含seed、wound ID含execution的缺口和3/12/9支持分层保持。完整默认本机check的保护旧S时间门槛与准确新SHA CI各自记账，不据作者定向PASS宣布查询或首玩通过。

<a id="doc-world-query-001"></a>
## DOC-WORLD-QUERY-001 技术合同定稿附记（2026-10-21）

依据[主线技术定稿](../player-query/adoption/inputs/MAINLINE-WORLD-QUERY-001-ratification-v1.0.md)与[预算任务准确 SHA 复审](../player-query/adoption/inputs/AUD-7a3acd3-ENG-LONGCHAIN-TEST-BUDGET-001-review-v1.0.md)，7a3acd3855aefdde68fdaed13ebe037f3e9bd6de 上预算任务限定 12 路径审查 PASS，F01 已关闭，F02 保持关闭。原本机 exit1、CI156 失败、CI157／158 成功及各时点未确认记录按原身份保留，不倒改历史。

原下一工程候选正文和 15 条候选路径保留为历史，不成为本轮或未来默认写许可；同范围未来工程责任由下列定稿工程契约局部替代，实际工程任务仍须另发准确 SHA、工程分支和精确路径。

主线已技术定稿并在本批原字节安装的入口：[玩家安全查询合同 v1.0](../player-query/player-query-contract-v1.0.md)、[24 字段合同](../player-query/player-query-field-contract-v1.0.json)、[下一完整工程契约](../player-query/player-query-engineering-contract-v1.0.md)。本批仍待准确 SHA 文档实审；原 query／next-engineering 候选仅上述同范围局部被替代，原字段矩阵 JSON 保持。3 supported／12 partial／9 not-supported 是支持基线，不是 24 字段已经实现；实际新查询工程未开工。

四领域 phase 为 first-hub、active-world、living-hub、dead；active-world 分稳定世界与完整玩家战斗决策点，合为五合法停点，no-current／blocked 是应用状态。Setup catalog 查询与真实初配发放分开，已有初配不得借查询重发或改选。opaque selector 只是受控引用，不是行动 authority；查询不调用 producer／resolver 试算，不签发行动能力，不从 seed、execution 或 origin 编码玩家选择器。缺正式公开依据的映射保持 unknown 并保留进入 UI 前责任，不推断新知识。

未新增 DEC／UIR，未改玩法、参数或 P/R/S。UI、浏览器存储、多标签、玩家入口、O3 与 Owner 首玩／分段体验仍 OPEN／NOT RUN；本次不授权生产 query 或后继工程。
