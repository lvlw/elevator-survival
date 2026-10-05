# 来源、事实分层与交叉审查

R1针对`0362460b259cba6ea160e79ad04a6cb14181cef0`的实际材料；生产src树仍为`98c840dd0b6b1a6cc014df4ac9165bc94bf2c794`，与原C受审源码一致。精确最终提交由交付消息给出。原件见[输入清单](inputs/SHA256SUMS.txt)，不更改包内授权或审查原话。

| 层 | 本批采用的事实 | 权威／证据 | 明确不扩大 |
|---|---|---|---|
| 正式已生效 | 单次委托、能量/周期、终局及恢复、34+4唯一配置 | [DEC-049/050/051](../../../05-design-decisions.md)；[terminal合同](../../../engineering/residence-foundation/terminal-core-contract-v1.0.md)、[恢复](../../../engineering/residence-foundation/terminal-restore-contract-v1.0.md)、[批次](../../../engineering/residence-foundation/terminal-batch-plan-v1.0.md) | 不恢复旧医院每日主要区域、自动回城、Scene Time规则；不重批120/20 |
| Owner已确认方向、具体落地仍有限 | 五图/酒店可选、本地转运+样本、三专长完整验收、工具箱路径、真实身体物品延续 | [主任务](../04-main-mission.md)、[readiness基线](../readiness/01-current-baseline-and-adoption.md)、[原Owner终局增量](../reviews/OWNER-endings-followup-6de365d-v1.0.md)；后续已正式部分由DEC优先 | 方向确认不是全部旧参数批准；失败重接和末日以003C/D及后续正式覆盖为准 |
| 本批推荐Draft | D01—D04、H1工具箱E映射、真实任务生产/消费/活战斗接缝 | [审阅页](00-owner-review.md)、本批02/03/04、content-candidate及parameter-candidate | 不注册内容、rulesVersion或存档版本，不新增正式DEC编号 |
| 测试参数/隔离条件 | 四条路线外部CTB结果、显式种子物及负控变异 | [fixtures](validation/fixtures.json)、[脚本](validation/check.py) | 不计真实CTB胜率，不证明随机分支必出，不用于生产默认 |
| 历史比较 | 旧十次重复供给、175/213/269等旧结果与旧候选成功价表 | [旧预算](../08-balance-budget.md)、[旧恢复经济](../11-points-hub-recovery.md)、entry-002/003旧证据 | 不重跑、不改写、不叠入本轮；不据此恢复同委托入口 |
| 未支持/未运行 | 活战斗持久化、真实任务生产、部分消费codec、商城与安全玩家UI、浏览器多标签、首次体验 | [当前缺口](01-current-production-and-gaps.md)、[原生观察](validation/native-api-results.json) | unsupported不计实现通过；架构检查不算生产测试 |

## 参数与内容溯源规则

parameter-candidate.json的approvedReadOnly仅路径/身份/原件SHA，不复制38值作第三默认。draft每条有value/status/source；正文只引用ID，不在另一份配置保存新数值。`physical.*`、药效、物品ID可来自旧正式物品，其“接入新驻留”仍需D03采纳；`enemy.porter/technician`与新任务件是旧世界Draft，不能称生产数据。

`load.bands`及`extract.sample.cautious`核对旧evidence/parameters.json后纠正誊录；没有改旧文件。H1/H2随机范围与权重按真实旧医院search定义列入本地候选，适用尚未采纳；`grant.H2-random`只是酒店条件用例的分支载荷，不是固定来源或抽签表。固定来源合计另按grant表验证。

内容ID H/T/P/L/C承接原03；本批技术ID只是其唯一映射，不用天数或执行ID作为内容重生键。所有玩家实例仍要有实际受控发放，不能由映射表名字创建。

## 0362460原批次交叉自查与修订（历史记录）

根会话自行进行两条交叉检查：正式规则/实际源码→合同；候选条款/数据→固定预期→检查结果。没有子Agent审查，不冒充独立外审。

- 将样本谨慎成本与负重档纠回旧候选来源；没有借设计重调已批准G1。
- 酒店交易改为整体验证奖励入包，失败不先收材料；固定路线去掉对额外随机绷带的隐性依赖。
- 补九组合的工具差异、拆合消费守恒、错误数量、错执行/实例/已处分样本、材料与容量反例。种子状态仅隔离验证，不当任务生产。
- 原生加载器最初误用当前TypeScript包未提供的transpileModule；改用当前Node内置类型转换，仅仓库外loader，不安装依赖。
- 原生G2首次调用误传终局聚合多余键，五项报INVALID_INPUT；改为真实LocationSnapshot形状。随后一项预期错误码纠为源码terminal-history的INVALID_STATE；保留修复前结果摘要。
- 首次路线编写碰到任务模块格位不足，改为显式旋转放置；运行脚本没有自动腾包，不在后台扩容量。

这些是本批材料修订，不是修复生产缺陷。正套件期待是手写的条款字段/正式oracle；作者路径辅助只选择显式动作与格位，不从被测函数生成预期终局数值。冻结后双跑是不同进程重现，不等于双人审查。

## 尚须主线/Owner处理

优先集中审阅D01—D04，不逐个字段问Owner。CTB/E与保存版本是实质行为/兼容决策；药食目标及来源分配需独立工程验真。长期经济、完整随机内容、全组合胜率、O3、商城/新任务供给继续未验收。没有与已正式规则冲突而继续生产实现的情况；本批零生产修改。

## R1专项自查与证据身份

[输入原件及审查](reviews/r1-inputs/SHA256SUMS.txt)共十四件逐字归档；原五件inputs不动。先在完整仓库执行原probe：31项17符合／14不符，其中11误接受、3 KeyError，与审查一致。修后仍执行同一probe原件；模型blob变化仅是身份标记，不是失败条件。

根会话单独交叉检查“源合同→联合约束”和“具体反例→独立预期→合法对照”，没有把作者自查称独立主线审查。F01保留来源总份额，并补领取／原声明／执行；F02限制逐意图字段、原始类型及选择器，检查相邻伤口、阶段、D/T、pending、额度及条件战斗结果。任务执行与原值遗漏各有独立语义负控；不将程序异常当拒绝。

原98个ID、分类及expected全部保留；四个局部夹具补具体已消费id或TASK-sample领取记录，四条路线各删除三个固定来源的无效照明标签，原成本、步骤与成功条件不变。逐项适配见fixtures.r1Identity，不计新增玩法。新增96项单列r1Cases，其中7合法对照；拆合／消费／安装与处分仍守恒。开发期间出现安装摘要读取错误（KeyError）及一项反例命中了更早任务份额校验；已修摘要读取，并拆为普通来源数量与任务ordinal两项，未改原98预期。

原0362460的98／原生24成绩只属于该提交；本轮覆盖它们并重新记录，不能叠为新通过或消除原实审NEEDS REVISION。旧175／213／269及旧重复供给不动。D01—D04与E01—E03仍未采纳／未授权；源码保护与当前原生观察分别列入checks，模型不替代B现有整输出校验。
