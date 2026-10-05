<a id="doc-world-entry-004"></a>
## DOC-WORLD-ENTRY-004 采纳附记（2026-10-05）

[Owner实际批准](adoption/inputs/OWNER-approval-WORLD-ENTRY-004-ADOPTION-v1.0.md)、[DEC-052](../../../05-design-decisions.md#dec-052)：仅当前新感染委托的获批子集生效。

Owner已实际采纳WORLD-ENTRY-004-ADOPTION v1.0列明的D01—D04规则和试用参数。103键／193叶来自锁定612ac66完整源，排除grant.H2-random；九字段内容只将H2-random.grants置null，随机choices／weights／unit保持。未列系统和试用平衡不扩批。

R1实审PASS与Owner批准分别留痕；本轮文档提交仍待准确SHA实审。E01-P是下一个完整工程切口，R/S逐项停审，E02/E03后续；没有生产开发、玩家内容注册或浏览器保存。以下D01—D04待采纳及工程候选文字是历史，不再代表已覆盖子项的当前状态。

当前依据：[唯一103键试用配置](../../../content/infected-world-entry-test-config-v0.1.json)、[限定五图内容](../../../content/infected-world-entry-content-v0.1.json)、[E01-P首契约](../../../engineering/residence-foundation/content-supply-core-contract-v1.0.md)、[来源恢复合同](../../../engineering/residence-foundation/content-supply-restore-contract-v1.0.md)、[工程批次门槛](../../../engineering/residence-foundation/world-content-batch-plan-v1.0.md)、[612ac66专项实审](adoption/inputs/AUD-612ac66-WORLD-ENTRY-004-R1-review-v1.0.md)、[本轮完成记录](adoption/DOC-WORLD-ENTRY-004-completion.md)、[实际检查](adoption/checks.json)。

---

以下为612ac6673223cc93237184892e6713e789a9dce1时的历史正文，保留原字节；已覆盖子项的旧待采纳／候选表述以上述批准为准，其余不因本附记自动获批。

# WORLD-ENTRY-004：集中审阅与待采纳稿

状态：DESIGN DRAFT / WORLD-ENTRY-004-R1，待主线准确SHA专项实审；D01—D04仍待Owner采纳。返修基线 `0362460b259cba6ea160e79ad04a6cb14181cef0`，生产仍为原C受审树。本批没有新增正式DEC、配置或玩家内容。

本轮仅按[返修任务](reviews/r1-inputs/WORLD-ENTRY-004-R1-task-v1.0.md)修正有限模型的任务来源／执行联合校验和逐意图原字段验证；不重新调整四组方案。原31项在完整仓库复现为17符合／14不符（含3异常）；修后结果、原98项保留与新增回归分别见[检查回执](checks.json)及[验证边界](validation/README.md)。模型符合不替代采纳或生产验收。

下一步请审阅下列四组局部规则，尤其是战斗退出精力、无目标用药、来源消费证据及活战斗保存边界。已生效的五图方向、单次驻留、四终局、120成功奖、失败一次 min(P,20)、正常H0空身体步骤及截止先结后召回无需重选。34+4已批配置仅只读引用。

| 组 | 主推荐及玩家影响 | 真正代价／替代 | 条款与参数 |
|---|---|---|---|
| D01 内容与真实取得 | 沿用24节点五图；任务提取、携带、装接是受控事务；H1工具箱开门并产生独立一次电子，酒店仍可绕 | 工具箱维护与安装争电子；替代是撬门／门禁卡，无工具箱收益。H2随机消毒不是保证 | [任务合同](02-world-content-and-mission-contract.md)；`door.*`、`extract.*`、`install.inputs`、`grant.*` |
| D02 战斗与保存 | CTB决定先后；每次胜利或合法退却按已过CTB一次扣E，战斗中不日结；敌人跨回访保留；未来允许真正活战斗恢复 | 退却能累积优势但再次进场和最低结算均耗E；保存须扩B/C。替代每招扣E会更直观，但须重审最后超额、双扣与CTB收益，当前不推荐 | [战斗医疗](03-combat-medical-contract.md)；`combat.*`、`reentry.*`、`enemy.*`、`retreat.*` |
| D03 药食、维护与来源 | 稳定点有合格目标时允许E0免费自救；显式选真实实例／伤口；数量与ItemState联合守恒；维护仍付E及材料 | 无目标不能先吞药储备；部分堆叠消费需要有限来源分配证据。替代整栈消费损害体验，单靠删除输出破坏防复制 | [战斗医疗](03-combat-medical-contract.md)；`bandage.*`、`firstaid.*`、`ration.*`、`maintenance.*`、`restore.*`、`physical.*` |
| D04 首次选择与体验门槛 | 侦察／工程／生存当前驻留锁定；三工具各有明确替代；先做真实任务与自救，再活战斗，再整合长链及安全查询 | 九组合仅局部证据，不保证九套胜率；跨未来委托改选、商店、旧槽O3均不决定。替代推迟专长会让首玩无法验收，故不推荐 | [九组合](04-specialties-tools-and-loadout.md)、[工程候选](06-next-engineering-contracts.md)、[接入门槛](07-playable-and-release-gates.md)；`verify.scout.*`、`fix.method`、`survival.hp`、`capacity.*`、`load.*` |

## 局部规则逐项审阅索引

1. D01-a：任务生产者只收意图、绑定、版本和具体实例/放置；不用用户上传 completed 或任意后态。
2. D01-b：供电为当地作业；转运安装真消耗两件任务件和材料；成功须同时真携本次指定样本到H0。关闭不可换执行重置。
3. D01-c：工具箱收益只在首次以工具箱处理H1时产生；先用别法开门不能再领取。任务件不能降为ordinary。
4. D02-a：已触发战斗在E0仍处理；每招的真实HP与流血按CTB动作处理，退出不再补扣一次动作流血；日结只在合法稳定入口。
5. D02-b：退却保留敌人HP、意图与风险游标，重新设进入队列，不刷新受伤、装备、额度或来源。已签发死亡只消费，不重算。
6. D02-c：活战斗是未来持久化阶段；当前B/C拒绝保持有效，批准候选不等于现有存档可读。
7. D03-a：绷带、急救包、消毒、抑制、口粮、镇痛只对合格目标生效，先验证后一次扣单位；中枢仍静态且不自动服务。
8. D03-b：数量拆合、消费、安装保留来源分配，总和守恒；ItemState与唯一容器联合校验；保存失败不再执行效果。
9. D04-a：专长与工具是不同维度；工程优惠与已有方法不相加；生存优惠仅本次委托首次合格绷带，不按休整刷新。
10. D04-b：未批准新入口或存档发布承诺；O3必须在浏览器槽路由/玩家入口发布前另审，无清档、迁移或永久双产品承诺。

## 可复制采纳文字（待采纳，不是批准记录）

> 在主线准确SHA实文件审查通过后，拟采纳D01—D04中逐项明确接受的局部条款及parameter-candidate.json对应Draft参数。未明确接受的组或参数继续待审；两份既有配置38项不重新授权或复制。此次采纳不授权生产执行、内容注册、O3发布安排、商城、第二委托或浏览器迁移。后续先形成确定载荷和独立工程契约，再按准确SHA批准执行。

旧医院随机权重在新驻留的适用、工具箱及首次配装的体验负担、CTB实际路线可达性仍需下游证据，不能用本批条件路线代替。完整[事实分层](05-source-and-adoption-map.md)与[验证边界](validation/README.md)是审阅的一部分。
