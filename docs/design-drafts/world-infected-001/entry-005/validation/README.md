# WORLD-ENTRY-005 隔离验证

有限边界与真实源码观察分两条证据线；这不是新生产测试目录。所有候选witness/初态为TEST，不是Save字段或生产运行参数。

## 有限检查

```text
python docs/design-drafts/world-infected-001/entry-005/validation/check.py --cases docs/design-drafts/world-infected-001/entry-005/validation/cases.json --output <外部结果.json>
python docs/design-drafts/world-infected-001/entry-005/validation/check.py --cases docs/design-drafts/world-infected-001/entry-005/validation/cases.json --output <外部负控.json> --negative-control duplicate-exit
```

同目录state-candidates.json必须存在；输出显式写入指定文件。无第三方依赖，无随机、全世界搜索或伤害生成。固定case含ID/source/before/command/proposal/expected/support，报告追加actual/mismatch/exception；expected不调用被测函数产生。exit0为匹配全部固定预期，exit1为语义mismatch，exit2为程序异常（参数错误也不可当语义检出）。未知负控不回落正常模式。

| 负控ID | 单独禁用的候选约束 | 保留 |
|---|---|---|
| duplicate-exit | 一次退出收据／单笔扣费关系 | 合法费用算式、状态与节点约束 |
| persistent-reset | 退却／回访的持续敌人值连续性 | 原始结构、数值、身体、资源约束 |
| consumption-rollback | 消费／首绷／日额的跨步骤资源连续性 | 目标、槽位、药效与结构约束 |
| binding-acceptance | 队列、原来源、死亡的独立锚联合约束 | 基本状态、原值、版本、HP0与步骤合法性 |

每次只设一个开关，不修改src或expected；至少一个固定反例由拒绝变接受而exit1才算该负控检出。记录具体mismatch IDs及异常数，不能把导入/类型/程序异常当检出。正常类目supported-boundary只表示局部关系匹配；expected-rejection不算新玩法，unsupported不计实现通过。

有限trace局限：只检一个示例命令内有序身体检查点及相邻身份／消费关系；不生成所有敌响应、不证明profile完整规则、CTB可达、签发能力不可伪造、路线或离线全历史真实性。完整v4字段/联合规则以03/04合同为准，有限简化形状不等同生产schema。

## 当前源码原生探针

```text
npm exec vitest -- run --config docs/design-drafts/world-infected-001/entry-005/validation/vitest.probe.config.ts --reporter=json --outputFile=docs/design-drafts/world-infected-001/entry-005/validation/native-results.json
npm run validate:architecture
```

独立config只include本probe，node环境，cache在系统临时目录；原生产测试配置不动。N01—12为真实旧医院CTB观察（fixture沿用既有测试、个别明确TEST初态）；N13—21为真实G1/G2/P/R/S受控调用，假存储只作同步故障注入。没有stub相应CTB解析。R当前拒绝4、S当前拒绝活pending是正确观察，不是已实现新格式；N18严格检查EXPECTED_MISMATCH，不靠捕获任意异常算拒绝。

冻结清单见[manifest](../frozen-manifest.json)。冻结后两次不同Python进程输出须字节相同；最终原生probe至少独立跑一次，真实时间JSON不作字节对齐。结果：[有限](results.json)、[原生](native-results.json)、[负控](negative-controls.json)、[命令与范围](../checks.json)。

本轮全量生产测试/构建/浏览器/真实Storage/Owner试玩NOT RUN；新增生产测试0。历史3621/原269及其他有限包均不重跑，不与本轮相加。模型/推理配置无法从本任务工具核验，不声称切换。

自查补充：有限死亡恢复增加原来源／battle绑定及非空真实致死trace四个反例（原98扩为102）；E0入场样本明确为2E最后移动，避免把任意20E减到0当实际路径。原生另加N22三敌持续声明缺少CTB profile的观察、N23快捷镇痛真实消费与不止血观察。


## WORLD-ENTRY-005-R1 复跑入口

上文106项／四负控为df1c3ff历史。当前普通命令强制同时读取原cases.json和同目录r1-regression-cases.json；所有固定expected来自原任务／主线独立34项／作者独立边界检视，不由被测检查器生成。新增回归中的REJECTED仅匹配业务Reject；EXCEPTION必失败。报告同时检查输入未改变；重复运行不计新增测试。

原106项ID/expected/support保持，5个死亡fixture修正账保存在r1-regression-cases.json。新增回归含主线31个非UNSUPPORTED样本和相邻字段矩阵；34项专项仍使用原件全部输入、原通用runner单独检查，三个未支持不算实现通过。有限模型只覆盖声明局部关系，不承诺生产计划签发、完整CTB可达或全离线历史验真。

```text
python docs/design-drafts/world-infected-001/entry-005/r1-inputs/evidence/run-review-cases.py --checker docs/design-drafts/world-infected-001/entry-005/validation/check.py --spec docs/design-drafts/world-infected-001/entry-005/validation/state-candidates.json --cases docs/design-drafts/world-infected-001/entry-005/r1-inputs/evidence/review-cases.json --output <外部专项结果.json>
```

六类负控仍以原普通命令加--negative-control执行；原四类不改其语义。新增arrival-domain-bypass仅撤销到达HP/E域上限，结构及类型仍验，HP13/E101应因此误接受；fixed-first-battle-anchor错误恢复首场ID约束，合法第二／后续场死亡应被误拒绝。每类只开一个故障，expected不改、exit1且异常0才计语义检出；不以一律拒绝或崩溃检出冒充通过。

冻结输入采用frozen-manifest.json的r1对象；historical.original完整保留旧manifest，不按新文件去冒验旧hash。最终普通双跑输出字节一致，34专项及23原生分别执行；本次没有生产测试增量，也不重复累计复跑或专项与回归内重复见证。
