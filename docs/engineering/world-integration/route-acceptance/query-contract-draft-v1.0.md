# E03-A 玩家安全查询合同候选 v1.0

状态：DRAFT / 待主线技术审定；不是新 DEC、UIR、玩家信息授权或生产接口。依据 DEC-013、026、045、049—052、UIR-010—012、015；旧医院入口不变。

## 当前原生支持与发现

- S 的 `queryCombat()` 真正调用 P `queryResidenceCombat()`：当前行动、当前意图的相对速度／危险、玩家 HP、流血与当前蓄力额度。无 enemy HP、raw CTB、未来 intent、roll 或感染精值。但行动携带技术 wound selector，不是可直接序列化的普通玩家 ViewModel。
- S 的 `queryTerminal()` 真正调用 P `queryCombatTerminalEligibility()`，只返回 deliver／withdraw／deadline 三项资格，未提供完整公开目标与结算摘要。
- G2 `queryPlayerResidenceKnowledge()` 提供已知节点、当前／最后观察路线与本地地面名称数量。当前供给 catalog 的 sources 为空；E01 的 task sources／productions 与调查 witness 没有完整接到该查询。不能把空 sources 当作来源功能完成，也不能剥掉 P 字段假装旧 G2 可覆盖完整任务能力。
- S `getState()` 与订阅是受控诊断，含完整身体、seed、实体和历史，禁止作为普通玩家视图。
- `originalInstanceId()` 复用 `sourceItemId()` 的长度编码，真实 item selector 包含 seed；战斗 wound selector 含 execution ID、敌人 ID、动作与历史序号。只移除顶层 seed 不足以防泄漏。原生检查见 `knowledge-boundary.test.ts`。
- 本批路线只用明确标记的 TEST 公共事实适配：当前位置、E／HP／饱食、公开伤势、真实携带／资源、当前已揭示地面、已完成生产和原生战斗行动。技术 selector 只构造正式命令，不作为建议玩家文本。完整内部 ledger 仅供审查。

## 建议输入与权限边界

唯一 readonly query 由显式 v4 composition 注入真实 dependencies、canonical current 与会话持久化诊断。外部输入只能选择已允许的对象／用途，不提交结果、隐藏概率或 candidate state；严格拒绝非法请求，玩家错误说明另作安全类别映射。读操作不得发能力、调用生产者、消费随机、写入、通知或推进 revision。

技术 selector 与显示字段分层：普通值只返回可解释名称、公开状态与相对等级；命令所需真实 ID 由受控 Interaction 接缝保管。候选建议是 session-local opaque selector 与私有绑定表，不将原始 ID 经过可逆编码再交 DOM。该表不持有第二身体／敌人／库存、不修改保存格式、不成为行动资格 owner；每次实际提交仍由 S 校验最新 revision／battle。冷恢复后旧 selector 失效。

## 显示字段

详见 [逐字段矩阵](query-field-matrix.json)。覆盖首次工具／专长选择、phase／位置／任务日、已知地图、本地合法单边方向、已观察来源、揭示地面、真实容器／ItemState、任务公开目标／结果、敌人当前意图／公开伤势／相对时序、玩家状态、保存失败与无后继内容静态中枢。

没有完整安全规则支持的预测明确为 unknown／未支持。尤其不能用隐藏 infectionProgress 预测精确下一周期死亡，不能用未揭示掉落决定可交换资格，不能因某条内部路线可达就揭示侧门。公开当前事实与隐藏未来分开；若新提示确实需要扩大玩家知识，另列 Owner 决策，不在本合同采纳。

## 非干涉与原生证据

不同自然 seed 的同起点战斗行动／意图相同；严格合法隐藏 infectionProgress 变化不改变已探针的 combat／terminal／G2 knowledge 返回。探针读取阶段 production／draw／write／notify 均为零。原始技术 selector 的编码泄漏被作为 CURRENT_PARTIAL_SUPPORT 记录，未用删字段后的比较冒充原查询完全安全。

当前未支持敌人公开伤势、相对 timeline、完整任务／药食／维护资格预览及安全身体提示。下一工程必须从正式同源 owner 派生，不在 React 或本 TEST adapter 扩充公式。已有公开事实真实变化时允许返回不同；不得为了相等抹平已经发生的伤病、药耗或公开资格。

## 审定与停止

仅在现有知识边界内接安全查询不需新增 Owner 玩法采纳；感染未来的精确安全承诺不在建议合同中。若后续希望新增知识、风险精值、敌人扫描或新的策略提示，须先停止相关项交主线／Owner。本候选不批准 UI、browser storage、多标签、O3、资产制作或下一任务自动开工。

## R1 术语与审查状态附记

领域phase仍四种：first-hub、active-world、living-hub、dead。合法完整停点按恢复/查询职责分五类：首次中枢；active-world稳定点；active-world完整玩家战斗决策点；生还中枢；完整死亡。活战斗不新增第五领域phase，不能被“稳定四态”字样漏出候选验收。

R1只修TEST执行预算/异常分类；本合同仍DRAFT/未授权，不实现opaque selector，不扩大玩家知识。真实item ID含seed、wound ID含execution的缺口和3/12/9支持分层保持。完整默认本机check的保护旧S时间门槛与准确新SHA CI各自记账，不据作者定向PASS宣布查询或首玩通过。

<a id="doc-world-query-001"></a>
## DOC-WORLD-QUERY-001 技术合同定稿附记（2026-10-21）

依据[主线技术定稿](../player-query/adoption/inputs/MAINLINE-WORLD-QUERY-001-ratification-v1.0.md)与[预算任务准确 SHA 复审](../player-query/adoption/inputs/AUD-7a3acd3-ENG-LONGCHAIN-TEST-BUDGET-001-review-v1.0.md)，7a3acd3855aefdde68fdaed13ebe037f3e9bd6de 上预算任务限定 12 路径审查 PASS，F01 已关闭，F02 保持关闭。原本机 exit1、CI156 失败、CI157／158 成功及各时点未确认记录按原身份保留，不倒改历史。

原候选正文及当时 DRAFT、未实现和 selector 泄露发现全部保留。只有同范围查询技术边界由下列主线定稿载荷局部替代；不是整体改写过去状态、批准新知识或宣称原候选已经生产实现。

主线已技术定稿并在本批原字节安装的入口：[玩家安全查询合同 v1.0](../player-query/player-query-contract-v1.0.md)、[24 字段合同](../player-query/player-query-field-contract-v1.0.json)、[下一完整工程契约](../player-query/player-query-engineering-contract-v1.0.md)。本批仍待准确 SHA 文档实审；原 query／next-engineering 候选仅上述同范围局部被替代，原字段矩阵 JSON 保持。3 supported／12 partial／9 not-supported 是支持基线，不是 24 字段已经实现；实际新查询工程未开工。

四领域 phase 为 first-hub、active-world、living-hub、dead；active-world 分稳定世界与完整玩家战斗决策点，合为五合法停点，no-current／blocked 是应用状态。Setup catalog 查询与真实初配发放分开，已有初配不得借查询重发或改选。opaque selector 只是受控引用，不是行动 authority；查询不调用 producer／resolver 试算，不签发行动能力，不从 seed、execution 或 origin 编码玩家选择器。缺正式公开依据的映射保持 unknown 并保留进入 UI 前责任，不推断新知识。

未新增 DEC／UIR，未改玩法、参数或 P/R/S。UI、浏览器存储、多标签、玩家入口、O3 与 Owner 首玩／分段体验仍 OPEN／NOT RUN；本次不授权生产 query 或后继工程。
