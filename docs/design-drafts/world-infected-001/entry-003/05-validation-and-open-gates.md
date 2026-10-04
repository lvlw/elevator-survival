<a id="doc-world-entry-003"></a>
## DOC-WORLD-ENTRY-003 + ADDENDUM-01 采纳附记（2026-10-04）

批准与校勘：[Owner实际采纳](adoption/inputs/OWNER-approval-WORLD-ENTRY-003-ADOPTION-v1.0.md)、[ADDENDUM-01](adoption/amendments/step-semantics-01/DOC-WORLD-ENTRY-003-ADDENDUM-01-v1.0.md)。唯一正式入口：[DEC-051](../../../05-design-decisions.md#dec-051)、[四值试用配置](../../../content/infected-terminal-core-test-config-v0.1.json)、[A契约](../../../engineering/residence-foundation/terminal-core-contract-v1.0.md)、[终局恢复补充](../../../engineering/residence-foundation/terminal-restore-contract-v1.0.md)、[A→B→C门槛](../../../engineering/residence-foundation/terminal-batch-plan-v1.0.md)。

R1 c67fd4117065e2e0dbd1117cae4fbfaa83791599主线专项PASS仅关闭F01。以下原106／175、主线37／43、API观察和冻结证据保留原归属；本次不重跑、不更改保护指纹，不能将旧成绩加为当前检查。步骤消歧仅作固定源码文字对照，未运行生产测试。

本次只检查文档字节、参数、链接、范围／对象、架构与diff；生产测试／npm run check／模型／API／build／浏览器／Owner试玩均NOT RUN。文档实审PENDING，完整终局、v2保存、真实内容／CTB、专长／工具箱、UI、O3和体验Gate继续保留。

---

**以下完整原文为来源候选与历史记录；涉及本次已采纳范围，以顶部正式入口为准，其余仍保留原状态。**

# 验证范围与开放Gate

**DESIGN DRAFT，有限证明不等于生产支持。** 真实结果、命令退出码及冻结指纹见[results.json](validation/results.json)；当前源码探针见[probe-results.json](validation/probe-results.json)。源事实固定于 `7ca547ab8ab4f411d1102a79baf8c0796f4b082c`。

**R1当前定位：** [主线F01](reviews/world-entry-003-r1-inputs/AUD-f93e17a-WORLD-ENTRY-003-review-v1.0.md)对f93e17a结论为NEEDS REVISION。原106项、18件冻结及旧执行结果保留；当前作者修订结果在results.json的`r1`，不是主线批准。固定37专项单列，含4项未支持，绝不与主套件相加或把复跑计为新增。

## 三层证据

1. 原件与已生效事实：[inputs](inputs/BASELINE-AND-INPUTS.json)、既有DEC/合同、003A—D实际确认。G4原2791测试是历史参考，不计本批运行。
2. 原生当前行为：`current-api-probe.mjs`用Node加载实际TypeScript模块，复用明确测试夹具，不mock校验结果。验证G1正常/期限/死亡与G2动作HP0、G3关闭拒绝、G4拒绝死亡及写盘故障。不是生产测试套件或候选终局实现。
3. 有限候选：独立Python模型、fixture、候选参数；T01—T12按预期分类，unsupported不算PASS。G1公式取现有只读批准配置，不复制34参数。它证明选定状态关系，不能证明五图可达、CTB、浏览器或Owner体验。

## 有限矩阵

| 组／条款 | 断言与主要反例 | 证明边界 |
| --- | --- | --- |
| T01/C01 | 完整／重伤／少普通物同奖；目标或真实样本缺项、伪造来源拒绝 | 受控facts夹具，不证明内容生产者已接 |
| T02/C02 | P=0/19/20/47收入0、一次min(P,20)，普通物状态保留 | 无商店／重复任务经济 |
| T03/C03 | Day7异地稳定先血感染饥饿、各阶段死亡短路、活者ready；battle/immediate拒绝 | 不做战斗解析，稳定条件明确作为前提 |
| T04/C04 | Day7正常成功失败不补夜、静态hub无变化、非H0／未结到达拒绝 | 无新内容入口，不解释为可传送 |
| T05/C05 | 动作／休整HP0，当前资产不可继承；历史清退不改旧成功／处置 | 后者是清退子组件见证，不是完整第二任务安装测试 |
| T06/C06 | 实例唯一归属、状态/定义一致、地面隔离、资源不重建 | 夹具仅代表none/durability/charge等资源，生产需全定义校验 |
| T07/C07 | 重放、换execution/title、关闭后launch、替换初态均拒绝或不再结算 | 单会话内幂等，不承诺离线回档防护 |
| T08/C08 | 四种合法终态恢复；原死亡提案绑定/阶段/终局凭证先验，拒绝中间HP0冷恢复；缺字段／身份／闭合／账／处置／时序拒绝 | 固定单委托，未来历史活动由工程原生补充 |
| T09/C09 | 错命令零副作用；非法原提案调用1次而零提交/写/通知，current/disk/issued不变；合法HP0一次消费与保存故障重试 | 模型存储替身；当前G4真实行为另见探针 |
| T10/C10 | 原字段覆盖前的负/小数/bool/NaN/Inf/unsafe/上限/revision；范围合法但无所有权的改写也拒绝 | JS safe integer边界由模型显式限制，Python大整数不能冒充JS无界安全 |
| T11/C11 | CTB/医疗/第二真实任务/旧档发布unsupported | 明确未支持，不计通过数 |
| T12/C12 | 条款锚点、参数oracle、保护指纹；旧ready不能免后续周期 | 锚点检查不能代替语义审查；跨文档由两名只读审查＋根整合补足 |

`fixtures.json`每案有稳定ID、条款、分类、输入patch与独立期望。模型body只抽象本期日结字段和一项额度；夹具资源上界100不是生产配置；简化M/E/C和H0/H5/H8不定义世界Schema。`history-retire`只验证清退函数，临时HP0对象不作为可恢复聚合；`old-ready`只调用后续周期子过程，未注册第二任务。死亡入口/cause/步骤序列及当前身体必要条件在模型内联合检查；不从冷候选重跑伤害，也不证明用户同时伪造全套历史不可行。完整恢复、所有生产者提案不可伪造性和所有定义资源限制均属于后续工程验收。

R1补足原106项未覆盖的提案入口：11个固定缺口及相邻字段/步骤回归均绑定C08/C09/C10；期望为具体语义Reject＋零副作用，不以提交后断言或异常代替。原base及既有用例不删不改，合法动作HP0、休整、成功/失败/期限对照保持；固定producerCalls与plans分开记录，既不再算流血也不复写原提案。

## 冻结和复跑规则

先完成交叉审查与修订，再冻结六份正文、配置、模型、fixtures、API探针与两份追加状态正文；输入原件和正式源码全部只读。冻结后两次独立进程输出稳定JSON，时间与命令回执另记。任一规范或模型字节变化须重做两跑。

使用同一组断言选择四负控：`duplicate-settlement`重复入账、`death-recall`HP0仍召回、`old-ready`后周期免结算、`reopen`已有关闭态被初态替代；每次必须退出1并列出失败ID，脚本崩溃不能算检出。正常结果预期0，unsupported单列。实际数量以结果文件为准，不追求预设总数。

命令（`python`须指本地可用解释器，输出放仓库外）：

```text
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --output <outside>/run1.json
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --output <outside>/run2.json
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control duplicate-settlement --output <outside>/negative1.json
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control death-recall --output <outside>/negative2.json
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control old-ready --output <outside>/negative3.json
python docs/design-drafts/world-infected-001/entry-003/validation/check.py --negative-control reopen --output <outside>/negative4.json
node docs/design-drafts/world-infected-001/entry-003/validation/current-api-probe.mjs --output <outside>/probe.json
npm run validate:architecture
```

原003的21路径/18件冻结属于历史；R1按[26路径与归档映射](reviews/world-entry-003-r1-inputs/BASELINE-AND-SCOPE.json)独立核对，并保留completion完整原前缀。保护检查核对当前精确白名单、原件大小/SHA256/blob、两共享文档完整基线前缀、所有范围外Git对象与工作树无改、相对链接/锚点、UTF8及换行、普通/暂存/基线/最终diff --check。归档原件若自带CRLF只按原字节保留并如实记录，不能为了统一LF破坏SHA；本批新写内容LF。没有空白例外授权，diff告警不能吞掉。

## 到下一次可玩版本的欠账

| Gate | 负责阶段及依赖 |
| --- | --- |
| 终局参数／任务件细则正式采纳 | Owner三组选择＋本批实审，再另发正式落文与工程契约 |
| 新委托出发前死亡协调 | 未来真实新任务供给阶段；due日结若在激活前致死，旧成功不改、新任务不虚构已活动，需单独原生验收 |
| 真实战斗与医疗 | 专项生产工程；保持单精力及真实body结果，依完整保存和终局消费 |
| 三专长差异／工具箱完整路线 | 受控内容与规则专项；现有Draft不得被本次状态验证冒领通过 |
| 五图实物与任务接线／收藏提取 | 内容生产者完整真实资格、唯一来源、安装/交付、路线核验；没有它纯核心只能headless夹具验收 |
| 安全提示／结果摘要／低资产UI | 真实身体、清算摘要与玩家可见知识先就绪，遵循现有UIR；不暴露隐藏精确信息 |
| 浏览器、多标签、O3入口/旧槽 | 后续发布专项，明确并发持有与保存边界；当前候选新格式不替其作决定 |
| Owner首玩与长期经济 | 可玩内容闭合后实机体验；采用当前单次任务政策不等于长期供给已解决 |

本批生产测试、`npm run check`、构建、浏览器、旧269/213/包验证与Owner试玩均NOT RUN；只执行明列设计检查和架构边界检查。新生产测试0，旧验证原件不修改。
