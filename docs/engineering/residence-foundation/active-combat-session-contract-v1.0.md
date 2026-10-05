# E02-S 活战斗唯一会话与保存故障合同 v1.0

状态：主线技术定稿，生产未实现。依据已审E01-S职责、[E02纯核心](active-combat-core-contract-v1.0.md)、[严格恢复](active-combat-restore-contract-v1.0.md)及[来源恢复R06](content-supply-restore-contract-v1.0.md#r06-安装保存故障与通知)。来源锁定`464b59d657184636b897f72375eb6b61bd2c5786`。

## S01. 唯一owner及启动

显式新受控门面复用现有ResidenceSessionDomain，与v1/v2/v3/v4共用占用协议，同域不可第二writer，不另建combat Store／独立注册表。composition验证先于占域；ordinary入口不给构造、replace、reset、install或任意后态能力。

唯一current持有完整CombatValue；getState仅受控诊断，不是玩家ViewModel。composition提供受控policy、同步存储端口、真实初始材料及候选外cold expected；复制合法端口外壳、不冻结调用方对象。异步／thenable、getter或非法组成按实际受控合同拒绝，不能把非字符串读取解释为无档。

只有真实read-null及合法首次材料可初配；已有current、已知非首次／关闭事实、坏档或未知版本不得通过再bootstrap／retryRead降格重建。expected在读取候选之前独立存在，provider无候选参数，不从initial origins／battle反推。

## S02. 单笔事务

busy→strict命令及完整before→真实P组合→如HP0消费原死亡计划→原能力与结果连续性验证→R完整聚合→预编码→唯一current一次替换→一次write尝试→一批只读通知→释放busy。

一笔移动＋入场、玩家行动＋全部到期敌响应及胜退／死亡均只提交一次。死亡只安装final dead，不先发布HP0 active；未结pending、敌drain、退却准备不可先安装再由监听器补结。S不得自己算伤害、费用、日额、来源或奖励。

非法原始输入在生产者前拒绝；生产者已调用后才发现后态非法时如实记录调用，但零current／write／notify。不能用“全部零调用”掩盖实际执行阶段。程序异常不能包装成合格业务拒绝证据。

## S03. 保存失败、重试及重入

写失败保留最新current、revision、身体／实物／来源／日额／场次／关闭及余额，明确save-failed；下一合法动作从此最新内存继续。retrySave只验证、编码、写当前值，不回读旧档、不回滚、不重放CTB／风险／药物／胜退E／日结／奖励／初配，不再发玩法通知。

read、initial materials、cold expectation、生产者、完整验证、编码、write、notify及retry边界都有重入保护；回调递归写入／创建／恢复／重试拒绝，finally释放busy。只读订阅异常隔离，不能回滚已提交结果或阻止其他订阅。规则响应仍由有序编排提出效果，不由异步监听器各自扣值、发奖或保存。

新模拟进程只能恢复最后真正写成功的字节及匹配独立材料；不把未落盘内存当成跨进程“恰好一次”保证。domain不是浏览器多标签锁。浏览器启动独立材料持久化与O3另行批准，本项仅受控headless端口。

## S04. 命令与完整链

稳定点原P任务／来源／搬运／拆合／快捷／药食／维护／合法休整、正常返回及截止接续；活战斗仅允许P认可的战斗意图，不能通过move/rest/return/deadline跳过已触发结果。胜退后回到完整稳定值，死亡／关闭后不得重开原委托。

实际初配→真实移动入场→多个玩家决策／敌响应→真实快捷药物→退却→合法休整→同敌再入→胜／死→返回或截止→冷恢复。不能用清敌TEST前态替代本批战斗结果；边界低HP／E可隔离测试并注明，不冒充完整通关。

## S05. 十二组原生验收

| 组 | 必须覆盖 |
| --- | --- |
| S01 | 四版本同型与交叉domain唯一writer，非法组成不占域 |
| S02 | read-null→真实初配→P首次出发与移动入场，不预置活态替代 |
| S03 | 候选外expected及五类可存边界冷恢复，坏档不new |
| S04 | 三敌真实行动、同点、防御／逃跑、实际日额与来源 |
| S05 | 快捷治疗／镇痛、先治疗后受伤／死亡，材料不重复 |
| S06 | 退却→稳定任务／医疗／维护／休整→再入的持续敌人 |
| S07 | 胜退一次E、四终局、H0空steps、Day7边界与死亡优先 |
| S08 | 原能力、完整before及预编码失败原子性，零部分安装 |
| S09 | 入场／用药／胜退／死亡写失败→继续→再次失败→retry最新 |
| S10 | 各回调重入、监听异常及busy释放 |
| S11 | 旧关闭／样本／处分／来源／两声明TEST历史保全，无新真实委托 |
| S12 | 独立计数、五边界恢复后同结果、旧接口与全量保护回归 |

分开计规则、随机、实例、计划、current、write、通知和cold读取／安装；spy可观察，不能stub CTB伪造通过。开工用已审E02-R准确SHA及真实npm基线，结束完整check、准确SHA会话／保存故障实审；不自动进入E03、UI、浏览器、多标签或O3。
