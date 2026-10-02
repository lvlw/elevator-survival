# WORLD-DESIGN-001R 有限设计证据

**DESIGN DRAFT / Draft v1.1，2026-10-02。** 本目录仅用于检查明确写出的设计候选，不是游戏运行时、第二套可上线引擎、生产存档、Vitest 或全种子验证。最终本分工实际结果：**52个具名场景＋5个参数扰动＝57个预期满足**。其中多项预期就是拒绝输入，不是57条通关路线。

完整结果摘要见[08预算](../08-balance-budget.md)。拓扑、动作和实体规则分别见[03](../03-location-design.md)、[06](../06-event-pack.md)、[05](../05-resource-economy.md)。终局规则只按[终局候选](../reviews/endgame-candidates-v1.1.md)试算，惩罚、期限召回、感染终末后的角色处置仍是OPTION，等待Owner审定。

## 运行

不安装依赖。已使用本机 bundled Python 标准库：

~~~powershell
& 'C:\Users\zjl\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'E:\projects\elevator-survival\docs\design-drafts\world-infected-001\evidence\check_design.py'
~~~

其他机器在仓库根目录有Python 3.10或更高版本时可运行：

~~~text
python docs/design-drafts/world-infected-001/evidence/check_design.py
~~~

退出码0表示当前有限输入全部符合各自预期；退出码1表示存在不符。脚本只读取同目录parameters.json和scenarios.json，所有生成输出都写在脚本所在evidence目录。不导入src，不访问网络，不写依赖、配置、正式文档或生产测试。原始输出会覆盖下面三份当前输出，不覆盖first-run-results.json。输入与输出统一LF换行，CSV保留UTF-8 BOM供表格软件读取；避免仓库既有eol=lf过滤改变提交后的参数／脚本和账本指纹。首轮历史JSON只按库要求统一换行，保留原结果和当时输入指纹字段，仍非当前版本的可重建输出。

当前 stdout：

~~~json
{
  "counts": {
    "scenarios": 52,
    "sensitivity": 5,
    "passed": 57,
    "failed": 0
  },
  "failures": []
}
~~~

## 文件与读取方式

| 文件 | 身份与内容 |
| --- | --- |
| [parameters.json](parameters.json) | 候选数值和内容的计算单源。版本、原SHA、容量/价格/健康、物品尺寸堆叠、来源、动作位置/前置、图/显式发现映射、指定战斗轨迹 |
| [scenarios.json](scenarios.json) | 作者显式选定的动作序列、前态、预期。所有动作具名；expect为运行前独立手算/规格预期，未由检查器生成 |
| [check_design.py](check_design.py) | 标准库有限验证。拒绝在副本上发生，不消耗前一稳定账；这只是本账检查方式，不证明生产事务实现 |
| [raw-results.json](raw-results.json) | 最终真实输出。每条结果、失败位置、按日标价/实扣/日终位置、普通/已消耗/已安装/失物汇总、5项扰动及实际Python版本；记录参数/场景/脚本SHA-256 |
| [route-ledgers.csv](route-ledgers.csv) | 易读逐步摘要：行动、位置、精力前后、HP、耐久/电量、重量、饱食、感染/暴露、终态与拒绝原因 |
| [route-ledgers.json](route-ledgers.json) | 每条路线的initial和steps。每步after为完整候选后态，before_state_ref指initial或上一条after，避免重复保存同一前态；detail保留逐事件战斗/日级结算 |
| [first-run-results.json](first-run-results.json) | 首次执行的历史原始结果41/43，含两处不符。不是当前输入的输出，当前脚本不会重建它 |

raw-results中的peak_weight包含初始夹具与所有步骤前后态，因此独立终局的初始背包也有峰值。route-ledgers中每个单位有稳定ID、物品类型和唯一位置；消费只是改变去向，历史单位仍保留用于审计，不能再使用。安装与交付不生成随身副本。

终局去向标记只是证据账分类：bank为真正普通携出/旧中枢可用库存；installed用于设施；delivered为成功样本交付，delivered_partial为失败生还中的真实部分成果交付；impounded是权限/未用任务部件退出可用家底后的只读历史，不可取回；fee、consumed、lost也不可再次使用。名称不创建生产容器或存档类型。

## 验证合同

1. 只从所处节点的显式表层观察新增已知路线；不存在每日区域计数器。移动查真实邻接、已知边、实体卡/已解除门路，逐边从同一精力扣费。
2. 动作查当前节点、已知实际事实、危险、材料、工具和来源是否已兑现。C1快核依L2接口；L2快核依C1匹配；无前置时各自完整核验6破除循环。C3只提取，不能完成C1匹配。供电核查/恢复在五图P1，三图对照为L4。
3. 来源搜索与显式拾取分开。单位来源ID不会因放下、跨夜或换图改变。仅pack/q1/q2是世界中可用/放下的随身来源；中枢bank不能远程消费。拾取/放下数量必须为正整数。
4. 每步给一个具体矩形几何见证。主线三大件固定作者选定位置，小件按指定顺序填剩余格；必要的免费手动整理是显式作者假设，不是游戏自动整理功能或全几何求解。
5. 战斗为人工声明的有限事件轨迹。脚本计算伤害、防御、有效外套磨损、管磨损、指定风险后果、玩家行动后流血、结束CTB→精力及敌剩余状态；不运行通用CTB排程、不重新推导控制延后，也没有RNG。风险字段是条件输入，risk_cursor是已执行检查数量，未模拟种子或验证全部概率树。
6. 管蓄力按合法日一次，换图不刷新；已触发战斗即便移动后E0也继续，不能休整跳过。战斗轨迹因参数改变不可执行时报告需要新轨迹，不能把该有限模型拒绝解释成生产游戏强制失败。
7. 日结算按未止血→感染→饱食→生还时新日精力/额度。不回血、不自然清伤。wound仅表示未处理开放伤口；injury保存已有轻伤，即使绷带处理后也不自动删除。只模拟本批用到的这一伤势类型，不含挫伤移动倍率。
8. 终局夹具按未批准候选逐项核算真实物品和健康，不声称实现Profile、Success、异常召回或下一任务。期限时抑制先参与增长，生还后才到期；没有Day8、普通新日医疗次数或签名刷新。
9. entirely_empty_character_continuation是最窄追加证据：先用普通路线检查器证明H0失败生还的HP1/流血、三槽空、全部实物空；然后独立算术展示同角色下一任务获得E100而不补装备/药物，在声明的一条已知2E边移动后流血−1死亡。它不是通用跨任务模拟，不证明该活人有生还解，也不以贫穷自动判死；停在稳定中枢或新任务入口时仍可暂停。
10. 参数扰动重新执行原具名路线，不偷偷改动作或补库存。卡件涨价、低管容量、外套减伤、口粮来源变化和删边均关联实际重算。失败只表示原计划需要重新设计。

## 关键检索ID

| 主题 | 场景ID |
| --- | --- |
| 四条五图完整路线 | normal_five、early_sample_five、damaged_split_five、flashlight_five |
| 原R4必须拒绝 / 改C1合法 | original_R4_illegal / corrected_R4_three |
| 同日H调查→L工作 | cross_region_work |
| 三五图相同供电成果与终点 | topology_three_power、topology_five_west、topology_five_no_hotel |
| 同位置A/C，以及相同工作成果 | A_same_position、C_same_position、A_defer_same_work、C_finish_same_work |
| 正值最后行动 / 逐边批处理 / 移动归零已入战 | last_positive_action、batch_is_multiple_edges、zero_triggered_combat |
| 信息、来源、实体、容量 | unknown_route、C_quick_needs_information、P_work_wrong_location、C_extract_without_match、source_once_across_night、unique_instance、overweight_rejected |
| 医疗、流血、日终 | zero_self_rescue_pickup、night_bleeding_death、night_infection_terminal、H_wound_can_kill、bandage_does_not_erase_injury |
| 材料挪用与真实补救 | missing_install_material、misused_electronics_rejected、misused_electronics_recovery、low_pipe_actual_repair |
| 终局与真实空家底 | terminal_success、terminal_voluntary_failure、terminal_deadline_recall、terminal_death_clears_bank、terminal_zero_fee_inventory_survive、entirely_empty_character_continuation |
| 日限 / 到期药效 | no_signature_refresh_on_crossing、no_day_eight、deadline_suppression_expires_after_effect |
| 远程库存 / 非法数量 | world_cannot_use_bank、world_cannot_drop_bank、pickup_negative_quantity、pickup_zero_quantity、drop_negative_quantity |
| 参数扰动 | price_pry_8、pipe_capacity_10、coat_mitigation_0、drop_front_ration_1、topology_remove_C0_H0 |

## 实际执行记录

本分工在2026-10-02实际运行上述check_design.py命令五次；下面是过程记录，不把中间通过数累加。

| 次数 | 当时场景＋扰动 | 实际结果 | 后续修订 |
| --- | --- | --- | --- |
| 1 | 39＋4 | 41符合、2不符 | 受损D2手算误写82，逐项重加为34＋38＝72；同日签名夹具漏C0—C1已知来路，补真实来路前态，原输出保留 |
| 2 | 44＋5 | 49符合、0不符 | 增加实际低管维修、原地物跨夜、未清敌节点、未匹配提取、重量及删边扰动 |
| 3 | 45＋5 | 50符合、0不符 | 自审补绷带处理与轻伤保留，单独保留injury；逐步输出改为前态引用 |
| 4 | 46＋5 | 51符合、0不符 | 独立终局审阅补末次抑制药效到期；失败样本真实部分交付；零可罚库存收紧命名 |
| 5 | 52＋5 | 57符合、0不符 | 根审补远程中枢来源、零/负数量拒绝与全空角色单步续接 |

写文件曾遇到默认终端helper初始化错误、apply_patch写入失败和Windows命令长度上限；在同一授权目录使用受审的PowerShell只写设计文件、分段写JSON解决。这些不是玩法检查次数。未安装依赖。Root的独立复跑与文档检查由其报告另记，不混入上述五次。

## 未覆盖与交付门槛

- 未运行生产resolver、npm/Vitest、构建、浏览器、存档读写/恢复、真实随机种子或Owner试玩。
- 未模拟全CTB策略、所有伤口/感染风险树、全医疗药效/使用次数、挫伤移动与叠加伤势、任意背包摆放。
- 四主线不使用专长优惠；三专长组合、工具箱完整路线、NPC交换、C4维护旁路、C5捷径未重放。因为旁路未纳入，C_extract在本批直接走廊子模型要求C已清敌；不把这个额外条件推广到已合法走旁路的正式候选。
- 随机医院附加只视为本批未领取的外部机会，不生成虚假保底物品。参数/来源/物品schema的任意畸形输入不是本次穷举范围。
- 受损起点、末端终局、A/C比较和全空家底都是明示独立夹具，不伪称它们的未给定前缀已经走过。
- 没有最优路线搜索、平衡结论、所有组合通关保证、长期失败套利证明或三十日经济证明。生产代码和正式规则保持原有范围。
