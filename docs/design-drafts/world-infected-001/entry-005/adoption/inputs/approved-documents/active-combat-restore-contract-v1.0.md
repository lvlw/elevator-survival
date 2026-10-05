# E02-R 活战斗严格恢复合同 v1.0

状态：主线技术定稿，生产未实现。依据[DEC-052](../../05-design-decisions.md#dec-052)、[来源恢复合同](content-supply-restore-contract-v1.0.md)、[WORLD-ENTRY-005-R1恢复稿](../../design-drafts/world-infected-001/entry-005/04-active-combat-save-contract.md)，来源锁定`464b59d657184636b897f72375eb6b61bd2c5786`。

## R01. 独立格式

在Owner已批准受控新格式方向内，主线将E02技术格式定为`elevator-survival.residence-headless / formatVersion=4`。它不是Owner新指定的玩法数字，也不是已经注册。精确外壳为`{format, formatVersion, state}`且无额外键；state随已审E02-P真实类型锁定，不采用有限Python示例作为生产schema。

v4拒绝v1/v2/v3，旧三reader拒绝v4；不自动迁移、猜字段、清档、补初配或回退新角色。旧版本保持原语义，不等于承诺永久维护全部旧产品／开发档。浏览器槽路由、旧医院入口期限和O3仍未决定。

## R02. 可保存边界

| 完整边界 | 处理 |
| --- | --- |
| first-hub／living-hub／稳定active-world | 完整领域值，战斗为空或stable判别 |
| 入场第一玩家决策点／完整动作后玩家决策点 | HP与敌HP正、同敌pending、真实已遇状态、currentCTB=playerNextCTB<=enemyNextCTB |
| 尚未初始化的活pending／敌响应drain／逃跑准备 | 拒绝；只能存在同步私有计划工作区 |
| 胜利／退却结束 | 已扣一次E并生成闭场收据，清当前combat及pending，位置与敌状态已完成回写 |
| 死亡 | 只final dead；无可操作site，归档现场和实际combat-death或既有来源receipt相连 |

临时防御在完整动作内消费／到期；逃跑准备同步结完。不能删pending或临时对象骗过旧reader，不保存已到期未处理的敌响应或“待扣费胜利”。

## R03. 联合验证

先验格式／原形状，再验规则、G1／终局／供给配置、内容／catalog及随机算法版本、角色／声明范围和独立expected。逐层strict，数字只安全整数，布尔／标签／非空ID／数组及null分支先验，缺锚语义拒绝，不用异常、取整或覆盖原值通过。

联合检查唯一身体、任务、可用实物与ItemState、来源／拆合／消费／安装／交付、首绷与日额、钱包／处分／收据／历史和当前phase；复用P完整不变量，不只检查字段形状，不擦除新字段转交旧协议自证。

EntryWitness核对实际执行、battleId／entryRevision／enemyId关系、合法from/to/edge、到达步骤及原敌count/risk/encountered。DecisionWitness核对本命令起止CTB、队列变化原因、已执行敌行动周期及风险区间、日额／资源／消费引用。ClosedBattleReceipt核对结果、elapsed、一次E与无重复场次。

敌风险子流与累计risk分清；仅有单调cursor不证明历史。直接致死不推进后继intent/count，但真实攻击及死亡trace必须保留。旧搜索随机不因恢复战斗推进。

## R04. 实际场次死亡

新combat-death单独验证实际entry、lastCheckpoint、source、battle／执行／revision、非空typed trace、真实最终HP0及处分／来源引用。不得从spec.activeBattle、默认节点、首场revision或候选自行拼出独立锚；后继场／再入场合法死亡与错误场次成对测试。

治疗不写负伤害，HP不足截零，HP0后无继续事件；旧G1/P死亡流血幅度／休整来源F01及正常H0空步骤仍按各自来源保持。不重算CTB、动作、日结、伤害、随机、用药或终局清算来“验证”已发生历史。

R1有限模型的expected.current及case.before只是独立TEST表达。生产冷恢复需要足够的候选外锚和持久最小来源证据，不因此强制另存每场全部原身体或永久全量committed。P先定义真实证据；R任务再一次锁定精确字段，缺证据就拒绝，不能伪造历史补齐。

## R05. 独立expected、同进度与权限

expected含角色／phase／revision／cycle／missions／initial及受控版本。active另有实际battleId、entryRevision、边两端、enemyId、queue、intent/count/risk锚；dead另有最新关闭binding/outcome/source/battleId及trace摘要。first-hub初始execution仍来自候选外独立初始材料。expected本身也要严格验证。

cold provider不接收候选文本；材料必须先于候选存在，可由先前真实提交记录／独立初始材料构造。不能从候选origins、battle或closure反推expected自证。同进度恢复独立验证两个完整值并全值比较，不以局部锚相同放行替换物品、余额、旧关闭或敌人事实。

冷恢复保证锚字段及存内证据一致性，不证明被连同外部材料完全重写的离线历史；hash是完整性比对，不是签名或防回滚认证。decode只返回深冻结候选，不授动作authority、current安装或Storage写权。

## R06. 原生验收及停止

从真实E02-P构造五类完整边界，逐个encode/decode往返、字节稳定、输入不变；恢复后再交真实P继续应产生同结果。覆盖三敌、后继场次、退却→稳定治疗／维修／休整→再入、治疗后死亡、错ID／entry／queue／count／risk、重复费用、消费回滚、缺独立锚与旧历史篡改。

v1/v2/v3与v4双向拒绝；独立监测codec阶段G1/G2/P/CTB/随机/发物/关闭/IO/通知均无玩法重放。完整前态能力由P验证，纯解码不冒充签发。开工基线取已审E02-P实际SHA，结束完整npm run check及范围检查，准确SHA恢复接缝实审后才进入S；本项不接current、浏览器或真实存储。
