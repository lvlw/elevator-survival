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
