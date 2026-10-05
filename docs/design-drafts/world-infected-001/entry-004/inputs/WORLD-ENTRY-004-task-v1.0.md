# WORLD-ENTRY-004：真实五图内容与战斗医疗接线准入设计

任务书 v1.0；2026-10-05。**由 WebGPT 主线依据 Owner 已有任务下发权限安排。本批设计与验证执行已授权；新玩法采纳、正式归档和生产实现未授权。**

## 0. 目标、交付形式与停止点

在既有五图世界设计及 G1—G4／A／B／C 实际生产能力上，一次完成真实任务内容、战斗医疗／物品消费、三专长与工具箱路线所需的准入设计、可核查数据、有限验证、当前源码探针、交叉自查、集中 Owner 审阅页和最近最多三个工程契约候选。

这是把已有设计接到真实代码前的集中收口，不是重做 WORLD-DESIGN-004，不重新选世界主题／任务目标／单次驻留，不再铺一个通用任务 SDK。本轮所有新增或调整的玩法细则和参数明确为 Draft；所有已批准规则保持权威。

完成后一次普通 commit／push 到本任务分支，提交完整 SHA 等待当前 WebGPT 主线实文件评审。不能自动追加正式 DEC、安装确定载荷、启动候选工程或提供玩家入口。范围内细节自主设计、验证和修订，不要求 Owner 逐字段、逐用例协调。

## 1. 固定基线与本次 Git 权限

```text
repository = lvlw/elevator-survival
base_sha = 0921df3f219f368479d1bf3401d8fecddc0d5f71
base_parent = b9b1e0fee0e779669ca40e088ac9a867016bff82
base_tree = f835130ec111dcb387619168cd8bfccce7c72963
base_src_tree = 98c840dd0b6b1a6cc014df4ac9165bc94bf2c794
new_branch = feature/design-world-entry-004
```

原 Codex 设计会话的 HEAD 已过时。重新读取实际 repo root、origin、HEAD／parent／tree、branch、status（含未跟踪）、普通／cached diff、worktree 及远端引用，再从上述基线创建本任务分支。不要从 main、旧设计分支或记忆中的 HEAD 开始；已有同名分支先核对归属，不 reset／覆盖未知成果。

本任务明确允许在白名单内编辑，创建上述独立分支、普通 commit 并 push 至 origin 同名分支。不推 main、设计 003 或任一旧工程分支，不合并、不强推、不 rebase／amend 改已交付历史，不绕过 hooks／检查，不修改 Git 安全、SSL、代理、凭据或依赖配置。网络失败保留成果及真实退出码，不将查询失败写成已同步。

当前十二个参照引用和核心对象见 BASELINE-AND-INPUTS.json；它们是本轮读取的固定参照，不是未来永远的最新值。本批不含关机、重启、定时操作或修改 Project Sources／项目配置。

## 2. 原件、规则权威与必读来源

完整读取本包五件原件、核验 SHA256SUMS，并按原字节归档到 entry-004/inputs。再读取实际 AGENTS.md 及其要求的 docs/01、02、03、05、相关 docs/content；有关安全展示／试玩接入门槛，还须读 docs/09-ui-design-record.md 当前有效约定及相关 UIR。仅制定验收接口和信息边界，不借设计任务擅改现有 UIR 或做界面实现。

直接权威为 DEC-049／050／051及其局部覆盖；精力与周期正式合同、runtime-restore-supplement、terminal-core-contract、terminal-restore-contract、terminal-batch-plan。必要时读原 Owner 批准与补充消歧，不从历史正文里重新恢复已被局部覆盖的旧医院行为。

当前工程依据：C 完整受审源码／八份测试／helper 和本包 C 实审；B 的聚合／history／expected／codec；A 的资格／签发／清算／真实资产处分；G1/G2 的身体／动作／位置／来源／敌人／实例与资源验证；旧 combat、condition、inventory、item-state、quick-slot、scene-medical 等实际复用模块及相关测试。报告精确符号、路径和受审 SHA，不凭文件名认定支持。

已有设计入口（保持原文，不重写成新生产规则）：

- `docs/design-drafts/world-infected-001/02-seven-day-structure.md`、`03-location-design.md`、`04-main-mission.md`、`05-resource-economy.md`、`06-event-pack.md`、`07-enemy-continuity.md`（含 minimal-specialties）、`08-balance-budget.md`、`11-points-hub-recovery.md`。
- readiness/01、02、04；entry-002、entry-003 的来源／合同／候选参数，已正式采纳部分以 DEC-050/051 及唯一配置为准。特别注意旧候选仍写“成功120待批”的历史表不能否定后续 DEC-051。
- 正式源 `docs/content/items.md`、`enemies.md`、`events.md`、`scenes.md` 中相关部分，及实际 content/hospital-v0.1 数据与生产者。新世界不能直接继承旧医院一日主要场景、Scene Time、感染终局或自动回城规则。

无需逐包重读所有设计历史。以问题驱动追溯，输出“正式已生效／Owner 已确认待正式化／本批推荐 Draft／测试参数／历史比较／未支持”的来源表。来源不足必须标出具体缺口；不默补为已批准。

## 3. 不重新讨论且不得偷改的底线

目标仍为真实指定样本携回与当地急救转运恢复。医院／酒店／供电所／物流／通信五图是本期内容，酒店可绕过；七任务日不是未来全世界上限。同活动可合法跨图、回访、原位休整并保存继续，结束后同角色不能换 ID／标题／种子重接。当前无第二份真实内容。

沿用单精力、E>0 最后一次合法超余额行动截零、E0 不新开移动／搜索、已触发战斗及立即结果不能跳过；正常 H0 返回无夜，真实 G1 steps=[]，实际日结／死亡步骤按真实来源验证。HP0 才实际死亡，截止先结后生还召回、不生成旧任务 Day8。

终局四结果、成功全奖、失败本委托一次 min(P,20)、普通真实携出、任务件分流、死亡不继承和不倒改已成历史继续有效。首批 120／0／2147483647／20 与 G1 34 个配置值共 38 项，不再审批或复制成另一份可变默认。活动期间无其他积分收支，不借本批设计世界内售卖或部分任务积分。

三专长必须在完整世界验收前补齐；当前驻留内不换，跨未来委托改选未定，不为此新造第二任务。普通组件仅服务当地设施。工具箱完整路线、安全提示、真实首次体验和恢复负担不因基础工程已过而取消。

## 4. W1：真实五图、任务件与设施生产者合同

交付 `01-current-production-and-gaps.md`、`02-world-content-and-mission-contract.md`、`content-candidate.json` 的完整初稿，并在后续交叉检查中收口。

### 4.1 当前能力与可执行目标分开

明确 C 现在真实支持九类命令和四态稳定保存，但不能生产所有任务件／设施完成事实，不能安装活着的战斗阶段，不能处理真实药食／维护／专长。沿用现有能力；后续缺口要提出具体增量而非新建完整平行引擎。

以既有五图节点、任务流程和事件为基础，形成一个唯一机器可读 Draft 内容候选：位置／边、可观察信息、一次来源、任务目标、真实组件／样本、安装点、休整点、敌人驻留及依赖。给出稳定技术 ID 和来源映射，但不注册玩家内容、rulesVersion 或保存版本；已有 ID 必须说明承接或明确草案映射，不能重命名来刷新来源。

### 4.2 资格事实必须有真实生产过程

把“供电完成／转运恢复／取得指定样本”各自拆到明确的受控行动与唯一事实：前置知识／地点／任务绑定、实际实例和资源、材料消耗或安装处分、后态、精力／立即后果、重复请求拒绝和失败零部分提交。用户命令不能提交 completed、supported、fact=true、奖励或完整后态；实际消费 A 的政策映射不替代任务生产者。

不能把任务件标 ordinary 以绕过 G2；不能靠 fixture 手工把地面物塞包就称生产接线。明确任务提取、搬运、安装与 A 清算、B 来源历史校验及 C current 的接缝。普通地面物与任务件选择／放置各有依据，不重复创建实例、不抽完再由保存生成新物。

### 4.3 路线不是仅有总成本

给至少一条酒店绕行方案、一条酒店可选收益方案、分段突破／回访方案和工具箱完整方案；三专长×三工具的比较在 W2 汇合。每条见证按动作列地点、D/T、精力前后、HP／资源变化、来源占用、物品归属、安装／交付进展和终止原因。涉及未支持战斗／医疗的部分必须显式标记，不能把总数相减当完整执行。

不是保证每种选择都无风险必胜。必须指出真正的路线差异、不可达／失败原因、容量与精力交互及普通替代，禁止通过删敌人、刷新来源、赠送资源或改已批公式制造“可行”。

## 5. W2：战斗医疗、三专长与工具箱的联合边界

交付 `03-combat-medical-contract.md`、`04-specialties-tools-and-loadout.md`、`parameter-candidate.json`，并同步 W1 内容候选。

### 5.1 战斗及敌人持续性

从现有 CTB／敌人意图／持续敌人状态和新驻留 Draft 出发，明确：遭遇触发、进入战斗、动作与精力／即时后果的边界、胜利／合法退却／真实死亡、战斗中的药物与设备、战斗后地点／敌人／身体回写、跨图／休整后的敌人保留与再进入。不得把旧 Scene Time 消耗／超时强返债直接移植为新精力。

指出哪些属于已正式规则、哪些是需要 Owner 采纳的新语义。尚待取舍的 CTB 与精力／流血／日结时机给主推荐及真实代价，不以“工程字段”名义定玩法。任何战斗状态不得靠缺省胜利、清 pending、撤回合法死亡或旧 ready 免结算通过。

持久化必须覆盖未来真正可停留的战斗／退却边界；明确活战斗状态、随机游标、意图和身体／装备投影的唯一所有者。当前 B/C 拒绝 live pending 是临时工程边界，不是永久玩法。提出所需 schema／签发／codec／session 变更及迁移／拒绝范围的候选，不在本批实施，不承诺永久并行多套产品。

### 5.2 药食、维护与真实实物历史

把当前七日内容实际需要的食物、绷带／伤口、抑制／消毒、耐久／电量、必要维护和背包／快捷使用整理为最小完整集合。逐项给受控来源、合法目标、真实数量／ItemState、次数额度、一次效果与时序、E0 资格、战斗／非战斗差异、错误和保存失败语义。普通药食不能按名字凭空扣物／治伤；无目标是否允许消费等未定语义必须列为 Draft，不默定。

重点读取 B `terminal-history.ts` 的整来源输出完整性和 A 的 dispositions：现有整实例存在性／数量检查不能自动证明拆分、合并、部分消费、用药、安装的正确历史。提出最小来源／消费证据及库存/ItemState联合校验方案，包含“已消耗不再可用、未耗数量保留、重放不重复扣、不能用丢失输出掩盖复制”的反例。既不要删检查放行，也不要保留第二份可用库存／钱包或搭通用事件溯源框架。

商城、身体服务价格及未来同角色供给不在本轮默认采纳。需要影响首玩初始配装／七日存活的参数集中列为候选；不把失败20、成功120与未批药效／价格一起批准。中枢治疗和购买尚未接线，需单独后续 Gate，不为本轮建完整商店。

### 5.3 三专长、三工具与首次准备

以既有侦察／工程／生存推荐及撬棍／手电／工具箱路径为起点，保留其原适用版本与草案身份。对三专长×三工具九组合逐一给出至少一个实际选择影响／路线或资源差异、普通替代及不能叠加的效果；不能只列“省几点”或宣称自动九条完整通关。

工具箱必须覆盖真实取得／H1 使用／后续线路及与普通材料、电子、任务设施的区别。确有源文缺项，在授权范围内给有依据 Draft 并注明，不要求 Owner 手算补齐。专长的当前驻留锁定与保存恢复必须有归属；未来委托前能否换选继续后置，不扩展角色生命周期。

最小初始配装、负重／容量和必要消耗应与路线联动；不能为解决路线不足临时送隐藏物资。所有新增数值存于 parameter-candidate.json 的 Draft 分区，正文引用参数 ID；两份已批准配置只读引用并校验身份及 38 项现值，不创建第三份“正式”配置。

## 6. W3：有限模型、当前源码原生探针与交叉自查

交付 validation/ 下全部材料及 `05-source-and-adoption-map.md`。优先验证真实接口与未来接缝，不以堆数量代替覆盖。

### 6.1 两类证据不得混算

A类为本批未来内容／流程的有限模型：用 Draft 数据检查图谱／依赖／路线预算、实例与任务生命周期、日结／终局顺序、能力差异和信息边界。对每个案例注明模拟了什么、调用了什么、哪些仍是未实现。不用简化 Python 战斗当作真实 CTB 验收，不默写第二套生产规则。

B类为当前准确源码 API 原生探针：实际调用既有 G1/G2/A/B/C 与相关旧纯模块，展示现有支持、拒绝及新内容所缺；例如任务件不能当普通 pickup、live pending 仍拒绝、消耗／来源校验接缝、旧规则不能直接套新周期、已签发死亡不重放。当前源码不能执行的未来方案就报告未支持，不伪造原生正例。

探针置于独立 `.mjs`，必要临时运行配置／加载器只在仓库外产生；复用已锁定依赖，不新增包、不改 package／TS／Vite／Vitest 配置、不在仓库添加自动发现的 `*.test.ts`。不修改生产源码或已有测试以取探针通过。

### 6.2 验证覆盖要求

至少覆盖这些相互关联的类别，具体用例数由实际展开决定：

- 五图 ID／边／来源／任务件／安装依赖与到达可知信息一致；酒店不是通关门槛。
- 真实携回指定样本与本地目标同时满足；错实例／错执行／已另交／地面样本／不足材料不产生成功事实。
- 同活动跨图、回访、跨日保留；结束不重接；保存继续不刷新来源／敌人或额度。
- E0 合法免费自救与不能新移动／搜索分开；已触发战斗不能跳过；合法超余额一次结果保留。
- 动作／药食／维护／战斗／周期的效果顺序与死亡短路，正常 H0 空身体步骤、实际日结不能空、Day7无旧Day8。
- 真实消费／安装／交付／毁失及普通携出，来源数量守恒、不能复制／隐式满资源重建，旧成功／旧处分不倒改。
- 九组合的局部与路线证据分层；工具箱完整路线单列，不把 unsupported 当完成。
- 安全提示对隐藏感染精值／种子不同而可见知识相同的输入给相同可见结果；原 headless getState 不能作玩家投影。
- 新阶段可编码／恢复需要哪些增量，当前已批静态中枢及终局幂等不退化；坏档不自动清空或变首次创建。

每个负例必须核对拒绝原因和零后态提交，不把普通异常／模型崩溃当语义拒绝。非法数值在被清零、截断或覆盖前校验。明确统计 positive、expected-rejection、fault-injection、unsupported、mismatch；unsupported 不计实现通过，原生观察不与有限路线相加。

### 6.3 四类语义负向控制

`check.py` 至少支持下面四个独立 negative-control 名字：source-duplication、terminal-reopen、double-body-cycle、hidden-data-leak。每次只在隔离的模型／判定分支中引入一类语义错误（不是往 JSON 加一个未知字段了事），证明对应保护用例会检出并非零退出。提供命中的具体 ID、预期／实际差异和退出码；控制失败不能靠崩溃或启动错误。

正套件冻结后两个独立进程重跑输出字节一致。所有实现／候选和夹具最后修订完成后，冻结正文／候选／脚本／夹具清单；不把输出、freeze-manifest 本身、checks／completion 的自引用摘要放进冻结集合。输出时间／机器路径另记回执，不能污染确定性比较。保留修复前失败、修复后结果，既有历史175／213等完全不改写。

本批正例和反例要有独立预期来源：来源表、已批准 oracle、明确候选条款。不能只用同一函数产生期待再宣称一致；负向控制实际检测器与变异点需明示。

## 7. W4：集中采纳材料、最多三项近期契约与状态同步

### 7.1 Owner 审阅页

00-owner-review.md 开头直接说明下一步要 Owner 选什么，按最多四组核心采纳内容组织。每组给主推荐、真实玩家影响、替代／代价、具体条款及参数 ID；区分已确认无需重选与真正未定。后附可复制采纳文字，但标题明确“待采纳稿”，不能伪造 Owner 已批准。

附可逐条审查的局部规则候选，不擅编号 DEC-052 等；正文足够让主线确认后直接准备确定载荷，不能只给“请批准全部设计”空句。界面／发布兼容新承诺、生命周期或策略空间的变化必须单列，不埋入数值表。

### 7.2 近期完整工程候选

06-next-engineering-contracts.md 给最近最多三个完整 Goal 的候选，说明依赖／先后和为何这样切分。主推荐优先让真实任务件／当地设施、七日自救和战斗分段突破产生可测进度；不要再开通用身份或重复钱包框架。必须核对所提 API／目录实际存在或明确为候选，不把旧文件名当默认白名单。

第一候选写到目标、前置批准子集、明确支持／排除、唯一所有权、实际签发／结果／codec／session 接缝、原生长链与拒绝、可改路径建议、完整检查、精确 SHA 实审停止点的可定稿程度。后两项也要有独立可验收结果，不把三个生命周期／保存接缝合并成“一个大 Goal”逃避实审。

若所需能力必须最小修改 A/B/C，应明确列出修改理由、兼容及回归责任；本批不实际改动。不能要求后续工程在“不准改基础模块”与“必须扩展新状态”间自行猜授权。

### 7.3 可玩／保存／发布门槛

07-playable-and-release-gates.md 给从当前 C 到真实首玩所需的短依赖链：真实内容与选择差异→核心长链→低资产游戏 UI／安全查询→浏览器持久化／多标签→Owner 分段突破及恢复负担体验。它是验收与接入安排，不是已批准界面或浏览器实现。

以 UIR 现行分级和只读知识地图为约束，列明玩家绝不可直接读取的诊断字段；不做统一弹窗或开发控制台。现有素材只盘点复用关系，不要求 Owner 此刻准备图片／音频。

O3 旧医院入口／旧槽发布安排继续未定：明确在哪个发布／接线 Gate 前需要批准，列出待核实信息，不设置保留期限、不清档、不迁移，不承诺永久双产品。新headless内部格式若为战斗／物品消费需要调整，只给候选及兼容拒绝边界，不因本任务下发就生效。

四份允许追加的旧设计／readiness文档只加清晰的当前入口和 C PASS限定／新Draft状态，原文完整字节前缀保持。不要为历史附记仍写未实现而全篇改写；新入口必须让读者不依赖聊天也能定位当前基线。

## 8. 精确路径白名单（最多29条）

除下列路径外，仓库全部只读。本目录内本任务新建文件允许在本批内自主修订；inputs 五件只原字节归档。既有四件只追加，不删除、重排或改写原文。目录名不是递归授权。

```text
docs/design-drafts/world-infected-001/entry-004/00-owner-review.md
docs/design-drafts/world-infected-001/entry-004/01-current-production-and-gaps.md
docs/design-drafts/world-infected-001/entry-004/02-world-content-and-mission-contract.md
docs/design-drafts/world-infected-001/entry-004/03-combat-medical-contract.md
docs/design-drafts/world-infected-001/entry-004/04-specialties-tools-and-loadout.md
docs/design-drafts/world-infected-001/entry-004/05-source-and-adoption-map.md
docs/design-drafts/world-infected-001/entry-004/06-next-engineering-contracts.md
docs/design-drafts/world-infected-001/entry-004/07-playable-and-release-gates.md
docs/design-drafts/world-infected-001/entry-004/content-candidate.json
docs/design-drafts/world-infected-001/entry-004/parameter-candidate.json
docs/design-drafts/world-infected-001/entry-004/validation/check.py
docs/design-drafts/world-infected-001/entry-004/validation/fixtures.json
docs/design-drafts/world-infected-001/entry-004/validation/results.json
docs/design-drafts/world-infected-001/entry-004/validation/negative-controls.json
docs/design-drafts/world-infected-001/entry-004/validation/native-api-probes.mjs
docs/design-drafts/world-infected-001/entry-004/validation/native-api-results.json
docs/design-drafts/world-infected-001/entry-004/validation/freeze-manifest.json
docs/design-drafts/world-infected-001/entry-004/validation/README.md
docs/design-drafts/world-infected-001/entry-004/completion.md
docs/design-drafts/world-infected-001/entry-004/checks.json
docs/design-drafts/world-infected-001/entry-004/inputs/WORLD-ENTRY-004-task-v1.0.md
docs/design-drafts/world-infected-001/entry-004/inputs/OWNER-authority-and-scope-WORLD-ENTRY-004-v1.0.md
docs/design-drafts/world-infected-001/entry-004/inputs/AUD-0921df3-ENG-RESIDENCE-TERMINAL-SESSION-001-review-v1.0.md
docs/design-drafts/world-infected-001/entry-004/inputs/BASELINE-AND-INPUTS.json
docs/design-drafts/world-infected-001/entry-004/inputs/SHA256SUMS.txt
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
docs/design-drafts/world-infected-001/readiness/01-current-baseline-and-adoption.md
docs/design-drafts/world-infected-001/readiness/04-evidence-and-playtest-gates.md
```

不修改 docs/05 正式 DEC、docs/content 已批配置、已批 contracts、旧设计验证／原件、AGENTS、src、package／lock、脚本、CI、tsconfig、UI／素材。既有目录不存在可新建相应目录；新路径若已有内容先核对，不覆盖未知成果。仓库外临时日志／两跑结果／加载器是验证输出，不提交无关文件。

## 9. 实际命令、确定性与交付自检

开工核对本包 SHA 清单和原始 UTF-8 字节，记录固定 Git 状态及远端引用。任务为仅文档／隔离验证，**不要求用全量生产测试替代设计验证，也不引用旧3274当本轮成绩**。原生探针是本轮新执行，独立记录；生产全套未执行就写 NOT RUN，新增生产测试应为0。

交付脚本须支持以下实际命令（ROOT 为仓库，OUT1／OUT2 为不同仓库外目录）：

```sh
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --out <OUT1>/results.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --out <OUT2>/results.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control source-duplication --out <OUT1>/negative-source.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control terminal-reopen --out <OUT1>/negative-terminal.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control double-body-cycle --out <OUT1>/negative-cycle.json
python docs/design-drafts/world-infected-001/entry-004/validation/check.py --repo-root . --negative-control hidden-data-leak --out <OUT1>/negative-visible.json
node docs/design-drafts/world-infected-001/entry-004/validation/native-api-probes.mjs --repo-root . --out <OUT1>/native-api-results.json
npm run validate:architecture
git diff --check
git diff --cached --check
git diff 0921df3f219f368479d1bf3401d8fecddc0d5f71 --check
```

两次正套件预期 exit0、实际不符0且结果字节一致；四类负控预期 exit1并检出相应语义差异，不吞异常以作PASS。原生探针成功观察和明确未支持分开，不要求对未来实现强行PASS。必要运行加载机制复用当前已锁定工具，不能修 package 或 install 新依赖；确有执行环境阻塞说明缺哪项验证，不能把静态阅读冒充原生执行。

提交前：校验29条范围、5件归档原件、四完整旧前缀、所有新增相对链接／锚点、UTF-8/LF/无BOM及无新增行尾空格；输入中的路径引用按其原使用上下文处理，不为让归档链接生效改原字节。记录 source tree、旧正式文档／配置／模型和范围外Git对象与基线一致；参数引用和已有38项叶值无变化；候选新值恰等于数据唯一入口，无双版本歧义。

最终 `checks.json` 保存真实命令、退出码、冻结集、两跑哈希、负控命中、原件及范围检查、未执行项。`completion.md` 给起点／分支、W1—W4、文件清单、失败及修订、待Owner采纳组、支持不足及停止点。不要为在提交正文中写自己的最终 SHA 产生自引用 amend；最终 commit／parent／tree、远端核验和干净工作区在提交后消息交付。

完成一次普通 commit／push 后检查最终提交差异／diff-check及对应 remote。最终报告说明新branch准确SHA、原参照是否未变；remote查询失败仍标未确认，不用COMPLETE自述代替回执。然后停止等待主线准确SHA设计实审。

## 10. 验收与不得宣称的结果

本批完成标准是：当前可核查规格、数据、所有权／接口、有限反例和原生支持观察已集中交付，明显自相矛盾在本批修订，需Owner的真实取舍已列清，第一后续工程具备可定稿候选。

这不是完整世界 Design Freeze，也不等于所有路线组合、战斗与医疗、新档发布或试玩通过。不要将未支持计通过，不将已执行架构检查称生产测试，不把旧验证、作者证据和主线47项隔离检查叠加。不能修改原 C PASS 的对象或将候选文档写成生产已实现。

已确认方向不重问；本批新取舍先由主线审阅再交Owner采纳。只读盘点发现当前基础实现问题时提供具体最小复现与影响范围，单列待主线处置；不借本任务越界修生产或反向改玩法。
