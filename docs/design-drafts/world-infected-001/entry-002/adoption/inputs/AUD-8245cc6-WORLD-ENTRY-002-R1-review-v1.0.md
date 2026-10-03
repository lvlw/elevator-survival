# WORLD-ENTRY-002-R1：主线准确提交专项实文件复审

> 标识：AUD-8245cc6-WORLD-ENTRY-002-R1 / v1.0
> 日期：2026-10-03
> 结论：**PASS——F01、F02、F03在本次有限模型／候选合同修订范围内关闭，无本轮必需返修。**
> 可以进入O1／O2的集中审定与局部正式归档；不表示这些候选已获Owner批准，不是生产实现、完整世界冻结、真实保存或试玩通过。

## 1. 结论及当前停止点

本轮复审锁定 `8245cc61a59a6404984129415bf8aac904926ce0`，父提交为原评审基线 `136e98aa2c4bff7f84cdd0f67056771d837d562a`。不是将原136e98a追记为当时通过。首身份核心d1d3b79的限定PASS继续保留，R1没有修改该模块。

三组问题已经通过实际代码修订解决，合法对照没有被一起禁掉：正常返回仍不补夜，合法截止后的一次衔接可以消费，后续真实周期仍结；同一活动驻留内跨夜取物保持，已关闭世界的地面物不进入可操作家底；合法E1承担8E动作仍完成截零，非法负数／布尔／溢出等在提交前拒绝。

下一步应让Owner集中决定O1规则／试用配置及O2持续现场／恢复合同，O3发布旧入口安排留到公开接线前。任务编制／下发权限已经授予，无需再申请“是否生成任务书”；尚未确定的玩法与参数不能因此自动批准。主线另附 `WORLD-ENTRY-002-ADOPTION-owner-review-v1.0.md` 明确推荐和批准子集。

## 2. 基线、范围及来源区分

| 项目 | 核对结果 |
| --- | --- |
| 正式仓库 | lvlw/elevator-survival |
| 本轮起点 | 136e98aa2c4bff7f84cdd0f67056771d837d562a |
| 本轮终点 | 8245cc61a59a6404984129415bf8aac904926ce0 |
| 远端工作分支 | feature/design-world-entry-002 → 本轮终点 |
| 其他远端引用 | main=a76e9c1c998051fc1643b6e0c3d53443fa55feed；原设计分支=6b48b3de6521d9a9c296754a4d8135c7f7c7ca35；首核心工程分支=d1d3b7927c6733cff709a4bfd617fb1e85e7485a |
| 变更集合 | 11个既有文件修改、3个归档／回归说明文件新增，全部在R1原任务白名单 |
| src根子树 | 5dc57761e4dcabddec5b781401d808a6de1317ba，与136e98a及d1d3b79相同 |
| 根配置／依赖／AGENTS／scripts／.github | 根tree对象与起点相同；没有生产代码或测试修改 |
| 用户本地工作区、普通／暂存diff | 采用Codex交付记录；主线未访问E:磁盘 |

GitHub连接器读取的是上述固定提交。Project上传的旧DEC／交接副本不是本次规则版本来源，也未被自动同步。

实际变更均位于 `docs/design-drafts/world-infected-001/entry-002/`：

```text
00-owner-review.md
01-local-rule-amendments-draft.md
02-runtime-restore-contract.md
03-next-engineering-goals.md
completion.md
reviews/AUD-136e98a-WORLD-ENTRY-002-review-v1.0.md
reviews/WORLD-ENTRY-002-R1-task-v1.0.md
reviews/r1-regression-summary.json
reviews/review-and-fixes.md
validation/expected.json
validation/fixtures.json
validation/results.json
validation/run-record.json
validation/verify_entry_002.py
```

## 3. 实际阅读与独立执行

完整读取原R1任务书及前置审查原件；检查本轮提交及父子关系、远端引用、根tree。完整读取本轮444行Python验证器；读取00—03受影响候选内容、周期矩阵和完整事务／恢复边界、完成记录与作者自查增量。

读取fixtures的当前config和provenance（文件前240行），其取值与独立探针使用的配置对照一致。读取r1-regression-summary中原反例映射选段，以及run-record的R1原复现、冻结运行、负控和交付检查选段。**没有完整下载或逐行重审全部fixtures／expected／results／run-record，未完整复跑作者213项套件。** GitHub对fixtures变更的patch为null，本轮不是以一份不存在的完整patch冒充读取；参数通过实际文件选段核对。

容器直接下载源码遇到DNS／访问失败；GitHub连接器可读取。主线据连接器实际内容重建完整验证器，只有全文Git blob匹配后才执行该副本。不是另写一个“类似验证器”替代作者脚本。

```text
verify_entry_002.py
字节：32007；行数：444
Git blob：ad537b8ae0d737fd0bdcb7e8eb4d4d5740e91432
SHA-256：32b6188e695005ba2cca4c446652435780ee262538d71ee2952f65b76eb23881
```

独立执行：`python -B -X utf8 probes.py`，退出0；**56项匹配，0不符，0意外异常**。输入为主线编写的窄夹具，不是作者fixtures原字节副本；预期直接依据合同，不从作者expected.json生成。重复检查不增加计数。复核附件保留脚本、配置／夹具、输出及指纹。

## 4. Findings关闭依据

### F01：周期、最新终局与ready来源——CLOSED

代码入口：`temporal`（验证器45—88行）、`validate_world`、`validate_save`、`step`的rest／deadline／launch分支。文档入口：R03及W2 `r1-cycle`。

ready不再只是一个等于当前D的数字。期限来源包含委托、执行与已结周期，并必须等于排序得出的最新期限关闭记录；正常success/failure只能保留due。活动时D=start_cycle+T−1，关闭end_cycle与end_day相符，顺序连续且不交叠；死亡无ready，既有结果不被改写为当前死亡。

独立验证包括：正常成功／失败伪ready拒绝；D1/T7拒绝；合法期限ready恢复；错执行／委托／已结周期拒绝；ready消费后不重置刚发生的额度，再次正常返回与后续出发照常结新周期；无新内容不消费ready／健康；下一出发致死保留旧成功。

这个顺序模型限制属于明示的有限历史子集，不证明外部存档未被整体替换，也不授权新建全角色历史框架。

### F02：关闭世界地面访问——CLOSED

代码入口：`close_world`（144—150行）、`step`的pickup／launch分支及地面执行引用检查。文档入口：R02、R07和W2位置／物品职责。

关闭后node为null，last_node只是历史；世界地面物绑定原execution，只有当前active/world及同节点／同执行才能拾取。成功、主动失败、期限失败之后均拒绝旧地面拾取；异委托即使节点显示同为H0也不能借用旧地面执行。

独立验证同时保留：同活动E0拾取、休整后取回、合法携出数量及原装备耐久／电量。不是清空所有实物或禁止跨夜来换取负例通过。

存档模型只表达窄地面引用，不包含完整roads/enemies/knowledge、背包几何或任务件清算；这些生产门槛仍在。

### F03：严格数值与意图／后态——CLOSED

代码入口：`intent`（125—142行）、移动成本计算、`owner.dispatch`（317行起）、`terminal`（384行起）。文档入口：R04、W2 `r1-intent`、G1/G3验收。

布尔、负数、小数、数字字符串、非有限值和超安全范围消耗均拒绝；缺／多意图字段、free／paid不一致、未知价格与移动合成成本溢出拒绝。输出revision溢出在owner提交之前拒绝，当前值、写次数及通知均保持不变。

独立验证了原负spend、bool spend、过大倍率成本、bool revision/cycle，邻接的缺字段／多字段／非有限数／输出溢出，以及E1合法8E截零的正例。

`owner.command.spend`仍明确是内部故障时序夹具；外部checks和business_supported等不是生产调用授权。G3不能照抄它们开放玩家任意扣值接口。

## 5. 负向控制与证据分层

| 证据 | 实际含义 |
| --- | --- |
| 作者本轮213项 | 45正例、163预期拒绝、1持久化故障、4未支持，0不符；属于已读取的作者实际运行记录 |
| 作者冻结两跑 | 两进程退出0、结果字节一致；不计成426项；主线未独立复跑整个套件 |
| 作者四负控 | cycle-dedup / cross-binding / ready-source / closed-ground分别检出1/1/9/5不符，无model_error；属于作者记录 |
| 主线56项 | 独立原反例语义复核、合法／非法对照和组合，共56项匹配；不是新增生产测试 |
| 主线四负控探针 | 使用作者实际开关，分别见证原守卫拒绝／去掉守卫后通过；包含在56项内，不宣称重复获得作者全套负控数量 |
| 原117项／原24项 | 原提交的证据身份保留，不与本轮相加，也不改写为当时已经发现并修复全部缺口 |

主线读取了作者213项结果汇总及相关修订／迁移记录；原117ID全部保留的声明属于作者证据，本轮未独立遍历两个完整case集合证明其逐ID迁移。

## 6. 归档、白名单与检查范围

主线计算输入包内两份原件真实字节及Git blob，与准确提交reviews目录返回对象一致：

| 原件 | 字节 | Git blob |
| --- | ---: | --- |
| R1任务书 | 14736 | 0297717b337cdcb205afbceccef64782d755560e |
| 原136e98a审查 | 11519 | 93fe892aa133f1704790fd072a40e0ba1926d029 |

原件SHA-256、比对结果见附件 `archive-checks.json`。原entry-002/inputs五件及正式DEC／已批首契约不在本轮变更集合；本轮未声称重新同步或重新下载所有原件。

作者白名单、编码、链接、prefix及diff检查通过的命令记录已经读取。主线核对变更集合与保护对象，但**未在完整仓库clone上重跑全量git diff --check、全部链接检查或生产npm**。原获批三行空白已在父基线，本轮无新增例外。

## 7. 保留门槛与不得扩大结论

生产测试／构建、真实浏览器保存／刷新、多标签、完整CTB、完整物品与经济事务、Owner试玩：本轮均NOT RUN。远端CI不是本次模型修订的独立执行证据，本轮未重新核对。

G1仍应在规则及试用配置批准、正式归档实审之后开始；G2／G3依赖相关契约与前项实审。R07跨夜地面和知识为新连续驻留版本的待审局部覆盖，不倒改旧医院规则。O3不能由本次PASS决定。

主线没有修改远端仓库、创建生产任务分支或推main。本报告与附件在本会话交付，尚未归档仓库或更新Project Sources。

## 8. 固定来源入口

所有下列路径以审查SHA为准：

```text
https://github.com/lvlw/elevator-survival/commit/8245cc61a59a6404984129415bf8aac904926ce0
docs/design-drafts/world-infected-001/entry-002/00-owner-review.md
docs/design-drafts/world-infected-001/entry-002/01-local-rule-amendments-draft.md
docs/design-drafts/world-infected-001/entry-002/02-runtime-restore-contract.md
docs/design-drafts/world-infected-001/entry-002/03-next-engineering-goals.md
docs/design-drafts/world-infected-001/entry-002/validation/verify_entry_002.py
docs/design-drafts/world-infected-001/entry-002/validation/fixtures.json
docs/design-drafts/world-infected-001/entry-002/validation/run-record.json
docs/design-drafts/world-infected-001/entry-002/reviews/r1-regression-summary.json
docs/design-drafts/world-infected-001/entry-002/completion.md
```
