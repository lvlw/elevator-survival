# E02-P 准确 SHA 源码实审 v1.0

日期：2026-10-06。
结论：**NEEDS REVISION；限定修复 F01／F02，暂不进入 E02-R。**

## 1. 身份、范围与证据分层

- 受审提交：`9f0eaacfbb83e49401c52fb57c3cfa061b2ef026`。
- 父／起点：`4166fb25ab2898ca602043fbddacbb88d3444fdf`。
- tree：`249accacd9327f7610544f10c84e4f8246ae369e`。
- 分支：`feature/residence-combat-core-001`；远端引用已核对到受审提交。
- 作者报告100条变更、32修改／68新增、+4736/-1002；本轮已读取提交和原116路径任务，**不把定点阅读写成全部100文件完整审计通过**。
- 五份原任务输入已用实际附件字节重算Git blob，与受审提交的输入目录逐项匹配，见`evidence/input-integrity.json`。

主线实际定点阅读了新聚合、schema、能力、计划、入场、动作、投影、effects、trace、history、退出／死亡相关接缝，以及旧CTB的profile、snapshot、transition、risk、共享供给验证和相关测试。对发现的阻断项给出限定返修，不对未完整覆盖的组合追加全量通过结论。

## 2. F01：队列记录仅自洽，没有充分绑定真实动作时长

级别：阻断本批准入。主要位置：

- `src/core/residence-combat/history.ts`：`verifyDecision`的队列首项、相邻项及最终值比较。
- `src/core/residence-combat/validation.ts`：最新decision与battle／唯一现场值比较。
- `src/core/residence-combat/effects.ts`：当前持久化decision记录的生成处。

现有校验能拒绝断开的队列，但对保持所有相邻值一致的改写没有核对足够的规则来源。例如：

| 专项ID | 改写 | 应有关系／隔离实际 |
| --- | --- | --- |
| F01-player-basic-recovery80 | 把管基础行动的下一玩家机会100及各对应队列字段一同改成80 | 已批基础100不能变80；原样历史逻辑误接受 |
| F01-enemy-interval430 | 保留护工在70的真实行动，将其下一机会170及对应字段一同改成500 | 此basic间隔100，下一应170；误接受 |
| F01-escape-complete75 | 无初始负重／伤口增量的80退却改成75，连带elapsed及队列一致，费用仍6 | 应按真实锁定准备80结束；误接受 |

已批准依据为`active-combat-lifecycle-contract-v1.0.md` L02—L04及`active-combat-core-contract-v1.0.md` P03／P06／P07。P的公开纯值读取及能力创建依赖该聚合；不能只因v4尚未开始，就把P已承诺的完整真实证据全部留给R。

修复要求：从该条真实命令、受控profile、入场／最近checkpoint、真实敌行动及退却锁定事实验证队列变化原因与时长。需区分致胜立即短路、玩家／敌同点、退却完成、致死敌击、多次敌响应、蓄力延后；不能简单规定所有动作都等到完整恢复时长。若现有证据不足，在P纯记录中增加最小必要证据并在生产者中真实生成，不重跑CTB或保存整场全状态来验证。

## 3. F02：typed死亡步骤算术合法，但来源、时点与规则幅度脱节

级别：阻断本批准入。主要位置：

- `src/core/residence-combat/trace.ts`：`verifyCombatBodyTrace`验证裁剪和HP邻接。
- `src/core/residence-combat/history.ts`：完整decision调用trace时未充分联合profile／场次／命令／资源与时钟。
- `src/core/residence-combat/terminal.ts`：新死亡能力消费及完整后态验证。

五项专项均保持所需数量／HP算术等已检查关系，但应由完整领域校验拒绝：

| 专项ID | 原样历史逻辑误接受的改写 |
| --- | --- |
| F02-death-trace-after-exit | 记录终点为CTB70，却将致死身体步骤标为CTB999 |
| F02-death-wrong-action-source | 护工场次的致死来源改为`porter-basic` |
| F02-death-damage-inflated99 | 护工basic经实际外套保护请求2，改成请求99；HP2截零的actual仍2 |
| F02-bleed-request2-clips1 | 应请求1的自身行动流血改请求2；因HP1截零，actual仍1 |
| F02-bleed-wrong-source | `post-action-bleeding`行却写入`orderly-special`来源 |

**一般裁剪helper不是完整规则验证器。** 当前通用trace测试中“请求20、HP3实扣3”的纯算术用例本身可合法保留；错误在完整领域记录缺少上下文校验。不要为了修复完整聚合而让通用helper一律拒绝大于HP的请求。

完整上下文须核对实际battle／敌definition/action、该命令的时序范围、真实防具／防御保护、动作流血配置、真实治疗／消费来源。治疗封顶、HP不足截零、合法HP0必须保持；不得以最新身体／伤口倒推所有旧历史，不改变已批准伤害和药效，不重算动作／风险／用药／日结／清算。

## 4. 主线实际执行：20项隔离检查，不是原生全聚合

运行文件：`evidence/run-isolated-review.cjs`。
原样源码：`source/{validation,history,trace}.ts`。
三件Git blob与受审提交一致，见`evidence/source-integrity.json`。

实际结果：**20项，12符合、8不符、0程序异常；退出1；输入与依赖检查无修改。**
12符合包括4个合法局部对照和8个现有拒绝对照；8不符是上列3个队列、5个来源／trace误接受。不是20项新增生产测试。

必须保留的执行边界：

- TS源码仅转译，三个被审模块中的历史／trace判断未改。
- Zod／parse、共享Supply/G1/G2聚合、profile签发／projection及少量identity/config原语使用显式适配。
- 数据是手工裁剪的TEST局部见证，不是完整生产者输出；其中布尔trace对照由明确的严格trace适配器参与拒绝。
- 因此**本轮没有实际执行完整原生`readCombatValue`、没有全量npm复跑、没有v4解码或会话安装**。不将隔离误接受直接表述为玩家存档已经被接受或普通战斗已经变快。

返修包提供`evidence/native-review-regression.test.ts`：使用实际content、首次发放、P/G2和真实CTB产生四组前态，再定点篡改，先在完整仓库修前执行。主线仅做了此模板的TS语法转译检查，未跑导入／完整typecheck或原生测试。Codex须保留原始模板的首跑实际结果；若原生某项已被现有其他校验拒绝，报告准确拒绝点，不能弱化校验制造失败以追平本报告数字。

## 5. CI、作者证据及保留的进展

准确提交对应CI **#150**，run `37369977295`，job `111964433614`，当前`completed/success`；先前queued已由后续实际读取更新。主线读取完整job日志：checkout是受审SHA，架构52 DEC／327 core、类型、198文件／3723测试及构建成功。见`evidence/ci-observation.json`（这是读取笔记，不冒充原日志副本）。

作者基线179／3621，新增19文件／102项，最终198／3723，与CI日志一致。作者自述负控及本地完整检查保持作者证据；主线未重跑作者102项或其四类外部负控。CI与作者复跑不累计为更多新增测试。

实际代码与原测试已经展现三敌profile、真实CTB、真实来源消费、新死亡token一次消费等进展。代码中的死亡消费者没有因本轮历史问题被证明会重算战斗。CI也实际包含真实三敌／任务组合测试通过；本次不据此宣布九组合、完整体验或后续v4已经通过。

## 6. 范围、相邻检查及停止点

修复是E02-P同一Goal内的领域证据补齐，不重开玩法，不修改G1/G2或旧CTB语义，不执行R/S/E03，不改正式合同／配置／依赖。可以按返修任务精确范围细化P纯值的必要witness，不能引入第二身体／敌人／库存、全事件日志或迁移框架。

相邻数值审计须考虑安全整数、CTB加法、count/risk区间及验证工作量。当前history有按候选actionCount区间循环的代码；本轮未对超大数执行压力测试，不把它列为已经动态复现的第三漏洞。返修应避免靠对不受约束跨度反复模拟来实现校验。

W01继续仅原两输入七行；它不是本次阻断原因，无新增空白例外。依赖／CI已有告警另留维护，未经授权不执行audit fix。

**停止点：NEEDS REVISION；下发E02-P-R1，同工程分支普通commit/push后准确SHA专项复审。不得自动进入E02-R。**
