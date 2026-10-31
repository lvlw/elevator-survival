# B1窄技术合同 v1.0

状态：主线为本次工程定稿；仅细化既有已提交玩家动作的呈现运输，不新增玩法、信息披露规则或存档版本。未形成完整Design Freeze/最终战斗演出。

## T01. 唯一目标、支持域和不支持

仅对**原正式facade真正提交并正常返回的combat family命令**提供一次粗粒度呈现载荷。六类闭合公开动作是 `basic-attack / signature / temporary-attack / defend / retreat / quick-use`。这些只表示玩家已提交哪一类动作；不表示命中次数、敌方回应次数、造成伤害或致死先后。

由原已严格解析的 `CombatSessionCommand.kind === 'combat'` 和其内部原命令枚举显式分类；基础/标志管攻击、临时攻击、防御、逃跑与快捷用物的实际枚举开工再核对并逐一映射。不得通过中文label、opaque selector形状、地点、Feed或前后HP推断。未知/将来新枚举不泛化成任一类；本期六类必须完整，不能用兜底规避验收。

**非combat命令完全不附加新字段/载荷/token。** 特别是移动触发战斗、战外医疗、任务、安装、初配、出发、终局或休整，维持原返回结构与含义，不算B1行动。

## T02. 原结算所有权不动

原P完整结算→原S严格验证/预编码→唯一current安装→一次writer→原通知的顺序与次数保持。facade原owner.dispatch只调用一次；禁止为了动作证据再调producer、重放CTB/RNG、重算伤害/流血/日结，或再调用一次dispatch。

可保留原dispatch的成功返回，只读取判断是否已提交及必要持久化语义；**不把其中current、maintenance、notificationErrors、witness或raw command带入新玩家字段**。既有player.execute成功返回后的view仍是同一正式安全投影。规则拒绝/旧选择不升级为已提交。

新分类/投影不读完整历史战斗、不读当前command不需要的临床/来源字段，不改变选择器、资格、支付、当前状态或随机。A的三字段opponent和现有五阶段按原接口消费，不重新定义阶段阈值或“失去能力”的死亡语义。

## T03. facade最小增量

`PlayerExecution`只在成功combat返回附加可选 `committedAction: { action: PublicCombatAction }`；闭合类型与对象只有这一公开action字段，无token、ID、资源明细或私有command。拒绝和非combat返回没有该属性（不是null占位）。原kind/view/preview含义及旧字段保留。

动作分类来自此次执行中原resolvePlayerCommand的结果，不能来自调用方随意提供的“已提交”布尔或字符串。仅当本次原dispatch正常完成，且原同步/安全返回路径正常完成时携带；从查询/订阅/恢复不得重建它。PlayerSession.query本体不增加呈现历史字段。

## T04. controller直接返回载荷

`PreplayResult`仅在受支持成功返回上新增可选 `presentation`。getSnapshot、PreplaySnapshot、Feed、S/current、save/expected、BrowserSnapshot和订阅通知均不得附加该对象、token、队列或第二份动作历史。不要把已有可选execution字段重新解释成新事实来源；不更改旧字段的语义。

载荷闭合结构（命名按此执行；Readonly/freeze，不包含额外字段）：

```ts
type PublicCombatAction =
  | 'basic-attack' | 'signature' | 'temporary-attack'
  | 'defend' | 'retreat' | 'quick-use'

type PresentationToken = Readonly<{
  scope: Readonly<object> // 独立无数据的冻结对象，按引用区分controller寿命
  ordinal: number        // 从0开始的会话局部安全整数
}>

type CommittedCombatPresentation = Readonly<{
  version: 1
  token: PresentationToken
  opponent: PlayerOpponentPresentation
  stageBefore: ExistingPublicEnemyStage | null
  stageAfter: ExistingPublicEnemyStage | null
  sequence: readonly [Readonly<{
    ordinal: 0
    actor: Readonly<{ role: 'player' }>
    action: PublicCombatAction
  }>]
  stop: 'battle-decision' | 'stable-active' | 'living-hub' | 'dead' | 'unavailable'
  persistence: 'saved' | 'save-failed'
}>
```

`ExistingPublicEnemyStage`是原combat.enemyStage的类型别名/复用，不新建一套阈值或按HP转换。sequence恒为1条，不是逐击数组。没有伤害数、miss/hit、敌方响应列表、continuous CTB、资产路径或动画时长。

## T05. 每个字段的唯一来源

| 字段 | 来源／要求 |
| --- | --- |
| version | 固定呈现协议1，绝非save/rules/content版本 |
| sequence.action | 本次facade成功返回的闭合committedAction，不从view动作菜单匹配旧selector |
| actor/sequence.ordinal | 固定player/0；不根据内部回应或伤口数量变动 |
| opponent | 执行前**同一当前有效战斗**的A安全opponent，逐字段重建；不直接复制整combat对象 |
| stageBefore | 同一执行前安全combat.enemyStage |
| stageAfter | 同一成功执行结果view中的安全combat.enemyStage；无combat或公开不可用为null，不保留旧阶段 |
| stop | 执行结果view当前point：相应四个合法结果直接映射；blocked/非ready映射unavailable，不能据null阶段猜胜利 |
| persistence | 本次成功提交后的既有安全持久化feedback/原提交语义，仅saved或save-failed |
| token | 仅由本controller的独立呈现issuer生成 |

执行前输入必须在executeCaptured的同步执行窗口，从原纯player.query捕获，不以可能过时的snapshot当权威；不得调用生产者做“预演”。执行后来自本次PlayerExecution，不额外回读磁盘。原run/adopt用于Feed的来源语义和通知次数不因此改写。仅在成功路径新建闭合对象；没有对象spread复制view/raw command/witness。

正常受支持原生路径必须存在载荷，不能用“可选”全都省略。尚未有可信安全前态、原执行/投影异常、无法确定正常返回时，不猜历史或补发。原异常通道/blocked/执行不确定语义保持；错误不获得token，不自动重试动作。已经安装current的动作不能因呈现问题被回滚或被包装成“未执行，可重试原动作”。程序异常必须在测试/报告可见，不靠吞异常凑绿；不借本项重设计全局错误处理。

## T06. 临时token：独立于选择器scope

每个新controller只创建一个无数据冻结scope对象；所有B1 token与该scope同寿命。**禁止复用现有ports.preplay.scope()/controller的选择器scope变量**：它随current/选择版本变化，不是呈现会话寿命。也不能用revision、battleId、executionId、seed、时间、UUID、Math.random或哈希隐值构造scope/token。

ordinal从0开始，仅当本次受支持正常成功返回实际附加presentation时递增一次。连续同类动作各有不同token；同步、busy/stable通知、只读查看、非combat提交、拒绝/取消、retrySave不递增。发出后同一载荷/token不可变；重复转交同一结果仍用原token，不重造“新事件”。安全整数边界不得回绕/撞token；不可用时只停呈现签发并走明确可审的固定降级，不能阻止已提交玩法或把token写入存档。

token不是命令authority、玩家身份、可持久化事件ID或离线恰好一次承诺。对象的序列化结构不区分两个空scope是预期的：比较须用真实作用域引用，不可JSON.stringify当全局身份。

## T07. 保存失败、重试、冷恢复及通知

- 已提交＋save-failed仍可产生一次载荷，persistence为save-failed，当前内存保留；重试保存只沿原retrySave写最新current，不发token、不追加动作或改写旧载荷persistence。
- 保存失败后继续下一真实combat动作：新token，原玩法/资源不重算；随后只保存最新结果。
- 所有订阅只读，不发布presentation；多监听器、监听异常、busy/stable两次界面发布都不造成额外动作载荷。不得为B1增加全局通知、订阅总线或持久队列。
- 冷恢复五个合法停点直接显示已保存状态，无旧载荷/动画队列/已消费token重建。新controller拥有新scope，但没有“恢复动作”。初配不会因此重发。
- 同次合法退却后再入：仍由既有S真实动作形成场次；B1使用当时安全前态，不复用旧对手/阶段，不复活敌人、不授予旧selector。

## T08. 消费与失效：本批只验证协议，不接C

不增加React、CSS、生产动画播放器、定时器、生产consumer状态或asset loader。本批新建**TEST-only参考消费者**，用真实本次返回对象证明：同一token至多接受一次；新token按返回顺序接受；不同controller作用域不串；scope更换后迟到旧结果拒绝；跳过/减少动态仍将该token消费并直接settle；取消后不重播。

有限高水位/单scope令牌结构可以用于测试消费者，不形成无界token集合。消费者取消、切页、卸载、失去使用权只影响本地演出，不撤销或再发命令；回调不dispatch、不保存、不决定死亡或胜利。

原BrowserOwner已经直接透传execute/executeDraft/confirm结果，运行代码保持。用既有headless BrowserOwner/locks/storage夹具验证实际透传、suspend/dispose后旧controls拒绝及重新acquire后新的scope。若提交后的通知阶段恰好失锁/被dispose，即便一个已完成的直接返回仍存在，测试消费者必须按当前owner有效性与当前作用域丢弃旧呈现；不能为此回滚真实commit或声称原owner具有新全局事件抑制能力。

纯controller没有dispose API，不为此增添新生产生命周期。使用权取消测试经现有BrowserOwner；前端卸载/视图切换只在TEST消费者模拟。本批结论只能是“运输/消费合同经测试”，不是实际浏览器动画/减少动态体验PASS。

## T09. 非干涉与隐藏字段

保持原公开知识。相同已批准的执行前/后公开事实、提交的公开动作、持久化状态和结果point下，整个载荷字段、类型、sequence长度、ordinal位置和错误表现一致；token作一对一重命名后比较。不是只扫两个字段名。

不同隐藏HP细值但同阶段、隐藏感染/暴露、seed、内部实例/伤口/来源/场次ID、风险游标不得通过数组数量、缺失字段、文本、diagnostic或token生成方式泄漏。改变已公开敌组/阶段是正控；不同已公开实际HP或不同公开结果不强行比较为相同。

运行代码不读raw trace/queue/enemyResponses、精确敌HP/比值、raw CTB、未执行意图或全部历史。TEST-only原生观察可为对照读取它们，但必须与公开投影实现隔离；不能把测试观察辅助导入生产。

## T10. 兼容与有限旧测试适配

保持旧query/View、opaque selector、preview、参数/确认、Feed内容来源、current/保存与随机语义。对六类B1输出之外的返回，Object.keys也保持。对B1返回，剥离唯一新增属性后原字段须与准确基线行为对等；不得以新实现对自己作oracle。

明确许可两处历史观察断言的局部后继适配：
1. player-motion-probe-fixtures.ts：原execution键集从kind/preview/view变为committedAction/kind/preview/view。仍保留原S commit键集、一次dispatch/CTB/current/write/batch、真实decision与隐私断言，不删/skip/减次数。
2. infected-preplay/presentation-preparation-probe.test.ts：首个实际combat成功返回键集增加presentation；同文件非combat移动返回的原键集断言不变。Feed、保存、计数、取消、旧控制失效和冷恢复断言原样保留。

历史报告不改写成“当时已有B1”。新增测试覆盖新增字段，而不是删除14项B观察或其他A/旧生产测试。其他旧测试若冲突，先查明原因；范围外不能改、延时、skip或降低断言。

## T11. 完成与停止

本项不计测试数量为目标。验收矩阵每行注明原生真实链、合法TEST前态、纯投影单元或TEST消费者证明层次；不可达组合不改HP/阈值凑例。默认test:run开工基线与最终check均实际运行；旧E03四路线/72样本以及原查询、S保存、controller/browser回归保留。

交付后停审，不能自动进入B2或C。下一次主线按准确最终SHA审查新临时协议、隐私、保存非干涉与实际源码，不凭自述或CI绿批准完整战斗表现。
