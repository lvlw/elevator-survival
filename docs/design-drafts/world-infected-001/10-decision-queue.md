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
