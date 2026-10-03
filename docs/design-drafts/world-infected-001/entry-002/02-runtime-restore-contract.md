<a id="doc-world-entry-002-adoption"></a>
## DOC-WORLD-ENTRY-002：当前采纳状态

2026-10-03，依据[Owner实际批准](adoption/inputs/OWNER-approval-WORLD-ENTRY-002-ADOPTION-v1.0.md)及[获批稿限定](adoption/inputs/WORLD-ENTRY-002-ADOPTION-owner-review-v1.0.md)，O1指定规则／首批试用参数与G1契约、O2同次驻留持续现场及恢复／完整事务边界已批准；本次集中归档待准确SHA实审，生产新能力未实现，G1—G3未开工。

唯一当前入口：[DEC-050](../../../05-design-decisions.md#dec-050)；[试用配置v0.1](../../../content/infected-residence-core-test-config-v0.1.json)；[恢复补充合同v1.0](../../../engineering/residence-foundation/runtime-restore-supplement-v1.0.md)；[G1契约v1.0](../../../engineering/residence-foundation/energy-cycle-contract-v1.0.md)。只采纳获批子集，不把整份Draft、旧fixtures.config或R1字段草图全部升格。O3旧入口／旧槽发布安排仍OPEN；其他经济／商品、医疗细项、地图价格、战斗和专长参数不随同批准。

首身份核心d1d3b79 PASS与[8245cc6 R1专项PASS](adoption/inputs/AUD-8245cc6-WORLD-ENTRY-002-R1-review-v1.0.md)是前置历史，原213项作者有限验证／56项主线探针不算本轮检查。此前BLOCKED、待审及未实现记述保留当时身份；本附记更新局部采纳状态，不倒改旧DEC或[原首契约](../readiness/03-first-engineering-contract-draft.md)。本轮仅文档／架构检查，结果见[本任务完成记录](adoption/DOC-WORLD-ENTRY-002-completion.md)；不据归档启动生产或宣布世界可玩。

当前恢复／完整事务合同以上列独立补充为准；下文具体字段、API名、有限连续历史矩阵与公开切换推荐仍是来源草图，未注册生产Schema或确定O3。原restore独立expected及K18/K19保持，补充尚未实现。

**下文为8245cc6原候选历史，完整保留字节；原“待审／未批准”不否认本次限定采纳。**

---

# 运行时、唯一事实与恢复合同候选

**DESIGN DRAFT／未实现，2026-10-03。** 实读基线d1d3b7927c6733cff709a4bfd617fb1e85e7485a。首核心PASS保持；本稿不是替换[已批首契约](../readiness/03-first-engineering-contract-draft.md)的授权。代码定位和blob见[源码映射](04-source-map-and-debts.md)。以下字段是职责草图，非保存Schema注册；有限模型仅实现标注子集。

<a id="ownership"></a>
## 唯一事实与相互引用

| 事实／建议字段 | 唯一owner、建立／改变／关闭 | 引用／持久化／派生与拒绝 |
| --- | --- | --- |
| characterId／生还主体 | 应用受控首次创建；身份不随委托变化 | 根引用持久化；生死从唯一body.HP派生，不设第二alive可写值；死者不能治疗或继续 |
| body {condition,infection,energy,satiety,cycleUsage} | 纯身体规则提出计划，完整应用owner持有一次后态 | 世界／Hub／Combat借只读引用，不复制身体；HP0与活动阶段冲突拒绝 |
| calendar {cycle,bridge} | 周期规则唯一递增；bridge为first／null待结／deadline来源引用 | 单日历；衔接与最新真实终局、执行起止周期联合验证，不另造settledCycles集合或永久免检bool |
| missions[commissionId] | 首核心窄事实；声明集合恰每项一个unaccepted/active/closed | 唯一关闭事实；不另存claimed/closed列表。缺记录≠未接，声明目录≠历史 |
| execution {runId,seed,rulesVersion} | 受控首次激活建立；活动跨图／跨夜保持；关闭后只读 | 复用RunIdentity值语义。全声明集的活动和历史执行ID不重复；不是新委托资格 |
| residence {executionRef,taskDay,location} | 驻留owner；只有合法跨边改真实位置，生还休整改T | active至多一个；地图由node目录派生。关闭node=null、last_node仅历史；地面绑定原执行，不能在Hub或异委托操作 |
| world {roads,facilities,sources} | 同执行持续现场唯一owner；真实行动一次改写 | source.revealed是已兑现，不能当库存；安装历史只读，不能重生成消耗品 |
| enemies[stableEnemyId] | 同现场敌人真相：HP/intent/progress/riskCursor/encountered | Combat仅持引用和临时CTB，不能各存一份可写HP；失能不复活，不离线行动 |
| knowledge {observedNodes,observedEdges,lastObservation} | 正式表层观察产生；Draft同驻留跨夜持续 | 只持已知与最后观测，不自动等于真实通路／远程即时危险；query不消费随机 |
| items[id]与容器membership | 容器聚合owner，真实实例状态唯一，移动不重建 | 身体不藏背包；每实例恰一真实位置、数量/耐久/电量合法；地面引用commission/execution/node，携带容器不带地面权限；重复ID／来源重复物化拒绝 |
| randomStreams {anchor,cursor} | 受控命名子流；消费已提交效果时前进 | 锚点执行+地点+来源/敌人+用途；不含首次到访日期／顺序；种子绑定执行。旧算法golden不改 |
| combat {enemyRef,turn,timeline,tempEffects} | 当前唯一活动战斗协调器 | 稳定玩家决策点可存；未完战斗保留临时值，已结束接战临时CTB不跨下一战 |
| economy port／余额 | 未来经济owner提出完整计划；只在完整事务一次应用 | 本稿不建钱包；奖罚和实物同提交，接口缺失即禁止相关产品入口 |
| revision／稳定快照 | 唯一应用owner持有；每完整提交递增 | 无UI setState/replace；save是序列化投影，不是第二可写规则真相 |

聚合生存分支：fresh-hub（全部未接、first-ready）／active-world（恰一active）／living-hub（无active、已关闭历史）／dead（无active、HP0）。稳定combat是active-world子态；pending-results与committing不是可加载阶段。任务日只在活动执行上有当前意义，关闭历史不变成旧Day8。

身体只保存一份精力、饱食、镇痛／抑制及药限／管标志；旧condition中的同类值不得再复制到Scene或Combat持久化。新世界不继承免费维护工时。

声明全集由整档绑定的受支持内容版本决定；新目录新增委托不能自动补未接，目录减少不能丢弃closed。缺该版本必需事实拒绝；未来真实任务供给与版本映射另行授权。

先核对严格形状与版本，再核对：受控声明全集→每条绑定→最多一活动→所有执行ID唯一／版本→phase与活动执行／世界／节点／T一致→身体与周期→实体与容器→来源／安装／敌人／知识引用→随机锚点／游标→稳定边界。任一失败拒绝整个候选，不能先安装身体再补其他部分。完整背包几何、任务物处置、战斗及经济尚未在本模型实现，生产接线必须使用各自严格验证器。

<a id="r1-cycle"></a>
## R1 周期与终局联合矩阵（Draft，非首核心Schema）

执行时序附着唯一聚合生命周期事实：start_cycle；closed保留end_cycle/end_day。活动T与D须满足`D=start_cycle+T−1`；closed满足同一式的end_day/end_cycle，deadline必须end_day=7。所有加法结果安全；按start_cycle排序后第一项起于1，后项须接前项end_cycle+1，不能重叠、缺段、复用委托／run，死亡后无后项。最新事实由该顺序导出，不另存可改“最后关闭账”。不支持的复杂／缺损历史明确拒绝，不能补默认安装；这不证明离线历史未被整体伪造。

| 聚合阶段／最近事实 | D、bridge及位置 | 合法后续／拒绝 |
| --- | --- | --- |
| fresh-hub、全未接 | D1，`{kind:first}`，无活动位置／执行 | 真实首次出发消费一次；非D1、已有历史则拒绝 |
| active-world | 恰一active且最新，D=start+T−1，bridge=null | 同执行继续；D1/T7或活动ready拒绝 |
| living-hub、正常success/failure | D=end_cycle，bridge=null，scene_ref=null | 待结；任何ready均拒绝，包括更早deadline来源 |
| living-hub、deadline | D=end_cycle+1，bridge严格等于最新`{kind:deadline,commission,execution:run,settled_cycle:end_cycle}` | 来源缺失／错执行／错周期／旧ready拒绝；合法新出发只消费、不重刷额度 |
| dead、活动执行死亡 | HP0、bridge=null、D=end_cycle，无活动位置 | 不能召回／治疗／激活 |
| dead、下一出发结算死亡 | 最近正常success/failure仍保留，HP0、D=其end_cycle、bridge=null | 无新执行；不得把旧结果倒改death |

无真实新委托时不执行以上出发转移；ready不消耗，健康不结。ready被消费后的新执行仍须正常日结／正常返回待结，旧deadline不是永久豁免。恢复context来自独立受控声明/格式配置，不从待检候选复制status/outcome作为期望。

模型world将当前事实平铺、**仅把旧当前事实移入history**，二者是同一集合的分区，当前项必须最新，不重复保存当前关闭项；save候选使用missions集合，经共同temporal校验。sites按execution隔离；当前node关闭即null，last_node只读历史。地面ground_execution／save的ground_ref绑定的是容器，合法携出后清地面引用但保留实例状态；后续夹具不能读取旧现场作为活动现场。save模型仅验窄物品引用，不声称已序列化全部roads/enemies/knowledge。

<a id="r1-intent"></a>
## R1 意图先验与有限模型边界

比较revision/cycle前须确认为严格安全整数，不能让True等于1；消耗按free=0、paid>0分支，先验缺／多字段、类型、范围、已知价格、倍率，再算安全乘积与最终ceil成本，再核全部后态与revision+1。拒绝时owner、完整输入、写／通知均不变；view无提交。合法E1承担8E仍完成并截0。

owner.command的spend仅是**受控内部故障时序夹具**，不代表移动或G3命令；business_supported/complete是严格bool夹具前提，不授予生产写权。world.checks也只承接外部已验条件，不证明真实地图、背包容量或战斗完整合法。paid搜索/修理等主要见证E门禁；完整物品副作用未实现，不能据此接入口。数值非有限反例由命名fault在内存注入，JSON输入本身保持严格格式。

| 证据映射 | R1能证明 | 不能扩大 |
| --- | --- | --- |
| V14—V19 + R1-F01 | 正常/期限/首次/死亡矩阵、最新ready来源、消费后续结、无内容不变、D/T一致 | 非生产周期迁移或绝对离线防回滚；旧overflow-cycle改为不可能D/T拒绝，不再证明其旧算术路径；另列internal-cycle-increment-overflow只验内部安全加法，不伪造完整历史 |
| V06/V20 + R1-F02 | 同活动E0/跨夜拾取、三类关闭后拒取、异委托隔离、普通携出实例保留 | 无完整任务件清算、格子/重量、五图可达或真实保存证明 |
| V02/V25—V32 + R1-F03 | 严格数字/形状、safe成本、非法输入与输出零提交、显式故障时序 | 不等于G3完整业务授权／真实浏览器IO；所有config仍保持原数值与来源 |

## 冷启动与现有API的接缝

`restoreMissionCandidate(raw, expected, scope)`实际要求`MissionExpectation`含binding、status、execution及closed outcome。首核心K18/K19由**内存当前事实**供期望，验证同进度；不是冷启动证明。不能用候选复制两份或另存关闭账凑“独立期望”。

| 来源 | 冷启动允许贡献 | 不得声称 |
| --- | --- | --- |
| 受控内容／格式支持策略 | 可支持格式／rules、声明world/template/commission/contract、完整声明集合、节点与来源定义 | 知道玩家的最新status/outcome或曾否关闭 |
| 待检整档 | 根characterId、body、历史、status、execution、周期、现场 | 独立身份认证或未回滚历史；仅是待检数据 |
| 经验证独立上下文 | 当前会话若已有owner，其character／当前revision／全部事实；部署所选受控内容版本 | 冷启动不存在的内存历史不能编造 |

主推荐最小适配：新增**受控**`prepareMissionColdStartCandidate(raw,binding,scope)`候选入口（名称未实现），复用首核心严格readValue检查；binding来自严格根角色和受控声明，status/execution/outcome仍是待检存档事实，不假装独立。返回窄candidate，无安装权。原公开restore和完整expectation保持；聚合owner验证全档后才一次install。

受影响首契约：B2补明冷启动信任来源，B4增加受控解析组织入口，B5落地一次安装权，B6组合事务；K14—19原同进度验收继续，补冷boot/聚合负例。接口拆分本身不削弱原保证，但新增冷路径和owner仍须后续合同批准。把原expectation改可选、按候选自造expectation、运行中replace/reopen属**实质放宽，不采用**。不倒改首核心原PASS，也不为此修改已批正文。

## 安装权与具体调用／攻击序列

应用composition先占用`uninitialized→loading`，在读取之前封闭第二bootstrap；只有唯一闭包owner有install能力。`loading→ready`、`loading→absent`或`loading→error`；error可显式重试读取（仍无current），不自动new。真正成功读取null才是absent，可接受明确create意图；读失败／空对象／损坏／旧档不是absent。absent只能由本次成功null建立；显式create先占用creating，首次写失败仍转ready，不回absent。初始化参数来自受控工厂与完整当前声明，不接受玩家任意后态。

下表中拒绝默认均为状态不变、save0、状态notify0；加载错误可独立报告诊断，不伪装玩法状态通知。安装合法存档只notify1而save0；初始化合法新角色提交一次、save尝试1、notify1。

| 边界 | 合法调用序列 | 攻击／错误序列与拒绝点 |
| --- | --- | --- |
| 冷来源 | composition.claim→read-success→strictFormat→controlledCatalog→窄candidate→aggregate→install | raw复制成expected：不被冷入口接受；未知rules在catalog前拒；不得调用new兜底 |
| 首次建立 | claim→read(null)→explicitCreate→验证全未接/first-ready→commit | read throws／{}／缺missions→error；create拒绝，因为未有absent证据 |
| 已有事实 | ready当前closed→query得到空→只保留当前事实 | ready→bootstrap(old active/blank)在读取前拒；首次write失败仍ready，不能伪无档 |
| 聚合绑定 | 两条显式测试声明：一closed、一active且独立run→完整验证→install | 两active／复用run／跨角色、world、template、commission或版本→aggregate拒，窄局部通过也不能安装 |
| API适配 | controlled cold parse→no-install候选→owner安装；会话内原restore用current expectation检查 | 仅得到candidate→UI replace，公共面无此操作；缺expectation调用原restore仍拒 |
| 同进度读取 | ready→只读导出候选检查，current不替换 | 同status但旧body/day/revision快照也不得load-replace；不用局部status相同掩盖全态回滚 |
| 保存失败 | explicitCreate/command→完整commit r+1→write throws→保留内存→下一command读r+1 | 捕获错误后reload旧槽再算、重发奖励、重建store均拒；独立save错误不等于规则拒绝 |
| 重复／订阅 | intent(r)→busy→提交r+1→notify只读→idle | 第二同r意图拒stale；notify回写/重入拒busy；回调异常不撤销commit也不重跑效果 |

冷启动能保证格式、内容绑定、内部一致性及受控安装路径，不能证明整份离线存档未被换成另一份自洽旧档。无服务器可信历史、签名或绝对防回滚承诺。单owner合同限定单应用实例；多标签竞争同槽须在公开保存接线前另验互斥／第二写者拒绝，不能拿当前模型证明跨标签安全。

<a id="transactions"></a>
## 完整事务与稳定保存

```text
明确intent + 期望revision
 → owner重入/新鲜度/全部资格检查
 → 各唯一规则owner有序提出计划（无保存、无安装）
 → 合并身体／物品／收支／周期／委托全部后态并严格验证
 → 一次内存commit revision+1
 → 一次save尝试（失败仍保留已提交内存）
 → 一次只读状态notify；保存错误另报，不重播玩法
```

| 意图 | 有序计划与完整后态 | 不允许／尚未支持处理 |
| --- | --- | --- |
| 正常H0返回 | 验证位置/稳定/生还与履约→必要任务实物处置→普通合法携出→成功奖励或一次失败罚→窄委托关闭→静态Hub/周期due，**无日结** | 不先closed再补账；样本不齐不能给成功。业务端口未实现则无玩家入口 |
| Day7异地截止 | 稳定期限资格→流血→感染→饥饿；死则死亡事务；活则D+1/settled-ready→失败处置/20→关闭/召回静态Hub | 不跳pending/战斗，不建旧Day8，不在下一出发重复同周期 |
| 实际死亡 | 触发系统明确HP0→当前执行death关闭（若有）→当前可用资产按死亡处置计划→dead；旧交付/消费/安装历史不改 | 无奖励、召回、治疗复活或向新角色遗产；完整处置端口未有，生产终局入口关闭 |
| 真异委托出发 | 真声明/未接/全携带前提/最新状态先验→消费first-ready或settled-ready，或结due；致死提交dead且不激活；生还才绑定新执行/T1→完整世界初态 | 不复制旧任务；合法致死不能回滚旧成功。未来供给仅测试夹具，当前无此玩家入口 |

终局业务接口建议：`prepareBodyTransition(current,intent)`、`prepareItemDisposition(...)`、`prepareEconomySettlement(...)`各返回只读计划或拒绝；协调器核对共同revision/执行/契约、完整消费与后果后调用窄terminate，最后一次commit。不是建立事件总线；通知者只显示已发生结果。

| 保存边界 | 合同要求 | 本轮证据 |
| --- | --- | --- |
| 新角色静态Hub／生还关闭Hub／死亡完整态 | 严格全集、周期、实体与历史一致 | 窄模型roundtrip，真实新格式NOT RUN |
| 世界稳定节点 | 位置、持续现场、知识、子流完整 | 同上；全五图与容器几何另验 |
| 战斗稳定玩家决策点 | HP可生还且E可0，CTB／临时效果及持续敌引用完整 | 本轮新combat结构NOT SUPPORTED（缺CTB/临时态完整校验）；旧医院已有稳定战斗存档。新E0会被旧Scene invariant拒绝，不能直接复用 |
| 战斗攻击结算中／待立即结果／终局半结 | 禁止保存和加载 | 有限模型拒绝，不表示真实应用已隔离 |

## 开发隔离与发布承诺

开发期推荐单独受控composition/codec/slot、只有测试入口，以文档标识`entry-002-model`说明模型，不注册生产rulesVersion。旧医院入口、format2、随机和槽不改；不是永久双产品承诺。

| 实际读取／写入 | 推荐行为 |
| --- | --- |
| 成功读取不存在 | 明确无档，允许显式首次创建；不自动造角色 |
| 合法新格式、全部支持 | 完整验证后唯一安装；不再次保存或重新初始化 |
| 旧医院档落入新入口 | 版本不匹配、保留原字节；指向已有旧入口是否保留须发布决策 |
| 未知格式／已知格式但不支持规则 | 分别报错；不清理、不补默认、不升级 |
| 损坏档／读取失败 | 分别保留诊断，禁止回退new；读取重试不等同新建授权 |
| 首次／后续写失败 | 已提交内存继续，显式错误；不reload、重放或自动重试规则 |

公开切换推荐保留旧槽原件但停止旧入口，提供明确备份／清理选择；若Owner要求保留旧入口则增加维护回归。此承诺仍待O3，不是本轮删除、迁移、注册或发布授权。浏览器刷新、多标签、容量异常与真实恢复必须在保存接线工程实测。
