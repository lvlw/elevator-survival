# 来源、权威与局部采纳表

**DESIGN DRAFT，固定读取基线 `7ca547ab8ab4f411d1102a79baf8c0796f4b082c`。** 下表所有仓库来源均指这个完整SHA；章节为稳定定位，行号仅辅助。原件归档的[授权范围](inputs/OWNER-authority-and-scope-WE003-v1.0.md)授予本设计与交付，不替Owner批准新参数。冲突时正式DEC优先，候选不能覆盖。

| 条款 | 文件与章节／行号 | 事实分层与本轮处理 |
| --- | --- | --- |
| C01/C07 具体委托与执行不同、关闭不可换ID重开 | [DEC](../../../05-design-decisions.md) DEC-049，2359—2401；[003C](../reviews/mission-retry-options-v0.1.md#owner-confirmation-003c) | 正式生效的身份唯一性；Owner已确认当前A单次驻留。世界内活动继续合法，不扩大成账号永久禁入 |
| C01 样本、完整履约及正常／重伤同奖 | [003A原话](../reviews/OWNER-endings-followup-6de365d-v1.0.md) §2—3，33—59；[任务稿](../04-main-mission.md) §3—4，34—58 | Owner已确认样本必要／同奖；H0、供电转运具体任务事实与指定样本来源仍是该世界内容Draft，不能当G4已实现 |
| C02 当前失败20与普通携出 | [003D](../reviews/endgame-candidates-v1.1.md#owner-confirmation-003d) 顶部审定；DEC-049结尾、DEC-050奖罚边界 | Owner已确认待后续精确正式落文；20仅当前委托，不借DEC引用视为所有经济数值批准 |
| C03/C04 正常返回／期限／日结顺序 | DEC-050周期、局部规则；[获批稿](../entry-002/adoption/inputs/WORLD-ENTRY-002-ADOPTION-owner-review-v1.0.md) 与同目录实际批准 | 正式生效：正常返回不补夜，Day7稳定入口，血→感染→饥饿短路；HP0不召回；不造任务Day8 |
| C05/C06 死亡及实物真实历史 | DEC-049死亡／历史；DEC-023物品生命周期；[终局稿](../reviews/endgame-candidates-v1.1.md) §6，145—159；[物品文档](../../../content/items.md) 旧医院保管段 | 真实实例／已处置历史不重写为已确认方向；样本部分交付、未用专件交回、权限失效是本轮推荐Draft。旧医院保管领回不移植 |
| C10 三个积分数值、入账空间 | [积分稿](../11-points-hub-recovery.md) §2—3，18—43；[经济稿](../05-resource-economy.md) 积分段，115—129 | 初始0、奖励120、上限2147483647、接取前空间检查是推荐Draft。int32不是TypeScript强制。旧多次同供给实验仅历史／假设证据，不构成重复入口 |
| C08/C09 独立expected与一次安装 | [恢复补充合同](../../../engineering/residence-foundation/runtime-restore-supplement-v1.0.md)；[首身份合同](../readiness/03-first-engineering-contract-draft.md) | 已批准技术边界；现存历史恢复必须保留独立expected，冷候选只验内部一致性；技术格式扩大属新Draft |
| C11 暂未支持 | [G4实审原件](inputs/AUD-7ca547a-ENG-RESIDENCE-ACTIONS-001-review-v1.0.md) 范围及结论；[G4支持合同](../../../engineering/residence-foundation/g4/contract-and-support.md) | 当前代码事实：完整终局／死亡／战斗未接。实审PASS只覆盖原范围，不等于剩余世界工程批准 |
| C12 当前阶段／所有权／提示 | [GDD](../../../01-game-design-v0.1.md) 世界入口段；[Slice](../../../02-vertical-slice.md) 当前批次；[架构](../../../03-architecture.md) 驻留核心／会话段；[UIR](../../../09-ui-design-record.md) 当前有效约定 | 正式阶段边界不变。提示读取最新身体、允许返回整备；本轮不统一新增弹窗规则、不做UI |

## 源码能力与缺口（仍为同一固定SHA）

| 实际入口与证据定位 | 当前已支持 | 本轮候选要补的缺口 |
| --- | --- | --- |
| `src/core/mission-lifecycle/queries.ts` 67—83、`controlled.ts` 53—75；`mission-lifecycle.test.ts` K18/K19及精确导出 | 关闭纯事实、独立expected、冷候选内部一致 | 不持有钱包、实物、身体；不能直接把一次closed当完整清算 |
| `src/core/character-cycle/cycle.ts` 113—138、`types.ts` CyclePlan/CycleClosure | 正常due、期限ready、完整body与步骤、HP0不推进 | CycleClosure不含death；死亡必须新专用终局证据，不能伪造living closure |
| `src/core/residence-location/movement.ts`、`sources.ts`、`items.ts`、`controlled.ts`、`validation.ts` | 受控提案绑定前态；抽样一次；真实普通物与ItemState；live动作／休整 | 缺任务专件取得／设施完成生产者；G2死亡后快照不能被包装成living恢复态 |
| `src/core/item-state/item-state-collection.ts` 11—64 | 实例与资源状态逐一绑定 | 候选需任务处置／不可用资产容器；不得新建一套数量钱包替代实例 |
| `src/state/residence-save/types.ts`、`validation.ts`、`codec.ts`及aggregate/residence-save tests | v1 fresh-hub／首active-world；严格拒绝closed | 新living-hub/dead、历史和新版本目前均未支持；不静默扩义v1 |
| `src/state/residence-session/launch.ts`、`transitions.ts`、`session.ts`及故障长链测试 | 当前唯一内存所有者，提案→完整提交→write→通知，保存失败保内存 | 首次launch增加积分空间前置；受控死亡结果一次消费；闭合钱包／实物／历史；新格式一次安装 |
| `src/core/run-return/item-return-lifecycle.ts`、`run-termination.ts`、旧run-save | 旧医院一日返回／死亡的真实历史原则 | 仅复用原则，不复用旧罚粮金／来源没收／一日清空；不倒改旧医院规则 |

以上路径的实际对象摘要见[验证汇总](validation/results.json)及[原生观察](validation/probe-results.json)。源码名称以实际路径为准，候选新文件在工程合同中另列，不冒充现存API。

## 采纳边界

本轮仅提出下一次正式覆盖清单：四终局资格、一次清算、任务专件具体处置、三项积分参数与空间守卫、新恢复格式及工程契约。它们须先按来源分别确认再另发正式文档任务；不预分配DEC编号，不覆盖已批准G1参数、首身份合同或任何G1—G4原件。共享overview/queue只追加本候选与真实G4实审入口，历史正文原字节保留。
