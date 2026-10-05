# E02-P 活战斗纯核心与唯一事实合同 v1.0

状态：主线技术定稿，生产未实现；准确来源`464b59d657184636b897f72375eb6b61bd2c5786`。依据[DEC-052](../../05-design-decisions.md#dec-052)、[时序合同](active-combat-lifecycle-contract-v1.0.md)及[来源恢复合同](content-supply-restore-contract-v1.0.md)。不新增玩法、配置或本轮源码写权。

## P01. 目标及前置

由真实初配、P/G2移动与三个已批敌profile产生真实CTB入场／行动／胜退／死亡；并能接回真实稳定任务、药食、维护、G1休整与A终局。交付完整、不可伪造的纯计划，不安装current、不编解码或写存储。

开工基线必须是本组文档归档准确SHA实审通过后的主线指定提交，含已审E01-P/R/S；不得把设计SHA或旧S的SHA自动当生产开工点。工程任务书另列精确路径、起始SHA、分支、验收及停止。下文函数名是接口角色建议，不声称模块已存在；具体TypeScript签名随P详细设计定稿，语义不得缩减。

## P02. 唯一事实与协议

新CombatValue继承SupplyValue的领域事实，但使用独立协议判别。character是唯一身体／精力／日额／clock；carried、itemStates、warehouse是唯一可用实物／资源；site拥有地面、知识、设施、任务事实及同一条持续敌人；missions、balance、receipts、archives及来源份额保持原所有权。

活战斗仅增加其身份／EntryWitness、队列、最近DecisionWitness及必要的已闭场次／消费引用，不另存可编辑enemy、playerCondition、backpack、dailyUsage或第二钱包。旧CombatEncounterSnapshot只能临时从这些事实投影求值，求值后受控写回唯一位置，不并列保存。

旧P/R协议与旧签发能力保持。新聚合不可删掉combat／新receipt伪装旧SupplyValue获取通过；可窄抽取无版本含义的共用facts校验、消费或reducer，新聚合自身必须完整验证。稳定动作不能各复制一套公式；core不能反向读state/content/docs，不建通用事件系统或任务SDK。

## P03. 受控能力与原始输入

建议角色：受控policy/profile工厂、planCombatEntry、planCombatAction、assertCombatPlanCurrent、consumeCombatDeath。ordinary入口只暴露只读查询／合法命令资格及必要类型，不提供签发器或上传effects／nextState的入口。

命令逐意图strict keys：expectedRevision、当前battleId、攻击／蓄力／防御／临时攻击／逃跑；快捷药物另有真实slotIndex、instanceId及合格woundId，quantity省略或安全整数1。禁止客户端传伤害、roll、胜负、任意敌target、支持开关或后态。先验证原形状、布尔、ID、数组／null、安全整数和域，再比较、封顶、复制及覆盖；不能靠bool/int转换或忽略字段使坏输入合法。

私有能力绑定完整独立before、dependencies、意图、身份／执行／规则／配置／内容和原输出；JSON／克隆／旧revision／跨执行或跨受控作用域不能冒用。消费者不只检查结构或revision。校验不得修改或冻结调用方原对象。

一次移动＋入场、一次玩家行动＋全部应结敌响应＋胜退／死亡，各推进外层revision一次。内部G2/P局部revision不能额外叠加，也不能由普通请求任意覆盖。

## P04. 真实药耗、日额及随机

战中不直接调用仅支持稳定点的planSupplyMedical；复用真实目标判定、condition原语及consumeSupplyUnits的来源份额操作，通过窄战斗组合一次消费快捷槽一单位、形成medical disposition并联结CombatUseWitness。消费、药效、ItemState、slot变空及firstBandageUsed同笔；不能先删物再补来源或另发库存。

首绷真假继续与真实medical bandage历史联合一致；战中／战外共享同一标记。蓄力投影G1剩余额度并真扣，真正生还周期才重置。耐久末次正余额可不足额截零；资源0只能用已允许的替代行动，电量依旧足额支付。

风险沿用统一算法及执行＋catalog＋持续敌人＋已行动计数＋actionId＋purpose地址化子流，不含battleId、日期或重入次数。旧每子流drawIndex=0与site累计riskDrawIndex不是同一数；实际风险检查推进唯一累计事实并记录区间，来源搜索随机保持独立域。死亡短路遵时序合同，不为验证或恢复再抽一次。

## P05. 新死亡协议

旧G1 BodyStep／旧consumeSupplyDeath保留原单调伤害及来源校验，不能用负伤害塞治疗。新CombatBodyTrace使用明确治疗／直接伤害／动作流血／伤势／暴露等分支，带真实before/after、requested/actual、sourceAction、CTB及消费引用。治疗封顶，伤害按HP截零，非HP步骤不能改HP；邻接连续，HP0为最后身体结果，之后不补治疗／风险／事件。

consumeCombatDeath只消费原签发计划；核对原始before、执行／battle／revision、真实非空trace与最终HP0，复用同一A关闭／处分／钱包结算。不得再调用CTB resolver、applyCombatEffects、伤害、随机或用药来重算已发生结果；不增加第二revision，不提交HP0活动中间态，不发成功奖励。

新combat-death receipt单列来源，关联实际EntryWitness、最近checkpoint、trace、actionRevision及处分引用；不批量放宽旧四种来源。死亡也保留真实敌伤／击杀与实物消耗，但玩家死亡优先于胜利／任务收益；旧成功、交付、安装及罚款历史不倒改。正常H0空steps与真实休整／截止有序非空步骤分别保持。

## P06. 最小证据与复用边界

EntryWitness来自实际移动前态及签发结果。DecisionWitness记录本命令起止CTB、队列变化原因、每个已执行敌行动与count/risk区间、用药／资源引用。ClosedBattleReceipt保留本场入退出锚、结果、elapsed及一次扣E。只保存必要领域证据，不要求保存整场每版body或另建全事件流。

允许后续工程书列窄适配：旧combat的profile／快照入口／动作／风险、Supply无版本共用操作、A新来源，以及content每敌profile。旧医院公开语义与旧测试保持；G1公式、G2移动／pending规则、身份关闭、旧v1/v2/v3恢复及会话、38/103配置、批准内容和依赖只读。必要文件须先进入明确白名单，不能用本合同直接授权整目录。

## P07. 十二组原生验收与停止

| 组 | 必须覆盖 |
| --- | --- |
| P01 | 三敌逐动作profile与已批数据逐值对照，旧医院profile等值回归 |
| P02 | 真实初配→移动→首入；G2到达标记不误判；E0入场及移动HP0优先 |
| P03 | 再入真实from/edge、持续敌人/count/risk及首入与再入队列 |
| P04 | CTB同点、多个应结敌响应、直接致死短路及真实伤型 |
| P05 | 防御一次与到期，退却准备锁定及同点完成 |
| P06 | 快捷绷带／镇痛真实份额、无目标拒绝、治疗后死亡与首绷跨战 |
| P07 | 蓄力日额、弱点140+60、末次耐久与本击外套保护 |
| P08 | 胜退elapsed边界、单笔E、原节点退却、重复费拒绝 |
| P09 | 新死亡非空typed trace及一次A消费，HP0只产生最终dead |
| P10 | 战后真实任务／维护／医疗／休整继续，H0空steps及截止回归 |
| P11 | 原值／clone／JSON／stale／错依赖反例，输入不变及独立调用计数 |
| P12 | 真实退却→休整→同敌再入→胜／死及旧历史、旧接口全量回归 |

每组用真实生产者；隔离低HP等TEST材料可验证边界，但不能清敌或写completed冒充战斗结果。有限350项与23探针不能替代上述验收。开工真实npm测试基线；结束按实际package执行npm run check及范围／diff审计。普通commit/push后提交准确SHA立即停审，不自动R／S或全路线接线。
