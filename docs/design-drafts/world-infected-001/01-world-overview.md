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

## G1 工程当前状态附记（2026-10-04）

DOC-WORLD-ENTRY-002 在 `9dfe21ef7f423c1e5d9801d26e4425b28444cf63` 已通过主线文档实审。随后授权的 G1 已实现独立配置、单精力与有序身体／周期纯计划，作者检查见[工程交付](../../engineering/residence-foundation/g1/completion.md)，待主线准确 SHA 源码实审。

该实现仅消费获批数值子集及独立上下文，不等于五图、经济、完整战斗、专长或持续现场已经接线。G2/G3、玩家入口、真实保存与 Owner 分段突破／恢复负担试玩仍未完成。此前候选／未开工记录保留当时身份，不据本次纯核心交付宣布完整世界可玩。

## G1-R1 当前修订状态（2026-10-04）

G1 在9bbf5aaa专项实审发现查看／行动分类缺陷；本批收口为 view 只读查询与排除 view 的可执行计划边界，保留 E0 免费变更及既有周期规则。详见[R1 交付记录](../../engineering/residence-foundation/g1/completion.md)。当前为作者修复待准确 SHA 复审；不改变已批准世界规则，不代表G2/G3、真实入口或体验验收完成。


## G2 连续位置／持久现场作者实现附记（2026-10-04）

G1-R1 在完整 SHA `942b2d93916c649f4c2ec6cd399035151269d2ca` 已通过[限定源码复审](../../engineering/residence-foundation/g2/inputs/AUD-942b2d9-ENG-RESIDENCE-ENERGY-CYCLE-001-R1-review-v1.0.md)；原9bbf5aaa的NEEDS REVISION与此前历史记述保持原样。本批按独立G2授权实现纯核心，当前状态为作者实现／本地验证、待最终准确SHA主线源码实审，非主线PASS。

新增 residence-location 只组合一份G1身体／D/T／revision与同执行持续现场：单边移动、一次来源揭示、真实普通整实例拾取／留置、表层玩家知识及稳定来源／敌人游标。旧医院与G1生产实现、批准34项参数不改。真实实体／ItemState、道路／设施、敌人HP／已选意图／进度和来源兑现事实跨图及实际G1休整保留；查询不物化、不调用随机，不以未观察的远程真相冒充玩家知识。

局部计划只建议一次revision递增；遇敌／死亡明确要求后续完整协调，不能借移动或休整跳过战斗。三种正式委托关闭后活动位置为空，旧地面不可再操作，合法携带实体不因此销毁。严格值候选和局部计划均无保存、安装、关闭或全历史防回滚权。详见[合同／支持与验收映射](../../engineering/residence-foundation/g2/contract-and-support.md)及[本轮检查](../../engineering/residence-foundation/g2/verification-results.json)。

G3、五图注册、钱包、完整CTB／返回／截止、三专长、工具箱完整路线、玩家入口和真实存储仍属后续；浏览器／刷新／多标签与Owner分段突破、恢复负担体验为NOT RUN。O3及未批准内容／数值门槛不因本次作者测试关闭，不自动进入下一工程。

## G3 受控 headless 会话／冷恢复作者实现附记（2026-10-04）

G2 在 `d7953bbf96dc842d2953e019f950275cd693bf09` 已通过[限定源码实审](../../engineering/residence-foundation/g3/inputs/AUD-d7953bb-ENG-RESIDENCE-LOCATION-001-review-v1.0.md)。本次独立授权 G3 加 ADDENDUM-01 续办；上文历史记述不倒改。当前为作者实现／本地验证、待最终准确 SHA 主线实审，不是主线 PASS 或 Owner 体验通过。

新增技术 headless envelope 和唯一私有会话 owner：仅生还首次 fresh-hub、首次 active-world 的严格冷安装，以及真实 G2 非战斗单边移动；根身份、声明全集、任务／D/T／现场／携带实体与版本一并校验。新冷候选不替代原独立 expected restore，也无安装权。已有 current 禁止二次 bootstrap/replace；完整后态预编码后一次内存提交、一次写入尝试、一次只读通知；写失败保留最新内存，不重放，重入写操作拒绝。

详见[支持合同](../../engineering/residence-foundation/g3/contract-and-support.md)、[实现与续办记录](../../engineering/residence-foundation/g3/implementation-notes.md)、[实际检查](../../engineering/residence-foundation/g3/verification-results.json)。G1/G2 规则和 34 项参数、原医院存档／入口不改；普通源码无浏览器槽接线。关闭历史、完整终局／CTB、后续委托接续、五图、钱包、专长、玩家入口仍 OPEN；浏览器／多标签／Owner 分段突破与恢复负担体验 NOT RUN，O3 不由本批决定。

## G4 首次出发／驻留事务作者实现附记（2026-10-04）

G3 在完整 SHA `60e9c30732c5e22cfe9ff58b9b381de64b945180` 已通过[限定准确源码实审](../../engineering/residence-foundation/g4/inputs/AUD-60e9c30-ENG-RESIDENCE-SESSION-RESTORE-001-review-v1.0.md)。本批依独立 G4 授权扩展会话命令；此前历史正文、G3 当时仅 move 的合同保持原样。当前为作者实现／本地验证，待 G4 最终准确 SHA 主线实审，不是主线 PASS 或 Owner 试玩通过。

唯一 headless session 新接受受控首次 launch、一次来源 reveal、普通整实例 pickup/drop 与真实节点 A/C rest，保留 move。首次从真实 read-null、显式 fresh 创建开始；执行材料不来自命令。各规则仍由首身份及 G1/G2 正式入口拥有，完整后态经原 G3 aggregate/codec 后一次提交、一次保存尝试、一次通知，写失败保留内存且不重放。恢复不重建现场或重抽来源。存档仍为 `elevator-survival.residence-headless / 1`，核心代码和批准 34 项参数不改。

详见[G4 支持合同与 A01—A12 映射](../../engineering/residence-foundation/g4/contract-and-support.md)、[作者自查／修订](../../engineering/residence-foundation/g4/implementation-notes.md)及[实际验证](../../engineering/residence-foundation/g4/verification-results.json)。未支持的 pending/combat/death/closed 等完整结果继续不安装；该开发限制不是玩家避死玩法。完整终局、后续委托、钱包、战斗、五图、三专长、工具箱全路线、安全感染提示、玩家入口与浏览器存档仍为后续责任；O3 继续 OPEN，Owner 分段突破／恢复负担试玩及浏览器／多标签为 NOT RUN，不据此启动下一工程。

## WORLD-ENTRY-003 准入候选（2026-10-04，追加状态）

G4基线 `7ca547ab8ab4f411d1102a79baf8c0796f4b082c` 已获[主线限定实审PASS原件](entry-003/inputs/AUD-7ca547a-ENG-RESIDENCE-ACTIONS-001-review-v1.0.md)，不把上文历史“待审”当最新状态，也不扩大为完整世界批准。

[本轮集中Owner审阅](entry-003/00-owner-review.md)与[三项工程合同候选](entry-003/04-next-engineering-contracts.md)为DESIGN DRAFT：终局完整清算、关闭态恢复、最小积分子集与任务件处置待分别采纳。失败20及单次驻留等已确认方向保留；120／初始0／上限仍为候选。实际源码边界与有限模型证据分层，旧重复供给实验不变。

当前仍不支持生产完整终局；五图真实任务接线、战斗医疗、三专长／工具箱、安全提示／低资产UI、浏览器多标签、O3发布与Owner首玩Gate保留。等待本轮准确SHA实文件评审及后续正式落文／工程授权，不自动执行候选。

## WORLD-ENTRY-003-R1 状态追加（2026-10-04）

主线对f93e17ac7b47af39833f2ecf05681fea03dbf689的[准确SHA实审](entry-003/reviews/world-entry-003-r1-inputs/AUD-f93e17a-WORLD-ENTRY-003-review-v1.0.md)为 **NEEDS REVISION / F01**。作者R1集中修复原始死亡提案在覆盖前的结构/数值/所有权/步骤验证，保留合法HP0一次消费；[当前作者验证](entry-003/validation/results.json)见r1，待新准确SHA专项复审，不称主线已PASS。

原候选O1/O2/O3、参数状态、生产G4支持边界及其他Gate不变；不执行A/B/C，不自动采纳、正式落文或注册新内容。


<a id="doc-world-entry-003"></a>
## DOC-WORLD-ENTRY-003 + ADDENDUM-01 采纳附记（2026-10-04）

批准与校勘：[Owner实际采纳](entry-003/adoption/inputs/OWNER-approval-WORLD-ENTRY-003-ADOPTION-v1.0.md)、[ADDENDUM-01](entry-003/adoption/amendments/step-semantics-01/DOC-WORLD-ENTRY-003-ADDENDUM-01-v1.0.md)。唯一正式入口：[DEC-051](../../05-design-decisions.md#dec-051)、[四值试用配置](../../content/infected-terminal-core-test-config-v0.1.json)、[A契约](../../engineering/residence-foundation/terminal-core-contract-v1.0.md)、[终局恢复补充](../../engineering/residence-foundation/terminal-restore-contract-v1.0.md)、[A→B→C门槛](../../engineering/residence-foundation/terminal-batch-plan-v1.0.md)。

WORLD-ENTRY-003-ADOPTION v1.0已获Owner实际采纳，R1在c67fd4117065e2e0dbd1117cae4fbfaa83791599已专项PASS；旧“待Owner／待R1”保留原时点。当前正式终局子集和四值配置已经归档，待本次准确SHA文档实审。五图、本地转运＋指定样本仅给出消费者资格，不等于所有地图节点、生产者和路线参数获批。

G4在7ca547ab8ab4f411d1102a79baf8c0796f4b082c的限定能力仍是生产边界；未执行A/B/C，不新增可玩内容。同委托结束不重接，无下一真实内容时生还角色停在静态中枢。其余商品／服务、专长、工具箱、安全展示、发布O3、浏览器和Owner体验保留。

## 终局 A 作者工程状态附记（2026-10-04）

6438f7a 文档实审后，本批实现纯终局 A 的资格／四结果、唯一钱包与真实实物历史计划；没有安装 current、保存或注册五图玩家内容。此处仅同步作者实现状态，准确 SHA 主线源码实审仍待完成，B/C 及 Owner 体验不因此通过。接口和证据见 [A 支持合同](../../engineering/residence-foundation/terminal-core/contract-and-support.md)与[作者报告](../../engineering/residence-foundation/terminal-core/completion.md)。现有候选、未采纳数值、O3 与后续 Gate 保持原状态。

## 终局 B 作者工程状态附记（2026-10-05）

A 在 `bfc6bd973eeb306df1e8ee916b2160c30b757cdf` 的[准确源码限定实审](../../engineering/residence-foundation/terminal-restore/inputs/AUD-bfc6bd9-ENG-RESIDENCE-TERMINAL-001-review-v1.0.md)已通过。本批 B 新增独立 v2 四态严格恢复／纯 codec 和独立 expected，真实 A 四结果及两声明历史进入原生往返回归；不修改旧 v1、G4、批准规则或参数。详见 [B 支持合同](../../engineering/residence-foundation/terminal-restore/contract-and-support.md)。

此处仅为作者实现状态，B 的准确 SHA 恢复接缝仍待主线实审；无 current 安装、存储或玩家入口。C、五图真实内容、完整终局会话、O3 发布、浏览器和 Owner 体验仍未执行／未决定，不把历史工程或本地检查升级成完整可玩 PASS。

## 终局 C 作者工程状态附记（2026-10-05）

B 在 `b9b1e0fee0e779669ca40e088ac9a867016bff82` 已通过[限定实审](../../engineering/residence-foundation/terminal-session/inputs/AUD-b9b1e0f-ENG-RESIDENCE-TERMINAL-RESTORE-001-review-v1.0.md)。本批在独立 C 工程分支新增显式 v2 唯一会话：真实首次创建／出发、G2 活动操作、A 完整终局及死亡原计划消费、B 预编码／冷恢复、保存故障与重入防护；旧 v1 默认消费不变。详见 [C 支持合同](../../engineering/residence-foundation/terminal-session/contract-and-support.md)。

当前仅作者实现／本地验证，待 C 准确 SHA 源码／headless 恢复实审；五图内容生产者、后继任务供给、完整战斗医疗、专长／工具箱、玩家入口与浏览器存档仍未接。O3 未决定，浏览器／多标签及 Owner 分段突破、恢复负担体验仍 NOT RUN，不能据此称世界已可玩。上文历史时点不倒改。


## WORLD-ENTRY-004 当前入口（2026-10-05，DESIGN DRAFT）

准确源码基线为 `0921df3f219f368479d1bf3401d8fecddc0d5f71`。C PASS仅覆盖已审九命令/稳定四态，不代表真实五图、战斗医疗或试玩完成。新增内容、来源消费、三专长/工具箱及活战斗接缝仍待采纳；38已批参数不重开。

集中入口：[Owner审阅](entry-004/00-owner-review.md)、[能力与缺口](entry-004/01-current-production-and-gaps.md)、[验证边界](entry-004/validation/README.md)、[最多三项工程候选](entry-004/06-next-engineering-contracts.md)。旧正文和旧证据保留原适用状态；本批不注册内容、不执行工程，O3继续待审。


## WORLD-ENTRY-004-R1专项返修状态（2026-10-05）

从`0362460b259cba6ea160e79ad04a6cb14181cef0`续修任务来源／执行与逐意图原值校验；原31项先在完整数据复现，原98覆盖保留，新回归、六负控、冻结双跑及原生24分别交证。当前为作者返修、待准确SHA专项实审，不是主线PASS；D01—D04未采纳，E01—E03不启动，38项批准配置与生产树不改。原历史正文及成绩保持所属提交，不能叠入新通过。见[R1审阅入口](entry-004/00-owner-review.md)、[实际检查](entry-004/checks.json)与[验证边界](entry-004/validation/README.md)。


<a id="doc-world-entry-004"></a>
## DOC-WORLD-ENTRY-004 采纳附记（2026-10-05）

[Owner实际批准](entry-004/adoption/inputs/OWNER-approval-WORLD-ENTRY-004-ADOPTION-v1.0.md)、[DEC-052](../../05-design-decisions.md#dec-052)：仅当前新感染委托的获批子集生效。

D01—D04中本次列明的真实五图、药食／战斗、来源与任务生产、三专长／工具箱方向已由Owner采纳，未列子集仍保留原草案状态。五地图、本地转运＋指定样本、单次驻留和失败不重接保持。

本次锁定103键试用参数及九字段内容；H2随机只抽一支，没有额外固定消毒剂。旧有限模型初态／外部战斗轨迹不构成真实供给；当前仍只有一委托，完整世界实现与体验未验收。

当前依据：[唯一103键试用配置](../../content/infected-world-entry-test-config-v0.1.json)、[限定五图内容](../../content/infected-world-entry-content-v0.1.json)、[E01-P首契约](../../engineering/residence-foundation/content-supply-core-contract-v1.0.md)、[来源恢复合同](../../engineering/residence-foundation/content-supply-restore-contract-v1.0.md)、[工程批次门槛](../../engineering/residence-foundation/world-content-batch-plan-v1.0.md)。


## E01-P 纯核心工程附记（2026-10-05，作者交付）

本批已实现隔离的五图供给／任务纯值生产：唯一103键配置与24节点／29双向连接绑定，真实初配与驻留选择，一次来源、任务生产／原实例搬运、拆合份额守恒、六类战外药食、维护充电及G1/G2/A组合。旧38值配置、旧公开入口和旧测试保持；没有修改正式规则或医院历史基线。

G1仍拥有身体／精力／周期，G2仍拥有现场，A共享结算拥有钱包与关闭；P只返回完整签发纯计划，不持有current、不保存。新来源／份额／处分与旧v2不兼容，不能剥去字段骗旧恢复。E01-R独立严格编解码、E01-S唯一会话提交、E02活战斗、E03玩家入口及O3均未实现或决定。

原生长链实际使用初发、单边移动、来源、药食／维护、任务搬运／安装和终局；危险已解决的TEST前态保留三敌人声明，不是完整CTB通关或Owner体验通过。测试工程记录不覆盖后续准确SHA源码实审。

实际接口／支持矩阵见[contract-and-support](../../engineering/residence-foundation/content-supply-core/contract-and-support.md)，执行过程见[implementation-notes](../../engineering/residence-foundation/content-supply-core/implementation-notes.md)，实跑证据见[verification-results](../../engineering/residence-foundation/content-supply-core/verification-results.json)，交付及未执行边界见[completion](../../engineering/residence-foundation/content-supply-core/completion.md)。原文完整字节前缀保留，本段只追加实现状态，不改变历史结论。

## E01-R 严格供给恢复工程附记（2026-10-05，作者交付）

已实现独立 headless `elevator-survival.residence-headless / formatVersion=3` 聚合与字符串 codec，直接复用 E01-P 的 SupplyValue、来源份额守恒、实物／ItemState、消费、安装、交样和终局历史校验。支持 first-hub、稳定 active-world、living-hub、dead；活 pending combat 明确拒绝而非清除。旧 v1/v2 入口、数据语义与测试不变，三个版本互不静默迁移。

外部受控 policy 固定规则／G1／供给／终局配置与内容、声明范围；每次调用另需独立角色、phase、revision、cycle、mission/execution expected。first-hub 的初始 execution 必须来自候选之外，不能读取 initial origins 后自证。同进度恢复还比较独立完整 committed 值。解码只返回冻结严格候选，不授予 SupplyAuthority、current 安装权或 Storage 写权限；不重跑动作、周期、随机、任务关闭或奖罚。

本段更新此前附记中的 R 实现状态，不改写历史结论或批准规则。E01-S 唯一会话／保存、E02 活战斗、E03 玩家入口与 O3 仍未接入或决定；两声明与已解除危险的 TEST 前态不代表新增真实委托、完整 CTB 或 Owner 体验通过。等待准确 SHA 的 v3 恢复接缝实审。

接口与十二组验收映射见[contract-and-support](../../engineering/residence-foundation/content-supply-restore/contract-and-support.md)，实跑与边界见[verification-results](../../engineering/residence-foundation/content-supply-restore/verification-results.json)及[completion](../../engineering/residence-foundation/content-supply-restore/completion.md)。

## E01-R-R1 限定返修附记（2026-10-05，作者交付待审）

针对 3469024 实审 F01，v3 历史检查现将已记录行动／周期流血实扣量绑定到既有 G1 配置并保留 HP 截零；cycle 起步的局部死亡必须满足历史现场休整资格、非截止日及无待战斗／存活遭遇。历史现场按其自身 catalog 绑定查询，不从最新伤口状态推断旧历史，不重放玩法或改写来源。

原生模板已实际复现四个三入口错误接受，返修回归与两类仓库外语义负控见[本批验证记录](../../engineering/residence-foundation/content-supply-restore/verification-results.json)。W01 只保留两份旧输入原件的七处硬换行；本轮新增差异无此例外。原接口、独立 expected、v3 格式及批准规则不变；E01-S/E02/E03、玩家入口、浏览器存储及 O3 不随本次接入或决定。等待准确 SHA 专项复审，Owner 试玩仍 NOT RUN。
