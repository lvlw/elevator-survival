<a id="doc-world-entry-002-adoption"></a>
## DOC-WORLD-ENTRY-002：当前采纳状态

2026-10-03，依据[Owner实际批准](adoption/inputs/OWNER-approval-WORLD-ENTRY-002-ADOPTION-v1.0.md)及[获批稿限定](adoption/inputs/WORLD-ENTRY-002-ADOPTION-owner-review-v1.0.md)，O1指定规则／首批试用参数与G1契约、O2同次驻留持续现场及恢复／完整事务边界已批准；本次集中归档待准确SHA实审，生产新能力未实现，G1—G3未开工。

唯一当前入口：[DEC-050](../../../05-design-decisions.md#dec-050)；[试用配置v0.1](../../../content/infected-residence-core-test-config-v0.1.json)；[恢复补充合同v1.0](../../../engineering/residence-foundation/runtime-restore-supplement-v1.0.md)；[G1契约v1.0](../../../engineering/residence-foundation/energy-cycle-contract-v1.0.md)。只采纳获批子集，不把整份Draft、旧fixtures.config或R1字段草图全部升格。O3旧入口／旧槽发布安排仍OPEN；其他经济／商品、医疗细项、地图价格、战斗和专长参数不随同批准。

首身份核心d1d3b79 PASS与[8245cc6 R1专项PASS](adoption/inputs/AUD-8245cc6-WORLD-ENTRY-002-R1-review-v1.0.md)是前置历史，原213项作者有限验证／56项主线探针不算本轮检查。此前BLOCKED、待审及未实现记述保留当时身份；本附记更新局部采纳状态，不倒改旧DEC或[原首契约](../readiness/03-first-engineering-contract-draft.md)。本轮仅文档／架构检查，结果见[本任务完成记录](adoption/DOC-WORLD-ENTRY-002-completion.md)；不据归档启动生产或宣布世界可玩。

当前唯一G1合同已转至上列energy-cycle-contract-v1.0.md；下文G1仅是来源历史，不是第二份当前合同。G2/G3仍为后续候选目标，O2边界批准不等于其路径／支持矩阵或执行授权；本次准确SHA实审前后均不自动进入生产。

**下文为8245cc6原候选历史，完整保留字节；原“待审／未批准”不否认本次限定采纳。**

---

# 最近工程契约候选与停止门槛

**DESIGN DRAFT／未获执行授权。** 首身份核心已在d1d3b7927c6733cff709a4bfd617fb1e85e7485a通过主线实审，不重做身份模块。以下是最多三项近期切口；候选新路径均未实现，不创建空文件。每项实际起点SHA、分支与精确写入白名单由主线完成相应审定后明确下发。

```text
本包准确SHA实审 + O1局部条文/参数与G1契约批准
  → G1 单精力与有序周期纯核心 → 停：新周期生命周期实审
O2持续现场条文批准 + G1通过
  → G2 连续位置与最小持久现场 → 停：持续状态合同实审
O2冷解析/安装补充契约批准 + G1/G2通过
  → G3 窄稳定态受控owner与headless恢复 → 停：新保存/owner实审
  ── 后续真实CTB/终局经济/浏览器/发布尚未在此批执行
```

有明确依赖、规则已批且不跨新生命周期的实现与同阶段只读核查可同会话批量下发；约三Goal或新周期／新owner／保存边界取较早者实审。这里每项恰跨重要接缝，不为凑三项拖延审查。等待窗口可并行只读补专长／工具箱／玩家提示设计；不得自行进入生产。

<a id="g1"></a>
## G1 单精力行动与有序周期纯核心

**可交付结果：** 下游能用纯TS判定一次动作的开始与完成，得到有序身体周期计划；不改医院、不接玩家、不造任务供给。规则和本契约批准后可直接下发此窄工程。

前置：R02 E0动作界限、R03周期与额度、R04主配置、R05/R06衔接时点须局部正式落文；失败20／召回选择不重问。O1只包含G1直接依赖的R02/R03/R04及R05/R06周期接口；R07持续现场及冷启动安装均归O2，不能混批。O1数字仅批准本配置试用，不包括商品、专长或战斗调度。现状态均候选，缺批准不得开工。

| 合同项 | 具体输入／输出／职责 |
| --- | --- |
| 单动作 | 输入只读 `{energy, cost, actionClass, stableContext, currentRevision, expectedRevision}`；正式内容或规则owner提供已验证的其他资格。当前revision取自受控快照，expectedRevision仅作比较。cost用显式union：付费类为正安全整数，查询/免费类为0，不能共用“正数”校验；输出accepted的完整E后态／拒绝。E>0不足价可截0，E0不新移动；不是任意调用方传eligible=true就构成合法世界命令 |
| 即时结果 | 开始资格与已触发后果分开；E0不阻止已开始CTB/立即危险消费。G1只接受受控效果输入并组合，不实现CTB或制造敌人伤害 |
| 身体周期 | 输入唯一身体HP/伤势/暴露/I/饱食/药效/额度、D、T、衔接状态、模式A/C/截止/未来出发、受控配置及新鲜度；严格完整字段。输出只读有序计划+完整后态+活/死亡原因；无save/熵/通知 |
| 时钟 | 一处D、一处当前T；first-ready/due/带最新终局来源的settled-ready按[R03](01-local-rule-amendments-draft.md#r03)与[联合矩阵](02-runtime-restore-contract.md#r1-cycle)；T7不能普通休整，截止活者D+1但无旧T8，下次消费ready不再重置用药。非法请求先拒绝，合法致死提交结果不rollback |
| 使用者 | 候选G2/G3或之后终局协调器消费计划；不在本模块拥有钱包、物品或任务关闭。调用既有首核心只由未来完整协调器完成 |

实际可参考`src/core/condition/health-operations.ts`的applyHealthLoss及`src/core/config/deep-freeze.ts`；`src/core/daily-settlement/daily-settlement.ts`只参考验证/计划/结果顺序，不直接调用其医院规则；旧world-threat终末语义不复用。未来路径候选（未实现）：`src/core/residence-energy/{types,energy,index,energy.test}.ts`、`src/core/character-cycle/{types,validation,cycle,index,cycle.test}.ts`及对应工程文档。预计只新增上述两个窄模块与测试，不改现有核心、依赖、CI、规则版本注册或UI；若共用出口需额外明确白名单而非默认可改。

验收：V01—V19涉及的纯职责转为实际Vitest正反例，特别E1/8、负价/小数/溢出/未知字段、E0每类意图、循环请求新鲜度、旧I增长与新I伤害、三阶段短路、A/C重设、药限不因跨图/T1重建、正常返回非法ready、缺/错/旧ready来源、D/T不可能组合、截止一次桥接及消费后照常结新周期、无任务无结算、合法致死与拒绝区分。对冻结输入不mutation；同配置同输入确定；随机/React/state/content依赖和旧医院golden不变。组合测试必须由独立手算预期驱动，不能原样移植Python当规则真相。补True冒充revision/cycle、负/非有限消耗、缺/额外字段、倍率乘积与ceil超界的零提交反例；这是未来生产验收，R1有限检查不代替。

开工实际`npm run test:run`记录真实baseline；完成实际`npm run check`（architecture→typecheck→test:run→build），分别记录exit与新增测试数；旧2256仅历史参照，不能预填。真实保存／浏览器NOT RUN且不宣称已接；完成源码准确SHA实审后停，不自动G2。

<a id="g2"></a>
## G2 连续位置与最小持久现场

结果：同执行跨图／跨日位置、已知边、已开启道路、显式来源及敌人持续引用保持；可以验证一条边移动和一次真实物转移。前置G1通过；R07跨夜地面／知识与稳定锚点正式审定，原首核心不变。

输入：受控小型content夹具（不注册五图产品）、活动lifecycle、唯一位置／现场／知识、唯一实例集合、G1成本计划。输出：完整相邻边移动后态或拒绝；到达的表层观察、同实例转移、source已兑现与实物剩余分别验证。现场以execution+稳定location/source/enemy引用为锚，不能currentDay派生新副本；敌HP只借只读持续引用，不复制可写战斗账。没有合法已知边拒绝且不耗E/危险/RNG。

生产者参照现有`scene-navigation.ts`、`enemy-persistent-state.ts`、`scene-search-materialization.ts`与`run-loadout-snapshot.ts`；新消费者为G3。候选未实现路径`src/core/residence-location/`与其同目录测试（实际任务锁定文件），仅小型有向图与内容明确的实例／来源状态，不承包完整五图资产系统。沿既有random-stream纯算法，增加新锚点的独立golden；旧scene identity/医院golden保持。

正例：同日A→B→A、休整仍同执行、敌伤/意图/物品ID/来源持续、局部知识到达更新、重载游标一致。反例：未知边、错节点、错执行、已兑现再生成、同实例两容器、远程未知危险泄露、队列越零后继续、成功/主动失败/期限失败后旧地面拾取、异委托冒用旧现场。关闭时活动位置消失但旧地面历史保留；合法携出实例不禁用、不重建。组合：E1跨边触发立即结果只形成待协调计划，不提前宣称完整战斗已可保存；真实战斗尚未支持则玩家入口不接。完整格子几何继续使用容器规则，不能将本有限模型qty字典当生产负重验证。

不含任务件完整处置、经济、CTB、专长、全路线或自动寻路。基线与最终命令同G1，新增生产单元/组合实测；浏览器／真实新槽仍NOT RUN。提交准确SHA即实审持续状态，不自动G3。

<a id="g3"></a>
## G3 受控单owner与窄稳定态headless恢复

结果：只对明确受支持子集建立受控一次bootstrap/install、严格聚合解析和完整提交／save端口／只读通知，不做完整Profile或公开新版保存。前置G1/G2通过；W2及首契约B2/B4/B5/B6适配经主线批准，O2冷启动途径得到明确授权；任何新生产format标识也须届时契约指定。

支持矩阵主推荐：全未接fresh-hub、非战斗active稳定节点；可严格拒绝living-hub/dead/combat等**尚未接完整业务**的类型，不能丢字段重解释。这不是最终W2保存矩阵；真实新战斗稳定保存及全部终局必须后续独立补齐，产品入口在此之前保持未接。

命令白名单：仅受控首次创建、冷恢复与G2已支持的非战斗单边移动；不提供launch/close/rest玩家入口。真实受控内容和候选计划判定该边是否引入未支持combat/立即结果/终局；遇到此类结果整笔拒绝、零提交，不能先改位置/E或忽略危险。无危险夹具不是永久禁止产品合法动作；本Goal产品入口保持未接，不接受调用方business_supported布尔值授予写权。R1模型spend/free/paid只为内部故障序列，不能照抄成公开G3命令。

输入：注入storage.read/write端口、受控内容版本与声明集、显式create意图；恢复只从read-success候选开始。受控cold候选API输出无安装权；全聚合检查、实例跨引用及世界/周期一致后由单owner一次安装。首次与后续写失败保留内存；第二bootstrap/create、任意replace、重复revision或订阅重入拒绝。无档/read-error/corrupt/unsupported分别返回，不用失败兜底new。

候选未实现路径`src/state/residence-session/`、`src/state/residence-save/`及同目录测试；如批准增加cold parser，仅定点修改`src/core/mission-lifecycle/controlled.ts`及validation/测试，原公开restore保证保持，原测试不得删减。实际源头参照`production-bootstrap.ts`／`run-save-codec.ts`／`run-store.ts`，但不修改医院production-composition、旧codec/registry或main。最近消费者仅headless受控测试，不做React、玩家入口或新任务注册。

验收：严格根/嵌套负例、缺失或重复声明、交叉角色/世界/模板/委托/执行/版本、两active、复用run、缺closed不补；从未建档显式创建与合法受支持roundtrip；首次/后续write故障后下一命令读内存；重入/旧revision/第二bootstrap拒绝无第二save/notify；完整body+position后态一次验证提交，不能仅closed。受支持阶段按R1周期矩阵验证来源及D/T，未支持终局仍显式拒绝；合法输出不能掩盖非法意图，写/通知前的最终数字与revision边界必须实测。真实端口适配器单元故障注入与序列化往返须执行，不能只用PythonPASS。浏览器localStorage/刷新/多标签在公开接线前另开验收，本Goal未接就NOT RUN。

基线及最终`npm run check`同G1；同时核对旧格式/身份/golden未变。提交即停止新owner／保存边界实审；不扩大为钱包、终局、真实战斗保存或完整世界SDK。

## 尚需关闭的依赖，不可因本批排除永久取消

| 欠账 | 必须关闭的阶段／职责 | 当前状态与本批影响 |
| --- | --- | --- |
| 三专长效果／差异与跨任务选择 | 内容规则负责人在专长工程前审定；全世界前九组合验收 | 004推荐保持Draft；G1不得暗加第三专长默认效果 |
| 工具箱H1开门电子产物新E及完整路线 | 内容/平衡职责在五图真实接线前补齐 | 不出售电子补洞；G2夹具不能冒称此路线通过 |
| 真实CTB与用药/零E战斗 | 战斗规则+稳定事务职责在combat保存/玩家入口前 | G1只E/周期；G3不支持不得提供入口，不能永久禁战斗保存 |
| 一次经济与任务实物清算 | 经济/终局职责在living-hub/dead完整事务前 | 失败20已确认，成功120/服务商品待审；未实现不可先closed |
| 安全感染信息 | player-safe规则职责在提示接线前 | V22有限配对不是全安全证明，UIR现约定不改 |
| 新旧槽／入口与发布 | 发布负责人汇总O3供Owner选择；浏览器接线前 | 不删除/迁移，不承诺永久两套 |
| Owner首玩 | 主线安排真实可玩版本；Owner自由试玩后定向复审 | 分段突破／召回省路／恢复负担仍NOT RUN |
