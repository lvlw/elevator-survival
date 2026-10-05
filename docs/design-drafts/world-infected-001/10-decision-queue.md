# 当前决策队列与工程准入

> **Draft v1.4 / Engineering Review Candidate。** Owner确认、推荐Draft、测试参数、历史及未支持项分别列明；不是Design Freeze或生产授权。完整状态及局部正式覆盖素材见[readiness/01](readiness/01-current-baseline-and-adoption.md)。

> **DOC-WORLD-ENTRY-001 · 2026-10-03：** [DEC-049](../../05-design-decisions.md#dec-049)及[唯一首契约v1.0](readiness/03-first-engineering-contract-draft.md)已按[实际Owner批准](reviews/input-doc-world-entry-001/OWNER-approval-WORLD-ENTRY-001-v1.0.md)归档。本次只关闭身份／驻留／关闭与首契约待批项；整包仍Draft，未实现、未获生产执行授权。下表混合方向中仅A1—A6子集已正式化，003D及其他数值状态不扩大。

## 仍待后续审定

| 审定组 | 当前主推荐与代价 | 决策时点 |
| --- | --- | --- |
| 余下局部落文与发布兼容 | 本次身份／驻留／关闭子集及首契约已批，其他已确认方向仍待相应正式落文，尚未确认规则和旧档发布兼容承诺仍待审 | 对应后续接线前审定；首工程执行仍须在文档实审后独立授权 |
| 有限经济主案与首玩体验 | 六商品10/12/10/12/18/45、服务20/40/80、成功120保持Draft；首成功实际准备后余30。当前内容结束停中枢；普通失败所得、召回省路与恢复负担须实玩，不重问已确认20罚 | 经济生产接线前批准参数；阶段试玩评审代价。长期新任务供给仍后置 |
| 三专长最小效果与未来选择边界 | 采用[07最小推荐](07-enemy-continuity.md#minimal-specialties)；本次驻留内不能换，建议同角色先保持。未来委托前能否改选待审，不能以Task Day1自动解锁切换 | 专长接线前审具体效果；跨委托能力落地前审生命周期 |

并非要求Owner逐项定所有价格或工程字段。工具箱H1新精力映射、完整路线、玩家安全提示等仍列入缺口表，未隐藏成“无问题”；在对应工程前补齐，不靠本轮默认正式化。

## 已确认方向：按本次局部正式化范围分列

| 方向 | 已落实主规格与不可扩大范围 |
| --- | --- |
| 五图、本地转运＋真实指定样本；连续驻留／合法跨图／单精力／原位休整 | [02](02-seven-day-structure.md)、[03](03-location-design.md)、[04](04-main-mission.md)；不改旧医院一天一主要区域，不限定所有未来地图数 |
| 完整成功且合法生还同奖，重伤不减，普通战利品少不减奖；指定样本必要 | [003A原文](reviews/OWNER-endings-followup-6de365d-v1.0.md)、[终局](reviews/endgame-candidates-v1.1.md)；不批准120或完成度奖励 |
| 当前A单次驻留，成功／失败后同角色不重接（DEC-049 A3／A4已正式归档） | [003C原话](reviews/mission-retry-options-v0.1.md#owner-confirmation-003c)；同一活动进度继续、跨图／退却／休整仍合法，不是全账号封世界 |
| 失败收入0，仅一次min(P,20)，普通合法实体及旧家底保留 | [003D原话及上下文](reviews/endgame-candidates-v1.1.md#owner-confirmation-003d)；无债、自动卖物、来源没收、清包或额外叠罚，任务件不变永久普通物 |
| 当前末日稳定截止先结当期后果，活着才失败召回 | [终局§7](reviews/endgame-candidates-v1.1.md#deadline)；HP0实际死亡，不跳战斗，不建旧Day8，不重结同周期；不推广为所有任务保底 |
| 正常H0返回不补夜，先真实所得后静态整备，下一合法出发读取新状态处理一次应有衔接 | [终局§8](reviews/endgame-candidates-v1.1.md#next-expedition)；中枢不自动治疗／进食／推进病情，提示可返回整备，不设全满门槛 |
| 同角色真实身体、物品和家底；HP0死亡失当前可用资产 | [终局§6](reviews/endgame-candidates-v1.1.md#6-当前可用资产与已终结处置)；失败本身不致死，不改历史处分，不给新角色遗产 |
| 暂无下一内容不等于角色死亡（DEC-049 A5／A6已正式归档） | 生还者停中枢，不复制任务、不生成假入口；新任务、第二世界、付费重访和极稀有回城道具后置 |

## 推荐Draft与测试参数

唯一经济正文为[11](11-points-hub-recovery.md)，病程为[终局](reviews/endgame-candidates-v1.1.md)，物资／维护为[05](05-resource-economy.md)。奖励120、治疗及商品价格、容量、病程、恢复量、E100/85与三专长效果均未获本轮整包批准。

最低实际准备账为120−40−12−20−18＝30，维护真耗金2布1。数字只在声明路线与初态成立；下一次出发须实际另有不同委托契约，不由余额或执行ID制造资格。

## 历史、缺口与后置

| 类别 | 处理 |
| --- | --- |
| 旧十次同供给／旧回收比较／003B推荐B／先召回后结健康 | 保留原件与旧Git证据；不是当前推荐或重复入口，本轮不重跑长期模拟 |
| 旧269未重验部分 | [逐ID迁移](evidence/migration-v1.3-v1.4.json)明确状态；有效旧反例未执行也不称退役或新通过 |
| 专长与工具箱 | 代表效果已查；九组合、战斗用药、完整工具箱路线及H1开门电子的新E映射未覆盖。保留选项，不卖电子填洞 |
| player-safe提示／生产事务／保存恢复／随机／人工体验 | [证据门槛](readiness/04-evidence-and-playtest-gates.md)列实际缺口；有限perform与不泄露两个字段不等于完整生产证明 |
| 发布旧档承诺／未来供给／付费重访／新世界／等级／完整商城 | 尚未授权；不创建占位接口或临时规则 |

## 所有权、交付与停止

角色身体、钱包、契约、具体委托、活动现场、日周期、实体及知识按[源码所有权表](readiness/02-source-gap-and-ownership.md)分责。query只读，受控命令验证完整前态并一次提交。按已批准契约B6，展示订阅与提交后通知只读；规则体系可在有序、确定性的正式编排中提出效果，由唯一入口组合提交，不靠异步监听器补结算；首核心不建事件总线。

004当时的实际有限证据、两次冻结复跑和范围检查见[完成记录](WORLD-DESIGN-004-completion.md)。生产测试／构建／浏览器／存档／试玩NOT RUN；首身份核心完成即准确SHA实审，不等凑三个任务；后三阶段仍按约三个工程任务或进入新生命周期取较早者审查。本次首契约批准已完成，当前停在仅文档交付待主线准确SHA实审，生产开发另行授权。

<!-- 历史入口锚点保留；当前分层以本页表格为准。 -->
<a id="mission-purpose"></a>
<a id="daily-region"></a>
<a id="lifetime"></a>
<a id="energy-rest"></a>
<a id="persistence"></a>
<a id="material-reserve"></a>
<a id="balance"></a>
<a id="endgame"></a>
<a id="specialties"></a>
<a id="identity"></a>
<a id="npc"></a>
<a id="sources"></a>

## ENG-MISSION-LIFECYCLE-001 执行进度（2026-10-03）

首资格核心已按本项Owner授权执行，作者完成、待最终准确SHA实文件评审；当前不再以归档时“工程未授权”为本Goal阻塞。见 [完成报告](../../engineering/mission-lifecycle-001/completion.md) 与 [K矩阵及后续责任](../../engineering/mission-lifecycle-001/implementation-notes.md)。本项不关闭可信恢复／聚合／事务接线、后续玩法参数、真实内容或试玩事项；未自动进入下一工程，整包仍Draft。

本项交付状态补充：实现与全量检查完成，但原字节归档的前置审查行尾空格使完整暂存空白检查未通过，当前未提交／推送；等待主线处理输入保全与检查冲突。

## WORLD-ENTRY-002 当前状态附记（2026-10-03）

首资格核心在完整SHA `d1d3b7927c6733cff709a4bfd617fb1e85e7485a` 已通过[主线源码实审](entry-002/inputs/AUD-d1d3b79-ENG-MISSION-LIFECYCLE-001-review-v1.0.md)。此前归档空白BLOCKED已依ENG-MISSION-LIFECYCLE-001-ADDENDUM-01解除，工程已普通提交并推送；保留上文历史过程，不将旧“未实现／未授权／未推送”误作当前状态。

该PASS仅限首身份／关闭资格纯核心，不含真实保存、全角色聚合、完整世界或玩家入口。[WORLD-ENTRY-002候选入口](entry-002/00-owner-review.md)及[近期契约](entry-002/03-next-engineering-goals.md)仍待审，未批准新生产规则、未执行下一工程。


<a id="doc-world-entry-002"></a>
## DOC-WORLD-ENTRY-002：O1／O2当前采纳附记

2026-10-03，依据[Owner实际批准](entry-002/adoption/inputs/OWNER-approval-WORLD-ENTRY-002-ADOPTION-v1.0.md)及[获批稿限定](entry-002/adoption/inputs/WORLD-ENTRY-002-ADOPTION-owner-review-v1.0.md)，O1指定规则／首批试用参数与G1契约、O2同次驻留持续现场及恢复／完整事务边界已批准；本次集中归档待准确SHA实审，生产新能力未实现，G1—G3未开工。

唯一当前入口：[DEC-050](../../05-design-decisions.md#dec-050)；[试用配置v0.1](../../content/infected-residence-core-test-config-v0.1.json)；[恢复补充合同v1.0](../../engineering/residence-foundation/runtime-restore-supplement-v1.0.md)；[G1契约v1.0](../../engineering/residence-foundation/energy-cycle-contract-v1.0.md)。只采纳获批子集，不把整份Draft、旧fixtures.config或R1字段草图全部升格。O3旧入口／旧槽发布安排仍OPEN；其他经济／商品、医疗细项、地图价格、战斗和专长参数不随同批准。

首身份核心d1d3b79 PASS与[8245cc6 R1专项PASS](entry-002/adoption/inputs/AUD-8245cc6-WORLD-ENTRY-002-R1-review-v1.0.md)是前置历史，原213项作者有限验证／56项主线探针不算本轮检查。此前BLOCKED、待审及未实现记述保留当时身份；本附记更新局部采纳状态，不倒改旧DEC或[原首契约](readiness/03-first-engineering-contract-draft.md)。本轮仅文档／架构检查，结果见[本任务完成记录](entry-002/adoption/DOC-WORLD-ENTRY-002-completion.md)；不据归档启动生产或宣布世界可玩。

| 队列项 | 当前归类 | 后续责任 |
| --- | --- | --- |
| O1指定局部规则／九组首批参数／G1契约 | 已批准、已集中归档，待本次准确SHA文档实审；数值仅试用 | 不重问采纳；主线实审后另下发准确起点／路径的G1工程 |
| O2同次持续现场／恢复与完整事务边界 | 已批准、生产未接线 | G2/G3具体支持矩阵、版本与路径由届时任务锁定；新生命周期及保存接缝各自实审 |
| O3旧入口／旧槽发布安排 | OPEN，未选择 | 公开发布前集中决定；当前不删旧档、不关闭入口、不承诺永久双产品 |
| 其余数值／内容／体验 | OPEN或原Draft，不随O1/O2升级 | 经济与商品、医疗细项、地图价与节点、三专长、工具箱完整路线、真实战斗、UI信息安全、保存／多标签及Owner首玩须在对应接线前处理 |

本附记只关闭获批子集的“待Owner采纳”，不关闭生产验收或长期经济／供给问题；此前的待审、BLOCKED、候选推荐按原时点保留，不另形成平行当前G1合同。

## G1 工程队列状态附记（2026-10-04）

DOC-WORLD-ENTRY-002 在 `9dfe21ef7f423c1e5d9801d26e4425b28444cf63` 已主线文档实审 PASS；G1 依据后续明确授权完成作者实现，交付[真实检查与范围记录](../../engineering/residence-foundation/g1/completion.md)，当前门槛为准确 SHA 源码实审，不是再次申请开工。

唯一运行时试用配置与能量／身体局部计划不拥有安装或保存权。G2/G3 未执行；O3、完整玩家流程、真实存储及体验评估继续保留原后置门槛。本文不关闭任何未完成玩法、内容或 Owner 试玩事项，不增加决策或数值。

## G1-R1 专项复审门槛（2026-10-04）

9bbf5aaa源码实审的F01（view误入行动效果路径）已按授权进行作者修复与回归，[实际证据](../../engineering/residence-foundation/g1/verification-results.json)单列r1并保留原G1历史。下一门槛仍是新准确SHA专项源码复审，不以作者测试代替主线PASS；未启动G2/G3或关闭任何后置玩法／保存／Owner体验事项。


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

| 队列项 | 当前状态 |
| --- | --- |
| 当前委托H0消费者资格、四终局、真实资产处置、奖罚与容量守卫 | Owner已采纳，DEC-051正式落文，待准确SHA文档实审 |
| 成功120／初始0／上限2147483647、失败20 | 唯一配置已归档；前三值首批试用，20为本委托既定罚额，不泛化未来任务 |
| 步骤分流、关闭恢复、A→B→C | ADDENDUM-01校勘已采用；A纯计划／B严格v2／C完整消费均未在本任务实施 |
| R1专项 | c67fd4117065e2e0dbd1117cae4fbfaa83791599主线PASS仅关闭F01，不是全产品验收 |
| 商品／治疗20、40、80／兑换解锁、地图生产者、三专长与工具箱 | 仍按未采纳范围保留，不因终局四值配置升级 |
| 旧医院入口／旧槽发布O3、浏览器／多标签、Owner体验 | OPEN；无新发布决定，无试玩通过 |

单次委托不重接继续有效；旧重复供给实验仅条件证据，不能恢复当前委托入口或宣称长期经济已解决。

## A 工程进度附记（2026-10-04）

已通过 6438f7a 文档实审的批准子集，本批进入纯终局 A 作者实现／验证阶段，实际支持见 [A 合同与 T01—T12](../../engineering/residence-foundation/terminal-core/contract-and-support.md)。等待本批准确 SHA 专项源码实审；不得据本附记自动启动 B/C、接玩家内容、决定 O3、扩大经济机制或关闭 Owner 试玩。原未实现／待审行保留原记录时点。

## B 工程进度附记（2026-10-05）

A 准确 SHA `bfc6bd973eeb306df1e8ee916b2160c30b757cdf` 已获[限定源码 PASS](../../engineering/residence-foundation/terminal-restore/inputs/AUD-bfc6bd9-ENG-RESIDENCE-TERMINAL-001-review-v1.0.md)。本批在新工程分支实现 B 四态严格聚合、并列 v2 codec 和独立 expected 原生回归，旧接口、规则、参数和原工程保持不变；[B 支持与 B01—B12](../../engineering/residence-foundation/terminal-restore/contract-and-support.md)记录实际范围。

下一 Gate 是本批准确 SHA 的主线恢复接缝实审，不自动进入 C。current／保存故障／重入、真实五图与玩家入口、O3、Owner 试玩仍 OPEN／NOT RUN 或未决定；不新增经济、战斗医疗、商品服务、专长／工具箱决策。旧队列正文保持历史时点。

## C 工程进度与停止点附记（2026-10-05）

前置 B 准确 SHA `b9b1e0fee0e779669ca40e088ac9a867016bff82` 已获[限定实审 PASS](../../engineering/residence-foundation/terminal-session/inputs/AUD-b9b1e0f-ENG-RESIDENCE-TERMINAL-RESTORE-001-review-v1.0.md)。C 显式 v2 会话、同域单 owner、完整死亡提交、三类保存故障及重入长链已完成作者实现，证据见 [C 交付记录](../../engineering/residence-foundation/terminal-session/completion.md)。

下一 Gate 仅为当前主线对 C 最终准确 SHA 的源码／headless 恢复实审。不得自动推进五图、后继委托、CTB／医疗、商店、UI／浏览器或 O3；本批不新增规则参数或决策。Owner 试玩仍 OPEN／NOT RUN，旧队列保持原字节前缀。


## WORLD-ENTRY-004 当前入口（2026-10-05，DESIGN DRAFT）

准确源码基线为 `0921df3f219f368479d1bf3401d8fecddc0d5f71`。C PASS仅覆盖已审九命令/稳定四态，不代表真实五图、战斗医疗或试玩完成。新增内容、来源消费、三专长/工具箱及活战斗接缝仍待采纳；38已批参数不重开。

集中入口：[Owner审阅](entry-004/00-owner-review.md)、[能力与缺口](entry-004/01-current-production-and-gaps.md)、[验证边界](entry-004/validation/README.md)、[最多三项工程候选](entry-004/06-next-engineering-contracts.md)。旧正文和旧证据保留原适用状态；本批不注册内容、不执行工程，O3继续待审。


## WORLD-ENTRY-004-R1专项返修状态（2026-10-05）

从`0362460b259cba6ea160e79ad04a6cb14181cef0`续修任务来源／执行与逐意图原值校验；原31项先在完整数据复现，原98覆盖保留，新回归、六负控、冻结双跑及原生24分别交证。当前为作者返修、待准确SHA专项实审，不是主线PASS；D01—D04未采纳，E01—E03不启动，38项批准配置与生产树不改。原历史正文及成绩保持所属提交，不能叠入新通过。见[R1审阅入口](entry-004/00-owner-review.md)、[实际检查](entry-004/checks.json)与[验证边界](entry-004/validation/README.md)。


<a id="doc-world-entry-004"></a>
## DOC-WORLD-ENTRY-004 采纳附记（2026-10-05）

[Owner实际批准](entry-004/adoption/inputs/OWNER-approval-WORLD-ENTRY-004-ADOPTION-v1.0.md)、[DEC-052](../../05-design-decisions.md#dec-052)：仅当前新感染委托的获批子集生效。

当前队列更新以本附记为准；此前D01—D04“未采纳”保留历史时点，不再重复询问已确认子集。

| 分类 | 当前状态 |
| --- | --- |
| 已确认设计 | DEC-052局部规则、真实五图与任务来源、三专长及工具箱边界 |
| 已批试用参数 | 103键／193数值叶及限定内容；排除grant.H2-random，原38值保持，不是平衡冻结 |
| 已批待工程 | E01-P纯生产者、R来源聚合／v3、S唯一current；各自准确SHA停审 |
| 仍待后续 | P实际结构与R具体字段锁定、E02活战斗格式、E03安全查询／完整路线及体验复审 |
| 未采纳／后置 | 商城／身体服务、未来改专长、后续真实委托、O3旧入口／旧槽发布 |

不凭有限证据关闭长期经济、全部来源软锁、九组合可达或人工体验问题；本轮未执行候选工程。

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


## E01-S 显式内容供给会话附记（2026-10-05，作者交付待审）

在独立 `supply-index.ts`／`supply-controlled.ts` 入口下，现已接入同域唯一 v3 headless 会话：复用原 domain 占用、P 真实初配与出发／任务／来源／搬运／拆合／药食／维护、原死亡计划消费和四终局，并在 R 完整验证及预编码后只提交一次 current、一次保存尝试和一批通知。保存失败保留最新内存；显式 retrySave 只编码并保存，不重放规则。

冷恢复仍须候选外的受控独立 expected 启动材料；不从读到的存档或 initial origins 反推后自证。四态加载不写盘、不发物、不重放动作／周期／随机。存活 combat-required 后态原子拒绝，合法死亡优先完成 dead；复杂任务路线的已解除危险前态明确为 TEST-only，不代表 CTB／完整五图可玩或 Owner 体验通过。

本附记仅更新此前 S 未接入的工程状态，不倒改历史结论。P/R/F01、G1/G2、旧 A/B/C、保存格式、规则与参数保持不变；E02/E03、玩家入口、浏览器存储、多标签与 O3 仍未接入或决定。等待准确 SHA 会话及保存故障实审，Owner 试玩仍 NOT RUN。

接口及 S01—S12 见[本批契约](../../engineering/residence-foundation/content-supply-session/contract-and-support.md)，实跑、独立计数、范围和 W01 见[验证记录](../../engineering/residence-foundation/content-supply-session/verification-results.json)及[完成报告](../../engineering/residence-foundation/content-supply-session/completion.md)。
