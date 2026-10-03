# ENG-RESIDENCE-LOCATION-001（G2）：连续位置与最小持久现场

> 任务书 v1.0；日期：2026-10-04。
> **主线依据Owner既有任务下发权限、O2实际批准和G1-R1源码实审PASS直接下发。收到完整输入包后执行，不再请求开工或逐步骤批准。**
> 一个完整工程Goal：详细设计→实现→单元／跨模块反例→自查修订→全量检查→文档→普通commit／push。
> 本任务第4—7节是本Goal的工程实现合同。只落实已批准玩法，不创建新DEC；G3与玩家入口不在本批。

## 1. Goal、批准依据和停止点

**交付“同一活动执行能沿真实已知边移动，现场不因跨图／跨日重建，已揭示物能按真实实例迁移”的纯TypeScript能力。** 同时证明来源不能重复兑现、旧委托关闭后地面物不能拿、玩家知识不等于世界全知。

不重复G1，不把全部五图、背包产品、战斗、任务结算和保存一次承包。可执行内容仅为受控小型测试夹具，不注册新玩家世界；本项结束仍无新世界试玩入口。

| 项目 | 锁定值 |
| --- | --- |
| 仓库 | lvlw/elevator-survival |
| 起始完整SHA | 942b2d93916c649f4c2ec6cd399035151269d2ca |
| 来源分支 | feature/residence-energy-cycle-core-001，仅作为读取基线，不在其上交付G2 |
| 新建工程分支 | feature/residence-location-core-001 |
| 本任务Git权限 | 仅该新分支的普通commit／push；不merge、rebase、amend、强推或推其他分支 |
| 修改范围 | 第8节29条精确路径；旧生产代码全只读 |
| 停止点 | G2最终提交已交付，等待主线准确SHA持续现场源码实审；不自动执行G3 |

正式依据按优先级读取：

- `docs/05-design-decisions.md`：DEC-049身份／单次驻留／关闭；DEC-050第2、5、6、7节；相关DEC-006、007、010、013、015、045、048仍保留的职责。新版本局部覆盖不倒改旧医院。
- `docs/design-drafts/world-infected-001/entry-002/adoption/inputs/OWNER-approval-WORLD-ENTRY-002-ADOPTION-v1.0.md`及同目录获批稿第4节：O2持续现场已批准，O3后置，未列参数没有一并批准。
- `docs/engineering/residence-foundation/runtime-restore-supplement-v1.0.md`与`energy-cycle-contract-v1.0.md`：唯一事实、完整提交、G1与后续职责。
- 同包 `AUD-942b2d9-ENG-RESIDENCE-ENERGY-CYCLE-001-R1-review-v1.0.md`：本次G1准入PASS；旧9bbf5aaa的NEEDS REVISION保留历史。
- `docs/design-drafts/world-infected-001/entry-002/03-next-engineering-goals.md#g2`：近期G2候选导航；本任务将路径与支持子集明确收口。不能把其G3路线当执行授权。

Owner已要求尽量一次完成较长任务。普通技术组织、类型命名和白名单内的自查修订由Codex负责；需要改动已批准机制、支持承诺或范围外文件时，报告具体冲突，不自行扩权。

## 2. 接手、分支与本轮真实基线

在原Codex工程会话继续，不能沿用旧会话的HEAD、规则或源码推断。完整读取根与适用嵌套AGENTS，按其要求读取GDD、Slice、Architecture、DEC和相关Content；涉及玩家可知信息时读取UIR当前信息边界，不新增交互约定。

先实际执行并记录：

```text
git rev-parse --show-toplevel
git remote -v
git rev-parse HEAD
git branch --show-current
git status --short --untracked-files=all
git diff --name-status
git diff --cached --name-status
git worktree list --porcelain
git ls-remote --heads origin refs/heads/main refs/heads/feature/design-world-entry-002 refs/heads/feature/design-world-infected-world-001 refs/heads/feature/mission-lifecycle-core-001 refs/heads/feature/residence-energy-cycle-core-001 refs/heads/feature/residence-location-core-001
```

核对起点存在、当前工作区没有他人改动；确认新目标目录／分支未被占用。由你从指定SHA新建`feature/residence-location-core-001`，不从main或旧设计分支开始，不要求Owner手动建分支。若重复收到本任务，识别自己已完成的进度并继续，不reset已有成果。有无法解释的分支漂移或他人修改时报告，不覆盖。

**写生产代码前执行实际 `npm run test:run`。** 110文件／2425项仅为前次CI参照，本轮用真实输出建立基线，保留日志、退出码和指纹。依赖齐备不安装；确需恢复依赖仅按现有lockfile执行npm ci，不升级、audit fix或修改配置。G1-R1的基线和原生反例记录不被本轮覆盖。

## 3. 定点源码阅读与复用边界

根会话先读下面入口及实际依赖、相关测试，在`implementation-notes.md`记录真正复用的符号、未复用理由和实际阅读范围，不要求Owner逐文件协调：

| 实际入口 | 可复用／必须注意 |
| --- | --- |
| `src/core/residence-energy/{index,types,validation,energy}.ts` | 使用R1后的查询／执行分离；view永不进入plan/provider；成本／行动流血不自行重算 |
| `src/core/character-cycle/{index,types,validation,cycle}.ts` | 只有一份身体、D/T和revision；G2借用，不复制或重新实现日结 |
| `src/core/mission-lifecycle/` | 具体委托及完整执行绑定、active/closed事实；标题、runId或同名节点不能解除关闭 |
| `src/core/random/random-stream.ts`及测试 | 复用counter32-v1、createStreamId、纯cursor抽取；原算法与golden不改 |
| `src/core/scene-navigation/scene-navigation.ts`及测试 | 表层观察、已知／已访问集合的验证可参考或复用；不调用旧Scene每日初始化 |
| `src/core/scene-search/scene-search-materialization.ts`及`scene-item-snapshot.ts` | 物化、ItemInstance与ItemState校验可复用；其旧sceneInstanceId锚点不能按日期照搬 |
| `src/core/scene-items/scene-items.ts` | 地面实体结构、同实例数量与状态操作；G2需再包严格根结构及执行绑定 |
| `src/core/inventory/`、`item-state/`、`quick-slot/`、`equipment/`、`load/` | 真实几何、数量、耐久、电量和携带约束；不要用qty字典或capacity=true替代 |
| `src/core/run-loadout/run-loadout-snapshot.ts` | 跨容器实例／状态唯一性参考；不直接引入旧Run taskStorage/warehouse生命周期为新角色资产 |
| `src/core/combat/enemy-persistent-state.ts` | 敌人HP、意图、行为进度和失能一致性；resolvedActionCount不是随机游标，不增设第二可写HP |
| `src/core/scene-exploration/player-visible-scene-navigation.ts` | 只作旧查询对照；不能用远程真实enabled/敌人当前状态冒充已知信息 |

已有模块如存在宽松规范化，不能直接把其返回当新入口已完成strict验证。允许在新模块内补严格包装；本任务不修改旧模块、算法、G1、正式规则或检查配置。

## 4. 支持子集与唯一事实合同

### 4.1 本Goal必须完成

一个受控、有限节点有向图，含两个逻辑地点的往返边、至少一个非公开边、明确表层观察；一份绑定同角色／具体委托／完整执行的持续现场；已声明道路／工程成果、具名敌人持续值与随机游标、一次性来源、地面实物和知识的严格值验证与保留；只读安全查询；单边移动、一次来源揭示及普通实体整实例拾取／放下的纯计划。

由Codex在写实现前明确最小数据结构和公开导出面。可使用下列职责分层，不固定全部字段名：

| 事实 | 唯一拥有方式与约束 |
| --- | --- |
| 身体、角色周期D、任务日T、revision | 只使用G1的CharacterCycleState；现场不再保存一份HP／E／药限／D/T或第二提交计数 |
| 角色／世界／模板／具体委托／执行 | 与受控MissionScope、当前lifecycle及完整RunIdentity交叉验证；现场只保存必要绑定／引用，不建立第二关闭账 |
| 当前行动位置 | 同执行只有一个；地图由受控节点归属派生，不分别保存可矛盾map与node；跨夜不回入口 |
| 道路、设施成果、来源、敌人 | 一个持续现场；来源兑现记录不是库存；敌值只在一处保存，战斗后续借引用 |
| 实体与容器 | 每instanceId一处真实容器、一份实际ItemState；地面容器有执行与节点归属；携带后不附永久“旧来源禁用”标签 |
| 玩家知识 | 已观察节点／边与必要最后观测；与现场真实状态分开；只读查询不更新知识或生成物资 |
| RNG | 受控执行种子＋稳定地点／来源或敌人／用途锚点；保存必要cursor，不存可任意编辑的第二游标 |

不可变纯值可以组成一次调用的局部聚合，但不创建Store、Profile、应用bootstrap、浏览器codec、通用任务SDK或事件总线。G2的校验、快照复制与Object.freeze没有安装权，也不证明全角色历史／离线防回滚。

### 4.2 初始化、继续、关闭

首次现场构造是受控组织入口，和普通移动／查询分开；要求当前独立active执行与声明一致。普通命令不能调用初始化来刷新地点／来源。恢复／反序列化见证只做纯值严格验证，不是新保存安装；缺字段不补初态。

同一active执行跨图、休整、再次读取继续使用原现场；不新建每日Scene，不刷新地面、来源、敌人、风险cursor或知识。D/T更新只通过实际G1计划；G2没有“改day即刷新”的回调。

三种已关闭结果（success、voluntary-failure、deadline-failure）下，活动位置查询必须为空，移动、揭示、拾取旧地面都拒绝。保留的坐标只能有只读历史含义。可依据唯一lifecycle派生活动资格，不要求复制第二closed标志；不得给调用者一个随意close/reopen开关。

本模块不完成任务清算。若提供本地退出整理计划，必须绑定正式协调器提出的同执行退出要求，不能预先关闭任务以获得输入；完整返回／死亡事务仍属后续。合法携带实体不会因为原委托关闭就被删除或重建；原地面不能被同名节点、异委托或新runId重新操作。

### 4.3 明确尚不支持

不注册医院／酒店／供电所／物流／通信五图，不冻结其真实边价、休整节点、负重分档、医疗／装备／专长效果。小图、敌人值、物资、尺寸／重量、互动成本和风险概率均为隔离测试夹具，不能由此进入正式内容目录。

本批物品写操作支持普通物的**整实例／整堆迁移**，可一次完成同实例放下和再拾取；不在本Goal重写拆分／合堆／装备切换／快捷栏使用或任务件完整处置。部分数量请求等未支持意图严格拒绝，不默默按整堆执行。这是未接玩家入口阶段的窄实现子集，不删除今后局部拾取、任务件或完整容器能力。

不实现CTB、新敌人战斗、医疗消费、钱包／失败扣款、成功发奖、H0完整返回、Day7完整召回、未来任务供给或保存安装。已经开始的战斗不能被移动／休整跳过；不支持的业务明确标识，不伪造成安全完成。

## 5. 移动、查询与完整局部计划

### 5.1 请求和受控上下文

公开命令只表达意图、目标及expectedRevision等必要绑定，例如edgeId、sourceId、instanceId和明确背包摆放。费用、真实位置、来源内容、敌人状态、物品后态、已验证资格不得由请求任意提供。拒绝eligible、canCarry、alreadyTriggered、free、force、nextState等旁路字段。

受控catalog／当前lifecycle／G1authority来自独立组合边界，和请求及待验候选分开。严格验证自身负责的全部身份、版本、当前revision、节点／边相邻性与方向、已知边、真实条件及资源；不能用一个可由调用者填写的boolean代替实际内容／容器验证。

本Goal允许由测试构造有来源、内部一致的既有道路打开／设施完成／伤敌状态，用于证明真实保留；这不等于已经实现开门、安装或造成敌伤的完整任务。不能添加公开setFact/setEnemyHP/setSourceUsed接口让测试跳过规则。

### 5.2 单边移动

沿一条真实、已知且方向合法的相邻边移动；未知边、错from、远程跳转、错误执行或旧revision均先拒绝。费用取受控小图输入，用G1真实公开API生成共享E及行动流血后态，不能另写成本／流血算法。

E1/cost8可完成到达并截0；下一条边重新验正E，不能用多边数组打包一口气执行。成功到达的表层观察与位置、身体变化是同一完整局部计划；不能先安装身体再补位置，不能为位置与身体各加一次revision。纯计划不调用save或通知。

移动到达如有实际已声明的立即后果或敌人遭遇，必须保留该后果及真实绑定，不能因E归零删掉。可完全计算的受控窄损血／暴露效果通过G1一次组合；遭遇CTB或终局未支持时，输出明确的“需后续协调”计划／需求，不标成稳定可提交世界，也不跳过危险。G3未来只能接其可完整完成的子集。

本批不新增危险生成规则。没有资格的动作不得先推进来源／风险游标；合法动作造成死亡与非法请求要区分。所有局部后态算术／引用在返回前校验，真实死亡计划仍没有自行关闭委托、丢资产或保存的权限。

### 5.3 只读查询与知识

提供未来UI可用的安全知识查询，与内部真实现场检查明确分开。安全输出只包含正式已知节点／路线／最后观测及当前允许公开的信息；不得直接返回整个世界、未知来源内容、执行seed／风险cursor、精确隐藏感染或远处敌人最新HP／意图。

当前可见的观察依受控内容和实际到达产生；查询本身不追加观察，不耗E、不改revision、不调效果provider或随机函数。远程事实变动但已知信息不变的两份合法状态，安全查询输出应相同。历史“曾通过”不替代当前实体／道路条件；未知捷径不能参与正式可走路线。

地图知识可显示最后已知信息，不提供未经观察的远程精确安全判断。内部真实合法性检查不能被命名为player-safe query后直接输出给玩家。无需新增弹窗、自动寻路、长开发面板或UI代码。

G1-R1的view只读约束必须在G2公共导出链继续成立：查询结果不能作为行动Completion、trigger或提交计划使用。

## 6. 来源、实体迁移与确定性

### 6.1 来源的一次兑现

来源必须归属一个执行中的稳定节点和明确sourceId；未揭示机会与已生成地面实物分离。一次合法揭示：验证完整条件与正E→确定已声明内容→物化真实实体／状态→标记该来源兑现→组合G1身体／E／revision，一次返回完整计划。

不得在query／预览时物化；不得因背包满阻止只揭示到地面的搜索。实际pickup时才验证摆放／容量。全部拿走、只拿部分（后续能力）、放下、跨图或跨夜都不能将已兑现来源恢复为可领奖库存。非法／取消请求不兑现来源、不消费游标。

本Goal支持明示固定产物和至少一个受种子约束的窄选择夹具，不建立通用战利品脚本语言。可复用现有materializeMainSearchOutcome的纯物化部分，但须明确新稳定锚点如何传入，并用测试证明没有继承日期Scene重建语义。禁止把历史Python模型或toy SHA256用作生产RNG。

### 6.2 整实例拾取与留置

普通已揭示物在同一active执行、同一实际稳定节点可零E拾取；与尚未产生实体的任务提取区分。把同一ItemInstance及其ItemState从地面移到指定背包位置，不按definition重新create一个满耐久／满电替身。放下采用相同实例和真实状态反向迁移；新实例ID只能来自真正的初次物化，不来自迁移。

复用现有背包几何、物理目录及状态校验，核对格子、方向、数量、合法携带范围，以及真实装备／快捷栏等有关携带量；实际选择的负重规则由受控测试依赖提供，不抄旧医院默认值作为新世界批准配置。原有带状态物品保留耐久、电量和其他已支持状态字段，不止保存qty。

地面／背包／装备／快捷栏的重复instanceId、缺ItemState、多状态、错definition、非法数量／耐久／电量、错误执行／节点、越界／重叠摆放均拒绝，完整前态不变。不自动旋转、自动选其他格子或丢弃别的物资凑出成功。

为控制范围，可把装备和快捷栏当作只读已存在容器参与唯一性与携带校验，而不新增它们的操作命令。已有严格schema如有修复性默认，应先用新入口拒绝缺损原始值，不能借复用静默修好输入。

### 6.3 持续敌人与随机

现场保留实际具名敌人剩余HP、既选下一意图、行为进度、是否接战／失能，以及独立风险cursor的一份事实。可以复用EnemyPersistentCombatState验证；G2不新增攻击／防御／逃跑调度，不把结束战斗的临时CTB保存进持续敌人，也不清除未结束战斗临时态来伪称支持恢复。

采用现有`counter32-v1`与`createStreamId`的明确分段编码。新锚点至少绑定规则／具体委托／完整执行身份、稳定地点／来源或敌人和用途；seed来自该执行，不从现实时间、UUID、Math.random取得。不得含首次到访日期、数组访问顺序或新日Scene ID。

具体锚点段序在实现前记录，并新增独立固定golden与隔离性质测试。它是本模块编码选择，不注册新产品rulesVersion或保存格式。不同来源／敌人／用途不共享可写cursor；访问别处、查询、休整、往返不推进它。真正消费时随完整计划建议后继cursor，拒绝／预览不消费。

## 7. 必须执行的验收与反向自查

以下是最低语义覆盖，不是预填测试数量。全部用真实TypeScript模块及公开／受控边界，不能mock G1校验或用自己的boolean替代规则后宣称通过。

| 组 | 正例、反例与组合要求 |
| --- | --- |
| L01 身份／结构 | 正确active执行与目录绑定；错角色／世界／模板／具体委托／runId／seed／rules／contract／catalog绑定拒绝；非普通对象、访问器、重复ID、缺多字段、错数字拒绝；可变／冻结输入不被修改或意外冻结 |
| L02 位置／方向 | 同日A→B→A保留执行与D/T；只能沿当前已知相邻有向边；未知、反向未声明、错from、远程目标及多边请求拒绝 |
| L03 G1组合 | E1/cost8到达E0，行动流血只一次；下一边provider/RNG0次；非法先验零局部变更；所有子计划共有前态／revision，完整计划只建议一次递增 |
| L04 观察／安全 | 到达才加合法表层知识；未访问边不凭日志成为全知；跨夜知识不清空；相同可见信息／不同隐藏远程状态输出一致；query重复无E／revision／RNG／provider变化 |
| L05 来源 | 真正揭示后标记且物化；已兑现重试、跨夜重发、拿空后重发拒绝；背包满可揭地面但pickup须另验；对调访问顺序不改变同来源结果 |
| L06 实体迁移 | 带真实耐久和电量的普通物整实例拾取／放下／跨夜回取；ID及全状态保持、全容器唯一；越格／重叠／超携带／缺状态／重复实体拒绝且前态保持 |
| L07 关闭隔离 | 三种正式关闭后活动位置为空；旧地面拾取／揭示／移动拒绝；另一委托同名节点不能读旧现场为当前，换runId不能重开；合法已携带物仍保留 |
| L08 持续成果／敌人 | 合法已打开道路／设施、伤敌HP／意图／行为进度／风险cursor在往返与G1真实休整后不重建；已失能不补替身；明示这些是已有事实保留而不是完整战斗或工程施工验收 |
| L09 RNG | 新锚点固定golden；日期／访问顺序不影响；来源／敌人／用途隔离；纯快照序列化往返保留同cursor；无真实save/冷安装宣称；旧random golden全量回归不变 |
| L10 待后果／死亡 | E0不抹去到达时已触发结果；一次受控立即损血＋一次流血；HP0分类为需完整终局协调的合法结果；CTB未支持不包装稳定完成，不能借G2移动/休整跳过战斗 |
| L11 组合／重放 | 移动→揭示→pickup/drop→用真实G1休整→回访再取的连续序列；第二次来源不能产生第二份物；旧revision／旧执行计划拒绝；计划尚未安装不声称具备全历史防回滚 |
| L12 保护／支持说明 | G1-R1全部169项与现有全量测试继续；配置34叶不变；新增公开面只含本Goal能力，未支持操作显式拒绝；没有G3、UI、Save注册或新的玩家任务 |

对整实例限制必须有部分数量意图的明确拒绝测试；该限制只属于本Goal支持矩阵，不写成正式玩法禁止部分拾取。

在同一批内逆向检查：只读与写计划是否混用；已关闭事实是否可绕；物品是否删后重建；未知边／非法容量是否先扣E；旧day是否刷新来源／风险；重复提交是否二次发物；安全查询是否直接读远程真实事实。可使用只读专项助手，但根会话唯一写者和Git执行者，不递归建任务。发现白名单内普通问题直接修订，保留先失败后通过的记录。

## 8. 精确路径白名单（最多29条，不要求为凑数量新建空文件）

### 新生产模块（10条）

```text
src/core/residence-location/types.ts
src/core/residence-location/validation.ts
src/core/residence-location/catalog.ts
src/core/residence-location/identity.ts
src/core/residence-location/knowledge.ts
src/core/residence-location/sources.ts
src/core/residence-location/items.ts
src/core/residence-location/movement.ts
src/core/residence-location/controlled.ts
src/core/residence-location/index.ts
```

API具体命名、文件内组织可自主决定；不新增第二生产目录或修改其他导出index。类型与schema不能只为测试绕过既有边界。初始化／内部协调入口与未来玩家可用查询／意图面分清。

### 同目录测试与测试专用夹具（6条）

```text
src/core/residence-location/test-fixtures.ts
src/core/residence-location/location.test.ts
src/core/residence-location/movement.test.ts
src/core/residence-location/items-sources.test.ts
src/core/residence-location/knowledge-random.test.ts
src/core/residence-location/residence.integration.test.ts
```

`test-fixtures.ts`仅能被测试引用，不由生产index导出或生产模块导入；不注册content。架构脚本可能按文件名将此.ts计入统计，报告实际统计，不借此宣称增加玩家内容。所有测试数字与内容明确隔离；与批准runtime配置无关的夹具不升格。

### 新交付文档（4条）

```text
docs/engineering/residence-foundation/g2/contract-and-support.md
docs/engineering/residence-foundation/g2/implementation-notes.md
docs/engineering/residence-foundation/g2/verification-results.json
docs/engineering/residence-foundation/g2/completion.md
```

contract-and-support记录本任务合同落实的实际API、唯一事实、支持／拒绝矩阵与G3消费条件，不另改玩法。implementation-notes先记录设计、后记录源码／12组实际测试映射。验证JSON保留本轮真基线、迭代失败、最终命令／退出码、指纹、作者／助手证据；原始stdout、审计临时脚本放仓库外。

### 五份本包原件按原字节归档（5条）

```text
docs/engineering/residence-foundation/g2/inputs/ENG-RESIDENCE-LOCATION-001-task-v1.0.md
docs/engineering/residence-foundation/g2/inputs/OWNER-authority-and-scope-G2-v1.0.md
docs/engineering/residence-foundation/g2/inputs/AUD-942b2d9-ENG-RESIDENCE-ENERGY-CYCLE-001-R1-review-v1.0.md
docs/engineering/residence-foundation/g2/inputs/BASELINE-AND-INPUTS.json
docs/engineering/residence-foundation/g2/inputs/SHA256SUMS.txt
```

### 既有状态文件只追加必要说明（4条）

```text
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
```

完整保留起点字节前缀；追加G1在942b2d9本次限定PASS、G2本轮作者实施／待准确SHA实审及后续债务。不要把9bbf5aaa原NEEDS REVISION、旧未开工、历史试验记录改写掉。

**其余文件全保护。** 特别是DEC001—050、获批参数JSON、两份正式合同、G1全部生产／测试／原件、mission-lifecycle、旧医院、其他core/content、state/app/UI、AGENTS、依赖／lock、scripts、CI、Git配置和历史设计验证原件。不得为了方便引入旧Scene生命周期、修改模型结果、更新依赖或扩大路径。

## 9. 执行检查、普通提交与推送

基线后分阶段完成类型与定向测试，不等到结束才首次运行。最终至少实际执行：

```text
npm run test:run -- src/core/residence-location/location.test.ts src/core/residence-location/movement.test.ts src/core/residence-location/items-sources.test.ts src/core/residence-location/knowledge-random.test.ts src/core/residence-location/residence.integration.test.ts
npm run test:run -- src/core/residence-config/residence-config.test.ts src/content/infected-residence-core-v0.1/config.test.ts src/core/residence-energy/energy.test.ts src/core/character-cycle/cycle.test.ts src/core/character-cycle/energy-cycle.integration.test.ts
npm run check
git diff --check
git diff --cached --check
git diff --check 942b2d93916c649f4c2ec6cd399035151269d2ca
git diff --name-status 942b2d93916c649f4c2ec6cd399035151269d2ca
```

若合理合并测试文件，实际命令按已存在白名单路径调整并说明，不创建空测试骗匹配。完整check按届时实际package.json包含架构／类型／测试／构建；失败原样记录并修复范围内问题，不改检查器、hooks或阈值。

在仓库外使用审计脚本核对：全部tracked/untracked变更不越界、五原件大小／SHA-256／Git blob、四状态文件完整前缀、非白名单原Git对象不变、G1配置34叶与完整键值不变、新依赖无逆向／熵／IO／运行时循环、严格UTF-8/LF无BOM、新增相对链接和全部diff。测试源码最终指纹与index／commit一致；记录实际数字而非预填保护对象数。

本包生成文本不含行尾空格，无新增空白例外。父提交中的旧归档空白不属于本轮新diff；不要清理它或改配置吞告警。只显式暂存白名单中的实际改动，不`git add .`。报告更新后重新暂存核验，再普通commit；建议message：`feat: add persistent residence location core`。

```text
git push origin HEAD:refs/heads/feature/residence-location-core-001
```

提交后核对完整SHA、父链、工作区、实际基线diff、远端同名引用和受保护参照分支。网络失败可在本任务内一次普通重试，持续失败保留现有提交并报PUSH BLOCKED；不关闭SSL、不改remote／代理／凭据、不强推、不重做commit。不要为自填最终SHA反复amend；提交后消息提供准确SHA。

## 10. 完成报告与停止

报告首先给本项状态、起始／最终完整SHA、分支、普通commit／push和远端结果。随后列真实基线、新增与重构测试、最终check、12组实际API／测试映射、失败与修订、原件／范围／保护结果及未完成项。

分别写明：作者本地执行、只读助手审查、主线尚待执行；普通值roundtrip不是浏览器存档，纯计划不是应用提交，伤敌夹具保留不是新战斗，既有医院UI测试不是新世界试玩。旧213／56模型、G1历史与重复测试不能累加成新增验证。

本轮未接的G3、真实保存／刷新／多标签、浏览器、Owner试玩写NOT RUN。三专长、工具箱完整路线、完整终局／真实CTB和未批内容参数保留对应后续责任，不永久删除。

**交付后停止。** 不因为本轮自检通过而自动实现G3、开PR合并、推main或给玩家启用新世界。将最终报告交回WebGPT主线准确SHA实审；Owner只负责传递这一次报告，不要求其手算、挑文件或协调模块。
