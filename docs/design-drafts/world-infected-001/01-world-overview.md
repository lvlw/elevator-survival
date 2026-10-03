# 完整感染世界 Draft v1.4 / Engineering Review Candidate

> **WORLD-DESIGN-004 · 2026-10-03。** 当前集中审定候选，不是正式规则版本、Design Freeze、生产实现或试玩批准。正式医院仍按已确认DEC及其版本运行；此为004当时状态；本次局部归档见下方附记，其余新世界方向仍待相应正式落文。

> **DOC-WORLD-ENTRY-001 · 2026-10-03局部归档：** [DEC-049](../../05-design-decisions.md#dec-049)已正式确认身份、单次驻留及终止关闭子集；[首工程契约v1.0](readiness/03-first-engineering-contract-draft.md)已获Owner批准、未实现，生产开发另行授权。整包仍为Draft v1.4。本次只同步白名单当前入口；04主线、唯一终局等未逐文件改写，其中本次子集以DEC-049为准，其他Owner确认、Draft及历史身份保持。

## 当前首玩起点与终点

明确接取《封锁区·未完成的转运》→在医院、酒店、供电、物流、通信五图连续驻留，真实携回指定样本并恢复当地急救转运→完整成功、合法失败返回或实际死亡→生还者在真正中枢恢复、兑换、维护、整理。**当前只有这一份真实委托；成功／失败正式结束后不能重接，没有下一份内容时就停在静态中枢。** 不复制任务提供“继续”按钮，也不把无内容等同死亡。

世界内合法跨图、原位休整、退却、分段突破、保存后继续同一活动进度属于同次驻留；不提供可续做任务的中枢往返。五图和七日期限是本期内容基线，不是所有未来世界的上限。

完整成功与重伤成功按同一任务声明得奖，必要样本不豁免。003D确认失败收入0、仅一次扣min(当前积分,20)、普通合法携出与装备状态延续；末日稳定截止先结当期后果，实际HP0死亡，尚活才失败召回。正常H0返回包括Day7均不补夜。完整定义只读[04任务说明](04-main-mission.md)与[唯一终局](reviews/endgame-candidates-v1.1.md)。

当前推荐120奖励、20／40／80身体服务和六商品目录仍为Draft。普通269E路线首程：120−40治疗−12购金−20购粮2−18购绷＝30；真实消耗金2布1完成维护，粮未自动食用。价格与资格唯一主表在[11](11-points-hub-recovery.md)，来源与维护在[05](05-resource-economy.md)。

只有另有真实且合法可接的委托，下一明确出发才按最新整备后身体处理一次应有衔接；默认产品输入没有这一入口。隔离异委托夹具只检验边界，不提供第二份玩家内容。旧十次相同供给账是003历史压力证据，本轮不重跑、不改历史结论，也不据它宣布长期经济闭环。

## 事实分层与唯一主规格

| 分类 | 本包含义与代表内容 |
| --- | --- |
| 局部正式规则／契约已批 | DEC-049 A1—A6已归档；唯一首契约B1—B10／K01—K22已批准、未实现；均不等于工程执行授权 |
| 其余Owner确认待落文 | 单精力、五图／本地主线及具体角色接续；003A同奖／静态整备、003D本委托20罚及先结后召回保持原确认身份，未被本条整套正式化 |
| 推荐Draft | 六商品与身体服务、三专长最小效果及后三工程阶段；首契约以本次已批准版本为准，检查匹配不等于其余方案获批 |
| 测试参数／ASSUMPTION | 成功120、服务及商品价、具体E／容量／病程量级、指定风险和独立末端前态 |
| 待Owner取舍 | 余下世界规则的正式覆盖；未来跨委托专长生命周期；进入新版时旧档兼容承诺。首契约批准已完成，工程仍须独立授权 |
| 后置 | 新任务供给、第二世界、付费重访、极稀有中途回城道具、等级、完整商城 |
| 模型不支持／本轮未重验 | 通用CTB、随机树、生产恢复、完整九组合、工具箱完整路线及安全感染预测；未迁移旧联合例不记通过 |
| 历史 | 原始Owner文档保留原字节；003B推荐B、旧末日替代及旧重复供给只按当时身份解释 |

| 主规格入口 | 唯一职责 |
| --- | --- |
| [02日期与精力](02-seven-day-structure.md) | 单精力、合法行动与休整；病程和出口引用终局 |
| [03地点](03-location-design.md) | 五图、真实路径、发现和地点资格 |
| [04任务](04-main-mission.md) | 两项必要成果、任务说明与委托资格 |
| [05资源](05-resource-economy.md) | 世界来源、实物携带与维护；电子缺口 |
| [06事件](06-event-pack.md) | 位置、前置、玩家所知与一次性结果 |
| [07敌人与专长](07-enemy-continuity.md) | 持续敌人、有限CTB前提与三专长推荐 |
| [08证据预算](08-balance-budget.md) | 当前实算摘要与历史实验分界 |
| [09自审](09-design-critic.md) | 本轮发现、修复、仍有缺口 |
| [10决策队列](10-decision-queue.md) | 确认、推荐、参数、待审及停止点 |
| [11积分与恢复](11-points-hub-recovery.md) | 余额、收入、服务、采购与准备成本 |
| [唯一终局](reviews/endgame-candidates-v1.1.md) | 成功、失败、截止、死亡、资产与角色周期 |
| [证据入口](evidence/README.md) | 命令、分类、输入／输出指纹与逐ID迁移 |

终局沿用v1.1文件名，当前正文v1.4。readiness按状态组织审定与已批准首契约，不另建平行玩法规则：
[采纳与拟覆盖](readiness/01-current-baseline-and-adoption.md)；
[源码与唯一所有权](readiness/02-source-gap-and-ownership.md)；
[第一工程契约](readiness/03-first-engineering-contract-draft.md)；
[证据与试玩门槛](readiness/04-evidence-and-playtest-gates.md)。

## 世界叙事与内容边界

封锁街区有人与设备等待转运。旧广播播放过期流程，危险支路曾被人为切断。玩家取得控制组件和匹配模块，在H8恢复升降机和担架通路，再携样本沿路回H0。样本不是燃料，普通电子件不制造跨世界能量；不要求集齐三纸、访问五图或清空所有敌人。

林岑在T1提供有限交药换粮，周衡在L5及同源工单提供可选手动方法；二者不垄断主线。早取与晚取样、先供电与后供电都有实物和路线代价。未知地图不免费揭示，换图不推进日期或恢复精力。

工具箱续航不能从撬棍账推定：两柜电子需实际取得且与安装竞争；正式医院工具箱开防火门的电子产物仍保留，该新精力映射尚未建模，不删选项也不预算收入。三专长只交代表性效应见证，不宣称九组合通关。

## 004基线、权威与交付（历史记录）

起始SHA：25e420ed9f36f1bf2acfbb0d96e3a798fbdd6bf8；分支：feature/design-world-infected-world-001；main只读：a76e9c1c998051fc1643b6e0c3d53443fa55feed。开工本地及远端匹配，普通／cached diff和tracked／untracked状态均空。

[004任务书原件](reviews/input-world-design-004/WORLD-DESIGN-004-task.md)与[003D评审原件](reviews/input-world-design-004/AUD-25e420e-WORLD-DESIGN-003D-review-v1.0.md)按原字节归档。003D小diff无阻塞不等于整包批准；003A/C/D原话留在原审定入口，不改成正式DEC。

本轮要求Astra／XHigh；根会话无法独立核验产品档位／推理配置，未自行升级Ultra。两专项Agent以工具明确请求Astra／XHigh，只读规格／证据和源码／工程；根负责所有写入、自查和Git。正式副本按AGENTS定点阅读，Project Sources未直接访问，不声称同步。

正式权威为后续已确认DEC优先，其次切片、GDD、Content；覆盖索引仅定位，Architecture／Traceability不创造规则。新旧差异限定版本，工程等待另行授权。实际结果与停止点见[004报告](WORLD-DESIGN-004-completion.md)。

## 本次停止点

DOC-WORLD-ENTRY-001仅文档归档、同步及检查，等待主线准确SHA实文件评审。首身份核心未来完成即独立实审，不等待凑三个工程任务；其执行权限、起点和路径必须另行明确。既有模型与004源码盘点未在本次重新认证。

## ENG-MISSION-LIFECYCLE-001 首工程进度附记

2026-10-03：本项已获独立工程授权，具体委托身份与关闭资格纯核心作者完成，等待最终准确SHA主线实审；此前“工程未授权／未实现”属于对应日期记录。交付与本轮真实生产基线见 [完成报告](../../engineering/mission-lifecycle-001/completion.md)，实现／K矩阵见 [实现记录](../../engineering/mission-lifecycle-001/implementation-notes.md)。只完成窄核心，不接玩家入口、五图、奖罚或保存；整包仍Draft v1.4，004历史证据及后续正式落文／体验门槛不变。

本项交付状态补充：实现与全量检查完成，但原字节归档的前置审查行尾空格使完整暂存空白检查未通过，当前未提交／推送；等待主线处理输入保全与检查冲突。

## WORLD-ENTRY-002 当前状态附记（2026-10-03）

首资格核心在完整SHA `d1d3b7927c6733cff709a4bfd617fb1e85e7485a` 已通过[主线源码实审](entry-002/inputs/AUD-d1d3b79-ENG-MISSION-LIFECYCLE-001-review-v1.0.md)。此前归档空白BLOCKED已依ENG-MISSION-LIFECYCLE-001-ADDENDUM-01解除，工程已普通提交并推送；保留上文历史过程，不将旧“未实现／未授权／未推送”误作当前状态。

该PASS仅限首身份／关闭资格纯核心，不含真实保存、全角色聚合、完整世界或玩家入口。[WORLD-ENTRY-002候选入口](entry-002/00-owner-review.md)及[近期契约](entry-002/03-next-engineering-goals.md)仍待审，未批准新生产规则、未执行下一工程。


<a id="doc-world-entry-002"></a>
## DOC-WORLD-ENTRY-002：O1／O2当前采纳附记

2026-10-03，依据[Owner实际批准](entry-002/adoption/inputs/OWNER-approval-WORLD-ENTRY-002-ADOPTION-v1.0.md)及[获批稿限定](entry-002/adoption/inputs/WORLD-ENTRY-002-ADOPTION-owner-review-v1.0.md)，O1指定规则／首批试用参数与G1契约、O2同次驻留持续现场及恢复／完整事务边界已批准；本次集中归档待准确SHA实审，生产新能力未实现，G1—G3未开工。

唯一当前入口：[DEC-050](../../05-design-decisions.md#dec-050)；[试用配置v0.1](../../content/infected-residence-core-test-config-v0.1.json)；[恢复补充合同v1.0](../../engineering/residence-foundation/runtime-restore-supplement-v1.0.md)；[G1契约v1.0](../../engineering/residence-foundation/energy-cycle-contract-v1.0.md)。只采纳获批子集，不把整份Draft、旧fixtures.config或R1字段草图全部升格。O3旧入口／旧槽发布安排仍OPEN；其他经济／商品、医疗细项、地图价格、战斗和专长参数不随同批准。

首身份核心d1d3b79 PASS与[8245cc6 R1专项PASS](entry-002/adoption/inputs/AUD-8245cc6-WORLD-ENTRY-002-R1-review-v1.0.md)是前置历史，原213项作者有限验证／56项主线探针不算本轮检查。此前BLOCKED、待审及未实现记述保留当时身份；本附记更新局部采纳状态，不倒改旧DEC或[原首契约](readiness/03-first-engineering-contract-draft.md)。本轮仅文档／架构检查，结果见[本任务完成记录](entry-002/adoption/DOC-WORLD-ENTRY-002-completion.md)；不据归档启动生产或宣布世界可玩。

当前世界概览应按DEC-049身份／单次驻留和DEC-050本次局部采纳理解：同一活动执行可真实跨图跨夜，现场按列明范围持续；结束委托后原地面不可再取，合法携出物保持真实状态。单精力、无免费治疗、有序日级后果及一次衔接已具正式入口；五图、转运与样本主线不重开。

本次不把全包升级或冻结，不把试用配置之外的地图价、负重／伤势倍率、医疗使用、装备／战斗、商品服务及专长建议变成规则。完整内容接线、新保存与Owner分段突破、恢复负担体验仍未完成；只读历史压力证据不能变成当前可重复领取的任务入口。
