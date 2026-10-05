# ENG-RESIDENCE-CONTENT-SUPPLY-001（E01-P）完整工程任务书 v1.0

日期：2026-10-05。下发者：WebGPT主线。执行者：Codex工程会话。

**本项已获明确执行与指定分支普通commit／push授权，不需要再次询问是否开工。** 一次完成W1—W4及自查修订，内部不要拆成需要Owner逐字段或逐文件确认的小任务。执行权只限本文件和同包权限记录；不自动进入R/S或E02/E03。

## 0. 先读结论与交付边界

本项把“东西真正来自哪里、哪一单位被用掉、什么任务成果是实际做出来的”做成纯TypeScript核心。一次交付：真实初配与驻留选择、五图受控内容绑定、任务生产与搬运、一次来源、拆合和份额守恒、六类战外药食、维护／充电、G1/G2/A纯值组合、正反例／长链／历史保全及检查。

**本项不持有current、不写存档、不实现v3 codec、不提供玩家入口，不实现CTB活战斗。** 可交付完整新领域值和纯终局计划；旧B/C不能接收新增结构是下游边界，不得削去来源数据来伪装旧格式支持。新格式属于E01-R，唯一会话提交属于E01-S。

### 0.1 准确起点

```text
Repository: lvlw/elevator-survival
Base:       ad56a7d9dfc08e38f966f20cf7e07c71c08c09dc
BaseParent: 612ac6673223cc93237184892e6713e789a9dce1
BaseTree:   1b2ec7efe6556c4e4254b089a48d3ddb019db2d3
BaseSrc:    98c840dd0b6b1a6cc014df4ac9165bc94bf2c794
NewBranch:  feature/residence-content-supply-core-001
```

原工程会话可能仍停在C，不可沿用其旧HEAD。由你实际查Git并新建以上工程分支，不在 `feature/design-world-entry-004` 或C分支实施。主线只读取了远端，用户本地状态必须由你核实。

### 0.2 附件交付与原件

Owner直接上传本ZIP；由你定位附件并在仓库外临时目录解压，不要求Owner填路径或手动放文件。拒绝不安全ZIP路径，保持目录和原字节。若工具确实没有附件访问能力，只报告该实际限制，不凭空声称读到了包。

同包5件均须完整读，校验SHA256SUMS覆盖的其余4件；将5件逐字归档到：
`docs/engineering/residence-foundation/content-supply-core/inputs/`。

不把“归档原件”当作又一可编辑规则源；不修改本任务书、权限记录、基线清单或审查原件。它们可以包含历史NOT RUN，不因本次工程运行改写历史。

## 1. 目标、依据与优先级

执行当时实际 `AGENTS.md`。正式规则以后确认DEC优先，当前DEC-049／050／051／052共同适用；旧医院只按旧版本解释。至少完整读取：

- `docs/01-game-design-v0.1.md`、`docs/02-vertical-slice.md`、`docs/03-architecture.md`、`docs/05-design-decisions.md`；适用片段和覆盖关系记入设计报告。
- `docs/engineering/residence-foundation/content-supply-core-contract-v1.0.md`（首契约）；`content-supply-restore-contract-v1.0.md`；`world-content-batch-plan-v1.0.md`。
- `docs/content/infected-world-entry-test-config-v0.1.json`、`infected-world-entry-content-v0.1.json`；原G1和终局两份配置。
- 原G1 energy-cycle契约、A terminal-core契约和runtime-restore补充；与本项相关的 `docs/content/items.md`、events、scenes、enemies及真实物品／医疗／资源源码。
- 当前G1/G2/A源码与测试、B/C相关严格输入／历史／保存边界；先读真实实现，再做适配，不用旧模型复制一套规则。
- 已归档Owner批准与采纳稿，以及本包文档实审报告。

`docs/design-drafts/world-infected-001/entry-004/`旧候选、check.py、fixtures和194项结果只作历史与反例导航；不能作为运行时参数、伤害、随机分支、初始物资或全图通关事实。未批的商城／身体服务／后继委托／O3仍不做。

### 1.1 完成结果

在隔离但真实声明的内容组合里，从真实初发及真实生产者获得来源／任务件，完成合法搬运、消费、维护和设施安装，交给A的窄后继协议形成完整成功／失败／死亡纯值。每一项新事实必须可以定位到实际API和原生测试；不能以手工置completed、把task物改ordinary、删敌人或删来源检查冒充实现。

本项会触及新的领域数据，不等于整个世界已可玩。危险已解决的隔离前态可用于测试任务生产者，但必须标明并保留原危险内容；本项不负责证明那场CTB战斗真实可达。

## 2. W1：开工、基线与详细设计

### 2.1 Git前置

核对仓库根、origin、当前branch／HEAD／status、普通diff和cached diff。保留非本任务变更；不得reset、clean、stash或覆盖用户成果。取到指定base并核对parent/tree/src；本地存在异常或同名新分支已被使用时停止报告，不自动重建／覆盖。

记录包内13个参照分支的远端值及本地可见值。新建分支后只在该分支修改；不要把其他参照强行移动到清单值。任一意外推进说明具体SHA，不能忽略基线漂移。

建立完整base跟踪对象清单（`git ls-tree -r`及模式／类型），保存到报告证据中或仓库外，后续对所有白名单外对象保持检查。源码分组的95条是最大可用精确路径，不是必须创建95个文件。

### 2.2 当轮真实基线

开工执行 `npm run test:run`，记录命令、环境、开始时准确SHA、退出码、文件／用例数及完整日志位置。历史147文件／3274项仅供导航，不可替代实跑。基线失败或依赖缺失时先报告实际原因，不靠本任务修无关问题、换依赖或跳过旧测试。

不安装／升级依赖；正常使用已有依赖和脚本。可在仓库外编写标准库／既有工具的审计脚本，不把调试工具或缓存混入提交。

### 2.3 实现前设计记录

先在 `implementation-notes.md` 写明：单一事实所有权、真实参数／内容映射、类型与依赖方向、计划签发／完整基态绑定、初发与来源锚、拆合和不可用处分、身体和终局衔接、各层支持矩阵及P01—P12测试安排。

普通实现细节可自主选择，候选API名字不强制。必须说明为什么旧接口不能直接容纳哪些新数据、准备复用哪些纯职责，不能用重复G1日结、平行G2现场、第二钱包或任意事件总线省事。

## 3. W2：内容、初配与真实任务生产

### 3.1 唯一103键配置与38值引用

新增可执行配置只有一个定义源。可沿用既有content TS常量＋受控core schema模式，测试以已批准docs JSON为独立oracle，比较完整键集合、103个值／数组及193整数叶；不只比较数量。原38值通过既有受控配置引用，不复制成另一个默认。

固定内容映射保留24节点、29双向连接和各位置／来源／前置；内部转换为成对定向边时说明技术映射，不能额外添加可玩连接。真实敌人声明保留；本项只需其静态身份及现有G2所需信息，不实现新敌人战斗执行器。

参数身份、内容版本、委托声明、执行seed和配置引用严格绑定。未有生产全局注册的名称可在隔离受控组合内明确声明技术标识，记录选择依据；不改旧全局registry／默认入口，不靠新rulesVersion重接同委托，不创建第二份玩家内容。

H1/H2必须按批准weights抽取一支，固定产出与该次附加分支构成一致的一次来源结果。禁止把条件用例 `grant.H2-random`当固定消毒剂，禁止由动作请求提供选中的奖励、随机结果或伤害。一次性来源重复、错位置／缺前置时不先取熵。

### 3.2 初始发放与选择

真实初发只有管、厚外套、三选一工具及快捷绷带1，资源取已批满值，其他初始库存空，无食物或电子。读取现有物品定义、设备／快捷／资源profile，显式适配，不从Python的gear字典推定完整装备结构。

初始来源与世界来源有独立确定锚；身份来自受控角色／具体委托／执行材料，不能用Date、UUID或Math.random造规则熵。初发不能覆盖已有身体、来源或已结束资格，不能二次向同一状态加物。

初次专长在实际出发前确定，当前驻留锁定；三工具是独立选择，不随用药／休整／回访变换或补发。读档所需的必要原事实进入本批纯值；不保存另一套派生能力或未来改选框架。

纯函数从相同前态重复求计划可以得到等价结果，不表示该计划能再次用于已经推进的状态。重复推进由完整基态／已发放／来源事实拒绝；不要用进程全局已发放清单充当玩法真相，也不要宣称纯初发可解决任意离线回滚。

### 3.3 内容动作和来源门禁

真实实现首契约覆盖的门／柜／旁路、调查知识、P1供电、L2核对与解除固定／控制组件、C1匹配／C3启动模块、H5样本、H8安装、T1交换、H1工具箱电子。按唯一批准数据决定资格和结果。

明确方法与成本：工具箱／撬棍／门卡、照明／黑暗、普通手工／已获得的方法／工程效果。优惠不重复叠加，普通替代继续存在；不在UI或自动猜测中替玩家选择成本、消耗对象、路线或格位。每次方法实际拥有对应工具／卡／事实和足够资源。

工具箱首开H1才有电子，留地面待显式拾取；先别法开门不能补领。T1在真实地点消费具体绷带／消毒剂并放置交换产出；验证完整输入和消费后合法结果空间，整笔成功或整笔拒绝，无预先扣物或自动腾包。

任务提取与明确入包采用合法原子事务，无法放下不先领取。后续留地面、回访取回、运输必须走受控任务协议，保留原实例、定义、执行、来源、ordinal及资源，不能把任务件当ordinary或给普通pickup添加“任何物品”开关。

安装携本执行两个任务专件和真实材料，消费／处分与transfer事实同笔产生；不留可用原件、不补发。样本在真实背包且其他目标达标才能到合法H0交付；地面、已另交、假同名、错执行、错来源或子ID替身不能过关。

### 3.4 谨慎／直接样本与知识

两种提取方式及有／无有效防护均按已批成本、风险和资源语义校验。谨慎＋外套只是旧有限模型的验证子集，不是唯一合法方案。实际风险从统一种子来源产生，严格先验后取熵；同一次合法动作的物品、暴露、资源与流血结果一起承接，不能死亡后回撤重抽。

C5调查才揭示对应隐藏连接，调查／解锁／移动是各自声明动作；不得把隐藏边提前加入所有surface观察。已观察知识可持续，但不公开未见位置最新危险。方法解锁不是任意setFacts。

本项最低只读查询给出本批正式安全资格／已知对象，不将完整内部纯值称Player ViewModel；E03完整玩家查询仍后续。查询不取熵、不耗资源、不返回可提交计划或写入资格。

## 4. W2：供给、拆合、药食与维护

### 4.1 有界来源分配

每个受控来源分别联结角色／具体委托、执行、地点、来源、ordinal、定义、原数量。已签发份额＝活份额＋已处分份额，不能只比较总重量／同名总数。先验证领取、声明输出、各唯一容器和资源一致，再产生结果。

实例在地面／背包／装备／快捷／仓库等互斥容器真实迁移，ItemState保留同一资源事实。任务来源只用于当前执行；普通合法历史资产保留原来源，不强制改为当前执行或无故没收。历史处分不可用，不是影子库存。

拆分子身份应可确定推导，来源份额不重叠；合并保留各原份额、只允许相容定义／资源，显式合法容量。任务件不堆叠、不拆成可代替样本的新ID。已消费／安装／交付单位不能通过拆合、迁移、重命名再用；缺一来源输出不能由另一来源多单位抵账。

不为通过旧A/B全实例ID唯一校验而重建替身、补回旧数量、丢弃处分、重复保存活单位或删验证。新有界份额协议可定义独立类型；需要解释实际物品身份与消费份额的区别，并让后续R能纯验证全部约束。

快捷操作沿现有明确拆装／单份语义，不自动补满；若需在本批组合中适配旧纯操作，仍须同时维护来源和ItemState。不能从远程地面／仓库按名称扣材料。

### 4.2 六类战外药食

在合法稳定、HP>0、有合格目标／日額和真实可消费实例时，每次一单位；数量省略或安全整数1，其余先拒绝。E0合法，不额外付费流血。严格区分物品存在、可用域、目标合格、额度与实际效果，不能只检测名称。

- 口粮：饱食未满，按批准量封顶，不回血。
- 绷带：HP受损、流血或未处理伤口构成合格目标；存在未处理伤口时明确选一处，恢复及止血，不清其余伤口。
- 急救包：按批准来源和真实医疗目标API处理一处合格伤口／挫伤及恢复；不默认清全部，不把布尔模型的contusion直接替代真实计数。
- 消毒剂：实际pendingExposure>0且额度有余，只处理声明次数的待暴露，不回退已成感染。
- 抑制剂：符合已感染／待暴露资格及额度，保持G1实际suppression与用量的联合等式，不直接治愈。
- 镇痛：未生效且有合格挫伤／未处理伤口，只抑制既定惩罚，不治伤、不删除伤口。

复用真实旧医疗／健康纯原语的适用部分；旧医院规则配置不是新驻留参数源。G1主要effects只有healthLoss/exposuresAdded，禁止传负损血模拟治疗，禁止给旧普通provider开放任意patch。可由新受控供给计划组合合法主要效果、G1能量／周期职责和身体严格验证；保持一个body和一次revision。

侦察、工程效果按真实C1／L2动作发生。生存首个合格世界绷带恢复总量2而不是1+2，之后基础1；标记不能按日、回访或未来战中另刷新一次。E02战中首绷需复用同一必要原事实，当前不实现战中用药。

### 4.3 维护与充电

显式实际目标及材料，资源未满、正E才能开始付费操作；正E最后一次可超余额，结束截零。机械恢复15是单次总池，显式给一个或多个合格管／撬分配，总和不超过池、每个目标不超合法上限，不让每件各得15。必须有多目标真实正反例和剩余／浪费证据。

工具箱同时消耗金属与电子；织物修外套，兼容电池充手电；材料与目标资源的变化同笔。电子被修理用掉后不能再参与安装。耐久最后不足额按已批规则截零；charge不足额先拒绝，不从耐久或金属制造电。

结合适用说明：DEC-052 D07的“不因维修改变身体”约束资源修复不得附赠治疗／清伤或额度刷新，**不豁免该付费行动按D01／DEC-050和P05/P10应有的精力及流血**。维护资源效果、付费身体后果与可能死亡完整组合，不另加新的治疗或处罚；不改正式文档。

## 5. W3：计划、G1/G2/A接缝与纯终局

### 5.1 先验、签发与唯一事实

逐意图限定允许／必需键，原始数值先验为有限安全整数。拒绝布尔、NaN、Infinity、负值、小数、越界、accessor、额外业务字段、未知选择器、错误版本／执行及stale revision；不得靠忽略字段、默认修复、封顶后态或catch-all变通过。

完整独立前态由受控composition提供，命令不能自带authority、completed、损血／随机值、snapshot、plan或supported。合法计划在模块内部签发，冻结独立副本，绑定完整当前值和版本；不能修改或冻结调用方对象。克隆、JSON、另一角色／执行／旧revision／被替换内容的计划必须拒绝。

纯值验证不授予安装权。模块内WeakMap/WeakSet只可记录技术签发和基态关系，不持有第二current、已消费余额或游戏生命周期事实。不要把一个执行ID已用的集合替代同角色具体委托关闭事实。

### 5.2 当前实现中的真实接缝

开工必须再读实际源码，以下是主线在起点已确认的能力限制，不是新玩法：

| 接缝 | 原实现限制 | 本项合法处理 |
| --- | --- | --- |
| G1 primary effects | 仅损血／暴露，view仅查询 | 新受控医疗组合和身体验证，不放宽旧provider或把view变动作 |
| G2 catalog/source | 固定／均匀choice；旧普通源没有新工具方法／加权组合 | 新受控内容／来源协议，复用原随机与来源身份职责；不能让旧reveal绕过工具、任务或一次性门禁 |
| G2 knowledge | 已知边由已访问surface见证约束 | 新调查见证窄协议，保持未揭示边不可查询／移动；不得给旧版本放宽全图 |
| G2 move／items | 原位置、独立plan、普通整实例搬运 | 复用其纯职责，必要窄适配兼容新现场；任务搬运与来源份额另验，不并行保存第二site |
| A历史／步骤 | 原全实例处分与单调G2死亡步骤 | 显式新来源／处分协议并复用A结算职责；旧接口保持严格，不剥去新证据骗旧validator |
| B/C | v2只支持其已审聚合 | 不修改、不安装新值，本项NOT SUPPORTED_BY_V2要如实标明；R/S以后实现 |

允许第8节列明的旧G2/A文件作必要纯helper提取、显式新协议分支及相邻复用，不允许为通关“全局接受”新字段。全部旧入口、旧输入和错误边界必须由原回归保持；新增公开运行时入口只放新专用index／controlled文件，避免修改既有精确导出集合。

依赖方向写入设计并检查。不得让task→A→task或G2→supply→G2形成运行时循环；不要用动态import、全局注册器、any／ts-ignore或通用事件总线绕架构。可选择小型共享纯函数与单向组合；不复制整套旧世界运行时。

### 5.3 身体和终局只消费一次

G1继续拥有精力、日结、付费流血和HP0短路；本项不要复制感染／饥饿公式。操作前验证全部可验证条件，合法动作的实物／主要后果／应有流血组成一次结果。若产生HP0，保留该结果，通过A新来源窄入口消费原计划一次；不能重跑动作、周期、风险或初发，不额外加一次revision。

新任务／维修死亡须真实生产者生成，不能修改普通G2计划的kind冒充签发。新步骤先检查形状、原数值、顺序、独立前态和所有权再消费，不能把合法治疗后受伤步骤错误套入旧单调扣血验证；本项不提前实现战斗医疗步骤。

正常H0成功／失败仍调用正式G1正常返回，身体steps=[]，不补夜；期限仍使用真实G1有序日结和死亡短路。A或其明确纯后继统一决定奖励、一次min(P,20)、死亡失当前可用资产及历史保留，不能在任务模块重复发奖或关委托。

目标是一个包括身体、site／归档、真实资产、来源份额、必要选择、钱包／收据和任务关闭的完整纯结果，而非几份可以分别应用的半结果。可扩展A内部共享结算职责并提供新专用受控入口；不得复制钱包算法另起一套消费者、改变旧A精确public API，或把新schema无版本地区分混入旧v2。

### 5.4 生还、关闭和历史

成功／主动失败／期限失败及死亡关闭后都不能从旧来源再用物，不重接。当前没有下一真实委托时保持静态生还中枢或真实死亡值，不生成继续按钮或新任务。

至少用两份明确声明的**测试内容**作历史组合：第一份真实P/A结果→第二声明的合法活动测试起点→真实新来源操作／死亡，核对旧成功／失败收据、旧消耗／安装／交付不倒改。该测试不在生产content注册第二委托，不实现未来玩家接续入口，不把跨全部任意历史自洽当防回滚证明。

## 6. W3验收：P01—P12必须逐项定位

完整映射来自已批首契约，以下为实现证据具体化，不新增玩法数值。

| 组 | 必需实际正例 | 必需拒绝／组合反例 |
| --- | --- | --- |
| P01 配置 | 103键／193叶逐值oracle，38值原样，5图24节点29连接映射，加权分支边界与可注入种子 | 键缺失／额外／布尔数，错版本，H2多固定奖励、未授权来源或参数 |
| P02 初配 | 真实初发三工具×三专长选择、完整ItemState及来源锚，无初粮 | 同状态重复发放／改选、重置已用首绷、额外物资或重建已关闭角色进度 |
| P03 任务 | 原生P1调查供电、L2核对解除提取、C1匹配／C3模块、H5样本、H8安装 | 上传完成事实、缺前置、错误方法／工具、远程材料、安装后再领原件 |
| P04 搬运 | 原实例提取→放下→合法跨日／回访→取回→安装或带样返回 | 格位重叠／越界／过重、错执行／ordinal／来源、地面或已交样、普通通道绕过 |
| P05 来源 | 一次固定＋权重随机、工具箱独占首开电子、T1交换整笔结果 | 重复取熵、错位置／未解锁、先别法后追领、无空间却先扣交易物 |
| P06 守恒 | 堆叠拆合、部分消费、移入快捷、原来源份额及不可用历史 | 同总量跨来源调包、重复子份额、资源不兼容、删输出不记消费、消费份额再次可用 |
| P07 药食 | 六药合格目标，E0，满HP但有伤口／流血，具体目标和真实日额 | HP0、无目标、错伤口／日额、非法原数量、作用其他未选伤口或中枢自动治疗 |
| P08 维护 | 多目标15总池、电子维修后安装竞争、织物、兼容充电、正E超余额及真流血 | 每件各15、超额／重复目标、材料不足、无目标、E0开始、charge不足仍放行 |
| P09 专长 | 侦察C1、工程L2不叠加、普通方法／撬替代、生存首绷总2后续1 | 回访／休整／克隆重置能力、把生存变全局药效、工具附赠材料或自动充满 |
| P10 死亡 | 原生任务／维护HP0→A一次；旧G2死亡／正常H0空步骤／真实截止回归 | 克隆／错基态／错源／假steps、重算随机、增加第二revision、把合法死亡撤回 |
| P11 接口 | 不变／冻结与可变输入对照，精确公开入口和独立签发，安全查询无副作用 | NaN／Infinity／布尔／负数／小数／超安全整数、accessor、未知字段／selector、异常冒充语义拒绝 |
| P12 长链 | 真实来源→拆合／用药／维修→任务运输／安装→终局，旧历史保全，全量check | 跨委托调包、旧history改写、引用旧模型成功当实现、白名单或既有测试被修改 |

测试数量以实际展开用例统计，不设凑数门槛。新测试、替换、删除、净增分开；本任务预计旧测试替换／删除均为0。不得skip、删旧断言、把toEqual改宽松匹配或用“全部拒绝”通过正反例。

### 6.1 原生链与条件起点

真实初发必须有原生链，不用预置有物资的active覆盖所有入口。任务长链遇未实现战斗时，可从**明确标记、完整校验的危险已解决测试前态**切入，随后供电／提取／消费／安装必须真实调用新生产者。与真实首次无档／完整CTB通关区分，不复制模型damage轨迹当producer。

各已存在来源的重访、拆合、合法日结和原地恢复保留数据，不要求P做字符串codec。结构克隆可用于验证值，不等于原计划签发能力；JSON来回仅能验证拒绝伪能力，不宣称完成保存恢复。

### 6.2 独立计数与故障注入

对以下链在夹具构造后清零观察，单列G1 action／cycle、G2生产者、source materialization、真实draw、医疗／维护效果、A terminal／death consumer、terminate、签发计划；逐阶段记录实际次数。

A. H1/H2一次真实来源→消费／维护→合法失败或成功：重复请求和旧计划不重复抽取／消费。
B. 新任务／维护致死：原动作一次、流血一次、A只消费，不重复G1／随机／实例发放，最终revision仅本动作一次推进。
C. 正常H0返回、Day7正常返回、异地deadline：各自保留真实G1调用与步骤，不混在“总计1次”里。
D. 原值／权限非法前拒绝，与生产者已经被调用后发现提案非法分别记账。后一种如实记录调用，但仍无可应用后态、不改原值。

使用原生spy／真实引用及实际字段验证，不只统计返回标签。故障注入明确写“生产者替换／损坏提案”等类别；程序异常不当合法Reject。P无存储／current，因此IO=0只证明没接IO，不能伪造写失败、重入保存或恰好一次持久化成绩。

## 7. W4：自查、文档和最终检查

### 7.1 自主修订

集中自查：source身份及耗尽、各container与ItemState、隐藏知识、任务方法替代、免费／付费身体后果、签发/旧base、旧history、导出边界及import依赖。发现本范围实现错误自主修复并复跑，不要求Owner逐项批准代码修订。

参数／正式玩法、任务生命周期、策略选择或O3需要改变时不得自行决定。确有精确路径冲突，集中说明事实和最小影响，不弱化旧测试或改源码注册器绕过。已经明示的本任务新协议接缝不需再逐文件申请。

### 7.2 完成四份报告

目录 `docs/engineering/residence-foundation/content-supply-core/`：

- `implementation-notes.md`：开工详细设计、真实接缝、失败／修复过程，明确作者辅助审查不是主线实审。
- `contract-and-support.md`：实际API／所有权、P01—P12定位、纯值字段和R/S后续需要的完整不变量；明确哪些旧入口不接受新结构。
- `verification-results.json`：真实baseline／target／check命令与退出、用例数变动、调用计数、文件清单与blob／SHA256、原件／参数／保护审计、NOT RUN。
- `completion.md`：可贴回Owner的完整交付摘要、冲突／未完成项、Git权限与停止点。不伪造自己的最终提交SHA；准确final/parent/tree在提交后消息给出，避免为追逐自身SHA再amend。

四份共享文档仅末尾追加当前工程附记，完整基线原字节前缀保持。附记只更新真实实现范围／后续边界／证据身份，不改规则或历史数字；必须链接真实报告。已批contract／配置原件保持只读。

### 7.3 实际命令

```text
npm run test:run
npm run test:run -- src/core/residence-supply src/core/residence-task src/content/infected-world-v0.1 src/core/residence-location src/core/residence-terminal src/core/character-cycle src/core/residence-energy src/core/mission-lifecycle src/state/residence-save src/state/residence-session
npm run check
```

第一条为真实开工baseline，后两条为实现后。最终按实际package.json的架构、类型、测试、构建链执行；新增模块运行后还必须全量跑旧医院／UI等全部回归。原脚本和配置不得为本任务改动。

还须核对：完整95路径许可、所有既有测试未变、所有白名单外跟踪对象未变；旧公开导出集合未变；38配置／103配置逐值与正式source一致；5输入原字节与staged/committed blob一致；4共享文档前缀；UTF-8／LF／链接与锚点；新生产代码无测试helper/content反向依赖／系统时间随机／浏览器IO；可达value-import环检测及原生测试。

记录普通、cached、baseline→worktree、baseline→最终commit各`git diff --check`真实退出码；新增未跟踪文件也检查，不可只看普通diff为空。全量check后记录实测source指纹，暂存／提交后再次对照，防止测试和提交不是同一版本。无空白检查例外；构建既有warning记录不调阈值。

真实浏览器、存储适配器、多标签、Owner试玩、CTB完整路线：NOT RUN。只读文档模型旧194／24和过去主线探针不与本次新增测试累加。

## 8. 精确白名单与旧接口保护

**最多95条路径**，完整机器清单为同包 `BASELINE-AND-INPUTS.json.allowed_paths`，下方附录列出相同集合。允许新建/修改只限这些路径；不递归授权目录，不要求创建所有候选文件，不因某文件空缺自动新增另一个路径。

15份列明的既有G2/A生产文件可作必要纯职责复用和显式新协议内部适配，其原函数签名／输出／拒绝和版本语义保持。`residence-location/controlled.ts`虽可内部修改，**原运行时导出集合不加不删**。旧普通index与A原controlled不在白名单，保持只读；新接口通过新task/supply及A的supply-controlled进入。全部原测试只读，新行为写入新增测试。

不得修改：首身份核心、G1及原参数实现、旧医疗／库存／资源原语、B/C或其他 `src/state/` 文件、旧医院内容、全局content index／registry、React/UI、AGENTS、依赖／CI／构建配置、正式DEC和已批contract、历史模型／审查原件。必要原语均可只读调用；若现有API不足，优先新受控组合与已授权G2/A纯提取，不改旧语义。

脚本、日志和辅助输出可在仓库外生成并把真实结果归入报告；不要新增仓库路径借此绕白名单。新文件由清单给出，不添加未许可README、index桶或占位未来模块。

## 9. commit、push与停止

最终检查通过后，将本项实际修改的许可路径显式暂存，核对diff与保护对象。完成一次最终普通commit，父SHA应为ad56a7d完整起点；建议message：`feat(core): add residence content and supply producers`。不为内部步骤要求Owner转发，也不为报告finalSHA再追加自引用提交／amend。

只允许普通push：

```text
git push -u origin HEAD:refs/heads/feature/residence-content-supply-core-001
```

查询该分支真实远端SHA并与本地一致；其他13个原参照分支应保持。网络失败最多两次普通尝试，保留本地commit及真实回执；不关闭SSL验证、不改remote／代理／凭据、不强推，不声明未核验CI为成功。

最终报告标题为 `ENG-RESIDENCE-CONTENT-SUPPLY-001（E01-P）`，包含准确起始／final／parent／tree、真实baseline、测试变化、P01—P12、独立调用计数、全部check、实际文件、未完成及push结果。工作区脏则说明实际，不掩盖。作者完成不等于主线PASS。

**提交后停止等待当前WebGPT主线准确SHA源码实审。不进入E01-R／S、E02／E03；不合并、不推main或旧分支、不强推。** 本任务不主动安排关机／重启／定时；Owner在Codex当次另行明确要求的个人操作单独处理。

## 附录A：95条精确路径

下列是最大修改集合，不是必须创建的文件数量。新增文件命名槽位可以少用；不得改成任意目录授权。

### A1 新供给纯模块（26）

```text
src/core/residence-supply/index.ts
src/core/residence-supply/controlled.ts
src/core/residence-supply/types.ts
src/core/residence-supply/config.ts
src/core/residence-supply/validation.ts
src/core/residence-supply/authority.ts
src/core/residence-supply/plans.ts
src/core/residence-supply/provenance.ts
src/core/residence-supply/allocations.ts
src/core/residence-supply/initial.ts
src/core/residence-supply/medical.ts
src/core/residence-supply/maintenance.ts
src/core/residence-supply/inventory.ts
src/core/residence-supply/cycle-adapter.ts
src/core/residence-supply/history.ts
src/core/residence-supply/queries.ts
src/core/residence-supply/test-fixtures.ts
src/core/residence-supply/config.test.ts
src/core/residence-supply/initial.test.ts
src/core/residence-supply/provenance.test.ts
src/core/residence-supply/inventory.test.ts
src/core/residence-supply/medical.test.ts
src/core/residence-supply/maintenance.test.ts
src/core/residence-supply/authority.test.ts
src/core/residence-supply/history.test.ts
src/core/residence-supply/supply.integration.test.ts
```

### A2 新任务纯模块（17）

```text
src/core/residence-task/index.ts
src/core/residence-task/controlled.ts
src/core/residence-task/types.ts
src/core/residence-task/catalog.ts
src/core/residence-task/validation.ts
src/core/residence-task/authority.ts
src/core/residence-task/plans.ts
src/core/residence-task/actions.ts
src/core/residence-task/transfer.ts
src/core/residence-task/random.ts
src/core/residence-task/sources.ts
src/core/residence-task/test-fixtures.ts
src/core/residence-task/tasks.test.ts
src/core/residence-task/transfer.test.ts
src/core/residence-task/sources.test.ts
src/core/residence-task/sample.test.ts
src/core/residence-task/task.integration.test.ts
```

### A3 新内容受控绑定（12）

```text
src/content/infected-world-v0.1/config.ts
src/content/infected-world-v0.1/content.ts
src/content/infected-world-v0.1/catalog.ts
src/content/infected-world-v0.1/items.ts
src/content/infected-world-v0.1/enemies.ts
src/content/infected-world-v0.1/identity.ts
src/content/infected-world-v0.1/initial.ts
src/content/infected-world-v0.1/index.ts
src/content/infected-world-v0.1/config.test.ts
src/content/infected-world-v0.1/catalog.test.ts
src/content/infected-world-v0.1/initial.test.ts
src/content/infected-world-v0.1/content.integration.test.ts
```

### A4 既有G2窄接缝（9）

```text
src/core/residence-location/catalog.ts
src/core/residence-location/types.ts
src/core/residence-location/validation.ts
src/core/residence-location/movement.ts
src/core/residence-location/knowledge.ts
src/core/residence-location/sources.ts
src/core/residence-location/items.ts
src/core/residence-location/identity.ts
src/core/residence-location/controlled.ts
```

### A5 G2专用新协议／回归（4）

```text
src/core/residence-location/supply-location.ts
src/core/residence-location/supply-knowledge.ts
src/core/residence-location/supply-catalog.ts
src/core/residence-location/supply-location.test.ts
```

### A6 既有A窄接缝（6）

```text
src/core/residence-terminal/authority.ts
src/core/residence-terminal/validation.ts
src/core/residence-terminal/plans.ts
src/core/residence-terminal/settlement.ts
src/core/residence-terminal/dispositions.ts
src/core/residence-terminal/types.ts
```

### A7 A新来源协议／回归（8）

```text
src/core/residence-terminal/supply-controlled.ts
src/core/residence-terminal/supply-types.ts
src/core/residence-terminal/supply-validation.ts
src/core/residence-terminal/supply-plans.ts
src/core/residence-terminal/supply-terminal.ts
src/core/residence-terminal/settlement-shared.ts
src/core/residence-terminal/supply-terminal.test.ts
src/core/residence-terminal/supply-history.test.ts
```

### A8 本项报告（4）

```text
docs/engineering/residence-foundation/content-supply-core/implementation-notes.md
docs/engineering/residence-foundation/content-supply-core/contract-and-support.md
docs/engineering/residence-foundation/content-supply-core/verification-results.json
docs/engineering/residence-foundation/content-supply-core/completion.md
```

### A9 只可末尾追加的共享文档（4）

```text
docs/03-architecture.md
docs/08-rule-implementation-traceability.md
docs/design-drafts/world-infected-001/01-world-overview.md
docs/design-drafts/world-infected-001/10-decision-queue.md
```

### A10 原件归档（5）

```text
docs/engineering/residence-foundation/content-supply-core/inputs/ENG-RESIDENCE-CONTENT-SUPPLY-001-task-v1.0.md
docs/engineering/residence-foundation/content-supply-core/inputs/OWNER-authority-and-scope-E01-P-v1.0.md
docs/engineering/residence-foundation/content-supply-core/inputs/AUD-ad56a7d-DOC-WORLD-ENTRY-004-review-v1.0.md
docs/engineering/residence-foundation/content-supply-core/inputs/BASELINE-AND-INPUTS.json
docs/engineering/residence-foundation/content-supply-core/inputs/SHA256SUMS.txt
```
